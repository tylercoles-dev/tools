/**
 * Simple logging utility for migration process
 */

interface LogLevel {
  INFO: 'info';
  ERROR: 'error';
  WARN: 'warn';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  ERROR: 'error',
  WARN: 'warn',
  DEBUG: 'debug'
};

class Logger {
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (args.length > 0) {
      const formattedArgs = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      return `${prefix} ${message} ${formattedArgs}`;
    }
    
    return `${prefix} ${message}`;
  }

  info(message: string, ...args: any[]): void {
    console.log(this.formatMessage('info', message, ...args));
  }

  error(message: string, ...args: any[]): void {
    console.error(this.formatMessage('error', message, ...args));
  }

  warn(message: string, ...args: any[]): void {
    console.warn(this.formatMessage('warn', message, ...args));
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, ...args));
    }
  }
}

export const logger = new Logger();
export { LOG_LEVELS };