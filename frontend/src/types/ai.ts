/**
 * Types for the AI Code Explanation Engine.
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
