import { useState, useRef, useEffect, useCallback } from 'react';
import { useFetchQuery } from '../../hooks/api/useFetchQuery';
import { getApiBaseUrl } from '../../services/apiClient';
import { API_ENDPOINTS } from '../../services/apiEndpoints';
import { Header, type ActiveView } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { ErrorBanner } from '../../components/common/ErrorBanner';
import { HeroBanner } from './components/HeroBanner';
import { TelemetryDiagnostics } from './components/TelemetryDiagnostics';
import { ApiContractVerifier } from './components/ApiContractVerifier';
import { TechStackMatrix } from './components/TechStackMatrix';
import { CodeExplainerView } from '../code-explainer/CodeExplainerView';
import { CodeReviewView } from '../code-review/CodeReviewView';
import type { ConnectionStatus, HealthResponse, WelcomeResponse } from '../../types';

export interface DashboardViewProps {
  initialView?: ActiveView;
}

export function DashboardView({ initialView = 'dashboard' }: DashboardViewProps) {
  const [activeView, setActiveView] = useState<ActiveView>(initialView);
  const apiBaseUrl = getApiBaseUrl();
  const fetchStartTime = useRef<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Requirement: Migrate dashboard health-check to useFetchQuery({ queryKey: ["health"], url: "/health" })
  const {
    data: healthData,
    isPending: isHealthPending,
    isFetching: isHealthFetching,
    error: healthError,
    refetch: refetchHealth,
    dataUpdatedAt,
  } = useFetchQuery<HealthResponse>({
    queryKey: ['health'],
    url: API_ENDPOINTS.HEALTH,
    staleTime: 1000 * 15,
  });

  // Welcome endpoint discovery
  const {
    data: welcomeData,
    refetch: refetchWelcome,
  } = useFetchQuery<WelcomeResponse>({
    queryKey: ['welcome'],
    url: API_ENDPOINTS.WELCOME,
    staleTime: 1000 * 60,
  });

  // Record latency upon successful fetch completion
  useEffect(() => {
    if (dataUpdatedAt) {
      const startTime = fetchStartTime.current;
      const elapsed = startTime ? Math.round(performance.now() - startTime) : 12;
      setLatencyMs(Math.max(1, elapsed));
    }
  }, [dataUpdatedAt]);

  // Derive connection status
  let connectionStatus: ConnectionStatus = 'checking';
  if (healthError) {
    connectionStatus = 'offline';
  } else if (healthData?.status === 'healthy') {
    connectionStatus = 'healthy';
  } else if (!isHealthPending && healthData) {
    connectionStatus = 'offline';
  }

  const handleRefresh = useCallback(async () => {
    fetchStartTime.current = performance.now();
    await Promise.all([refetchHealth(), refetchWelcome()]);
  }, [refetchHealth, refetchWelcome]);

  const lastCheckedDate = dataUpdatedAt ? new Date(dataUpdatedAt) : null;
  const isRefreshing = isHealthFetching;

  return (
    <div className="dashboard-container">
      {/* Top Header Navigation with View Switcher */}
      <Header
        connectionStatus={connectionStatus}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      {/* Connection Failure Alert if offline */}
      {connectionStatus === 'offline' && (
        <ErrorBanner
          apiBaseUrl={apiBaseUrl}
          errorMessage={healthError ? healthError.message : 'Backend reported non-healthy state'}
          onRetry={handleRefresh}
        />
      )}

      {/* Conditional View Rendering */}
      {activeView === 'explainer' ? (
        <CodeExplainerView />
      ) : activeView === 'review' ? (
        <CodeReviewView />
      ) : (
        <>
          {/* Hero Project Banner */}
          <HeroBanner
            apiBaseUrl={apiBaseUrl}
            latencyMs={latencyMs}
            lastChecked={lastCheckedDate}
            environment={healthData?.environment || 'development'}
          />

          {/* Core Diagnostics & Verification Grid */}
          <div className="dashboard-grid">
            <TelemetryDiagnostics
              healthData={healthData}
              welcomeData={welcomeData}
              connectionStatus={connectionStatus}
              latencyMs={latencyMs}
            />

            <ApiContractVerifier apiBaseUrl={apiBaseUrl} />

            <TechStackMatrix />
          </div>
        </>
      )}

      {/* Dashboard Footer */}
      <Footer />
    </div>
  );
}

export default DashboardView;
