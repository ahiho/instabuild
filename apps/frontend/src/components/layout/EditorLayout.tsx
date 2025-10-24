import { useEffect, useState } from 'react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { EditorLayoutProps } from '@/types/editor';

/**
 * EditorLayout component - 2-column resizable layout for the editor page
 *
 * Features:
 * - Resizable panels with drag handle (desktop only)
 * - Responsive: horizontal layout on desktop, vertical on mobile (<768px)
 * - Dark theme styling consistent with HomePage
 * - Minimum width constraints: chat 20%, preview 30%
 * - Collapsible chat panel for full-width preview
 */
export function EditorLayout({
  chatPanel,
  previewPanel,
  className = '',
  defaultChatSize = 30,
  isChatVisible = true,
}: EditorLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={`h-screen bg-[#0a0e27] ${className}`}>
      <ResizablePanelGroup
        direction={isMobile ? 'vertical' : 'horizontal'}
        className="h-full"
      >
        {/* Chat Panel - Conditionally rendered based on visibility */}
        {isChatVisible && (
          <>
            <ResizablePanel
              defaultSize={defaultChatSize}
              minSize={20}
              className="flex flex-col"
            >
              <div className="h-full overflow-auto">{chatPanel}</div>
            </ResizablePanel>

            {/* Resize Handle (hidden on mobile) */}
            {!isMobile && (
              <ResizableHandle
                withHandle
                className="w-2 bg-gray-800 hover:bg-purple-500/50 transition-colors"
              />
            )}
          </>
        )}

        {/* Preview Panel */}
        <ResizablePanel
          defaultSize={isChatVisible ? 100 - defaultChatSize : 100}
          minSize={30}
          className="flex flex-col"
        >
          <div className="h-full overflow-auto">{previewPanel}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
