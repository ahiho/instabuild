import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Dedicated logger for tool loop debugging
 * Writes structured logs to a separate file for easy analysis
 */
class ToolLoopLogger {
  private logStream: ReturnType<typeof createWriteStream> | null = null;
  private logDir: string;
  private logFile: string;
  private isEnabled: boolean;

  constructor() {
    // Create logs directory in project root
    this.logDir = join(process.cwd(), 'logs');
    this.logFile = join(this.logDir, 'tool-loop-debug.log');

    // Enable based on environment variable or always in development
    this.isEnabled =
      process.env.TOOL_LOOP_DEBUG === 'true' ||
      process.env.NODE_ENV !== 'production';

    if (this.isEnabled) {
      this.initializeLogStream();
    }
  }

  private initializeLogStream() {
    try {
      // Create logs directory if it doesn't exist
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }

      // Create append stream for the log file
      this.logStream = createWriteStream(this.logFile, {
        flags: 'a', // append mode
        encoding: 'utf8',
      });

      // Write startup header
      this.writeRaw('\n' + '='.repeat(80));
      this.writeRaw(
        `Tool Loop Debug Session Started: ${new Date().toISOString()}`
      );
      this.writeRaw('='.repeat(80) + '\n');
    } catch (error) {
      console.error('Failed to initialize tool loop logger:', error);
      this.isEnabled = false;
    }
  }

  private writeRaw(message: string) {
    if (this.logStream && this.isEnabled) {
      this.logStream.write(message + '\n');
    }
  }

  private formatSection(title: string, data?: any) {
    const lines: string[] = [];
    lines.push('\n' + '-'.repeat(80));
    lines.push(`[${new Date().toISOString()}] ${title}`);
    lines.push('-'.repeat(80));

    if (data) {
      lines.push(JSON.stringify(data, null, 2));
    }

    return lines.join('\n');
  }

  /**
   * Log stop conditions configuration
   */
  logStopConditions(data: {
    conversationId: string;
    finalMaxSteps: number;
    isOverride: boolean;
    stopConditionsCount: number;
    taskComplexity: string;
    stopConditionsSource: string;
    stopConditionsDetails: any[];
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🔧 STOP CONDITIONS CONFIGURED', {
        conversationId: data.conversationId,
        'Max Steps': data.finalMaxSteps,
        'Override Mode': data.isOverride,
        'Task Complexity': data.taskComplexity,
        Source: data.stopConditionsSource,
        'Conditions Count': data.stopConditionsCount,
        'Condition Details': data.stopConditionsDetails,
      })
    );
  }

  /**
   * Log prepareStep - before model call
   */
  logPrepareStep(data: {
    conversationId: string;
    stepNumber: number;
    messageCount: number;
    timestamp: string;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🔄 PREPARE STEP - About to call model', {
        conversationId: data.conversationId,
        'Step Number': data.stepNumber,
        'Message Count': data.messageCount,
        Timestamp: data.timestamp,
        Note: 'SDK is about to make an API call to the model',
      })
    );
  }

  /**
   * Log when unknown finish reason is detected
   */
  logUnknownDetected(data: any) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('⚠️ UNKNOWN FINISH REASON DETECTED', {
        conversationId: data.conversationId,
        'Current Step': data.currentStep,
        'Finish Reason': data.finishReason,
        '=== CONTENT ===': {
          'Has Tool Calls': data.hasToolCalls,
          'Tool Calls Count': data.toolCallsCount,
          'Has Text': data.hasText,
          'Text Length': data.textLength,
        },
        '=== USAGE ===': {
          'Has Usage': data.hasUsage,
          Usage: data.usage,
        },
        '=== RESPONSE ===': {
          'Has Response': data.hasResponse,
          'Response Messages Count': data.responseMessagesCount,
        },
        '=== SDK INTERNALS ===': {
          'All Step Result Keys': data.allStepResultKeys,
          Experimental: data.experimental,
          'Raw Finish Reason': data.rawFinishReason,
          'Stop Reason': data.stopReason,
          'Is Continued': data.isContinued,
          'Continue Steps': data.continueSteps,
        },
        Warnings: data.warnings,
      })
    );
  }

  /**
   * Log step decision - after step finishes
   */
  logStepDecision(data: {
    conversationId: string;
    currentStep: number;
    finishReason: string;
    willLikelyContinue: boolean;
    maxStepsRemaining: number;
    timestamp: string;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🤔 SDK DECISION - After step finished', {
        conversationId: data.conversationId,
        'Current Step': data.currentStep,
        'Finish Reason': data.finishReason,
        'Will Likely Continue': data.willLikelyContinue,
        'Max Steps Remaining': data.maxStepsRemaining,
        Timestamp: data.timestamp,
        Note: 'SDK is deciding whether to continue or stop the loop',
      })
    );
  }

  /**
   * Log execution stopped - onFinish called
   */
  logExecutionStopped(data: {
    conversationId: string;
    finishReason: string;
    stepsCount: number;
    wasUnexpected: boolean;
    timestamp: string;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🏁 EXECUTION STOPPED - onFinish called', {
        conversationId: data.conversationId,
        'Finish Reason': data.finishReason,
        'Steps Count': data.stepsCount,
        'Was Unexpected': data.wasUnexpected,
        Timestamp: data.timestamp,
        Note: data.wasUnexpected
          ? '⚠️ UNEXPECTED STOP - finishReason is unknown'
          : 'Normal execution stop',
      })
    );
  }

  /**
   * Log intermediate step progress
   */
  logIntermediateStep(data: {
    conversationId: string;
    currentStep: number;
    maxSteps: number;
    toolCallsInStep: number;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('⏩ INTERMEDIATE STEP (Continuing)', {
        conversationId: data.conversationId,
        Step: `${data.currentStep}/${data.maxSteps}`,
        'Tool Calls': data.toolCallsInStep,
        Note: 'finishReason is "unknown" - this is expected during multi-step execution',
      })
    );
  }

  /**
   * Log meaningful step finish (potential stop)
   */
  logStepFinish(data: {
    conversationId: string;
    reason: string;
    currentStep: number;
    maxSteps: number;
    reachedStepLimit: boolean;
    naturalStop: boolean;
    toolCallsInStep: number;
    interpretation: string;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🛑 STEP FINISH - MAY STOP', {
        conversationId: data.conversationId,
        'Finish Reason': data.reason,
        Step: `${data.currentStep}/${data.maxSteps}`,
        'Reached Step Limit': data.reachedStepLimit,
        'Natural Stop': data.naturalStop,
        'Tool Calls in Step': data.toolCallsInStep,
        Interpretation: data.interpretation,
      })
    );
  }

  /**
   * Log raw finalResult from AI SDK
   */
  logRawFinalResult(data: any) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('🔍 RAW FINAL RESULT FROM AI SDK', {
        conversationId: data.conversationId,
        '=== FINISH REASON ===': {
          'Finish Reason': data.finishReason,
          Type: data.rawFinishReasonType,
        },
        '=== TEXT RESPONSE ===': {
          'Has Text': data.hasText,
          'Text Length': data.textLength,
          'Full Text': data.fullText,
        },
        '=== STEPS SUMMARY ===': {
          'Total Steps': data.stepsCount,
          'Last Step Finish Reason': data.lastStepFinishReason,
          'Last Step Text': data.lastStepText?.substring(0, 200) || null,
        },
        '=== ALL STEPS DETAILS ===': data.allStepsDetails,
        '=== RESPONSE ===': {
          'Has Response Object': data.hasResponse,
          'Response Messages Count': data.responseMessagesCount,
        },
        '=== RAW RESPONSE MESSAGES ===': data.rawResponseMessages,
        '=== USAGE ===': data.usage,
        '=== ERRORS/WARNINGS ===': {
          Warnings: data.warnings,
          Error: data.error,
          'Error Stack': data.errorStack,
        },
        '=== METADATA ===': {
          Experimental: data.experimental,
          'Provider Metadata': data.providerMetadata,
        },
        '=== REQUEST INFO ===': data.request,
        '=== RAW RESPONSE (OpenAI) ===': data.rawResponse,
        '=== SDK INTERNALS ===': data.sdkInternals,
        '=== ALL AVAILABLE PROPERTIES ===': data.allAvailableProperties,
      })
    );
  }

  /**
   * Log comprehensive stop reason analysis
   */
  logStopReasonAnalysis(data: {
    conversationId: string;
    finishReason: string;
    totalStepsExecuted: number;
    maxStepsConfigured: number;
    taskComplexity: string;
    stepsRemaining: number;
    reachedStepLimit: boolean;
    naturalCompletion: boolean;
    hadToolCalls: boolean;
    lastStepHadToolCalls: boolean;
    stopConditionsSource: string;
    interpretation: string;
    stepFinishReasons: Array<{
      stepIndex: number;
      finishReason: string;
      hasToolCalls: boolean;
      hasText: boolean;
      textLength: number;
    }>;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('📊 COMPREHENSIVE STOP REASON ANALYSIS', {
        conversationId: data.conversationId,
        '=== FINAL VERDICT ===': {
          'Finish Reason': data.finishReason,
          Interpretation: data.interpretation,
        },
        '=== EXECUTION SUMMARY ===': {
          'Steps Executed': data.totalStepsExecuted,
          'Max Steps Configured': data.maxStepsConfigured,
          'Steps Remaining': data.stepsRemaining,
          'Task Complexity': data.taskComplexity,
          'Stop Conditions Source': data.stopConditionsSource,
        },
        '=== COMPLETION STATUS ===': {
          'Reached Step Limit': data.reachedStepLimit,
          'Natural Completion': data.naturalCompletion,
          'Had Tool Calls': data.hadToolCalls,
          'Last Step Had Tool Calls': data.lastStepHadToolCalls,
        },
        '=== STEP-BY-STEP FINISH REASONS ===': data.stepFinishReasons,
      })
    );
  }

  /**
   * Log final completion summary
   */
  logCompletion(data: {
    conversationId: string;
    totalSteps: number;
    finishReason: string;
    totalUsage: any;
    responseLength: number;
    stopReasonAnalysis: string;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('✅ TOOL LOOP COMPLETED', {
        conversationId: data.conversationId,
        'Total Steps': data.totalSteps,
        'Finish Reason': data.finishReason,
        'Response Length': data.responseLength,
        'Total Usage': data.totalUsage,
        Analysis: data.stopReasonAnalysis,
      })
    );

    // Add separator for next conversation
    this.writeRaw('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Close the log stream (call on app shutdown)
   */
  close() {
    if (this.logStream) {
      this.writeRaw(
        `\nTool Loop Debug Session Ended: ${new Date().toISOString()}\n`
      );
      this.logStream.end();
      this.logStream = null;
    }
  }

  /**
   * Get the log file path
   */
  getLogFilePath(): string {
    return this.logFile;
  }

  /**
   * Check if logging is enabled
   */
  isLoggingEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Log raw OpenAI API request
   */
  logOpenAIRequest(data: {
    conversationId?: string;
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
    timestamp: string;
  }) {
    if (!this.isEnabled) return;

    // Sanitize headers (remove sensitive data)
    const sanitizedHeaders = { ...data.headers };
    if (sanitizedHeaders.Authorization) {
      sanitizedHeaders.Authorization = 'Bearer [REDACTED]';
    }
    if (sanitizedHeaders['api-key']) {
      sanitizedHeaders['api-key'] = '[REDACTED]';
    }

    this.writeRaw(
      this.formatSection('📤 OPENAI API REQUEST', {
        ...(data.conversationId && { conversationId: data.conversationId }),
        Timestamp: data.timestamp,
        Method: data.method,
        URL: data.url,
        Headers: sanitizedHeaders,
        '=== REQUEST BODY ===': data.body,
      })
    );
  }

  /**
   * Log raw OpenAI API response
   */
  logOpenAIResponse(data: {
    conversationId?: string;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: any;
    timestamp: string;
    durationMs: number;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('📥 OPENAI API RESPONSE', {
        ...(data.conversationId && { conversationId: data.conversationId }),
        Timestamp: data.timestamp,
        'Duration (ms)': data.durationMs,
        Status: `${data.status} ${data.statusText}`,
        Headers: data.headers,
        '=== RESPONSE BODY ===': data.body,
      })
    );
  }

  /**
   * Log OpenAI API error
   */
  logOpenAIError(data: {
    conversationId?: string;
    error: any;
    timestamp: string;
    durationMs?: number;
  }) {
    if (!this.isEnabled) return;

    this.writeRaw(
      this.formatSection('❌ OPENAI API ERROR', {
        ...(data.conversationId && { conversationId: data.conversationId }),
        Timestamp: data.timestamp,
        ...(data.durationMs && { 'Duration (ms)': data.durationMs }),
        '=== ERROR DETAILS ===': {
          message: data.error?.message || String(data.error),
          stack: data.error?.stack,
          name: data.error?.name,
          cause: data.error?.cause,
        },
      })
    );
  }
}

// Export singleton instance
export const toolLoopLogger = new ToolLoopLogger();

// Graceful shutdown - close log stream
process.on('SIGTERM', () => toolLoopLogger.close());
process.on('SIGINT', () => toolLoopLogger.close());
