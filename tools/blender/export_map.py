"""
export_map.py — выгружает карту из Blender в JSON для Roblox Studio.

Берёт все объекты с свойством rbx_name из коллекции RobloxMap (в том числе
то, что вы подвинули/перекрасили руками в Blender) и пишет файл:
  { "version": 1,
    "models": { "Base/TownHall": "Foundation", ... },   -- путь -> имя PrimaryPart
    "parts": [ [path, name, x, y, z, sx, sy, sz, yaw, r, g, b, material, flags, extra], ... ] }
Координаты уже в системе Roblox (Y — вверх). Путь задаётся переменной OUT_PATHS.
"""

import json
import math

import bpy

OUT_PATHS = globals().get("OUT_PATHS", [])

parts = []
models = {"Base": ""}
for coll in bpy.data.collections:
    if not coll.name.startswith("rbx:"):
        continue
    path = coll.name[4:]
    leaf = path.split("/")[-1]
    if leaf == "TownHall":
        models[path] = "Foundation"
    elif leaf.startswith("Plot") and path.startswith("Base/BrainrotPlots/"):
        models[path] = "Pedestal"
    for obj in coll.objects:
        if "rbx_name" not in obj:
            continue
        loc = obj.matrix_world.to_translation()
        sx, sz, sy = obj.scale  # Blender (x, y, z) -> Roblox (x, z, y)
        yaw = obj.matrix_world.to_euler("XYZ").z
        extra = {k[6:]: (list(v) if hasattr(v, "__len__") and not isinstance(v, str) else v)
                 for k, v in obj.items() if k.startswith("rbx_x_")}
        r, g, b = obj["rbx_color"]
        parts.append([
            path, obj["rbx_name"],
            round(loc.x, 3), round(loc.z, 3), round(-loc.y, 3),
            round(sx, 3), round(sy, 3), round(sz, 3),
            round(math.remainder(yaw, math.tau), 4),
            int(r), int(g), int(b),
            obj["rbx_mat"], int(obj["rbx_flags"]),
            extra or 0,
        ])

data = json.dumps({"version": 1, "models": models, "parts": parts}, ensure_ascii=False, separators=(",", ":"))
for p in OUT_PATHS:
    with open(p, "w", encoding="utf-8") as f:
        f.write(data)
print(f"exported {len(parts)} parts, {len(data) // 1024} KB -> {OUT_PATHS}")
