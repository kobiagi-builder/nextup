/**
 * ChatPanel Component
 *
 * Complete chat interface with messages area, input, and loading states.
 * Used in the artifact editor and as a standalone chat.
 *
 * Now supports structured responses with interactive artifact suggestion cards.
 */

import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Bot, MessageCircleQuestion, Sparkles, User } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import {
  useStructuredChat,
  type UseStructuredChatOptions,
} from "../../hooks/useStructuredChat";
import { useCreateArtifact } from "../../hooks/useArtifacts";
import { useChatStore, artifactContextKey } from "../../stores/chatStore";
import type { ParsedChatMessage, ArtifactSuggestion } from "../../types/chat";
import { ChatInput } from "./ChatInput";
import { SelectionContextBanner } from "./SelectionContextBanner";
import { StructuredChatMessage } from "./StructuredChatMessage";
import { useEditorSelectionStore, selectSelectionType } from "../../stores/editorSelectionStore";

// =============================================================================
// Types
// =============================================================================

export interface ChatPanelProps extends UseStructuredChatOptions {
  /** Panel title */
  title?: string;
  /** Show header */
  showHeader?: boolean;
  /** Additional class name */
  className?: string;
  /** Height (default: 100%) */
  height?: string | number;
  /** Initial message to send automatically (Phase 1 - for research triggering) */
  initialMessage?: string;
  /** Screen context for Content Agent (optional, passed through from parent) */
  screenContext?: UseStructuredChatOptions['screenContext'];
}

// =============================================================================
// Component
// =============================================================================

export function ChatPanel({
  title = "AI Assistant",
  showHeader = true,
  className,
  height = "100%",
  initialMessage,
  screenContext, // Extract from props
  ...chatOptions
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageSentRef = useRef(false);
  const { toast } = useToast();

  // Create artifact mutation
  const createArtifactMutation = useCreateArtifact();

  // Editor selection state for context banner
  const selectionType = useEditorSelectionStore(selectSelectionType)
  const selectionContent = useEditorSelectionStore((s) =>
    s.type === 'text' ? s.selectedText : s.type === 'image' ? s.imageSrc : null
  )
  const clearSelection = useEditorSelectionStore((s) => s.clearSelection)

  // Use structured chat hook
  const {
    messages,
    input,
    setInput,
    sendMessage,
    stop,
    isStreaming,
    isLoading,
    error,
    addedItemIds,
    markItemAdded,
  } = useStructuredChat({
    ...chatOptions,
    screenContext, // Pass to hook
  });

  // Handle creating an artifact from suggestion (draft only)
  const handleCreateArtifact = useCallback(
    async (suggestion: ArtifactSuggestion) => {
      try {
        await createArtifactMutation.mutateAsync({
          type: suggestion.type,
          title: suggestion.title,
          content: suggestion.description,
          tags: suggestion.tags || [],
        });
        markItemAdded(suggestion.id);
        toast({
          title: "Draft Created",
          description: `"${suggestion.title}" has been added to your Portfolio.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to create draft",
          description: err instanceof Error ? err.message : "Unknown error",
        });
        throw err; // Re-throw so the card shows error state
      }
    },
    [createArtifactMutation, markItemAdded, toast],
  );

  // Get store actions for copying messages between contexts
  const setMessages = useChatStore((state) => state.setMessages);

  // Handle creating artifact with AI content generation (Phase 1)
  const handleCreateContent = useCallback(
    async (suggestion: ArtifactSuggestion) => {
      try {
        // 1. Create draft artifact
        const artifact = await createArtifactMutation.mutateAsync({
          type: suggestion.type,
          title: suggestion.title,
          content: '', // Empty content - will be filled by AI
          tags: suggestion.tags || [],
        });

        markItemAdded(suggestion.id);

        // 2. Copy current chat messages to the new artifact context
        // This preserves the conversation when transitioning from topic research to content creation
        // We need to do a deep copy to ensure structuredResponse and other nested objects are preserved
        const currentContextKey = chatOptions.contextKey;
        if (currentContextKey) {
          const currentMessages = useChatStore.getState().contexts[currentContextKey]?.messages || [];
          if (currentMessages.length > 0) {
            const newContextKey = artifactContextKey(artifact.id);
            // Deep copy messages to preserve nested objects like structuredResponse
            // Use JSON parse/stringify for true deep copy to ensure all nested data is preserved
            const messagesCopy = JSON.parse(JSON.stringify(currentMessages));
            setMessages(newContextKey, messagesCopy);
          }
        }

        toast({
          title: "Content Creation Started",
          description: `AI is researching and generating content for "${suggestion.title}".`,
        });

        // 3. Navigate to artifact page with autoResearch flag to trigger content generation
        // Use setTimeout to ensure Zustand persist middleware has time to write to sessionStorage
        setTimeout(() => {
          window.location.href = `/portfolio/artifacts/${artifact.id}?autoResearch=true`;
        }, 100);
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Failed to create content",
          description: err instanceof Error ? err.message : "Unknown error",
        });
        throw err; // Re-throw so the card shows error state
      }
    },
    [createArtifactMutation, markItemAdded, setMessages, chatOptions.contextKey, toast],
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      // ScrollArea uses Radix, the actual scrollable viewport is a child element
      // Find the viewport element which has the scrollable content
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isStreaming]);

  // Send initial message once when component mounts (Phase 1 - for research triggering)
  useEffect(() => {
    console.log('[ChatPanel] Initial message effect triggered:', {
      hasInitialMessage: !!initialMessage,
      alreadySent: initialMessageSentRef.current,
      message: initialMessage?.substring(0, 50),
    })

    if (initialMessage && !initialMessageSentRef.current) {
      console.log('[ChatPanel] Preparing to send initial message')
      initialMessageSentRef.current = true;
      // Send message after a short delay to ensure component is fully mounted
      setTimeout(() => {
        console.log('[ChatPanel] Sending initial message:', initialMessage.substring(0, 50))
        sendMessage(initialMessage);
      }, 100);
    }
  }, [initialMessage, sendMessage]);

  return (
    <div
      className={cn("flex flex-col bg-background", className)}
      style={{ height }}
      data-testid="chat-panel"
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-2 border-b px-4 py-3" data-testid="chat-panel-header">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">{title}</span>
        </div>
      )}

      {/* Interview banner */}
      {screenContext?.artifactStatus === 'interviewing' && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/10 border-b border-indigo-500/20">
          <div className="flex items-center gap-2 text-sm text-indigo-400">
            <MessageCircleQuestion className="h-4 w-4" />
            <span>Showcase Interview</span>
          </div>
          <button
            type="button"
            onClick={() => sendMessage('Skip the interview and proceed to research directly.')}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip interview
          </button>
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1" ref={scrollRef} data-testid="chat-panel-messages">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <EmptyState
              onSuggestionClick={(text) => {
                setInput(text);
                inputRef.current?.focus();
              }}
            />
          ) : (
            (() => {
              // Check if the last message has artifacts (actionable items)
              const lastMessage = messages[messages.length - 1];
              const lastHasArtifacts =
                lastMessage?.structuredResponse?.actionableItems &&
                lastMessage.structuredResponse.actionableItems.length > 0;

              // If last message has artifacts, only render the last message
              // (it will contain the Discussion box with all previous messages)
              if (lastHasArtifacts && messages.length > 1) {
                return (
                  <ChatMessageRenderer
                    key={lastMessage.id || messages.length - 1}
                    message={lastMessage}
                    messageHistory={messages.slice(0, -1)}
                    addedItemIds={addedItemIds}
                    onCreateArtifact={handleCreateArtifact}
                    onCreateContent={handleCreateContent}
                  />
                );
              }

              // Otherwise, render all messages individually
              return messages.map((message, index) => (
                <ChatMessageRenderer
                  key={message.id || index}
                  message={message}
                  messageHistory={messages.slice(0, index)}
                  addedItemIds={addedItemIds}
                  onCreateArtifact={handleCreateArtifact}
                  onCreateContent={handleCreateContent}
                />
              ));
            })()
          )}

          {/* Error message */}
          {error && (
            <div className="mx-4 my-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="chat-panel-error">
              {error}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t px-3 py-3" data-testid="chat-panel-input-area">
        {/* Selection context banner */}
        {selectionType && selectionContent && (
          <div className="mb-2">
            <SelectionContextBanner
              type={selectionType}
              content={selectionContent}
              onDismiss={clearSelection}
            />
          </div>
        )}
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={() => sendMessage()}
          onStop={stop}
          isStreaming={isStreaming}
          isLoading={isLoading}
          placeholder="Let's chat about your content..."
          inputRef={inputRef}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Chat Message Renderer
// =============================================================================

interface ChatMessageRendererProps {
  message: ParsedChatMessage;
  messageHistory: ParsedChatMessage[];
  addedItemIds: Set<string>;
  onCreateArtifact: (suggestion: ArtifactSuggestion) => Promise<void>;
  onCreateContent?: (suggestion: ArtifactSuggestion) => Promise<void>;
}

function ChatMessageRenderer({
  message,
  messageHistory,
  addedItemIds,
  onCreateArtifact,
  onCreateContent,
}: ChatMessageRendererProps) {
  // User messages render simply
  if (message.role === "user") {
    return (
      <div className="flex gap-3 p-4 flex-row-reverse">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="flex max-w-[80%] flex-col gap-2 items-end">
          <div className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm">
            <div className="whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant messages use StructuredChatMessage
  return (
    <StructuredChatMessage
      message={message}
      messageHistory={messageHistory}
      addedItemIds={addedItemIds}
      onCreateArtifact={onCreateArtifact}
      onCreateContent={onCreateContent}
    />
  );
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center" data-testid="chat-panel-empty-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="font-medium">AI Assistant</h3>
        <p className="text-sm text-muted-foreground">
          I can help you with content creation, topic research, and more.
          <br />
          Just type a message to get started!
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        <SuggestionChip onClick={onSuggestionClick}>
          Help me write a LinkedIn post
        </SuggestionChip>
        <SuggestionChip onClick={onSuggestionClick}>
          Research topic ideas
        </SuggestionChip>
        <SuggestionChip onClick={onSuggestionClick}>
          Improve my content
        </SuggestionChip>
      </div>
    </div>
  );
}

interface SuggestionChipProps {
  children: string;
  onClick: (text: string) => void;
}

function SuggestionChip({ children, onClick }: SuggestionChipProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(children)}
      className="rounded-full border bg-muted px-3 py-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
    >
      {children}
    </button>
  );
}

export default ChatPanel;
