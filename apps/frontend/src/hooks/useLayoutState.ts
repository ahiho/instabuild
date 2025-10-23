import { useState, useCallback } from 'react';

export interface LayoutState {
  sidebar: {
    isCollapsed: boolean;
    width: number;
  };
  preview: {
    width: number;
  };
}

const DEFAULT_LAYOUT_STATE: LayoutState = {
  sidebar: {
    isCollapsed: false,
    width: 300,
  },
  preview: {
    width: 400,
  },
};

export const useLayoutState = () => {
  const [layoutState, setLayoutState] =
    useState<LayoutState>(DEFAULT_LAYOUT_STATE);

  const toggleSidebar = useCallback(() => {
    setLayoutState(prev => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        isCollapsed: !prev.sidebar.isCollapsed,
      },
    }));
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(200, Math.min(500, width));
    setLayoutState(prev => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        width: clampedWidth,
      },
    }));
  }, []);

  const setPreviewWidth = useCallback((width: number) => {
    const clampedWidth = Math.max(300, Math.min(800, width));
    setLayoutState(prev => ({
      ...prev,
      preview: {
        ...prev.preview,
        width: clampedWidth,
      },
    }));
  }, []);

  return {
    layoutState,
    toggleSidebar,
    setSidebarWidth,
    setPreviewWidth,
  };
};
