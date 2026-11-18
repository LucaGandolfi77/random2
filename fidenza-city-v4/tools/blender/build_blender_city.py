"""
Fidenza da Giocare v4 —mondo realistico costruito con Blender 5.3.

Rispetto alla versione low-poly iniziale aggiunge: texture PBR procedurali
(albedo + normal), UV per faccia, geometria architettonica (finestre, porte,
balconi, cornicioni, comignoli), alberi a chioma organica, cordoli e zebra,
AO bake in vertex color. Le finestre sono esportate come oggetto separato
cosi' la runtime puo' accenderle di notte.

Uso:

  BLENDER="/Volumes/PortableSSD/Programs/Blender.app/Contents/MacOS/Blender"
  "$BLENDER" -b --python tools/blender/build_blender_city.py -- \
      --data data/render-city.json --terrain data/terrain.json \
      --map data/map.json --out assets/3d/blender-city --preview

Coordinate: Three (x, y=altezza, z) -> Blender (x, -z, y) -> glTF Y-up -> Three.
"""

import argparse
import json
import math
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textures as texgen
import build_landmarks


# --------------------------------------------------------------------------
# Argomenti
# --------------------------------------------------------------------------

def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='data/render-city.json')
    parser.add_argument('--terrain', default='data/terrain.json')
    parser.add_argument('--map', default='data/map.json')
    parser.add_argument('--out', default='assets/3d/blender-city')
    parser.add_argument('--terrain-segments', type=int, default=160)
    parser.add_argument('--ao-samples', type=int, default=16)
    parser.add_argument('--no-ao', action='store_true')
    parser.add_argument('--preview', action='store_true')
    return parser.parse_args(argv)


# --------------------------------------------------------------------------
# Palette e materiali
# --------------------------------------------------------------------------

PALETTE = {
    'terrain_grass': '#7c9a63', 'terrain_field': '#a8a06e',
    'terrain_high': '#5f7f4c', 'terrain_water': '#6c8d8b',
    'area_park': '#6d9760', 'area_garden': '#82a466',
    'area_piazza': '#c2ae8e', 'area_parking': '#aaa38f', 'area_field': '#9a9164',
    'road_asphalt': '#5b6066', 'road_pavement': '#b9ae96', 'marking': '#e8e2d0',
    'water': '#5d95a6', 'rail': '#4a4d52',
    'wall_plaster': '#ddc5a3', 'wall_terracotta': '#b96a4b',
    'wall_brick': '#a85840', 'wall_stone': '#b7ad99',
    'wall_concrete': '#b5b3aa', 'wall_white': '#e6ddc7',
    'roof_tile': '#a35338', 'roof_slate': '#5b5b61', 'roof_gray': '#7c7c78',
    'wood': '#8a6a4a', 'shutter': '#7a4b38', 'foliage': '#5f8a52',
    'foliage_light': '#78a05c', 'trim': '#d8cbb2', 'window_glass': '#9fc4d2',
    'snow': '#f2f5f7',
}

TEXTURE_FOR = {
    'terrain_grass': 'grass', 'terrain_field': 'field',
    'terrain_high': 'grass', 'terrain_water': 'water',
    'area_park': 'grass', 'area_garden': 'grass', 'area_piazza': 'pavement',
    'area_parking': 'pavement', 'area_field': 'field',
    'road_asphalt': 'asphalt', 'road_pavement': 'pavement',
    'water': 'water', 'rail': 'concrete',
    'wall_plaster': 'plaster', 'wall_terracotta': 'brick', 'wall_brick': 'brick',
    'wall_stone': 'stone', 'wall_concrete': 'concrete', 'wall_white': 'plaster',
    'roof_tile': 'roof_tile', 'roof_slate': 'roof_tile', 'roof_gray': 'roof_tile',
    'wood': 'wood', 'shutter': 'wood', 'foliage': 'grass', 'foliage_light': 'grass',
    'trim': 'plaster', 'marking': 'plain', 'window_glass': 'glass',
    'snow': 'plain',
}

WALL_KEYS = [k for k in PALETTE if k.startswith('wall_')]
ROOF_KEYS = [k for k in PALETTE if k.startswith('roof_')]


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_to_srgb(value):
    if not isinstance(value, str) or not value.startswith('#') or len(value) < 7:
        return None
    try:
        return tuple(int(value[i:i + 2], 16) / 255 for i in (1, 3, 5))
    except ValueError:
        return None


def nearest_palette(color, keys):
    rgb = hex_to_srgb(color)
    if rgb is None:
        return keys[0]
    best, best_dist = keys[0], float('inf')
    for key in keys:
        target = hex_to_srgb(PALETTE[key])
        dist = sum((a - b) ** 2 for a, b in zip(rgb, target))
        if dist < best_dist:
            best, best_dist = key, dist
    return best


def wall_key(building):
    style = building.get('facadeStyle') or ''
    name = (building.get('name') or '').lower()
    if style == 'civic' or 'chiesa' in name:
        return 'wall_white'
    if style == 'industrial':
        return 'wall_concrete'
    if style == 'historic':
        return 'wall_stone'
    return nearest_palette(building.get('color') or building.get('wallColor'), WALL_KEYS)


def roof_key(building):
    return nearest_palette(building.get('roofColor') or building.get('roofMaterial'), ROOF_KEYS)


def area_key(kind):
    mapping = {
        'park': 'area_park', 'garden': 'area_garden', 'grass': 'area_park',
        'meadow': 'area_park', 'forest': 'area_park', 'wood': 'area_park',
        'square': 'area_piazza', 'pedestrian': 'area_piazza',
        'parking': 'area_parking', 'pitch': 'area_field', 'sport': 'area_field',
        'sports_centre': 'area_field', 'farm': 'area_field', 'farmland': 'area_field',
        'cemetery': 'area_park', 'playground': 'area_park',
    }
    return mapping.get(kind, 'area_park')


def make_materials(texture_data):
    """Un materiale per tipo, con albedo + normal map dedicate."""
    paths = texture_data['paths']
    materials = {}
    for name, color in PALETTE.items():
        mat = bpy.data.materials.new(name='lp_' + name)
        mat.use_nodes = True
        mat.use_backface_culling = False
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = nodes.get('Principled BSDF')
        bsdf.inputs['Roughness'].default_value = 0.12 if name == 'window_glass' else 0.85
        bsdf.inputs['Metallic'].default_value = 0.0
        texture_name = TEXTURE_FOR.get(name)
        if texture_name:
            albedo_path, normal_path = paths[texture_name]
            albedo = bpy.data.images.load(albedo_path, check_existing=True)
            tnode = nodes.new('ShaderNodeTexImage')
            tnode.image = albedo
            links.new(tnode.outputs['Color'], bsdf.inputs['Base Color'])
            normal_image = bpy.data.images.load(normal_path, check_existing=True)
            normal_image.colorspace_settings.name = 'Non-Color'
            nnode = nodes.new('ShaderNodeTexImage')
            nnode.image = normal_image
            mapnode = nodes.new('ShaderNodeNormalMap')
            mapnode.inputs['Strength'].default_value = 0.5
            links.new(nnode.outputs['Color'], mapnode.inputs['Color'])
            links.new(mapnode.outputs['Normal'], bsdf.inputs['Normal'])
        else:
            rgb = hex_to_srgb(color) or (1, 1, 1)
            bsdf.inputs['Base Color'].default_value = (*[srgb_to_linear(c) for c in rgb], 1.0)
        materials[name] = mat
    return materials


# --------------------------------------------------------------------------
# Chunk con UV per faccia
# --------------------------------------------------------------------------

class Chunk:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []
        self.mats = []
        self.uvs = []
        self.tiles = []

    @staticmethod
    def _auto_uv(points):
        a, b, c = points[0], points[1], points[2]
        ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
        nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
        result = []
        for x, y, z in points:
            if abs(ny) >= abs(nx) and abs(ny) >= abs(nz):
                result.append((x / 4.0, z / 4.0))
            elif abs(nx) > abs(nz):
                result.append((z / 4.0, y / 3.0))
            else:
                result.append((x / 4.0, y / 3.0))
        return result

    def face(self, points, material, force_up=False):
        if len(points) < 3:
            return
        idx = []
        for x, y, z in points:
            idx.append(len(self.verts))
            self.verts.append((float(x), -float(z), float(y)))
        uv = self._auto_uv(points)
        if force_up:
            a, b, c = (self.verts[i] for i in idx[:3])
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            if uy * vz - uz * vy < 0:
                idx.reverse()
                uv.reverse()
        self.faces.append(tuple(idx))
        self.mats.append(material)
        self.uvs.append(uv)
        self.tiles.append(TEXTURE_FOR.get(material, 'plain'))

    def face_uv(self, points, material, uvs, force_up=False):
        """Faccia con UV esplicite (per i pannelli fotografici)."""
        if len(points) < 3:
            return
        idx = []
        for x, y, z in points:
            idx.append(len(self.verts))
            self.verts.append((float(x), -float(z), float(y)))
        uv = list(uvs)
        if force_up:
            a, b, c = (self.verts[i] for i in idx[:3])
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            if uy * vz - uz * vy < 0:
                idx.reverse()
                uv.reverse()
        self.faces.append(tuple(idx))
        self.mats.append(material)
        self.uvs.append(uv)
        self.tiles.append(TEXTURE_FOR.get(material, 'plain'))

    def flat_poly(self, poly, y, material):
        self.face([(x, y, z) for x, z in poly], material, force_up=True)

    def box(self, x, y0, y1, z, sx, sz, material):
        hx, hz = sx / 2, sz / 2
        coords = [(x - hx, z - hz), (x + hx, z - hz),
                  (x + hx, z + hz), (x - hx, z + hz)]
        bottom = [(px, y0, pz) for px, pz in coords]
        top = [(px, y1, pz) for px, pz in coords]
        for i in range(4):
            j = (i + 1) % 4
            self.face([bottom[i], bottom[j], top[j], top[i]], material)
        self.face(top, material, force_up=True)
        self.face(list(reversed(bottom)), material)

    def extrusion(self, poly, y0, y1, wall_mat, roof_mat):
        n = len(poly)
        if n < 3:
            return
        bottom = [(x, y0, z) for x, z in poly]
        top = [(x, y1, z) for x, z in poly]
        for i in range(n):
            j = (i + 1) % n
            self.face([bottom[i], bottom[j], top[j], top[i]], wall_mat)
        self.face(top, roof_mat, force_up=True)
        self.face(list(reversed(bottom)), wall_mat)

    def pyramid(self, x, y0, y1, z, radius, material, sides=6):
        base = [(x + radius * math.cos(2 * math.pi * i / sides), y0,
                 z + radius * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
        apex = (x, y1, z)
        for i in range(sides):
            self.face([base[i], base[(i + 1) % sides], apex], material, force_up=True)
        self.face(list(reversed(base)), material)

    def prism(self, x, y0, y1, z, radius, material, sides=6):
        ring0 = [(x + radius * math.cos(2 * math.pi * i / sides), y0,
                  z + radius * math.sin(2 * math.pi * i / sides)) for i in range(sides)]
        ring1 = [(p[0], y1, p[2]) for p in ring0]
        for i in range(sides):
            j = (i + 1) % sides
            self.face([ring0[i], ring0[j], ring1[j], ring1[i]], material)
        self.face(ring1, material, force_up=True)
        self.face(list(reversed(ring0)), material)

    def blob(self, x, y, z, radius, material):
        """Ottaedro irregolare: chioma organica low-poly."""
        top = (x, y + radius, z)
        bottom = (x, y - radius * 0.8, z)
        ring = [(x + radius * math.cos(i * math.pi / 2), y,
                 z + radius * math.sin(i * math.pi / 2)) for i in range(4)]
        for i in range(4):
            j = (i + 1) % 4
            self.face([ring[i], ring[j], top], material, force_up=True)
            self.face([ring[j], ring[i], bottom], material)

    def low_detail(self, name):
        """Copia solo la geometria di base: niente finestre, alberi o dettagli."""
        allowed = ('terrain_', 'area_', 'road_', 'wall_', 'roof_', 'water', 'rail')
        low = Chunk(name)
        mapping = {}
        for indices, material, uvs, tile in zip(self.faces, self.mats, self.uvs, self.tiles):
            if not material.startswith(allowed):
                continue
            new_indices = []
            for index in indices:
                if index not in mapping:
                    mapping[index] = len(low.verts)
                    low.verts.append(self.verts[index])
                new_indices.append(mapping[index])
            low.faces.append(tuple(new_indices))
            low.mats.append(material)
            low.uvs.append(uvs)
            low.tiles.append(tile)
        return low

    def gable_roof(self, poly, y, ridge_height, material, overhang=0.35, snow_chunk=None):
        if len(poly) < 3:
            return
        best_i, best_len = 0, -1
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            length = math.hypot(b[0] - a[0], b[1] - a[1])
            if length > best_len:
                best_i, best_len = i, length
        ax, az = poly[best_i]
        bx, bz = poly[(best_i + 1) % len(poly)]
        dx, dz = bx - ax, bz - az
        length = math.hypot(dx, dz)
        if length < 0.01:
            return
        ux, uz = dx / length, dz / length
        nx, nz = -uz, ux
        along = [(p[0] - ax) * ux + (p[1] - az) * uz for p in poly]
        across = [(p[0] - ax) * nx + (p[1] - az) * nz for p in poly]
        lo_a, hi_a = min(along) - overhang, max(along) + overhang
        lo_c, hi_c = min(across) - overhang, max(across) + overhang
        if hi_a - lo_a < 1 or hi_c - lo_c < 1:
            return
        y_top = y + max(0.8, ridge_height)
        def point(a, c, yy):
            return (ax + ux * a + nx * c, yy, az + uz * a + nz * c)
        a0, a1, c0, c1 = lo_a, hi_a, lo_c, hi_c
        mid = (c0 + c1) / 2
        slope_a = [point(a0, c0, y), point(a1, c0, y),
                   point(a1, mid, y_top), point(a0, mid, y_top)]
        slope_b = [point(a0, mid, y_top), point(a1, mid, y_top),
                   point(a1, c1, y), point(a0, c1, y)]
        self.face(slope_a, material, force_up=True)
        self.face(slope_b, material, force_up=True)
        if snow_chunk is not None:
            offset = 0.035
            snow_chunk.face([(p[0], p[1] + offset, p[2]) for p in slope_a], 'snow', force_up=True)
            snow_chunk.face([(p[0], p[1] + offset, p[2]) for p in slope_b], 'snow', force_up=True)
        self.face([point(a0, c0, y), point(a0, mid, y_top), point(a0, c1, y)], material, force_up=True)
        self.face([point(a1, c1, y), point(a1, mid, y_top), point(a1, c0, y)], material, force_up=True)


# --------------------------------------------------------------------------
# Terreno
# --------------------------------------------------------------------------

ORIGIN_LAT = 44.8665
ORIGIN_LON = 10.0612
M_PER_DEG_LAT = 111132.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(ORIGIN_LAT))
FLAT_BOUNDS = {'minX': -1870, 'maxX': 3730, 'minZ': -2040, 'maxZ': 3540}


def clamp(v, a, b):
    return max(a, min(b, v))


def terrain_height(terrain, x, z):
    meta = terrain.get('meta') or {}
    bounds = meta.get('bounds')
    grid = meta.get('grid')
    heights = terrain.get('heights')
    if not bounds or not grid or not heights:
        return 0.0
    lat = ORIGIN_LAT - z / M_PER_DEG_LAT
    lon = ORIGIN_LON + x / M_PER_DEG_LON
    u = clamp((lon - bounds['west']) / (bounds['east'] - bounds['west']), 0, 1)
    v = clamp((bounds['north'] - lat) / (bounds['north'] - bounds['south']), 0, 1)
    gx, gz = u * (grid - 1), v * (grid - 1)
    x0, z0 = int(gx), int(gz)
    x1, z1 = min(x0 + 1, grid - 1), min(z0 + 1, grid - 1)
    fx, fz = gx - x0, gz - z0
    h00 = heights[z0 * grid + x0]
    h10 = heights[z0 * grid + x1]
    h01 = heights[z1 * grid + x0]
    h11 = heights[z1 * grid + x1]
    return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz


def ground_height(terrain, x, z):
    zone = FLAT_BOUNDS
    cx = clamp(x, zone['minX'], zone['maxX'])
    cz = clamp(z, zone['minZ'], zone['maxZ'])
    edge = math.hypot(x - cx, z - cz)
    if edge < 1e-6:
        return 0.0
    return (terrain_height(terrain, x, z) - 72) * clamp(edge / 220, 0, 1)


def build_terrain(chunk, terrain, segments):
    size = 9200.0
    step = size / segments
    half = size / 2
    for iz in range(segments):
        z0 = -half + iz * step
        z1 = z0 + step
        for ix in range(segments):
            x0 = -half + ix * step
            x1 = x0 + step
            corners = [(x0, z0), (x1, z0), (x1, z1), (x0, z1)]
            heights = [ground_height(terrain, x, z) for x, z in corners]
            avg = sum(heights) / 4
            if avg < -5:
                mat = 'terrain_water'
            elif avg > 35:
                mat = 'terrain_high'
            else:
                n = math.sin(x0 * 0.013) * math.cos(z0 * 0.017) + math.sin((x0 + z0) * 0.006) * 0.7
                mat = 'terrain_field' if n > 0.2 else 'terrain_grass'
            chunk.face([(x, h, z) for (x, z), h in zip(corners, heights)], mat, force_up=True)


# --------------------------------------------------------------------------
# Geometria cittadina
# --------------------------------------------------------------------------

def ribbon(chunk, pts, width, y, material):
    for i in range(1, len(pts)):
        ax, az = pts[i - 1]
        bx, bz = pts[i]
        dx, dz = bx - ax, bz - az
        length = math.hypot(dx, dz)
        if length < 0.01:
            continue
        nx, nz = -dz / length * width / 2, dx / length * width / 2
        chunk.face([(ax + nx, y, az + nz), (bx + nx, y, bz + nz),
                    (bx - nx, y, bz - nz), (ax - nx, y, az - nz)], material, force_up=True)


def offset_ribbon(chunk, pts, width, offset, y, material):
    for i in range(1, len(pts)):
        ax, az = pts[i - 1]
        bx, bz = pts[i]
        dx, dz = bx - ax, bz - az
        length = math.hypot(dx, dz)
        if length < 0.01:
            continue
        nx, nz = -dz / length, dx / length
        a = (ax + nx * offset, az + nz * offset)
        b = (bx + nx * offset, bz + nz * offset)
        ribbon(chunk, [a, b], width, y, material)


def curb_ribbon(chunk, pts, offset, y0, y1, material):
    for i in range(1, len(pts)):
        ax, az = pts[i - 1]
        bx, bz = pts[i]
        dx, dz = bx - ax, bz - az
        length = math.hypot(dx, dz)
        if length < 0.01:
            continue
        nx, nz = -dz / length, dx / length
        a = (ax + nx * offset, az + nz * offset)
        b = (bx + nx * offset, bz + nz * offset)
        chunk.face([(a[0], y0, a[1]), (b[0], y0, b[1]),
                    (b[0], y1, b[1]), (a[0], y1, a[1])], material)


def centroid(poly):
    n = len(poly)
    if not n:
        return 0, 0
    return sum(p[0] for p in poly) / n, sum(p[1] for p in poly) / n


def expand_poly(poly, amount):
    cx, cz = centroid(poly)
    out = []
    for x, z in poly:
        dx, dz = x - cx, z - cz
        d = math.hypot(dx, dz) or 1
        out.append((x + dx / d * amount, z + dz / d * amount))
    return out


def nearest_district(x, z, districts):
    best, best_dist = districts[0]['id'] if districts else 'centro', float('inf')
    for d in districts:
        dist = (x - d.get('x', 0)) ** 2 + (z - d.get('z', 0)) ** 2
        if dist < best_dist:
            best, best_dist = d.get('id', 'centro'), dist
    return best


def edge_frame(poly, i):
    n = len(poly)
    a, b = poly[i], poly[(i + 1) % n]
    dx, dz = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dz) or 1
    tx, tz = dx / length, dz / length
    nx, nz = -tz, tx
    cx, cz = centroid(poly)
    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    if (mx - cx) * nx + (mz - cz) * nz < 0:
        nx, nz = -nx, -nz
        tx, tz = -tx, -tz
        a, b = b, a
    return a, length, tx, tz, nx, nz


def add_openings(chunk, window_chunks, b, wall, frame, sill, shutter, glass):
    """Finestre, porte, balconi: geometria sottile e vetro separato."""
    poly = b.get('poly') or []
    if len(poly) < 3:
        return
    h = float(b.get('h') or 6)
    levels = clamp(int(b.get('levels') or 2), 1, 5)
    floors = min(levels, max(1, int((h - 1.2) / 3.0)))
    style = b.get('facadeStyle') or ''
    for i in range(len(poly)):
        a, length, tx, tz, nx, nz = edge_frame(poly, i)
        if length < 2.6:
            continue
        count = 1 if length < 7 else 2
        for floor in range(floors):
            y = 1.25 + floor * 3.0
            if y + 0.8 > h - 0.35:
                continue
            for k in range(count):
                t = (k + 1) * length / (count + 1)
                px = a[0] + tx * t + nx * 0.07
                pz = a[1] + tz * t + nz * 0.07
                w, wh = 0.92, 1.30
                def point(u, yy):
                    return (px + tx * u, yy, pz + tz * u)
                y0, y1 = y - wh / 2, y + wh / 2
                # telaio (4 strisce)
                fw = 0.10
                chunk.face([point(-w / 2 - fw, y0 - fw), point(w / 2 + fw, y0 - fw),
                            point(w / 2 + fw, y0), point(-w / 2 - fw, y0)], frame)
                chunk.face([point(-w / 2 - fw, y1), point(w / 2 + fw, y1),
                            point(w / 2 + fw, y1 + fw), point(-w / 2 - fw, y1 + fw)], frame)
                chunk.face([point(-w / 2 - fw, y0), point(-w / 2, y0),
                            point(-w / 2, y1), point(-w / 2 - fw, y1)], frame)
                chunk.face([point(w / 2, y0), point(w / 2 + fw, y0),
                            point(w / 2 + fw, y1), point(w / 2, y1)], frame)
                # vetro: categoria stabile per finestra (warm / cool / dark)
                seed = hash((b.get('id'), i, floor, k)) & 0xffffffff
                category = ('dark', 'warm', 'cool')[seed % 3]
                wchunk = window_chunks[category]
                wchunk.face([point(-w / 2, y0), point(w / 2, y0),
                             point(w / 2, y1), point(-w / 2, y1)], glass)
                # tenda dietro alcune finestre
                if seed % 5 == 0:
                    chunk.face([point(-w / 2 + 0.06, y0 + 1.0), point(w / 2 - 0.06, y0 + 1.0),
                                point(w / 2 - 0.06, y1), point(-w / 2 + 0.06, y1)], 'trim')
                # davanzale
                chunk.face([
                    (px + tx * (-w / 2 - 0.16), y0 - 0.04, pz + tz * (-w / 2 - 0.16)),
                    (px + tx * (w / 2 + 0.16), y0 - 0.04, pz + tz * (w / 2 + 0.16)),
                    (px + tx * (w / 2 + 0.16) + nx * 0.2, y0 - 0.04, pz + tz * (w / 2 + 0.16) + nz * 0.2),
                    (px + tx * (-w / 2 - 0.16) + nx * 0.2, y0 - 0.04, pz + tz * (-w / 2 - 0.16) + nz * 0.2),
                ], sill, force_up=True)
                # persiane
                if style in ('rural', 'historic') and k == 0:
                    for side in (-1, 1):
                        off = side * (w / 2 + 0.18)
                        chunk.face([point(off - 0.13, y0), point(off + 0.13, y0),
                                    point(off + 0.13, y1), point(off - 0.13, y1)], shutter)

    # Porta sull'edge piu' lungo
    best_i = max(range(len(poly)), key=lambda i: math.hypot(
        poly[(i + 1) % len(poly)][0] - poly[i][0], poly[(i + 1) % len(poly)][1] - poly[i][1]))
    a, length, tx, tz, nx, nz = edge_frame(poly, best_i)
    if length > 1.8:
        cx = a[0] + tx * length / 2 + nx * 0.08
        cz = a[1] + tz * length / 2 + nz * 0.08
        def dp(u, yy):
            return (cx + tx * u, yy, cz + tz * u)
        chunk.face([dp(-0.62, 0.08), dp(0.62, 0.08), dp(0.62, 2.4), dp(-0.62, 2.4)], shutter)
        chunk.face([dp(-0.70, 0.05), dp(0.70, 0.05), dp(0.70, 0.12), dp(-0.70, 0.12)], frame)

    # Balcone per edifici urbani/storici alti
    if style in ('urban', 'historic', 'civic') and h > 9 and len(poly) >= 4:
        a, length, tx, tz, nx, nz = edge_frame(poly, 0)
        if length > 4:
            y = 3.6
            mid = length / 2
            slab = [
                (a[0] + tx * (mid - 1.4), y, a[1] + tz * (mid - 1.4)),
                (a[0] + tx * (mid + 1.4), y, a[1] + tz * (mid + 1.4)),
                (a[0] + tx * (mid + 1.4) + nx * 1.1, y, a[1] + tz * (mid + 1.4) + nz * 1.1),
                (a[0] + tx * (mid - 1.4) + nx * 1.1, y, a[1] + tz * (mid - 1.4) + nz * 1.1),
            ]
            chunk.face(slab, 'trim', force_up=True)
            outer = slab[2], slab[3]
            chunk.face([(outer[0][0], y, outer[0][2]), (outer[1][0], y, outer[1][2]),
                        (outer[1][0], y + 0.9, outer[1][2]), (outer[0][0], y + 0.9, outer[0][2])], frame)


LANDMARK_NAMES = {
    'Cattedrale di San Donnino', 'Porta di San Donnino',
    'Teatro Girolamo Magnani', 'Santuario della Gran Madre di Dio',
    'Chiesa di San Pietro', 'Fidenza',
}


def add_tree(chunk, x, z, height, light=False):
    chunk.prism(x, 0, height * 0.52, z, 0.26, 'wood', 6)
    foliage = 'foliage_light' if light else 'foliage'
    chunk.blob(x, height * 0.72, z, height * 0.29, foliage)
    chunk.blob(x + 0.8, height * 0.58, z + 0.4, height * 0.22, foliage)
    chunk.blob(x - 0.6, height * 0.62, z - 0.5, height * 0.21, 'foliage_light' if light else 'foliage')


def nearest_road_direction(x, z, roads):
    best, best_dist = None, float('inf')
    for road in roads:
        pts = road.get('pts') or []
        for i in range(1, len(pts)):
            ax, az = pts[i - 1]
            bx, bz = pts[i]
            dx, dz = bx - ax, bz - az
            length2 = dx * dx + dz * dz
            if length2 < 0.01:
                continue
            t = clamp(((x - ax) * dx + (z - az) * dz) / length2, 0, 1)
            px, pz = ax + dx * t, az + dz * t
            dist = (x - px) ** 2 + (z - pz) ** 2
            if dist < best_dist:
                best_dist = dist
                length = math.sqrt(length2)
                best = (dx / length, dz / length)
    return best or (1.0, 0.0)


def add_crosswalks(chunk, city):
    roads = city.get('roads') or []
    for crossing in city.get('crossings') or []:
        x, z = crossing.get('x', 0), crossing.get('z', 0)
        ux, uz = nearest_road_direction(x, z, roads)
        nx, nz = -uz, ux
        for i in range(5):
            t = (i - 2) * 0.75
            cx, cz = x + ux * t, z + uz * t
            chunk.face([
                (cx - nx * 1.2 - ux * 0.22, 0.075, cz - nz * 1.2 - uz * 0.22),
                (cx + nx * 1.2 - ux * 0.22, 0.075, cz + nz * 1.2 - uz * 0.22),
                (cx + nx * 1.2 + ux * 0.22, 0.075, cz + nz * 1.2 + uz * 0.22),
                (cx - nx * 1.2 + ux * 0.22, 0.075, cz - nz * 1.2 + uz * 0.22),
            ], 'marking', force_up=True)


def build_city_chunks(city, districts, window_chunks, snow_chunk):
    chunks = {d['id']: Chunk('quartiere-' + d['id']) for d in districts}
    fallback = Chunk('quartiere-centro')
    chunks.setdefault('centro', fallback)

    def pick(x, z):
        return chunks.get(nearest_district(x, z, districts), fallback)

    for area in city.get('areas', []):
        poly = area.get('poly') or []
        if len(poly) >= 3:
            x, z = centroid(poly)
            pick(x, z).flat_poly(poly, 0.025, area_key(area.get('kind')))

    for water in city.get('waterways', []):
        pts = water.get('pts') or []
        if len(pts) >= 2:
            x, z = centroid(pts)
            ribbon(pick(x, z), pts, 3.2, 0.045, 'water')

    for rail in city.get('railways', []):
        pts = rail.get('pts') or []
        if len(pts) >= 2:
            x, z = centroid(pts)
            ribbon(pick(x, z), pts, 2.4, 0.075, 'rail')

    for road in city.get('roads', []):
        pts = road.get('pts') or []
        if len(pts) < 2:
            continue
        x, z = centroid(pts)
        chunk = pick(x, z)
        surface = road.get('surface') or ''
        mat = 'road_pavement' if surface in ('paving_stones', 'sett', 'concrete', 'bricks') else 'road_asphalt'
        width = max(2.5, road.get('w') or 6)
        ribbon(chunk, pts, width, 0.055, mat)
        if road.get('kind') in ('primary', 'secondary', 'tertiary', 'residential', 'living_street'):
            off = width / 2 + 0.9
            offset_ribbon(chunk, pts, 1.35, off, 0.115, 'road_pavement')
            offset_ribbon(chunk, pts, 1.35, -off, 0.115, 'road_pavement')
            curb_ribbon(chunk, pts, width / 2, 0.055, 0.115, 'trim')
            curb_ribbon(chunk, pts, -width / 2, 0.055, 0.115, 'trim')

    add_crosswalks(fallback, city)

    for building in city.get('buildings', []):
        poly = building.get('poly') or []
        if len(poly) < 3 or building.get('name') in LANDMARK_NAMES:
            continue
        x, z = centroid(poly)
        chunk = pick(x, z)
        h = float(building.get('h') or 6)
        wall = wall_key(building)
        roof = roof_key(building)
        chunk.extrusion(poly, 0.06, h + 0.06, wall, roof)
        chunk.extrusion(expand_poly(poly, 0.18), h - 0.32, h + 0.04, 'trim', 'trim')
        shape = (building.get('roofShape') or '').lower()
        if shape and shape not in ('flat', 'none'):
            ridge = float(building.get('roofHeight') or 0) or h * 0.28
            chunk.gable_roof(expand_poly(poly, 0.35), h + 0.06, ridge, roof, snow_chunk=snow_chunk)
        add_openings(chunk, window_chunks, building, wall, 'trim', 'trim', 'shutter', 'window_glass')
        if hash(str(building.get('id'))) % 4 == 0:
            chunk.box(x + 0.8, h + 0.2, h + 1.8, z - 0.6, 0.8, 0.8, 'wall_brick')

    for tree in city.get('trees', []):
        x, z = tree.get('x', 0), tree.get('z', 0)
        add_tree(pick(x, z), x, z, float(tree.get('height') or 9),
                 'light' in (tree.get('leaf') or ''))

    for row in city.get('treeRows', []):
        pts = row.get('pts') or []
        step = max(1, len(pts) // 8)
        for i in range(0, len(pts), step):
            x, z = pts[i]
            add_tree(pick(x, z), x, z, 8.5, i % 2 == 0)

    for item in city.get('streetFurniture', []):
        x, z = item.get('x', 0), item.get('z', 0)
        kind = item.get('type') or ''
        chunk = pick(x, z)
        if kind == 'bench':
            chunk.box(x, 0.2, 0.7, z, 1.8, 0.6, 'wood')
        elif kind in ('waste_basket', 'bollard', 'gate', 'bicycle_parking'):
            chunk.box(x, 0, 1.0, z, 0.5, 0.5, 'rail')
        else:
            chunk.box(x, 0, 0.9, z, 0.6, 0.6, 'wall_stone')

    for barrier in city.get('barriers', []):
        pts = barrier.get('pts') or []
        if len(pts) >= 2:
            x, z = centroid(pts)
            ribbon(pick(x, z), pts, 0.35, float(barrier.get('height') or 1.2) / 2, 'wall_stone')

    return chunks


# --------------------------------------------------------------------------
# Blender: oggetti, UV, AO, export
# --------------------------------------------------------------------------

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def make_object(chunk, materials, material_keys=None):
    mesh = bpy.data.meshes.new(chunk.name)
    mesh.from_pydata(chunk.verts, [], chunk.faces)
    mesh.update()
    keys = list(material_keys or PALETTE)
    for name in keys:
        mesh.materials.append(materials[name])
    uv_layer = mesh.uv_layers.new(name='UVMap')
    for polygon, material_name, uvs in zip(mesh.polygons, chunk.mats, chunk.uvs):
        polygon.material_index = keys.index(material_name)
        polygon.use_smooth = chunk.name.startswith('terreno')
        for loop_index, uv in zip(polygon.loop_indices, uvs):
            uv_layer.data[loop_index].uv = (uv[0] - math.floor(uv[0]),
                                            uv[1] - math.floor(uv[1]))
    tint = mesh.color_attributes.new(name='Tint', type='BYTE_COLOR', domain='CORNER')
    ao = mesh.color_attributes.new(name='AO', type='BYTE_COLOR', domain='CORNER')
    mesh.color_attributes.active_color = ao
    for polygon, material_name in zip(mesh.polygons, chunk.mats):
        # L'atlas contiene gia' il colore del materiale: il vertex color serve
        # solo per una leggera modulazione di luminosita', non per colorare.
        rgb = hex_to_srgb(PALETTE.get(material_name, '#ffffff')) or (1, 1, 1)
        lum = 0.30 * rgb[0] + 0.59 * rgb[1] + 0.11 * rgb[2]
        factor = 0.88 + 0.24 * lum
        tint_color = (factor, factor, factor, 1.0)
        for loop_index in polygon.loop_indices:
            tint.data[loop_index].color = tint_color
            ao.data[loop_index].color = (1.0, 1.0, 1.0, 1.0)
    obj = bpy.data.objects.new(chunk.name, mesh)
    bpy.context.collection.objects.link(obj)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.0005)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    return obj


def combine_colors(objects):
    """Moltiplica AO bake per il tint del materiale -> unico COLOR_0."""
    for obj in objects:
        mesh = obj.data
        ao = mesh.color_attributes.get('AO')
        tint = mesh.color_attributes.get('Tint')
        if not ao or not tint:
            continue
        for i in range(len(ao.data)):
            a = ao.data[i].color
            t = tint.data[i].color
            # Evita ombre nere profonde: AO resta in [0.5, 1].
            value = (0.5 + 0.5 * a[0]) * t[0]
            ao.data[i].color = (value, value, value, 1.0)
        mesh.color_attributes.active_color = ao


def analytic_ao(objects):
    """Fallback: vertex color in base all'altezza (接触 shadow vicino al suolo)."""
    for obj in objects:
        mesh = obj.data
        layer = mesh.color_attributes.get('AO')
        if not layer:
            continue
        terrain = obj.name.startswith('terreno')
        for loop in mesh.loops:
            z = mesh.vertices[loop.vertex_index].co.z
            value = 1.0 if terrain else 0.58 + 0.42 * clamp(z / 4.5, 0, 1)
            layer.data[loop.index].color = (value, value, value, 1.0)


def bake_ao(objects, samples):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = samples
    scene.render.bake.target = 'VERTEX_COLORS'
    scene.render.bake.max_ray_distance = 7.0
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.use_pass_color = False
    for obj in objects:
        bpy.ops.object.select_all(action='DESELECT')
        for other in objects:
            other.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.bake(type='AO')
    bpy.ops.object.select_all(action='DESELECT')


def export_scene(objects, path):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials='EXPORT',
        export_normals=True,
        export_texcoords=True,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_vertex_color='ACTIVE',
        export_image_format='AUTO',
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=8,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_draco_color_quantization=10,
    )


def render_preview(path):
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = path
    bpy.ops.object.select_all(action='DESELECT')
    cam_data = bpy.data.cameras.new('preview-camera')
    cam_data.type = 'ORTHO'
    cam_data.ortho_scale = 8500
    cam_data.clip_end = 20000
    cam = bpy.data.objects.new('preview-camera', cam_data)
    scene.collection.objects.link(cam)
    cam.location = (0, 0, 7000)
    cam.rotation_euler = (0, 0, 0)
    scene.camera = cam
    bpy.ops.render.render(write_still=True)


def main():
    args = parse_args()
    root = os.getcwd()
    out_dir = os.path.join(root, args.out)
    os.makedirs(out_dir, exist_ok=True)
    texture_dir = os.path.join(out_dir, 'textures')

    with open(os.path.join(root, args.data), encoding='utf8') as fh:
        city = json.load(fh)
    with open(os.path.join(root, args.terrain), encoding='utf8') as fh:
        terrain = json.load(fh)
    with open(os.path.join(root, args.map), encoding='utf8') as fh:
        map_data = json.load(fh)

    districts = map_data.get('districts') or []
    clear_scene()
    texture_data = texgen.generate_all(texture_dir)
    materials = make_materials(texture_data)

    terrain_chunk = Chunk('terreno')
    build_terrain(terrain_chunk, terrain, args.terrain_segments)
    window_chunks = {
        'warm': Chunk('finestre-warm'),
        'cool': Chunk('finestre-cool'),
        'dark': Chunk('finestre-dark'),
    }
    snow_chunk = Chunk('neve-tetti')
    city_chunks = build_city_chunks(city, districts, window_chunks, snow_chunk)

    all_chunks = {'terreno': terrain_chunk}
    all_chunks.update({k: v for k, v in city_chunks.items() if v.faces})
    for category, wchunk in window_chunks.items():
        if wchunk.faces:
            all_chunks['finestre-' + category] = wchunk
    if snow_chunk.faces:
        all_chunks['neve-tetti'] = snow_chunk

    landmark_models = []
    for landmark in map_data.get('landmarks') or []:
        chunk = Chunk('landmark-' + str(landmark.get('id')))
        if build_landmarks.build(chunk, landmark):
            all_chunks['landmark-' + str(landmark.get('id'))] = chunk
            landmark_models.append(landmark.get('id'))

    objects = []
    manifest_chunks = []
    for key, chunk in all_chunks.items():
        if chunk.name.startswith('quartiere-'):
            chunk.name = chunk.name + '-hi'
        obj = make_object(chunk, materials)
        objects.append(obj)
        manifest_chunks.append({
            'id': key, 'object': chunk.name,
            'faces': len(obj.data.polygons), 'vertices': len(obj.data.vertices),
        })
        print(f'{chunk.name}: {len(chunk.faces)} facce, {len(chunk.verts)} vertici')
        if chunk.name.endswith('-hi'):
            low = chunk.low_detail(chunk.name[:-3] + '-lo')
            if low.faces:
                low_obj = make_object(low, materials)
                objects.append(low_obj)
                manifest_chunks.append({
                    'id': key + '-lo', 'object': low.name,
                    'faces': len(low_obj.data.polygons), 'vertices': len(low_obj.data.vertices),
                })
                print(f'{low.name}: {len(low.faces)} facce')

    if args.no_ao:
        analytic_ao(objects)
    else:
        try:
            print(f'Bake AO ({args.ao_samples} sample)…')
            bake_ao(objects, args.ao_samples)
        except Exception as err:
            print('AO bake non riuscito, uso AO analitico:', err)
            analytic_ao(objects)

    combine_colors(objects)
    glb_path = os.path.join(out_dir, 'fidenza-realistic.glb')
    export_scene(objects, glb_path)

    manifest = {
        'version': 2,
        'file': 'fidenza-realistic.glb',
        'windowObject': 'finestre',
        'generator': 'fidenza-v4 Blender realistic PBR',
        'attribution': 'OpenStreetMap (ODbL), AWS Terrarium / EU-DEM, ArnisWorld3',
        'landmarkModels': landmark_models,
        'legacyChunks': ['terreno.glb', 'centro.glb', 'monica.glb', 'sanlazzaro.glb',
                         'azalee.glb', 'corea.glb', 'luce.glb', 'coduro.glb'],
        'coordinateNote': 'Blender (x, -z, y) -> glTF Y-up -> Three (x, y, z)',
        'chunks': manifest_chunks,
    }
    with open(os.path.join(out_dir, 'manifest.json'), 'w', encoding='utf8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)

    if args.preview:
        render_preview(os.path.join(out_dir, 'preview-realistic.png'))

    total = sum(c['faces'] for c in manifest_chunks)
    print(f'Totale: {total} facce -> {glb_path}')


if __name__ == '__main__':
    main()
