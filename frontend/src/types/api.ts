/**
 * Core API types and error definitions.
 */

export interface ApiErrorPayload {
  message?: string;
  detail?: string | Array<{ loc?: string[]; msg?: string; type?: string }>;
  code?: string;
  status?: number;
  [key: string]: unknown;
}

export class ApiError extends Error {
  public status?: number;
  public code?: string;
  public data?: unknown;

  constructor(message: string, status?: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;
