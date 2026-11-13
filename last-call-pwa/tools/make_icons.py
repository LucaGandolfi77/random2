#!/usr/bin/env python3
"""Generate LAST CALL's SVG and PNG icon set from one vector scene.

Run from anywhere:

    python3 last-call-pwa/tools/make_icons.py

The SVG files are the source of truth. PNGs are rasterised with the first
converter available on the machine: macOS `sips`, `rsvg-convert`, or the
optional Python `cairosvg` module. Only the standard library is imported here;
the converters are external tools and are never needed at runtime.
"""
from __future__ import annotations

import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ICONS = ROOT / "icons"

GOLD = "url(#gold)"
PINK = "url(#pink)"
CYAN = "url(#cyan)"


def icon_defs() -> str:
    return """
    <defs>
      <radialGradient id="bg" cx="50%" cy="42%" r="78%">
        <stop offset="0" stop-color="#32123d"/>
        <stop offset="0.46" stop-color="#170a24"/>
        <stop offset="1" stop-color="#05030a"/>
      </radialGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff4c9"/>
        <stop offset="0.45" stop-color="#e7bd6b"/>
        <stop offset="1" stop-color="#a86f28"/>
      </linearGradient>
      <linearGradient id="pink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffb3dd"/>
        <stop offset="0.48" stop-color="#ff5fa8"/>
        <stop offset="1" stop-color="#d61f72"/>
      </linearGradient>
      <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#f5ffff"/>
        <stop offset="0.55" stop-color="#a9f6ff"/>
        <stop offset="1" stop-color="#37c8df"/>
      </linearGradient>
      <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ff9bcf"/>
        <stop offset="0.65" stop-color="#ff4b99"/>
        <stop offset="1" stop-color="#9b1d5c"/>
      </linearGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="8" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="softglow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="16"/>
      </filter>
      <clipPath id="bowl">
        <path d="M146 188 L366 188 L276 306 Q256 324 236 306 Z"/>
      </clipPath>
    </defs>"""


def icon_art(scale: float = 1.0) -> str:
    """The reusable neon scene, centred on 256,256 and optionally scaled."""
    rays = []
    for i in range(16):
        angle = math.radians(i * 22.5)
        x1 = 256 + math.cos(angle) * 94
        y1 = 238 + math.sin(angle) * 94
        x2 = 256 + math.cos(angle) * 208
        y2 = 238 + math.sin(angle) * 208
        rays.append(
            f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{GOLD}" stroke-opacity=".17" stroke-width="2"/>'
        )
    return f"""
  <g transform="translate(256 256) scale({scale}) translate(-256 -256)">
    <g>{"".join(rays)}</g>

    <!-- deco arch -->
    <path d="M88 414 L88 252 A168 168 0 0 1 424 252 L424 414"
          fill="none" stroke="{GOLD}" stroke-width="6" stroke-linecap="square"/>
    <path d="M114 402 L114 256 A142 142 0 0 1 398 256 L398 402"
          fill="none" stroke="{GOLD}" stroke-opacity=".52" stroke-width="2"/>
    <path d="M134 392 L134 260 A122 122 0 0 1 378 260 L378 392"
          fill="none" stroke="{GOLD}" stroke-opacity=".22" stroke-width="1.5"
          stroke-dasharray="3 9"/>

    <!-- deco base -->
    <path d="M148 424 L364 424" stroke="{GOLD}" stroke-width="4"/>
    <path d="M180 436 L332 436" stroke="{GOLD}" stroke-opacity=".55" stroke-width="2"/>
    <path d="M256 411 L266 421 L256 431 L246 421 Z" fill="{GOLD}" opacity=".9"/>

    <!-- sparkles -->
    <g fill="{CYAN}" filter="url(#glow)">
      <path d="M126 138 L130 151 L143 155 L130 159 L126 172 L122 159 L109 155 L122 151 Z" opacity=".9"/>
      <path d="M388 166 L391 175 L400 178 L391 181 L388 190 L385 181 L376 178 L385 175 Z" opacity=".75"/>
    </g>
    <circle cx="150" cy="108" r="2.6" fill="#ffe9a8" opacity=".8"/>
    <circle cx="360" cy="112" r="2" fill="#ffe9a8" opacity=".65"/>
    <circle cx="304" cy="96" r="1.6" fill="#ffb6dc" opacity=".8"/>

    <!-- glass body -->
    <g filter="url(#glow)">
      <path d="M146 188 L366 188 L276 306 Q256 324 236 306 Z"
            fill="#0c2630" fill-opacity=".38" stroke="{CYAN}" stroke-width="5"
            stroke-linejoin="round"/>
    </g>
    <path d="M146 188 L366 188 L276 306 Q256 324 236 306 Z"
          fill="none" stroke="{CYAN}" stroke-opacity=".42" stroke-width="12"/>

    <!-- drink -->
    <g clip-path="url(#bowl)">
      <path d="M162 198 L350 198 L266 300 Q256 310 246 300 Z"
            fill="url(#liquid)" opacity=".96"/>
      <path d="M176 202 L248 202 L238 286 Q232 296 226 286 Z"
            fill="#ffffff" opacity=".18"/>
      <path d="M174 206 L338 206" stroke="#ffd8ec" stroke-opacity=".55" stroke-width="2"/>
    </g>

    <!-- rim -->
    <path d="M142 185 L370 185" stroke="{CYAN}" stroke-width="8" stroke-linecap="round"/>
    <path d="M150 181 L362 181" stroke="#ffffff" stroke-opacity=".7" stroke-width="2"/>

    <!-- stem + foot -->
    <path d="M256 309 L256 385" stroke="{CYAN}" stroke-width="7" stroke-linecap="round"/>
    <path d="M205 400 L307 400" stroke="{CYAN}" stroke-width="8" stroke-linecap="round"/>
    <path d="M219 389 Q256 377 293 389" fill="none" stroke="{GOLD}"
          stroke-opacity=".65" stroke-width="2"/>

    <!-- garnish: lime wheel on a gold pick -->
    <path d="M292 231 L345 170" stroke="{GOLD}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="293" cy="231" r="22" fill="#0e2d1d" stroke="#baff77" stroke-width="4"/>
    <circle cx="293" cy="231" r="13" fill="none" stroke="#baff77" stroke-opacity=".7" stroke-width="2"/>
    <path d="M293 209 L293 253 M271 231 L315 231" stroke="#baff77" stroke-opacity=".42" stroke-width="1.6"/>
    <circle cx="293" cy="231" r="4" fill="#f5ffd8"/>

    <!-- bubbles -->
    <g fill="none" stroke="#c9fbff" stroke-width="2" opacity=".8">
      <circle cx="232" cy="248" r="4"/>
      <circle cx="278" cy="266" r="3"/>
      <circle cx="254" cy="280" r="2.4"/>
      <circle cx="214" cy="222" r="2"/>
    </g>

    <!-- two neon side ticks -->
    <path d="M104 330 L104 380" stroke="{PINK}" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    <path d="M408 330 L408 380" stroke="{PINK}" stroke-width="4" stroke-linecap="round" opacity=".9"/>
  </g>"""


def icon_svg(size: int, maskable: bool = False) -> str:
    if maskable:
        shape = f'<rect width="512" height="512" fill="url(#bg)"/>'
        art = icon_art(0.78)
    else:
        shape = (
            f'<rect width="512" height="512" rx="112" fill="url(#bg)"/>'
            f'<rect x="19" y="19" width="474" height="474" rx="97" fill="none" '
            f'stroke="{GOLD}" stroke-opacity=".32" stroke-width="2"/>'
        )
        art = icon_art(1.0)
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512">
{icon_defs()}
  {shape}
  {art}
</svg>
"""


def og_svg() -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="68%" cy="46%" r="78%">
      <stop offset="0" stop-color="#31103d"/>
      <stop offset="0.48" stop-color="#160a23"/>
      <stop offset="1" stop-color="#05030a"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff4c9"/>
      <stop offset="0.45" stop-color="#e7bd6b"/>
      <stop offset="1" stop-color="#a86f28"/>
    </linearGradient>
    <linearGradient id="pink" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffb3dd"/>
      <stop offset="1" stop-color="#d61f72"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f5ffff"/>
      <stop offset="0.55" stop-color="#a9f6ff"/>
      <stop offset="1" stop-color="#37c8df"/>
    </linearGradient>
    <linearGradient id="liquid" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff9bcf"/>
      <stop offset="0.65" stop-color="#ff4b99"/>
      <stop offset="1" stop-color="#9b1d5c"/>
    </linearGradient>
    <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="bowl">
      <path d="M730 236 L1010 236 L896 402 Q868 426 840 402 Z"/>
    </clipPath>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity=".2" stroke="url(#gold)" stroke-width="1">
    <path d="M0 78 L1200 78"/><path d="M0 92 L1200 92"/>
    <path d="M0 538 L1200 538"/><path d="M0 552 L1200 552"/>
  </g>

  <!-- sunburst behind the glass -->
  <g opacity=".13" stroke="url(#gold)" stroke-width="2">
    {"".join(
        f'<line x1="868" y1="308" x2="{868 + 460 * math.cos(math.radians(i * 30)):.0f}" '
        f'y2="{308 + 460 * math.sin(math.radians(i * 30)):.0f}"/>'
        for i in range(12)
    )}
  </g>
  <circle cx="868" cy="308" r="238" fill="none" stroke="url(#gold)" stroke-opacity=".35" stroke-width="2"/>
  <circle cx="868" cy="308" r="218" fill="none" stroke="url(#gold)" stroke-opacity=".16" stroke-width="1" stroke-dasharray="4 10"/>

  <!-- text block -->
  <text x="86" y="134" fill="#e7bd6b" font-family="Optima, 'Avenir Next', sans-serif"
        font-size="18" letter-spacing="7">A NEON ART-DECO CARD BATTLER</text>
  <text x="82" y="286" fill="url(#gold)" font-family="Didot, 'Bodoni 72', Georgia, serif"
        font-size="148" font-weight="700" letter-spacing="6">LAST</text>
  <text x="82" y="416" fill="url(#gold)" font-family="Didot, 'Bodoni 72', Georgia, serif"
        font-size="148" font-weight="700" letter-spacing="6">CALL</text>
  <path d="M88 448 L652 448" stroke="url(#gold)" stroke-width="2" stroke-opacity=".65"/>
  <path d="M88 460 L494 460" stroke="url(#gold)" stroke-width="1" stroke-opacity=".3"/>

  <text x="88" y="508" fill="#f6eaff" font-family="Optima, 'Avenir Next', sans-serif"
        font-size="26" letter-spacing="3">COCKTAILS · WINE · BEER · SPIRITS</text>
  <text x="88" y="544" fill="#b9a6c8" font-family="Georgia, serif"
        font-size="20">Build a deck. Defend your bar. Win the city.</text>

  <g font-family="Optima, 'Avenir Next', sans-serif" font-size="15" letter-spacing="3">
    <rect x="88" y="574" width="112" height="34" rx="17" fill="none" stroke="#e7bd6b" stroke-opacity=".55"/>
    <text x="144" y="596" text-anchor="middle" fill="#ffdf9a">FREE</text>
    <rect x="214" y="574" width="126" height="34" rx="17" fill="none" stroke="#e7bd6b" stroke-opacity=".55"/>
    <text x="277" y="596" text-anchor="middle" fill="#ffdf9a">OFFLINE</text>
    <rect x="354" y="574" width="86" height="34" rx="17" fill="none" stroke="#e7bd6b" stroke-opacity=".55"/>
    <text x="397" y="596" text-anchor="middle" fill="#ffdf9a">PWA</text>
  </g>

  <!-- the glass -->
  <g filter="url(#glow)">
    <path d="M726 232 L1014 232 L892 408 Q868 432 844 408 Z"
          fill="#0c2630" fill-opacity=".42" stroke="url(#cyan)" stroke-width="7"
          stroke-linejoin="round"/>
  </g>
  <g clip-path="url(#bowl)">
    <path d="M748 244 L992 244 L894 402 Q868 422 846 402 Z" fill="url(#liquid)"/>
    <path d="M770 250 L876 250 L858 382 Q846 396 834 382 Z" fill="#ffffff" opacity=".18"/>
  </g>
  <path d="M718 226 L1022 226" stroke="url(#cyan)" stroke-width="11" stroke-linecap="round"/>
  <path d="M868 414 L868 516" stroke="url(#cyan)" stroke-width="9" stroke-linecap="round"/>
  <path d="M796 536 L940 536" stroke="url(#cyan)" stroke-width="11" stroke-linecap="round"/>

  <path d="M916 292 L984 212" stroke="url(#gold)" stroke-width="5" stroke-linecap="round"/>
  <circle cx="916" cy="292" r="28" fill="#0e2d1d" stroke="#baff77" stroke-width="5"/>
  <circle cx="916" cy="292" r="17" fill="none" stroke="#baff77" stroke-opacity=".7" stroke-width="2"/>
  <path d="M916 264 L916 320 M888 292 L944 292" stroke="#baff77" stroke-opacity=".42" stroke-width="2"/>

  <g fill="{CYAN}" filter="url(#glow)">
    <path d="M700 160 L706 178 L724 184 L706 190 L700 208 L694 190 L676 184 L694 178 Z" opacity=".9"/>
    <path d="M1054 352 L1059 366 L1073 371 L1059 376 L1054 390 L1049 376 L1035 371 L1049 366 Z" opacity=".8"/>
  </g>
  <g fill="none" stroke="#c9fbff" stroke-width="3" opacity=".75">
    <circle cx="812" cy="304" r="6"/><circle cx="874" cy="336" r="4.5"/>
    <circle cx="840" cy="366" r="3.2"/><circle cx="782" cy="272" r="3"/>
  </g>
</svg>
"""


def run(cmd: list[str]) -> bool:
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def rasterize(svg: Path, png: Path, width: int, height: int) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_png = Path(tmp) / "render.png"
        if shutil.which("sips") and run(["sips", "-s", "format", "png", str(svg), "--out", str(tmp_png)]):
            if run(["sips", "-z", str(height), str(width), str(tmp_png)]):
                shutil.copyfile(tmp_png, png)
                return
        if shutil.which("rsvg-convert") and run(
            ["rsvg-convert", "-w", str(width), "-h", str(height), "-o", str(tmp_png), str(svg)]
        ):
            shutil.copyfile(tmp_png, png)
            return
        try:
            import cairosvg  # type: ignore
        except ImportError:
            cairosvg = None
        if cairosvg is not None:
            cairosvg.svg2png(url=str(svg), write_to=str(png), output_width=width, output_height=height)
            return
    raise SystemExit(
        "No SVG rasteriser found. Install librsvg (`rsvg-convert`) or cairosvg, "
        "or open the SVGs and export the PNGs by hand."
    )


def main() -> int:
    ICONS.mkdir(parents=True, exist_ok=True)

    variants = [
        ("icon-192.svg", icon_svg(192), 192, 192),
        ("icon-512.svg", icon_svg(512), 512, 512),
        ("icon-512-maskable.svg", icon_svg(512, maskable=True), 512, 512),
    ]
    for name, svg, _, _ in variants:
        (ICONS / name).write_text(svg, encoding="utf-8")

    cover = og_svg()
    (ICONS / "og-cover.svg").write_text(cover, encoding="utf-8")

    for name, _, width, height in variants:
        png_name = name.replace(".svg", ".png")
        rasterize(ICONS / name, ICONS / png_name, width, height)
        print(f"wrote icons/{png_name}")

    rasterize(ICONS / "og-cover.svg", ICONS / "og-cover.png", 1200, 630)
    print("wrote icons/og-cover.png")
    return 0


if __name__ == "__main__":
    sys.exit(main())