#!/usr/bin/env python3
"""Generate Vial Garden PNG icons with the Python standard library only."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "icons"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def blend(px, py, color, alpha=1.0):
    if not (0 <= px < WIDTH and 0 <= py < HEIGHT):
        return
    i = (py * WIDTH + px) * 4
    src = color[:3]
    dst = pixels[i:i + 3]
    dst_a = pixels[i + 3] / 255
    out_a = alpha + dst_a * (1 - alpha)
    if out_a <= 0:
        return
    for c in range(3):
        pixels[i + c] = round((src[c] * alpha + dst[c] * dst_a * (1 - alpha)) / out_a)
    pixels[i + 3] = round(out_a * 255)


def rounded_rect(x, y, w, h, radius, color, alpha=1.0):
    x0, y0, x1, y1 = x, y, x + w, y + h
    cx0, cx1, cy0, cy1 = x0 + radius, x1 - radius, y0 + radius, y1 - radius
    for py in range(max(0, math.floor(y0)), min(HEIGHT, math.ceil(y1))):
        for px in range(max(0, math.floor(x0)), min(WIDTH, math.ceil(x1))):
            qx = max(cx0 - px, 0, px - cx1)
            qy = max(cy0 - py, 0, py - cy1)
            if qx * qx + qy * qy <= radius * radius:
                blend(px, py, color, alpha)


def make_icon(size, maskable=False, apple=False):
    global WIDTH, HEIGHT, pixels
    WIDTH = HEIGHT = size
    pixels = bytearray(WIDTH * HEIGHT * 4)
    scale = size / 512
    radius = 0 if maskable else size * (0.22 if not apple else 0.18)
    for py in range(HEIGHT):
        t = py / max(1, HEIGHT - 1)
        color = (round(24 * (1 - t) + 6 * t), round(34 * (1 - t) + 9 * t), round(56 * (1 - t) + 18 * t))
        for px in range(WIDTH):
            if radius:
                inside = radius <= px < WIDTH - radius or radius <= py < HEIGHT - radius
                corners = [
                    (px - radius) ** 2 + (py - radius) ** 2,
                    (px - (WIDTH - radius)) ** 2 + (py - radius) ** 2,
                    (px - radius) ** 2 + (py - (HEIGHT - radius)) ** 2,
                    (px - (WIDTH - radius)) ** 2 + (py - (HEIGHT - radius)) ** 2,
                ]
                if not inside and min(corners) > radius * radius:
                    continue
            blend(px, py, color)

    vials = [
        (-150, -150, 92, 260, [(244, 167, 181), (244, 167, 181), (247, 227, 161)]),
        (-38, -174, 92, 284, [(168, 230, 207), (168, 230, 207), (169, 201, 245)]),
        (74, -128, 92, 238, [(213, 185, 236), (169, 201, 245)]),
    ]
    for x, y, w, h, liquids in vials:
        rounded_rect((256 + x) * scale, (252 + y) * scale, w * scale, h * scale, 26 * scale, (220, 232, 247), 0.16)
        segment = h / 4
        for i, color in enumerate(liquids):
            sy = y + h - (i + 1) * segment
            rounded_rect((256 + x + 5) * scale, (252 + sy) * scale, (w - 10) * scale, (segment + 1) * scale, 12 * scale, color)
        rounded_rect((256 + x) * scale, (252 + y) * scale, w * scale, h * scale, 26 * scale, (220, 232, 247), 0.0)

    raw = b"".join(b"\x00" + bytes(pixels[y * WIDTH * 4:(y + 1) * WIDTH * 4]) for y in range(HEIGHT))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    return png


ROOT.mkdir(parents=True, exist_ok=True)
for name, size, maskable, apple in [
    ("icon-192.png", 192, False, False),
    ("icon-512.png", 512, False, False),
    ("icon-maskable-512.png", 512, True, False),
    ("apple-touch-icon.png", 180, False, True),
]:
    (ROOT / name).write_bytes(make_icon(size, maskable, apple))
    print(f"wrote {name}")
