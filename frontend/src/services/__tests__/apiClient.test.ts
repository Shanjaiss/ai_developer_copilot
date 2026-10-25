import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient, getApiBaseUrl } from '../apiClient';
import { ApiError } from '../../types/api';

describe('apiClient Service & Interceptors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves and sanitizes base URL without trailing slashes', () => {
    const baseUrl = getApiBaseUrl();
    expect(baseUrl).toBeTruthy();
    expect(baseUrl.endsWith('/')).toBe(false);
  });

  it('returns data when server responds successfully', async () => {
    const mockData = { status: 'healthy', version: '0.1.0' };
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
      data: mockData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });

    const response = await apiClient.get('/health');
    expect(response.data).toEqual(mockData);
  });

  it('handles typed ApiError on server error response with detail payload', async () => {
    const axiosError = {
      isAxiosError: true,
      name: 'AxiosError',
      message: 'Request failed with status code 400',
      response: {
        status: 400,
        data: { detail: 'Validation failed: Invalid parameter' },
      },
    };

    // Test the response interceptor rejection handler directly
    const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    await expect(errorHandler(axiosError)).rejects.toThrow(ApiError);
    try {
      await errorHandler(axiosError);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.message).toBe('Validation failed: Invalid parameter');
      expect(apiErr.data).toEqual({ detail: 'Validation failed: Invalid parameter' });
    }
  });

  it('converts network timeouts into friendly ApiError', async () => {
    const timeoutError = {
      isAxiosError: true,
      code: 'ECONNABORTED',
      message: 'timeout of 15000ms exceeded',
    };

    const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    await expect(errorHandler(timeoutError)).rejects.toThrow(ApiError);
    try {
      await errorHandler(timeoutError);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toContain('Request timed out');
      expect(apiErr.code).toBe('ECONNABORTED');
    }
  });

  it('handles request cancellation properly', async () => {
    vi.spyOn(axios, 'isCancel').mockReturnValueOnce(true);
    const cancelError = {
      name: 'CanceledError',
      message: 'canceled',
    };

    const errorHandler = (apiClient.interceptors.response as any).handlers[0].rejected;

    try {
      await errorHandler(cancelError);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe('The request was cancelled.');
    }
  });
});
