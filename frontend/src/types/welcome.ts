/**
 * Welcome endpoint response schema.
 */
export interface WelcomeResponse {
  message: string;
  service: string;
  version: string;
  status: string;
  docs_url: string;
}
