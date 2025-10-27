/**
 * Hooks for PromptInput component
 * Separated into its own file to satisfy React Fast Refresh requirements
 */

import { useContext } from 'react';
import {
  PromptInputController,
  ProviderAttachmentsContext,
  LocalAttachmentsContext,
} from './prompt-input-context';

/**
 * Use the PromptInput controller context
 */
export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      'Wrap your component inside <PromptInputProvider> to use usePromptInputController().'
    );
  }
  return ctx;
};

/**
 * Optional variant that doesn't throw
 */
export const useOptionalPromptInputController = () =>
  useContext(PromptInputController);

/**
 * Use provider attachments context
 */
export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      'Wrap your component inside <PromptInputProvider> to use useProviderAttachments().'
    );
  }
  return ctx;
};

/**
 * Optional variant that doesn't throw
 */
export const useOptionalProviderAttachments = () =>
  useContext(ProviderAttachmentsContext);

/**
 * Use prompt input attachments (dual-mode: provider or local)
 */
export const usePromptInputAttachments = () => {
  // Dual-mode: prefer provider if present, otherwise use local
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = provider ?? local;
  if (!context) {
    throw new Error(
      'usePromptInputAttachments must be used within a PromptInput or PromptInputProvider'
    );
  }
  return context;
};
