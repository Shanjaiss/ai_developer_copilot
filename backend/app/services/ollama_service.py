"""
Ollama AI Service for local LLM inference.
Provides shared client communication, JSON sanitization, and structured code explanation & review.
"""
import json
import logging
import re
from typing import Any, Dict, List
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.ai import (
    ExplainCodeResponse,
    ReviewCodeResponse,
    ReviewIssue,
)

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(
        self,
        base_url: str = settings.OLLAMA_BASE_URL,
        model: str = settings.OLLAMA_MODEL,
        timeout: float = settings.OLLAMA_TIMEOUT_SECONDS,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    # -------------------------------------------------------------------------
    # Shared Internal Generation Engine
    # -------------------------------------------------------------------------

    async def _generate_json(self, prompt: str, temperature: float = 0.2) -> Dict[str, Any]:
        """
        Shared internal client method to dispatch inference to Ollama with format='json'.
        Avoids duplicating HTTP request logic, timeout handling, and error normalization.
        """
        payload = {
            "model": self.model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": 0.9,
            },
        }

        endpoint = f"{self.base_url}/api/generate"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(endpoint, json=payload)
        except (httpx.ConnectError, httpx.ConnectTimeout) as exc:
            logger.error("Connection error to Ollama at %s: %s", self.base_url, exc)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"Ollama AI service is unavailable at {self.base_url}. "
                    "Please ensure Ollama is installed and running (`ollama serve`)."
                ),
            )
        except httpx.TimeoutException as exc:
            logger.error("Ollama inference timed out after %s seconds: %s", self.timeout, exc)
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=(
                    f"AI model inference timed out after {self.timeout}s. "
                    "Try submitting a smaller code snippet."
                ),
            )
        except httpx.RequestError as exc:
            logger.error("Unexpected HTTP error communicating with Ollama: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error communicating with local AI engine: {str(exc)}",
            )

        if response.status_code != 200:
            logger.error("Ollama returned HTTP %s: %s", response.status_code, response.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama returned HTTP {response.status_code}: {response.text}",
            )

        try:
            data = response.json()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to parse Ollama HTTP response payload: {str(exc)}",
            )

        raw_response_text = data.get("response", "")
        if not raw_response_text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Ollama returned an empty model response.",
            )

        return self._sanitize_and_parse_json(raw_response_text)

    def _sanitize_and_parse_json(self, raw_text: str) -> Dict[str, Any]:
        """
        Extracts and parses JSON from raw LLM output, resilient to markdown tags and extra whitespace.
        """
        cleaned = raw_text.strip()

        # Remove markdown code fences if present (e.g., ```json ... ```)
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

        # Fallback regex extraction if extraneous text surrounds the JSON object
        if not (cleaned.startswith("{") and cleaned.endswith("}")):
            json_match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
            if json_match:
                cleaned = json_match.group(0)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            logger.error("Failed to decode JSON from Ollama output: %s", raw_text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Model output could not be parsed as JSON: {exc.msg}",
            )

        if not isinstance(parsed, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Model output did not produce a valid JSON object dictionary.",
            )

        return parsed

    # -------------------------------------------------------------------------
    # Code Explanation Feature
    # -------------------------------------------------------------------------

    def build_explanation_prompt(self, code: str, language: str) -> str:
        """
        Constructs a structured prompt for the code explanation model.
        The submitted code is treated purely as inert text and never executed.
        """
        return (
            "You are an expert Senior Software Engineer and Technical Educator.\n"
            f"Analyze the following {language} code snippet and provide a comprehensive, accurate analysis.\n\n"
            "You MUST respond ONLY with a valid, parseable JSON object adhering strictly to this schema:\n"
            "{\n"
            '  "summary": "Clear, concise high-level explanation of what the code achieves.",\n'
            '  "line_by_line": [\n'
            '    "Explanation of each key line or logical section."\n'
            "  ],\n"
            '  "time_complexity": "Big-O time complexity (e.g. O(n)) with brief reasoning.",\n'
            '  "space_complexity": "Big-O space complexity (e.g. O(1)) with brief reasoning.",\n'
            '  "improvements": [\n'
            '    "Actionable suggestions for optimization, edge cases, security, or style."\n'
            "  ]\n"
            "}\n\n"
            f"Programming Language: {language}\n"
            "Source Code:\n"
            f"```{language}\n"
            f"{code}\n"
            "```\n\n"
            "Do NOT include markdown block wrappers (e.g. ```json), introductory text, or concluding notes.\n"
            "Return ONLY the raw JSON object."
        )

    async def explain_code(self, code: str, language: str) -> ExplainCodeResponse:
        """
        Sends an asynchronous inference request to local Ollama for code explanation.
        Guarantees code is treated as an inert string and never executed.
        """
        prompt = self.build_explanation_prompt(code, language)
        parsed = await self._generate_json(prompt, temperature=0.2)

        # Enforce expected fields and normalize
        summary = parsed.get("summary")
        if not summary or not isinstance(summary, str):
            parsed["summary"] = "The provided code was analyzed by AI Copilot."

        line_by_line = parsed.get("line_by_line")
        if isinstance(line_by_line, str):
            parsed["line_by_line"] = [line_by_line]
        elif not isinstance(line_by_line, list):
            parsed["line_by_line"] = ["Step-by-step breakdown unavailable."]
        else:
            parsed["line_by_line"] = [str(item) for item in line_by_line if item]

        time_comp = parsed.get("time_complexity")
        parsed["time_complexity"] = str(time_comp) if time_comp else "O(1)"

        space_comp = parsed.get("space_complexity")
        parsed["space_complexity"] = str(space_comp) if space_comp else "O(1)"

        improvements = parsed.get("improvements")
        if isinstance(improvements, str):
            parsed["improvements"] = [improvements]
        elif not isinstance(improvements, list):
            parsed["improvements"] = []
        else:
            parsed["improvements"] = [str(item) for item in improvements if item]

        return ExplainCodeResponse(**parsed)

    # -------------------------------------------------------------------------
    # Code Review & Bug Detection Feature
    # -------------------------------------------------------------------------

    def build_review_prompt(self, code: str, language: str) -> str:
        """
        Constructs a structured prompt for the code review and bug detection engine.
        Treats submitted code strictly as inert untrusted text.
        """
        return (
            "You are a strict, thorough senior code reviewer and security auditor.\n"
            f"Analyze the following {language} code snippet for missing edge-case handling and potential runtime errors:\n\n"
            f"```{language}\n"
            f"{code}\n"
            "```\n\n"
            "Inspect the code for:\n"
            "- Division or modulo operations where the denominator parameter is not verified against zero (e.g. `a / b` where `b == 0` causes ZeroDivisionError).\n"
            "- Array, list, or string index operations where the collection is not checked for empty or out-of-bounds (IndexError).\n"
            "- Object attribute or property access where the target object is not verified for null, undefined, or None (TypeError or NullPointerException).\n"
            "- Missing input validation or unhandled runtime exceptions.\n\n"
            "Instructions:\n"
            "- If the code lacks guards against zero division, empty collections, or null attributes, you MUST list them as issues in the issues array.\n"
            "- Each issue must include: title, line number (1-indexed), severity ('low', 'medium', 'high', 'critical'), category ('correctness', 'security', 'maintainability', 'performance'), description, and suggestion.\n"
            "- Set overall_risk to match the highest severity of detected issues.\n"
            "- ONLY if the code already has explicit if-checks or try-except handling for all edge cases, return issues: [] and overall_risk: clean.\n"
            "- In improved_code, provide the corrected code with safety checks added.\n\n"
            "Respond ONLY with a valid JSON object adhering strictly to this schema:\n"
            "{\n"
            '  "summary": "Executive summary of review findings",\n'
            '  "overall_risk": "clean | low | medium | high | critical",\n'
            '  "issues": [\n'
            "    {\n"
            '      "title": "Specific title describing the exact defect",\n'
            '      "severity": "low | medium | high | critical",\n'
            '      "category": "correctness | security | maintainability | performance",\n'
            '      "line": 1,\n'
            '      "description": "Why this is an issue and how it might fail",\n'
            '      "suggestion": "How to resolve this issue"\n'
            "    }\n"
            "  ],\n"
            '  "improved_code": "Full improved code snippet as a string"\n'
            "}\n\n"
            "Return ONLY the raw JSON object."
        )

    async def review_code(self, code: str, language: str) -> ReviewCodeResponse:
        """
        Sends an asynchronous inference request to local Ollama for code review.
        Validates line bounds against submitted code and normalizes severity and risk levels.
        """
        prompt = self.build_review_prompt(code, language)
        parsed = await self._generate_json(prompt, temperature=0.2)

        total_lines = len(code.splitlines()) if code.splitlines() else 1

        # Normalize summary
        summary = parsed.get("summary")
        if not summary or not isinstance(summary, str):
            summary = "Code review completed."

        # Normalize raw issues
        raw_issues = parsed.get("issues")
        if not isinstance(raw_issues, list):
            raw_issues = []

        valid_severities = {"low", "medium", "high", "critical"}
        valid_categories = {
            "correctness",
            "maintainability",
            "performance",
            "security",
            "style",
            "other",
        }

        normalized_issues: List[ReviewIssue] = []
        highest_severity_rank = 0
        severity_rank_map = {"clean": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}

        for item in raw_issues:
            if not isinstance(item, dict):
                continue

            title = str(item.get("title", "Detected Code Issue")).strip()
            if not title:
                title = "Detected Code Issue"

            raw_sev = str(item.get("severity", "low")).strip().lower()
            severity = raw_sev if raw_sev in valid_severities else "low"
            highest_severity_rank = max(highest_severity_rank, severity_rank_map.get(severity, 1))

            raw_cat = str(item.get("category", "correctness")).strip().lower()
            category = raw_cat if raw_cat in valid_categories else "correctness"

            # Validate line number against submitted code bounds
            line = item.get("line")
            validated_line = None
            if line is not None:
                try:
                    line_int = int(line)
                    if 1 <= line_int <= total_lines:
                        validated_line = line_int
                    else:
                        validated_line = None
                except (ValueError, TypeError):
                    validated_line = None

            description = str(item.get("description", "Potential code issue identified.")).strip()
            if not description:
                description = "Potential code issue identified."

            suggestion = str(item.get("suggestion", "Review and adjust this code segment.")).strip()
            if not suggestion:
                suggestion = "Review and adjust this code segment."

            normalized_issues.append(
                ReviewIssue(
                    title=title,
                    severity=severity,  # type: ignore[arg-type]
                    category=category,  # type: ignore[arg-type]
                    line=validated_line,
                    description=description,
                    suggestion=suggestion,
                )
            )

        # Normalize overall_risk
        raw_risk = str(parsed.get("overall_risk", "")).strip().lower()
        if raw_risk in {"clean", "low", "medium", "high", "critical"}:
            overall_risk = raw_risk
        else:
            if not normalized_issues:
                overall_risk = "clean"
            else:
                inv_map = {1: "low", 2: "medium", 3: "high", 4: "critical"}
                overall_risk = inv_map.get(highest_severity_rank, "low")

        # Consistency check: if issues array is empty, risk must be clean or low
        if not normalized_issues and overall_risk not in {"clean", "low"}:
            overall_risk = "clean"

        # Normalize improved_code
        improved_code = parsed.get("improved_code")
        if isinstance(improved_code, dict):
            improved_code = improved_code.get("code", "")
        if not improved_code or not isinstance(improved_code, str) or not improved_code.strip():
            improved_code = code
        else:
            # Strip markdown fences if the model included them inside the string
            improved_code = improved_code.strip()
            if improved_code.startswith("```"):
                improved_code = re.sub(r"^```(?:[a-zA-Z0-9_\-+]+)?\s*", "", improved_code)
                improved_code = re.sub(r"\s*```$", "", improved_code).strip()

        return ReviewCodeResponse(
            summary=summary,
            overall_risk=overall_risk,  # type: ignore[arg-type]
            issues=normalized_issues,
            improved_code=improved_code,
        )


# Default singleton instance
ollama_service = OllamaService()
