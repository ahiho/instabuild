import { ReactNode } from 'react';
import { PanelGroup } from 'react-resizable-panels';
import { LayoutPanel, LayoutPanelResizeHandle } from './LayoutPanel';
import { useLayoutState } from '../../hooks/useLayoutState';

interface ThreeColumnLayoutProps {
  sidebar: ReactNode;
  chat: ReactNode;
  preview: ReactNode;
  className?: string;
}

export const ThreeColumnLayout = ({
  sidebar,
  chat,
  preview,
  className = '',
}: ThreeColumnLayoutProps) => {
  const { layoutState, setSidebarWidth, setPreviewWidth } = useLayoutState();

  return (
    <div className={`h-screen w-full ${className}`}>
      {/* Desktop Layout (768px+) */}
      <div className="hidden md:block h-full">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <LayoutPanel
            id="sidebar"
            isCollapsed={layoutState.sidebar.isCollapsed}
            width={layoutState.sidebar.width}
            minWidth={200}
            maxWidth={500}
            onResize={setSidebarWidth}
            className="bg-background border-r"
          >
            {sidebar}
          </LayoutPanel>

          {!layoutState.sidebar.isCollapsed && <LayoutPanelResizeHandle />}

          {/* Chat Panel */}
          <LayoutPanel id="chat" className="bg-background flex-1 min-w-0">
            {chat}
          </LayoutPanel>

          <LayoutPanelResizeHandle />

          {/* Preview Panel */}
          <LayoutPanel
            id="preview"
            width={layoutState.preview.width}
            minWidth={300}
            maxWidth={800}
            onResize={setPreviewWidth}
            className="bg-muted/50"
          >
            {preview}
          </LayoutPanel>
        </PanelGroup>
      </div>

      {/* Tablet Layout (768px and below) - Stacked */}
      <div className="md:hidden h-full flex flex-col">
        <div className="text-center p-4 bg-muted/50 border-b">
          <p className="text-sm text-muted-foreground">
            Three-column layout requires a minimum width of 768px. Please use a
            larger screen for the full editor experience.
          </p>
        </div>

        {/* Simplified two-column layout for tablet */}
        <div className="flex-1 flex">
          <div className="w-1/2 border-r">{chat}</div>
          <div className="w-1/2">{preview}</div>
        </div>
      </div>
    </div>
  );
};
