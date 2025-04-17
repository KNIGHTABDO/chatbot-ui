import { WebSearchImage, WebSearchSource } from "@/types/chat"
import {
  IconCaretDownFilled,
  IconCaretRightFilled,
  IconWorld
} from "@tabler/icons-react"
import Image from "next/image"
import { FC, useState } from "react"

interface WebSearchSourcesProps {
  sources: WebSearchSource[]
  images?: WebSearchImage[]
  query?: string
}

export const WebSearchSources: FC<WebSearchSourcesProps> = ({
  sources,
  images = [],
  query
}) => {
  const [viewSources, setViewSources] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)

  if (!sources || sources.length === 0) return null

  return (
    <div className="border-primary mt-6 border-t pt-4 font-bold">
      {/* Web search images as circles in a row */}
      {images && images.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center space-x-2">
            <IconWorld className="text-blue-500" size={18} />
            <span className="text-sm font-normal text-gray-500">
              {query ? `Web search: "${query}"` : "Web search images:"}
            </span>
          </div>
          <div className="flex flex-row gap-3 overflow-x-auto pb-2">
            {images.map((image, index) => (
              <div
                key={index}
                className="group relative shrink-0 cursor-pointer"
                onClick={() =>
                  setSelectedImageUrl(
                    selectedImageUrl === image.url ? null : image.url
                  )
                }
              >
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                  <Image
                    src={image.url}
                    alt={
                      image.description || `Search result image ${index + 1}`
                    }
                    width={64}
                    height={64}
                    className="min-h-full min-w-full object-cover"
                  />
                </div>
                {image.description && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded bg-black bg-opacity-75 p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {image.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          {selectedImageUrl && (
            <div className="mt-3 flex justify-center">
              <div className="relative max-w-md">
                <Image
                  src={selectedImageUrl}
                  alt="Selected web search image"
                  width={500}
                  height={300}
                  className="rounded-lg object-contain shadow-md"
                />
                <button
                  className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black bg-opacity-50 text-white"
                  onClick={() => setSelectedImageUrl(null)}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Web search sources (keeping existing code) */}
      {!viewSources ? (
        <div
          className="flex cursor-pointer items-center text-lg hover:opacity-50"
          onClick={() => setViewSources(true)}
        >
          {sources.length}
          {sources.length > 1 ? " Sources " : " Source "}
          from Web Search <IconCaretRightFilled className="ml-1" />
        </div>
      ) : (
        <>
          <div
            className="flex cursor-pointer items-center text-lg hover:opacity-50"
            onClick={() => setViewSources(false)}
          >
            {sources.length}
            {sources.length > 1 ? " Sources " : " Source "}
            from Web Search <IconCaretDownFilled className="ml-1" />
          </div>

          <div className="mt-3 space-y-4">
            {sources.map((source, index) => (
              <div key={index}>
                <div className="flex items-center space-x-2">
                  <div>
                    <IconWorld className="text-blue-500" size={20} />
                  </div>

                  <div className="truncate font-medium">{source.title}</div>
                </div>

                <div
                  className="ml-8 mt-1.5 flex cursor-pointer items-center space-x-2 hover:opacity-50"
                  onClick={() => window.open(source.url, "_blank")}
                >
                  <div className="text-sm font-normal">
                    <span className="mr-1 text-lg font-bold">-</span>{" "}
                    <span className="text-blue-500 underline">
                      {source.url}
                    </span>
                    <div className="mt-1 text-sm text-gray-500">
                      {source.content.substring(0, 200)}...
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
