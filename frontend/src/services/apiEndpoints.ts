/**
 * Centralized API Endpoints Catalog.
 * Prevents hardcoding URLs across UI components.
 */
export const API_ENDPOINTS = {
  /** Root welcome and API discovery endpoint */
  WELCOME: '/',
  /** Health probe and telemetry endpoint */
  HEALTH: '/health',
  /** Interactive Swagger UI endpoint */
  DOCS: '/docs',
  /** AI code explanation engine endpoint */
  AI_EXPLAIN: '/api/v1/ai/explain',
  /** AI code review and bug detection engine endpoint */
  AI_REVIEW: '/api/v1/ai/review',
  /** AI code optimization engine endpoint */
  AI_OPTIMIZE: '/api/v1/ai/optimize',
  /** AI unit test generation engine endpoint */
  AI_GENERATE_TESTS: '/api/v1/ai/generate-tests',
  /** Future projects resource endpoint */
  PROJECTS: '/api/v1/projects',
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
