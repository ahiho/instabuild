/**
 * Contexts for PromptInput component
 * Separated into its own file to satisfy React Fast Refresh requirements
 */

import { createContext } from 'react';
import type { FileUIPart } from 'ai';

export type AttachmentsContext = {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

export type TextInputContext = {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
};

export type PromptInputControllerProps = {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  /** INTERNAL: Allows PromptInput to register its file textInput + "open" callback */
  __registerFileInput: (
    ref: React.RefObject<HTMLInputElement | null>,
    open: () => void
  ) => void;
};

export const PromptInputController =
  createContext<PromptInputControllerProps | null>(null);

export const ProviderAttachmentsContext =
  createContext<AttachmentsContext | null>(null);

export const LocalAttachmentsContext = createContext<AttachmentsContext | null>(
  null
);
