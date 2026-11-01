export type ActiveView =
  | 'dashboard'
  | 'productivity'
  | 'documentation'
  | 'refactoring'
  | 'debugging'
  | 'repository-intelligence'
  | 'chat'
  | 'test-generator'
  | 'optimizer'
  | 'review'
  | 'explainer';

export interface NavItem {
  id: ActiveView;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'productivity',
    label: 'Productivity',
    shortLabel: 'Productivity',
    icon: '📈',
    description: 'Telemetry & Analytics',
  },
  {
    id: 'documentation',
    label: 'AI Docs',
    shortLabel: 'Docs',
    icon: '📖',
    description: 'README & API Specs',
  },
  {
    id: 'refactoring',
    label: 'AI Refactor',
    shortLabel: 'Refactor',
    icon: '🔄',
    description: 'Code Smell Remediation',
  },
  {
    id: 'debugging',
    label: 'AI Debugger',
    shortLabel: 'Debug',
    icon: '🐛',
    description: 'Root Cause & Fixes',
  },
  {
    id: 'repository-intelligence',
    label: 'Repo Intelligence',
    shortLabel: 'Repo Intel',
    icon: '🧠',
    description: 'AST Graphs & Q&A',
  },
  {
    id: 'chat',
    label: 'AI Chat',
    shortLabel: 'Chat',
    icon: '💬',
    description: 'Pair Programming',
  },
  {
    id: 'test-generator',
    label: 'AI Test Generator',
    shortLabel: 'Test Gen',
    icon: '🧪',
    description: 'Pytest, Jest, Vitest',
  },
  {
    id: 'optimizer',
    label: 'AI Code Optimizer',
    shortLabel: 'Optimizer',
    icon: '🚀',
    description: 'Algorithmic Speedups',
  },
  {
    id: 'review',
    label: 'AI Code Review',
    shortLabel: 'Review',
    icon: '🛡️',
    description: 'Defects & Security',
  },
  {
    id: 'explainer',
    label: 'AI Code Explainer',
    shortLabel: 'Explainer',
    icon: '⚡',
    description: 'Logic & Complexity',
  },
  {
    id: 'dashboard',
    label: 'System Dashboard',
    shortLabel: 'Dashboard',
    icon: '📊',
    description: 'Status & Hardware Health',
  },
];

