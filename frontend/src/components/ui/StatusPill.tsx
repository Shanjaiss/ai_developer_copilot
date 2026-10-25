import type { ConnectionStatus } from '../../types';

export interface StatusPillProps {
  status: ConnectionStatus;
  id?: string;
  label?: string;
}

export function StatusPill({ status, id = 'backend-status-indicator', label }: StatusPillProps) {
  const defaultLabel =
    status === 'healthy'
      ? 'Backend: Connected & Healthy'
      : status === 'offline'
      ? 'Backend: Disconnected'
      : 'Backend: Verifying Status...';

  return (
    <div
      className={`status-pill ${status}`}
      id={id}
      role="status"
      aria-live="polite"
    >
      <span className="status-dot"></span>
      <span>{label || defaultLabel}</span>
    </div>
  );
}

export default StatusPill;
