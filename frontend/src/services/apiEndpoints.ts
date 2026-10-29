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
  /** Conversational AI coding assistant endpoint (Phase 6) */
  AI_CHAT: '/api/v1/ai/chat',
  /** Approved repositories discovery endpoint (Phase 7) */
  REPOSITORIES: '/api/v1/repositories',
  /** Repository scan endpoint (Phase 7) */
  REPOSITORY_SCAN: (id: string) => `/api/v1/repositories/${id}/scan`,
  /** Repository tree endpoint (Phase 7) */
  REPOSITORY_TREE: (id: string) => `/api/v1/repositories/${id}/tree`,
  /** Repository contextual Q&A endpoint (Phase 7) */
  REPOSITORY_ASK: (id: string) => `/api/v1/repositories/${id}/ask`,
  /** Repository file dependencies endpoint (Phase 7) */
  REPOSITORY_DEPENDENCIES: (id: string) => `/api/v1/repositories/${id}/dependencies`,
  /** Future projects resource endpoint */
  PROJECTS: '/api/v1/projects',
} as const;

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];
