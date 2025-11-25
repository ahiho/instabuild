/**
 * ConversationSettings - Component for managing conversation settings (edit, archive, delete)
 */

import {
  Archive,
  ArchiveRestore,
  Calendar,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { conversationService } from '../../services/project';
import type { Conversation } from '../../types/project';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';

interface ConversationSettingsProps {
  conversation: Conversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (conversation: Conversation) => void;
  onDeleted?: (conversationId: string) => void;
}

export function ConversationSettings({
  conversation,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: ConversationSettingsProps) {
  const { success, error } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEditTitle = async () => {
    if (!editTitle.trim() || editTitle.trim() === conversation.title) {
      setIsEditing(false);
      setEditTitle(conversation.title);
      return;
    }

    try {
      const updatedConversation = await conversationService.updateConversation(
        conversation.id,
        { title: editTitle.trim() }
      );

      success('Title Updated', 'Conversation title has been updated');
      setIsEditing(false);
      onUpdated?.(updatedConversation);
    } catch (err) {
      error(
        'Update Failed',
        err instanceof Error
          ? err.message
          : 'Failed to update conversation title'
      );
    }
  };

  const handleToggleArchive = async () => {
    try {
      setIsArchiving(true);

      if (conversation.isArchived) {
        // Restore using the dedicated restore endpoint
        await conversationService.restoreConversation(conversation.id);
        const updatedConversation = { ...conversation, isArchived: false };
        success(
          'Conversation Restored',
          'Conversation has been restored from archive'
        );
        onUpdated?.(updatedConversation);
      } else {
        // Archive
        await conversationService.archiveConversation(conversation.id);
        const updatedConversation = { ...conversation, isArchived: true };
        success('Conversation Archived', 'Conversation has been archived');
        onUpdated?.(updatedConversation);
      }
    } catch (err) {
      error(
        'Archive Failed',
        err instanceof Error ? err.message : 'Failed to archive conversation'
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== conversation.title) {
      error(
        'Confirmation Required',
        'Please type the conversation title to confirm deletion'
      );
      return;
    }

    try {
      setIsDeleting(true);
      await conversationService.deleteConversation(conversation.id);

      success(
        'Conversation Deleted',
        'Conversation has been deleted successfully'
      );

      // Close dialogs and notify parent
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onDeleted?.(conversation.id);
    } catch (err) {
      error(
        'Deletion Failed',
        err instanceof Error ? err.message : 'Failed to delete conversation'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteConfirm = () => {
    setDeleteConfirmText('');
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <Dialog open={open && !showDeleteConfirm} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Conversation Settings
              {conversation.isArchived && (
                <Badge variant="secondary" className="text-xs">
                  Archived
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Manage your conversation settings and information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Title Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Title</h3>
              {isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Enter conversation title"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleEditTitle();
                      } else if (e.key === 'Escape') {
                        setIsEditing(false);
                        setEditTitle(conversation.title);
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleEditTitle}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditTitle(conversation.title);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm">{conversation.title}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
              )}
            </div>

            {/* Information Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <p>{formatDate(conversation.startTime)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <p>{formatDate(conversation.lastUpdateTime)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Messages</p>
                  <p>{conversation.messageCount || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ID</p>
                  <p className="font-mono text-xs">{conversation.id}</p>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Actions</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleToggleArchive}
                  disabled={isArchiving}
                >
                  {conversation.isArchived ? (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      {isArchiving ? 'Restoring...' : 'Restore'}
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      {isArchiving ? 'Archiving...' : 'Archive'}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={resetDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-destructive">
              Delete Conversation
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              conversation and all its messages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{conversation.title}</p>
              <p className="text-xs text-muted-foreground">
                {conversation.messageCount || 0} messages • Created{' '}
                {formatDate(conversation.startTime)}
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="delete-confirm" className="text-sm font-medium">
                Type{' '}
                <code className="bg-muted px-1 rounded">
                  {conversation.title}
                </code>{' '}
                to confirm:
              </label>
              <Input
                id="delete-confirm"
                placeholder={`Type "${conversation.title}" to confirm`}
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetDeleteConfirm}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmText !== conversation.title}
            >
              {isDeleting ? 'Deleting...' : 'Delete Conversation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
