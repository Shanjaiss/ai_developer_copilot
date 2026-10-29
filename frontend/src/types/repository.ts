/**
 * TypeScript interfaces for Phase 7: AI Repository Intelligence Engine.
 */

export interface ApprovedRepository {
  id: string;
  name: string;
  description?: string;
}

export interface RepositoryListResponse {
  repositories: ApprovedRepository[];
  configured: boolean;
  message?: string;
}

export interface FileImport {
  module: string;
  is_local: boolean;
  symbols: string[];
}

export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  size_bytes: number;
  line_count: number;
  language: string;
  is_entry_point: boolean;
  imports: FileImport[];
  exports: string[];
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size_bytes?: number;
  language?: string;
  is_entry_point?: boolean;
  children?: TreeNode[];
}

export interface RepositorySummary {
  repository_id: string;
  total_files_scanned: number;
  total_lines: number;
  total_bytes: number;
  languages: Record<string, number>;
  entry_points: string[];
  is_partial: boolean;
  warnings: string[];
}

export interface RepositoryScanResponse {
  summary: RepositorySummary;
  tree: TreeNode[];
}

export interface GroundedReference {
  path: string;
  start_line: number;
  end_line: number;
  snippet: string;
  reason: string;
}

export interface RepositoryChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RepositoryAskRequest {
  question: string;
  conversation?: RepositoryChatMessage[];
  selected_paths?: string[];
}

export interface RepositoryAskResponse {
  answer: string;
  references: GroundedReference[];
  warnings: string[];
  model: string;
  context_used: boolean;
}

export interface RepositoryDependenciesRequest {
  path: string;
}

export interface RepositoryDependenciesResponse {
  path: string;
  local_dependencies: string[];
  external_dependencies: string[];
  imported_by: string[];
  confidence: 'high' | 'approximate';
  limitations: string[];
}

