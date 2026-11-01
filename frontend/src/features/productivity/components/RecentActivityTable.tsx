import type { FC } from 'react';
import type { RecentActivityItem } from '../../../types';

export interface RecentActivityTableProps {
  activities: RecentActivityItem[];
  isLoading?: boolean;
}

export const RecentActivityTable: FC<RecentActivityTableProps> = ({
  activities,
  isLoading = false,
}) => {
  const formatTimestamp = (isoStr: string): string => {
    try {
      const dt = new Date(isoStr);
      if (isNaN(dt.getTime())) return isoStr;
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  const getFeatureIcon = (feature: string): string => {
    switch (feature) {
      case 'explain':
        return '⚡';
      case 'review':
        return '🛡️';
      case 'optimize':
        return '🚀';
      case 'test_generator':
        return '🧪';
      case 'chat':
        return '💬';
      case 'repository_intelligence':
        return '🧠';
      case 'debugging':
        return '🐛';
      case 'refactoring':
        return '🔄';
      case 'documentation':
        return '📖';
      default:
        return '✨';
    }
  };

  return (
    <div className="productivity-card" data-testid="recent-activity-card">
      <div className="productivity-card-header">
        <div>
          <h3 className="productivity-card-title">Recent Activity Telemetry Stream</h3>
          <p className="productivity-card-subtitle">
            Chronological audit of recent local operations (latest 20 events).
          </p>
        </div>
        <div className="privacy-badge" title="Strict Privacy Guarantee">
          <span className="privacy-icon">🔒</span>
          <span>Zero Prompt/Code Logging</span>
        </div>
      </div>

      <div className="privacy-notice-banner">
        <span className="privacy-icon">🛡️</span>
        <p>
          <strong>Privacy Guarantee:</strong> Telemetry records operational performance metadata
          only (feature, duration, outcome). User source code, prompts, chat messages, and keys are
          strictly excluded from all logging and storage.
        </p>
      </div>

      {isLoading ? (
        <div className="chart-loading-state" data-testid="activity-loading">
          <div className="loading-spinner" />
          <span>Retrieving recent telemetry events...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="chart-empty-state" data-testid="activity-empty">
          <span className="empty-icon">🕒</span>
          <p className="empty-title">No Activity Recorded Yet</p>
          <p className="empty-description">
            Your recent operations across code explanation, review, tests, chat, and docs will appear
            here in real-time.
          </p>
        </div>
      ) : (
        <div className="activity-table-wrapper" data-testid="activity-table-content">
          <table className="activity-table" aria-label="Recent Operations Telemetry">
            <thead>
              <tr>
                <th scope="col">Time</th>
                <th scope="col">Feature</th>
                <th scope="col">Operation</th>
                <th scope="col">Duration</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act) => (
                <tr key={act.event_id} data-testid={`activity-row-${act.event_id}`}>
                  <td className="cell-time">{formatTimestamp(act.timestamp)}</td>
                  <td className="cell-feature">
                    <span className="feature-pill">
                      <span className="feature-icon">{getFeatureIcon(act.feature)}</span>
                      <span>{act.feature_name}</span>
                    </span>
                  </td>
                  <td className="cell-op">
                    <code>{act.operation}</code>
                  </td>
                  <td className="cell-duration">
                    {act.duration_ms >= 1000
                      ? `${(act.duration_ms / 1000).toFixed(2)}s`
                      : `${Math.round(act.duration_ms)}ms`}
                  </td>
                  <td className="cell-outcome">
                    <span
                      className={`outcome-badge outcome-${act.outcome}`}
                      data-testid={`outcome-badge-${act.outcome}`}
                    >
                      {act.outcome === 'success' && '✓ Success'}
                      {act.outcome === 'failure' && '✗ Failed'}
                      {act.outcome === 'timeout' && '⏱ Timeout'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
