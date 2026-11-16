#!/usr/bin/env python3
"""Generate Deep Orbit PNG icons with no third-party dependencies.

Draws into an RGBA byte buffer and writes PNGs with zlib + struct. The art
mirrors icons/icon-512.svg (orbit ring + arrow ship on a deep-space gradient).
"""
import math
import os
import struct
import zlib

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(HERE, "icons")


def write_png(path, size, pixels):
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw.extend(pixels[y * stride:(y + 1) * stride])

    def chunk(kind, data):
        c = struct.pack(">I", len(data)) + kind + data
        return c + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def blend(pixels, size, x, y, color, alpha):
    if x < 0 or y < 0 or x >= size or y >= size or alpha <= 0:
        return
    i = (y * size + x) * 4
    a = min(1.0, alpha)
    for c in range(3):
        pixels[i + c] = int(pixels[i + c] * (1 - a) + color[c] * a)
    pixels[i + 3] = max(pixels[i + 3], int(255 * a))


def point_in_triangle(px, py, a, b, c):
    def sign(p1, p2, p3):
        return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
    d1 = sign((px, py), a, b)
    d2 = sign((px, py), b, c)
    d3 = sign((px, py), c, a)
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def draw(size, maskable=False):
    pixels = bytearray(size * size * 4)
    cx = cy = size / 2
    pad = 0.86 if maskable else 1.0
    bg_inner = (13, 50, 68)
    bg_outer = (3, 9, 18)

    # Radial background + rounded-square alpha mask.
    radius = size * 0.49 * (1.0 if maskable else 1.0)
    corner = size * 0.18
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.hypot(dx, dy) / (size * 0.72)
            t = min(1.0, dist)
            color = tuple(int(bg_inner[c] * (1 - t) + bg_outer[c] * t) for c in range(3))
            # rounded rect mask
            qx = max(abs(dx) - (size / 2 - corner), 0)
            qy = max(abs(dy) - (size / 2 - corner), 0)
            if math.hypot(qx, qy) > corner:
                continue
            blend(pixels, size, x, y, color, 1.0)

    # Orbit rings.
    def ring(r, width, alpha, dash=None):
        for y in range(size):
            for x in range(size):
                d = math.hypot(x - cx, y - cy)
                if abs(d - r) <= width:
                    if dash:
                        ang = math.atan2(y - cy, x - cx)
                        if (ang % dash) > dash * 0.6:
                            continue
                    blend(pixels, size, x, y, (92, 225, 230), alpha)

    ring(size * 0.325 * pad, size * 0.012, 0.55, dash=1.1)
    ring(size * 0.40 * pad, size * 0.006, 0.22)

    # Ship (nose up).
    nose = (cx, cy - size * 0.30 * pad)
    tip_r = (cx + size * 0.19 * pad, cy + size * 0.27 * pad)
    inner = (cx, cy + size * 0.15 * pad)
    tip_l = (cx - size * 0.19 * pad, cy + size * 0.27 * pad)

    # Glow pass.
    for y in range(size):
        for x in range(size):
            if point_in_triangle(x, y,
                                 (cx, cy - size * 0.33 * pad),
                                 (cx + size * 0.24 * pad, cy + size * 0.32 * pad),
                                 (cx - size * 0.24 * pad, cy + size * 0.32 * pad)):
                blend(pixels, size, x, y, (92, 225, 230), 0.10)

    for y in range(size):
        for x in range(size):
            if point_in_triangle(x, y, nose, tip_r, inner) or point_in_triangle(x, y, nose, inner, tip_l):
                shade = max(0.0, min(1.0, (y - (cy - size * 0.3 * pad)) / (size * 0.6 * pad)))
                color = (int(234 - 150 * shade), int(255 - 130 * shade), 255)
                blend(pixels, size, x, y, color, 0.95)

    # Cockpit.
    r = size * 0.032
    for y in range(int(cy - r), int(cy + r) + 1):
        for x in range(int(cx - r), int(cx + r) + 1):
            if math.hypot(x - cx, y - cy) <= r:
                blend(pixels, size, x, y, (255, 255, 255), 1.0)

    return pixels


def main():
    os.makedirs(ICONS, exist_ok=True)
    targets = [
        ("icon-192.png", 192, False),
        ("icon-512.png", 512, False),
        ("icon-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, True),
    ]
    for name, size, maskable in targets:
        write_png(os.path.join(ICONS, name), size, draw(size, maskable))
        print("wrote", name)


if __name__ == "__main__":
    main()
