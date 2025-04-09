import { useChatHandler } from "@/components/chat/chat-hooks/use-chat-handler"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { ChatbotUIContext } from "@/context/context"
import { deleteChat } from "@/db/chats"
import { getMessagesByChatId } from "@/db/messages"
import { supabase } from "@/lib/supabase/browser-client"
import useHotkey from "@/lib/hooks/use-hotkey"
import { Tables } from "@/supabase/types"
import { IconTrash } from "@tabler/icons-react"
import { FC, useContext, useRef, useState } from "react"
import { toast } from "sonner"

interface DeleteChatProps {
  chat: Tables<"chats">
}

export const DeleteChat: FC<DeleteChatProps> = ({ chat }) => {
  useHotkey("Backspace", () => setShowChatDialog(true))

  const { setChats } = useContext(ChatbotUIContext)
  const { handleNewChat } = useChatHandler()

  const buttonRef = useRef<HTMLButtonElement>(null)

  const [showChatDialog, setShowChatDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteChat = async () => {
    try {
      setIsDeleting(true)

      // 1. Get all messages for this chat
      const messages = await getMessagesByChatId(chat.id)

      // 2. Find all image paths that need to be deleted
      const allImagePaths: string[] = []
      messages.forEach(message => {
        if (message.image_paths && message.image_paths.length > 0) {
          allImagePaths.push(...message.image_paths)
        }
      })

      // 3. Delete images from storage bucket if there are any
      if (allImagePaths.length > 0) {
        const { error } = await supabase.storage
          .from("message_images")
          .remove(allImagePaths)

        if (error) {
          console.error("Error deleting message images:", error)
          // Continue with chat deletion even if image deletion fails
        }
      }

      // 4. Delete the chat (will cascade to messages and chat_files)
      await deleteChat(chat.id)

      // 5. Update UI
      setChats(prevState => prevState.filter(c => c.id !== chat.id))
      setShowChatDialog(false)
      handleNewChat()
    } catch (error) {
      console.error("Error deleting chat:", error)
      toast.error("Failed to delete chat. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      buttonRef.current?.click()
    }
  }

  return (
    <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
      <DialogTrigger asChild>
        <IconTrash className="hover:opacity-50" size={18} />
      </DialogTrigger>

      <DialogContent onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle>Delete {chat.name}</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this chat?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setShowChatDialog(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>

          <Button
            ref={buttonRef}
            variant="destructive"
            onClick={handleDeleteChat}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
