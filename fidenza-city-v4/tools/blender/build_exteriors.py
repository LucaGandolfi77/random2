"""
Esterni HD di Fidenza v4.4 — facciate fotografiche + dettagli in rilievo.

Legge data/map.json e tools/blender/exterior-textures.json. Esporta
landmarks-hd.glb con nodi landmark-hd-<id> che sostituiscono i vecchi landmark
semplificati nel GLB principale. Le foto coprono solo la facciata principale;
fianchi e retro restano in PBR procedurale.
"""

import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_blender_city import Chunk, clear_scene, export_scene, make_materials, texgen

BASE = './assets/textures/exteriors/'


def photo_materials(manifest, root):
    materials = {}
    images = {}
    for entry in manifest:
        name = 'photo_' + os.path.splitext(entry['local'])[0]
        path = os.path.join(root, 'assets/textures/exteriors', entry['local'])
        if not os.path.exists(path):
            continue
        image = bpy.data.images.load(path, check_existing=True)
        if max(image.size) > 1024:
            scale = 1024 / max(image.size)
            image.scale(max(1, int(image.size[0] * scale)), max(1, int(image.size[1] * scale)))
        mat = bpy.data.materials.new(name=name)
        mat.use_nodes = True
        mat.use_backface_culling = False
        bsdf = mat.node_tree.nodes.get('Principled BSDF')
        bsdf.inputs['Roughness'].default_value = 0.88
        tnode = mat.node_tree.nodes.new('ShaderNodeTexImage')
        tnode.image = image
        mat.node_tree.links.new(tnode.outputs['Color'], bsdf.inputs['Base Color'])
        materials[name] = mat
        images[name] = image
    return materials, images


def cover_uvs(image, width, height):
    """UV che coprono il rettangolo senza deformare la foto (center crop)."""
    if not image or not image.size[0] or not image.size[1]:
        return [(0, 0), (1, 0), (1, 1), (0, 1)]
    image_aspect = image.size[0] / image.size[1]
    target_aspect = width / height
    if image_aspect > target_aspect:
        u = target_aspect / image_aspect
        du = (1 - u) / 2
        return [(du, 0), (1 - du, 0), (1 - du, 1), (du, 1)]
    v = image_aspect / target_aspect
    dv = (1 - v) / 2
    return [(0, dv), (1, dv), (1, 1 - dv), (0, 1 - dv)]


def photo_facade(chunk, x0, x1, z, y0, y1, material, image):
    chunk.face_uv(
        [(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)],
        material, cover_uvs(image, x1 - x0, y1 - y0))


def box(chunk, x, y0, y1, z, sx, sz, material):
    chunk.box(x, y0, y1, z, sx, sz, material)


def col(chunk, x, z, y0, y1, radius, material, sides=8):
    chunk.prism(x, y0, y1, z, radius, material, sides)


def arch_row(chunk, cx, z, y, count, span, material):
    for i in range(count):
        x = cx - span / 2 + span * (i + 0.5) / count
        col(chunk, x, z, y, y + 1.4, 0.32, material, 8)
        chunk.box(x, y + 1.4, y + 1.7, z, span / count * 0.85, 0.5, material)


def duomo(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    w, d, h = 22, 34, 13
    front = cz - d / 2
    box(chunk, cx, 0.1, h, cz, w, d, 'wall_stone')
    photo_facade(chunk, cx - w / 2, cx + w / 2, front - 0.06, 0.2, h, 'photo_duomo-facciata', images.get('photo_duomo-facciata'))
    # Protiri dei tre portali
    for offset in (-6.5, 0, 6.5):
        x = cx + offset
        box(chunk, x, 0.1, 4.6, front - 0.5, 2.6, 1.0, 'wall_white')
        chunk.pyramid(x, 4.6, 5.8, front - 0.5, 1.7, 'roof_tile', 4)
    # Rosone e cornice della loggia
    chunk.prism(cx, 8.2, 10.4, front - 0.12, 1.8, 'wall_white', 16)
    box(chunk, cx, 10.8, 11.3, front - 0.15, w, 0.5, 'trim')
    arch_row(chunk, cx, front - 0.18, 11.3, 7, w - 2, 'trim')
    # Campanile a destra
    box(chunk, cx + 14, 0.1, 24, cz + 8, 6, 6, 'wall_stone')
    chunk.pyramid(cx + 14, 24, 31, cz + 8, 4.2, 'roof_tile', 4)
    photo_facade(chunk, cx + 11.2, cx + 16.8, cz + 5.1, 12, 22, 'photo_duomo-campanile', images.get('photo_duomo-campanile'))


def porta(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 4
    for side in (-1, 1):
        x = cx + side * 5
        box(chunk, x, 0.1, 12, cz, 4, 8, 'wall_stone')
        chunk.pyramid(x, 12, 16, cz, 2.8, 'roof_tile', 4)
    box(chunk, cx, 0.1, 10, cz, 6, 8, 'wall_stone')
    photo_facade(chunk, cx - 7, cx + 7, front - 0.08, 0.2, 11, 'photo_porta-esterno', images.get('photo_porta-esterno'))
    chunk.face_uv([(cx - 2.4, 0.2, front - 0.2), (cx + 2.4, 0.2, front - 0.2),
                   (cx + 2.4, 6, front - 0.2), (cx - 2.4, 6, front - 0.2)],
                  'photo_porta-interno', cover_uvs(images.get('photo_porta-interno'), 4.8, 5.8))
    box(chunk, cx, 7.5, 8.2, front - 0.3, 14, 0.8, 'trim')


def teatro(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 13
    box(chunk, cx, 0.1, 11, cz, 22, 26, 'wall_white')
    photo_facade(chunk, cx - 11, cx + 11, front - 0.07, 0.2, 11, 'photo_teatro-facciata', images.get('photo_teatro-facciata'))
    for i in range(6):
        x = cx - 8.5 + i * 3.4
        col(chunk, x, front - 0.4, 2.2, 7.6, 0.42, 'wall_stone', 10)
        box(chunk, x, 7.6, 8.1, front - 0.4, 1.1, 1.1, 'trim')
    # Frontone
    chunk.face([(cx - 11, 9.4, front - 0.3), (cx + 11, 9.4, front - 0.3), (cx, 13.2, front - 0.3)], 'wall_white', force_up=True)
    chunk.face_uv([(cx - 1.2, 10.2, front - 0.45), (cx + 1.2, 10.2, front - 0.45),
                   (cx + 1.2, 12.4, front - 0.45), (cx - 1.2, 12.4, front - 0.45)],
                  'photo_teatro-stemma', cover_uvs(images.get('photo_teatro-stemma'), 2.4, 2.2))
    box(chunk, cx, 0.1, 1.2, front - 0.6, 22, 1.4, 'trim')


def comunale(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 8
    box(chunk, cx, 0.1, 12, cz, 20, 16, 'wall_white')
    photo_facade(chunk, cx - 10, cx + 10, front - 0.07, 0.2, 12, 'photo_comune-facciata', images.get('photo_comune-facciata'))
    arch_row(chunk, cx, front - 0.5, 0.6, 5, 18, 'wall_stone')
    # Torre campanaria sul retro
    tx, tz = cx - 7, cz + 9
    box(chunk, tx, 0.1, 22, tz, 5, 5, 'wall_stone')
    chunk.pyramid(tx, 22, 27, tz, 3.4, 'roof_tile', 4)
    photo_facade(chunk, tx - 2.4, tx + 2.4, tz - 2.6, 10, 20, 'photo_comune-torre', images.get('photo_comune-torre'))


def stazione(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 7
    box(chunk, cx, 0.1, 9, cz, 36, 14, 'wall_plaster')
    photo_facade(chunk, cx - 18, cx + 18, front - 0.07, 0.2, 9, 'photo_stazione-facciata', images.get('photo_stazione-facciata'))
    chunk.face_uv([(cx - 1.3, 6.4, front - 0.2), (cx + 1.3, 6.4, front - 0.2),
                   (cx + 1.3, 8.8, front - 0.2), (cx - 1.3, 8.8, front - 0.2)],
                  'photo_stazione-orologio', cover_uvs(images.get('photo_stazione-orologio'), 2.6, 2.4))
    box(chunk, cx, 0.1, 0.6, front - 1.2, 36, 2.4, 'trim')


def sanpietro(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 7
    box(chunk, cx, 0.1, 10, cz, 16, 14, 'wall_white')
    photo_facade(chunk, cx - 8, cx + 8, front - 0.07, 0.2, 10, 'photo_sanpietro-facciata', images.get('photo_sanpietro-facciata'))
    box(chunk, cx + 11, 0.1, 7, cz + 3, 8, 10, 'wall_stone')
    photo_facade(chunk, cx + 7.2, cx + 14.8, cz - 2.2, 0.2, 7, 'photo_sanpietro-convento', images.get('photo_sanpietro-convento'))
    box(chunk, cx, 8.6, 9.2, front - 0.3, 16, 0.8, 'trim')


def granmadre(chunk, landmark, photos, images):
    cx, cz = landmark['x'], landmark['z']
    front = cz - 11
    box(chunk, cx, 0.1, 12, cz, 22, 22, 'wall_white')
    photo_facade(chunk, cx - 11, cx + 11, front - 0.07, 0.2, 12, 'photo_granmadre-facciata', images.get('photo_granmadre-facciata'))
    for i in range(4):
        x = cx - 7.5 + i * 5
        col(chunk, x, front - 0.4, 1.5, 8.5, 0.5, 'wall_stone', 10)
    chunk.prism(cx, 12, 20, cz, 6.5, 'roof_tile', 12)
    photo_facade(chunk, cx - 13, cx + 13, front - 0.05, 0.2, 6, 'photo_granmadre-collegio', images.get('photo_granmadre-collegio'))
    box(chunk, cx, 10.6, 11.2, front - 0.3, 22, 0.8, 'trim')


BUILDERS = {
    'duomo': duomo, 'porta': porta, 'teatro': teatro, 'comunale': comunale,
    'stazione': stazione, 'sanpietro': sanpietro, 'granmadre': granmadre,
}


def main():
    root = os.getcwd()
    map_data = json.load(open(os.path.join(root, 'data/map.json'), encoding='utf8'))
    manifest_photos = json.load(open(os.path.join(root, 'tools/blender/exterior-textures.json'), encoding='utf8'))
    out_dir = os.path.join(root, 'assets/3d/blender-city')
    os.makedirs(out_dir, exist_ok=True)

    clear_scene()
    texture_data = texgen.generate_all(os.path.join(out_dir, 'textures'))
    materials = make_materials(texture_data)
    photos, images = photo_materials(manifest_photos, root)
    materials.update(photos)
    keys = list(materials)

    landmarks = {l['id']: l for l in map_data.get('landmarks') or []}
    objects = []
    manifest = {'version': 1, 'file': 'landmarks-hd.glb', 'replace': [], 'landmarks': []}
    for landmark_id, builder in BUILDERS.items():
        landmark = landmarks.get(landmark_id)
        if not landmark:
            continue
        chunk = Chunk('landmark-hd-' + landmark_id)
        builder(chunk, landmark, photos, images)
        obj = __import__('build_blender_city').make_object(chunk, materials, keys)
        objects.append(obj)
        manifest['replace'].append('landmark-' + landmark_id)
        manifest['landmarks'].append({'id': landmark_id, 'object': chunk.name, 'faces': len(chunk.faces)})
        print(chunk.name, len(chunk.faces), 'facce')

    export_scene(objects, os.path.join(out_dir, 'landmarks-hd.glb'))
    with open(os.path.join(out_dir, 'landmarks-hd-manifest.json'), 'w', encoding='utf8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f'{len(objects)} esterni HD -> landmarks-hd.glb')


if __name__ == '__main__':
    main()
