"""Audit the next-generation open data sources before changing the pipeline.

Checks the RER 2023-24 DTM/orthophoto services, the availability of a
same-epoch DSM/LiDAR surface, the DBTR WMS fallback and the current
street-level coverage. Writes a machine-readable audit and a markdown report.
"""

from __future__ import annotations

import json
import re
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio
import requests

from ..analyze import dbtr
from ..config import DOCS_DIR, PROCESSED_DIR, RAW_DIR, AppConfig
from ..geo import GeoContext

ARCGIS = "https://servizigis.regione.emilia-romagna.it/arcgis/rest/services"
PUBLIC = f"{ARCGIS}/public"
WMS_DBTR = "https://servizigis.regione.emilia-romagna.it/wms/dbtr"
ROOT_CKAN = "https://dati.emilia-romagna.it"


def _json(url: str, params: dict | None = None, timeout: int = 30) -> dict | None:
    try:
        response = requests.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except Exception:  # noqa: BLE001 - audit must degrade gracefully
        return None


def _text(url: str, params: dict | None = None, timeout: int = 60) -> str | None:
    try:
        response = requests.get(url, params=params, timeout=timeout)
        response.raise_for_status()
        return response.text
    except Exception:  # noqa: BLE001 - audit must degrade gracefully
        return None


def _image_meta(service: str) -> dict:
    data = _json(f"{PUBLIC}/{service}/ImageServer", {"f": "json"})
    if not data or "pixelSizeX" not in data:
        return {"available": False}
    return {
        "available": True,
        "pixel_size_x": data.get("pixelSizeX"),
        "pixel_size_y": data.get("pixelSizeY"),
        "band_count": data.get("bandCount"),
        "pixel_type": data.get("pixelType"),
        "max_width": data.get("maxImageWidth"),
        "max_height": data.get("maxImageHeight"),
        "extent": data.get("extent"),
    }


def _export_sample(
    service: str,
    bbox: tuple[float, float, float, float],
    width: int,
    height: int,
    target: Path,
    pixel_type: str | None = None,
) -> dict:
    target.parent.mkdir(parents=True, exist_ok=True)
    params = {
        "bbox": ",".join(f"{value:.3f}" for value in bbox),
        "bboxSR": "7791",
        "imageSR": "7791",
        "size": f"{width},{height}",
        "format": "tiff",
        "interpolation": "RSP_BilinearInterpolation",
        "f": "image",
    }
    if pixel_type:
        params["pixelType"] = pixel_type
    try:
        response = requests.get(
            f"{PUBLIC}/{service}/ImageServer/exportImage",
            params=params,
            timeout=120,
        )
        response.raise_for_status()
        if "image" not in response.headers.get("content-type", ""):
            return {"ok": False, "status": response.status_code}
        target.write_bytes(response.content)
        result: dict = {"ok": True, "path": str(target), "bytes": len(response.content)}
        with rasterio.open(target) as dataset:
            data = dataset.read(1)
            result.update(
                {
                    "width": dataset.width,
                    "height": dataset.height,
                    "crs": str(dataset.crs),
                    "min": float(np.nanmin(data)),
                    "max": float(np.nanmax(data)),
                    "mean": float(np.nanmean(data)),
                }
            )
        return result
    except Exception as exc:  # noqa: BLE001 - audit must degrade gracefully
        return {"ok": False, "error": str(exc)[:300]}


def _dtm_delta(current_path: Path, audit_path: Path, bbox: tuple[float, float, float, float]) -> dict:
    if not current_path.exists() or not audit_path.exists():
        return {"available": False}
    with rasterio.open(audit_path) as fine, rasterio.open(current_path) as coarse:
        left, bottom, right, top = bbox
        points = []
        for row in range(30):
            for column in range(30):
                x = left + (right - left) * (column + 0.5) / 30
                y = bottom + (top - bottom) * (row + 0.5) / 30
                points.append((x, y))
        fine_values = np.array([value[0] for value in fine.sample(points)], dtype="float64")
        coarse_values = np.array([value[0] for value in coarse.sample(points)], dtype="float64")
        valid = np.isfinite(fine_values) & np.isfinite(coarse_values)
        if not valid.any():
            return {"available": True, "valid": 0}
        differences = np.abs(fine_values[valid] - coarse_values[valid])
        return {
            "available": True,
            "valid": int(valid.sum()),
            "median_abs_m": round(float(np.median(differences)), 3),
            "max_abs_m": round(float(np.max(differences)), 3),
            "bias_m": round(float(np.mean(fine_values[valid] - coarse_values[valid])), 3),
        }


def _public_dsm_services() -> list[dict]:
    data = _json(f"{ARCGIS}/public", {"f": "pjson"}) or {}
    services = [
        item.get("name", "")
        for item in data.get("services", [])
        if "dsm" in item.get("name", "").lower()
    ]
    return [{"name": name} for name in sorted(services)]


def _dbtr_layers() -> dict:
    text = _text(
        WMS_DBTR,
        {"service": "WMS", "version": "1.3.0", "request": "GetCapabilities"},
    )
    if not text:
        return {"available": False}
    names_found = sorted(
        set(re.findall(r"<Name>([^<]*(?:EDI|UVL|FDA|FAB|NCV)[^<]*)</Name>", text))
    )
    return {"available": True, "layers": names_found}


def _kartaview() -> dict:
    path = RAW_DIR / "kartaview" / "coverage.json"
    if not path.exists():
        return {"available": False}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        "available": True,
        "sample_points": data.get("sample_points"),
        "photo_count": data.get("photo_count"),
        "photos_inside_bbox": data.get("photos_inside_bbox", 0),
        "points_with_photos": data.get("points_with_photos"),
    }


def _commons() -> dict:
    path = RAW_DIR / "commons" / "commons.json"
    if not path.exists():
        return {"available": False}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {"available": True, "file_count": data.get("file_count", 0)}


def _write_markdown(audit: dict) -> str:
    dtm = audit["rasters"]["dtm"]
    ortho = audit["rasters"]["ortho_rgb"]
    nir = audit["rasters"]["ortho_nir"]
    dbtr_data = audit["dbtr"]
    dbtr_layer_line = (
        f"- WMS pubblico disponibile; layer trovati: "
        f"{', '.join('`' + name + '`' for name in dbtr_data.get('layers', []))}."
        if dbtr_data.get("available")
        else "- WMS DBTR non raggiungibile."
    )
    duomo_line = (
        f"- Duomo: `H_uvl` = **{audit['dbtr_duomo'].get('height_m')} m**, "
        f"eave {audit['dbtr_duomo'].get('eave_height_m')} m, "
        f"roof {audit['dbtr_duomo'].get('roof_height_m')} m."
        if audit.get("dbtr_duomo")
        else "- Duomo: nessuna risposta UVL."
    )
    street_line = (
        f"- KartaView: {audit['street_level']['photo_count']} foto totali, "
        f"**{audit['street_level']['photos_inside_bbox']} dentro la bbox**."
        if audit["street_level"].get("available")
        else "- KartaView: coverage non disponibile."
    )
    commons_line = (
        f"- Wikimedia Commons: **{audit['commons']['file_count']}** file di riferimento."
        if audit["commons"].get("available")
        else "- Wikimedia Commons: non scaricato."
    )
    sample = audit.get("dbtr_sample") or {}
    if sample.get("matched"):
        sample_line = (
            f"- Campione di {sample.get('sample_size')} edifici: "
            f"**{sample.get('matched')}** con UVL; bias "
            f"{sample.get('bias_m')} m, MAE {sample.get('mae_m')} m, entro 3 m: "
            f"{sample.get('within_3m')}/{sample.get('matched')}."
        )
    else:
        sample_line = "- Campione DBTR non disponibile."
    remaining_prior = int(audit.get("typology_prior_remaining") or 0)
    dbtr_used = int(audit.get("dbtr_fallback_buildings") or 0)
    if dbtr_used:
        fallback_line = (
            f"- Fallback DBTR già applicato a **{dbtr_used}** edifici; restano "
            f"{remaining_prior} prior tipologiche."
        )
    else:
        fallback_line = (
            f"- Prior tipologiche residue: **{remaining_prior}**."
            if remaining_prior
            else "- Nessuna prior tipologica residua."
        )
    dtm_row = (
        "| RER 2023-24 DTM 0,5 m | **disponibile** | terreno, quote di base, "
        "mesh del viewer |"
        if dtm.get("available")
        else "| RER 2023-24 DTM 0,5 m | non verificato | — |"
    )
    ortho_row = (
        "| RER 2023-24 ortofoto 20 cm | **disponibile** | colore tetti, "
        "texture selettiva |"
        if ortho.get("available")
        else "| RER 2023-24 ortofoto 20 cm | non verificato | — |"
    )
    dsm_row = (
        "| RER 2023-24 DSM First/Last 0,5 m | **non esposto come servizio "
        "pubblico** | richiedere il dato / usare LiDAR classificato |"
        if not audit["dsm_2023_available"]
        else "| RER 2023-24 DSM First/Last 0,5 m | **disponibile** | "
        "sostituire il DSM 2008 |"
    )
    dbtr_row = (
        "| DBTR UVL (WMS) | **disponibile** | fallback altezze per edifici "
        "senza DSM |"
        if dbtr_data.get("available")
        else "| DBTR UVL (WMS) | non disponibile | — |"
    )
    street_row = (
        f"| KartaView | {audit['street_level']['photos_inside_bbox']} foto nella "
        "bbox | nessuna texture di facciata |"
    )
    if dtm.get("sample", {}).get("ok"):
        dtm_sample_line = (
            f"- Campione DTM Duomo: `{dtm['sample']['width']}×"
            f"{dtm['sample']['height']}` px, quota "
            f"{dtm['sample']['min']:.2f}–{dtm['sample']['max']:.2f} m."
        )
    else:
        dtm_sample_line = "- Campione DTM non disponibile."
    if audit["dtm_delta"].get("available"):
        dtm_delta_line = (
            f"- Differenza DTM 0,5 m vs DTM 1 m attuale: mediana "
            f"**{audit['dtm_delta'].get('median_abs_m')} m**, massimo "
            f"{audit['dtm_delta'].get('max_abs_m')} m."
        )
    else:
        dtm_delta_line = "- Confronto DTM non eseguito."
    if ortho.get("sample", {}).get("ok"):
        ortho_sample_line = (
            f"- Campione ortofoto 20 cm Duomo: `{ortho['sample']['width']}×"
            f"{ortho['sample']['height']}` px, "
            f"{ortho['sample'].get('bytes', 0) / 1e6:.1f} MB."
        )
    else:
        ortho_sample_line = "- Campione ortofoto non disponibile."
    lines = [
        "# Data audit — RER 2023-24, DBTR and street-level imagery",
        "",
        f"Generated: {audit['generated_at']}",
        "",
        "Audit tecnico della geometria e delle fonti; il fallback DBTR viene",
        "applicato separatamente e non modifica le impronte OSM.",
        "",
        "## Esito sintetico",
        "",
        "| Fonte | Disponibilità | Uso proposto |",
        "| --- | --- | --- |",
        dtm_row,
        ortho_row,
        dsm_row,
        dbtr_row,
        street_row,
        "",
        "## RER 2023-24",
        "",
        f"- DTM: pixel **{dtm.get('pixel_size_x')} m**, {dtm.get('band_count')} band, "
        f"formato {dtm.get('pixel_type')}.",
        dtm_sample_line,
        dtm_delta_line,
        f"- Ortofoto RGB: pixel nativo **{ortho.get('pixel_size_x')} m**; "
        f"NIR: pixel **{nir.get('pixel_size_x')} m**.",
        ortho_sample_line,
        "",
        "### DSM/LiDAR 2023-24",
        "",
        "Il catalogo CKAN pubblica i metadati di **DSM First/Last 0,5 m RER 2023-24**",
        "con licenza CC BY 4.0, ma nel servizio ArcGIS pubblico non compare un",
        "`ImageServer` DSM 2023-24 e il WCS pubblico espone solo il DTM.",
        "Servizi DSM trovati nel catalogo ArcGIS pubblico:",
        "",
    ]
    if audit["dsm_candidates"]:
        lines += [f"- `{item['name']}`" for item in audit["dsm_candidates"]]
    else:
        lines.append("- nessun servizio DSM nel catalogo pubblico.")
    lines += [
        "",
        "Conclusione: per ottenere un DSM same-epoch serve una **richiesta",
        "all'Archivio Cartografico** oppure il download dei prodotti LiDAR",
        "classificati. Fino ad allora il DSM AGEA 2008 resta la fonte misurata,",
        "con l'incertezza cross-epoch già dichiarata.",
        "",
        "## DBTR",
        "",
        dbtr_layer_line,
        duomo_line,
        sample_line,
        "",
        "Il DBTR è utile come **fallback qualitativo** per gli edifici senza",
        "campioni DSM, non come sostituto delle altezze misurate. Il download",
        "geometrico completo richiede autenticazione o richiesta all'Archivio",
        "Cartografico; il WMS è pubblico.",
        fallback_line,
        "",
        "## Street-level",
        "",
        street_line,
        commons_line,
        "",
        "## Prossimi passi consigliati",
        "",
        "1. **Richiedere DSM First/Last 0,5 m o LAS classificato RER 2023-24**",
        "   all'Archivio Cartografico, limitando la richiesta alla bbox di Fidenza.",
        "2. Nel frattempo usare **DTM 0,5 m** per le quote di base e il terreno,",
        "   e l'**ortofoto 20 cm** per il colore dei tetti e i landmark.",
        "3. Abilitare il **fallback DBTR UVL** per gli edifici senza DSM.",
        "4. Verificare Mapillary/Panoramax: se non c'è copertura, organizzare una",
        "   cattura Panoramax del centro storico prima di promettere facciate reali.",
        "",
        "## Licenze",
        "",
        "- RER DTM/ortofoto/DSM: **CC BY 4.0**.",
        "- DBTR: **CC BY 4.0**.",
        "- OpenStreetMap: **ODbL 1.0**.",
        "- KartaView: per-sequence, da verificare.",
        "- Wikimedia Commons: per-file.",
        "",
    ]
    return "\n".join(lines)


def generate(config: AppConfig) -> dict[str, Path]:
    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    origin_x, origin_y = ctx.origin_metric
    bbox = (origin_x - 250, origin_y - 250, origin_x + 250, origin_y + 250)
    audit_dir = RAW_DIR / "audit"
    audit_dir.mkdir(parents=True, exist_ok=True)

    dtm = _image_meta("DtmRER2023_24")
    if dtm.get("available"):
        dtm["sample"] = _export_sample(
            "DtmRER2023_24",
            bbox,
            1000,
            1000,
            audit_dir / "dtm_duomo_05.tif",
            pixel_type="F32",
        )
    ortho = _image_meta("RER2023_24_RGB")
    if ortho.get("available"):
        ortho["sample"] = _export_sample(
            "RER2023_24_RGB",
            bbox,
            2500,
            2500,
            audit_dir / "ortho_duomo_02.tif",
        )
    nir = _image_meta("RER2023_24_NIR")
    dsm = _image_meta("DsmAgea2008")
    dsm_candidates = _public_dsm_services()

    dbtr_layers = _dbtr_layers()
    duomo_x, duomo_y = origin_x, origin_y
    duomo_info = dbtr.query_building(duomo_x, duomo_y)
    dbtr_stats = dbtr.sample(config, limit=60) if dbtr_layers.get("available") else {}

    audit = {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "bbox_metric": bbox,
        "height_sources": {},
        "typology_prior_remaining": 0,
        "dbtr_fallback_buildings": 0,
        "rasters": {
            "dtm": dtm,
            "ortho_rgb": ortho,
            "ortho_nir": nir,
            "dsm_2008": dsm,
        },
        "dsm_2023_available": False,
        "dsm_candidates": dsm_candidates,
        "dtm_delta": _dtm_delta(
            RAW_DIR / "rer" / "dtm_rer2023_24.tif",
            audit_dir / "dtm_duomo_05.tif",
            bbox,
        ),
        "dbtr": dbtr_layers,
        "dbtr_duomo": duomo_info,
        "dbtr_sample": dbtr_stats,
        "street_level": _kartaview(),
        "commons": _commons(),
        "licenses": {
            "rer": "CC BY 4.0",
            "dbtr": "CC BY 4.0",
            "osm": "ODbL 1.0",
            "kartaview": "per-sequence (verify)",
            "commons": "per-file",
        },
    }
    heights_path = PROCESSED_DIR / "heights.json"
    if heights_path.exists():
        heights = json.loads(heights_path.read_text(encoding="utf-8"))
        sources: dict[str, int] = {}
        for record in heights.values():
            source = record.get("height_source") or "unknown"
            sources[source] = sources.get(source, 0) + 1
        audit["height_sources"] = sources
        audit["typology_prior_remaining"] = sources.get("typology_prior", 0)
        audit["dbtr_fallback_buildings"] = sources.get("dbtr_uvl_2008", 0)

    (PROCESSED_DIR / "audit.json").write_text(
        json.dumps(audit, indent=2), encoding="utf-8"
    )
    report = DOCS_DIR / "DATA_AUDIT_2023_24.md"
    report.write_text(_write_markdown(audit), encoding="utf-8")
    return {"audit_json": PROCESSED_DIR / "audit.json", "audit_report": report}
