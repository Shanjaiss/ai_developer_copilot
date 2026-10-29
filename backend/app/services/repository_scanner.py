"""
Lightweight, secure repository scanner service.
Performs bounded, read-only traversal of server-approved repositories.
Extracts file metadata, imports, exports, and hierarchical tree structure
while enforcing strict filesystem safety, secret exclusion, and resource limits.
"""
import ast
import fnmatch
import logging
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from app.core.config import settings
from app.schemas.repository import (
    FileImport,
    FileMetadata,
    RepositorySummary,
    RepositoryScanResponse,
    TreeNode,
)

logger = logging.getLogger(__name__)

# Excluded directory names (never descended into)
EXCLUDED_DIR_NAMES: Set[str] = {
    ".git",
    "node_modules",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".cache",
    ".idea",
    ".vscode",
    ".pytest_cache",
    ".mypy_cache",
    ".DS_Store",
}

# Excluded specific file basenames
EXCLUDED_FILE_NAMES: Set[str] = {
    ".env",
    ".npmrc",
    ".pypirc",
    ".netrc",
    "id_rsa",
    "id_ed25519",
    "id_ecdsa",
    "credentials.json",
    "secrets.json",
    ".DS_Store",
}

# Excluded file patterns (fnmatch)
EXCLUDED_PATTERNS: List[str] = [
    ".env*",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "*.keystore",
    "*.jks",
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    "*.pyc",
    "*.pyo",
    "*.tar",
    "*.gz",
    "*.zip",
    "*.exe",
    "*.bin",
    "*.dylib",
    "*.so",
    "*.dll",
    "service-account*.json",
]

# Supported source file extensions and language mappings
SUPPORTED_EXTENSIONS: Dict[str, str] = {
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".json": "json",
    ".css": "css",
    ".html": "html",
    ".md": "markdown",
    ".sql": "sql",
    ".sh": "bash",
    ".bash": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
}

# Entry point file heuristics
ENTRY_POINT_NAMES: Set[str] = {
    "main.py",
    "app.py",
    "server.py",
    "index.ts",
    "index.js",
    "index.html",
    "main.tsx",
    "main.ts",
    "App.tsx",
    "asgi.py",
    "wsgi.py",
}

# Secret pattern regexes for conservative in-memory redaction
SECRET_REGEXES: List[re.Pattern] = [
    re.compile(r"-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----"),
    re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{20,}\b"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"(?i)\b(?:Bearer)\s+[a-zA-Z0-9_\-\.]{25,}\b"),
    re.compile(r"(?i)(?:api_key|apikey|secret|password|passwd|auth_token)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
]


def redact_secrets(text: str) -> str:
    """Applies conservative regex-based redaction to eliminate leaked secrets in snippets."""
    for pattern in SECRET_REGEXES:
        text = pattern.sub("[REDACTED_SECRET]", text)
    return text


def is_path_safe(root: Path, target: Path) -> bool:
    """
    Verifies target path resolves strictly within the canonical root without traversing out.
    Rejects symlinks pointing outside the approved root.
    """
    try:
        canonical_root = root.resolve()
        canonical_target = target.resolve()
        return canonical_target.is_relative_to(canonical_root)
    except (ValueError, RuntimeError, OSError):
        return False


def is_file_excluded(file_name: str) -> bool:
    """Checks whether a file name matches secret exclusion rules."""
    if file_name in EXCLUDED_FILE_NAMES:
        return True
    for pattern in EXCLUDED_PATTERNS:
        if fnmatch.fnmatch(file_name.lower(), pattern.lower()):
            return True
    return False


def is_binary_content(sample_bytes: bytes) -> bool:
    """Checks if a sample of file bytes contains null bytes characteristic of binary files."""
    return b"\x00" in sample_bytes


class RepositoryScanner:
    """
    High-performance, resource-bounded repository scanner.
    Performs deterministic, read-only indexing of approved repositories.
    """

    def __init__(self) -> None:
        # In-memory scan cache: repository_id -> (timestamp, RepositoryScanResponse, Dict[relative_path, FileMetadata])
        self._cache: Dict[str, Tuple[float, RepositoryScanResponse, Dict[str, FileMetadata]]] = {}
        self._cache_ttl_seconds: float = 300.0  # 5 minutes

    def clear_cache(self, repository_id: Optional[str] = None) -> None:
        """Clears cached scans."""
        if repository_id:
            self._cache.pop(repository_id.lower(), None)
        else:
            self._cache.clear()

    def get_cached_scan(
        self, repository_id: str
    ) -> Optional[Tuple[RepositoryScanResponse, Dict[str, FileMetadata]]]:
        """Returns cached scan result if within TTL."""
        entry = self._cache.get(repository_id.lower())
        if not entry:
            return None
        timestamp, scan_response, file_map = entry
        if time.time() - timestamp > self._cache_ttl_seconds:
            self._cache.pop(repository_id.lower(), None)
            return None
        return scan_response, file_map

    def extract_python_metadata(self, source_text: str) -> Tuple[List[FileImport], List[str]]:
        """Extracts imports and top-level exported symbols using Python standard ast."""
        imports: List[FileImport] = []
        exports: List[str] = []

        try:
            tree = ast.parse(source_text)
        except SyntaxError:
            # Fallback to regex on syntax errors
            return self._extract_python_regex(source_text)

        for node in tree.body:
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(FileImport(module=alias.name, is_local=False, symbols=[alias.asname or alias.name]))
            elif isinstance(node, ast.ImportFrom):
                mod = ("." * node.level) + (node.module or "")
                is_local = node.level > 0 or mod.startswith("app.") or mod.startswith(".")
                syms = [alias.name for alias in node.names]
                imports.append(FileImport(module=mod, is_local=is_local, symbols=syms))
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not node.name.startswith("_"):
                    exports.append(node.name)
            elif isinstance(node, ast.ClassDef):
                if not node.name.startswith("_"):
                    exports.append(node.name)

        return imports, exports

    def _extract_python_regex(self, source_text: str) -> Tuple[List[FileImport], List[str]]:
        """Regex fallback for malformed or unparseable Python files."""
        imports: List[FileImport] = []
        exports: List[str] = []

        for line in source_text.splitlines():
            line_str = line.strip()
            if line_str.startswith("import "):
                parts = line_str[7:].split(",")
                for p in parts:
                    mod = p.strip().split()[0]
                    imports.append(FileImport(module=mod, is_local=False, symbols=[]))
            elif line_str.startswith("from "):
                match = re.match(r"^from\s+([a-zA-Z0-9_\.]+)\s+import\s+(.*)", line_str)
                if match:
                    mod, syms = match.groups()
                    is_local = mod.startswith(".") or mod.startswith("app.")
                    symbols = [s.strip() for s in syms.split(",") if s.strip()]
                    imports.append(FileImport(module=mod, is_local=is_local, symbols=symbols))
            elif line_str.startswith("def ") or line_str.startswith("async def "):
                match = re.match(r"^(?:async\s+)?def\s+([a-zA-Z0-9_]+)", line_str)
                if match and not match.group(1).startswith("_"):
                    exports.append(match.group(1))
            elif line_str.startswith("class "):
                match = re.match(r"^class\s+([a-zA-Z0-9_]+)", line_str)
                if match and not match.group(1).startswith("_"):
                    exports.append(match.group(1))

        return imports, exports

    def extract_js_ts_metadata(self, source_text: str) -> Tuple[List[FileImport], List[str]]:
        """Extracts imports and exports from JavaScript and TypeScript using conservative regex parsing."""
        imports: List[FileImport] = []
        exports: List[str] = []

        # static import ... from '...'
        import_pattern = re.compile(r"""(?:import\s+(?:([\w*\s{},]+)\s+from\s+)?|export\s+.*?\s+from\s+)['"]([^'"]+)['"]""")
        for match in import_pattern.finditer(source_text):
            syms_raw, mod = match.groups()
            is_local = mod.startswith("./") or mod.startswith("../") or mod.startswith("/")
            symbols: List[str] = []
            if syms_raw:
                # clean up symbols: { a, b as c } -> ['a', 'b', 'c']
                clean = re.sub(r"[{}]", "", syms_raw)
                for part in clean.split(","):
                    p = part.strip()
                    if p:
                        if " as " in p:
                            p = p.split(" as ")[-1].strip()
                        symbols.append(p)
            imports.append(FileImport(module=mod, is_local=is_local, symbols=symbols))

        # require('...')
        require_pattern = re.compile(r"""require\(['"]([^'"]+)['"]\)""")
        for match in require_pattern.finditer(source_text):
            mod = match.group(1)
            is_local = mod.startswith("./") or mod.startswith("../") or mod.startswith("/")
            imports.append(FileImport(module=mod, is_local=is_local, symbols=[]))

        # export function / class / const / let
        export_decl_pattern = re.compile(r"""export\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+([a-zA-Z0-9_$]+)""")
        for match in export_decl_pattern.finditer(source_text):
            exports.append(match.group(1))

        return imports, exports

    def scan_repository(self, repository_id: str, root_path: Path) -> Tuple[RepositoryScanResponse, Dict[str, FileMetadata]]:
        """
        Executes bounded, read-only scanning of an approved repository directory.
        Enforces maximum file count, maximum file size, aggregate bytes, and maximum depth.
        Returns the scan response and an in-memory dictionary of relative_path -> FileMetadata.
        """
        canonical_root = root_path.resolve()
        if not canonical_root.exists() or not canonical_root.is_dir():
            raise FileNotFoundError(f"Approved repository root does not exist: {canonical_root}")

        scanned_files: Dict[str, FileMetadata] = {}
        warnings: List[str] = []
        languages: Dict[str, int] = {}
        entry_points: List[str] = []
        total_lines = 0
        total_bytes = 0
        is_partial = False

        max_files = int(os.getenv("REPO_MAX_FILES", str(settings.REPO_MAX_FILES)))
        max_file_size = int(os.getenv("REPO_MAX_FILE_SIZE_BYTES", str(settings.REPO_MAX_FILE_SIZE_BYTES)))
        max_aggregate_bytes = int(os.getenv("REPO_MAX_AGGREGATE_BYTES", str(settings.REPO_MAX_AGGREGATE_BYTES)))
        max_depth = int(os.getenv("REPO_MAX_TREE_DEPTH", str(settings.REPO_MAX_TREE_DEPTH)))

        # Collect candidate file paths using bounded breadth/depth-safe traversal
        for dirpath, dirnames, filenames in os.walk(str(canonical_root), followlinks=False):
            current_dir = Path(dirpath).resolve()

            # Prevent symlink directory escape
            if not current_dir.is_relative_to(canonical_root):
                dirnames.clear()
                continue

            # Calculate depth relative to root
            try:
                rel_dir = current_dir.relative_to(canonical_root)
                depth = len(rel_dir.parts)
            except ValueError:
                depth = 0

            # Check if any subdirectories exceed max depth
            kept_dirs = []
            for d in dirnames:
                if d in EXCLUDED_DIR_NAMES or d.startswith("."):
                    continue
                if (depth + 1) > max_depth:
                    warnings.append(f"Directory tree depth exceeded maximum limit ({max_depth}). Deeper folders were omitted.")
                    is_partial = True
                else:
                    kept_dirs.append(d)
            dirnames[:] = kept_dirs

            if depth > max_depth:
                warnings.append(f"Directory tree depth exceeded maximum limit ({max_depth}). Deeper folders were omitted.")
                is_partial = True
                continue

            for fname in sorted(filenames):
                if len(scanned_files) >= max_files:
                    warnings.append(f"Reached maximum file scan limit ({max_files} files).")
                    is_partial = True
                    break

                if total_bytes >= max_aggregate_bytes:
                    warnings.append(f"Reached maximum aggregate scan byte budget ({max_aggregate_bytes // (1024 * 1024)} MB).")
                    is_partial = True
                    break

                if is_file_excluded(fname):
                    continue

                fpath = (current_dir / fname).resolve()
                if not fpath.is_relative_to(canonical_root):
                    continue

                # Ensure it's a regular file (reject device files, sockets, fifos)
                try:
                    if not fpath.is_file():
                        continue
                    st = fpath.stat()
                except (OSError, PermissionError):
                    continue

                file_size = st.st_size
                if file_size > max_file_size:
                    warnings.append(f"Skipped oversized file '{fname}' ({file_size // 1024} KB > limit {max_file_size // 1024} KB).")
                    continue

                ext = fpath.suffix.lower()
                if ext not in SUPPORTED_EXTENSIONS:
                    continue

                # Read sample to verify non-binary
                try:
                    with open(fpath, "rb") as bf:
                        sample = bf.read(1024)
                        if is_binary_content(sample):
                            continue
                except (OSError, PermissionError):
                    continue

                # Read full text
                try:
                    with open(fpath, "r", encoding="utf-8", errors="replace") as tf:
                        content = tf.read()
                except Exception as exc:
                    logger.warning("Could not read text for file %s: %s", fpath, exc)
                    continue

                rel_path = fpath.relative_to(canonical_root).as_posix()
                lang = SUPPORTED_EXTENSIONS[ext]
                line_count = len(content.splitlines())

                is_entry = fname in ENTRY_POINT_NAMES or (
                    depth == 0 and any(k in fname.lower() for k in ["main", "entry", "server", "app"])
                )
                if is_entry:
                    entry_points.append(rel_path)

                # Extract imports & exports
                imports: List[FileImport] = []
                exports: List[str] = []
                if lang == "python":
                    imports, exports = self.extract_python_metadata(content)
                elif lang in {"typescript", "javascript"}:
                    imports, exports = self.extract_js_ts_metadata(content)

                meta = FileMetadata(
                    path=rel_path,
                    name=fname,
                    extension=ext,
                    size_bytes=file_size,
                    line_count=line_count,
                    language=lang,
                    is_entry_point=is_entry,
                    imports=imports,
                    exports=exports,
                )

                scanned_files[rel_path] = meta
                languages[lang] = languages.get(lang, 0) + 1
                total_lines += line_count
                total_bytes += file_size

            if is_partial and len(scanned_files) >= max_files:
                break

        # Build hierarchical tree nodes
        tree = self._build_tree(scanned_files)

        summary = RepositorySummary(
            repository_id=repository_id,
            total_files_scanned=len(scanned_files),
            total_lines=total_lines,
            total_bytes=total_bytes,
            languages=languages,
            entry_points=entry_points,
            is_partial=is_partial,
            warnings=warnings,
        )

        response = RepositoryScanResponse(summary=summary, tree=tree)
        self._cache[repository_id.lower()] = (time.time(), response, scanned_files)
        return response, scanned_files

    def _build_tree(self, scanned_files: Dict[str, FileMetadata]) -> List[TreeNode]:
        """Constructs a nested TreeNode hierarchy from relative paths."""
        root_dict: Dict = {}
        for rel_path, meta in scanned_files.items():
            parts = rel_path.split("/")
            curr = root_dict
            for part in parts[:-1]:
                curr = curr.setdefault(part, {})
            curr[parts[-1]] = meta

        def dict_to_nodes(d: Dict, prefix: str = "") -> List[TreeNode]:
            nodes: List[TreeNode] = []
            for name, val in sorted(d.items(), key=lambda x: (not isinstance(x[1], dict), x[0].lower())):
                node_path = f"{prefix}/{name}" if prefix else name
                if isinstance(val, dict):
                    children = dict_to_nodes(val, prefix=node_path)
                    nodes.append(
                        TreeNode(
                            name=name,
                            path=node_path,
                            type="directory",
                            children=children,
                        )
                    )
                else:
                    meta: FileMetadata = val
                    nodes.append(
                        TreeNode(
                            name=name,
                            path=node_path,
                            type="file",
                            size_bytes=meta.size_bytes,
                            language=meta.language,
                            is_entry_point=meta.is_entry_point,
                            children=None,
                        )
                    )
            return nodes

        return dict_to_nodes(root_dict)


repository_scanner = RepositoryScanner()
