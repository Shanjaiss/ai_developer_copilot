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
  /** AI bug detection and debugging assistant endpoint (Phase 8) */
  AI_DEBUG: '/api/v1/ai/debug',
  /** AI code refactoring assistant endpoint (Phase 9) */
  AI_REFACTOR: '/api/v1/ai/refactor',
  /** AI documentation generator endpoint (Phase 10) */
  AI_GENERATE_DOCUMENTATION: '/api/v1/ai/generate-documentation',
  /** Developer productivity summary endpoint (Phase 11) */
  PRODUCTIVITY_SUMMARY: '/api/v1/productivity/summary',
  /** Feature usage breakdown endpoint (Phase 11) */
  PRODUCTIVITY_FEATURES: '/api/v1/productivity/features',
  /** Performance timeline trend endpoint (Phase 11) */
  PRODUCTIVITY_PERFORMANCE: '/api/v1/productivity/performance',
  /** Recent telemetry activity stream endpoint (Phase 11) */
  PRODUCTIVITY_ACTIVITY: '/api/v1/productivity/activity',
  /** System and AI model health endpoint (Phase 11) */
  PRODUCTIVITY_HEALTH: '/api/v1/productivity/health',
  /** Clear telemetry metrics endpoint (Phase 11) */
  PRODUCTIVITY_CLEAR: '/api/v1/productivity/clear',
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
