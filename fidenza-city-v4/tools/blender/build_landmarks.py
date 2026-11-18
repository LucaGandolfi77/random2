"""
Landmark PBR per Fidenza v4.2: geometria semplificata ma riconoscibile,
costruita con la stessa palette degli edifici e posizionata dai dati di map.json.
Ogni landmark e' un Chunk separato, esportato come nodo `landmark-<id>`.
"""

import math

# I tipi costruiti qui; gli altri restano procedurali nel gioco.
SUPPORTED = {
    'duomo', 'porta', 'teatro', 'granmadre', 'sanpietro',
    'comunale', 'stazione', 'obelisco', 'musini', 'ponte',
}


def world_point(landmark, lx, lz):
    """Ruota e trasla le coordinate locali del landmark (gradi, come map.json)."""
    angle = math.radians(landmark.get('rotation') or 0)
    scale = float(landmark.get('scale') or 1)
    x, z = lx * scale, lz * scale
    wx = x * math.cos(angle) + z * math.sin(angle)
    wz = -x * math.sin(angle) + z * math.cos(angle)
    return (landmark.get('x', 0) + wx + (landmark.get('offsetX') or 0),
            landmark.get('z', 0) + wz + (landmark.get('offsetZ') or 0))


def add_box(chunk, landmark, lx, ly, lz, sx, sy, sz, material):
    x, z = world_point(landmark, lx, lz)
    chunk.box(x, ly, ly + sy, z, sx, sz, material)


def add_prism(chunk, landmark, lx, ly, lz, radius, height, material, sides=8):
    x, z = world_point(landmark, lx, lz)
    chunk.prism(x, ly, ly + height, z, radius, material, sides)


def add_chain(chunk, landmark, lx, ly, lz, sx, sy, sz, material, count=6, base=0.6):
    """Ring di colonne/cornici attorno a un centro."""
    for i in range(count):
        a = 2 * math.pi * i / count
        add_box(chunk, landmark, lx + math.cos(a) * base, ly,
                lz + math.sin(a) * base, sx, sy, sz, material)


def build(chunk, landmark, roof_material='roof_tile'):
    """Aggiunge la geometria del landmark al Chunk. Ritorna False se non supportato."""
    model = landmark.get('model') or landmark.get('type')
    if model not in SUPPORTED:
        return False
    kind = model

    if kind == 'duomo':
        # Navata, facciata a gradoni, rosone, portale e campanile.
        add_box(chunk, landmark, 0, 0, 0, 22, 13, 34, 'wall_stone')
        add_box(chunk, landmark, 0, 13, 0, 19, 6, 30, roof_material)
        for i in range(4):
            add_box(chunk, landmark, 0, 6 + i * 2.4, -18 - i * 0.5,
                    22 - i * 2.4, 2.2, 2.4, 'wall_white')
        add_prism(chunk, landmark, 0, 12, -19, 2.6, 0.5, 'wall_white', 16)
        add_prism(chunk, landmark, 0, 12.3, -19.1, 2.1, 0.3, 'window_glass', 16)
        add_box(chunk, landmark, 0, 0, -19.5, 4.2, 6.2, 1.2, 'wall_white')
        add_prism(chunk, landmark, 0, 6.2, -19.5, 2.0, 1.4, 'wall_stone', 12)
        x, z = world_point(landmark, 13, 10)
        chunk.box(x, 0, 26, z, 6, 6, 'wall_stone')
        chunk.pyramid(x, 26, 34, z, 4.2, roof_material, 4)
        for offset in (-7, 0, 7):
            add_prism(chunk, landmark, offset, 8, -18.8, 0.9, 4, 'wall_white', 8)

    elif kind == 'teatro':
        add_box(chunk, landmark, 0, 0, 0, 24, 11, 18, 'wall_white')
        add_box(chunk, landmark, 0, 11, 0, 26, 1.2, 20, 'trim')
        add_chain(chunk, landmark, 0, 2, -9.5, 1.1, 8, 1.1, 'wall_stone', 6, 8)
        # Frontone triangolare
        x, z = world_point(landmark, 0, -9.6)
        chunk.face([(x - 11, 12, z), (x + 11, 12, z), (x, 17, z)], 'wall_white', force_up=True)
        for offset in (-6, 0, 6):
            add_box(chunk, landmark, offset, 2, -9.8, 2.2, 4.4, 0.4, 'window_glass')

    elif kind == 'porta':
        add_box(chunk, landmark, -6.5, 0, 0, 5, 15, 6, 'wall_stone')
        add_box(chunk, landmark, 6.5, 0, 0, 5, 15, 6, 'wall_stone')
        add_box(chunk, landmark, 0, 11, 0, 9, 4, 6, 'wall_stone')
        for lx in (-6.5, 6.5):
            x, z = world_point(landmark, lx, 0)
            chunk.pyramid(x, 15, 19, z, 3.2, roof_material, 4)

    elif kind in ('granmadre', 'sanpietro'):
        radius = 11 if kind == 'granmadre' else 8
        add_prism(chunk, landmark, 0, 0, 0, radius, 12, 'wall_white', 16)
        x, z = world_point(landmark, 0, 0)
        chunk.pyramid(x, 12, 22, z, radius * 0.85, roof_material, 12)
        add_box(chunk, landmark, 0, 0, -radius - 1, 12, 9, 3, 'wall_stone')
        add_chain(chunk, landmark, 0, 2, -radius - 2.6, 0.9, 7, 0.9, 'wall_white', 4, 4.5)

    elif kind == 'comunale':
        add_box(chunk, landmark, 0, 0, 0, 20, 12, 16, 'wall_white')
        x, z = world_point(landmark, 0, 0)
        chunk.box(x, 12, 30, z, 6, 6, 'wall_stone')
        chunk.pyramid(x, 30, 36, z, 3.8, roof_material, 4)
        for offset in (-6, 0, 6):
            add_box(chunk, landmark, offset, 3, -8.2, 2.4, 4, 0.3, 'window_glass')

    elif kind == 'stazione':
        add_box(chunk, landmark, 0, 0, 0, 36, 9, 14, 'wall_stone')
        add_box(chunk, landmark, 0, 9, 0, 40, 0.8, 18, roof_material)
        for offset in (-12, -4, 4, 12):
            add_box(chunk, landmark, offset, 2, -7.2, 3, 3.6, 0.3, 'window_glass')

    elif kind == 'obelisco':
        add_box(chunk, landmark, 0, 0, 0, 3.5, 1.5, 3.5, 'wall_stone')
        x, z = world_point(landmark, 0, 0)
        chunk.pyramid(x, 1.5, 16, z, 1.4, 'wall_white', 4)

    elif kind == 'musini':
        add_box(chunk, landmark, 0, 0, 0, 18, 8, 13, 'wall_plaster')
        x, z = world_point(landmark, 0, 0)
        chunk.gable_roof([(x - 10, z - 7), (x + 10, z - 7), (x + 10, z + 7), (x - 10, z + 7)],
                         8, 5, roof_material)
        for offset in (-5, 0, 5):
            add_box(chunk, landmark, offset, 2, -6.8, 2, 3.4, 0.3, 'window_glass')

    elif kind == 'ponte':
        add_box(chunk, landmark, 0, 2, 0, 28, 1.2, 8, 'wall_stone')
        for offset in (-9, 0, 9):
            x, z = world_point(landmark, offset, 0)
            chunk.prism(x, 0, 2, z, 1.6, 'wall_stone', 8)

    return True
