import { useEffect, useRef, type FC } from 'react';
import { NAV_ITEMS, type ActiveView } from './navigationItems';

export interface MobileNavDrawerProps {
  isOpen: boolean;
  activeView: ActiveView;
  onSelectView: (view: ActiveView) => void;
  onClose: () => void;
}

export const MobileNavDrawer: FC<MobileNavDrawerProps> = ({
  isOpen,
  activeView,
  onSelectView,
  onClose,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Prevent background scrolling while open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // Set initial focus to close button
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => {
        document.body.style.overflow = originalOverflow;
        clearTimeout(timer);
      };
    }
  }, [isOpen]);

  // Support Escape key to close & Tab key trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="mobile-nav-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid="mobile-nav-backdrop"
    >
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        className="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
        onClick={(e) => e.stopPropagation()}
        data-testid="mobile-nav-drawer"
      >
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <span className="drawer-brand-icon" aria-hidden="true">
              ✨
            </span>
            <div>
              <span className="drawer-title">Navigation Menu</span>
              <span className="drawer-subtitle">11 Engineering Modules</span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close navigation menu"
            data-testid="drawer-close-btn"
          >
            ✕
          </button>
        </div>

        <nav
          className="mobile-drawer-nav"
          role="tablist"
          aria-label="Mobile feature navigation"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-tab-${item.id}`}
                role="tab"
                aria-selected={isActive}
                className={`view-tab mobile-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
              >
                <span className="sidebar-tab-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <div className="sidebar-tab-content">
                  <span className="sidebar-tab-label">{item.label}</span>
                  <span className="sidebar-tab-desc">{item.description}</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default MobileNavDrawer;

