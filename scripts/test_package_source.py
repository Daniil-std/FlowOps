import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from package_source import build_archive


class PackagingTest(unittest.TestCase):
    def test_archive_excludes_dependencies_data_and_credentials_without_deleting(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            included = [
                "README.md",
                "render.yaml",
                "frontend/src/App.tsx",
                "backend/app/main.py",
                "demo/src/App.tsx",
                "demo/src/processing/processor.worker.ts",
                "demo/package.json",
                "demo/package-lock.json",
                "demo/.prettierrc.json",
                "demo/.prettierignore",
                "frontend/.prettierignore",
                "demo/public/demo/clean-cleaned.xlsx",
                "demo/public/demo/issues-cleaned.xlsx",
                "demo/public/demo/clean.json",
            ]
            excluded = [
                ".git/config",
                ".venv/site.py",
                "frontend/node_modules/pkg/index.js",
                "frontend/dist/index.html",
                "backend/__pycache__/cache.py",
                "backend/.env",
                "backend/.env.local",
                "backend/secrets.json",
                "backend/private.pem",
                "backend/debug.log",
                "backend/data.sqlite",
                "backend/database.sql",
                "backend/.mypy_cache/state.json",
                "demo/node_modules/pkg/index.js",
                "demo/dist/index.html",
                "demo/.env.production",
                "demo/data/orders.csv",
                "demo/uploads/orders.json",
                "demo/local-data/orders.csv",
                "demo/artifacts/browser-qa.json",
                "demo/report.xlsx",
                "demo/tsconfig.tsbuildinfo",
                "demo/auth-token.json",
            ]
            for name in included + excluded:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("fixture", encoding="utf-8")
            output = root / "artifacts/source.zip"
            self.assertEqual(build_archive(root, output), len(included))
            with ZipFile(output) as archive:
                self.assertEqual(set(archive.namelist()), {f"flowops/{x}" for x in included})
            self.assertTrue(all((root / name).exists() for name in excluded))


if __name__ == "__main__":
    unittest.main()
