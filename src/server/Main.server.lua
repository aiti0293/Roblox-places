--!strict
--[[
	Main — единственный серверный Script (точка входа).
	Создаёт RemoteEvent'ы и запускает сервисы в два этапа:
	  1) Init()  — подготовка, сервисы могут получать ссылки друг на друга;
	  2) Start() — подписки на события и запуск игровых циклов.
	Порядок важен: SaveService первым, т.к. остальным нужны данные игроков.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local DataConfig = require(ReplicatedStorage.Shared.DataConfig)

-- Создаём папку с RemoteEvent'ами по списку из конфига
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
for _, name in DataConfig.Remotes do
	local remote = Instance.new("RemoteEvent")
	remote.Name = name
	remote.Parent = remotes
end
remotes.Parent = ReplicatedStorage

-- Порядок загрузки сервисов
local ORDER = {
	"SaveService",
	"BaseService",
	"WallService",
	"CannonService",
	"BossService",
	"SecurityService",
}

local servicesFolder = script.Parent:WaitForChild("Services")
local loaded = {}

for _, name in ORDER do
	local module = servicesFolder:FindFirstChild(name)
	if module then
		loaded[name] = require(module) :: any
	else
		warn(`[Main] Сервис {name} не найден — пропускаю`)
	end
end

-- Этап 1: Init
for _, name in ORDER do
	local service = loaded[name]
	if service and service.Init then
		service:Init(loaded)
	end
end

-- Этап 2: Start (в отдельных потоках, чтобы один сервис не блокировал остальные)
for _, name in ORDER do
	local service = loaded[name]
	if service and service.Start then
		task.spawn(service.Start, service)
	end
end

print("[Main] Все сервисы запущены")
