export interface ModificationCommand {
  id: string;
  chatMessageId: string;
  targetElements: string[];
  requestedChanges: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  resultVersionId?: string;
  errorMessage?: string;
  processedAt: string;
}
