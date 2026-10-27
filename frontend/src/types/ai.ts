/**
 * Types for the AI Code Explanation & Review Engines.
 */

export interface ExplainCodeRequest {
  code: string;
  language: string;
}

export interface ExplainCodeResponse {
  summary: string;
  line_by_line: string[];
  time_complexity: string;
  space_complexity: string;
  improvements: string[];
}

export type SupportedLanguage =
  | 'python'
  | 'typescript'
  | 'javascript'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'
  | 'csharp'
  | 'sql'
  | 'bash';

export type ReviewSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReviewOverallRisk = 'clean' | 'low' | 'medium' | 'high' | 'critical';

export type ReviewCategory =
  | 'correctness'
  | 'maintainability'
  | 'performance'
  | 'security'
  | 'style'
  | 'other';

export interface ReviewIssue {
  title: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  line: number | null;
  description: string;
  suggestion: string;
}

export interface ReviewCodeRequest {
  code: string;
  language: string;
}

export interface ReviewCodeResponse {
  summary: string;
  overall_risk: ReviewOverallRisk;
  issues: ReviewIssue[];
  improved_code: string;
}

export type OptimizationGoal = 'performance' | 'readability' | 'memory' | 'maintainability';

export interface ComplexityMetrics {
  time: string;
  space: string;
}

export interface OptimizationChange {
  title: string;
  reason: string;
  tradeoff: string;
}

export interface OptimizeCodeRequest {
  code: string;
  language: string;
  optimization_goal?: OptimizationGoal;
}

export interface OptimizeCodeResponse {
  summary: string;
  original_complexity: ComplexityMetrics;
  optimized_complexity: ComplexityMetrics;
  optimized_code: string;
  changes: OptimizationChange[];
  warnings: string[];
}


