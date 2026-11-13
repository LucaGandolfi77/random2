"""Command line entry point."""

from __future__ import annotations

import argparse
from pathlib import Path

from .config import DOCS_DIR, PROCESSED_DIR, ensure_dirs, load_config
from .db import connect, init_db


def main() -> None:
    parser = argparse.ArgumentParser(prog="fidenza-recon")
    parser.add_argument(
        "command",
        choices=["fetch", "analyze", "generate", "report", "audit", "coverage", "export", "all"],
    )
    parser.add_argument("--force", action="store_true", help="ignore cached outputs")
    parser.add_argument("--skip-imagery", action="store_true", help="skip KartaView/Commons probes")
    parser.add_argument(
        "--format",
        choices=["json", "yaml", "jsonl", "csv"],
        default="json",
        help="export format (default: json)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="export file or directory (default: db/exports/)",
    )
    parser.add_argument(
        "--tables",
        help="comma-separated table names to export (default: all)",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="keep raw JSON strings and absolute paths",
    )
    parser.add_argument(
        "--no-timestamp",
        action="store_true",
        help="omit generated_at for reproducible exports",
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation; 0 disables pretty printing (default: 2)",
    )
    args = parser.parse_args()

    if args.command == "export":
        from .export import db_dump

        tables = [name.strip() for name in args.tables.split(",")] if args.tables else None
        summary = db_dump.export(
            fmt=args.format,
            output=args.output,
            tables=tables,
            raw=args.raw,
            include_timestamp=not args.no_timestamp,
            indent=args.indent,
        )
        print(f"wrote {summary['row_count']} rows to {summary['path']}")
        for table, count in summary["table_counts"].items():
            print(f"  {table}: {count}")
        return

    ensure_dirs()
    config = load_config()
    conn = connect()
    init_db(conn)
    conn.close()

    if args.command in {"fetch", "all"}:
        from .fetch import commons, kartaview, overpass, rer

        overpass.fetch(config, force=args.force)
        rer.fetch(config, force=args.force)
        if not args.skip_imagery:
            kartaview.probe(config, force=args.force)
            commons.fetch(force=args.force)

    if args.command in {"analyze", "all"}:
        from .analyze import buildings, classify, dbtr, heights, roofs

        buildings.analyze(config, force=args.force)
        heights.analyze(config, force=args.force)
        dbtr.enrich(config, force=args.force)
        roofs.analyze(config, force=args.force)
        classify.analyze(config, force=args.force)

    if args.command in {"generate", "all"}:
        from .export import db_export
        from .generate import city, descriptors

        descriptors.build_descriptors(config, force=args.force)
        city.build(config, force=args.force)
        db_export.export(config)

    if args.command in {"report", "all"}:
        from .validate import report

        outputs = report.generate()
        for name, path in outputs.items():
            print(f"wrote {name}: {path}")

    if args.command == "audit":
        from .validate import data_audit

        outputs = data_audit.generate(config)
        for name, path in outputs.items():
            print(f"wrote {name}: {path}")

    if args.command == "coverage":
        from .validate import coverage

        result = coverage.analyze(config)
        print(
            f"coverage: {result['coverage_pct']}% of built-up surface, "
            f"{result['candidate_count']} candidates"
        )
        print(f"wrote: {PROCESSED_DIR / 'coverage_audit.json'}")
        print(f"wrote: {DOCS_DIR / 'COVERAGE_AUDIT.md'}")
        print(f"wrote: {DOCS_DIR / 'screenshots' / '08-coverage-gaps.png'}")


if __name__ == "__main__":
    main()
