'use client';

import type { ToolUIPart } from 'ai';
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { isValidElement } from 'react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { CodeBlock } from './code-block';

// Type definitions for tool execution results
interface ToolExecutionValue {
  userFeedback: string;
  data?: unknown;
  technicalDetails?: string | unknown;
  changedFiles?: string[];
}

interface NestedToolExecutionResult {
  type: 'json';
  value: ToolExecutionValue;
}

interface DirectToolExecutionResult {
  userFeedback: string;
  data?: unknown;
  technicalDetails?: string | unknown;
  changedFiles?: string[];
}

export type ToolProps = ComponentProps<typeof Collapsible> & {
  isError?: boolean; // Whether the tool execution failed
};

export const Tool = ({ className, isError, ...props }: ToolProps) => (
  <Collapsible
    className={cn(
      'not-prose w-full rounded-md border',
      isError ? 'border-destructive/50 bg-destructive/5' : '',
      className
    )}
    {...props}
  />
);

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart['type'];
  state: ToolUIPart['state'];
  description?: string; // User-friendly description of what the tool does
  className?: string;
};

const getStatusBadge = (status: ToolUIPart['state']) => {
  const labels = {
    'input-streaming': 'Pending',
    'input-available': 'Running',
    'output-available': 'Completed',
    'output-error': 'Error',
  } as const;

  const icons = {
    'input-streaming': <CircleIcon className="size-4" />,
    'input-available': <ClockIcon className="size-4 animate-pulse" />,
    'output-available': <CheckCircleIcon className="size-4 text-green-600" />,
    'output-error': <XCircleIcon className="size-4 text-red-600" />,
  } as const;

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  description,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    className={cn(
      'flex w-full items-center justify-between gap-4 p-3 hover:bg-muted/30 transition-colors',
      className
    )}
    {...props}
  >
    <div className="flex flex-1 items-start gap-2 min-w-0">
      <WrenchIcon className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">
            {title ?? type.split('-').slice(1).join('-')}
          </span>
          {getStatusBadge(state)}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
    <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 flex-shrink-0" />
  </CollapsibleTrigger>
);

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<'div'> & {
  input: ToolUIPart['input'];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn('space-y-2 p-4', className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<'div'> & {
  output: ToolUIPart['output'];
  errorText: ToolUIPart['errorText'];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  // Check if output is a ToolExecutionResult (has userFeedback field)
  // Handle both direct format and nested format: { type: "json", value: { userFeedback } }
  const isNestedToolExecutionResult =
    output &&
    typeof output === 'object' &&
    !isValidElement(output) &&
    'type' in output &&
    output.type === 'json' &&
    'value' in output &&
    typeof output.value === 'object' &&
    'userFeedback' in output.value;

  const isDirectToolExecutionResult =
    output &&
    typeof output === 'object' &&
    !isValidElement(output) &&
    'userFeedback' in output;

  let Output: ReactNode;

  if (isNestedToolExecutionResult) {
    // Display user-friendly feedback from nested structure
    const value = (output as NestedToolExecutionResult).value;
    const userFeedback = value.userFeedback;
    const hasDebugData =
      value.data || value.technicalDetails || value.changedFiles;

    Output = (
      <div className="space-y-3">
        <div className="p-3 text-sm text-foreground whitespace-pre-wrap">
          {userFeedback}
        </div>
        {hasDebugData && (
          <div className="border-t border-border pt-3">
            <div className="px-3 pb-2">
              <Badge variant="outline" className="text-xs">
                Debug Information
              </Badge>
            </div>
            {value.data && (
              <div className="px-3 pb-2">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                  Data:
                </h5>
                <CodeBlock
                  code={JSON.stringify(value.data, null, 2)}
                  language="json"
                />
              </div>
            )}
            {value.technicalDetails && (
              <div className="px-3 pb-2">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                  Technical Details:
                </h5>
                {typeof value.technicalDetails === 'string' ? (
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {value.technicalDetails}
                  </div>
                ) : (
                  <CodeBlock
                    code={JSON.stringify(value.technicalDetails, null, 2)}
                    language="json"
                  />
                )}
              </div>
            )}
            {value.changedFiles && value.changedFiles.length > 0 && (
              <div className="px-3">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                  Changed Files:
                </h5>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  {value.changedFiles.map((file: string, idx: number) => (
                    <li key={idx}>{file}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  } else if (isDirectToolExecutionResult) {
    // Display user-friendly feedback from direct structure
    const resultOutput = output as DirectToolExecutionResult;
    const userFeedback = resultOutput.userFeedback;
    const hasDebugData =
      resultOutput.data ||
      resultOutput.technicalDetails ||
      resultOutput.changedFiles;

    Output = (
      <div className="space-y-3">
        <div className="p-3 text-sm text-foreground whitespace-pre-wrap">
          {userFeedback}
        </div>
        {hasDebugData && (
          <div className="border-t border-border pt-3">
            <div className="px-3 pb-2">
              <Badge variant="outline" className="text-xs">
                Debug Information
              </Badge>
            </div>
            {resultOutput.data && (
              <div className="px-3 pb-2">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                  Data:
                </h5>
                <CodeBlock
                  code={JSON.stringify(resultOutput.data, null, 2)}
                  language="json"
                />
              </div>
            )}
            {resultOutput.technicalDetails && (
              <div className="px-3 pb-2">
                <h5 className="text-xs font-medium text-muted-foreground mb-1">
                  Technical Details:
                </h5>
                {typeof resultOutput.technicalDetails === 'string' ? (
                  <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {resultOutput.technicalDetails}
                  </div>
                ) : (
                  <CodeBlock
                    code={JSON.stringify(
                      resultOutput.technicalDetails,
                      null,
                      2
                    )}
                    language="json"
                  />
                )}
              </div>
            )}
            {resultOutput.changedFiles &&
              resultOutput.changedFiles.length > 0 && (
                <div className="px-3">
                  <h5 className="text-xs font-medium text-muted-foreground mb-1">
                    Changed Files:
                  </h5>
                  <ul className="text-xs text-muted-foreground list-disc list-inside">
                    {resultOutput.changedFiles.map(
                      (file: string, idx: number) => (
                        <li key={idx}>{file}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>
    );
  } else if (typeof output === 'object' && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === 'string') {
    Output = <CodeBlock code={output} language="json" />;
  } else {
    Output = <div>{output as ReactNode}</div>;
  }

  return (
    <div className={cn('space-y-2 p-4', className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? 'Error' : 'Result'}
      </h4>
      <div
        className={cn(
          'overflow-x-auto rounded-md text-xs [&_table]:w-full',
          errorText
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted/50 text-foreground'
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
