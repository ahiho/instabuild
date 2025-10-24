import { ReactNode } from 'react';

/**
 * Props for EditorLayout component (2-column resizable layout)
 */
export interface EditorLayoutProps {
  /** Content for the left panel (chat) */
  chatPanel: ReactNode;

  /** Content for the right panel (preview) */
  previewPanel: ReactNode;

  /** Optional custom class name for styling */
  className?: string;

  /** Optional: Default chat panel size (0-100) */
  defaultChatSize?: number;

  /** Optional: Whether chat panel is visible */
  isChatVisible?: boolean;
}

/**
 * Props for VersionHistorySheet component
 */
export interface VersionHistorySheetProps {
  /** ID of the current page being edited */
  pageId: string;

  /** Current version number for highlighting */
  currentVersionNumber: number;

  /** Optional: Trigger element for opening the sheet */
  children?: ReactNode;
}

/**
 * Props for AssetUploaderDialog component
 */
export interface AssetUploaderDialogProps {
  /** ID of the page to upload assets for */
  pageId: string;

  /** Optional: Trigger element for opening the dialog */
  children?: ReactNode;
}

/**
 * Dark theme color configuration
 */
export const THEME_CONFIG = {
  background: {
    primary: '#0a0e27',
    card: 'bg-black/40',
    blur: 'backdrop-blur-sm',
  },
  text: {
    primary: 'text-white',
    secondary: 'text-gray-400',
    muted: 'text-gray-500',
    error: 'text-red-400',
  },
  accent: {
    primary: 'text-purple-300',
    hover: 'hover:text-purple-200',
    button: 'bg-purple-600',
    buttonHover: 'hover:bg-purple-700',
  },
  border: {
    default: 'border-gray-800',
    accent: 'border-purple-500/20',
    focus: 'ring-purple-500',
  },
} as const;
