"""
render_previews.py — превью-рендеры карты из нескольких ракурсов.
Камеры задаются в координатах Roblox (x, y, z) и переводятся в Blender (x, -z, y).
Картинки сохраняются в папку OUT_DIR (её задаёт вызывающий код через переменную).
"""

import os

import bpy
from mathutils import Vector

OUT_DIR = globals().get("OUT_DIR", os.path.join(os.path.expanduser("~"), "map_renders"))
SHOTS = globals().get("SHOTS", {
    "01_overview": ((0, 330, 380), (0, 0, 30), 45),
    "02_townhall": ((42, 30, 62), (0, 14, 0), 50),
    "03_plots": ((0, 60, 95), (0, 0, 0), 55),
    "04_forest_trail": ((0, 14, 150), (0, 10, 260), 60),
})


def rbx(v):
    return Vector((v[0], -v[2], v[1]))


scene = bpy.context.scene
os.makedirs(OUT_DIR, exist_ok=True)

try:
    scene.render.engine = "BLENDER_EEVEE_NEXT"
except TypeError:
    pass
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
if hasattr(scene.eevee, "use_shadows"):
    scene.eevee.use_shadows = True
if hasattr(scene.eevee, "taa_render_samples"):
    scene.eevee.taa_render_samples = 16

cam_data = bpy.data.cameras.get("PreviewCam") or bpy.data.cameras.new("PreviewCam")
cam_data.clip_end = 3000
cam = bpy.data.objects.get("PreviewCam")
if cam is None:
    cam = bpy.data.objects.new("PreviewCam", cam_data)
    cam["preview_only"] = True
    scene.collection.objects.link(cam)
scene.camera = cam

for name, (pos, target, lens_fov) in SHOTS.items():
    cam.location = rbx(pos)
    direction = rbx(target) - rbx(pos)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_data.lens_unit = "FOV"
    cam_data.angle = lens_fov * 3.14159 / 180
    scene.render.filepath = os.path.join(OUT_DIR, name + ".png")
    bpy.ops.render.render(write_still=True)
    print("rendered", scene.render.filepath)
