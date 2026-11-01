"""
Deterministic static code and manifest extraction engine for Phase 10: AI Documentation Generator.
Extracts AST metadata for Python (functions, classes, docstrings, parameters, FastAPI endpoints),
heuristic metadata for JS/TS/React, and repository manifest details (package.json, pyproject.toml, requirements.txt).
"""
import ast
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.schemas.documentation import (
    DocumentationSourceReference,
    DocumentationVerifiedFact,
    DocumentationAssumption,
)

logger = logging.getLogger(__name__)


class DocumentationExtractor:
    """Lightweight deterministic extractor for Python, JS/TS, and project manifests."""

    @classmethod
    def extract_python_metadata(
        cls,
        code: str,
        file_path: str = "pasted_code",
    ) -> Tuple[Dict[str, Any], List[DocumentationVerifiedFact], List[DocumentationSourceReference], List[str]]:
        """
        Parses Python code using standard-library AST.
        Returns (metadata_dict, verified_facts, source_references, warnings).
        """
        verified_facts: List[DocumentationVerifiedFact] = []
        source_references: List[DocumentationSourceReference] = []
        warnings: List[str] = []

        metadata: Dict[str, Any] = {
            "language": "python",
            "module_docstring": None,
            "imports": [],
            "functions": [],
            "classes": [],
            "endpoints": [],
        }

        try:
            tree = ast.parse(code)
            metadata["module_docstring"] = ast.get_docstring(tree)

            lines = code.splitlines()

            # 1. Imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        metadata["imports"].append(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    mod = node.module or ""
                    for alias in node.names:
                        metadata["imports"].append(f"{mod}.{alias.name}" if mod else alias.name)

            # 2. Functions & FastAPI Endpoints
            for node in tree.body:
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    fn_info = cls._extract_python_function(node, lines, file_path)
                    metadata["functions"].append(fn_info)

                    # Check for FastAPI / web route decorator
                    endpoint = cls._extract_fastapi_endpoint(node)
                    if endpoint:
                        metadata["endpoints"].append(endpoint)
                        verified_facts.append(
                            DocumentationVerifiedFact(
                                category="endpoint",
                                fact=f"Exposes HTTP {endpoint['method']} endpoint at '{endpoint['path']}' via function '{node.name}'",
                                evidence=f"line {node.lineno}: @{endpoint['decorator_text']}",
                            )
                        )

                    verified_facts.append(
                        DocumentationVerifiedFact(
                            category="function",
                            fact=f"Defines function '{node.name}({', '.join(fn_info['params'])})'",
                            evidence=f"line {node.lineno}-{node.end_lineno or node.lineno}",
                        )
                    )

                    snippet = "\n".join(lines[node.lineno - 1 : min(node.lineno + 4, len(lines))])
                    source_references.append(
                        DocumentationSourceReference(
                            path=file_path,
                            start_line=node.lineno,
                            end_line=node.end_lineno or node.lineno,
                            snippet=snippet,
                            reason=f"Function definition '{node.name}'",
                        )
                    )

                elif isinstance(node, ast.ClassDef):
                    class_info = cls._extract_python_class(node, lines, file_path)
                    metadata["classes"].append(class_info)

                    verified_facts.append(
                        DocumentationVerifiedFact(
                            category="class",
                            fact=f"Defines class '{node.name}' inheriting from [{', '.join(class_info['bases']) or 'object'}]",
                            evidence=f"line {node.lineno}-{node.end_lineno or node.lineno}",
                        )
                    )

                    snippet = "\n".join(lines[node.lineno - 1 : min(node.lineno + 4, len(lines))])
                    source_references.append(
                        DocumentationSourceReference(
                            path=file_path,
                            start_line=node.lineno,
                            end_line=node.end_lineno or node.lineno,
                            snippet=snippet,
                            reason=f"Class definition '{node.name}'",
                        )
                    )

            verified_facts.append(
                DocumentationVerifiedFact(
                    category="technology",
                    fact="Implemented in Python using standard syntax structures",
                    evidence=f"{len(metadata['functions'])} functions and {len(metadata['classes'])} classes parsed via AST",
                )
            )

        except SyntaxError as e:
            warnings.append(
                f"Python code contains syntax error at line {e.lineno or 'unknown'}: {e.msg}. "
                "Static AST analysis fell back to heuristic line extraction."
            )
            # Heuristic regex fallback
            cls._extract_python_heuristics(code, metadata, verified_facts, source_references, file_path)

        return metadata, verified_facts, source_references, warnings

    @classmethod
    def _extract_python_function(cls, node: Any, lines: List[str], file_path: str) -> Dict[str, Any]:
        """Extracts parameters, annotations, and docstring from Python FunctionDef node."""
        params = []
        for arg in node.args.args:
            arg_str = arg.arg
            if arg.annotation:
                try:
                    arg_str += f": {ast.unparse(arg.annotation)}"
                except Exception:
                    pass
            params.append(arg_str)

        returns_str = None
        if node.returns:
            try:
                returns_str = ast.unparse(node.returns)
            except Exception:
                pass

        docstring = ast.get_docstring(node)

        decorators = []
        for dec in node.decorator_list:
            try:
                decorators.append(ast.unparse(dec))
            except Exception:
                pass

        return {
            "name": node.name,
            "is_async": isinstance(node, ast.AsyncFunctionDef),
            "params": params,
            "returns": returns_str,
            "docstring": docstring,
            "decorators": decorators,
            "start_line": node.lineno,
            "end_line": node.end_lineno or node.lineno,
        }

    @classmethod
    def _extract_python_class(cls, node: ast.ClassDef, lines: List[str], file_path: str) -> Dict[str, Any]:
        """Extracts class definition, base classes, methods, and docstring."""
        bases = []
        for base in node.bases:
            try:
                bases.append(ast.unparse(base))
            except Exception:
                pass

        methods = []
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                methods.append(item.name)

        return {
            "name": node.name,
            "bases": bases,
            "docstring": ast.get_docstring(node),
            "methods": methods,
            "start_line": node.lineno,
            "end_line": node.end_lineno or node.lineno,
        }

    @classmethod
    def _extract_fastapi_endpoint(cls, node: Any) -> Optional[Dict[str, Any]]:
        """Identifies if a function has a FastAPI / Starlette / Flask route decorator."""
        for dec in node.decorator_list:
            dec_str = ""
            try:
                dec_str = ast.unparse(dec)
            except Exception:
                continue

            # Match e.g. @router.get("/users"), @app.post("/items", status_code=200)
            m = re.match(r"(?:app|router|api_router)\.(get|post|put|delete|patch|options|head)\(\s*['\"]([^'\"]+)['\"]", dec_str, re.IGNORECASE)
            if m:
                http_method = m.group(1).upper()
                route_path = m.group(2)
                return {
                    "method": http_method,
                    "path": route_path,
                    "function_name": node.name,
                    "decorator_text": dec_str,
                }
        return None

    @classmethod
    def _extract_python_heuristics(
        cls,
        code: str,
        metadata: Dict[str, Any],
        verified_facts: List[DocumentationVerifiedFact],
        source_references: List[DocumentationSourceReference],
        file_path: str,
    ):
        """Fallback regex extraction for invalid/partial Python code."""
        fn_pattern = re.compile(r"^\s*(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\((.*?)\)", re.MULTILINE)
        for m in fn_pattern.finditer(code):
            fn_name = m.group(1)
            params = [p.strip() for p in m.group(2).split(",") if p.strip()]
            line_no = code[: m.start()].count("\n") + 1
            metadata["functions"].append({
                "name": fn_name,
                "params": params,
                "returns": None,
                "docstring": None,
                "start_line": line_no,
            })
            verified_facts.append(
                DocumentationVerifiedFact(
                    category="function",
                    fact=f"Detected function signature '{fn_name}({m.group(2)})'",
                    evidence=f"line {line_no}: {m.group(0).strip()}",
                )
            )

    @classmethod
    def extract_jsts_metadata(
        cls,
        code: str,
        file_path: str = "pasted_code",
    ) -> Tuple[Dict[str, Any], List[DocumentationVerifiedFact], List[DocumentationSourceReference], List[str]]:
        """
        Extracts structural elements from JavaScript/TypeScript/React code using conservative regex scanning.
        """
        verified_facts: List[DocumentationVerifiedFact] = []
        source_references: List[DocumentationSourceReference] = []
        warnings: List[str] = []

        is_ts = bool(re.search(r":\s*(?:string|number|boolean|any|void|\w+\[\]|\w+<[\w\s,]+>)", code)) or file_path.endswith((".ts", ".tsx"))
        is_react = bool(re.search(r"import\s+.*(?:React|useState|useEffect)", code)) or bool(re.search(r"<\w+.*?>", code)) or file_path.endswith((".jsx", ".tsx"))

        lang_name = "TypeScript" if is_ts else "JavaScript"
        if is_react:
            lang_name += " (React)"

        metadata: Dict[str, Any] = {
            "language": "typescript" if is_ts else "javascript",
            "is_react": is_react,
            "imports": [],
            "functions": [],
            "classes": [],
            "interfaces": [],
            "endpoints": [],
        }

        # 1. Imports
        import_matches = re.finditer(r"import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_]+))\s+from\s+['\"]([^'\"]+)['\"]", code)
        for im in import_matches:
            imported_names = im.group(1) or im.group(2)
            source_pkg = im.group(3)
            metadata["imports"].append({"names": imported_names.strip() if imported_names else "", "source": source_pkg})

        # 2. Functions
        fn_pattern = re.compile(
            r"export\s+(?:default\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\((.*?)\)|"
            r"export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\((.*?)\)\s*(?::\s*[^=]+)?\s*=>",
            re.MULTILINE,
        )
        for m in fn_pattern.finditer(code):
            fn_name = m.group(1) or m.group(3)
            raw_params = m.group(2) if m.group(1) else m.group(4)
            line_no = code[: m.start()].count("\n") + 1

            metadata["functions"].append({
                "name": fn_name,
                "params": [p.strip() for p in (raw_params or "").split(",") if p.strip()],
                "line": line_no,
            })
            verified_facts.append(
                DocumentationVerifiedFact(
                    category="function",
                    fact=f"Exports function '{fn_name}'",
                    evidence=f"line {line_no}: {m.group(0).strip()[:60]}",
                )
            )

        # 3. Interfaces / Types
        if is_ts:
            type_pattern = re.compile(r"export\s+(interface|type)\s+([a-zA-Z0-9_]+)", re.MULTILINE)
            for m in type_pattern.finditer(code):
                kind = m.group(1)
                type_name = m.group(2)
                line_no = code[: m.start()].count("\n") + 1
                metadata["interfaces"].append({"name": type_name, "kind": kind, "line": line_no})
                verified_facts.append(
                    DocumentationVerifiedFact(
                        category="type_definition",
                        fact=f"Defines TypeScript {kind} '{type_name}'",
                        evidence=f"line {line_no}: {m.group(0).strip()}",
                    )
                )

        # 4. Express / API Routes
        route_pattern = re.compile(r"(?:app|router)\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]", re.MULTILINE | re.IGNORECASE)
        for m in route_pattern.finditer(code):
            method = m.group(1).upper()
            path = m.group(2)
            line_no = code[: m.start()].count("\n") + 1
            metadata["endpoints"].append({"method": method, "path": path, "line": line_no})
            verified_facts.append(
                DocumentationVerifiedFact(
                    category="endpoint",
                    fact=f"Registers {method} endpoint at '{path}'",
                    evidence=f"line {line_no}: {m.group(0).strip()}",
                )
            )

        verified_facts.append(
            DocumentationVerifiedFact(
                category="technology",
                fact=f"Structured in {lang_name}",
                evidence=f"Static scan confirmed {len(metadata['functions'])} functions, {len(metadata['interfaces'])} types, and {len(metadata['imports'])} imports",
            )
        )

        return metadata, verified_facts, source_references, warnings

    @classmethod
    def extract_repository_manifest_facts(
        cls,
        scanned_files: Dict[str, Any],
        manifest_contents: Optional[Dict[str, str]] = None,
    ) -> Tuple[Dict[str, Any], List[DocumentationVerifiedFact], List[DocumentationAssumption], List[str]]:
        """
        Inspects scanned repository files for package.json, pyproject.toml, requirements.txt,
        README references, and verified entry points.
        """
        manifest_contents = manifest_contents or {}
        verified_facts: List[DocumentationVerifiedFact] = []
        assumptions: List[DocumentationAssumption] = []
        warnings: List[str] = []

        manifest_data: Dict[str, Any] = {
            "project_name": None,
            "version": None,
            "technologies": [],
            "dependencies": [],
            "dev_dependencies": [],
            "scripts": {},
            "entry_points": [],
        }

        # Check for package.json
        if "package.json" in scanned_files or any(k.endswith("/package.json") for k in scanned_files):
            pkg_path = "package.json" if "package.json" in scanned_files else [k for k in scanned_files if k.endswith("/package.json")][0]
            file_meta = scanned_files[pkg_path]
            content = manifest_contents.get(pkg_path) or getattr(file_meta, "content", None) or (file_meta.get("content") if isinstance(file_meta, dict) else None)
            if content:
                try:
                    pkg = json.loads(content)
                    manifest_data["project_name"] = pkg.get("name")
                    manifest_data["version"] = pkg.get("version")
                    scripts = pkg.get("scripts", {})
                    manifest_data["scripts"] = scripts

                    deps = list(pkg.get("dependencies", {}).keys())
                    manifest_data["dependencies"].extend(deps)
                    manifest_data["technologies"].append("Node.js / JavaScript")

                    if "react" in deps:
                        manifest_data["technologies"].append("React")
                    if "typescript" in pkg.get("devDependencies", {}) or any(k.endswith((".ts", ".tsx")) for k in scanned_files):
                        manifest_data["technologies"].append("TypeScript")

                    verified_facts.append(
                        DocumentationVerifiedFact(
                            category="technology",
                            fact=f"Node.js package '{pkg.get('name', 'unnamed')}' v{pkg.get('version', '0.0.0')}",
                            evidence=f"{pkg_path}: 'name' and 'version' properties",
                        )
                    )
                    if scripts:
                        verified_facts.append(
                            DocumentationVerifiedFact(
                                category="scripts",
                                fact=f"Configured npm scripts: {', '.join(scripts.keys())}",
                                evidence=f"{pkg_path}: scripts block",
                            )
                        )
                except Exception as e:
                    warnings.append(f"Failed to parse {pkg_path} as JSON: {str(e)}")

        # Check for requirements.txt or pyproject.toml
        py_req = [k for k in scanned_files if k == "requirements.txt" or k.endswith("/requirements.txt")]
        if py_req:
            manifest_data["technologies"].append("Python")
            verified_facts.append(
                DocumentationVerifiedFact(
                    category="technology",
                    fact=f"Python dependency manifest detected at '{py_req[0]}'",
                    evidence=f"File presence: {py_req[0]}",
                )
            )

        # Detect entry points
        known_entry_points = [
            "backend/app/main.py",
            "app/main.py",
            "main.py",
            "src/main.tsx",
            "frontend/src/main.tsx",
            "src/index.tsx",
            "src/index.js",
            "index.js",
        ]
        for ep in known_entry_points:
            if ep in scanned_files:
                manifest_data["entry_points"].append(ep)
                verified_facts.append(
                    DocumentationVerifiedFact(
                        category="entry_point",
                        fact=f"Verified application entry point at '{ep}'",
                        evidence=f"Confirmed in repository scan: {ep}",
                    )
                )

        if not manifest_data["entry_points"]:
            assumptions.append(
                DocumentationAssumption(
                    claim="Standard entry point location not confirmed in scan",
                    basis="No standard entry point file (main.py, index.js, main.tsx) matched the root hierarchy",
                    verification_needed="Verify primary execution entry point in repository configuration",
                )
            )

        return manifest_data, verified_facts, assumptions, warnings
