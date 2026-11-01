/**
 * TypeScript types for Phase 10: AI Documentation Generator.
 */

export type DocumentationType =
  | 'readme'
  | 'api'
  | 'function'
  | 'class'
  | 'module'
  | 'architecture'
  | 'inline_docstring';

export type DocumentationMode =
  | 'pasted_code'
  | 'repository_readme'
  | 'api_documentation'
  | 'architecture_documentation'
  | 'selected_file';

export type DocumentationAudience =
  | 'developer'
  | 'architect'
  | 'technical_writer'
  | 'beginner';

export type DocumentationDetailLevel =
  | 'concise'
  | 'standard'
  | 'comprehensive';

export interface DocumentationSourceReference {
  path: string;
  start_line?: number;
  end_line?: number;
  snippet?: string;
  reason?: string;
}

export interface DocumentationVerifiedFact {
  category: string;
  fact: string;
  evidence: string;
}

export interface DocumentationAssumption {
  claim: string;
  basis: string;
  verification_needed: string;
}

export interface DocumentationRequest {
  mode: DocumentationMode;
  documentation_type: DocumentationType;
  language?: string;
  code?: string;
  repository_id?: string | null;
  file_path?: string | null;
  audience?: DocumentationAudience;
  detail_level?: DocumentationDetailLevel;
}

export interface DocumentationResponse {
  title: string;
  documentation_type: DocumentationType;
  mode: DocumentationMode;
  language?: string;
  markdown: string;
  sources: DocumentationSourceReference[];
  verified_facts: DocumentationVerifiedFact[];
  assumptions: DocumentationAssumption[];
  warnings: string[];
  model: string;
  repository_used?: string | null;
  file_path_used?: string | null;
}

