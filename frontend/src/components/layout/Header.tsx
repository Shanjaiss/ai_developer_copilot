import { StatusPill } from '../ui/StatusPill';
import { Button } from '../ui/Button';
import type { ConnectionStatus } from '../../types';

export type ActiveView = 'dashboard' | 'explainer' | 'review' | 'optimizer' | 'test-generator' | 'chat' | 'repository-intelligence' | 'debugging';

export interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  activeView?: ActiveView;
  onViewChange?: (view: ActiveView) => void;
}

export function Header({
  connectionStatus,
  isRefreshing = false,
  onRefresh,
  activeView = 'chat',
  onViewChange,
}: HeaderProps) {
  return (
    <header className="header-nav">
      <div className="brand-section">
        <div className="brand-logo" aria-label="AI Developer Copilot Logo">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="brand-info">
          <h1>
            AI Developer Copilot
            <span className="brand-badge">Phase 8 • AI Debugger</span>
          </h1>
          <p>Production Full-Stack &amp; AI Engineering Workspace</p>
        </div>
      </div>

      {onViewChange && (
        <div className="view-tabs" role="tablist" aria-label="Feature navigation">
          <button
            id="tab-debugging"
            role="tab"
            aria-selected={activeView === 'debugging'}
            className={`view-tab ${activeView === 'debugging' ? 'active' : ''}`}
            onClick={() => onViewChange('debugging')}
          >
            <span>🐛</span> AI Debugger
          </button>
          <button
            id="tab-repo-intelligence"
            role="tab"
            aria-selected={activeView === 'repository-intelligence'}
            className={`view-tab ${activeView === 'repository-intelligence' ? 'active' : ''}`}
            onClick={() => onViewChange('repository-intelligence')}
          >
            <span>🧠</span> Repo Intelligence
          </button>
          <button
            id="tab-ai-chat"
            role="tab"
            aria-selected={activeView === 'chat'}
            className={`view-tab ${activeView === 'chat' ? 'active' : ''}`}
            onClick={() => onViewChange('chat')}
          >
            <span>💬</span> AI Chat
          </button>
          <button
            id="tab-test-generator"
            role="tab"
            aria-selected={activeView === 'test-generator'}
            className={`view-tab ${activeView === 'test-generator' ? 'active' : ''}`}
            onClick={() => onViewChange('test-generator')}
          >
            <span>🧪</span> AI Test Generator
          </button>
          <button
            id="tab-code-optimizer"
            role="tab"
            aria-selected={activeView === 'optimizer'}
            className={`view-tab ${activeView === 'optimizer' ? 'active' : ''}`}
            onClick={() => onViewChange('optimizer')}
          >
            <span>🚀</span> AI Code Optimizer
          </button>
          <button
            id="tab-code-review"
            role="tab"
            aria-selected={activeView === 'review'}
            className={`view-tab ${activeView === 'review' ? 'active' : ''}`}
            onClick={() => onViewChange('review')}
          >
            <span>🛡️</span> AI Code Review
          </button>
          <button
            id="tab-code-explainer"
            role="tab"
            aria-selected={activeView === 'explainer'}
            className={`view-tab ${activeView === 'explainer' ? 'active' : ''}`}
            onClick={() => onViewChange('explainer')}
          >
            <span>⚡</span> AI Code Explainer
          </button>
          <button
            id="tab-dashboard"
            role="tab"
            aria-selected={activeView === 'dashboard'}
            className={`view-tab ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => onViewChange('dashboard')}
          >
            <span>📊</span> System Dashboard
          </button>
        </div>
      )}

      <div className="nav-actions">
        <StatusPill status={connectionStatus} />

        {onRefresh && (
          <Button
            id="refresh-status-btn"
            variant="refresh"
            onClick={onRefresh}
            isLoading={isRefreshing}
            aria-label="Refresh Backend Connectivity Status"
          >
            <span>{isRefreshing ? 'Checking...' : 'Refresh'}</span>
          </Button>
        )}
      </div>
    </header>
  );
}

export default Header;
