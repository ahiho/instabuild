import { Plus, Image, Video, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AssetUploaderDialogProps } from '@/types/editor';
import { useState } from 'react';

/**
 * AssetUploaderDialog component - Dropdown menu for selecting asset type and uploading
 *
 * Features:
 * - Dropdown menu with file type options (Images, Videos, Documents)
 * - Plus icon trigger
 * - Dialog modal for file upload
 * - Dark theme styling
 * - Accessible via keyboard
 * - TODO: Actual upload functionality to be implemented
 */
export function AssetUploaderDialog({
  pageId,
  children,
}: AssetUploaderDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | 'document'>(
    'image'
  );

  // TODO: Implement file upload logic
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // TODO: Upload files to API
    console.log('Selected files:', files);
    console.log('Page ID:', pageId);
    console.log('File type:', fileType);
  };

  const handleFileTypeSelect = (type: 'image' | 'video' | 'document') => {
    setFileType(type);
    setIsDialogOpen(true);
  };

  const getAcceptedFileTypes = () => {
    switch (fileType) {
      case 'image':
        return 'image/*';
      case 'video':
        return 'video/*';
      case 'document':
        return '.pdf,.doc,.docx,.txt';
      default:
        return '*';
    }
  };

  const getFileTypeLabel = () => {
    switch (fileType) {
      case 'image':
        return 'Images (PNG, JPG, SVG, WebP)';
      case 'video':
        return 'Videos (MP4, WebM, MOV)';
      case 'document':
        return 'Documents (PDF, DOC, TXT)';
      default:
        return 'Files';
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {children || (
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
              aria-label="Upload assets"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-gray-900 border-gray-800 text-white"
        >
          <DropdownMenuItem
            className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
            onClick={() => handleFileTypeSelect('image')}
          >
            <Image className="h-4 w-4 mr-2" />
            <span>Upload Images</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
            onClick={() => handleFileTypeSelect('video')}
          >
            <Video className="h-4 w-4 mr-2" />
            <span>Upload Videos</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer hover:bg-gray-800 focus:bg-gray-800"
            onClick={() => handleFileTypeSelect('document')}
          >
            <FileText className="h-4 w-4 mr-2" />
            <span>Upload Documents</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-black/95 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Upload {fileType.charAt(0).toUpperCase() + fileType.slice(1)}s</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <input
              type="file"
              accept={getAcceptedFileTypes()}
              multiple
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-gray-700 file:text-white
                hover:file:bg-gray-600
                file:transition-colors"
            />
            <p className="text-gray-500 text-sm mt-2">
              Upload {getFileTypeLabel()}. Max 5MB per file.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
