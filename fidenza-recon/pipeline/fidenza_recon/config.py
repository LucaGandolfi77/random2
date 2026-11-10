"""Configuration loading and project paths."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = PROJECT_ROOT / "config"
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
DB_DIR = PROJECT_ROOT / "db"
DOCS_DIR = PROJECT_ROOT / "docs"
WEB_DATA_DIR = PROJECT_ROOT / "web" / "public" / "data"


def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


@dataclass(frozen=True)
class AppConfig:
    city: dict[str, Any]
    archetypes: dict[str, Any]
    materials: dict[str, Any]

    @property
    def pilot_bbox(self) -> tuple[float, float, float, float]:
        bbox = self.city["pilot"]["bbox_wgs84"]
        return float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])

    @property
    def context_bbox(self) -> tuple[float, float, float, float]:
        bbox = self.city.get("context", {}).get("bbox_wgs84") or self.city["pilot"]["bbox_wgs84"]
        return float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])

    @property
    def origin(self) -> tuple[float, float]:
        origin = self.city["origin"]
        return float(origin["lon"]), float(origin["lat"])

    @property
    def crs_metric(self) -> str:
        return self.city["crs"]["metric"]

    @property
    def archetype_defs(self) -> dict[str, Any]:
        return self.archetypes["archetypes"]

    def archetype(self, key: str) -> dict[str, Any]:
        return self.archetype_defs.get(key) or self.archetype_defs["generic"]

    @property
    def districts(self) -> list[dict[str, Any]]:
        return list(self.city["pilot"].get("districts") or [])

    @property
    def landmarks(self) -> list[dict[str, Any]]:
        return list(self.city["pilot"].get("landmarks") or [])

    @property
    def chunk_size_m(self) -> float:
        return float(self.city.get("rendering", {}).get("chunk_size_m", 120))

    @property
    def parent_chunk_size_m(self) -> float:
        return float(self.city.get("rendering", {}).get("parent_chunk_size_m", 480))

    @property
    def detail_radius_m(self) -> dict[str, float]:
        values = self.city.get("rendering", {}).get("detail_radius_m", {})
        return {
            "high": float(values.get("high", 200)),
            "medium": float(values.get("medium", 140)),
            "low": float(values.get("low", 0)),
        }

    @property
    def max_detail_chunks(self) -> dict[str, int]:
        values = self.city.get("rendering", {}).get("max_detail_chunks", {})
        return {
            "desktop": int(values.get("desktop", 24)),
            "mobile": int(values.get("mobile", 12)),
        }

    @property
    def downloads(self) -> dict[str, Any]:
        return dict(self.city.get("downloads") or {})

    @property
    def tiling(self) -> dict[str, Any]:
        return dict(self.city.get("tiling") or {})


def load_config() -> AppConfig:
    return AppConfig(
        city=_read_yaml(CONFIG_DIR / "city.yaml"),
        archetypes=_read_yaml(CONFIG_DIR / "archetypes.yaml"),
        materials=_read_yaml(CONFIG_DIR / "materials.yaml"),
    )


def ensure_dirs() -> None:
    for path in (
        RAW_DIR,
        PROCESSED_DIR,
        DB_DIR,
        DOCS_DIR,
        WEB_DATA_DIR,
        RAW_DIR / "osm",
        RAW_DIR / "rer",
        RAW_DIR / "kartaview",
        RAW_DIR / "commons",
        PROCESSED_DIR / "ground",
    ):
        path.mkdir(parents=True, exist_ok=True)
