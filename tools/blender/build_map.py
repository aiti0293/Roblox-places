"""
build_map.py — строит воксельную карту игры в Blender (только кубы).

Раскладка (координаты Roblox: Y — вверх, 1 юнит Blender = 1 stud):
  • центр — база игрока: каменная площадь и РАТУША из больших и маленьких кубов;
  • вокруг — кольцо из 10 подиумов для брейнротов, дорожка, фонари, цветы, забор;
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
MAP_HALF = 350
CLEARING_R = 115
FOREST_START = 125
PLOT_COUNT = 10
PLOT_R = 46
TRAIL_HALF = 7

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
    "flag": (40, 120, 255),
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

ROUGHNESS = {"Neon": 0.4, "Glass": 0.05, "SmoothPlastic": 0.45, "Slate": 0.9, "Grass": 0.95, "Ground": 1.0}


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

P = 44
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
# 3. Ратуша (TownHall) — дверь смотрит на +Z
# ----------------------------------------------------------------------------

TH = "Base/TownHall"
box(TH, "Foundation", (30, 3, 30), (0, 2.5, 0), C["sand"], "Sandstone")
box(TH, "FoundationTrim", (31, 0.6, 31), (0, 4.3, 0), C["stone_border"], "Slate")
for k, (w, d, y, z) in enumerate([(12, 3, 1.5, 16.5), (12, 2, 2.5, 16), (12, 1, 3.5, 15.5)]):
    box(TH, "Step", (w, 1, d), (0, y, z), C["sand"], "Sandstone")

# Первый этаж
box(TH, "Floor1", (22, 10, 22), (0, 9.6, 0), C["cream"], "Brick")
# Балконный выступ
box(TH, "Ledge", (24, 1, 24), (0, 15.1, 0), C["wood_dark"], "WoodPlanks")
# Второй этаж
box(TH, "Floor2", (18, 8, 18), (0, 19.6, 0), C["cream2"], "Brick")
# Перила балкона из маленьких кубов
for i in range(-5, 6):
    for s in (-1, 1):
        col = C["gold"] if i % 2 == 0 else C["wood"]
        box(TH, "Rail", (1, 1, 1), (i * 2.2, 16.1, s * 11.5), col)
        box(TH, "Rail", (1, 1, 1), (s * 11.5, 16.1, i * 2.2), col)

# Угловые башенки
for sx in (-1, 1):
    for sz in (-1, 1):
        x, z = sx * 11.5, sz * 11.5
        box(TH, "CornerTower", (3.6, 20, 3.6), (x, 14.6, z), C["stone"], "Slate")
        box(TH, "CornerCap", (4.6, 1, 4.6), (x, 25.1, z), C["stone_border"], "Slate")
        for k, w in enumerate((3.6, 2.4, 1.2)):
            box(TH, "CornerRoof", (w, 1.6, w), (x, 26.4 + k * 1.6, z), C["roof_a"] if k % 2 == 0 else C["roof_b"])

# Дверь с золотой рамкой и баннеры
box(TH, "Door", (6, 8, 1), (0, 8.6, 11.1), C["wood_dark"], "WoodPlanks")
box(TH, "DoorFrameL", (1, 9, 1.4), (-3.5, 9.1, 11.2), C["gold"])
box(TH, "DoorFrameR", (1, 9, 1.4), (3.5, 9.1, 11.2), C["gold"])
box(TH, "DoorFrameTop", (8, 1, 1.4), (0, 13.1, 11.2), C["gold"])
box(TH, "DoorKnob", (0.6, 0.6, 0.6), (1.8, 8.6, 11.7), C["gold"])
for s in (-1, 1):
    box(TH, "Banner", (3, 7, 0.4), (s * 7, 10, 11.2), C["banner"])
    box(TH, "BannerEmblem", (1.4, 1.4, 0.5), (s * 7, 10.8, 11.3), C["gold"])

# Табличка «РАТУША»
box(TH, "Sign", (12, 3, 0.6), (0, 16.6, 12.3), C["wood_dark"], "WoodPlanks",
    extra={"label": "РАТУША", "face": "Back", "textcolor": list(C["gold"])})

# Окна (стекло + деревянные подоконники) на всех 4 сторонах
def window(cx, cy, cz, w, h, axis):
    """axis='z' — окно на грани ±Z, 'x' — на грани ±X."""
    if axis == "z":
        box(TH, "Window", (w, h, 0.6), (cx, cy, cz), C["glass"], "Neon")
        box(TH, "Sill", (w + 1, 0.6, 1), (cx, cy - h / 2 - 0.3, cz), C["wood"])
        box(TH, "WindowTop", (w + 1, 0.6, 1), (cx, cy + h / 2 + 0.3, cz), C["wood"])
    else:
        box(TH, "Window", (0.6, h, w), (cx, cy, cz), C["glass"], "Neon")
        box(TH, "Sill", (1, 0.6, w + 1), (cx, cy - h / 2 - 0.3, cz), C["wood"])
        box(TH, "WindowTop", (1, 0.6, w + 1), (cx, cy + h / 2 + 0.3, cz), C["wood"])


for wx in (-6, 6):
    # на фасаде (+Z) первого этажа вместо окон висят баннеры
    window(wx, 10, -11.05, 3, 4, "z")
    window(11.05, 10, wx, 3, 4, "x")
    window(-11.05, 10, wx, 3, 4, "x")
for wx in (-5, 0, 5):
    window(wx, 20, 9.05, 2, 3, "z")
    window(wx, 20, -9.05, 2, 3, "z")
    window(9.05, 20, wx, 2, 3, "x")
    window(-9.05, 20, wx, 2, 3, "x")

# Ступенчатая крыша
roof_y = 24.6
size = 22
layer = 0
while size >= 6:
    box(TH, "Roof", (size, 2, size), (0, roof_y + layer * 2, 0), C["roof_a"] if layer % 2 == 0 else C["roof_b"])
    size -= 4
    layer += 1
top_y = roof_y + layer * 2 - 1

# Центральная башня с часами, зубцами и флагом
box(TH, "Tower", (7, 10, 7), (0, top_y + 5, 0), C["cream"], "Brick")
box(TH, "ClockFace", (4, 4, 0.6), (0, top_y + 6, 3.7), C["gold"])
box(TH, "ClockCenter", (1, 1, 0.7), (0, top_y + 6, 3.8), C["wood_dark"])
box(TH, "ClockHand", (0.4, 1.6, 0.75), (0, top_y + 6.8, 3.85), C["wood_dark"])
box(TH, "TowerCap", (8, 1, 8), (0, top_y + 10.5, 0), C["stone_border"], "Slate")
for i in range(-1, 2):
    for s in (-1, 1):
        box(TH, "Battlement", (1.6, 1.6, 1.6), (i * 3.2, top_y + 11.8, s * 3.2), C["stone"], "Slate")
        if i != 0:
            box(TH, "Battlement", (1.6, 1.6, 1.6), (s * 3.2, top_y + 11.8, 0), C["stone"], "Slate")
box(TH, "FlagPole", (0.8, 12, 0.8), (0, top_y + 17, 0), C["wood_dark"])
box(TH, "Flag", (7, 4, 0.5), (3.9, top_y + 21, 0), C["flag"])
box(TH, "FlagStripe", (7, 0.8, 0.6), (3.9, top_y + 21, 0), C["gold"])

# Ящики и бочки-кубы у ратуши
for (x, z) in [(-13, 17), (-11, 18.5), (13, 17), (12.5, 18.6), (-17, -10), (17, 8)]:
    s = rng.uniform(1.6, 2.4)
    box(TH, "Crate", (s, s, s), (x, 1 + s / 2, z), C["wood"], "WoodPlanks", yaw=rng.uniform(0, 0.6))

# ----------------------------------------------------------------------------
# 4. Подиумы для брейнротов (Plot1..Plot10)
# ----------------------------------------------------------------------------

for i in range(1, PLOT_COUNT + 1):
    a = (i - 1) / PLOT_COUNT * math.pi * 2 + math.pi / PLOT_COUNT
    x, _, z = ring_pos(PLOT_R, a)
    yaw = yaw_to_center(x, z)
    path = f"Base/BrainrotPlots/Plot{i}"
    ca, sa = math.cos(yaw), math.sin(yaw)

    def local(lx, ly, lz):
        # локальные координаты подиума -> мировые (поворот вокруг Y как в Roblox)
        return (x + lx * ca + lz * sa, ly, z - lx * sa + lz * ca)

    box(path, "Pedestal", (10, 1.2, 10), (x, 1.0, z), C["stone_dark"], "Slate", yaw=yaw)
    box(path, "Top", (8, 1, 8), (x, 2.1, z), PLOT_COLORS[i - 1], yaw=yaw)
    for lx in (-4.25, 4.25):
        for lz in (-4.25, 4.25):
            box(path, "Corner", (1.5, 1.5, 1.5), local(lx, 2.85, lz), C["gold"], yaw=yaw)
    box(path, "Step", (4, 0.6, 2), local(0, 0.7, -6), C["stone"], "Slate", yaw=yaw)
    box(path, "Spot", (4, 0.2, 4), (x, 2.7, z), (255, 255, 255), yaw=yaw, flags=F_MARKER,
        extra={"slot": i})

# Дорожка-кольцо между ратушей и подиумами
RING_R = PLOT_R - 9
for k in range(48):
    a = k / 48 * math.pi * 2
    x, _, z = ring_pos(RING_R, a)
    box("Base/RingPath", "PathBlock", (5, 0.3, 5), (x, 0.55, z), rng.choice(C["dirt"]), "Ground", yaw=yaw_to_center(x, z))

# ----------------------------------------------------------------------------
# 5. Фонари, забор, цветы
# ----------------------------------------------------------------------------

for k in range(16):
    a = k / 16 * math.pi * 2 + math.pi / 16
    x, _, z = ring_pos(CLEARING_R - 10, a)
    yaw = yaw_to_center(x, z)
    box("Base/Lamps", "LampPost", (1.5, 9, 1.5), (x, 4.9, z), C["wood_dark"], "Wood", yaw=yaw)
    box("Base/Lamps", "LampCap", (3, 0.6, 3), (x, 11.9, z), C["wood_dark"], yaw=yaw)
    box("Base/Lamps", "LampLight", (2.4, 2.4, 2.4), (x, 10.4, z), C["lamp"], "Neon", yaw=yaw,
        extra={"light_range": 30, "light_brightness": 2})

# Деревянный забор по краю поляны, с проходами у троп
FENCE_R = CLEARING_R - 3
n_posts = 104
for k in range(n_posts):
    a = k / n_posts * math.pi * 2
    x, _, z = ring_pos(FENCE_R, a)
    if abs(x) < TRAIL_HALF + 4 or abs(z) < TRAIL_HALF + 4:
        continue
    box("Base/Fence", "FencePost", (1.2, 4, 1.2), (x, 2.4, z), C["wood"], "Wood")
    a2 = (k + 1) / n_posts * math.pi * 2
    x2, _, z2 = ring_pos(FENCE_R, a2)
    if abs(x2) < TRAIL_HALF + 4 or abs(z2) < TRAIL_HALF + 4:
        continue
    mx, mz = (x + x2) / 2, (z + z2) / 2
    seg = math.hypot(x2 - x, z2 - z)
    tang = math.atan2(-(z2 - z), x2 - x)  # поворот, чтобы ось X рейки шла вдоль забора
    for h in (1.6, 3.2):
        box("Base/Fence", "FenceRail", (seg, 0.5, 0.5), (mx, h, mz), C["wood_dark"], "Wood", yaw=tang)

# Цветы на поляне (вне колец и троп)
placed = 0
while placed < 160:
    r = rng.uniform(56, CLEARING_R - 16)
    a = rng.uniform(0, math.pi * 2)
    x, _, z = ring_pos(r, a)
    if abs(x) < TRAIL_HALF + 3 or abs(z) < TRAIL_HALF + 3:
        continue
    placed += 1
    box("Base/Flowers", "Stem", (0.3, 1.2, 0.3), (x, 1.0, z), C["stem"], flags=F_NOSHADOW)
    box("Base/Flowers", "Bloom", (0.9, 0.9, 0.9), (x, 1.9, z), rng.choice(C["flowers"]), flags=F_NOSHADOW)

# Служебные: безопасная зона и точка появления
box("Base", "SafeZone", (CLEARING_R * 2, 30, CLEARING_R * 2), (0, 15, 0), (255, 255, 255), flags=F_MARKER | F_TOUCH)
box("Base", "SpawnLocation", (8, 1, 8), (0, 1.2, 24), C["gold"], flags=F_SPAWN)

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
