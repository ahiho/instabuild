import { useState, useCallback } from 'react';

export interface SelectionState {
  isActive: boolean;
  hoveredElement: string | null;
  selectedElement: string | null;
}

const DEFAULT_SELECTION_STATE: SelectionState = {
  isActive: false,
  hoveredElement: null,
  selectedElement: null,
};

export const useSelectionMode = () => {
  const [selectionState, setSelectionState] = useState<SelectionState>(
    DEFAULT_SELECTION_STATE
  );

  const toggleSelectionMode = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      isActive: !prev.isActive,
      hoveredElement: null,
      selectedElement: null,
    }));
  }, []);

  const setHoveredElement = useCallback((selector: string | null) => {
    setSelectionState(prev => ({
      ...prev,
      hoveredElement: selector,
    }));
  }, []);

  const selectElement = useCallback((selector: string) => {
    setSelectionState(prev => ({
      ...prev,
      selectedElement: selector,
      isActive: false, // Exit selection mode after selection
      hoveredElement: null,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedElement: null,
      hoveredElement: null,
    }));
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionState(DEFAULT_SELECTION_STATE);
  }, []);

  return {
    selectionState,
    toggleSelectionMode,
    setHoveredElement,
    selectElement,
    clearSelection,
    exitSelectionMode,
  };
};
