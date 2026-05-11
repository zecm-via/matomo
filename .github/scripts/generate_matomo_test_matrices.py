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
import re
import sys
from pathlib import Path
from typing import Iterable


CLASS_DECLARATION_RE = re.compile(r"\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b")
EXTENDS_RE = re.compile(r"\bextends\s+([A-Za-z_\\][A-Za-z0-9_\\]*)")


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


def find_base_files(files: list[Path]) -> set[Path]:
    """Return the subset of files whose declared class is `extends`-targeted by
    another file in the input list.

    Such files (typically `abstract class XxxTest extends ...`) must stay in
    every bucket's keep-list — deleting them breaks PHPUnit's autoloader for
    their subclasses, which are runnable tests living in other buckets. Only
    cross-file references count; classes that extend a sibling declared in
    the same file (e.g. inner fixture classes) don't pin the file.
    """
    classes_in_file: dict[Path, set[str]] = {}
    extends_in_file: dict[Path, set[str]] = {}

    for path in files:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        classes_in_file[path] = {m.group(1) for m in CLASS_DECLARATION_RE.finditer(text)}
        extends_in_file[path] = {
            m.group(1).rsplit("\\", 1)[-1] for m in EXTENDS_RE.finditer(text)
        }

    bases: set[Path] = set()
    for path, classes in classes_in_file.items():
        for other_path, other_extends in extends_in_file.items():
            if other_path == path:
                continue
            if classes & other_extends:
                bases.add(path)
                break
    return bases


def build_units(
    relative: list[str], type_arg: str, base_paths: set[str]
) -> list[tuple[str, list[str]]]:
    """Construct atomic bucketing units. Each unit goes to exactly one bucket.

    Pinned-plugin grouping: some tests scan their plugin's own filesystem at
    runtime (currently only `CheckDirectDependencyUseCommandTest`, found in
    `system-plugins`). If those files get split across buckets, the on-disk
    assertion fails. So every in-scope file of any plugin containing such a
    test is grouped into a single unit and travels together.

    Everything else (and every file under `integration-core`/`-plugins`,
    where no equivalent check exists) becomes its own single-file unit, so
    the assignment falls back to pure file-count distribution.

    Base classes (`base_paths`) are excluded from units — they're appended
    to every bucket by the caller.
    """
    pinned_filename = "CheckDirectDependencyUseCommandTest.php"
    pinned_plugins: set[str] = set()
    if type_arg == "system-plugins":
        for rel in relative:
            parts = rel.split("/")
            if (
                len(parts) >= 2
                and parts[0] == "plugins"
                and parts[-1] == pinned_filename
            ):
                pinned_plugins.add(parts[1])

    plugin_groups: dict[str, list[str]] = {}
    loose: list[str] = []
    for rel in relative:
        if rel in base_paths:
            continue
        parts = rel.split("/")
        if len(parts) >= 2 and parts[0] == "plugins" and parts[1] in pinned_plugins:
            plugin_groups.setdefault(parts[1], []).append(rel)
        else:
            loose.append(rel)

    units: list[tuple[str, list[str]]] = []
    units.extend((plugin, sorted(paths)) for plugin, paths in plugin_groups.items())
    units.extend((rel, [rel]) for rel in loose)
    return units


def assign_to_buckets(
    units: list[tuple[str, list[str]]], requested_count: int
) -> list[list[str]]:
    """Greedy bin-pack: largest unit first into the least-loaded bucket.

    When all units are single files (no pinned-plugin grouping) this
    degenerates to perfect round-robin balance — same result as a modulo
    distribution, just expressed as a single algorithm that also handles
    grouped units correctly.
    """
    if not units:
        return []
    sorted_units = sorted(units, key=lambda unit: (-len(unit[1]), unit[0]))
    count = max(1, min(requested_count, len(sorted_units)))
    buckets: list[list[str]] = [[] for _ in range(count)]
    weights = [0] * count
    for _, files in sorted_units:
        target = min(range(count), key=lambda i: (weights[i], i))
        buckets[target].extend(files)
        weights[target] += len(files)
    return [bucket for bucket in buckets if bucket]


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

    base_paths = find_base_files(files)
    always_keep = sorted(path.relative_to(repo_root).as_posix() for path in base_paths)
    always_keep_set = set(always_keep)

    units = build_units(relative, args.type, always_keep_set)
    buckets = assign_to_buckets(units, args.bucket_count)
    for bucket in buckets:
        bucket.extend(always_keep)

    environments = load_php_environments()
    matrix = build_matrix(buckets, environments)

    emit_outputs(TYPE_KEYS[args.type], matrix)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
