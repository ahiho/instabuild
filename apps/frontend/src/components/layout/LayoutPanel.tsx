import { Panel, PanelResizeHandle } from 'react-resizable-panels';
import { LayoutPanelProps } from '../../types/ui-components';

interface LayoutPanelComponentProps extends LayoutPanelProps {
  className?: string;
}

export const LayoutPanel = ({
  id,
  isCollapsed = false,
  width,
  minWidth = 200,
  maxWidth = 800,
  onResize,
  children,
  className = '',
}: LayoutPanelComponentProps) => {
  const handleResize = (size: number) => {
    if (onResize) {
      onResize(size);
    }
  };

  if (isCollapsed && id === 'sidebar') {
    return null;
  }

  return (
    <Panel
      id={id}
      defaultSize={width}
      minSize={minWidth}
      maxSize={maxWidth}
      onResize={handleResize}
      className={`flex flex-col ${className}`}
    >
      {children}
    </Panel>
  );
};

export const LayoutPanelResizeHandle = ({
  className = '',
}: {
  className?: string;
}) => {
  return (
    <PanelResizeHandle
      className={`w-1 bg-border hover:bg-accent transition-colors ${className}`}
    />
  );
};
