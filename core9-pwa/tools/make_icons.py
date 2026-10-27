#!/usr/bin/env python3
"""Generate CORE 9 PNG icons from the same shapes as icons/icon-192.svg.

Run: python3 tools/make_icons.py
Only needs Pillow, which is a tooling dependency, never a runtime one.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "icons"


def gradient(size, top, bottom):
    img = Image.new("RGB", (1, size), top)
    px = img.load()
    for y in range(size):
        k = y / max(1, size - 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * k) for i in range(3))
    return img.resize((size, size), Image.Resampling.BILINEAR)


def tower(draw, x, base, w, h, color, alpha=255):
    fill = color + (alpha,)
    # hyperboloid silhouette: wide base, pinched waist, open top
    pts = [
        (x - w * 0.52, base),
        (x - w * 0.34, base - h * 0.18),
        (x - w * 0.21, base - h * 0.55),
        (x - w * 0.26, base - h * 0.86),
        (x - w * 0.30, base - h),
        (x + w * 0.30, base - h),
        (x + w * 0.26, base - h * 0.86),
        (x + w * 0.21, base - h * 0.55),
        (x + w * 0.34, base - h * 0.18),
        (x + w * 0.52, base),
    ]
    draw.polygon(pts, fill=fill)
    draw.ellipse(
        (x - w * 0.30, base - h - w * 0.10, x + w * 0.30, base - h + w * 0.10),
        fill=(7, 19, 27, alpha),
    )


def make_icon(size, maskable=False):
    S = 1024
    bg = gradient(S, (11, 34, 42), (3, 10, 14)).convert("RGBA")
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # rounded-square mask for the normal icon
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, S, S), radius=210, fill=255)

    # ground
    d.rectangle((0, 760, S, S), fill=(10, 31, 25, 255))
    for y in (820, 870, 920, 970):
        d.line((0, y, S, y), fill=(77, 216, 192, 28), width=3)

    # towers
    scale = 0.82 if maskable else 1.0
    cx = S // 2
    tower(d, cx - 175 * scale, 770, 225 * scale, 380 * scale, (185, 245, 232))
    tower(d, cx + 30 * scale, 795, 255 * scale, 445 * scale, (77, 216, 192))
    tower(d, cx + 245 * scale, 780, 190 * scale, 330 * scale, (31, 143, 129))

    # atom orbits
    orbit = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    od = ImageDraw.Draw(orbit)
    for angle in (-26, 38, 98):
        layer2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(layer2)
        d2.ellipse((cx - 245, 240, cx + 245, 330), outline=(77, 216, 192, 235), width=14)
        layer2 = layer2.rotate(angle, center=(cx, 285), resample=Image.Resampling.BICUBIC)
        orbit = Image.alpha_composite(orbit, layer2)
    layer = Image.alpha_composite(layer, orbit)
    d = ImageDraw.Draw(layer)

    # glowing core
    for r, a in ((70, 28), (48, 55), (30, 255)):
        d.ellipse((cx - r, 285 - r, cx + r, 285 + r), fill=(243, 181, 63, a))
    d.ellipse((cx - 12, 273, cx + 12, 297), fill=(255, 248, 223, 255))

    # wordmark
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 72 if not maskable else 64)
        small = ImageFont.truetype("DejaVuSans-Bold.ttf", 34)
    except OSError:
        font = ImageFont.load_default()
        small = ImageFont.load_default()
    label = "CORE 9"
    bbox = d.textbbox((0, 0), label, font=font)
    d.text(((S - (bbox[2] - bbox[0])) / 2, 840), label, font=font, fill=(234, 255, 250, 255))
    sub = "NUCLEAR"
    bbox2 = d.textbbox((0, 0), sub, font=small)
    d.text(((S - (bbox2[2] - bbox2[0])) / 2, 925), sub, font=small, fill=(77, 216, 192, 220))

    if maskable:
        # Maskable icons get a 20% safe zone and no rounded mask; platforms crop.
        layer = layer.resize((S, S), Image.Resampling.LANCZOS)
        out = Image.alpha_composite(bg, layer)
    else:
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        out.paste(Image.alpha_composite(bg, layer), (0, 0), mask)

    out = out.resize((size, size), Image.Resampling.LANCZOS)
    return out


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    make_icon(192).save(ICONS / "icon-192.png")
    make_icon(512).save(ICONS / "icon-512.png")
    make_icon(512, maskable=True).save(ICONS / "icon-512-maskable.png")
    print("wrote icon-192.png, icon-512.png, icon-512-maskable.png")


if __name__ == "__main__":
    main()
