import { ChatbotUIContext } from "@/context/context"
import { LLM, LLMID, ModelProvider } from "@/types"
import { IconCheck, IconChevronDown } from "@tabler/icons-react"
import { FC, useContext, useEffect, useRef, useState } from "react"
import { Button } from "../ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "../ui/dropdown-menu"
import { Input } from "../ui/input"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { ModelIcon } from "./model-icon"
import { ModelOption } from "./model-option"

interface ModelSelectProps {
  selectedModelId: string
  onSelectModel: (modelId: LLMID) => void
}

export const ModelSelect: FC<ModelSelectProps> = ({
  selectedModelId,
  onSelectModel
}) => {
  const {
    profile,
    models,
    availableHostedModels,
    availableLocalModels,
    availableOpenRouterModels
  } = useContext(ChatbotUIContext)

  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [tab, setTab] = useState<"hosted" | "local">("hosted")

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100) // FIX: hacky
    }
  }, [isOpen])

  const handleSelectModel = (modelId: LLMID) => {
    onSelectModel(modelId)
    setIsOpen(false)
  }

  // Filter models to only include OpenRouter models with "free" in their name, plus google/gemini-2.0-flash-exp:free
  const filteredOpenRouterModels = availableOpenRouterModels.filter(model =>
    model.modelId.toLowerCase().includes("free")
  )

  // Add the default Google model if it's not already included
  const defaultModel = {
    modelId: "google/gemini-2.0-flash-exp:free" as LLMID,
    modelName: "Google Gemini 2.0 Flash (Free)",
    provider: "openrouter" as ModelProvider,
    hostedId: "google/gemini-2.0-flash-exp:free",
    platformLink: "https://openrouter.ai",
    imageInput: false,
    maxContext: 4096
  }

  // Add the Google image-capable model
  const googleImageModel = {
    modelId: "gemini-2.5-pro-exp-03-25" as LLMID,
    modelName: "Gemini 2.5 Pro (Image Support)",
    provider: "google" as ModelProvider,
    hostedId: "gemini-2.5-pro-exp-03-25",
    platformLink: "https://ai.google.dev/",
    imageInput: true,
    maxContext: 32768
  }

  // Check if the default model exists in the filtered list
  const defaultModelExists = filteredOpenRouterModels.some(
    model => model.modelId === defaultModel.modelId
  )

  // If not, add it
  if (!defaultModelExists) {
    filteredOpenRouterModels.push(defaultModel)
  }

  // Combine OpenRouter models with the Google image model
  const allModels = [...filteredOpenRouterModels, googleImageModel]

  const groupedModels = allModels.reduce<Record<string, LLM[]>>(
    (groups, model) => {
      const key = model.provider
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(model)
      return groups
    },
    {}
  )

  // If the selected model is not in our filtered list, default to the Google model
  const selectedModel =
    allModels.find(model => model.modelId === selectedModelId) ||
    (allModels.length > 0
      ? allModels.find(
          model =>
            model.modelId === ("google/gemini-2.0-flash-exp:free" as LLMID)
        ) || allModels[0]
      : null)

  // If selected model doesn't match selectedModelId, update it
  useEffect(() => {
    if (selectedModel && selectedModel.modelId !== selectedModelId) {
      onSelectModel(selectedModel.modelId)
    }
  }, [selectedModelId, selectedModel, onSelectModel])

  if (!profile) return null

  return (
    <DropdownMenu
      open={isOpen}
      onOpenChange={isOpen => {
        setIsOpen(isOpen)
        setSearch("")
      }}
    >
      <DropdownMenuTrigger
        className="bg-background w-full justify-start border-2 px-3 py-5"
        asChild
        disabled={allModels.length === 0}
      >
        {allModels.length === 0 ? (
          <div className="rounded text-sm font-bold">
            Unlock models by entering API keys in your profile settings.
          </div>
        ) : (
          <Button
            ref={triggerRef}
            className="flex items-center justify-between"
            variant="ghost"
          >
            <div className="flex items-center">
              {selectedModel ? (
                <>
                  <ModelIcon
                    provider={selectedModel?.provider}
                    width={26}
                    height={26}
                  />
                  <div className="ml-2 flex items-center">
                    {selectedModel?.modelName}
                  </div>
                </>
              ) : (
                <div className="flex items-center">Select a model</div>
              )}
            </div>

            <IconChevronDown />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="space-y-2 overflow-auto p-2"
        style={{ width: triggerRef.current?.offsetWidth }}
        align="start"
      >
        <Input
          ref={inputRef}
          className="w-full"
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="max-h-[300px] overflow-auto">
          {Object.entries(groupedModels).map(([provider, models]) => {
            const searchFilteredModels = models
              .filter(model =>
                model.modelName.toLowerCase().includes(search.toLowerCase())
              )
              .sort((a, b) => a.modelName.localeCompare(b.modelName))

            if (searchFilteredModels.length === 0) return null

            return (
              <div key={provider}>
                <div className="mb-1 ml-2 text-xs font-bold tracking-wide opacity-50">
                  {provider.toLocaleUpperCase()}
                </div>

                <div className="mb-4">
                  {searchFilteredModels.map(model => {
                    return (
                      <div
                        key={model.modelId}
                        className="flex items-center space-x-1"
                      >
                        {selectedModelId === model.modelId && (
                          <IconCheck className="ml-2" size={32} />
                        )}

                        <ModelOption
                          key={model.modelId}
                          model={model}
                          onSelect={() => handleSelectModel(model.modelId)}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
