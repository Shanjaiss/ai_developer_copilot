# Frontend API Architecture & TanStack Query Guide

This guide documents the scalable, feature-based API client architecture designed for **AI Developer Copilot**. It details how generic CRUD hooks, TanStack Query v5, and Axios interceptors interact to provide robust state management, request deduplication, typed caching, and error resilience.

---

## 1. Architectural Overview & Philosophy

In modern enterprise React applications, server state differs fundamentally from client UI state:
- **Client State**: Transient, synchronous UI state (e.g., active tabs, modal visibility, dark mode).
- **Server State**: Asynchronous, shared, remotely persisted data not owned directly by the client, subject to network latency, stale data, and external mutations.

Rather than storing remote API responses in global Redux stores or ad-hoc `useState` + `useEffect` hooks, **TanStack Query** acts as an asynchronous state coordinator. Coupled with **Axios** as the transport layer and **TypeScript generics** for type safety, our system guarantees:
1. **Single Source of Truth**: Cached server data is managed deterministically with zero manual state duplication.
2. **Generic Reusability**: All CRUD operations use unified hooks (`useFetchQuery`, `useCreateQuery`, `useUpdateQuery`, `useDeleteQuery`) instead of proliferating one-off hooks like `useApiHealth`.
3. **Defense-in-Depth Error Handling**: Network errors, timeouts, and HTTP status codes are intercepted and normalized into typed `ApiError` instances.
4. **Automatic Request Deduplication & Cancellation**: Multiple components requesting identical query keys share a single in-flight network call, and unmounted components automatically abort active network requests via `AbortSignal`.

---

## 2. Directory Structure

```text
frontend/src/
├── app/
│   └── providers/
│       ├── QueryProvider.tsx       # Configures QueryClientProvider with production defaults
│       └── queryClient.ts          # QueryClient factory with retry policies & cache timings
├── hooks/
│   └── api/
│       ├── useFetchQuery.ts        # Generic GET queries (useQuery + AbortSignal)
│       ├── useCreateQuery.ts       # Generic POST mutations (useMutation + query invalidation)
│       ├── useUpdateQuery.ts       # Generic PUT/PATCH mutations
│       ├── useDeleteQuery.ts       # Generic DELETE mutations
│       └── index.ts                # Public API hooks barrel
├── services/
│   ├── apiClient.ts                # Centralized Axios client with request/response interceptors
│   ├── apiEndpoints.ts            # Centralized API endpoint routes
│   └── __tests__/
│       └── apiClient.test.ts       # Interceptor, error mapping & timeout unit tests
├── components/
│   ├── ui/                         # Atomic, presentational UI components (Button, Card, StatusPill, JsonInspector)
│   ├── common/                     # Reusable compound UI (ErrorBanner)
│   └── layout/                     # Shell layouts (Header, Footer)
├── features/
│   └── dashboard/                  # Dashboard domain feature
│       ├── components/             # HeroBanner, TelemetryDiagnostics, ApiContractVerifier, TechStackMatrix
│       ├── DashboardView.tsx       # Main dashboard orchestrator consuming useFetchQuery
│       └── __tests__/
│           └── DashboardView.test.tsx
├── types/
│   ├── api.ts                      # ApiError, ApiErrorPayload, QueryParams, ApiResponse
│   ├── health.ts                   # HealthResponse schema
│   ├── welcome.ts                  # WelcomeResponse schema
│   └── index.ts
└── utils/
    └── formatters.ts               # Date, timestamp, and latency helpers
```

---

## 3. Core Concepts

### A. TanStack Query Fundamentals
TanStack Query manages the lifecycle of asynchronous operations:
- Tracks request states: `isPending`, `isFetching`, `isSuccess`, `isError`.
- Deduplicates concurrent identical requests across different components.
- Manages an in-memory cache indexed by structured query keys.
- Transparently garbage-collects unused queries after `gcTime`.

### B. Query vs. Mutation
- **Queries (`useQuery`)**: Idempotent read operations (`GET`). They are declarative—you describe *what* data a component needs based on a `queryKey`, and the library decides *when* and *how* to fetch and cache it.
- **Mutations (`useMutation`)**: Imperative write/side-effect operations (`POST`, `PUT`, `PATCH`, `DELETE`). They execute only when invoked via `.mutate()` or `.mutateAsync()`.
- **Retry Policy Distinction**: Queries safely retry on transient network failures, whereas mutations **must never retry automatically** by default (`retry: 0`) to prevent duplicate writes (e.g., charging a card twice or creating duplicate database entities).

### C. Query Keys
Query keys uniquely identify queries in the cache. They are arrays containing strings, numbers, or serializable objects:
```ts
// Scalar key
['health']

// Hierarchical resource key
['projects', projectId]

// Parameterized query key
['projects', { page: 1, limit: 10, search: 'copilot' }]
```
When parameters change, TanStack Query automatically treats it as a new cache entry, canceling in-flight obsolete requests and serving cached data if available.

### D. Caching & Stale Time
- **`staleTime`**: The duration (in milliseconds) data is considered "fresh". While fresh, subsequent component mounts or window focuses return cached data **without** re-fetching over the network.
- **`gcTime` (formerly `cacheTime`)**: The duration inactive data remains in memory before being garbage-collected. If a component unmounts and remounts within `gcTime`, cached data displays instantly while a background revalidation occurs.

| State | Fresh (`staleTime` active) | Stale (`staleTime` expired) | Inactive (0 subscribers) |
|---|---|---|---|
| **Network Request?** | No (instant cache hit) | Yes (background revalidation) | No (awaits subscriber or GC) |
| **User Experience** | Instantaneous | Instantaneous with background sync | Memory freed after `gcTime` |

### E. Query Invalidation
When mutations succeed, local client cache becomes stale. Calling `queryClient.invalidateQueries({ queryKey })`:
1. Marks matching queries in the cache as stale.
2. Triggers an immediate background refetch for currently rendered queries.
Our `useCreateQuery`, `useUpdateQuery`, and `useDeleteQuery` accept an `invalidateQueries` option:
```ts
const { mutate } = useCreateQuery({
  url: '/api/v1/projects',
  invalidateQueries: [['projects']], // Invalidates ['projects'] and child queries like ['projects', 1]
});
```

### F. Axios Interceptors & Typed Error Handling
Axios interceptors sit between the network transport and application logic:
- **Request Interceptor**: Normalizes endpoint URLs, validates protocol prefixes, and attaches authorization headers without logging sensitive tokens.
- **Response Interceptor**: Intercepts HTTP errors (4xx, 5xx), timeouts (`ECONNABORTED`), network failures (`ERR_NETWORK`), and cancellations (`CanceledError`), transforming them into a normalized `ApiError`:
```ts
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
  }
}
```

### G. TypeScript Generics in API Hooks
Generics parameterize hooks so callers can specify input and output shapes with full autocomplete and compiler verification:
```ts
export function useFetchQuery<TData = unknown, TError = ApiError>(
  options: UseFetchQueryOptions<TData, TError>
): UseQueryResult<TData, TError>
```
When invoked:
```ts
// healthData is strictly inferred as HealthResponse | undefined
// healthError is strictly inferred as ApiError | null
const { data: healthData, error: healthError } = useFetchQuery<HealthResponse>({
  queryKey: ['health'],
  url: API_ENDPOINTS.HEALTH,
});
```

---

## 4. Why Generic Hooks Improve Reuse

| Traditional Approach (Specific Hooks) | Scalable Generic Approach (`useFetchQuery`) |
|---|---|
| `useApiHealth()`, `useGetProjects()`, `useGetUsers()` | Single `useFetchQuery<T>` parameterizing `queryKey` and `url` |
| 50 endpoints require 50 custom hook files with duplicate boilerplate | 50 endpoints reuse 4 generic hooks with centralized endpoints |
| Inconsistent error shapes and timeout handling per hook | Guaranteed identical error handling, cancellation, and caching policies |
| Difficult to maintain or refactor cache invalidation logic | Uniform declarative invalidation through `invalidateQueries` array |

---

## 5. Common Mistakes & Architectural Anti-Patterns

1. **Storing Query Data in Local `useState`**:
   - *Mistake:* `const [health, setHealth] = useState(); useEffect(() => { if (data) setHealth(data); }, [data]);`
   - *Why it's bad:* Creates a second out-of-sync cache. Derive UI values directly from `data` returned by the query.
2. **Hardcoding URLs in UI Components**:
   - *Mistake:* `fetch('http://localhost:8000/health')`
   - *Why it's bad:* Breaches separation of concerns and breaks environment mobility. Use `API_ENDPOINTS` catalog.
3. **Auto-Retrying Unsafe Mutations**:
   - *Mistake:* Setting `retry: 3` on a `POST` or `DELETE` mutation.
   - *Why it's bad:* Network timeouts can occur *after* the server processed the write; retrying causes duplicate inserts or charges.
4. **Over-Invalidating Queries**:
   - *Mistake:* Calling `queryClient.invalidateQueries()` without a specific `queryKey`.
   - *Why it's bad:* Forces every single cached query in the application to refetch simultaneously, creating a server thundering-herd problem.

---

## 6. Interview Questions & Detailed Answers

### Q1: How does TanStack Query handle race conditions when search inputs change rapidly?
**Answer:**  
When query parameters change rapidly (e.g., search keywords), TanStack Query generates a new query key for each unique input. When the key changes while a previous query is still in-flight:
1. TanStack Query automatically fires an `abort` signal to the active request's `AbortSignal`.
2. Axios aborts the underlying browser `fetch` or `XMLHttpRequest`.
3. Even if a delayed response arrives, TanStack Query ignores it because the query key has transitioned, completely eliminating stale data race conditions.

### Q2: What is the difference between `staleTime` and `gcTime` in TanStack Query v5?
**Answer:**  
`staleTime` determines when data is considered out-of-date and eligible for background re-fetching. Data within `staleTime` is served from cache without firing any network call.  
`gcTime` (Garbage Collection time) determines how long unused or unmounted queries remain retained in the cache before memory cleanup. If a query is unmounted, its data remains in cache for the duration of `gcTime` so that if the user returns to the view, cached data is shown instantly.

### Q3: Why should Axios interceptors reject with a custom `ApiError` class rather than raw Axios error objects?
**Answer:**  
Raw Axios error objects leak transport-layer implementation details (e.g., `error.response.data.detail`, `error.isAxiosError`) directly into UI components, tightly coupling presentation code to Axios. By normalizing errors into a clean, typed `ApiError` class with standard properties (`message`, `status`, `code`, `data`), UI components and error boundaries can handle errors uniformly regardless of the underlying HTTP client.
