import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private currentLogLevel: LogLevel = environment.production ? LogLevel.WARN : LogLevel.DEBUG;

  constructor() {}

  /**
   * Set the current log level
   */
  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Log debug messages (development only)
   */
  debug(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.DEBUG) {
      console.debug(`[DEBUG] ${message}`, data);
    }
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.INFO) {
      console.info(`[INFO] ${message}`, data);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any): void {
    if (this.currentLogLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, data);
    }
  }

  /**
   * Log error messages
   */
  error(message: string, error?: any): void {
    if (this.currentLogLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error);
    }
  }

  /**
   * Log API request
   */
  logApiCall(method: string, url: string, data?: any): void {
    this.debug(`API ${method} Call`, { url, data });
  }

  /**
   * Log API response
   */
  logApiResponse(method: string, url: string, status: number, data?: any): void {
    this.debug(`API ${method} Response [${status}]`, { url, data });
  }

  /**
   * Log API error
   */
  logApiError(method: string, url: string, status: number, error?: any): void {
    this.error(`API ${method} Error [${status}]`, { url, error });
  }
}
