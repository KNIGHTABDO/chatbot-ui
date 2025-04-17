import { checkApiKey, getServerProfile } from "@/lib/server/server-chat-helpers"
import { ChatPayload, ChatSettings } from "@/types"
import { OpenAIStream, StreamingTextResponse } from "ai"
import { ServerRuntime } from "next"
import OpenAI from "openai"
import { ChatCompletionCreateParamsBase } from "openai/resources/chat/completions.mjs"
import { tavily } from "@tavily/core"

// export const runtime: ServerRuntime = "edge"

// Initialize Tavily client (Replace API key with environment variable ideally)
const tavilyClient = tavily({
  apiKey:
    process.env.TAVILY_API_KEY || "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"
})

export async function POST(request: Request) {
  const json = await request.json()
  const { chatSettings, messages, isWebSearchEnabled } = json as ChatPayload & {
    messages: any[] // Keep existing messages type for now
  }

  try {
    const profile = await getServerProfile()

    checkApiKey(profile.openrouter_api_key, "OpenRouter")

    const openai = new OpenAI({
      apiKey: profile.openrouter_api_key || "",
      baseURL: "https://openrouter.ai/api/v1"
    })

    // Existing OpenRouter direct call logic
    const createOpenRouterChatCompletion = async (
      completionMessages: any[]
    ) => {
      return openai.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"],
        messages:
          completionMessages as ChatCompletionCreateParamsBase["messages"],
        temperature: chatSettings.temperature,
        max_tokens:
          chatSettings.model === ("mistralai/mistral-7b-instruct" as any)
            ? 16000
            : null, // Cast to 'any' for comparison
        stream: true
      })
    }

    if (isWebSearchEnabled && messages.length > 0) {
      // -------- WEB SEARCH ENABLED --------

      // 1. Generate Search Query
      const userPrompt = messages[messages.length - 1].content
      const queryGenerationMessages = [
        {
          role: "system",
          content: `You are an AI assistant. Your task is to generate a concise and effective search query based on the user's last message. Return only the search query itself, with no additional text or explanation.
          User's message: "${userPrompt}"
          Search Query:`
        }
      ]

      const queryResponse = await openai.chat.completions.create({
        model: chatSettings.model as ChatCompletionCreateParamsBase["model"], // Use the same model or a cheaper/faster one
        messages:
          queryGenerationMessages as ChatCompletionCreateParamsBase["messages"],
        temperature: 0.1, // Low temp for deterministic query generation
        max_tokens: 50,
        stream: false // No need to stream the query
      })

      // Safely access the search query
      const firstChoice = queryResponse?.choices?.[0]
      const searchQuery = firstChoice?.message?.content?.trim()

      if (!searchQuery) {
        console.error(
          "Query generation failed. Response:",
          JSON.stringify(queryResponse, null, 2)
        )
        // Decide how to handle: throw error, or proceed without web search?
        // Option 1: Throw an error
        throw new Error("Failed to generate search query from AI.")
        // Option 2: Fallback to standard response (uncomment below and comment out the throw)
        // console.warn("Falling back to standard response due to query generation failure.");
        // const response = await createOpenRouterChatCompletion(messages);
        // const stream = OpenAIStream(response);
        // return new StreamingTextResponse(stream);
      }

      console.log("Generated Search Query:", searchQuery)

      // 2. Perform Tavily Search with specific error handling
      let searchResults
      try {
        searchResults = await tavilyClient.search(searchQuery, {
          searchDepth: "advanced",
          maxResults: 8,
          includeAnswer: true,
          includeImages: true,
          includeImageDescriptions: true
        })
      } catch (tavilyError: any) {
        console.error("Tavily Search API Error:", tavilyError)
        // Re-throw a standard error format
        throw new Error(
          `Tavily search failed: ${tavilyError?.message || "Unknown error"}`
        )
      }
      console.log("Tavily Search Results:", searchResults)

      // Check if searchResults has results property
      if (!searchResults || !Array.isArray(searchResults.results)) {
        console.error(
          "Tavily returned invalid search results format:",
          searchResults
        )
        throw new Error("Tavily returned invalid search results format.")
      }

      // Extract web search sources and images to pass to the frontend
      const webSearchSources = searchResults.results.map(
        (result: { title: string; url: string; content: string }) => ({
          title: result.title,
          url: result.url,
          content: result.content
        })
      )

      // Extract images if available
      const webSearchImages =
        searchResults.images && Array.isArray(searchResults.images)
          ? searchResults.images.map(image => ({
              // Let TypeScript infer the type or use the correct TavilyImage type if imported
              url: image.url,
              description: image.description || "" // Handle potential undefined description
            }))
          : []

      // 3. Generate Final Answer with Search Context
      const searchContext = searchResults.results
        .map(
          (
            result: { title: string; url: string; content: string },
            index: number
          ) =>
            `Source ${index + 1} (${result.title}):\n${result.content}\nURL: ${result.url}`
        )
        .join("\n\n")

      const finalAnswerMessages = [
        ...messages.slice(0, -1), // Include previous messages
        {
          role: "system",
          content: `You are a helpful AI assistant. The user asked: "${userPrompt}". You have performed a web search and found the following information. Please synthesize this information and provide a comprehensive answer to the user's question, citing the sources (Source 1, Source 2, etc.) where appropriate. 

Web Search Results:\n${searchContext}`
        },
        messages[messages.length - 1] // Re-add the original user message
      ]

      try {
        // Call LLM with search results to generate final answer
        const response =
          await createOpenRouterChatCompletion(finalAnswerMessages)

        // Create a modified stream that includes search metadata in the first chunk
        const modifiedStream = new ReadableStream({
          async start(controller) {
            // Add web search metadata as a special message at the beginning
            const metadataChunk = JSON.stringify({
              webSearchSources: {
                sources: webSearchSources,
                images: webSearchImages,
                query: searchQuery
              },
              isWebSearch: true
            })
            controller.enqueue(
              new TextEncoder().encode(`{"metadata": ${metadataChunk}}\n`)
            )

            // Process the regular stream
            const stream = OpenAIStream(response)
            const reader = stream.getReader()

            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                controller.enqueue(value)
              }
              controller.close()
            } catch (e) {
              controller.error(e)
            }
          }
        })

        return new Response(modifiedStream)
      } catch (finalAnswerError: any) {
        console.error(
          "Error during final answer generation/streaming:",
          finalAnswerError
        )
        // Re-throw a standard error format to be caught by the outer catch block
        throw new Error(
          `Final answer generation failed: ${finalAnswerError?.message || "Unknown streaming error"}`
        )
      }
    } else {
      // -------- WEB SEARCH DISABLED or NO MESSAGES --------
      const response = await createOpenRouterChatCompletion(messages)
      const stream = OpenAIStream(response)
      return new StreamingTextResponse(stream)
    }
  } catch (error: any) {
    // Safely access error message
    let errorMessage = "An unexpected error occurred"
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      errorMessage = error.message
    } else if (typeof error === "string") {
      errorMessage = error
    }

    const errorCode =
      error && typeof error === "object" && "status" in error
        ? error.status
        : 500

    if (errorMessage.toLowerCase().includes("api key not found")) {
      errorMessage =
        "OpenRouter API Key not found. Please set it in your profile settings."
    } else if (errorMessage.toLowerCase().includes("insufficient funds")) {
      errorMessage = "You have insufficient funds in your OpenRouter account."
    }

    console.error("OpenRouter API Error:", errorMessage, error)

    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
}
