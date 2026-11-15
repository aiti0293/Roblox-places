"""
build_map.py — строит воксельную карту игры в Blender (только кубы).

Раскладка (координаты Roblox: Y — вверх, 1 юнит Blender = 1 stud):
  • центр — база игрока: площадь и средневековая ратуша (TownHall) с кристаллом внутри;
  • вокруг — мраморная платформа с подсветкой снизу и 3 ряда мест для брейнротов;
  • дальше — поляна, фонари, цветы, забор;
  • дальше — тёмный густой лес из кубических ёлок и дубов, подлесок, светящиеся грибы;
  • 4 тропы к краям карты, на их концах точки появления врагов.

Каждый объект получает свойства rbx_* (имя, путь в Workspace, материал, флаги).
По ним export_map.py собирает JSON, а Studio (ImportBlenderMap.lua) строит Part'ы.
Перенос координат: Roblox (x, y, z) -> Blender (x, -z, y).

Запуск: выполнить в Blender (Scripting) или через сокет аддона BlenderMCP.
Повторный запуск пересобирает карту с нуля.
"""

import math
import random

import bpy

ROOT = "RobloxMap"
SEED = 2026
MAP_HALF = 420
CLEARING_R = 185  # big open battlefield around the base
FOREST_START = 195
TRAIL_HALF = 7
TOWNHALL_SCALE = 0.68  # масштаб ратуши (1.0 — исходный размер)

# Флаги для Roblox
F_MARKER = 1  # невидимая служебная часть (без коллизии, без тени)
F_TOUCH = 2  # CanTouch = true (зоны)
F_COLLIDE = 4  # принудительно CanCollide = true (невидимые стены)
F_SPAWN = 8  # SpawnLocation
F_NOSHADOW = 16

rng = random.Random(SEED)

# ----------------------------------------------------------------------------
# Палитра
# ----------------------------------------------------------------------------

C = {
    "grass": [(110, 200, 80), (102, 190, 74), (120, 208, 88)],
    "forest_floor": (38, 58, 32),
    "stone": (178, 178, 188),
    "stone_dark": (140, 140, 152),
    "stone_border": (110, 110, 122),
    "dirt": [(196, 160, 104), (184, 148, 96), (205, 170, 115)],
    "sand": (230, 200, 140),
    "cream": (250, 238, 210),
    "cream2": (240, 226, 196),
    "wood": (120, 75, 40),
    "wood_dark": (85, 52, 28),
    "roof_a": (220, 60, 50),
    "roof_b": (245, 120, 50),
    "glass": (110, 200, 255),
    "gold": (255, 205, 40),
    "banner": (200, 30, 45),
    "trunk": [(70, 45, 28), (60, 38, 24), (82, 54, 32)],
    "leaves": [(22, 58, 30), (17, 46, 26), (28, 68, 34), (14, 38, 22), (34, 60, 26)],
    "rock": [(95, 98, 105), (82, 85, 92), (108, 110, 116)],
    "lamp": (255, 210, 120),
    "flowers": [(255, 80, 90), (255, 220, 60), (250, 250, 255), (180, 120, 255), (255, 150, 200)],
    "stem": (60, 140, 50),
    "mushroom": [(120, 255, 200), (180, 140, 255), (255, 140, 220)],
}

PLOT_COLORS = [
    (180, 180, 180), (85, 200, 85), (60, 140, 255), (170, 70, 255), (255, 170, 0),
    (255, 60, 90), (255, 240, 150), (70, 70, 80), (0, 255, 255), (255, 120, 200),
]


def shade(c, k):
    """Чуть светлее/темнее цвета (k ~ 0.85..1.15)."""
    return tuple(max(0, min(255, int(v * k))) for v in c)


# ----------------------------------------------------------------------------
# Сцена: очистка, коллекции, общий меш куба, материалы
# ----------------------------------------------------------------------------

def reset_scene():
    root = bpy.data.collections.get(ROOT)
    if root:
        for coll in list(root.children_recursive) + [root]:
            for obj in list(coll.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
        for coll in list(root.children_recursive):
            bpy.data.collections.remove(coll)
        bpy.data.collections.remove(root)
    for name in ("Cube",):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    root = bpy.data.collections.new(ROOT)
    bpy.context.scene.collection.children.link(root)
    return root


ROOT_COLL = reset_scene()
_collections = {}


def coll_for(path):
    """Коллекция по пути вида 'Base/TownHall' (создаётся при необходимости)."""
    if path in _collections:
        return _collections[path]
    parent = ROOT_COLL
    built = ""
    for part in path.split("/"):
        built = f"{built}/{part}" if built else part
        if built not in _collections:
            c = bpy.data.collections.new(f"rbx:{built}")
            c["rbx_name"] = part
            parent.children.link(c)
            _collections[built] = c
        parent = _collections[built]
    return parent


def make_cube_mesh():
    mesh = bpy.data.meshes.get("rbx_unit_cube")
    if mesh:
        return mesh
    mesh = bpy.data.meshes.new("rbx_unit_cube")
    h = 0.5
    verts = [(-h, -h, -h), (h, -h, -h), (h, h, -h), (-h, h, -h), (-h, -h, h), (h, -h, h), (h, h, h), (-h, h, h)]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(None)
    mesh.update()
    return mesh


CUBE = make_cube_mesh()
_materials = {}

ROUGHNESS = {"Marble": 0.25, "Metal": 0.35, "Neon": 0.4, "Glass": 0.05, "SmoothPlastic": 0.45, "Slate": 0.9, "Grass": 0.95, "Ground": 1.0}


def material(color, rbx_mat):
    key = (color, rbx_mat)
    if key in _materials:
        return _materials[key]
    mat = bpy.data.materials.new(f"rbx_{rbx_mat}_{color[0]}_{color[1]}_{color[2]}")
    mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    rgb = tuple((v / 255) ** 2.2 for v in color)  # sRGB -> linear
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = ROUGHNESS.get(rbx_mat, 0.7)
    if rbx_mat == "Neon":
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1)
        bsdf.inputs["Emission Strength"].default_value = 4.0
    mat.diffuse_color = (*rgb, 1)
    _materials[key] = mat
    return mat


_counter = 0


def box(path, name, size, pos, color, mat="SmoothPlastic", yaw=0.0, flags=0, extra=None):
    """Куб в координатах Roblox: size=(sx,sy,sz), pos=(x,y,z), yaw — поворот вокруг Y (радианы)."""
    global _counter
    _counter += 1
    obj = bpy.data.objects.new(f"{name}.{_counter:05d}", CUBE)
    sx, sy, sz = size
    x, y, z = pos
    if path == "Base/TownHall":
        # ратуша строится в «полном» размере и уменьшается вокруг центра площади
        k = TOWNHALL_SCALE
        sx, sy, sz = sx * k, sy * k, sz * k
        x, y, z = x * k, 1 + (y - 1) * k, z * k
    obj.location = (x, -z, y)
    obj.scale = (sx, sz, sy)
    obj.rotation_euler = (0, 0, yaw)
    obj.material_slots[0].link = "OBJECT"
    obj.material_slots[0].material = material(color, mat)
    obj["rbx_name"] = name
    obj["rbx_mat"] = mat
    obj["rbx_color"] = list(color)
    obj["rbx_flags"] = flags
    if extra:
        for k, v in extra.items():
            obj[f"rbx_x_{k}"] = v
    if flags & F_MARKER:
        obj.display_type = "WIRE"
        obj.hide_render = True
    coll_for(path).objects.link(obj)
    return obj


def ring_pos(r, a, y=0.0):
    return (math.sin(a) * r, y, math.cos(a) * r)


def yaw_to_center(x, z):
    """Поворот, при котором -Z части смотрит на центр карты (как CFrame.lookAt)."""
    return math.atan2(x, z)


# ----------------------------------------------------------------------------
# 1. Земля
# ----------------------------------------------------------------------------

box("Ground", "ForestFloor", (MAP_HALF * 2 + 20, 2, MAP_HALF * 2 + 20), (0, -1, 0), C["forest_floor"], "Grass")

# Поляна из плиток 10×10 разных оттенков — «пиксельный» круг
T = 10
for ix in range(-CLEARING_R // T - 1, CLEARING_R // T + 1):
    for iz in range(-CLEARING_R // T - 1, CLEARING_R // T + 1):
        cx, cz = ix * T + T / 2, iz * T + T / 2
        if math.hypot(cx, cz) <= CLEARING_R:
            box("Ground/Clearing", "Grass", (T, 0.4, T), (cx, 0.2, cz), rng.choice(C["grass"]), "Grass")

# Тропы: две колонки плиток 7×7 от края поляны до края карты
for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    dist = CLEARING_R - 12
    while dist < MAP_HALF - 3:
        for side in (-1, 1):
            off = side * 3.5
            x = d[0] * (dist + 3.5) + (off if d[0] == 0 else 0)
            z = d[1] * (dist + 3.5) + (off if d[1] == 0 else 0)
            box("Ground/Trails", "Trail", (7, 0.3, 7), (x, 0.45, z), rng.choice(C["dirt"]), "Ground")
        dist += 7

# ----------------------------------------------------------------------------
# 2. База: площадь
# ----------------------------------------------------------------------------

P = 36
for ix in range(P // 4):
    for iz in range(P // 4):
        col = C["stone"] if (ix + iz) % 2 == 0 else C["stone_dark"]
        box("Base/Plaza", "Tile", (4, 1, 4), (-P / 2 + 2 + ix * 4, 0.5, -P / 2 + 2 + iz * 4), shade(col, rng.uniform(0.95, 1.05)), "Slate")
# Бордюр площади
for v in range(-P // 2, P // 2 + 1, 4):
    for s in (-1, 1):
        box("Base/Plaza", "Border", (4, 1.4, 2), (v, 0.7, s * (P / 2 + 1)), C["stone_border"], "Slate")
        box("Base/Plaza", "Border", (2, 1.4, 4), (s * (P / 2 + 1), 0.7, v), C["stone_border"], "Slate")

# ----------------------------------------------------------------------------
# 3. Ратуша (TownHall) — средневековый стиль, вход смотрит на +Z.
#    Первый этаж полый: внутри на постаменте светится Кристалл (Crystal).
#    Если разрушить башню и кристалл — запасы игрока крадут (логика — в сервисе).
# ----------------------------------------------------------------------------

M = {
    "cobble": (105, 105, 110),
    "stone": (138, 134, 126),
    "stone_light": (168, 163, 152),
    "stone_dark": (88, 86, 84),
    "plaster": (226, 214, 186),
    "timber": (62, 40, 26),
    "slate": (58, 62, 78),
    "slate2": (74, 78, 96),
    "iron": (55, 55, 60),
    "slit": (28, 28, 34),
    "fire": (255, 150, 50),
    "window": (255, 196, 110),
    "crystal": (90, 220, 255),
    "crystal2": (175, 245, 255),
    "carpet": (130, 25, 35),
}
TH = "Base/TownHall"

# Фундамент и ступени
box(TH, "Foundation", (35, 3, 35), (0, 2.5, 0), M["cobble"], "Cobblestone")
box(TH, "FoundationTrim", (36, 0.6, 36), (0, 4.3, 0), M["stone_dark"], "Slate")
for k in range(3):
    box(TH, "Step", (12, 1, 3 - k), (0, 1.5 + k, 19 - k * 0.5), M["stone_light"], "Slate")

# Первый этаж — каменные стены с проёмом, внутри пусто
FL = 4.6  # уровень пола
H1 = 10
W1 = 24
DOOR_W, DOOR_H = 8, 8
wy = FL + H1 / 2
side = (W1 - DOOR_W) / 2
box(TH, "WallBack", (W1, H1, 2), (0, wy, -W1 / 2 + 1), M["stone"], "Cobblestone")
box(TH, "WallLeft", (2, H1, W1 - 4), (-W1 / 2 + 1, wy, 0), M["stone"], "Cobblestone")
box(TH, "WallRight", (2, H1, W1 - 4), (W1 / 2 - 1, wy, 0), M["stone"], "Cobblestone")
box(TH, "WallFrontL", (side, H1, 2), (-(DOOR_W / 2 + side / 2), wy, W1 / 2 - 1), M["stone"], "Cobblestone")
box(TH, "WallFrontR", (side, H1, 2), (DOOR_W / 2 + side / 2, wy, W1 / 2 - 1), M["stone"], "Cobblestone")
box(TH, "WallFrontTop", (DOOR_W, H1 - DOOR_H, 2), (0, FL + DOOR_H + (H1 - DOOR_H) / 2, W1 / 2 - 1), M["stone"], "Cobblestone")

# Арка входа из светлого камня + замковый камень
for s in (-1, 1):
    box(TH, "ArchPost", (1.2, DOOR_H, 2.4), (s * (DOOR_W / 2 + 0.6), FL + DOOR_H / 2, W1 / 2 - 1), M["stone_light"], "Slate")
    box(TH, "ArchCorner", (1.6, 1, 2.2), (s * (DOOR_W / 2 - 0.8), FL + DOOR_H - 0.5, W1 / 2 - 1), M["stone_light"], "Slate")
    box(TH, "ArchCorner", (0.8, 0.8, 2.2), (s * (DOOR_W / 2 - 1.9), FL + DOOR_H - 0.4, W1 / 2 - 1), M["stone_light"], "Slate")
box(TH, "Keystone", (2, 1.6, 2.6), (0, FL + DOOR_H + 0.6, W1 / 2 - 1), M["stone_light"], "Slate")

# Угловые камни (квоины) — чередующиеся светлые блоки
for sx in (-1, 1):
    for sz in (-1, 1):
        for k in range(5):
            big = k % 2 == 0
            box(TH, "Quoin", (2.6 if big else 2.2, 1.6, 2.2 if big else 2.6),
                (sx * (W1 / 2 - 1), FL + 1 + k * 2, sz * (W1 / 2 - 1)), M["stone_light"], "Slate")

# Внутри: ковёр, постамент и кристалл
box(TH, "Carpet", (3, 0.1, 8), (0, FL + 0.05, 7), M["carpet"], "Fabric")
box(TH, "CrystalBase", (4, 1.5, 4), (0, FL + 0.75, 0), M["stone_light"], "Slate")
box(TH, "CrystalBaseTrim", (4.6, 0.4, 4.6), (0, FL + 1.5, 0), M["iron"], "Metal")
CY = FL + 1.7
box(TH, "Crystal", (2, 4.5, 2), (0, CY + 2.25, 0), M["crystal"], "Neon", yaw=math.pi / 4,
    extra={"light_range": 26, "light_brightness": 3, "attr_IsCrystal": True, "attr_MaxHP": 1000})
box(TH, "CrystalTip", (1.3, 1.5, 1.3), (0, CY + 5.2, 0), M["crystal2"], "Neon", yaw=math.pi / 4)
for (dx, dz) in ((1.3, 0), (-1.3, 0), (0, 1.3), (0, -1.3)):
    box(TH, "CrystalShard", (0.9, 2, 0.9), (dx, CY + 1, dz), M["crystal2"], "Neon", yaw=math.pi / 4)

# Факелы у входа
for s in (-1, 1):
    box(TH, "TorchBracket", (0.6, 1.4, 0.8), (s * 6, FL + 5.6, W1 / 2 + 0.4), M["iron"], "Metal")
    box(TH, "TorchFlame", (0.9, 0.9, 0.9), (s * 6, FL + 6.7, W1 / 2 + 0.5), M["fire"], "Neon", flags=F_NOSHADOW,
        extra={"light_range": 16, "light_brightness": 2})

# Табличка «TOWN HALL» над аркой: доска с железной оковкой, средневековый шрифт
SIGN_Y = FL + H1 - 0.8
box(TH, "Sign", (10, 2, 0.5), (0, SIGN_Y, W1 / 2 + 0.3), M["timber"], "WoodPlanks",
    extra={"label": "TOWN HALL", "face": "Back", "textcolor": [255, 214, 120], "font": "Fantasy",
           "stroke": [40, 22, 10]})
for s in (-1, 1):
    box(TH, "SignIron", (0.6, 2.4, 0.7), (s * 5.1, SIGN_Y, W1 / 2 + 0.3), M["iron"], "Metal")
    box(TH, "SignRivet", (0.3, 0.3, 0.3), (s * 5.1, SIGN_Y + 0.7, W1 / 2 + 0.7), (190, 170, 120), "Metal")
    box(TH, "SignRivet", (0.3, 0.3, 0.3), (s * 5.1, SIGN_Y - 0.7, W1 / 2 + 0.7), (190, 170, 120), "Metal")

# Второй этаж — фахверк (штукатурка + тёмные балки), нависает над первым
U0 = FL + H1  # 14.6
W2 = 26
box(TH, "FloorBeam", (W2 + 0.4, 1, W2 + 0.4), (0, U0 + 0.5, 0), M["timber"], "WoodPlanks")
box(TH, "Upper", (W2, 8, W2), (0, U0 + 5, 0), M["plaster"], "SmoothPlastic")
UT = U0 + 9  # верх второго этажа
for face in ("+z", "-z", "+x", "-x"):
    for i, t in enumerate((-12.6, -6.3, 0, 6.3, 12.6)):
        if face in ("+z", "-z"):
            zz = (W2 / 2 + 0.15) * (1 if face == "+z" else -1)
            box(TH, "Beam", (0.8, 8, 0.4), (t, U0 + 5, zz), M["timber"], "WoodPlanks")
        else:
            xx = (W2 / 2 + 0.15) * (1 if face == "+x" else -1)
            box(TH, "Beam", (0.4, 8, 0.8), (xx, U0 + 5, t), M["timber"], "WoodPlanks")
    for h in (U0 + 1.4, UT - 0.4):
        if face in ("+z", "-z"):
            box(TH, "Beam", (W2 + 0.6, 0.8, 0.4), (0, h, (W2 / 2 + 0.15) * (1 if face == "+z" else -1)), M["timber"], "WoodPlanks")
        else:
            box(TH, "Beam", (0.4, 0.8, W2 + 0.6), ((W2 / 2 + 0.15) * (1 if face == "+x" else -1), h, 0), M["timber"], "WoodPlanks")
    for t in (-9.45, -3.15, 3.15, 9.45):
        if face in ("+z", "-z"):
            zz = (W2 / 2 + 0.1) * (1 if face == "+z" else -1)
            box(TH, "Window", (2, 3, 0.3), (t, U0 + 5, zz), M["window"], "Neon")
            box(TH, "Sill", (2.8, 0.5, 0.8), (t, U0 + 3.3, zz), M["timber"], "WoodPlanks")
        else:
            xx = (W2 / 2 + 0.1) * (1 if face == "+x" else -1)
            box(TH, "Window", (0.3, 3, 2), (xx, U0 + 5, t), M["window"], "Neon")
            box(TH, "Sill", (0.8, 0.5, 2.8), (xx, U0 + 3.3, t), M["timber"], "WoodPlanks")

# Сланцевая ступенчатая крыша
size = 28
layer = 0
while size >= 8:
    box(TH, "Roof", (size, 2, size), (0, UT + 1 + layer * 2, 0), M["slate"] if layer % 2 == 0 else M["slate2"], "Slate")
    size -= 4
    layer += 1
ROOF_TOP = UT + layer * 2

# Угловые башни со стрелковыми бойницами и острыми крышами
for sx in (-1, 1):
    for sz in (-1, 1):
        x, z = sx * 14.8, sz * 14.8
        box(TH, "CornerTower", (5, 24, 5), (x, FL + 12, z), M["stone"], "Cobblestone")
        for y in (FL + 6, FL + 16):
            box(TH, "ArrowSlit", (0.7, 2.6, 0.4), (x, y, z + sz * 2.55), M["slit"])
            box(TH, "ArrowSlit", (0.4, 2.6, 0.7), (x + sx * 2.55, y, z), M["slit"])
        ty = FL + 24
        box(TH, "TowerCap", (6, 1, 6), (x, ty + 0.5, z), M["stone_light"], "Slate")
        for (mx, mz) in ((-2.3, -2.3), (2.3, -2.3), (-2.3, 2.3), (2.3, 2.3), (0, -2.3), (0, 2.3), (-2.3, 0), (2.3, 0)):
            box(TH, "Merlon", (1.2, 1.4, 1.2), (x + mx, ty + 1.7, z + mz), M["stone_light"], "Slate")
        for k, w in enumerate((4.2, 3, 1.8, 0.8)):
            box(TH, "TowerRoof", (w, 2, w), (x, ty + 2 + k * 2, z), M["slate"] if k % 2 == 0 else M["slate2"], "Slate")
        box(TH, "Finial", (0.5, 1.6, 0.5), (x, ty + 9.8, z), M["iron"], "Metal")

# Центральная башня (донжон) — без флага
KY = ROOF_TOP - 1
box(TH, "Tower", (8, 10, 8), (0, KY + 5, 0), M["stone"], "Cobblestone")
for k in range(5):
    big = k % 2 == 0
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(TH, "Quoin", (1.8 if big else 1.4, 1.6, 1.4 if big else 1.8), (sx * 3.6, KY + 1 + k * 2, sz * 3.6), M["stone_light"], "Slate")
for (dx, dz, sxz) in ((0, 4.05, "z"), (0, -4.05, "z"), (4.05, 0, "x"), (-4.05, 0, "x")):
    size_ = (0.8, 2.6, 0.4) if sxz == "z" else (0.4, 2.6, 0.8)
    box(TH, "ArrowSlit", size_, (dx, KY + 5.5, dz), M["slit"])
box(TH, "TowerCap", (9.6, 1, 9.6), (0, KY + 10.5, 0), M["stone_light"], "Slate")
for t in (-4, -1.33, 1.33, 4):
    for s in (-1, 1):
        box(TH, "Merlon", (1.6, 1.6, 1.6), (t, KY + 11.8, s * 4), M["stone_light"], "Slate")
        if abs(t) < 4:
            box(TH, "Merlon", (1.6, 1.6, 1.6), (s * 4, KY + 11.8, t), M["stone_light"], "Slate")
for k, w in enumerate((6, 4.4, 2.8, 1.2)):
    box(TH, "TowerRoof", (w, 2, w), (0, KY + 12 + k * 2, 0), M["slate"] if k % 2 == 0 else M["slate2"], "Slate")
box(TH, "Finial", (0.6, 2, 0.6), (0, KY + 20, 0), M["iron"], "Metal")

# Ящики у ратуши
for (x, z) in [(-19, 18), (-17.5, 19.5), (19, 18), (18.5, 20), (-19, -8), (19, 6)]:
    s = rng.uniform(1.6, 2.4)
    box(TH, "Crate", (s, s, s), (x, 1 + s / 2, z), C["wood"], "WoodPlanks", yaw=rng.uniform(0, 0.6))

# ----------------------------------------------------------------------------
# 4. Мраморная платформа с подсветкой снизу и 3 ряда мест для брейнротов
# ----------------------------------------------------------------------------

DECK_IN, DECK_OUT = 34, 72
BANDS = [(34, 46.67), (46.67, 59.33), (59.33, 72)]
DECK_SEG = 72
MARBLE = [(222, 223, 232), (210, 212, 222)]  # платформа чуть серее, места — белоснежные
GLOW = (150, 230, 255)

for bi, (r0, r1) in enumerate(BANDS):
    rc = (r0 + r1) / 2
    seg_len = 2 * math.pi * r1 / DECK_SEG + 0.3
    for k in range(DECK_SEG):
        a = (k + 0.5) / DECK_SEG * math.pi * 2
        x, _, z = ring_pos(rc, a)
        box("Base/Platform", "Marble", (seg_len, 0.8, r1 - r0 + 0.05), (x, 1.3, z), MARBLE[(k + bi) % 2], "Marble",
            yaw=yaw_to_center(x, z))

# Подсветка снизу: неоновые кольца под внешним и внутренним краем
for r in (DECK_OUT - 0.2, DECK_IN + 0.2):
    seg_len = 2 * math.pi * r / DECK_SEG + 0.2
    for k in range(DECK_SEG):
        a = (k + 0.5) / DECK_SEG * math.pi * 2
        x, _, z = ring_pos(r, a)
        box("Base/Platform", "UnderGlow", (seg_len, 0.5, 1.2), (x, 0.65, z), GLOW, "Neon", yaw=yaw_to_center(x, z),
            flags=F_NOSHADOW)

# Бортик по внешнему краю
seg_len = 2 * math.pi * (DECK_OUT - 0.5) / DECK_SEG + 0.2
for k in range(DECK_SEG):
    a = (k + 0.5) / DECK_SEG * math.pi * 2
    x, _, z = ring_pos(DECK_OUT - 0.5, a)
    box("Base/Platform", "Rim", (seg_len, 0.4, 1), (x, 1.9, z), (222, 222, 230), "Marble", yaw=yaw_to_center(x, z))

# Места для брейнротов: 3 ряда, шаг ~8.5 stud по кругу
SLOT_SPACING = 8.5
slot = 0
for row, (r0, r1) in enumerate(BANDS, start=1):
    rc = (r0 + r1) / 2
    n = int(2 * math.pi * rc // SLOT_SPACING)
    for k in range(n):
        a = (k + 0.5) / n * math.pi * 2
        x, _, z = ring_pos(rc, a)
        yaw = yaw_to_center(x, z)
        slot += 1
        path = f"Base/BrainrotPlots/Plot{slot}"
        ca, sa = math.cos(yaw), math.sin(yaw)
        box(path, "Pedestal", (5.8, 0.7, 5.8), (x, 2.05, z), (255, 255, 255), "Marble", yaw=yaw)
        # светящаяся кайма по краям места
        for (lx, lz, w, d) in ((0, 3.1, 6.4, 0.4), (0, -3.1, 6.4, 0.4), (3.1, 0, 0.4, 5.8), (-3.1, 0, 0.4, 5.8)):
            box(path, "Glow", (w, 0.25, d), (x + lx * ca + lz * sa, 2.0, z - lx * sa + lz * ca), GLOW, "Neon",
                yaw=yaw, flags=F_NOSHADOW)
        box(path, "Spot", (4, 0.2, 4), (x, 2.5, z), (255, 255, 255), yaw=yaw, flags=F_MARKER,
            extra={"slot": slot, "attr_Row": row})
print(f"slots={slot}")
# ----------------------------------------------------------------------------
# 5. Цветы
# ----------------------------------------------------------------------------

# Фонари и забор убраны — поляна открыта для боя

# Цветы на поляне (вне колец и троп)
placed = 0
while placed < 260:
    r = rng.uniform(80, CLEARING_R - 10)
    a = rng.uniform(0, math.pi * 2)
    x, _, z = ring_pos(r, a)
    if abs(x) < TRAIL_HALF + 3 or abs(z) < TRAIL_HALF + 3:
        continue
    placed += 1
    box("Base/Flowers", "Stem", (0.3, 1.2, 0.3), (x, 1.0, z), C["stem"], flags=F_NOSHADOW)
    box("Base/Flowers", "Bloom", (0.9, 0.9, 0.9), (x, 1.9, z), rng.choice(C["flowers"]), flags=F_NOSHADOW)

# Служебные: безопасная зона и точка появления
box("Base", "SafeZone", (CLEARING_R * 2, 30, CLEARING_R * 2), (0, 15, 0), (255, 255, 255), flags=F_MARKER | F_TOUCH)
box("Base", "SpawnLocation", (8, 1, 8), (0, 1.2, 28), C["gold"], flags=F_SPAWN)

# ----------------------------------------------------------------------------
# 6. Тёмный густой лес
# ----------------------------------------------------------------------------


def pine(path, x, z, h):
    leaves = rng.choice(C["leaves"])
    box(path, "Trunk", (2.5, h, 2.5), (x, h / 2, z), rng.choice(C["trunk"]), "Wood")
    y = h * 0.3  # низкие ветви — лес выглядит гуще
    for w, th in ((13, 3.5), (10, 3.5), (7, 3), (4, 3)):
        box(path, "Leaves", (w, th, w), (x, y + th / 2, z), shade(leaves, rng.uniform(0.85, 1.15)), "Grass",
            yaw=rng.uniform(0, 0.4))
        y += th
    box(path, "Leaves", (2, 2, 2), (x, y + 1, z), leaves, "Grass")


def oak(path, x, z, h):
    leaves = rng.choice(C["leaves"])
    h *= 0.7  # крона ниже — под деревьями темнее
    box(path, "Trunk", (3, h, 3), (x, h / 2, z), rng.choice(C["trunk"]), "Wood")
    cw = rng.uniform(14, 19)
    box(path, "Crown", (cw, 8, cw), (x, h + 3, z), leaves, "Grass", yaw=rng.uniform(0, 0.8))
    for _ in range(3):
        s = rng.uniform(5, 8)
        box(path, "Crown", (s, s * 0.8, s),
            (x + rng.uniform(-cw / 2, cw / 2), h + rng.uniform(1, 8), z + rng.uniform(-cw / 2, cw / 2)),
            shade(leaves, rng.uniform(0.8, 1.2)), "Grass", yaw=rng.uniform(0, 1.5))


def dead_tree(path, x, z, h):
    col = (55, 45, 40)
    box(path, "DeadTrunk", (2, h, 2), (x, h / 2, z), col, "Wood")
    box(path, "DeadBranch", (6, 1, 1), (x + 2.5, h * 0.7, z), col, "Wood", yaw=rng.uniform(-0.5, 0.5))
    box(path, "DeadBranch", (1, 1, 5), (x, h * 0.85, z - 2), col, "Wood", yaw=rng.uniform(-0.5, 0.5))


trees = 0
CELL = 16
g = -MAP_HALF + CELL / 2
cells = []
while g < MAP_HALF:
    cells.append(g)
    g += CELL
for gx in cells:
    for gz in cells:
        x = gx + rng.uniform(-CELL * 0.35, CELL * 0.35)
        z = gz + rng.uniform(-CELL * 0.35, CELL * 0.35)
        dist = math.hypot(x, z)
        on_trail = abs(x) < TRAIL_HALF + 6 or abs(z) < TRAIL_HALF + 6
        if dist < FOREST_START or on_trail or rng.random() > 0.85:
            continue
        h = rng.uniform(12, 18) + min(12, max(0, (dist - FOREST_START) / 20))
        group = f"Forest/Trees{trees // 150 + 1}"
        roll = rng.random()
        if roll < 0.55:
            pine(group, x, z, h)
        elif roll < 0.92:
            oak(group, x, z, h)
        else:
            dead_tree(group, x, z, h * 0.8)
        trees += 1

# Подлесок, камни и светящиеся грибы
bushes = rocks = shrooms = 0
while bushes < 450 or rocks < 70 or shrooms < 60:
    x, z = rng.uniform(-MAP_HALF, MAP_HALF), rng.uniform(-MAP_HALF, MAP_HALF)
    if math.hypot(x, z) < FOREST_START - 5 or abs(x) < TRAIL_HALF + 1 or abs(z) < TRAIL_HALF + 1:
        continue
    if bushes < 450:
        bushes += 1
        s = rng.uniform(3, 6)
        box("Forest/Undergrowth", "Bush", (s * 1.3, s, s), (x, s / 2, z), rng.choice(C["leaves"]), "Grass", yaw=rng.uniform(0, 3))
    elif rocks < 70:
        rocks += 1
        s = rng.uniform(2, 6)
        box("Forest/Undergrowth", "Rock", (s, s * 0.7, s * 1.2), (x, s * 0.3, z), rng.choice(C["rock"]), "Slate", yaw=rng.uniform(0, 3))
    else:
        shrooms += 1
        box("Forest/Mushrooms", "Stalk", (0.6, 1.4, 0.6), (x, 0.7, z), (230, 225, 210), flags=F_NOSHADOW)
        box("Forest/Mushrooms", "Cap", (2, 0.8, 2), (x, 1.7, z), rng.choice(C["mushroom"]), "Neon", flags=F_NOSHADOW)

# ----------------------------------------------------------------------------
# 7. Точки появления врагов и невидимые границы
# ----------------------------------------------------------------------------

edge = MAP_HALF - 12
for name, (x, z) in {"North": (0, -edge), "South": (0, edge), "East": (edge, 0), "West": (-edge, 0)}.items():
    box("EnemySpawns", name, (10, 6, 10), (x, 3, z), (255, 60, 60), yaw=yaw_to_center(x, z), flags=F_MARKER)

BH = 120
for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    size = (4, BH, MAP_HALF * 2 + 8) if d[0] else (MAP_HALF * 2 + 8, BH, 4)
    box("MapBounds", "Bound", size, (d[0] * (MAP_HALF + 2), BH / 2, d[1] * (MAP_HALF + 2)), (255, 255, 255),
        flags=F_MARKER | F_COLLIDE)

# ----------------------------------------------------------------------------
# 8. Свет и камера для превью-рендера (в Roblox не переносится)
# ----------------------------------------------------------------------------

scene = bpy.context.scene
for obj in list(bpy.data.objects):
    if obj.get("preview_only"):
        bpy.data.objects.remove(obj, do_unlink=True)

sun_data = bpy.data.lights.new("PreviewSun", "SUN")
sun_data.energy = 4.0
sun_data.angle = math.radians(3)
sun = bpy.data.objects.new("PreviewSun", sun_data)
sun.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
sun["preview_only"] = True
scene.collection.objects.link(sun)

world = scene.world or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.45, 0.65, 0.9, 1)
bg.inputs["Strength"].default_value = 0.8

print(f"OK: trees={trees}, objects={_counter}, materials={len(_materials)}")
