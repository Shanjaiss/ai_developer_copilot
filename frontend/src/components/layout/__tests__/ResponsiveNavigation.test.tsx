import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { DashboardView } from '../../../features/dashboard/DashboardView';
import { renderWithClient } from '../../../test/testUtils';
import apiClient from '../../../services/apiClient';

describe('Responsive Navigation & Mobile Drawer Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        status: 'healthy',
        service: 'ai-developer-copilot-backend',
        environment: 'development',
        version: '0.1.0',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  it('renders hamburger menu toggle button with accessible aria attributes', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(toggleBtn).toHaveAttribute('aria-controls', 'mobile-nav-drawer');
  });

  it('opens mobile drawer when hamburger toggle is clicked and locks body scroll', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    // Drawer is now open
    expect(screen.getByRole('dialog', { name: /Navigation Menu/i })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: /Close navigation menu/i })).toBeInTheDocument();
  });

  it('closes mobile drawer and restores body scroll when close button is clicked', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    const closeBtn = screen.getByRole('button', { name: /Close navigation menu/i });
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog', { name: /Navigation Menu/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('closes mobile drawer and restores focus to hamburger toggle when pressing Escape', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('dialog', { name: /Navigation Menu/i })).toBeInTheDocument();

    // Fire Escape key
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /Navigation Menu/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.activeElement).toBe(toggleBtn);
  });

  it('closes mobile drawer when clicking the backdrop overlay', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    const backdrop = screen.getByTestId('mobile-nav-backdrop');
    fireEvent.click(backdrop);

    expect(screen.queryByRole('dialog', { name: /Navigation Menu/i })).not.toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('navigates to feature and closes drawer when selecting a navigation tab', () => {
    renderWithClient(<DashboardView initialView="dashboard" />);

    const toggleBtn = screen.getByRole('button', { name: /Toggle navigation menu/i });
    fireEvent.click(toggleBtn);

    const drawer = screen.getByRole('dialog', { name: /Navigation Menu/i });
    const explainerMobileTab = within(drawer).getByRole('tab', { name: /AI Code Explainer/i });
    fireEvent.click(explainerMobileTab);

    // Drawer should close
    expect(screen.queryByRole('dialog', { name: /Navigation Menu/i })).not.toBeInTheDocument();
    // Explainer view should be rendered
    expect(screen.getByRole('heading', { level: 2, name: /Local LLM Code Analysis/i })).toBeInTheDocument();
  });
});
