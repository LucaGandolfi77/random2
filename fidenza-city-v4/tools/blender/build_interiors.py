"""
Interni PBR di Fidenza v4.3 — modellati in Blender con texture fotografiche CC.

Legge data/map.json (posizioni di landmark e locali) e le texture scaricate da
fetch-interior-textures.mjs. Esporta interiors.glb con un nodo per edificio e
interiors-manifest.json con porte, spawn e collider per la runtime.
"""

import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_blender_city import Chunk, clear_scene, export_scene, make_materials, texgen

BASE = './assets/textures/interiors/'


def photo_materials(manifest, root):
    materials = {}
    for entry in manifest:
        name = 'photo_' + os.path.splitext(entry['local'])[0]
        path = os.path.join(root, 'assets/textures/interiors', entry['local'])
        if not os.path.exists(path):
            continue
        image = bpy.data.images.load(path, check_existing=True)
        # Riduce il peso delle texture incorporate nel GLB.
        if max(image.size) > 768:
            scale = 768 / max(image.size)
            image.scale(max(1, int(image.size[0] * scale)), max(1, int(image.size[1] * scale)))
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        mat.use_backface_culling = False
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        bsdf = nodes.get('Principled BSDF')
        bsdf.inputs['Roughness'].default_value = 0.9
        tnode = nodes.new('ShaderNodeTexImage')
        tnode.image = image
        links.new(tnode.outputs['Color'], bsdf.inputs['Base Color'])
        materials[name] = mat
    return materials


def panel(chunk, points, material):
    """Pannello fotografico con UV 0..1."""
    chunk.face_uv(points, material, [(0, 0), (1, 0), (1, 1), (0, 1)])


def box(chunk, x, y0, y1, z, sx, sz, material):
    chunk.box(x, y0, y1, z, sx, sz, material)


def room(chunk, cx, cz, w, d, h, floor, wall, ceiling, door_width=2.4):
    """Stanza rettangolare con porta al centro del lato sud. Ritorna collider."""
    x0, x1 = cx - w / 2, cx + w / 2
    z0, z1 = cz - d / 2, cz + d / 2
    chunk.flat_poly([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], 0.1, floor)
    chunk.face([(x0, h, z0), (x1, h, z0), (x1, h, z1), (x0, h, z1)], ceiling, force_up=True)
    # pareti
    chunk.face([(x0, 0.1, z1), (x1, 0.1, z1), (x1, h, z1), (x0, h, z1)], wall)
    chunk.face([(x0, 0.1, z0), (x0, 0.1, z1), (x0, h, z1), (x0, h, z0)], wall)
    chunk.face([(x1, 0.1, z1), (x1, 0.1, z0), (x1, h, z0), (x1, h, z1)], wall)
    gap = door_width / 2
    chunk.face([(x0, 0.1, z0), (cx - gap, 0.1, z0), (cx - gap, h, z0), (x0, h, z0)], wall)
    chunk.face([(cx + gap, 0.1, z0), (x1, 0.1, z0), (x1, h, z0), (cx + gap, h, z0)], wall)
    # architrave sopra la porta
    chunk.face([(cx - gap, 2.7, z0), (cx + gap, 2.7, z0),
                (cx + gap, h, z0), (cx - gap, h, z0)], wall)
    colliders = [
        [x0, z1, x1, z1], [x0, z0, x0, z1], [x1, z1, x1, z0],
        [x0, z0, cx - gap, z0], [cx + gap, z0, x1, z0],
    ]
    return {
        'door': [round(cx, 2), round(z0, 2)],
        'spawn': [round(cx, 2), round(z0 + 2.0, 2)],
        'bounds': [round(x0, 2), round(z0, 2), round(x1, 2), round(z1, 2)],
        'colliders': colliders,
    }


def columns(chunk, cx, cz, w, d, h, count=4, material='wall_stone'):
    for i in range(count + 1):
        z = cz - d / 2 + 1.5 + i * (d - 3) / max(1, count)
        for sx in (-1, 1):
            x = cx + sx * (w * 0.22)
            chunk.prism(x, 0.1, h, z, 0.55, material, 8)
            chunk.box(x, h - 0.35, h, z, 1.5, 1.5, 'trim')


def pews(chunk, cx, cz, w, d, rows=6, material='wood'):
    for i in range(rows):
        z = cz - d / 2 + 3.5 + i * 2.2
        for side in (-1, 1):
            x = cx + side * w * 0.22
            box(chunk, x, 0.1, 0.6, z, w * 0.3, 0.7, material)
            box(chunk, x, 0.6, 1.2, z + 0.35, w * 0.3, 0.18, material)


def altar(chunk, cx, cz, material='wall_white'):
    box(chunk, cx, 0.1, 1.5, cz, 3.0, 1.6, material)
    box(chunk, cx, 1.5, 1.8, cz, 3.4, 2.0, 'trim')
    for dx in (-1.2, 0, 1.2):
        chunk.prism(cx + dx, 1.8, 2.6, cz, 0.12, 'wall_white', 6)


def counter(chunk, cx, cz, w, material='wood'):
    box(chunk, cx, 0.1, 1.15, cz, w, 1.1, material)
    box(chunk, cx, 1.15, 1.25, cz, w + 0.3, 1.3, 'trim')
    # macchina espresso
    box(chunk, cx - w * 0.22, 1.25, 1.95, cz, 1.1, 0.7, 'rail')
    for i in range(3):
        chunk.prism(cx - w * 0.22 + (i - 1) * 0.3, 1.35, 1.6, cz + 0.4, 0.07, 'rail', 6)


def tables(chunk, cx, cz, w, d, count=6, material='wood'):
    for i in range(count):
        x = cx - w / 2 + 2.2 + (i % 3) * (w - 4.4) / 2
        z = cz - d / 2 + 4 + (i // 3) * 3.0
        chunk.prism(x, 0.1, 0.8, z, 0.75, material, 8)
        chunk.prism(x, 0.8, 0.88, z, 0.85, 'trim', 10)
        for j in range(2):
            chunk.prism(x + (j - 0.5) * 1.6, 0.1, 0.55, z, 0.28, 'wood', 6)


def bar_interior(chunk, landmark, photos, accent='wall_terracotta'):
    cx, cz = landmark['x'], landmark['z']
    info = room(chunk, cx, cz, 14, 12, 4.2, 'road_pavement', accent, 'trim')
    counter(chunk, cx, cz - 3.5, 7)
    tables(chunk, cx, cz, 14, 12, 6)
    for i in range(4):
        chunk.prism(cx - 2.6 + i * 1.7, 0.1, 1.1, cz - 5.4, 0.3, 'wood', 6)
    if 'photo_bar-gritti' in photos:
        panel(chunk, [(cx - 5.5, 1.2, cz + 5.88), (cx - 3, 1.2, cz + 5.88),
                      (cx - 3, 3.2, cz + 5.88), (cx - 5.5, 3.2, cz + 5.88)], 'photo_bar-gritti')
    if 'photo_bar-tropea' in photos:
        panel(chunk, [(cx + 2.5, 1.2, cz + 5.88), (cx + 5.5, 1.2, cz + 5.88),
                      (cx + 5.5, 3.2, cz + 5.88), (cx + 2.5, 3.2, cz + 5.88)], 'photo_bar-tropea')
    if landmark.get('id') == 'bar-blu-piramide':
        box(chunk, cx, 3.4, 4.0, cz - 5.85, 6, 0.2, 'wall_white')
    return info


def duomo_interior(chunk, landmark, photos):
    cx, cz = landmark['x'], landmark['z']
    info = room(chunk, cx, cz, 22, 34, 14, 'road_pavement', 'wall_stone', 'roof_tile', 3.2)
    columns(chunk, cx, cz, 22, 34, 11, 5)
    pews(chunk, cx, cz, 22, 34, 8)
    altar(chunk, cx, cz + 12)
    # organo sopra l'ingresso
    if 'photo_duomo-organo' in photos:
        panel(chunk, [(cx - 3.2, 7, cz - 16.85), (cx + 3.2, 7, cz - 16.85),
                      (cx + 3.2, 11, cz - 16.85), (cx - 3.2, 11, cz - 16.85)], 'photo_duomo-organo')
    if 'photo_duomo-cristo-antelami' in photos:
        panel(chunk, [(cx - 2.4, 4, cz + 16.85), (cx + 2.4, 4, cz + 16.85),
                      (cx + 2.4, 9, cz + 16.85), (cx - 2.4, 9, cz + 16.85)], 'photo_duomo-cristo-antelami')
    if 'photo_duomo-presbiterio' in photos:
        panel(chunk, [(cx - 7, 2, cz + 16.8), (cx - 2.8, 2, cz + 16.8),
                      (cx - 2.8, 8, cz + 16.8), (cx - 7, 8, cz + 16.8)], 'photo_duomo-presbiterio')
    if 'photo_duomo-navata' in photos:
        panel(chunk, [(cx - 10.85, 3, cz - 6), (cx - 10.85, 3, cz + 6),
                      (cx - 10.85, 10, cz + 6), (cx - 10.85, 10, cz - 6)], 'photo_duomo-navata')
    # cripta: vano laterale con arca
    ccx, ccz = cx + 14, cz - 8
    room(chunk, ccx, ccz, 8, 8, 4.5, 'road_pavement', 'wall_stone', 'roof_tile', 0)
    columns(chunk, ccx, ccz, 8, 8, 4, 2)
    if 'photo_duomo-arca' in photos:
        panel(chunk, [(ccx - 2.2, 0.8, ccz + 3.85), (ccx + 2.2, 0.8, ccz + 3.85),
                      (ccx + 2.2, 3.6, ccz + 3.85), (ccx - 2.2, 3.6, ccz + 3.85)], 'photo_duomo-arca')
    if 'photo_duomo-cripta' in photos:
        panel(chunk, [(ccx - 3.85, 1, ccz - 2), (ccx - 3.85, 1, ccz + 2),
                      (ccx - 3.85, 3.5, ccz + 2), (ccx - 3.85, 3.5, ccz - 2)], 'photo_duomo-cripta')
    return info


def teatro_interior(chunk, landmark, photos):
    cx, cz = landmark['x'], landmark['z']
    info = room(chunk, cx, cz, 22, 26, 11, 'road_pavement', 'wall_white', 'trim', 3)
    box(chunk, cx, 0.1, 1.2, cz + 9, 18, 4, 'roof_tile')
    box(chunk, cx, 1.2, 7, cz + 10.8, 18, 0.5, 'shutter')
    for row in range(5):
        z = cz - 9 + row * 3
        for i in range(9):
            x = cx - 8 + i * 2
            box(chunk, x, 0.4 + row * 0.45, 0.9 + row * 0.45, z, 1.5, 0.8, 'shutter')
    for side in (-1, 1):
        for level in range(2):
            box(chunk, cx + side * 10.7, 2 + level * 3.5, 5 + level * 3.5, cz, 0.4, 20, 'wall_terracotta')
    if 'photo_teatro-soffitto' in photos:
        chunk.face_uv([(cx - 9, 10.85, cz - 10), (cx + 9, 10.85, cz - 10),
                       (cx + 9, 10.85, cz + 10), (cx - 9, 10.85, cz + 10)],
                      'photo_teatro-soffitto', [(0, 0), (1, 0), (1, 1), (0, 1)])
    if 'photo_teatro-sipario' in photos:
        panel(chunk, [(cx - 8, 1.2, cz + 10.5), (cx + 8, 1.2, cz + 10.5),
                      (cx + 8, 8, cz + 10.5), (cx - 8, 8, cz + 10.5)], 'photo_teatro-sipario')
    if 'photo_teatro-sala' in photos:
        panel(chunk, [(cx - 10.85, 2, cz - 5), (cx - 10.85, 2, cz + 5),
                      (cx - 10.85, 9, cz + 5), (cx - 10.85, 9, cz - 5)], 'photo_teatro-sala')
    return info


def generic_hall(chunk, landmark, photos, photo_key=None, kind='comune'):
    cx, cz = landmark['x'], landmark['z']
    info = room(chunk, cx, cz, 16, 14, 6, 'road_pavement', 'wall_stone', 'trim')
    if kind == 'comune':
        box(chunk, cx, 0.1, 1.3, cz + 4, 10, 1.2, 'wood')
        for i in range(6):
            box(chunk, cx - 4 + i * 1.6, 1.3, 1.7, cz + 3.5, 0.7, 0.7, 'trim')
    elif kind == 'stazione':
        for i in range(4):
            box(chunk, cx - 5 + i * 3.2, 0.1, 0.6, cz + 2, 2.4, 0.8, 'wood')
        box(chunk, cx, 1.2, 2.4, cz + 6.85, 8, 0.3, 'wall_white')
    else:  # chiese
        altar(chunk, cx, cz + 5)
        pews(chunk, cx, cz, 16, 14, 4)
    if photo_key and photo_key in photos:
        panel(chunk, [(cx - 3, 1.5, cz + 6.85), (cx + 3, 1.5, cz + 6.85),
                      (cx + 3, 5, cz + 6.85), (cx - 3, 5, cz + 6.85)], photo_key)
    return info


def main():
    root = os.getcwd()
    map_data = json.load(open(os.path.join(root, 'data/map.json'), encoding='utf8'))
    texture_manifest = json.load(open(os.path.join(root, 'tools/blender/interior-textures.json'), encoding='utf8'))
    out_dir = os.path.join(root, 'assets/3d/blender-city')
    os.makedirs(out_dir, exist_ok=True)

    clear_scene()
    texture_data = texgen.generate_all(os.path.join(out_dir, 'textures'))
    materials = make_materials(texture_data)
    photos = photo_materials(texture_manifest, root)
    materials.update(photos)
    keys = list(materials)

    landmarks = {l['id']: l for l in map_data.get('landmarks') or []}
    venues = {v['id']: v for v in map_data.get('venues') or []}

    interiors = []
    manifest = {
        'version': 1,
        'file': 'interiors.glb',
        'attribution': 'Wikimedia Commons, CC BY-SA / CC BY / CC0 — vedi assets/textures/interiors/SOURCES.md',
        'interiors': [],
    }

    def add(identifier, label, builder):
        chunk = Chunk('interior-' + identifier)
        info = builder(chunk)
        obj = __import__('build_blender_city').make_object(chunk, materials, keys)
        interiors.append(obj)
        manifest['interiors'].append({
            'id': identifier, 'name': label,
            'object': 'interior-' + identifier,
            'faces': len(chunk.faces),
            **info,
        })
        print(f'interior-{identifier}: {len(chunk.faces)} facce')

    add('duomo', 'Duomo di San Donnino', lambda c: duomo_interior(c, landmarks['duomo'], photos))
    add('teatro', 'Teatro Girolamo Magnani', lambda c: teatro_interior(c, landmarks['teatro'], photos))
    for venue_id, venue in venues.items():
        accent = 'wall_white' if venue_id == 'bar-blu-piramide' else 'wall_terracotta'
        add(venue_id, venue.get('name', venue_id),
            lambda c, v=venue, a=accent: bar_interior(c, v, photos, a))
    add('comunale', 'Palazzo Comunale',
        lambda c: generic_hall(c, landmarks['comunale'], photos, 'photo_comune-cortile', 'comune'))
    add('stazione', 'Stazione',
        lambda c: generic_hall(c, landmarks['stazione'], photos, 'photo_stazione-interno', 'stazione'))
    add('granmadre', 'Santuario della Gran Madre',
        lambda c: generic_hall(c, landmarks['granmadre'], photos, 'photo_duomo-navata', 'church'))
    add('sanpietro', 'Chiesa di San Pietro',
        lambda c: generic_hall(c, landmarks['sanpietro'], photos, 'photo_duomo-cripta', 'church'))

    export_scene(interiors, os.path.join(out_dir, 'interiors.glb'))
    with open(os.path.join(out_dir, 'interiors-manifest.json'), 'w', encoding='utf8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f'{len(interiors)} interni -> interiors.glb')


if __name__ == '__main__':
    main()
