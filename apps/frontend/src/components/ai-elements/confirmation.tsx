'use client';

import {
  AlertTriangleIcon,
  CheckIcon,
  EditIcon,
  FileIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { CodeBlock } from './code-block';

/**
 * Types for confirmation system
 */
export interface FileDiff {
  filePath: string;
  fileName: string;
  isNewFile: boolean;
  isDeleted: boolean;
  oldContent: string;
  newContent: string;
  addedLines: number;
  removedLines: number;
}

export interface ConfirmationRequest {
  id: string;
  type:
    | 'file_write'
    | 'file_replace'
    | 'destructive_action'
    | 'multi_file_change';
  title: string;
  description: string;
  fileDiffs: FileDiff[];
  toolName: string;
}

export interface ConfirmationResponse {
  approved: boolean;
  modifiedContent?: Record<string, string>;
  userFeedback?: string;
}

/**
 * Props for confirmation dialog
 */
export interface ConfirmationDialogProps {
  request: ConfirmationRequest;
  isOpen: boolean;
  onResponse: (response: ConfirmationResponse) => void;
  onCancel: () => void;
}

/**
 * Individual file diff display component
 */
interface FileDiffDisplayProps {
  fileDiff: FileDiff;
  isEditable?: boolean;
  onContentChange?: (filePath: string, newContent: string) => void;
}

function FileDiffDisplay({
  fileDiff,
  isEditable = false,
  onContentChange,
}: FileDiffDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(fileDiff.newContent);

  const handleSaveEdit = () => {
    if (onContentChange) {
      onContentChange(fileDiff.filePath, editedContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(fileDiff.newContent);
    setIsEditing(false);
  };

  const getFileIcon = () => {
    if (fileDiff.isNewFile) return '📄';
    if (fileDiff.isDeleted) return '🗑️';
    return '📝';
  };

  const getStatusBadge = () => {
    if (fileDiff.isNewFile) {
      return (
        <Badge variant="secondary" className="bg-green-500/20 text-green-400">
          New File
        </Badge>
      );
    }
    if (fileDiff.isDeleted) {
      return (
        <Badge variant="secondary" className="bg-red-500/20 text-red-400">
          Deleted
        </Badge>
      );
    }

    const changes = [];
    if (fileDiff.addedLines > 0) changes.push(`+${fileDiff.addedLines}`);
    if (fileDiff.removedLines > 0) changes.push(`-${fileDiff.removedLines}`);

    return (
      <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
        {changes.join(', ')} lines
      </Badge>
    );
  };

  const formatDiff = () => {
    if (fileDiff.isNewFile) {
      return fileDiff.newContent
        .split('\n')
        .map(line => `+ ${line}`)
        .join('\n');
    }
    if (fileDiff.isDeleted) {
      return fileDiff.oldContent
        .split('\n')
        .map(line => `- ${line}`)
        .join('\n');
    }

    // Simple diff - show old and new content
    const oldLines = fileDiff.oldContent.split('\n');
    const newLines = fileDiff.newContent.split('\n');
    const maxLines = Math.max(oldLines.length, newLines.length);

    const diffLines = [];
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine !== newLine) {
        if (oldLine) diffLines.push(`- ${oldLine}`);
        if (newLine) diffLines.push(`+ ${newLine}`);
      } else if (oldLine) {
        diffLines.push(`  ${oldLine}`);
      }
    }

    return diffLines.join('\n');
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between p-3 bg-gray-800/50 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getFileIcon()}</span>
          <span className="font-medium text-sm">{fileDiff.fileName}</span>
          {getStatusBadge()}
        </div>

        {isEditable && !fileDiff.isDeleted && (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              >
                <EditIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* File content */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Edit file content:</label>
            <Textarea
              value={editedContent}
              onChange={e => setEditedContent(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Enter file content..."
            />
          </div>
        ) : (
          <CodeBlock
            code={formatDiff()}
            language="diff"
            className="max-h-[300px] overflow-y-auto"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Main confirmation dialog component
 */
export function ConfirmationDialog({
  request,
  isOpen,
  onResponse,
  onCancel,
}: ConfirmationDialogProps) {
  const [userFeedback, setUserFeedback] = useState('');
  const [modifiedContent, setModifiedContent] = useState<
    Record<string, string>
  >({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApprove = () => {
    onResponse({
      approved: true,
      modifiedContent:
        Object.keys(modifiedContent).length > 0 ? modifiedContent : undefined,
      userFeedback: userFeedback.trim() || undefined,
    });
  };

  const handleReject = () => {
    onResponse({
      approved: false,
      userFeedback: userFeedback.trim() || undefined,
    });
  };

  const handleContentChange = (filePath: string, newContent: string) => {
    setModifiedContent(prev => ({
      ...prev,
      [filePath]: newContent,
    }));
  };

  const getDialogIcon = () => {
    switch (request.type) {
      case 'destructive_action':
        return <AlertTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'file_write':
      case 'file_replace':
      case 'multi_file_change':
        return <FileIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <FileIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getTotalChanges = () => {
    const totalAdded = request.fileDiffs.reduce(
      (sum, diff) => sum + diff.addedLines,
      0
    );
    const totalRemoved = request.fileDiffs.reduce(
      (sum, diff) => sum + diff.removedLines,
      0
    );
    return { totalAdded, totalRemoved };
  };

  const { totalAdded, totalRemoved } = getTotalChanges();

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getDialogIcon()}
            {request.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          <p className="text-sm text-gray-300">{request.description}</p>

          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
            <div className="text-sm">
              <span className="text-gray-400">Files:</span>{' '}
              <span className="font-medium">{request.fileDiffs.length}</span>
            </div>
            {totalAdded > 0 && (
              <div className="text-sm">
                <span className="text-gray-400">Added:</span>{' '}
                <span className="font-medium text-green-400">
                  +{totalAdded}
                </span>
              </div>
            )}
            {totalRemoved > 0 && (
              <div className="text-sm">
                <span className="text-gray-400">Removed:</span>{' '}
                <span className="font-medium text-red-400">
                  -{totalRemoved}
                </span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-gray-400">Tool:</span>{' '}
              <span className="font-medium">{request.toolName}</span>
            </div>
          </div>

          {/* File diffs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">File Changes</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? 'Simple View' : 'Advanced Edit'}
              </Button>
            </div>

            {request.fileDiffs.map((fileDiff, index) => (
              <FileDiffDisplay
                key={index}
                fileDiff={fileDiff}
                isEditable={showAdvanced}
                onContentChange={handleContentChange}
              />
            ))}
          </div>

          {/* User feedback */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">
              Additional feedback (optional):
            </label>
            <Textarea
              value={userFeedback}
              onChange={e => setUserFeedback(e.target.value)}
              placeholder="Any additional comments or instructions..."
              className="min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReject}>
            <XIcon className="h-4 w-4 mr-2" />
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckIcon className="h-4 w-4 mr-2" />
            Approve
            {Object.keys(modifiedContent).length > 0 ? ' with Changes' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline confirmation component for smaller confirmations
 */
export interface InlineConfirmationProps {
  title: string;
  description: string;
  onApprove: () => void;
  onReject: () => void;
  className?: string;
}

export function InlineConfirmation({
  title,
  description,
  onApprove,
  onReject,
  className,
}: InlineConfirmationProps) {
  return (
    <div
      className={cn(
        'p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <h4 className="font-medium text-sm text-yellow-400">{title}</h4>
          <p className="text-sm text-yellow-200">{description}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReject}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
