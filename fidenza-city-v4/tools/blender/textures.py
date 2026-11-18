"""
Texture PBR procedurali per la Fidenza realistica di v4.

Nessun asset esterno: albedo e normal map sono generate con mathutils.noise
e scritte come PNG via zlib/struct, poi caricate nei materiali Blender.
Le texture sono seamless (blend periodico a 4 offset del rumore).
"""

import math
import os
import struct
import zlib

from mathutils import Vector, noise

SIZE = 256


def _n(u, v, scale, seed, octaves=4):
    raw = noise.fractal(Vector((u * scale, v * scale, seed)), 1.0, 2.0, octaves)
    return (raw + 1.0) * 0.5


def tile_noise(u, v, scale, seed=0, octaves=4):
    """Rumore periodico su [0,1]^2 (seamless)."""
    a = _n(u, v, scale, seed, octaves) * (1 - u) + _n(u - 1, v, scale, seed, octaves) * u
    b = _n(u, v - 1, scale, seed, octaves) * (1 - u) + _n(u - 1, v - 1, scale, seed, octaves) * u
    return a * (1 - v) + b * v


def clamp_byte(x):
    return max(0, min(255, int(x + 0.5)))


def write_png(path, size, rgb_rows):
    """Scrive un PNG RGB 8-bit senza dipendenze esterne."""
    raw = b''.join(b'\x00' + bytes(v for pixel in row for v in pixel) for row in rgb_rows)

    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xffffffff)

    header = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    with open(path, 'wb') as fh:
        fh.write(b'\x89PNG\r\n\x1a\n')
        fh.write(chunk(b'IHDR', header))
        fh.write(chunk(b'IDAT', zlib.compress(raw, 6)))
        fh.write(chunk(b'IEND', b''))


def _height_field(kind, seed):
    """Campo di altezza normalizzato e pattern colore per materiale."""
    height = [[0.0] * SIZE for _ in range(SIZE)]
    color = [[(0.5, 0.5, 0.5)] * SIZE for _ in range(SIZE)]
    for y in range(SIZE):
        v = y / SIZE
        for x in range(SIZE):
            u = x / SIZE
            fine = tile_noise(u, v, 24, seed, 3)
            mid = tile_noise(u, v, 7, seed + 11, 4)
            coarse = tile_noise(u, v, 3, seed + 23, 3)

            if kind == 'brick':
                rows = 10
                cols = 6
                ry = v * rows
                row = int(ry)
                offset = 0.5 if row % 2 else 0.0
                cx = u * cols + offset
                col = int(cx)
                fy = ry - row
                fx = cx - col
                mortar = fy < 0.09 or fx < 0.055 or fx > 0.945
                brick_var = tile_noise((col + 0.37) / cols, (row + 0.41) / rows, 9, seed + 31, 2)
                base = 0.62 + brick_var * 0.3 + fine * 0.08
                color[y][x] = (base, base * 0.52, base * 0.40) if not mortar else (0.72, 0.68, 0.62)
                height[y][x] = (0.25 if mortar else 0.62 + brick_var * 0.2) + fine * 0.06
            elif kind == 'plaster':
                base = 0.78 + mid * 0.12 + fine * 0.06
                color[y][x] = (base, base * 0.96, base * 0.87)
                height[y][x] = mid * 0.25 + fine * 0.2
            elif kind == 'stone':
                cells = tile_noise(u, v, 5, seed + 41, 2)
                block = int(cells * 8) % 3
                base = 0.66 + block * 0.05 + fine * 0.08
                color[y][x] = (base, base * 0.97, base * 0.88)
                height[y][x] = block * 0.12 + fine * 0.25
            elif kind == 'concrete':
                base = 0.62 + mid * 0.12 + fine * 0.08
                color[y][x] = (base, base, base * 0.98)
                height[y][x] = mid * 0.18 + fine * 0.28
            elif kind == 'roof_tile':
                rows = 14
                ry = v * rows
                row = int(ry)
                fy = ry - row
                cols = 8
                cx = (u + (0.5 if row % 2 else 0) / cols) * cols
                col = int(cx)
                fx = cx - col
                edge = fy < 0.1 or fx < 0.08 or fx > 0.92
                tile_var = tile_noise((col + 0.2) / cols, (row + 0.7) / rows, 8, seed + 53, 2)
                base = 0.55 + tile_var * 0.28 + fine * 0.06
                color[y][x] = (base, base * 0.47, base * 0.32) if not edge else (base * 0.62, base * 0.3, base * 0.22)
                height[y][x] = (0.15 if edge else 0.7) + tile_var * 0.16 + fine * 0.05
            elif kind == 'asphalt':
                base = 0.28 + fine * 0.10 + coarse * 0.05
                speck = 0.12 if fine > 0.86 else 0.0
                color[y][x] = (base + speck, base + speck, base + speck * 1.05)
                height[y][x] = fine * 0.4 + mid * 0.12
            elif kind == 'pavement':
                gx = u * 6
                gy = v * 6
                joint = (gx - int(gx)) < 0.035 or (gy - int(gy)) < 0.035
                base = 0.70 + mid * 0.10 + fine * 0.05
                val = base * 0.78 if joint else base
                color[y][x] = (val, val * 0.98, val * 0.93)
                height[y][x] = (0.1 if joint else 0.6) + fine * 0.12
            elif kind == 'grass':
                mix = mid * 0.6 + fine * 0.4
                color[y][x] = (0.32 + mix * 0.16, 0.50 + mix * 0.20, 0.26 + mix * 0.12)
                height[y][x] = fine * 0.5 + mid * 0.3
            elif kind == 'field':
                streak = tile_noise(u * 0.35, v * 1.4, 12, seed + 67, 3)
                color[y][x] = (0.55 + streak * 0.16, 0.51 + streak * 0.13, 0.31 + streak * 0.10)
                height[y][x] = streak * 0.45 + fine * 0.3
            elif kind == 'wood':
                grain = tile_noise(u * 0.25, v * 2.2, 14, seed + 79, 3)
                color[y][x] = (0.40 + grain * 0.18, 0.28 + grain * 0.12, 0.16 + grain * 0.08)
                height[y][x] = grain * 0.55 + fine * 0.12
            elif kind == 'water':
                wave = tile_noise(u, v, 9, seed + 89, 3)
                color[y][x] = (0.20 + wave * 0.10, 0.42 + wave * 0.16, 0.52 + wave * 0.18)
                height[y][x] = wave * 0.3 + fine * 0.1
            else:
                color[y][x] = (0.5, 0.5, 0.5)
                height[y][x] = fine
    return height, color


def _normal_rows(height, strength):
    rows = []
    for y in range(SIZE):
        row = []
        for x in range(SIZE):
            hx = height[y][(x + 1) % SIZE] - height[y][(x - 1) % SIZE]
            hy = height[(y + 1) % SIZE][x] - height[(y - 1) % SIZE][x]
            nx, ny, nz = -hx * strength, -hy * strength, 1.0
            length = math.sqrt(nx * nx + ny * ny + nz * nz)
            row.append((
                clamp_byte((nx / length * 0.5 + 0.5) * 255),
                clamp_byte((ny / length * 0.5 + 0.5) * 255),
                clamp_byte((nz / length * 0.5 + 0.5) * 255),
            ))
        rows.append(row)
    return rows


def generate_all(out_dir):
    """Genera le texture e un atlas 4x4; restituisce paths, tiles, atlas."""
    os.makedirs(out_dir, exist_ok=True)
    specs = {
        'brick': (3, 3.5), 'plaster': (7, 1.4), 'stone': (11, 3.0),
        'concrete': (13, 2.0), 'roof_tile': (17, 4.0), 'asphalt': (19, 1.6),
        'pavement': (23, 2.2), 'grass': (29, 1.4), 'field': (31, 1.2),
        'wood': (37, 2.4), 'water': (41, 2.0),
        'plain': (43, 0.8), 'glass': (47, 0.6),
    }
    names = list(specs)
    tiles = {name: (i % 4, i // 4) for i, name in enumerate(names)}
    atlas_size = SIZE * 4
    atlas_albedo = [[(128, 128, 128)] * atlas_size for _ in range(atlas_size)]
    atlas_normal = [[(128, 128, 255)] * atlas_size for _ in range(atlas_size)]
    paths = {}
    for name, (seed, strength) in specs.items():
        height, color = _height_field(name, seed)
        albedo_rows = [[
            (clamp_byte(c[0] * 255), clamp_byte(c[1] * 255), clamp_byte(c[2] * 255))
            for c in row
        ] for row in color]
        normal_rows = _normal_rows(height, strength)
        albedo_path = os.path.join(out_dir, name + '-albedo.png')
        normal_path = os.path.join(out_dir, name + '-normal.png')
        write_png(albedo_path, SIZE, albedo_rows)
        write_png(normal_path, SIZE, normal_rows)
        paths[name] = (albedo_path, normal_path)
        col, row = tiles[name]
        ox, oy = col * SIZE, row * SIZE
        for y in range(SIZE):
            atlas_albedo[oy + y][ox:ox + SIZE] = albedo_rows[y]
            atlas_normal[oy + y][ox:ox + SIZE] = normal_rows[y]
    albedo_path = os.path.join(out_dir, 'atlas-albedo.png')
    normal_path = os.path.join(out_dir, 'atlas-normal.png')
    write_png(albedo_path, atlas_size, atlas_albedo)
    write_png(normal_path, atlas_size, atlas_normal)
    return {
        'paths': paths,
        'tiles': tiles,
        'atlas': (albedo_path, normal_path),
        'size': SIZE,
    }
