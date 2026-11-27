#!/usr/bin/env python3
"""Generate Traffic Tessera PNG icons with the Python standard library only."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1] / "icons"


def chunk(kind, data):
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def blend(px, py, color, alpha=1):
    if not (0 <= px < WIDTH and 0 <= py < HEIGHT):
        return
    index = (py * WIDTH + px) * 4
    source = color[:3]
    destination = pixels[index:index + 3]
    destination_alpha = pixels[index + 3] / 255
    output_alpha = alpha + destination_alpha * (1 - alpha)
    if output_alpha <= 0:
        return
    for channel in range(3):
        pixels[index + channel] = round((source[channel] * alpha + destination[channel] * destination_alpha * (1 - alpha)) / output_alpha)
    pixels[index + 3] = round(output_alpha * 255)


def inside_rounded(x, y, left, top, width, height, radius):
    if not (left <= x <= left + width and top <= y <= top + height):
        return False
    cx = min(max(x, left + radius), left + width - radius)
    cy = min(max(y, top + radius), top + height - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2


def make_icon(size, maskable=False, apple=False):
    global WIDTH, HEIGHT, pixels
    WIDTH = HEIGHT = size
    pixels = bytearray(WIDTH * HEIGHT * 4)
    scale = size / 512
    radius = 0 if maskable else size * (0.18 if apple else 0.22)
    for y in range(HEIGHT):
        for x in range(WIDTH):
            if radius:
                inside = radius <= x < WIDTH - radius or radius <= y < HEIGHT - radius
                corners = [
                    (x - radius) ** 2 + (y - radius) ** 2,
                    (x - (WIDTH - radius)) ** 2 + (y - radius) ** 2,
                    (x - radius) ** 2 + (y - (HEIGHT - radius)) ** 2,
                    (x - (WIDTH - radius)) ** 2 + (y - (HEIGHT - radius)) ** 2,
                ]
                if not inside and min(corners) > radius * radius:
                    continue
            blend(x, y, (17, 28, 45))

    def rect(left, top, width, height, color, corner=0, alpha=1):
        left *= scale
        top *= scale
        width *= scale
        height *= scale
        corner *= scale
        for py in range(max(0, int(top)), min(HEIGHT, int(top + height) + 1)):
            for px in range(max(0, int(left)), min(WIDTH, int(left + width) + 1)):
                if inside_rounded(px, py, left, top, width, height, corner):
                    blend(px, py, color, alpha)

    rect(106, 106, 300, 300, (21, 34, 56), 42)
    rect(103, 103, 306, 306, (51, 67, 93), 44)
    rect(106, 106, 300, 300, (21, 34, 56), 42)
    for position in range(1, 5):
        rect(106 + position * 60 - 1, 106, 3, 300, (41, 58, 83))
        rect(106, 106 + position * 60 - 1, 300, 3, (41, 58, 83))
    rect(110, 230, 52, 52, (168, 230, 207), 12, 0.3)
    rect(110, 227, 52, 5, (168, 230, 207), 2)
    rect(350, 110, 52, 52, (247, 227, 161), 12, 0.3)
    rect(350, 110, 5, 52, (247, 227, 161), 2)
    rect(178, 170, 112, 50, (244, 167, 181), 14)
    rect(290, 234, 50, 112, (169, 201, 245), 14)
    rect(170, 294, 112, 50, (168, 230, 207), 14)
    rect(230, 350, 112, 50, (247, 227, 161), 14)
    rect(206, 178, 54, 9, (255, 255, 255), 4, 0.55)
    rect(298, 262, 9, 52, (255, 255, 255), 4, 0.55)
    rect(198, 302, 54, 9, (255, 255, 255), 4, 0.55)
    rect(258, 358, 54, 9, (255, 255, 255), 4, 0.55)

    raw = b"".join(b"\x00" + bytes(pixels[y * WIDTH * 4:(y + 1) * WIDTH * 4]) for y in range(HEIGHT))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


ROOT.mkdir(parents=True, exist_ok=True)
for name, size, maskable, apple in [
    ("icon-192.png", 192, False, False),
    ("icon-512.png", 512, False, False),
    ("icon-maskable-512.png", 512, True, False),
    ("apple-touch-icon.png", 180, False, True),
]:
    (ROOT / name).write_bytes(make_icon(size, maskable, apple))
    print("wrote", name)
