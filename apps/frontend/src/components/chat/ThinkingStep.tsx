import { Brain, Check, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CompletionChecklist {
  all_features_implemented: boolean;
  validation_passing: boolean;
  no_todos_or_placeholders: boolean;
  ready_for_user: boolean;
}

interface ThinkingStepProps {
  observation: string;
  next_step: string;
  task_progress: string;
  completion_checklist?: CompletionChecklist;
  className?: string;
}

/**
 * ThinkingStep - Visualizes AI's thinking process with purple theme
 *
 * Displays:
 * - Observation: What the AI has noticed
 * - Next Step: What action will be taken
 * - Progress: Current task progress
 * - Completion Checklist: Final validation checks (when near completion)
 */
export function ThinkingStep({
  observation,
  next_step,
  task_progress,
  completion_checklist,
  className,
}: ThinkingStepProps) {
  return (
    <div
      className={cn(
        'rounded-lg border-l-4 border-purple-500',
        'bg-purple-50 dark:bg-purple-950/30',
        'p-4 space-y-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
          Thinking…
        </span>
      </div>

      {/* Observation Section */}
      {observation && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            Observation
          </h4>
          <div className="text-sm text-purple-900 dark:text-purple-200 font-mono bg-purple-100/50 dark:bg-purple-900/20 rounded p-2 whitespace-pre-wrap">
            {observation}
          </div>
        </div>
      )}

      {/* Next Step Section */}
      {next_step && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            Next Step
          </h4>
          <div className="text-sm text-purple-900 dark:text-purple-200 bg-purple-100/50 dark:bg-purple-900/20 rounded p-2">
            {next_step}
          </div>
        </div>
      )}

      {/* Progress Section */}
      {task_progress && (
        <div className="space-y-1">
          <h4 className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            Progress
          </h4>
          <div className="text-sm text-purple-900 dark:text-purple-200 bg-purple-100/50 dark:bg-purple-900/20 rounded p-2">
            {task_progress}
          </div>
        </div>
      )}

      {/* Completion Checklist (conditional) */}
      {completion_checklist && (
        <div className="space-y-2 pt-2 border-t border-purple-300 dark:border-purple-700">
          <h4 className="text-xs font-medium text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            Completion Checklist
          </h4>
          <div className="space-y-1.5">
            <ChecklistItem
              checked={completion_checklist.all_features_implemented}
              label="All features implemented"
            />
            <ChecklistItem
              checked={completion_checklist.validation_passing}
              label="Validation passing"
            />
            <ChecklistItem
              checked={completion_checklist.no_todos_or_placeholders}
              label="No TODOs/placeholders"
            />
            <ChecklistItem
              checked={completion_checklist.ready_for_user}
              label="User can use immediately"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ChecklistItem - Individual checklist item with checkmark/X icon
 */
function ChecklistItem({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {checked ? (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
      )}
      <span
        className={cn(
          'text-purple-900 dark:text-purple-200',
          checked ? 'opacity-100' : 'opacity-75'
        )}
      >
        {label}
      </span>
    </div>
  );
}
