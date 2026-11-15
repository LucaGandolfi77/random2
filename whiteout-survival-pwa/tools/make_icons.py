#!/usr/bin/env python3
"""Generate the Last Ember PWA icon set from the same shape language as icon.svg.

Run: python3 tools/make_icons.py
Only Pillow is needed, and only at build time.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "public" / "icons"
S = 1024


def gradient(size, top, bottom):
    img = Image.new("RGB", (1, size), top)
    px = img.load()
    for y in range(size):
        k = y / max(1, size - 1)
        px[0, y] = tuple(round(top[i] + (bottom[i] - top[i]) * k) for i in range(3))
    return img.resize((size, size), Image.Resampling.BILINEAR)


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
    return mask


def snowflake(draw, cx, cy, r, color, width=5):
    draw.line((cx, cy - r, cx, cy + r), fill=color, width=width)
    draw.line((cx - r, cy, cx + r, cy), fill=color, width=width)
    draw.line((cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7), fill=color, width=width)
    draw.line((cx - r * 0.7, cy + r * 0.7, cx + r * 0.7, cy - r * 0.7), fill=color, width=width)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        x = cx + dx * r * 0.72
        y = cy + dy * r * 0.72
        draw.line((x, y, x + dx * 0.2 * r - dy * 0.18 * r, y + dy * 0.2 * r + dx * 0.18 * r), fill=color, width=width)
        draw.line((x, y, x + dx * 0.2 * r + dy * 0.18 * r, y + dy * 0.2 * r - dx * 0.18 * r), fill=color, width=width)


def make_icon(size, maskable=False):
    bg = gradient(S, (16, 42, 54), (4, 11, 17)).convert("RGBA")
    layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    # glow
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = S * 0.5, S * 0.63
    for radius, alpha in ((360, 20), (260, 34), (175, 50), (110, 60)):
        gd.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(255, 137, 48, alpha))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    layer = Image.alpha_composite(layer, glow)
    draw = ImageDraw.Draw(layer)

    # small snowflakes
    snowflake(draw, S * 0.19, S * 0.33, 38, (190, 231, 239, 100), 4)
    snowflake(draw, S * 0.82, S * 0.24, 27, (190, 231, 239, 80), 3)
    snowflake(draw, S * 0.8, S * 0.61, 20, (190, 231, 239, 65), 3)

    # ground
    draw.ellipse((S * 0.08, S * 0.69, S * 0.92, S * 0.86), fill=(11, 32, 42, 255))
    draw.ellipse((S * 0.1, S * 0.7, S * 0.9, S * 0.81), fill=(219, 243, 248, 235))
    draw.rectangle((S * 0.1, S * 0.75, S * 0.9, S * 0.87), fill=(8, 26, 35, 255))
    draw.rectangle((S * 0.1, S * 0.75, S * 0.9, S * 0.78), fill=(202, 235, 241, 220))

    scale = 0.86 if maskable else 1.0
    # furnace body
    left = S * 0.41 - (1 - scale) * S * 0.2
    top = S * 0.36 - (1 - scale) * S * 0.12
    width = S * 0.19 * scale
    height = S * 0.34 * scale
    draw.rounded_rectangle((left, top, left + width * 2, top + height), radius=S * 0.035, fill=(27, 51, 60, 255))
    draw.rounded_rectangle((left + width * 0.36, top + S * 0.025, left + width * 1.64, top + height - S * 0.025), radius=S * 0.03, fill=(8, 19, 25, 255))

    # chimney cap
    draw.rounded_rectangle((left + width * 0.2, top - S * 0.055, left + width * 1.8, top + S * 0.005), radius=S * 0.014, fill=(76, 104, 112, 255))
    draw.line((left + width * 0.18, top - S * 0.045, left + width * 0.06, top + S * 0.02), fill=(76, 104, 112, 255), width=8)
    draw.line((left + width * 1.82, top - S * 0.045, left + width * 1.94, top + S * 0.02), fill=(76, 104, 112, 255), width=8)

    # fire
    fire = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fire)
    fx = left + width
    fb = top + height * 0.9
    fd.ellipse((fx - width * 0.58, fb - height * 0.34, fx + width * 0.58, fb + height * 0.06), fill=(255, 130, 34, 255))
    fd.polygon(
        [
            (fx - width * 0.4, fb),
            (fx - width * 0.1, fb - height * 0.52),
            (fx + width * 0.02, fb - height * 0.35),
            (fx + width * 0.38, fb - height * 0.15),
            (fx + width * 0.4, fb),
        ],
        fill=(255, 188, 87, 255),
    )
    fd.ellipse((fx - width * 0.27, fb - height * 0.3, fx + width * 0.27, fb - height * 0.02), fill=(255, 238, 198, 255))
    fire = fire.filter(ImageFilter.GaussianBlur(2))
    layer = Image.alpha_composite(layer, fire)

    # candle flame above;
    draw = ImageDraw.Draw(layer)
    flame_top = top - S * 0.095
    draw.ellipse((S * 0.5 - S * 0.032, flame_top - S * 0.06, S * 0.5 + S * 0.032, flame_top + S * 0.048), fill=(255, 226, 170, 235))
    draw.polygon(
        [
            (S * 0.5 - S * 0.028, flame_top + S * 0.035),
            (S * 0.5, flame_top - S * 0.1),
            (S * 0.5 + S * 0.028, flame_top + S * 0.035),
        ],
        fill=(255, 164, 69, 240),
    )

    if maskable:
        out = Image.alpha_composite(bg, layer)
    else:
        out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        out.paste(Image.alpha_composite(bg, layer), (0, 0), rounded_mask(S, 210))
    return out.resize((size, size), Image.Resampling.LANCZOS).convert("RGB")


def main():
    ICONS.mkdir(parents=True, exist_ok=True)
    make_icon(192).save(ICONS / "icon-192.png", optimize=True)
    make_icon(512).save(ICONS / "icon-512.png", optimize=True)
    make_icon(512, maskable=True).save(ICONS / "icon-maskable-512.png", optimize=True)
    make_icon(180).save(ICONS / "apple-touch-icon.png", optimize=True)
    print("wrote icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png")


if __name__ == "__main__":
    main()
