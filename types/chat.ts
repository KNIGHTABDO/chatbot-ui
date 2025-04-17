import { Tables } from "@/supabase/types"
import { ChatMessage, LLMID } from "."

export interface ChatSettings {
  model: LLMID
  prompt: string
  temperature: number
  contextLength: number
  includeProfileContext: boolean
  includeWorkspaceInstructions: boolean
  embeddingsProvider: "openai" | "local"
}

export interface ChatPayload {
  chatSettings: ChatSettings
  workspaceInstructions: string
  chatMessages: ChatMessage[]
  assistant: Tables<"assistants"> | null
  messageFileItems: Tables<"file_items">[]
  chatFileItems: Tables<"file_items">[]
  isWebSearchEnabled?: boolean
}

export interface ChatAPIPayload {
  chatSettings: ChatSettings
  messages: Tables<"messages">[]
}

export interface ChatAPIResponse {
  message: ChatMessage
  response: Response
}

export interface WebSearchSource {
  title: string
  url: string
  content: string
}

export interface WebSearchImage {
  url: string
  description: string | null
}

export interface WebSearchResult {
  sources: WebSearchSource[]
  images: WebSearchImage[]
  query: string
}
