#!/usr/bin/env python3
"""Generate a Matomo test-bucket matrix for one CI test-type.

Discovers every *Test.php file the named PHPUnit testsuite would run, sorts
alphabetically, distributes round-robin into N buckets, and emits a GitHub
Actions matrix to $GITHUB_OUTPUT (or stdout for local smoke runs).

Output names follow the convention <type-key>_matrix and <type-key>_count
where <type-key> is system_plugins / integration_core / integration_plugins.

Reads PHP_TEST_ENVIRONMENTS from the environment as a JSON array of
{php, adapter, mysql-engine, mysql-version} objects. Each bucket is
cross-producted with this list so every PHP env runs every bucket.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Iterable


TYPE_KEYS = {
    "system-plugins": "system_plugins",
    "integration-core": "integration_core",
    "integration-plugins": "integration_plugins",
}


def discover_files(repo_root: Path, type_arg: str) -> list[Path]:
    if type_arg == "system-plugins":
        return _discover_system_plugins(repo_root)
    if type_arg == "integration-core":
        return _discover_integration_core(repo_root)
    if type_arg == "integration-plugins":
        return _discover_integration_plugins(repo_root)
    raise ValueError(f"unknown type: {type_arg}")


def _iter_test_files(root: Path) -> Iterable[Path]:
    if not root.is_dir():
        return
    yield from root.rglob("*Test.php")


def _discover_system_plugins(repo_root: Path) -> list[Path]:
    files: list[Path] = []
    plugins_dir = repo_root / "plugins"
    if plugins_dir.is_dir():
        for plugin in sorted(plugins_dir.iterdir()):
            if not plugin.is_dir():
                continue
            for suite_root in (plugin / "tests", plugin / "Test"):
                for path in _iter_test_files(suite_root):
                    parts = path.relative_to(suite_root).parts
                    if parts and parts[0] in ("Integration", "Unit"):
                        continue
                    files.append(path)

    custom_root = repo_root / "tests" / "resources" / "custompluginsdir"
    if custom_root.is_dir():
        for plugin in sorted(custom_root.iterdir()):
            if not plugin.is_dir():
                continue
            for suite_root in (plugin / "tests" / "System", plugin / "Test" / "System"):
                files.extend(_iter_test_files(suite_root))
    return sorted(files)


def _discover_integration_core(repo_root: Path) -> list[Path]:
    files: list[Path] = []
    files.extend(_iter_test_files(repo_root / "tests" / "PHPUnit" / "Integration"))

    custom_root = repo_root / "tests" / "resources" / "custompluginsdir"
    if custom_root.is_dir():
        for plugin in sorted(custom_root.iterdir()):
            if not plugin.is_dir():
                continue
            for suite_root in (plugin / "tests" / "Integration", plugin / "Test" / "Integration"):
                files.extend(_iter_test_files(suite_root))
    return sorted(files)


def _discover_integration_plugins(repo_root: Path) -> list[Path]:
    files: list[Path] = []
    plugins_dir = repo_root / "plugins"
    if plugins_dir.is_dir():
        for plugin in sorted(plugins_dir.iterdir()):
            if not plugin.is_dir():
                continue
            for suite_root in (plugin / "tests" / "Integration", plugin / "Test" / "Integration"):
                files.extend(_iter_test_files(suite_root))
    return sorted(files)


def round_robin_buckets(files: list[str], requested_count: int) -> list[list[str]]:
    if not files:
        return []
    count = max(1, min(requested_count, len(files)))
    buckets: list[list[str]] = [[] for _ in range(count)]
    for index, path in enumerate(files):
        buckets[index % count].append(path)
    return buckets


def load_php_environments() -> list[dict]:
    raw = os.environ.get("PHP_TEST_ENVIRONMENTS")
    if not raw:
        raise RuntimeError("PHP_TEST_ENVIRONMENTS environment variable is required")
    environments = json.loads(raw)
    if not isinstance(environments, list) or not environments:
        raise RuntimeError("PHP_TEST_ENVIRONMENTS must be a non-empty JSON array")
    required = {"php", "adapter", "mysql-engine", "mysql-version"}
    for env in environments:
        if not isinstance(env, dict) or not required.issubset(env):
            raise RuntimeError(
                "Each PHP_TEST_ENVIRONMENTS entry must include "
                "php, adapter, mysql-engine, mysql-version"
            )
    return environments


def build_matrix(
    buckets: list[list[str]], environments: list[dict]
) -> list[dict]:
    total = len(buckets)
    rows: list[dict] = []
    for index, bucket in enumerate(buckets, start=1):
        label = f"bucket-{index:02d}-of-{total:02d}"
        keep_paths = "\n".join(bucket)
        for env in environments:
            rows.append(
                {
                    "bucket-label": label,
                    "keep-paths": keep_paths,
                    "php": env["php"],
                    "adapter": env["adapter"],
                    "mysql-engine": env["mysql-engine"],
                    "mysql-version": env["mysql-version"],
                }
            )
    return rows


def emit_outputs(type_key: str, matrix: list[dict]) -> None:
    matrix_json = json.dumps(matrix, separators=(",", ":"))
    lines = [
        f"{type_key}_matrix={matrix_json}",
        f"{type_key}_count={len(matrix)}",
    ]
    output_path = os.environ.get("GITHUB_OUTPUT")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as handle:
            for line in lines:
                handle.write(line + "\n")
    else:
        for line in lines:
            print(line)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, help="Path to the Matomo checkout")
    parser.add_argument("--type", required=True, choices=sorted(TYPE_KEYS.keys()))
    parser.add_argument(
        "--bucket-count",
        type=int,
        help="Number of buckets (required for the default matrix mode)",
    )
    parser.add_argument(
        "--list-in-scope",
        action="store_true",
        help="Print every *Test.php file the testsuite would run (one per line) and exit. "
        "Used by the CI filter step to know which files to consider deleting.",
    )
    args = parser.parse_args(argv)

    repo_root = Path(args.repo_root).resolve()
    if not repo_root.is_dir():
        parser.error(f"--repo-root does not exist: {repo_root}")

    files = discover_files(repo_root, args.type)
    relative = [path.relative_to(repo_root).as_posix() for path in files]

    if args.list_in_scope:
        for path in relative:
            print(path)
        return 0

    if args.bucket_count is None:
        parser.error("--bucket-count is required unless --list-in-scope is given")

    environments = load_php_environments()
    buckets = round_robin_buckets(relative, args.bucket_count)
    matrix = build_matrix(buckets, environments)

    emit_outputs(TYPE_KEYS[args.type], matrix)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
