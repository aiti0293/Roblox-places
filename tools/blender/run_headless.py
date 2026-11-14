"""
run_headless.py — полный цикл без интерфейса Blender:
  постройка карты -> превью-рендеры -> экспорт JSON -> сохранение .blend

Запуск (из корня репозитория):
  blender -b --factory-startup --python tools/blender/run_headless.py -- <renders_dir> <json_path> [<json_path2> ...] [--blend <file.blend>]
"""

import os
import sys

import bpy

here = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
blend_path = None
if "--blend" in args:
    i = args.index("--blend")
    blend_path = args[i + 1]
    args = args[:i] + args[i + 2:]
renders_dir, json_paths = args[0], args[1:]


def run(name, extra_globals=None):
    path = os.path.join(here, name)
    g = {"bpy": bpy, "__name__": "__main__", "__file__": path}
    g.update(extra_globals or {})
    exec(compile(open(path, encoding="utf-8").read(), path, "exec"), g)


run("build_map.py")
run("render_previews.py", {"OUT_DIR": renders_dir, "SHOTS": {
    "09_townhall_small": ((30, 24, 42), (0, 11, 0), 52),
    "10_sign": ((0, 9, 24), (0, 9, 0), 40),
    "11_overview": ((0, 170, 190), (0, 0, 10), 50),
}})
run("export_map.py", {"OUT_PATHS": json_paths})
if blend_path:
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print("saved", blend_path)
