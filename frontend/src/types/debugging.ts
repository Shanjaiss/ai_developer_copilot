import type { GroundedReference } from './repository';

export interface StackFrame {
  file_path: string | null;
  line_number: number | null;
  column_number?: number | null;
  function_name: string | null;
  code_line: string | null;
  is_in_repository: boolean;
}

export type DebugConfidence = 'high' | 'medium' | 'low';

export interface RootCauseHypothesis {
  title: string;
  description: string;
  confidence: DebugConfidence;
  evidence: string[];
}

export interface SuggestedFix {
  title: string;
  explanation: string;
  code_example: string | null;
  verification_steps: string[];
}

export interface DebugChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DebugRequest {
  error_message: string;
  stack_trace?: string;
  language?: string;
  code_context?: string;
  repository_id?: string | null;
  conversation?: DebugChatMessage[];
}

export interface DebugResponse {
  summary: string;
  error_type: string;
  language: string;
  parsed_frames: StackFrame[];
  root_causes: RootCauseHypothesis[];
  suggested_fixes: SuggestedFix[];
  references: GroundedReference[];
  warnings: string[];
  model: string;
  repository_used: string | null;
}

