/**
 * Health check endpoint response schema.
 */
export interface HealthResponse {
  status: string;
  service: string;
  environment: string;
  version: string;
  timestamp: string;
}

export type ConnectionStatus = 'checking' | 'healthy' | 'offline';
