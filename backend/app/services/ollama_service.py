"""
Ollama AI Service for local LLM inference.
"""
import json
import logging
import re
from typing import Any, Dict
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.ai import ExplainCodeResponse

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

        # Normalize and enforce expected fields
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

        return parsed

    async def explain_code(self, code: str, language: str) -> ExplainCodeResponse:
        """
        Sends an asynchronous inference request to local Ollama.
        Guarantees code is treated as an inert string and never executed.
        """
        prompt = self.build_explanation_prompt(code, language)
        payload = {
            "model": self.model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,  # Low temperature for deterministic analysis
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

        structured_dict = self._sanitize_and_parse_json(raw_response_text)
        return ExplainCodeResponse(**structured_dict)


# Default singleton instance
ollama_service = OllamaService()
