"""
preview_units.py — renders the voxel units from src/shared/UnitModels.lua in Blender.

Parses the voxel table of UnitModels.lua (lines like
  { Pos = V(x, y, z), Size = V(sx, sy, sz), Color = "fur", Group = "UpperJaw" })
plus the claw loops, builds the 4 skins side by side (two with the jaw open)
and renders one image.

Run headless:
  blender -b --factory-startup --python tools/blender/preview_units.py -- <UnitModels.lua> <out.png>
"""

import math
import re
import sys

import bpy
from mathutils import Euler, Matrix, Vector

args = sys.argv[sys.argv.index("--") + 1:]
lua_path, out_path = args[0], args[1]
src = open(lua_path, encoding="utf-8").read()

NUM = r"(-?[\d.]+)"
V3 = rf"V\({NUM},\s*{NUM},\s*{NUM}\)"
voxel_re = re.compile(
    rf'\{{\s*Pos = {V3}(?:,\s*Size = {V3})?,\s*Color = "(\w+)"(?:,\s*Group = "(\w+)")?\s*\}}'
)
rgb_re = re.compile(r'(\w+) = Color3\.fromRGB\((\d+), (\d+), (\d+)\)')

voxels = []
for m in voxel_re.finditer(src):
    g = m.groups()
    pos = Vector(map(float, g[0:3]))
    size = Vector(map(float, g[3:6])) if g[3] else Vector((1, 1, 1))
    voxels.append((pos, size, g[6], g[7]))

# Claw loops (mirror of the Lua code)
for side in (-1, 1):
    for dx in (-0.8, 0, 0.8):
        voxels.append((Vector((side * 5.3 + dx, 3.0, -2.5)), Vector((0.4, 1.6, 0.4)), "tooth", None))
        voxels.append((Vector((side * 5.3 + dx, 2.05, -2.5)), Vector((0.42, 0.4, 0.42)), "blood", None))
    for dx in (-0.7, 0, 0.7):
        voxels.append((Vector((side * 2 + dx, 0.35, -3.05)), Vector((0.4, 0.4, 0.7)), "tooth", None))

# Palette = first block of Color3 after "Palette = {", skins after "local SKINS"
pal_src = src[src.index("Palette = {"):src.index("NeonColors")]
palette = {k: (int(r), int(gg), int(b)) for k, r, gg, b in rgb_re.findall(pal_src)}
skins_src = src[src.index("local SKINS"):src.index("function UnitModels.Build")]
skins = {"Ripper": {}}
for name, body in re.findall(r"\t(\w+) = \{(.*?)\n\t\}", skins_src, re.S):
    skins[name] = {k: (int(r), int(gg), int(b)) for k, r, gg, b in rgb_re.findall(body)}
hinge_m = re.search(rf"LowerJaw = \{{ Hinge = {V3}", src)
hinge = Vector(map(float, hinge_m.groups()))
jaw_open = math.radians(float(re.search(r"JawOpenAngle = math\.rad\((-?[\d.]+)\)", src).group(1)))
VS = 0.5

print(f"voxels={len(voxels)} skins={list(skins)} hinge={tuple(hinge)}")

# --- scene -------------------------------------------------------------------
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
mesh = bpy.data.meshes.new("cube")
h = 0.5
mesh.from_pydata([(-h, -h, -h), (h, -h, -h), (h, h, -h), (-h, h, -h), (-h, -h, h), (h, -h, h), (h, h, h), (-h, h, h)], [],
                 [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)])
mesh.materials.append(None)
mats = {}


def mat(rgb, neon):
    key = (rgb, neon)
    if key not in mats:
        m = bpy.data.materials.new(str(key))
        m.use_nodes = True
        b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
        lin = tuple((c / 255) ** 2.2 for c in rgb)
        b.inputs["Base Color"].default_value = (*lin, 1)
        b.inputs["Roughness"].default_value = 0.6
        if neon:
            b.inputs["Emission Color"].default_value = (*lin, 1)
            b.inputs["Emission Strength"].default_value = 6
        mats[key] = m
    return mats[key]


def rbx(v):  # Roblox (x, y, z) -> Blender (x, -z, y)
    return Vector((v.x, -v.z, v.y))


jaw_rot = Matrix.Rotation(jaw_open, 4, "X")
for i, name in enumerate(["Ripper", "Bloodfang", "Nightmaw", "Alpha"]):
    colors = dict(palette, **skins.get(name, {}))
    offset = Vector(((i - 1.5) * 8.0, 0, 0))
    for pos, size, color, group in voxels:
        world = Matrix.Translation(pos * VS)
        if group == "LowerJaw" and i % 2 == 0:  # open the jaw on Ripper and Nightmaw
            hp = hinge * VS
            world = Matrix.Translation(hp) @ jaw_rot @ Matrix.Translation(-hp) @ world
        p = world.to_translation()
        rot = world.to_euler()
        obj = bpy.data.objects.new(color, mesh)
        obj.location = rbx(p + offset)
        obj.rotation_euler = Euler((rot.x, -rot.z, rot.y))
        obj.scale = (size.x * VS, size.z * VS, size.y * VS)
        obj.material_slots[0].link = "OBJECT"
        obj.material_slots[0].material = mat(colors[color], color == "eye")
        bpy.context.scene.collection.objects.link(obj)

# Ground, light, camera
ground = bpy.data.objects.new("ground", mesh)
ground.scale = (60, 30, 0.2)
ground.location = (0, 0, -0.1)
ground.material_slots[0].link = "OBJECT"
ground.material_slots[0].material = mat((225, 226, 234), False)
bpy.context.scene.collection.objects.link(ground)

sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
sun.data.energy = 3
sun.rotation_euler = (math.radians(55), 0, math.radians(30))
bpy.context.scene.collection.objects.link(sun)
world = bpy.context.scene.world or bpy.data.worlds.new("w")
bpy.context.scene.world = world
world.use_nodes = True
bg = next(n for n in world.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs["Color"].default_value = (0.35, 0.42, 0.55, 1)
bg.inputs["Strength"].default_value = 0.7

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.location = rbx(Vector((6, 7, -26)))
cam.rotation_euler = (rbx(Vector((0, 4.2, 0))) - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 50
bpy.context.scene.collection.objects.link(cam)
scene = bpy.context.scene
scene.camera = cam
try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    pass
scene.render.resolution_x, scene.render.resolution_y = 1400, 700
scene.render.filepath = out_path
bpy.ops.render.render(write_still=True)
print("rendered", out_path)
