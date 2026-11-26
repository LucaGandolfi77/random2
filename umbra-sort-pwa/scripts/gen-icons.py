#!/usr/bin/env python3
"""Generate Umbra Sort PNG icons with the Python standard library only."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "icons"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xffffffff)


def rounded_rect(x, y, w, h, radius):
    x0, y0, x1, y1 = x, y, x + w, y + h
    cx0, cx1, cy0, cy1 = x0 + radius, x1 - radius, y0 + radius, y1 - radius
    for py in range(max(0, math.floor(y0)), min(HEIGHT, math.ceil(y1))):
        for px in range(max(0, math.floor(x0)), min(WIDTH, math.ceil(x1))):
            qx = max(cx0 - px, 0, px - cx1)
            qy = max(cy0 - py, 0, py - cy1)
            if qx * qx + qy * qy <= radius * radius:
                yield px, py


def blend(px, py, color, alpha=1.0):
    if not (0 <= px < WIDTH and 0 <= py < HEIGHT):
        return
    i = (py * WIDTH + px) * 4
    a = alpha if len(color) == 3 else color[3] / 255
    src = color[:3]
    dst = pixels[i:i + 3]
    dst_a = pixels[i + 3] / 255
    out_a = a + dst_a * (1 - a)
    if out_a <= 0:
        return
    for c in range(3):
        pixels[i + c] = round((src[c] * a + dst[c] * dst_a * (1 - a)) / out_a)
    pixels[i + 3] = round(out_a * 255)


def rect(x, y, w, h, radius, color, alpha=1.0):
    for px, py in rounded_rect(x, y, w, h, radius):
        blend(px, py, color, alpha)


def circle(cx, cy, r, color, alpha=1.0):
    for py in range(max(0, math.floor(cy - r)), min(HEIGHT, math.ceil(cy + r) + 1)):
        for px in range(max(0, math.floor(cx - r)), min(WIDTH, math.ceil(cx + r) + 1)):
            if (px - cx) ** 2 + (py - cy) ** 2 <= r * r:
                blend(px, py, color, alpha)


def triangle(cx, cy, size, color):
    for py in range(math.floor(cy - size), math.ceil(cy + size) + 1):
        half = size * (1 - (py - (cy - size)) / (size * 2))
        for px in range(math.floor(cx - half), math.ceil(cx + half) + 1):
            blend(px, py, color)


def make_icon(size, maskable=False, apple=False):
    global WIDTH, HEIGHT, pixels
    WIDTH = HEIGHT = size
    pixels = bytearray(WIDTH * HEIGHT * 4)
    scale = size / 512
    radius = 0 if maskable else size * (0.22 if not apple else 0.18)
    top = (23, 35, 58)
    bottom = (6, 9, 18)
    for py in range(HEIGHT):
        t = py / max(1, HEIGHT - 1)
        color = tuple(round(top[c] * (1 - t) + bottom[c] * t) for c in range(3))
        for px in range(WIDTH):
            if radius and ((px - radius) ** 2 + (py - radius) ** 2 > radius * radius and
                           (px - (WIDTH - radius)) ** 2 + (py - radius) ** 2 > radius * radius and
                           (px - radius) ** 2 + (py - (HEIGHT - radius)) ** 2 > radius * radius and
                           (px - (WIDTH - radius)) ** 2 + (py - (HEIGHT - radius)) ** 2 > radius * radius and
                           not (radius <= px < WIDTH - radius or radius <= py < HEIGHT - radius)):
                continue
            blend(px, py, color)
    if not maskable:
        rect(size * .10, size * .10, size * .80, size * .80, size * .16, (43, 59, 85), .55)
    # Three original luminous blocks.
    blocks = [
        (124, 90, 104, 264, (244, 167, 181)),
        (242, 58, 104, 296, (247, 227, 161)),
        (360, 110, 104, 244, (168, 230, 207)),
    ]
    for x, y, w, h, color in blocks:
        rect(x * scale, y * scale, w * scale, h * scale, 28 * scale, color)
        rect((x + 12) * scale, (y + 12) * scale, (w - 24) * scale, 10 * scale, 5 * scale, (255, 255, 255), .24)
    circle(176 * scale, 180 * scale, 17 * scale, (9, 16, 28), .82)
    triangle(294 * scale, 162 * scale, 30 * scale, (9, 16, 28))
    rect(384 * scale, 164 * scale, 40 * scale, 40 * scale, 6 * scale, (9, 16, 28), .82)
    circle(256 * scale, 414 * scale, 12 * scale, (168, 230, 207))

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
