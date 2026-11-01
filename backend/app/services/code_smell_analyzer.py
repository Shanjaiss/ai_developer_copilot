"""
Lightweight, deterministic code smell analyzer for Phase 9.
Performs AST-based static analysis for Python and conservative heuristics for
JavaScript, TypeScript, and React code to identify maintainability concerns.
"""
import ast
import re
from typing import List, Optional, Set, Tuple
from collections import Counter
from app.schemas.refactoring import CodeSmell


class CodeSmellAnalyzer:
    """
    Lightweight code smell detector leveraging Python standard library `ast`
    and conservative text heuristics for JavaScript/TypeScript.
    Never executes untrusted code.
    """

    def analyze(self, code: str, language: str) -> List[CodeSmell]:
        """Analyzes source code and returns detected code smells."""
        lang = (language or "").strip().lower()
        if lang in {"python", "py"}:
            return self._analyze_python(code)
        elif lang in {"javascript", "typescript", "js", "ts", "jsx", "tsx"}:
            return self._analyze_js_ts(code)
        else:
            # General text heuristics for other languages
            return self._analyze_generic(code)

    def _analyze_python(self, code: str) -> List[CodeSmell]:
        """Performs Python AST analysis with safe fallback on syntax errors."""
        smells: List[CodeSmell] = []

        try:
            tree = ast.parse(code)
        except SyntaxError as exc:
            # Fall back to text heuristics if code is a partial snippet or has syntax differences
            smells.extend(self._analyze_generic(code))
            return smells

        # 1. Analyze Functions & Methods
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_name = node.name
                start_line = node.lineno
                end_line = getattr(node, "end_lineno", start_line)
                line_count = end_line - start_line + 1

                # Check Long Function
                if line_count > 30:
                    sev = "high" if line_count > 60 else "medium"
                    smells.append(
                        CodeSmell(
                            type="long_function",
                            title=f"Long function: '{func_name}' ({line_count} lines)",
                            description=(
                                f"Function '{func_name}' is {line_count} lines long. "
                                "Functions exceeding 30 lines often violate the Single Responsibility Principle "
                                "and are harder to test and maintain."
                            ),
                            severity=sev,
                            line=start_line,
                            evidence=[f"def {func_name}(...): spans lines {start_line}–{end_line}"],
                        )
                    )

                # Check Parameter Count
                params = [arg.arg for arg in node.args.args if arg.arg not in {"self", "cls"}]
                if len(params) > 4:
                    smells.append(
                        CodeSmell(
                            type="high_coupling",
                            title=f"Excessive parameters in '{func_name}' ({len(params)} parameters)",
                            description=(
                                f"Function '{func_name}' accepts {len(params)} parameters. "
                                "High parameter counts indicate excessive coupling and can be refactored into a parameter object or dataclass."
                            ),
                            severity="medium" if len(params) >= 6 else "low",
                            line=start_line,
                            evidence=[f"Parameters: ({', '.join(params)})"],
                        )
                    )

                # Check Nesting Depth inside Function Body
                max_depth, deepest_line = self._compute_python_nesting_depth(node)
                if max_depth >= 4:
                    smells.append(
                        CodeSmell(
                            type="excessive_nesting",
                            title=f"Excessive nesting in '{func_name}' (depth {max_depth})",
                            description=(
                                f"Function '{func_name}' reaches a control-flow nesting depth of {max_depth}. "
                                "Deep nesting increases cognitive complexity. Consider using early returns or extracting sub-routines."
                            ),
                            severity="high" if max_depth >= 5 else "medium",
                            line=deepest_line or start_line,
                            evidence=[f"Nesting level {max_depth} reached near line {deepest_line or start_line}"],
                        )
                    )

            # 2. Check Complex Conditionals
            elif isinstance(node, ast.If):
                # Count boolean operators in conditional
                bool_ops = 0
                for sub in ast.walk(node.test):
                    if isinstance(sub, ast.BoolOp):
                        bool_ops += len(sub.values) - 1

                if bool_ops >= 3:
                    smells.append(
                        CodeSmell(
                            type="complex_conditional",
                            title="Complex conditional expression",
                            description=(
                                f"Conditional expression combines {bool_ops + 1} logical conditions. "
                                "Extract complex predicates into well-named boolean helper functions or variables."
                            ),
                            severity="medium",
                            line=node.lineno,
                            evidence=[f"Line {node.lineno}: multiple logical operators in if-condition"],
                        )
                    )

                # Check for long if-elif chains (> 3 branches)
                elif_count = self._count_elif_branches(node)
                if elif_count >= 4:
                    smells.append(
                        CodeSmell(
                            type="large_conditional_chain",
                            title=f"Large conditional chain ({elif_count} branches)",
                            description=(
                                f"Found an if-elif chain with {elif_count} branches. "
                                "Consider refactoring to a dictionary lookup table, polymorphism, or match statement."
                            ),
                            severity="medium",
                            line=node.lineno,
                            evidence=[f"Line {node.lineno}: if-elif chain with {elif_count} branches"],
                        )
                    )

        # 3. Check Repeated String/Numeric Constants
        constants: List[Tuple[str, int]] = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant):
                val = node.value
                if isinstance(val, str) and len(val) >= 4 and not val.startswith("__"):
                    constants.append((val, node.lineno))

        val_counts = Counter(val for val, _ in constants)
        for val, count in val_counts.items():
            if count >= 3:
                first_line = next(line for v, line in constants if v == val)
                smells.append(
                    CodeSmell(
                        type="repeated_constants",
                        title=f"Repeated string constant: '{val}' ({count} occurrences)",
                        description=(
                            f"The literal '{val}' appears {count} times. "
                            "Extract duplicated literals into a shared named constant or enum."
                        ),
                        severity="low",
                        line=first_line,
                        evidence=[f"Literal '{val}' repeated across {count} locations"],
                    )
                )

        return smells

    def _compute_python_nesting_depth(self, func_node: ast.AST) -> Tuple[int, Optional[int]]:
        """Calculates maximum control-flow nesting depth inside a function."""
        control_nodes = (ast.If, ast.For, ast.While, ast.Try, ast.With)
        max_depth = 0
        deepest_line: Optional[int] = None

        def walk_depth(node: ast.AST, current_depth: int):
            nonlocal max_depth, deepest_line
            if isinstance(node, control_nodes):
                current_depth += 1
                if current_depth > max_depth:
                    max_depth = current_depth
                    deepest_line = getattr(node, "lineno", None)

            for child in ast.iter_child_nodes(node):
                # Do not recurse into nested function definitions
                if not isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    walk_depth(child, current_depth)

        for stmt in getattr(func_node, "body", []):
            walk_depth(stmt, 0)

        return max_depth, deepest_line

    def _count_elif_branches(self, if_node: ast.If) -> int:
        """Counts continuous elif branches in an if statement."""
        count = 1
        current = if_node
        while current.orelse:
            if len(current.orelse) == 1 and isinstance(current.orelse[0], ast.If):
                count += 1
                current = current.orelse[0]
            else:
                count += 1
                break
        return count

    def _analyze_js_ts(self, code: str) -> List[CodeSmell]:
        """Performs heuristic analysis for JavaScript, TypeScript, and React code."""
        smells: List[CodeSmell] = []
        lines = code.splitlines()

        # 1. Check Function Length
        func_regex = re.compile(
            r'^\s*(?:export\s+)?(?:async\s+)?(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>)'
        )
        current_func: Optional[str] = None
        func_start_line = 1
        open_braces = 0

        for idx, line in enumerate(lines, start=1):
            match = func_regex.search(line)
            if match and open_braces == 0:
                current_func = match.group(1) or match.group(2) or "anonymous"
                func_start_line = idx

            open_braces += line.count("{") - line.count("}")
            if open_braces <= 0 and current_func:
                func_len = idx - func_start_line + 1
                if func_len > 35:
                    smells.append(
                        CodeSmell(
                            type="long_function",
                            title=f"Long function/component: '{current_func}' ({func_len} lines)",
                            description=(
                                f"Function or component '{current_func}' spans {func_len} lines. "
                                "Breaking it into smaller sub-components or custom hooks improves readability."
                            ),
                            severity="high" if func_len > 60 else "medium",
                            line=func_start_line,
                            evidence=[f"Function '{current_func}' spans lines {func_start_line}–{idx}"],
                        )
                    )
                current_func = None
                open_braces = 0

        # 2. Check Complex Conditionals and Nested Ternaries
        for idx, line in enumerate(lines, start=1):
            trimmed = line.strip()
            # Nested ternary check
            if trimmed.count("?") >= 2 and trimmed.count(":") >= 2:
                smells.append(
                    CodeSmell(
                        type="complex_conditional",
                        title="Nested ternary operator",
                        description="Nested ternary operators obscure logic paths. Replace with explicit if/else statements or guard clauses.",
                        severity="medium",
                        line=idx,
                        evidence=[f"Line {idx}: {trimmed[:80]}"],
                    )
                )

            # Multi-operator logical conditional
            logical_ops = len(re.findall(r'&&|\|\|', trimmed))
            if logical_ops >= 3 and not trimmed.startswith("//"):
                smells.append(
                    CodeSmell(
                        type="complex_conditional",
                        title="Complex logical expression",
                        description=f"Line contains {logical_ops} logical operators. Extract into descriptive boolean variables.",
                        severity="medium",
                        line=idx,
                        evidence=[f"Line {idx}: multiple logical operators"],
                    )
                )

        # 3. Check Indentation / Nesting Depth
        max_indent = 0
        deepest_line = 1
        for idx, line in enumerate(lines, start=1):
            if not line.strip() or line.strip().startswith("//"):
                continue
            indent = len(line) - len(line.lstrip())
            # Assume 2 or 4 spaces per indent level
            indent_level = indent // 2 if "  " in line[:2] else indent // 4
            if indent_level > max_indent:
                max_indent = indent_level
                deepest_line = idx

        if max_indent >= 5:
            smells.append(
                CodeSmell(
                    type="excessive_nesting",
                    title=f"Excessive nesting depth (level {max_indent})",
                    description="Deeply nested blocks increase cognitive complexity. Consider using early returns or breaking down logic.",
                    severity="high" if max_indent >= 6 else "medium",
                    line=deepest_line,
                    evidence=[f"Indentation level {max_indent} reached at line {deepest_line}"],
                )
            )

        return smells

    def _analyze_generic(self, code: str) -> List[CodeSmell]:
        """Fallback heuristics for any language."""
        smells: List[CodeSmell] = []
        lines = code.splitlines()

        if len(lines) > 50:
            smells.append(
                CodeSmell(
                    type="long_file_or_routine",
                    title=f"Large code block ({len(lines)} lines)",
                    description="The snippet is relatively long and may benefit from modularization.",
                    severity="low",
                    line=1,
                    evidence=[f"Total lines: {len(lines)}"],
                )
            )

        return smells


code_smell_analyzer = CodeSmellAnalyzer()

