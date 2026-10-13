#!/usr/bin/env python3
"""Genera apple-touch-icon.png (180x180) per Snap PWA.

iOS ignora le icone SVG del manifest e richiede un PNG: questo script lo
produce con la stessa grafica di icons/icon-192.svg (fantasma giallo su fondo
scuro). Va eseguito una sola volta:

    python3 snap-pwa/scripts/make_apple_icon.py
"""
import os

from PIL import Image, ImageDraw

SIZE = 180
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "apple-touch-icon.png")

BG = (16, 16, 20, 255)
YELLOW = (255, 252, 0, 255)
DARK = (16, 16, 20, 255)
RING = (140, 136, 92, 255)  # giallo scurito per l'anello decorativo
SS = 4  # supersampling


def build():
    img = Image.new("RGBA", (SIZE * SS, SIZE * SS), BG)
    d = ImageDraw.Draw(img)
    s = SS
    cx = cy = SIZE * s / 2

    # Anello decorativo (come nell'SVG).
    r = 63 * s
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=RING, width=2 * s)

    # Fantasma: semicerchio superiore + fondo ondulato.
    body_w = body_h = 34 * s
    left, right = cx - body_w, cx + body_w
    top, bottom = cy - body_h, cy + body_h
    d.pieslice([left, top - body_h, right, top + body_h], 180, 360, fill=YELLOW)
    d.rectangle([left, top, right, bottom], fill=YELLOW)
    steps = [right - i * (2 * body_w) / 4.0 for i in range(1, 5)]
    waves = [(right, bottom)]
    for i, x in enumerate(steps):
        waves.append((x, bottom - (9 * s if i % 2 == 0 else 0)))
    waves.append((left, bottom))
    d.polygon(waves, fill=YELLOW)

    # Occhi e sorriso.
    eye_r = 6 * s
    for dx in (-12 * s, 12 * s):
        d.ellipse([cx + dx - eye_r, cy - 24 * s - eye_r, cx + dx + eye_r, cy - 24 * s + eye_r], fill=DARK)
    d.arc([cx - 11 * s, cy - 10 * s, cx + 11 * s, cy + 4 * s], 20, 160, fill=DARK, width=5 * s)

    # Scintilla in alto a destra.
    sx, sy = 148 * s, 44 * s
    d.polygon(
        [
            (sx, sy - 8 * s), (sx + 3 * s, sy - 3 * s), (sx + 8 * s, sy), (sx + 3 * s, sy + 3 * s),
            (sx, sy + 8 * s), (sx - 3 * s, sy + 3 * s), (sx - 8 * s, sy), (sx - 3 * s, sy - 3 * s),
        ],
        fill=YELLOW,
    )

    return img.resize((SIZE, SIZE), Image.LANCZOS)


if __name__ == "__main__":
    build().save(OUT, "PNG", optimize=True)
    print("scritto", OUT)
