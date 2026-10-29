import { QueryProvider } from './app/providers/QueryProvider';
import { DashboardView } from './features/dashboard/DashboardView';
import './App.css';

/**
 * Root Application component providing TanStack Query context and mounting Dashboard.
 */
export function App() {
  return (
    <QueryProvider>
      <DashboardView initialView="chat" />
    </QueryProvider>
  );
}

export default App;
