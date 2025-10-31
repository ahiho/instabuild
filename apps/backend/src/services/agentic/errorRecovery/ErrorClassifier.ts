/**
 * Error classifier for categorizing different error types
 */
export class ErrorClassifier {
  /**
   * Classify error types for appropriate recovery
   */
  classifyError(error: unknown): string {
    if (error instanceof Error) {
      // Check error message patterns for classification
      const message = error.message.toLowerCase();
      if (
        message.includes('no such tool') ||
        message.includes('tool not found')
      ) {
        return 'NoSuchTool';
      }
      if (
        message.includes('invalid tool input') ||
        message.includes('validation')
      ) {
        return 'InvalidToolInput';
      }
      if (
        message.includes('api call') ||
        message.includes('network') ||
        message.includes('timeout')
      ) {
        return 'APICall';
      }
      if (message.includes('tool call repair') || message.includes('repair')) {
        return 'ToolCallRepair';
      }
      return error.name;
    }
    return 'Unknown';
  }

  /**
   * Create user-friendly error messages for different error types
   */
  createUserFriendlyErrorMessage(error: unknown): string {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'NoSuchTool':
        return 'I tried to use a tool that is not available. Let me try a different approach.';

      case 'InvalidToolInput':
        return 'I provided invalid input to a tool. Let me correct this and try again.';

      case 'APICall':
        return "There was a communication error with the AI service. I'll retry in a moment.";

      case 'ToolCallRepair':
        return 'I encountered an issue while trying to fix a previous error. Let me simplify my approach.';

      default:
        if (error instanceof Error) {
          return `I encountered an unexpected error: ${error.message}. Let me try a different approach.`;
        }
        return "An unknown error occurred. I'll attempt to continue with a simpler approach.";
    }
  }
}

export const errorClassifier = new ErrorClassifier();
