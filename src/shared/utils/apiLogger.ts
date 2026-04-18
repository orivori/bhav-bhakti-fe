export interface ApiLogLevel {
  NONE: 'none';
  ERROR: 'error';
  BASIC: 'basic';
  DETAILED: 'detailed';
}

export const API_LOG_LEVELS: ApiLogLevel = {
  NONE: 'none',
  ERROR: 'error',
  BASIC: 'basic',
  DETAILED: 'detailed',
};

// You can change this to control logging level
export const CURRENT_LOG_LEVEL: keyof ApiLogLevel = __DEV__ ? 'DETAILED' : 'ERROR';

export class ApiLogger {
  private static shouldLog(level: keyof ApiLogLevel): boolean {
    if (CURRENT_LOG_LEVEL === 'NONE') return false;
    if (CURRENT_LOG_LEVEL === 'ERROR') return level === 'ERROR';
    if (CURRENT_LOG_LEVEL === 'BASIC') return ['ERROR', 'BASIC'].includes(level);
    if (CURRENT_LOG_LEVEL === 'DETAILED') return true;
    return false;
  }

  static logRequest(config: any) {
    if (!this.shouldLog('DETAILED')) return;

    const logData = {
      type: 'REQUEST',
      method: config.method?.toUpperCase(),
      url: `${config.baseURL || ''}${config.url || ''}`,
      headers: this.sanitizeHeaders(config.headers),
      payload: config.data,
      timeout: config.timeout,
      params: config.params,
      timestamp: new Date().toISOString(),
    };

    console.group('🚀 API Request');
    console.log('Method:', logData.method);
    console.log('URL:', logData.url);
    console.log('Headers:', logData.headers);
    if (config.data) {
      console.log('Payload:', logData.payload);
    }
    if (config.params) {
      console.log('Query Params:', logData.params);
    }
    console.log('Timeout:', logData.timeout);
    console.log('Timestamp:', logData.timestamp);
    console.groupEnd();
  }

  static logResponse(response: any) {
    if (!this.shouldLog('BASIC')) return;

    const logData = {
      type: 'RESPONSE',
      method: response.config.method?.toUpperCase(),
      url: `${response.config.baseURL}${response.config.url}`,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      timestamp: new Date().toISOString(),
    };

    console.group('✅ API Response');
    console.log('Method:', logData.method);
    console.log('URL:', logData.url);
    console.log('Status:', `${logData.status} ${logData.statusText}`);
    if (this.shouldLog('DETAILED')) {
      console.log('Response Headers:', logData.headers);
      console.log('Response Data:', logData.data);
    }
    console.log('Timestamp:', logData.timestamp);
    console.groupEnd();
  }

  static logError(error: any) {
    if (!this.shouldLog('ERROR')) return;

    try {
      const logData = {
        type: 'ERROR',
        method: error.config?.method?.toUpperCase() || 'UNKNOWN',
        url: error.config ? `${error.config.baseURL || ''}${error.config.url || ''}` : 'Unknown URL',
        status: error.response?.status || 'No Status',
        statusText: error.response?.statusText || 'No Status Text',
        headers: error.response?.headers || {},
        errorData: error.response?.data || 'No Response Data',
        message: error.message || 'No Error Message',
        code: error.code || 'No Error Code',
        timestamp: new Date().toISOString(),
      };

      console.group('❌ API Error');
      console.error('Method:', logData.method);
      console.error('URL:', logData.url);
      console.error('Status:', `${logData.status} ${logData.statusText}`);
      console.error('Error Code:', logData.code);
      console.error('Error Message:', logData.message);

      if (this.shouldLog('DETAILED')) {
        console.error('Error Headers:', logData.headers);
        console.error('Error Data:', logData.errorData);
        console.error('Full Error Object:', error);
      }

      console.error('Timestamp:', logData.timestamp);
      console.groupEnd();
    } catch (loggingError) {
      // Fallback logging if there's an issue with the structured logging
      console.error('❌ API Error (Fallback):', {
        originalError: error,
        loggingError: loggingError,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private static sanitizeHeaders(headers: any): any {
    if (!headers) return headers;

    const sanitized = { ...headers };

    // Hide sensitive information
    const sensitiveKeys = ['authorization', 'Authorization', 'auth', 'token', 'apikey', 'api-key'];

    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '***HIDDEN***';
      }
    });

    return sanitized;
  }

  // Method to change log level at runtime
  static setLogLevel(level: keyof ApiLogLevel) {
    // Note: This would require making CURRENT_LOG_LEVEL mutable
  }
}