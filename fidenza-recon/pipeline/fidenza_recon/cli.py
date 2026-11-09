"""Command line entry point."""

from __future__ import annotations

import argparse

from .config import ensure_dirs, load_config
from .db import connect, init_db


def main() -> None:
    parser = argparse.ArgumentParser(prog="fidenza-recon")
    parser.add_argument("command", choices=["fetch", "analyze", "generate", "report", "all"])
    parser.add_argument("--force", action="store_true", help="ignore cached outputs")
    parser.add_argument("--skip-imagery", action="store_true", help="skip KartaView/Commons probes")
    args = parser.parse_args()

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
        from .analyze import buildings, classify, heights, roofs

        buildings.analyze(config, force=args.force)
        heights.analyze(config, force=args.force)
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


if __name__ == "__main__":
    main()
