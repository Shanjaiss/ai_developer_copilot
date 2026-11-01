import { type FC } from 'react';
import { NAV_ITEMS, type ActiveView } from './navigationItems';

export interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
}

export const Sidebar: FC<SidebarProps> = ({ activeView, onViewChange }) => {
  return (
    <aside className="desktop-sidebar" aria-label="Main application navigation">
      <div className="sidebar-sticky-wrapper">
        <div className="sidebar-header">
          <span className="sidebar-title">Engineering Features</span>
          <span className="sidebar-badge">{NAV_ITEMS.length} Modules</span>
        </div>

        <nav className="sidebar-nav-list" role="tablist" aria-label="Feature navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                className={`view-tab sidebar-nav-tab ${isActive ? 'active' : ''}`}
                onClick={() => onViewChange(item.id)}
                title={`${item.label} — ${item.description}`}
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
    </aside>
  );
};

export default Sidebar;

