"""
Documentation Service for Phase 10: AI Documentation Generator.
Coordinates static AST/manifest extraction, repository intelligence reuse,
strict prompt assembly, secret redaction, and Ollama inference.
"""
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.documentation import (
    DocumentationAssumption,
    DocumentationMode,
    DocumentationRequest,
    DocumentationResponse,
    DocumentationSourceReference,
    DocumentationType,
    DocumentationVerifiedFact,
)
from app.services.documentation_extractor import DocumentationExtractor
from app.services.ollama_service import OllamaService, ollama_service
from app.services.repository_intelligence import (
    RepositoryIntelligenceService,
    repository_intelligence_service,
)
from app.services.repository_scanner import (
    RepositoryScanner,
    is_file_excluded,
    is_path_safe,
    redact_secrets,
    repository_scanner,
)

logger = logging.getLogger(__name__)


class DocumentationService:
    """Service handling multi-mode AI technical documentation generation."""

    def __init__(
        self,
        ollama: Optional[OllamaService] = None,
        intelligence: Optional[RepositoryIntelligenceService] = None,
        scanner: Optional[RepositoryScanner] = None,
    ):
        self.ollama = ollama or ollama_service
        self.intelligence = intelligence or repository_intelligence_service
        self.scanner = scanner or repository_scanner

    def _read_repo_file(self, repo_dir: Path, rel_path: str) -> Optional[str]:
        """Safely reads file content from an approved repository directory."""
        clean_rel = rel_path.strip().lstrip("/").replace("\\", "/")
        target = (repo_dir / clean_rel).resolve()
        if not is_path_safe(repo_dir, target):
            return None
        if is_file_excluded(target.name):
            return None
        if not target.is_file():
            return None
        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                return f.read()
        except Exception:
            return None

    async def generate_documentation(self, payload: DocumentationRequest) -> DocumentationResponse:
        """Main entry point for generating technical documentation."""
        mode = payload.mode
        doc_type = payload.documentation_type
        language = payload.language or "python"
        audience = payload.audience
        detail_level = payload.detail_level

        verified_facts: List[DocumentationVerifiedFact] = []
        assumptions: List[DocumentationAssumption] = []
        sources: List[DocumentationSourceReference] = []
        warnings: List[str] = []

        raw_context = ""
        repo_id = payload.repository_id
        file_path_used = payload.file_path

        # ---------------------------------------------------------------------
        # 1. Mode Dispatch & Context Collection
        # ---------------------------------------------------------------------
        if mode == "pasted_code":
            assert payload.code is not None
            cleaned_code = redact_secrets(payload.code)
            raw_context = cleaned_code

            # Static extraction based on language
            if language == "python":
                _, py_facts, py_sources, py_warn = DocumentationExtractor.extract_python_metadata(
                    cleaned_code, file_path="pasted_code"
                )
                verified_facts.extend(py_facts)
                sources.extend(py_sources)
                warnings.extend(py_warn)
            else:
                _, js_facts, js_sources, js_warn = DocumentationExtractor.extract_jsts_metadata(
                    cleaned_code, file_path="pasted_code"
                )
                verified_facts.extend(js_facts)
                sources.extend(js_sources)
                warnings.extend(js_warn)

            if not sources:
                sources.append(
                    DocumentationSourceReference(
                        path="pasted_code",
                        start_line=1,
                        end_line=len(cleaned_code.splitlines()),
                        snippet=cleaned_code[:2000],
                        reason="User-provided source code snippet",
                    )
                )

        elif mode in ("repository_readme", "architecture_documentation", "selected_file", "api_documentation"):
            # Check repository approval
            if repo_id:
                approved = settings.get_approved_repositories()
                if repo_id not in approved:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Repository '{repo_id}' is not in the approved repository list.",
                    )

                repo_dir = approved[repo_id]

                # Mode E validation first (so path traversal or secret file is rejected immediately!)
                if mode == "selected_file":
                    if not file_path_used or not file_path_used.strip():
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Selected-file mode requires 'file_path'.",
                        )
                    clean_rel = file_path_used.strip().lstrip("/").replace("\\", "/")
                    target_candidate = (repo_dir / clean_rel).resolve()
                    if not is_path_safe(repo_dir, target_candidate):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Unsafe file path detected: '{file_path_used}'. Path traversal is rejected.",
                        )
                    if is_file_excluded(target_candidate.name):
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Access to secret/restricted file '{file_path_used}' is strictly prohibited.",
                        )

                scan_res, scanned_files = self.scanner.scan_repository(repo_id, repo_dir)

                # Mode B: Repository README
                if mode == "repository_readme":
                    manifest_contents = {}
                    for mf in ["package.json", "requirements.txt", "pyproject.toml"]:
                        c = self._read_repo_file(repo_dir, mf)
                        if c:
                            manifest_contents[mf] = c

                    manifest_data, m_facts, m_assump, m_warn = DocumentationExtractor.extract_repository_manifest_facts(
                        scanned_files, manifest_contents=manifest_contents
                    )
                    verified_facts.extend(m_facts)
                    assumptions.extend(m_assump)
                    warnings.extend(m_warn)

                    # Build context from summary, manifests, and key files
                    repo_file_names = list(scanned_files.keys())[:30]
                    raw_context = (
                        f"Repository: {repo_id}\n"
                        f"Total Scanned Files: {len(scanned_files)}\n"
                        f"Key Files: {', '.join(repo_file_names)}\n"
                        f"Detected Entry Points: {', '.join(manifest_data.get('entry_points', [])) or 'None verified'}\n"
                        f"Dependencies: {', '.join(manifest_data.get('dependencies', [])) or 'None verified'}\n"
                        f"Scripts: {json.dumps(manifest_data.get('scripts', {}))}\n"
                    )

                    # Cite package.json / requirements.txt in sources
                    for mf in ["package.json", "requirements.txt", "pyproject.toml"]:
                        if mf in scanned_files:
                            sources.append(
                                DocumentationSourceReference(
                                    path=mf,
                                    reason=f"Repository dependency and configuration manifest: {mf}",
                                )
                            )

                # Mode C: API Documentation
                elif mode == "api_documentation":
                    if payload.code:
                        cleaned_code = redact_secrets(payload.code)
                        raw_context = cleaned_code
                        _, py_facts, py_sources, _ = DocumentationExtractor.extract_python_metadata(
                            cleaned_code, file_path="pasted_api_code"
                        )
                        verified_facts.extend(py_facts)
                        sources.extend(py_sources)
                    else:
                        # Find potential router files in repository
                        router_files = [
                            f for f in scanned_files.keys()
                            if any(part in f.lower() for part in ["router", "route", "api", "endpoint", "view"])
                        ]
                        if not router_files:
                            router_files = [f for f in scanned_files.keys() if f.endswith((".py", ".ts", ".js"))][:3]

                        combined_api_code = []
                        for rf in router_files[:3]:
                            content = self._read_repo_file(repo_dir, rf)
                            if content:
                                combined_api_code.append(f"--- File: {rf} ---\n{content[:2500]}")
                                sources.append(
                                    DocumentationSourceReference(
                                        path=rf,
                                        start_line=1,
                                        end_line=len(content.splitlines()),
                                        reason=f"Discovered API routing module: {rf}",
                                    )
                                )
                                if rf.endswith(".py"):
                                    _, ep_facts, _, _ = DocumentationExtractor.extract_python_metadata(content, file_path=rf)
                                    verified_facts.extend(ep_facts)
                                else:
                                    _, js_facts, _, _ = DocumentationExtractor.extract_jsts_metadata(content, file_path=rf)
                                    verified_facts.extend(js_facts)

                        raw_context = "\n\n".join(combined_api_code) or "No API routing code discovered in repository."

                # Mode D: Architecture Documentation
                elif mode == "architecture_documentation":
                    manifest_contents = {}
                    for mf in ["package.json", "requirements.txt", "pyproject.toml"]:
                        c = self._read_repo_file(repo_dir, mf)
                        if c:
                            manifest_contents[mf] = c

                    manifest_data, m_facts, m_assump, m_warn = DocumentationExtractor.extract_repository_manifest_facts(
                        scanned_files, manifest_contents=manifest_contents
                    )
                    verified_facts.extend(m_facts)
                    assumptions.extend(m_assump)
                    warnings.extend(m_warn)

                    arch_summary = scan_res.summary
                    raw_context = (
                        f"Repository: {repo_id}\n"
                        f"Entry Points: {arch_summary.entry_points}\n"
                        f"Total Files: {arch_summary.total_files_scanned}, Languages: {arch_summary.languages}\n"
                        f"Component Structure:\n"
                    )
                    # Include top-level folders and key files
                    for path_str in list(scanned_files.keys())[:25]:
                        meta = scanned_files[path_str]
                        deps = getattr(meta, "local_dependencies", []) if hasattr(meta, "local_dependencies") else []
                        raw_context += f" - {path_str} (deps: {', '.join(deps[:3]) or 'none'})\n"

                    sources.append(
                        DocumentationSourceReference(
                            path="repository_file_tree",
                            reason=f"Repository file hierarchy and dependency graph of '{repo_id}'",
                        )
                    )

                # Mode E: Selected File
                elif mode == "selected_file":
                    clean_rel = (file_path_used or "").strip().lstrip("/").replace("\\", "/")
                    file_content = self._read_repo_file(repo_dir, clean_rel)
                    if file_content is None:
                        raise HTTPException(
                            status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"File '{file_path_used}' not found in scanned repository files.",
                        )

                    cleaned_code = redact_secrets(file_content)
                    raw_context = cleaned_code

                    # Static extraction
                    if clean_rel.endswith(".py"):
                        _, py_facts, py_sources, py_warn = DocumentationExtractor.extract_python_metadata(
                            cleaned_code, file_path=clean_rel
                        )
                        verified_facts.extend(py_facts)
                        sources.extend(py_sources)
                        warnings.extend(py_warn)
                    else:
                        _, js_facts, js_sources, js_warn = DocumentationExtractor.extract_jsts_metadata(
                            cleaned_code, file_path=clean_rel
                        )
                        verified_facts.extend(js_facts)
                        sources.extend(js_sources)
                        warnings.extend(js_warn)

                    # Dependency context
                    try:
                        dep_res = self.intelligence.get_file_dependencies(repo_id, clean_rel)
                        if dep_res.imported_by:
                            verified_facts.append(
                                DocumentationVerifiedFact(
                                    category="dependency_graph",
                                    fact=f"Imported by {len(dep_res.imported_by)} modules: {', '.join(dep_res.imported_by[:4])}",
                                    evidence="Repository dependency graph analysis",
                                )
                            )
                        if dep_res.local_dependencies:
                            verified_facts.append(
                                DocumentationVerifiedFact(
                                    category="dependency_graph",
                                    fact=f"Depends on local modules: {', '.join(dep_res.local_dependencies[:4])}",
                                    evidence="Repository import resolution",
                                )
                            )
                    except Exception as e:
                        logger.warning("Could not retrieve file dependencies for %s: %s", clean_rel, e)

                    sources.append(
                        DocumentationSourceReference(
                            path=clean_rel,
                            start_line=1,
                            end_line=len(file_content.splitlines()),
                            reason=f"Selected source file: {clean_rel}",
                        )
                    )

            elif payload.code:
                # Mode C with pasted code without repo
                cleaned_code = redact_secrets(payload.code)
                raw_context = cleaned_code
                _, py_facts, py_sources, _ = DocumentationExtractor.extract_python_metadata(
                    cleaned_code, file_path="pasted_api_code"
                )
                verified_facts.extend(py_facts)
                sources.extend(py_sources)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Mode '{mode}' requires valid repository or code input.",
                )

        # ---------------------------------------------------------------------
        # 2. Context Budgeting & Redaction
        # ---------------------------------------------------------------------
        char_budget = 8000
        redacted_context = redact_secrets(raw_context)
        if len(redacted_context) > char_budget:
            warnings.append(f"Source context exceeded {char_budget} chars and was truncated for inference.")
            redacted_context = redacted_context[:char_budget]

        # ---------------------------------------------------------------------
        # 3. Prompt Construction
        # ---------------------------------------------------------------------
        prompt = self.build_documentation_prompt(
            mode=mode,
            doc_type=doc_type,
            language=language,
            audience=audience,
            detail_level=detail_level,
            context=redacted_context,
            verified_facts=verified_facts,
            assumptions=assumptions,
            repository_id=repo_id,
            file_path=file_path_used,
        )

        # ---------------------------------------------------------------------
        # 4. Dispatch to Ollama
        # ---------------------------------------------------------------------
        try:
            raw_json = await self.ollama._generate_json(prompt=prompt, temperature=0.2)
        except HTTPException as he:
            if he.status_code in (status.HTTP_503_SERVICE_UNAVAILABLE, status.HTTP_504_GATEWAY_TIMEOUT):
                raise
            logger.warning("Ollama generation returned %s; using deterministic fallback: %s", he.status_code, he.detail)
            raw_json = {
                "title": f"{doc_type.replace('_', ' ').title()} Documentation",
                "markdown": "",
                "assumptions": [],
                "warnings": [f"AI model inference returned HTTP {he.status_code}; documentation synthesized from verified AST metadata."],
            }
        except Exception as exc:
            logger.error("Ollama execution failed: %s", exc)
            raw_json = {
                "title": f"{doc_type.replace('_', ' ').title()} Documentation",
                "markdown": "",
                "assumptions": [],
                "warnings": ["AI model inference encountered unexpected error; synthesized from verified static metadata."],
            }

        # ---------------------------------------------------------------------
        # 5. Normalize Model Output
        # ---------------------------------------------------------------------
        title, markdown_body, model_assump, model_warn = self.normalize_documentation_response(
            raw_json=raw_json,
            mode=mode,
            doc_type=doc_type,
            verified_facts=verified_facts,
            context=redacted_context,
        )

        assumptions.extend(model_assump)
        warnings.extend(model_warn)

        return DocumentationResponse(
            title=title,
            documentation_type=doc_type,
            mode=mode,
            language=language,
            markdown=markdown_body,
            sources=sources,
            verified_facts=verified_facts,
            assumptions=assumptions,
            warnings=warnings,
            model=settings.OLLAMA_MODEL,
            repository_used=repo_id,
            file_path_used=file_path_used,
        )

    def build_documentation_prompt(
        self,
        mode: DocumentationMode,
        doc_type: DocumentationType,
        language: str,
        audience: str,
        detail_level: str,
        context: str,
        verified_facts: List[DocumentationVerifiedFact],
        assumptions: List[DocumentationAssumption],
        repository_id: Optional[str] = None,
        file_path: Optional[str] = None,
    ) -> str:
        """Constructs an evidence-grounded prompt for documentation synthesis."""
        facts_block = "\n".join([f"- [{f.category}] {f.fact} (Evidence: {f.evidence})" for f in verified_facts[:12]])
        if not facts_block:
            facts_block = "None statically verified."

        return (
            "You are a Principal Technical Writer and Senior Software Architect.\n"
            "Generate professional, accurate, and developer-friendly documentation grounded STRICTLY in the provided code and verified facts.\n\n"
            "DOCUMENTATION RULES:\n"
            "1. NEVER invent endpoints, dependencies, configuration variables, installation flags, or features not evidenced.\n"
            "2. If an aspect is not evidenced in the context, explicitly state: 'Not verified from the available source files.'\n"
            "3. Format output in clean GitHub-Flavored Markdown with structured headings, parameters, code snippets, and tables.\n"
            "4. Keep output concise, structured, and focused without repeating statements.\n"
            f"5. Target Audience: {audience.capitalize()}.\n"
            f"6. Detail Level: {detail_level.capitalize()}.\n"
            f"7. Target Documentation Type: {doc_type}.\n\n"
            f"STATICALLY VERIFIED FACTS:\n{facts_block}\n\n"
            f"SOURCE CONTEXT ({mode}):\n"
            "```\n"
            f"{context}\n"
            "```\n\n"
            "You MUST respond ONLY with a valid, parseable JSON object adhering strictly to this schema:\n"
            "{\n"
            '  "title": "Document Title",\n'
            '  "markdown": "## Complete Markdown Documentation Content with clear sections, code blocks, and tables.",\n'
            '  "assumptions": [\n'
            '    {\n'
            '      "claim": "Specific unverified claim or convention assumed",\n'
            '      "basis": "Indirect clue or standard pattern observed",\n'
            '      "verification_needed": "Action needed to confirm"\n'
            "    }\n"
            "  ],\n"
            '  "warnings": [\n'
            '    "Any notice regarding incomplete context or unverified configuration"\n'
            "  ]\n"
            "}\n\n"
            "Return ONLY the raw JSON object. Do not include markdown code fence wrappers (```json)."
        )

    def normalize_documentation_response(
        self,
        raw_json: Dict[str, Any],
        mode: DocumentationMode,
        doc_type: DocumentationType,
        verified_facts: List[DocumentationVerifiedFact],
        context: str,
    ) -> Tuple[str, str, List[DocumentationAssumption], List[str]]:
        """Normalizes and safeguards Ollama's returned JSON dictionary."""
        title = raw_json.get("title") or f"{doc_type.replace('_', ' ').title()} Documentation"
        markdown_text = raw_json.get("markdown") or ""

        # Fallback if model returned empty markdown
        if not markdown_text.strip():
            markdown_text = (
                f"# {title}\n\n"
                f"Generated documentation for mode `{mode}` ({doc_type}).\n\n"
                "## Overview\n"
                "This technical document was generated based on verified AST and repository metadata.\n\n"
                "## Verified Characteristics\n"
            )
            for f in verified_facts:
                markdown_text += f"- **{f.category.title()}**: {f.fact}\n"

            markdown_text += (
                "\n## Source Scope\n"
                "```\n"
                f"{context[:1000]}\n"
                "```\n"
            )

        model_assump: List[DocumentationAssumption] = []
        raw_assumptions = raw_json.get("assumptions", [])
        if isinstance(raw_assumptions, list):
            for a in raw_assumptions:
                if isinstance(a, dict) and "claim" in a:
                    model_assump.append(
                        DocumentationAssumption(
                            claim=str(a.get("claim", "")),
                            basis=str(a.get("basis", "Model inference")),
                            verification_needed=str(a.get("verification_needed", "Review project source")),
                        )
                    )

        model_warn: List[str] = []
        raw_warnings = raw_json.get("warnings", [])
        if isinstance(raw_warnings, list):
            for w in raw_warnings:
                if isinstance(w, str) and w.strip():
                    model_warn.append(w.strip())

        return title, markdown_text, model_assump, model_warn


documentation_service = DocumentationService()
