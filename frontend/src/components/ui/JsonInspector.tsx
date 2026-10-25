import type { ReactNode } from 'react';

export interface JsonInspectorProps {
  data: unknown;
  title?: string;
  headerControls?: ReactNode;
  fallbackText?: string;
}

export function JsonInspector({
  data,
  title = 'LIVE JSON PAYLOAD',
  headerControls,
  fallbackText = '// No data received yet. Ensure backend server is active.',
}: JsonInspectorProps) {
  const formattedJson =
    data !== null && data !== undefined
      ? JSON.stringify(data, null, 2)
      : fallbackText;

  return (
    <div className="json-inspector">
      <div className="inspector-header">
        <span>{title}</span>
        {headerControls && <div>{headerControls}</div>}
      </div>
      <pre className="json-pre">{formattedJson}</pre>
    </div>
  );
}

export default JsonInspector;
