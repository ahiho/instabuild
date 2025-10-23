interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: Record<string, any>;
}

class Logger {
  private logs: LogEntry[] = [];

  private log(
    level: LogEntry['level'],
    message: string,
    context?: Record<string, any>
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    this.logs.push(entry);
    console.log(
      `[${entry.timestamp}] ${level.toUpperCase()}: ${message}`,
      context || ''
    );
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  modelUsage(
    modelName: string,
    complexity: number,
    responseTime: number,
    tokenCount?: number
  ) {
    this.info('AI Model Usage', {
      modelName,
      complexity,
      responseTime,
      tokenCount,
      category: 'model-usage',
    });
  }

  getLogs(level?: LogEntry['level'], limit = 100) {
    let filtered = this.logs;
    if (level) {
      filtered = this.logs.filter(log => log.level === level);
    }
    return filtered.slice(-limit);
  }

  getModelMetrics() {
    return this.logs
      .filter(log => log.context?.category === 'model-usage')
      .slice(-50); // Last 50 model usage logs
  }
}

export const logger = new Logger();
