"""
AI Bug Detection & Debugging Assistant Service for Phase 8.
Orchestrates stack trace parsing, optional repository-aware evidence retrieval,
secret redaction, root-cause investigation, and actionable fix generation via local Ollama.
"""
import logging
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.debugging import (
    DebugChatMessage,
    DebugRequest,
    DebugResponse,
    RootCauseHypothesis,
    StackFrame,
    SuggestedFix,
)
from app.schemas.repository import GroundedReference
from app.services.ollama_service import ollama_service
from app.services.repository_scanner import is_path_safe, redact_secrets
from app.services.stack_trace_parser import stack_trace_parser

logger = logging.getLogger(__name__)

ADVISORY_DISCLAIMER = (
    "AI-generated diagnoses and code fixes are advisory. "
    "Always test and verify changes in a non-production environment before deployment."
)


class DebuggingService:
    """
    Core service powering Phase 8 AI Bug Detection & Debugging Assistant.
    Provides local-first, privacy-preserving error diagnosis and actionable fix generation.
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

    def match_frames_to_repository(
        self,
        frames: List[StackFrame],
        root_path: Path,
    ) -> Tuple[List[StackFrame], List[GroundedReference]]:
        """
        Matches parsed stack frames to actual repository files within root_path.
        Extracts verified source code windows around error lines with secret redaction.
        """
        updated_frames: List[StackFrame] = []
        references: List[GroundedReference] = []

        for frame in frames:
            if not frame.file_path:
                updated_frames.append(frame)
                continue

            raw_path_str = frame.file_path.strip()
            matched_file: Optional[Path] = None
            repo_relative_path: Optional[str] = None

            # Try candidate resolutions
            candidate_paths = [
                root_path / raw_path_str,
                root_path / raw_path_str.lstrip("/"),
            ]

            # If path was absolute, try resolving relative to root_path if root_path is in candidate
            try:
                abs_path = Path(raw_path_str).resolve()
                if is_path_safe(root_path, abs_path) and abs_path.is_file():
                    matched_file = abs_path
                    repo_relative_path = str(abs_path.relative_to(root_path))
            except Exception:
                pass

            if not matched_file:
                for cand in candidate_paths:
                    try:
                        resolved = cand.resolve()
                        if is_path_safe(root_path, resolved) and resolved.is_file():
                            matched_file = resolved
                            repo_relative_path = str(resolved.relative_to(root_path))
                            break
                    except Exception:
                        continue

            if matched_file and repo_relative_path:
                # Update frame with repository relative path and in-repo flag
                updated_frame = frame.model_copy(
                    update={
                        "file_path": repo_relative_path,
                        "is_in_repository": True,
                    }
                )
                updated_frames.append(updated_frame)

                # Extract line window around line_number if available
                line_no = frame.line_number or 1
                try:
                    with open(matched_file, "r", encoding="utf-8", errors="replace") as f:
                        file_lines = f.readlines()

                    total_lines = len(file_lines)
                    window_half = 20
                    start_idx = max(0, line_no - 1 - window_half)
                    end_idx = min(total_lines, line_no + window_half)

                    snippet = "".join(file_lines[start_idx:end_idx]).strip()
                    redacted_snippet = redact_secrets(snippet)

                    references.append(
                        GroundedReference(
                            path=repo_relative_path,
                            start_line=start_idx + 1,
                            end_line=end_idx,
                            snippet=redacted_snippet,
                            reason=f"Stack frame location (line {line_no}, function: {frame.function_name or 'module'})",
                        )
                    )
                except Exception as exc:
                    logger.warning("Could not read frame file %s: %s", matched_file, exc)
            else:
                updated_frames.append(frame)

        return updated_frames, references

    def build_debugging_prompt(
        self,
        error_type: str,
        clean_error_message: str,
        language: str,
        stack_trace: Optional[str],
        frames: List[StackFrame],
        references: List[GroundedReference],
        code_context: Optional[str],
        conversation: List[DebugChatMessage],
    ) -> str:
        """
        Constructs a structured prompt instructing the local model to analyze the error,
        synthesize root-cause hypotheses, and propose actionable fixes adhering strictly to JSON.
        """
        prompt = (
            "You are an expert Senior Software Systems Debugger and Principal Software Architect.\n"
            f"Analyze the following {language} error and provide a comprehensive, evidence-grounded diagnosis.\n\n"
            "STRICT RULES:\n"
            "1. NO CODE EXECUTION: You are strictly an advisory analysis engine. Never claim code was executed.\n"
            "2. EVIDENCE GROUNDING: Support your root-cause hypotheses with concrete evidence from the error message, "
            "stack frames, and code context provided. Do not hallucinate files or variables.\n"
            "3. ACTIONABLE FIXES: Provide clear, correct code examples demonstrating how to fix the issue and step-by-step verification instructions.\n"
            "4. CONFIDENCE RATING: Assign qualitative confidence ('high', 'medium', or 'low') based on clarity of evidence.\n"
            "5. OUTPUT FORMAT: Respond ONLY with a valid, parseable JSON object adhering strictly to the JSON schema below.\n\n"
            "JSON SCHEMA:\n"
            "{\n"
            '  "summary": "Detailed explanation of why the error occurred and its system impact",\n'
            f'  "error_type": "{error_type}",\n'
            '  "root_causes": [\n'
            '    {\n'
            '      "title": "Short descriptive title of root cause",\n'
            '      "description": "Thorough breakdown of how this cause triggers the error",\n'
            '      "confidence": "high" | "medium" | "low",\n'
            '      "evidence": ["Exact line number or variable", "Observed symptom pattern"]\n'
            '    }\n'
            '  ],\n'
            '  "suggested_fixes": [\n'
            '    {\n'
            '      "title": "Short title of suggested fix",\n'
            '      "explanation": "Why this change resolves the error",\n'
            '      "code_example": "Clean, complete fix snippet",\n'
            '      "verification_steps": ["Step 1 to test", "Step 2 to test"]\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            f"=== ERROR DETAILS ===\n"
            f"Error Category: {error_type}\n"
            f"Language: {language}\n"
            f"Error Message:\n{clean_error_message}\n\n"
        )

        if stack_trace:
            prompt += f"=== STACK TRACE ===\n{stack_trace.strip()}\n\n"

        if references:
            prompt += "=== SOURCE CODE EVIDENCE ===\n"
            for ref in references:
                prompt += (
                    f"File: {ref.path} (Lines {ref.start_line}-{ref.end_line})\n"
                    f"```{language}\n{ref.snippet}\n```\n\n"
                )
        elif code_context:
            prompt += f"=== USER CODE CONTEXT ===\n```{language}\n{code_context.strip()}\n```\n\n"

        if conversation:
            prompt += "=== CONVERSATION HISTORY ===\n"
            for turn in conversation:
                prompt += f"{turn.role.capitalize()}: {turn.content}\n"
            prompt += "\n"

        prompt += "Provide your analysis now as a single valid JSON object strictly matching the schema above."
        return prompt

    def normalize_model_response(
        self,
        raw_dict: Dict,
        fallback_error_type: str,
        fallback_language: str,
    ) -> Tuple[str, str, List[RootCauseHypothesis], List[SuggestedFix]]:
        """
        Normalizes and sanitizes the parsed dictionary from Ollama into typed models.
        Provides robust fallbacks for missing or non-standard keys.
        """
        summary = str(raw_dict.get("summary", "")).strip()
        if not summary:
            summary = f"Identified potential cause for {fallback_error_type} in {fallback_language} code."

        error_type = str(raw_dict.get("error_type", "")).strip() or fallback_error_type

        # Root causes normalization
        raw_causes = raw_dict.get("root_causes", [])
        normalized_causes: List[RootCauseHypothesis] = []
        if isinstance(raw_causes, list):
            for item in raw_causes:
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title", "Potential Root Cause")).strip() or "Potential Root Cause"
                desc = str(item.get("description", "Potential trigger for the observed error.")).strip()
                raw_conf = str(item.get("confidence", "medium")).strip().lower()
                conf = raw_conf if raw_conf in {"high", "medium", "low"} else "medium"
                raw_ev = item.get("evidence", [])
                evidence = [str(e).strip() for e in raw_ev if str(e).strip()] if isinstance(raw_ev, list) else []

                normalized_causes.append(
                    RootCauseHypothesis(
                        title=title,
                        description=desc or "Potential trigger for the observed error.",
                        confidence=conf,  # type: ignore[arg-type]
                        evidence=evidence,
                    )
                )

        if not normalized_causes:
            normalized_causes.append(
                RootCauseHypothesis(
                    title=f"Uncaught {error_type}",
                    description=summary,
                    confidence="medium",
                    evidence=[],
                )
            )

        # Suggested fixes normalization
        raw_fixes = raw_dict.get("suggested_fixes", [])
        normalized_fixes: List[SuggestedFix] = []
        if isinstance(raw_fixes, list):
            for item in raw_fixes:
                if not isinstance(item, dict):
                    continue
                title = str(item.get("title", "Suggested Fix")).strip() or "Suggested Fix"
                explanation = str(item.get("explanation", "Apply this change to mitigate the issue.")).strip()
                code_ex = item.get("code_example")
                if code_ex is not None:
                    code_ex = str(code_ex).strip()
                    # Strip exterior markdown fences if nested
                    if code_ex.startswith("```"):
                        code_ex = re.sub(r"^```(?:[a-zA-Z0-9_\-+]+)?\s*", "", code_ex)
                        code_ex = re.sub(r"\s*```$", "", code_ex).strip()

                raw_steps = item.get("verification_steps", [])
                steps = [str(s).strip() for s in raw_steps if str(s).strip()] if isinstance(raw_steps, list) else []

                normalized_fixes.append(
                    SuggestedFix(
                        title=title,
                        explanation=explanation or "Apply this change to mitigate the issue.",
                        code_example=code_ex or None,
                        verification_steps=steps,
                    )
                )

        if not normalized_fixes:
            normalized_fixes.append(
                SuggestedFix(
                    title="Code Verification",
                    explanation="Review variable definitions, input boundary conditions, and type assertions.",
                    code_example=None,
                    verification_steps=["Run unit tests with edge-case inputs", "Verify null/undefined checks"],
                )
            )

        return summary, error_type, normalized_causes, normalized_fixes

    async def debug_error(self, payload: DebugRequest) -> DebugResponse:
        """
        Main entrypoint for AI bug detection and debugging.
        """
        warnings: List[str] = [ADVISORY_DISCLAIMER]

        # 1. Sanitize & Redact Secrets in inputs
        redacted_error = redact_secrets(payload.error_message)
        redacted_trace = redact_secrets(payload.stack_trace) if payload.stack_trace else None
        redacted_code = redact_secrets(payload.code_context) if payload.code_context else None

        # 2. Parse Stack Trace & Error Message
        detected_type, clean_msg, detected_lang, frames = stack_trace_parser.parse(
            error_message=redacted_error,
            stack_trace=redacted_trace,
            language=payload.language,
        )

        references: List[GroundedReference] = []
        repo_used: Optional[str] = None

        # 3. Optional Repository Context Lookup
        if payload.repository_id and payload.repository_id.strip().lower() not in {"none", "null", ""}:
            repo_id = payload.repository_id.strip()
            root_path = self._get_validated_repo_root(repo_id)
            repo_used = repo_id

            if frames:
                frames, references = self.match_frames_to_repository(frames, root_path)

            if not references:
                warnings.append(
                    f"No matching files from the stack trace were found within approved repository '{repo_id}'. "
                    "Analysis proceeded using provided error message and stack trace."
                )

        # If no repository was used but code_context was provided, create a user context reference
        if not references and redacted_code:
            code_lines = redacted_code.splitlines()
            references.append(
                GroundedReference(
                    path="provided_code_context",
                    start_line=1,
                    end_line=len(code_lines) if code_lines else 1,
                    snippet=redacted_code,
                    reason="User-provided code context snippet",
                )
            )

        # 4. Enforce Bounded Context Budget (<= 8000 chars)
        char_budget = 8000
        active_conversation: List[DebugChatMessage] = []
        if payload.conversation:
            max_turns = 6
            raw_conv = payload.conversation[-max_turns:]
            if len(payload.conversation) > max_turns:
                warnings.append(f"Conversation history truncated to {max_turns} most recent turns.")

            # Sanitize turn contents
            for turn in raw_conv:
                active_conversation.append(
                    DebugChatMessage(
                        role=turn.role,
                        content=redact_secrets(turn.content),
                    )
                )

        # 5. Build Prompt
        prompt = self.build_debugging_prompt(
            error_type=detected_type,
            clean_error_message=clean_msg,
            language=detected_lang,
            stack_trace=redacted_trace,
            frames=frames,
            references=references,
            code_context=redacted_code,
            conversation=active_conversation,
        )

        # Trim prompt if oversized
        if len(prompt) > char_budget:
            warnings.append(f"Context budget exceeded ({char_budget} chars). Prompt was trimmed.")
            prompt = prompt[:char_budget] + "\n}\nEnsure valid JSON output adheres to schema."

        # 6. Dispatch to Ollama
        raw_json = await self.ollama._generate_json(prompt=prompt, temperature=0.2)

        # 7. Normalize Model Output
        summary, final_type, root_causes, suggested_fixes = self.normalize_model_response(
            raw_dict=raw_json,
            fallback_error_type=detected_type,
            fallback_language=detected_lang,
        )

        return DebugResponse(
            summary=summary,
            error_type=final_type,
            language=detected_lang,
            parsed_frames=frames,
            root_causes=root_causes,
            suggested_fixes=suggested_fixes,
            references=references,
            warnings=warnings,
            model=settings.OLLAMA_MODEL,
            repository_used=repo_used,
        )


debugging_service = DebuggingService()

