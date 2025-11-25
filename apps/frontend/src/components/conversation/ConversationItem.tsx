/**
 * ConversationItem - Individual conversation item in the list
 */

import { Archive, Clock, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import type { Conversation } from '../../types/project';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { ConversationSettings } from './ConversationSettings';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected?: boolean;
  onClick?: () => void;
  onUpdated?: (conversation: Conversation) => void;
  onDeleted?: (conversationId: string) => void;
}

export function ConversationItem({
  conversation,
  isSelected = false,
  onClick,
  onUpdated,
  onDeleted,
}: ConversationItemProps) {
  const [showSettings, setShowSettings] = useState(false);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <div
        className={`
          group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
          ${
            isSelected
              ? 'bg-accent text-accent-foreground'
              : 'hover:bg-accent/50'
          }
          ${conversation.isArchived ? 'opacity-60' : ''}
        `}
        onClick={onClick}
      >
        {/* Conversation Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium truncate">
              {conversation.title}
            </h3>
            {conversation.isArchived && (
              <Badge variant="secondary" className="text-xs">
                <Archive className="h-3 w-3 mr-1" />
                Archived
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(conversation.lastUpdateTime)}</span>
            {conversation.messageCount && conversation.messageCount > 0 && (
              <>
                <span>•</span>
                <span>{conversation.messageCount} messages</span>
              </>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                onClick={handleMenuClick}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSettings(true)}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(conversation.id);
                }}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
        )}
      </div>

      <ConversationSettings
        conversation={conversation}
        open={showSettings}
        onOpenChange={setShowSettings}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </>
  );
}
