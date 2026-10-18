#!/usr/bin/env python3
"""Generate PULSE icons and social cover. Pure stdlib, no image deps."""

import math
import os
import struct
import zlib

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BG = (5, 7, 15)
LANES = [(255, 90, 122), (255, 209, 102), (90, 209, 255), (123, 241, 168)]
HEIGHTS = [0.46, 0.74, 0.58, 0.34]


def sdf_rrect(px, py, cx, cy, hw, hh, r):
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    return math.hypot(max(qx, 0.0), max(qy, 0.0)) + min(max(qx, qy), 0.0) - r


def coverage(d):
    return min(1.0, max(0.0, 0.5 - d))


def blend(dst, src, a):
    return tuple(dst[i] + (src[i] - dst[i]) * a for i in range(3))


def render(size, inset, corner, pad_ratio):
    scale = size * pad_ratio
    cx = size / 2.0
    bar_w = scale * 0.145
    gap = scale * 0.055
    total = bar_w * 4 + gap * 3
    left = cx - total / 2.0
    base = size * (0.5 + pad_ratio * 0.32)
    line_y = size * (0.5 + pad_ratio * 0.235)
    rows = []
    for y in range(size):
        py = y + 0.5
        row = []
        for x in range(size):
            px = x + 0.5
            color = [float(c) for c in BG]
            glow = math.exp(-(((px - cx) ** 2 + (py - size * 0.42) ** 2) / (2 * (size * 0.42) ** 2)))
            color[2] += glow * 26
            color[0] += glow * 6
            if corner > 0:
                a = coverage(sdf_rrect(px, py, size / 2, size / 2, size / 2, size / 2, corner))
                if a <= 0.0:
                    row.append((0, 0, 0, 0))
                    continue
            else:
                a = 1.0
            for i in range(4):
                h = scale * HEIGHTS[i] * 0.5
                bx = left + i * (bar_w + gap) + bar_w / 2
                d = sdf_rrect(px, py, bx, base - h, bar_w / 2, h, bar_w * 0.42)
                cov = coverage(d) * a
                if cov > 0:
                    color = blend(tuple(color), LANES[i], cov)
            dline = sdf_rrect(px, py, cx, line_y, total / 2, size * 0.012, size * 0.012)
            cov = coverage(dline) * a
            if cov > 0:
                color = blend(tuple(color), (242, 245, 250), cov * 0.92)
            row.append((int(color[0]), int(color[1]), int(color[2]), int(255 * a)))
        rows.append(row)
    return rows


def write_png(path, rows):
    height = len(rows)
    width = len(rows[0])
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for px in row:
            raw.extend(px)

    def chunk(tag, data):
        out = struct.pack(">I", len(data)) + tag + data
        return out + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    blob = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as fh:
        fh.write(blob)
    return len(blob)


def write_svg(path, size, maskable=False):
    pad = 0.62 if maskable else 0.86
    bar_w = size * pad * 0.145
    gap = size * pad * 0.055
    total = bar_w * 4 + gap * 3
    left = size / 2 - total / 2
    base = size * (0.5 + pad * 0.32)
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">'
        % (size, size, size, size),
        '<defs><radialGradient id="g" cx="50%%" cy="42%%" r="45%%">'
        '<stop offset="0%%" stop-color="#1a3550"/><stop offset="100%%" stop-color="#05070f"/>'
        "</radialGradient></defs>",
        '<rect width="%d" height="%d" fill="#05070f"/>' % (size, size),
        '<rect width="%d" height="%d" fill="url(#g)"/>' % (size, size),
    ]
    colors = ["#ff5a7a", "#ffd166", "#5ad1ff", "#7bf1a8"]
    for i, h in enumerate(HEIGHTS):
        height = size * pad * h * 0.5
        x = left + i * (bar_w + gap)
        parts.append(
            '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="%s"/>'
            % (x, base - height * 2, bar_w, height * 2, bar_w * 0.42, colors[i])
        )
    parts.append(
        '<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" rx="%.2f" fill="#f2f5fa"/>'
        % (left, size * (0.5 + pad * 0.235) - size * 0.012, total, size * 0.024, size * 0.012)
    )
    parts.append("</svg>")
    with open(path, "w") as fh:
        fh.write("\n".join(parts))


def write_cover(path, w, h):
    rows = []
    bar_w = w * 0.052
    gap = w * 0.018
    total = bar_w * 4 + gap * 3
    left = w / 2 - total / 2
    base = h * 0.66
    heights = [v * h * 0.62 for v in HEIGHTS]
    for y in range(h):
        py = y + 0.5
        row = []
        for x in range(w):
            px = x + 0.5
            color = [float(c) for c in BG]
            glow = math.exp(-(((px - w / 2) ** 2 + (py - h * 0.46) ** 2) / (2 * (h * 0.6) ** 2)))
            color[2] += glow * 30
            for i in range(4):
                hh = heights[i] / 2
                bx = left + i * (bar_w + gap) + bar_w / 2
                cov = coverage(sdf_rrect(px, py, bx, base - hh, bar_w / 2, hh, bar_w * 0.42))
                if cov > 0:
                    color = blend(tuple(color), LANES[i], cov)
            cov = coverage(sdf_rrect(px, py, w / 2, h * 0.80, total / 2, h * 0.012, h * 0.012))
            if cov > 0:
                color = blend(tuple(color), (242, 245, 250), cov * 0.9)
            row.append((int(color[0]), int(color[1]), int(color[2]), 255))
        rows.append(row)
    return write_png(path, rows)


def main():
    jobs = [
        ("icons/icon-192.png", 192, False),
        ("icons/icon-512.png", 512, False),
        ("icons/icon-512-maskable.png", 512, True),
    ]
    for name, size, maskable in jobs:
        rows = render(size, False, 0.0, 0.62 if maskable else 0.86)
        n = write_png(os.path.join(OUT, name), rows)
        print("%-34s %d bytes" % (name, n))
    write_svg(os.path.join(OUT, "icons/icon-192.svg"), 192)
    write_svg(os.path.join(OUT, "icons/icon-512.svg"), 512)
    print("%-34s written" % "icons/icon-192.svg")
    print("%-34s written" % "icons/icon-512.svg")
    n = write_cover(os.path.join(OUT, "og-cover.png"), 1200, 630)
    print("%-34s %d bytes" % ("og-cover.png", n))


if __name__ == "__main__":
    main()