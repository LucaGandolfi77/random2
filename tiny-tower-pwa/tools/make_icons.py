#!/usr/bin/env python3
"""Genera le icone PNG di Mini Tower (pixel-art: torre di notte).
Solo librerie standard: niente PIL, PNG scritto manualmente con zlib."""
import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "icons"

BG        = (28, 43, 77, 255)        # blu notte
STAR      = (255, 255, 255, 210)
BUILD     = (242, 227, 201, 255)     # crema
BUILD_S   = (230, 211, 179, 255)     # edifici laterali
ROOF      = (217, 85, 107, 255)      # corallo
WIN_LIT   = (255, 215, 94, 255)      # finestre accese
WIN_DARK  = (53, 80, 124, 255)
DOOR      = (124, 74, 45, 255)
GROUND    = (76, 175, 109, 255)
GROUND_D  = (58, 143, 87, 255)
ANT       = (214, 218, 228, 255)


def make_icon(size: int, rounded: bool) -> bytes:
    u = size / 512.0
    px = bytearray(size * size * 4)

    def set_px(x, y, c):
        if 0 <= x < size and 0 <= y < size:
            o = (y * size + x) * 4
            px[o:o + 4] = bytes(c)

    def rect(x0, y0, x1, y1, c):
        for y in range(int(y0 * u), int(y1 * u)):
            for x in range(int(x0 * u), int(x1 * u)):
                set_px(x, y, c)

    def circle(cx, cy, r, c):
        for y in range(int((cy - r) * u), int((cy + r) * u) + 1):
            for x in range(int((cx - r) * u), int((cx + r) * u) + 1):
                fx, fy = x / u, y / u
                if (fx - cx) ** 2 + (fy - cy) ** 2 <= r * r:
                    set_px(x, y, c)

    # sfondo
    rect(0, 0, 512, 512, BG)
    # stelle
    for sx, sy in [(60, 60), (120, 40), (210, 52), (330, 40), (420, 70), (460, 140), (40, 150), (380, 100)]:
        circle(sx, sy, 3, STAR)
    # terreno
    rect(0, 432, 512, 456, GROUND)
    rect(0, 456, 512, 512, GROUND_D)
    # edifici laterali
    rect(118, 300, 176, 432, BUILD_S)
    rect(336, 264, 394, 432, BUILD_S)
    for row in range(4):
        for col in range(2):
            c = WIN_LIT if (row + col) % 2 == 0 else WIN_DARK
            rect(128 + col * 22, 312 + row * 26, 142 + col * 22, 330 + row * 26, c)
            rect(346 + col * 22, 276 + row * 26, 360 + col * 22, 294 + row * 26, c)
    # antenna + palla
    rect(250, 100, 262, 140, ANT)
    circle(256, 94, 9, ANT)
    # torre principale
    rect(176, 152, 336, 432, BUILD)
    rect(168, 136, 344, 152, ROOF)
    # finestre 3x4
    for row in range(4):
        for col in range(3):
            c = WIN_LIT if (row * 3 + col) % 3 != 0 else WIN_DARK
            rect(190 + col * 44, 164 + row * 44, 218 + col * 44, 194 + row * 44, c)
    # porta
    rect(234, 370, 278, 432, DOOR)

    # angoli arrotondati (solo icona "any")
    if rounded:
        R = int(110 * u)
        for y in range(R):
            for x in range(R):
                if (R - x) ** 2 + (R - y) ** 2 > R * R:
                    for cx, cy in [(x, y), (size - 1 - x, y), (x, size - 1 - y), (size - 1 - x, size - 1 - y)]:
                        o = (cy * size + cx) * 4
                        px[o + 3] = 0

    # codifica PNG
    raw = b"".join(b"\x00" + bytes(px[y * size * 4:(y + 1) * size * 4]) for y in range(size))

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", ihdr)
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))


OUT.mkdir(exist_ok=True)
(OUT / "icon-192.png").write_bytes(make_icon(192, True))
(OUT / "icon-512.png").write_bytes(make_icon(512, True))
(OUT / "icon-maskable-512.png").write_bytes(make_icon(512, False))
print("icone generate in", OUT)
