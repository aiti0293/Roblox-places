# Пересобирает tools/StudioSetup.lua из исходников в src/.
# Запуск из корня репозитория: python3 tools/build_setup.py
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (сервис, путь папок, имя, класс, исходник)
FILES = [
    ("ReplicatedStorage", ["Shared"], "DataConfig", "ModuleScript", "src/shared/DataConfig.lua"),
    ("ServerScriptService", ["Server"], "Main", "Script", "src/server/Main.server.lua"),
] + [
    ("ServerScriptService", ["Server", "Services"], p.stem, "ModuleScript", str(p.relative_to(ROOT)))
    for p in sorted((ROOT / "src/server/Services").glob("*.lua"))
]

HEADER = '''--[[
	StudioSetup — установщик проекта в один клик.

	КАК ПОЛЬЗОВАТЬСЯ:
	  1. Скопируйте ВЕСЬ этот файл (Ctrl+A, Ctrl+C).
	  2. В Roblox Studio вставьте его в строку внизу экрана
	     «Execute a command» (Ctrl+V).
	  3. Нажмите Ctrl+Enter (или кнопку Run справа).

	Скрипт создаст все папки и скрипты, скачает ProfileService
	и выведет отчёт в окно Output. Запускать можно повторно —
	существующие скрипты будут перезаписаны свежей версией.
	Файл генерируется автоматически: python3 tools/build_setup.py
]]

local HttpService = game:GetService("HttpService")

-- Найти или создать папку
local function ensureFolder(parent: Instance, name: string): Instance
	local folder = parent:FindFirstChild(name)
	if not folder then
		folder = Instance.new("Folder")
		folder.Name = name
		folder.Parent = parent
	end
	return folder
end

-- Создать (или перезаписать) скрипт с кодом
local function writeScript(serviceName: string, path: { string }, name: string, className: string, source: string)
	local parent: Instance = game:GetService(serviceName)
	for _, folderName in path do
		parent = ensureFolder(parent, folderName)
	end
	local old = parent:FindFirstChild(name)
	if old then
		old:Destroy()
	end
	local s = Instance.new(className)
	s.Name = name
	;(s :: any).Source = source
	s.Parent = parent
	print("[Setup] ✔ " .. serviceName .. "." .. table.concat(path, ".") .. "." .. name)
end

'''

FOOTER = '''
-- ProfileService скачиваем с GitHub (HTTP включается только на время загрузки)
local PROFILE_SERVICE_URL = "https://raw.githubusercontent.com/MadStudioRoblox/ProfileService/master/ProfileService.lua"
local wasEnabled = HttpService.HttpEnabled
HttpService.HttpEnabled = true
local ok, result = pcall(HttpService.GetAsync, HttpService, PROFILE_SERVICE_URL)
HttpService.HttpEnabled = wasEnabled

if ok then
	writeScript("ReplicatedStorage", { "Packages" }, "ProfileService", "ModuleScript", result)
	print("[Setup] ✅ Готово! Нажмите Play и проверьте Output.")
else
	warn("[Setup] ❌ Не удалось скачать ProfileService: " .. tostring(result))
	warn("[Setup] Создайте ModuleScript ReplicatedStorage.Packages.ProfileService вручную и вставьте код с " .. PROFILE_SERVICE_URL)
end
'''

parts = [HEADER]
for svc, path, name, cls, src in FILES:
    code = (ROOT / src).read_text(encoding="utf-8")
    assert "]=====]" not in code, src
    lua_path = "{ " + ", ".join(f'"{p}"' for p in path) + " }"
    parts.append(f'writeScript("{svc}", {lua_path}, "{name}", "{cls}", [=====[{code}]=====])\n\n')
parts.append(FOOTER)
(ROOT / "tools/StudioSetup.lua").write_text("".join(parts), encoding="utf-8")
print("tools/StudioSetup.lua собран")
