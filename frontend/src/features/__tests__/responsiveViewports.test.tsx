import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { DashboardView } from '../dashboard/DashboardView';
import { renderWithClient } from '../../test/testUtils';
import apiClient from '../../services/apiClient';
import type { ActiveView } from '../../components/layout/navigationItems';

describe('Responsive Viewports & Screen Width Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        status: 'healthy',
        service: 'ai-developer-copilot-backend',
        environment: 'development',
        version: '0.1.0',
        timestamp: '2026-11-01T12:00:00Z',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  const setViewport = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
    window.dispatchEvent(new Event('resize'));
  };

  const TARGET_VIEWPORTS = [
    { name: 'Small mobile (320px)', width: 320, height: 568 },
    { name: 'Mobile (375px)', width: 375, height: 667 },
    { name: 'Large mobile (430px)', width: 430, height: 932 },
    { name: 'Mobile landscape (667px)', width: 667, height: 375 },
    { name: 'Tablet (768px)', width: 768, height: 1024 },
    { name: 'Small laptop (1024px)', width: 1024, height: 768 },
    { name: 'Laptop (1366px)', width: 1366, height: 768 },
    { name: 'Desktop (1440px)', width: 1440, height: 900 },
    { name: 'Large desktop (1920px)', width: 1920, height: 1080 },
  ];

  const ALL_VIEWS: ActiveView[] = [
    'dashboard',
    'productivity',
    'documentation',
    'refactoring',
    'debugging',
    'repository-intelligence',
    'chat',
    'test-generator',
    'optimizer',
    'review',
    'explainer',
  ];

  TARGET_VIEWPORTS.forEach(({ name, width, height }) => {
    it(`renders Dashboard and Header navigation cleanly on ${name}`, () => {
      setViewport(width, height);
      const { container } = renderWithClient(<DashboardView initialView="dashboard" />);

      // Verify Brand header & status badge
      expect(screen.getByRole('heading', { level: 1, name: /AI Developer Copilot/i })).toBeInTheDocument();
      expect(screen.getByText(/Phase 12 • Final Release/i)).toBeInTheDocument();

      // Verify application container & layout shell exist
      expect(container.querySelector('.dashboard-container')).toBeInTheDocument();
      expect(container.querySelector('.app-layout-shell')).toBeInTheDocument();
      expect(container.querySelector('.main-content-area')).toBeInTheDocument();

      // Verify Hamburger menu trigger exists
      const toggle = screen.getByTestId('mobile-nav-toggle');
      expect(toggle).toBeInTheDocument();
    });
  });

  it('renders all 11 AI feature pages on 320px small mobile without layout errors', () => {
    setViewport(320, 568);

    ALL_VIEWS.forEach((view) => {
      const { container } = renderWithClient(<DashboardView initialView={view} />);
      expect(container.querySelector('.main-content-area')).toBeInTheDocument();
      expect(container.querySelector('.header-nav')).toBeInTheDocument();
    });
  });

  it('renders all 11 AI feature pages on 768px tablet without layout errors', () => {
    setViewport(768, 1024);

    ALL_VIEWS.forEach((view) => {
      const { container } = renderWithClient(<DashboardView initialView={view} />);
      expect(container.querySelector('.main-content-area')).toBeInTheDocument();
    });
  });

  it('renders all 11 AI feature pages on 1440px desktop with full sidebar without layout errors', () => {
    setViewport(1440, 900);

    ALL_VIEWS.forEach((view) => {
      const { container } = renderWithClient(<DashboardView initialView={view} />);
      expect(container.querySelector('.desktop-sidebar')).toBeInTheDocument();
      expect(container.querySelector('.main-content-area')).toBeInTheDocument();
    });
  });
});

