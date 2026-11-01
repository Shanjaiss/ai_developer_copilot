"""
AI Code Refactoring Service for Phase 9.
Coordinates code smell detection, repository-aware cross-file impact analysis,
safe unified diff generation via `difflib`, secret redaction, and local Ollama inference.
"""
import difflib
import fnmatch
import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.refactoring import (
    CodeSmell,
    CrossFileImpact,
    RefactoringChatMessage,
    RefactoringSuggestion,
    RefactorRequest,
    RefactorResponse,
)
from app.schemas.repository import GroundedReference
from app.services.code_smell_analyzer import code_smell_analyzer
from app.services.ollama_service import ollama_service
from app.services.repository_intelligence import repository_intelligence_service
from app.services.repository_scanner import (
    EXCLUDED_FILE_NAMES,
    EXCLUDED_PATTERNS,
    SUPPORTED_EXTENSIONS,
    is_path_safe,
    redact_secrets,
    repository_scanner,
)

logger = logging.getLogger(__name__)

ADVISORY_DISCLAIMER = (
    "Refactoring suggestions are advisory. "
    "Never automatically apply AI-suggested code without manual review and regression testing."
)


def compute_unified_diff(original: str, refactored: str) -> str:
    """
    Computes deterministic line-level unified diff between original and refactored code.
    Purely standard-library difflib without shell invocation or filesystem modification.
    """
    orig_lines = original.splitlines()
    refact_lines = refactored.splitlines()

    diff_lines = list(
        difflib.unified_diff(
            orig_lines,
            refact_lines,
            fromfile="original",
            tofile="refactored",
            lineterm="",
        )
    )
    if not diff_lines:
        return "No textual differences detected."
    return "\n".join(diff_lines)


class RefactoringService:
    """
    Core service powering Phase 9 AI Code Refactoring Assistant.
    Provides local-first, safe, repository-aware refactoring advice.
    """

    def __init__(self):
        self.ollama = ollama_service

    def _get_validated_repo_root(self, repository_id: str) -> Path:
        """Validates that repository_id is server-approved and returns its canonical root."""
        approved = settings.get_approved_repositories()
        if not approved:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No approved repositories configured on the server.",
            )
        root = approved.get(repository_id)
        if not root or not root.exists() or not root.is_dir():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Repository '{repository_id}' is not in the server-approved repository allowlist.",
            )
        return root

    def _validate_and_read_repository_file(
        self,
        root_path: Path,
        file_path_str: str,
        code_range: Optional[str] = None,
    ) -> Tuple[str, str, int, int]:
        """
        Validates path safety, checks secret file exclusions, and reads repository file.
        Returns (content, detected_language, start_line, end_line).
        """
        clean_rel = file_path_str.strip().lstrip("/")
        target_path = (root_path / clean_rel).resolve()

        # Check path safety and traversal
        if not is_path_safe(root_path, target_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Path traversal or symlink escape detected outside approved repository root.",
            )

        if not target_path.exists() or not target_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File '{clean_rel}' not found within approved repository.",
            )

        # Check secret file exclusions
        file_name = target_path.name
        if file_name in EXCLUDED_FILE_NAMES or any(fnmatch.fnmatch(file_name, pat) for pat in EXCLUDED_PATTERNS):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Access to sensitive or secret file '{file_name}' is strictly prohibited.",
            )

        # Check file size limit
        file_size = target_path.stat().st_size
        if file_size > settings.REPO_MAX_FILE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {settings.REPO_MAX_FILE_SIZE_BYTES // 1024} KB.",
            )

        # Read file
        try:
            with open(target_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read file '{clean_rel}': {str(exc)}",
            )

        total_lines = len(lines)
        start_line = 1
        end_line = total_lines

        # Handle optional code_range (e.g. "10-50")
        if code_range:
            match = re.match(r"^(\d+)\s*[-:]\s*(\d+)$", code_range.strip())
            if match:
                req_start = int(match.group(1))
                req_end = int(match.group(2))
                if 1 <= req_start <= total_lines and req_start <= req_end:
                    start_line = req_start
                    end_line = min(total_lines, req_end)

        selected_lines = lines[start_line - 1 : end_line]
        content = "".join(selected_lines)

        # Detect language
        ext = target_path.suffix.lower()
        language = SUPPORTED_EXTENSIONS.get(ext, "text")

        return content, language, start_line, end_line

    def analyze_cross_file_impact(
        self,
        repository_id: str,
        root_path: Path,
        rel_file_path: str,
    ) -> List[CrossFileImpact]:
        """
        Inspects imports and repository dependencies to determine cross-file impact.
        Identifies potential callers that import the targeted file.
        """
        impacts: List[CrossFileImpact] = []

        try:
            # Reuses Phase 7 repository dependency inspection
            cached = repository_scanner.get_cached_scan(repository_id)
            if cached:
                _, scanned_files = cached
                clean_rel = rel_file_path.strip().lstrip("/").replace("\\", "/")
                if clean_rel not in scanned_files:
                    repository_scanner.clear_cache(repository_id)

            dep_info = repository_intelligence_service.get_file_dependencies(repository_id, rel_file_path)

            # 1. Other repository files that import this file (callers)
            for caller in dep_info.imported_by:
                impacts.append(
                    CrossFileImpact(
                        file_path=caller,
                        impact_type="caller",
                        description=(
                            f"File '{caller}' imports this module. "
                            "If function signatures or exported interfaces are refactored, verify callers in this file."
                        ),
                    )
                )

            # 2. Local modules imported by this file
            for local_dep in dep_info.local_dependencies:
                impacts.append(
                    CrossFileImpact(
                        file_path=local_dep,
                        impact_type="dependency",
                        description=f"Depends on '{local_dep}'. Verify import paths remain valid after refactoring.",
                    )
                )

        except Exception as exc:
            logger.warning("Could not calculate cross-file impact for %s: %s", rel_file_path, exc)

        return impacts

    def build_refactoring_prompt(
        self,
        code: str,
        language: str,
        smells: List[CodeSmell],
        goal: Optional[str],
        cross_impacts: List[CrossFileImpact],
        conversation: List[RefactoringChatMessage],
    ) -> str:
        """
        Builds a structured prompt instructing the local model to analyze maintainability
        and propose concrete refactorings adhering strictly to JSON.
        """
        prompt = (
            "You are an expert Principal Software Architect and Code Refactoring Specialist.\n"
            f"Analyze the following {language} code snippet and propose safe, high-impact refactorings.\n\n"
            "STRICT RULES:\n"
            "1. ADVISORY ONLY: You are strictly an advisory analysis engine. Never claim code was executed.\n"
            "2. BEHAVIOR PRESERVATION: Preserve public function signatures, return types, error handling, and runtime behavior.\n"
            "3. COMPLETE CODE: Provide complete, valid refactored code without ellipsis or truncated placeholders.\n"
            "4. TARGET DETECTED CODE SMELLS: Address the maintainability concerns identified below.\n"
            "5. OUTPUT FORMAT: Respond ONLY with a valid, parseable JSON object adhering strictly to the JSON schema below.\n\n"
            "JSON SCHEMA:\n"
            "{\n"
            '  "summary": "High-level architectural assessment of refactoring opportunities",\n'
            '  "code_smells": [\n'
            '    {\n'
            '      "type": "long_function" | "excessive_nesting" | "complex_conditional" | "duplicate_logic" | "other",\n'
            '      "title": "Short title of code smell",\n'
            '      "description": "Explanation of the maintainability issue",\n'
            '      "severity": "high" | "medium" | "low",\n'
            '      "line": 1,\n'
            '      "evidence": ["Code fragment or metric"]\n'
            '    }\n'
            '  ],\n'
            '  "refactorings": [\n'
            '    {\n'
            '      "title": "Actionable refactoring title (e.g. Extract Validation Helper)",\n'
            '      "reason": "Detailed explanation of why this change improves design and maintainability",\n'
            '      "original_code": "Targeted original code segment",\n'
            '      "refactored_code": "Improved refactored code",\n'
            '      "benefits": ["Benefit 1", "Benefit 2"],\n'
            '      "risks": ["Potential behavior-change risk to verify"],\n'
            '      "verification_steps": ["Step 1 to test", "Step 2 to test"]\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
        )

        if goal:
            prompt += f"=== DEVELOPER REFACTORING GOAL ===\n{goal.strip()}\n\n"

        if smells:
            prompt += "=== STATICALLY DETECTED CODE SMELLS ===\n"
            for smell in smells:
                prompt += f"- [{smell.severity.upper()}] {smell.title}: {smell.description}\n"
            prompt += "\n"

        if cross_impacts:
            prompt += "=== REPOSITORY CALLERS & DEPENDENCIES ===\n"
            for impact in cross_impacts:
                prompt += f"- {impact.file_path} ({impact.impact_type}): {impact.description}\n"
            prompt += "\n"

        prompt += f"=== SOURCE CODE TO REFACTOR ({language}) ===\n```{language}\n{code.strip()}\n```\n\n"

        if conversation:
            prompt += "=== CONVERSATION HISTORY ===\n"
            for turn in conversation:
                prompt += f"{turn.role.capitalize()}: {turn.content}\n"
            prompt += "\n"

        prompt += "Provide your refactoring analysis now as a single valid JSON object strictly matching the schema above."
        return prompt

    def normalize_model_response(
        self,
        raw_dict: Dict,
        original_source: str,
        heuristic_smells: List[CodeSmell],
    ) -> Tuple[str, List[CodeSmell], List[RefactoringSuggestion]]:
        """
        Normalizes model response, combines code smells with heuristic findings,
        and computes deterministic unified diffs for all refactoring suggestions.
        """
        summary = str(raw_dict.get("summary", "")).strip()
        if not summary:
            summary = "Refactoring opportunities identified to improve modularity and maintainability."

        # Merge model-reported code smells with heuristic smells (de-duping by title/type)
        combined_smells: List[CodeSmell] = list(heuristic_smells)
        seen_smell_keys: Set[str] = {f"{s.type}:{s.line or 0}" for s in heuristic_smells}

        raw_smells = raw_dict.get("code_smells", [])
        if isinstance(raw_smells, list):
            for item in raw_smells:
                if not isinstance(item, dict):
                    continue
                stype = str(item.get("type", "maintainability")).strip().lower() or "maintainability"
                title = str(item.get("title", "Code smell identified")).strip() or "Code smell identified"
                desc = str(item.get("description", "Identified maintainability concern.")).strip()
                rsev = str(item.get("severity", "medium")).strip().lower()
                sev = rsev if rsev in {"high", "medium", "low"} else "medium"
                line = item.get("line")
                try:
                    line_no = int(line) if line is not None else None
                except (ValueError, TypeError):
                    line_no = None

                key = f"{stype}:{line_no or 0}"
                if key not in seen_smell_keys:
                    seen_smell_keys.add(key)
                    raw_ev = item.get("evidence", [])
                    evidence = [str(e).strip() for e in raw_ev if str(e).strip()] if isinstance(raw_ev, list) else []
                    combined_smells.append(
                        CodeSmell(
                            type=stype,
                            title=title,
                            description=desc or "Identified maintainability concern.",
                            severity=sev,  # type: ignore[arg-type]
                            line=line_no,
                            evidence=evidence,
                        )
                    )

        # Process refactoring suggestions & compute diffs
        refactorings: List[RefactoringSuggestion] = []
        raw_refs = raw_dict.get("refactorings", [])

        if isinstance(raw_refs, list):
            for item in raw_refs:
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title", "Proposed Refactoring")).strip() or "Proposed Refactoring"
                reason = str(item.get("reason", "Improves code clarity and maintainability.")).strip()

                # Clean original code
                orig_code = str(item.get("original_code", "")).strip()
                if not orig_code:
                    orig_code = original_source

                # Clean refactored code
                refact_code = str(item.get("refactored_code", "")).strip()
                if not refact_code:
                    refact_code = orig_code
                else:
                    # Strip exterior markdown fences if nested
                    if refact_code.startswith("```"):
                        refact_code = re.sub(r"^```(?:[a-zA-Z0-9_\-+]+)?\s*", "", refact_code)
                        refact_code = re.sub(r"\s*```$", "", refact_code).strip()

                # Compute deterministic line diff using difflib
                diff_text = compute_unified_diff(orig_code, refact_code)

                benefits = [str(b).strip() for b in item.get("benefits", []) if str(b).strip()] if isinstance(item.get("benefits"), list) else []
                if not benefits:
                    benefits = ["Improves readability and separation of concerns"]

                risks = [str(r).strip() for r in item.get("risks", []) if str(r).strip()] if isinstance(item.get("risks"), list) else []
                if not risks:
                    risks = ["Verify existing function callers and unit tests"]

                steps = [str(s).strip() for s in item.get("verification_steps", []) if str(s).strip()] if isinstance(item.get("verification_steps"), list) else []
                if not steps:
                    steps = ["Run existing test suite to ensure behavioral equivalence"]

                refactorings.append(
                    RefactoringSuggestion(
                        title=title,
                        reason=reason or "Improves code clarity and maintainability.",
                        original_code=orig_code,
                        refactored_code=refact_code,
                        diff=diff_text,
                        benefits=benefits,
                        risks=risks,
                        verification_steps=steps,
                    )
                )

        # Fallback if model returned empty refactoring list
        if not refactorings:
            refactorings.append(
                RefactoringSuggestion(
                    title="Modularize Code Structure",
                    reason="Separate distinct responsibilities into focused functions.",
                    original_code=original_source,
                    refactored_code=original_source,
                    diff=compute_unified_diff(original_source, original_source),
                    benefits=["Enhances maintainability and testability"],
                    risks=["Check that all variable scopes remain intact"],
                    verification_steps=["Run regression test suite"],
                )
            )

        return summary, combined_smells, refactorings

    async def refactor_code(self, payload: RefactorRequest) -> RefactorResponse:
        """
        Main entrypoint for AI code refactoring analysis.
        Supports both Pasted Code Mode and Approved Repository File Mode.
        """
        warnings: List[str] = [ADVISORY_DISCLAIMER]

        # 1. Determine Mode & Load Code
        mode: str = "pasted_code"
        code_to_refactor: str = ""
        language: str = payload.language or "text"
        repo_id: Optional[str] = None
        rel_path: Optional[str] = None
        start_line: int = 1
        end_line: int = 1
        cross_impacts: List[CrossFileImpact] = []
        references: List[GroundedReference] = []

        if payload.repository_id:
            mode = "repository_file"
            repo_id = payload.repository_id.strip()
            rel_path = (payload.file_path or "").strip()
            root_path = self._get_validated_repo_root(repo_id)

            # Read repository file
            content, detected_lang, s_line, e_line = self._validate_and_read_repository_file(
                root_path=root_path,
                file_path_str=rel_path,
                code_range=payload.code_range,
            )
            code_to_refactor = content
            if not payload.language or payload.language == "auto":
                language = detected_lang
            start_line = s_line
            end_line = e_line

            # Cross-file impact analysis
            cross_impacts = self.analyze_cross_file_impact(
                repository_id=repo_id,
                root_path=root_path,
                rel_file_path=rel_path,
            )

            # Grounded Reference for repository file
            references.append(
                GroundedReference(
                    path=rel_path,
                    start_line=start_line,
                    end_line=end_line,
                    snippet=redact_secrets(code_to_refactor[:2000]),
                    reason=f"Targeted repository source file for refactoring (lines {start_line}–{end_line})",
                )
            )
        else:
            mode = "pasted_code"
            code_to_refactor = (payload.code or "").strip()
            if not code_to_refactor:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Code cannot be empty in pasted-code mode.",
                )

            # Grounded Reference for pasted code
            references.append(
                GroundedReference(
                    path="pasted_code",
                    start_line=1,
                    end_line=len(code_to_refactor.splitlines()),
                    snippet=redact_secrets(code_to_refactor[:2000]),
                    reason="User-provided source code snippet",
                )
            )

        # 2. Redact Secrets
        redacted_code = redact_secrets(code_to_refactor)
        redacted_goal = redact_secrets(payload.goal) if payload.goal else None

        # 3. Static Code Smell Analysis
        smells = code_smell_analyzer.analyze(code=redacted_code, language=language)

        # 4. Context Budgeting & Bounded Conversation History
        char_budget = 8000
        active_conversation: List[RefactoringChatMessage] = []
        if payload.conversation:
            max_turns = 6
            raw_conv = payload.conversation[-max_turns:]
            if len(payload.conversation) > max_turns:
                warnings.append(f"Conversation history truncated to {max_turns} most recent turns.")
            for turn in raw_conv:
                active_conversation.append(
                    RefactoringChatMessage(
                        role=turn.role,
                        content=redact_secrets(turn.content),
                    )
                )

        # 5. Build Structured Prompt
        prompt = self.build_refactoring_prompt(
            code=redacted_code,
            language=language,
            smells=smells,
            goal=redacted_goal,
            cross_impacts=cross_impacts,
            conversation=active_conversation,
        )

        if len(prompt) > char_budget:
            warnings.append(f"Context budget exceeded ({char_budget} chars). Prompt was trimmed.")
            prompt = prompt[:char_budget] + "\n}\nEnsure valid JSON output adheres to schema."

        # 6. Dispatch to Ollama
        raw_json = await self.ollama._generate_json(prompt=prompt, temperature=0.2)

        # 7. Normalize Model Output & Compute Diffs
        summary, final_smells, refactorings = self.normalize_model_response(
            raw_dict=raw_json,
            original_source=redacted_code,
            heuristic_smells=smells,
        )

        return RefactorResponse(
            summary=summary,
            language=language,
            mode=mode,  # type: ignore[arg-type]
            code_smells=final_smells,
            refactorings=refactorings,
            cross_file_impacts=cross_impacts,
            references=references,
            warnings=warnings,
            model=settings.OLLAMA_MODEL,
            repository_id=repo_id,
            file_path=rel_path,
        )


refactoring_service = RefactoringService()
