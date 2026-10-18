"""Build a source-only ZIP without changing the working project."""

import argparse
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {
    "README.md",
    "compose.yaml",
    "render.yaml",
    ".gitignore",
    ".gitattributes",
}
SOURCE_DIRS = {"backend", "frontend", "demo", "samples", "docs", "scripts", ".github"}
EXCLUDED = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "coverage",
    "htmlcov",
    "playwright-report",
    "test-results",
    "exports",
    "artifacts",
    ".idea",
    ".vscode",
    "data",
    "local-data",
    "uploads",
    ".cache",
    ".local",
    "tmp",
}
EXTENSIONS = {
    ".py",
    ".toml",
    ".lock",
    ".ini",
    ".mako",
    ".txt",
    ".ts",
    ".tsx",
    ".js",
    ".json",
    ".css",
    ".html",
    ".svg",
    ".md",
    ".yaml",
    ".yml",
    ".csv",
    ".png",
    ".webp",
}


def source_files(root: Path) -> list[Path]:
    selected = []
    for directory, folders, files in root.walk(follow_symlinks=False):
        folders[:] = sorted(
            folder
            for folder in folders
            if folder not in EXCLUDED
            and not folder.endswith(".egg-info")
            and not (directory / folder).is_symlink()
            and (directory != root or folder in SOURCE_DIRS)
        )
        for name in sorted(files):
            path = directory / name
            if path.is_symlink():
                continue
            if directory == root:
                if name in ROOT_FILES:
                    selected.append(path)
                continue
            # A file allowlist also omits databases, keys, logs, archives and env files.
            if name.startswith(".env"):
                continue
            # Only the prepared fictional workbooks belong in the source archive.
            if path.suffix.lower() == ".xlsx":
                if path.relative_to(root).as_posix() in {
                    "demo/public/demo/clean-cleaned.xlsx",
                    "demo/public/demo/issues-cleaned.xlsx",
                }:
                    selected.append(path)
                continue
            if path.suffix.lower() in EXTENSIONS or name in {
                "Dockerfile",
                ".dockerignore",
                ".prettierignore",
            }:
                if any(word in name.lower() for word in ("secret", "credential", "token")):
                    continue
                selected.append(path)
    return sorted(selected)


def build_archive(root: Path, output: Path) -> int:
    files = source_files(root)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, Path("flowops") / path.relative_to(root))
    return len(files)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts/flowops-source.zip")
    args = parser.parse_args()
    count = build_archive(ROOT, args.output.resolve())
    print(f"Packed {count} source files: {args.output.resolve()}")
    print("Review source content before sharing; no filename filter can detect embedded secrets.")
