import { ReactNode } from 'react';
import { Card } from '../ui/card';

interface ResizablePreviewProps {
  children: ReactNode;
  className?: string;
}

export const ResizablePreview = ({
  children,
  className = '',
}: ResizablePreviewProps) => {
  return (
    <div className={`h-full p-4 ${className}`}>
      <Card className="h-full overflow-hidden">
        <div className="h-full flex flex-col">
          {/* Preview Header */}
          <div className="border-b px-4 py-2 bg-muted/50">
            <h3 className="text-sm font-medium">Preview</h3>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </Card>
    </div>
  );
};
