/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReactNode } from 'react';

// UI Component Contracts for UI/UX Refinement Feature

export interface LayoutPanelProps {
  id: 'sidebar' | 'chat' | 'preview';
  isCollapsed?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  onResize?: (width: number) => void;
  onToggleCollapse?: () => void;
  children: ReactNode;
}

export interface SelectModeButtonProps {
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export interface PreviewOverlayProps {
  isSelectMode: boolean;
  onElementSelect: (selector: string) => void;
  hoveredElement?: string | null;
}

export interface ActionButtonProps {
  variant: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export interface ToolCallInputProps {
  type: 'text' | 'select' | 'file';
  label: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
}

// State Management Contracts

export interface LayoutState {
  sidebar: {
    isCollapsed: boolean;
    width: number;
  };
  preview: {
    width: number;
  };
}

export interface SelectionState {
  isActive: boolean;
  hoveredElement: string | null;
  selectedElement: string | null;
}

export interface ActionState {
  [actionId: string]: {
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  };
}

export interface ToastState {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    description?: string;
    duration: number;
  }>;
}
