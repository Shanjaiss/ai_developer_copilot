import { type FC, type RefObject } from 'react';
import { StatusPill } from '../ui/StatusPill';
import { Button } from '../ui/Button';
import type { ConnectionStatus } from '../../types';
import type { ActiveView } from './navigationItems';

export type { ActiveView } from './navigationItems';

export interface HeaderProps {
  connectionStatus: ConnectionStatus;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  activeView?: ActiveView;
  onViewChange?: (view: ActiveView) => void;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  triggerRef?: RefObject<HTMLButtonElement | null>;
}

export const Header: FC<HeaderProps> = ({
  connectionStatus,
  isRefreshing = false,
  onRefresh,
  isMobileMenuOpen = false,
  onToggleMobileMenu,
  triggerRef,
}) => {
  return (
    <header className="header-nav" role="banner">
      <div className="brand-section">
        {onToggleMobileMenu && (
          <button
            ref={triggerRef}
            type="button"
            id="mobile-nav-toggle-btn"
            className="mobile-nav-toggle"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            data-testid="mobile-nav-toggle"
          >
            <span className="hamburger-line" aria-hidden="true" />
            <span className="hamburger-line" aria-hidden="true" />
            <span className="hamburger-line" aria-hidden="true" />
          </button>
        )}

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
            <span>AI Developer Copilot</span>
            <span className="brand-badge">Phase 12 • Final Release</span>
          </h1>
          <p>Production Full-Stack &amp; AI Engineering Workspace</p>
        </div>
      </div>

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
};

export default Header;
