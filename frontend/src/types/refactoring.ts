import type { GroundedReference } from './repository';

export interface CodeSmell {
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  line: number | null;
  evidence: string[];
}

export interface RefactoringSuggestion {
  title: string;
  reason: string;
  original_code: string;
  refactored_code: string;
  diff: string;
  benefits: string[];
  risks: string[];
  verification_steps: string[];
}

export interface RefactoringChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CrossFileImpact {
  file_path: string;
  impact_type: 'caller' | 'dependency' | 'imported_by' | 'signature_risk';
  description: string;
}

export type RefactorMode = 'pasted_code' | 'repository_file';

export interface RefactorRequest {
  code?: string;
  language?: string;
  goal?: string;
  repository_id?: string | null;
  file_path?: string | null;
  code_range?: string | null;
  conversation?: RefactoringChatMessage[];
}

export interface RefactorResponse {
  summary: string;
  language: string;
  mode: RefactorMode;
  code_smells: CodeSmell[];
  refactorings: RefactoringSuggestion[];
  cross_file_impacts: CrossFileImpact[];
  references: GroundedReference[];
  warnings: string[];
  model: string;
  repository_id: string | null;
  file_path: string | null;
}

