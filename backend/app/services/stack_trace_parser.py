"""
Deterministic, lightweight stack trace and error message parser for Phase 8.
Extracts error categories, exception messages, language hints, and individual
stack frames across Python, JavaScript, TypeScript, Node.js, React, and FastAPI traces.
"""
import re
from typing import List, Optional, Tuple
from app.schemas.debugging import StackFrame

# Python traceback pattern: File "...", line 123, in func_name
PYTHON_FRAME_REGEX = re.compile(
    r'File\s+["\'](?P<path>[^"\']+)["\'],\s+line\s+(?P<line>\d+)(?:,\s+in\s+(?P<func>[^\n\r]+))?'
)

# Python exception line: e.g. KeyError: 'user_id' or ValueError: invalid literal
PYTHON_EXC_REGEX = re.compile(
    r'^(?:[a-zA-Z_][a-zA-Z0-9_.]*\.)?(?P<type>[A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Warning|Exit|Interrupt|Failure)):\s*(?P<msg>.*)$'
)

# JS/TS stack frame: e.g. at funcName (path/file.ts:12:34) or at path/file.js:12:34
JS_FRAME_REGEX = re.compile(
    r'^\s*at\s+(?:(?P<async>async\s+)?(?P<func>[^\s(]+)\s+\()?(?P<path>[^:()]+):(?P<line>\d+)(?::(?P<col>\d+))?\)?\s*$'
)

# JS exception line: e.g. TypeError: Cannot read properties of undefined
JS_EXC_REGEX = re.compile(
    r'^(?:(?P<type>[A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|RangeError|ReferenceError|SyntaxError|TypeError|URIError)):\s*)?(?P<msg>.*)$'
)

# Common known error types
COMMON_ERROR_PATTERNS = [
    (re.compile(r'\b(KeyError)\b', re.IGNORECASE), "KeyError", "python"),
    (re.compile(r'\b(IndexError)\b', re.IGNORECASE), "IndexError", "python"),
    (re.compile(r'\b(ValueError)\b', re.IGNORECASE), "ValueError", "python"),
    (re.compile(r'\b(TypeError)\b', re.IGNORECASE), "TypeError", None),
    (re.compile(r'\b(AttributeError)\b', re.IGNORECASE), "AttributeError", "python"),
    (re.compile(r'\b(ZeroDivisionError)\b', re.IGNORECASE), "ZeroDivisionError", "python"),
    (re.compile(r'\b(FileNotFoundError)\b', re.IGNORECASE), "FileNotFoundError", "python"),
    (re.compile(r'\b(ModuleNotFoundError|ImportError)\b', re.IGNORECASE), "ImportError", "python"),
    (re.compile(r'\b(RequestValidationError)\b', re.IGNORECASE), "RequestValidationError", "python"),
    (re.compile(r'\b(ValidationError)\b', re.IGNORECASE), "ValidationError", "python"),
    (re.compile(r'\b422\s+Unprocessable\s+Entity\b', re.IGNORECASE), "HTTPException (422)", "python"),
    (re.compile(r'\b500\s+Internal\s+Server\s+Error\b', re.IGNORECASE), "HTTPException (500)", None),
    (re.compile(r'\b404\s+Not\s+Found\b', re.IGNORECASE), "HTTPException (404)", None),
    (re.compile(r'\b401\s+Unauthorized\b', re.IGNORECASE), "HTTPException (401)", None),
    (re.compile(r'\b403\s+Forbidden\b', re.IGNORECASE), "HTTPException (403)", None),
    (re.compile(r'\b(ReferenceError)\b', re.IGNORECASE), "ReferenceError", "javascript"),
    (re.compile(r'\b(RangeError)\b', re.IGNORECASE), "RangeError", "javascript"),
    (re.compile(r'\b(SyntaxError)\b', re.IGNORECASE), "SyntaxError", None),
    (re.compile(r'\bToo many re-renders\b', re.IGNORECASE), "ReactRenderError", "typescript"),
    (re.compile(r'\bInvalid hook call\b', re.IGNORECASE), "ReactHookError", "typescript"),
    (re.compile(r'\bCannot read propert(?:y|ies) of (?:undefined|null)\b', re.IGNORECASE), "TypeError", "javascript"),
]


class StackTraceParser:
    """Parser utility that decomposes errors and stack traces into structured models."""

    def parse(
        self,
        error_message: str,
        stack_trace: Optional[str] = None,
        language: Optional[str] = None,
    ) -> Tuple[str, str, str, List[StackFrame]]:
        """
        Parses inputs to return (detected_error_type, clean_error_message, detected_language, frames).
        """
        combined_text = f"{error_message.strip()}\n{stack_trace.strip() if stack_trace else ''}".strip()
        lines = [line.strip() for line in (stack_trace or "").splitlines() if line.strip()]

        detected_lang = language
        detected_error_type: Optional[str] = None
        clean_msg = error_message.strip()
        frames: List[StackFrame] = []

        # 1. Check for Python Traceback format
        if "Traceback (most recent call last):" in (stack_trace or "") or any(PYTHON_FRAME_REGEX.search(l) for l in lines):
            if not detected_lang:
                detected_lang = "python"
            frames = self._parse_python_traceback(stack_trace or "")

        # 2. Check for JS/TS stack trace format
        elif any(JS_FRAME_REGEX.search(l) for l in lines):
            frames = self._parse_js_stack_trace(stack_trace or "")
            if not detected_lang:
                # Inspect frame file extensions
                if any(f.file_path and (f.file_path.endswith(".ts") or f.file_path.endswith(".tsx")) for f in frames):
                    detected_lang = "typescript"
                else:
                    detected_lang = "javascript"

        # 3. Detect error type and exception category from error_message or traceback
        # Try python exception line regex on all lines reversed
        all_lines = combined_text.splitlines()
        for line in reversed(all_lines):
            line_str = line.strip()
            py_m = PYTHON_EXC_REGEX.match(line_str)
            if py_m:
                detected_error_type = py_m.group("type")
                if py_m.group("msg"):
                    clean_msg = py_m.group("msg").strip()
                if not detected_lang:
                    detected_lang = "python"
                break

        # If not found via Python regex, check known common patterns
        if not detected_error_type:
            for pattern, err_type, lang_hint in COMMON_ERROR_PATTERNS:
                if pattern.search(combined_text):
                    detected_error_type = err_type
                    if lang_hint and not detected_lang:
                        detected_lang = lang_hint
                    break

        # Fallback error type
        if not detected_error_type:
            first_line = error_message.strip().splitlines()[0] if error_message.strip() else ""
            if ":" in first_line:
                potential_type = first_line.split(":")[0].strip()
                if 2 <= len(potential_type) <= 40 and " " not in potential_type:
                    detected_error_type = potential_type
            if not detected_error_type:
                detected_error_type = "RuntimeError"

        # Fallback language
        if not detected_lang:
            if any(ext in combined_text for ext in [".py", "def ", "import ", "__init__", "self."]):
                detected_lang = "python"
            elif any(ext in combined_text for ext in [".tsx", "interface ", ": string", ": number"]):
                detected_lang = "typescript"
            elif any(ext in combined_text for ext in [".js", ".jsx", "const ", "let ", "function"]):
                detected_lang = "javascript"
            else:
                detected_lang = "general"

        return detected_error_type, clean_msg, detected_lang, frames

    def _parse_python_traceback(self, trace_text: str) -> List[StackFrame]:
        """Parses Python traceback strings into StackFrame instances."""
        frames: List[StackFrame] = []
        lines = trace_text.splitlines()
        i = 0
        while i < len(lines):
            line = lines[i]
            match = PYTHON_FRAME_REGEX.search(line)
            if match:
                path = match.group("path")
                line_no = int(match.group("line"))
                func = (match.group("func") or "").strip() or None
                code_line = None

                # Look ahead for code line if indented
                if i + 1 < len(lines):
                    next_line = lines[i + 1]
                    if next_line.startswith(" ") and not PYTHON_FRAME_REGEX.search(next_line) and not PYTHON_EXC_REGEX.match(next_line.strip()):
                        code_line = next_line.strip()
                        i += 1

                frames.append(
                    StackFrame(
                        file_path=path,
                        line_number=line_no,
                        function_name=func,
                        code_line=code_line,
                        is_in_repository=False,
                    )
                )
            i += 1
        return frames

    def _parse_js_stack_trace(self, trace_text: str) -> List[StackFrame]:
        """Parses JS/Node/V8 stack traces into StackFrame instances."""
        frames: List[StackFrame] = []
        for line in trace_text.splitlines():
            line_str = line.strip()
            match = JS_FRAME_REGEX.match(line_str)
            if match:
                path = match.group("path").strip()
                line_no = int(match.group("line")) if match.group("line") else None
                col_no = int(match.group("col")) if match.group("col") else None
                func = (match.group("func") or "").strip() or None
                frames.append(
                    StackFrame(
                        file_path=path,
                        line_number=line_no,
                        column_number=col_no,
                        function_name=func,
                        code_line=None,
                        is_in_repository=False,
                    )
                )
        return frames


stack_trace_parser = StackTraceParser()

