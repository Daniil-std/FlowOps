import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

from package_source import build_archive


class PackagingTest(unittest.TestCase):
    def test_archive_excludes_dependencies_data_and_credentials_without_deleting(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            included = ["README.md", "frontend/src/App.tsx", "backend/app/main.py"]
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
