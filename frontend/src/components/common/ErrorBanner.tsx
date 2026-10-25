export interface ErrorBannerProps {
  apiBaseUrl: string;
  errorMessage?: string | null;
  onRetry?: () => void;
}

export function ErrorBanner({ apiBaseUrl, errorMessage, onRetry }: ErrorBannerProps) {
  return (
    <div className="error-banner" role="alert">
      <div className="error-text">
        <strong>Connection Warning:</strong> Unable to reach backend at{' '}
        <code className="error-code">{apiBaseUrl}</code>. Ensure the FastAPI service is running:
        <code className="error-code" style={{ marginLeft: '8px' }}>
          cd backend &amp;&amp; source .venv/bin/activate &amp;&amp; uvicorn app.main:app --reload
        </code>
        {errorMessage && (
          <div style={{ marginTop: '6px', opacity: 0.9 }}>Details: {errorMessage}</div>
        )}
      </div>
      {onRetry && (
        <button
          className="endpoint-action-btn"
          onClick={onRetry}
          aria-label="Retry connection to backend"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
