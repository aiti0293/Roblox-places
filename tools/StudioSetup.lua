--[[
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

writeScript("ReplicatedStorage", { "Shared" }, "DataConfig", "ModuleScript", [=====[--!strict
--[[
	DataConfig — единый источник всех игровых констант.
	Лежит в ReplicatedStorage.Shared, чтобы клиент тоже мог читать
	(цвета редкостей, названия, тексты UI). Логики здесь НЕТ — только данные
	и пара чистых функций-хелперов для поиска.

	Все таблицы заморожены (table.freeze), чтобы ни один сервис
	случайно не изменил конфиг во время игры.
]]

local DataConfig = {}

----------------------------------------------------------------------
-- ТИПЫ
----------------------------------------------------------------------

export type RarityName =
	"Common" | "Uncommon" | "Rare" | "Epic" | "Legendary"
	| "Mythic" | "Divine" | "Secret" | "Godly"

export type RarityInfo = {
	Order: number, -- 1..9, порядок редкости (чем больше — тем круче)
	DisplayName: string, -- Название для UI
	Color: Color3, -- Цвет подсветки/нимба
	LaunchPower: number, -- Сила выстрела из пушки (урон по кирпичам)
	LaunchSpeed: number, -- Начальная скорость полёта игрока (studs/s)
	CannonSkin: string, -- Имя модели-скина пушки в ServerStorage.CannonSkins
}

export type BrainrotInfo = {
	Id: string, -- Уникальный ключ (хранится в сохранении)
	DisplayName: string,
	Rarity: RarityName,
	Income: number, -- Доход в секунду, когда стоит на базе
	Model: string, -- Имя модели в ServerStorage.Brainrots
	Boss: string?, -- Если задано — этого брейнрота охраняет указанный босс
}

export type WallTier = {
	Tier: number, -- 1..9
	Name: string,
	Material: Enum.Material,
	Color: Color3,
	BrickHP: number, -- Прочность одного кирпича
	MinPower: number, -- Минимальная LaunchPower, чтобы вообще поцарапать стену
	Reward: number, -- Деньги за каждый сломанный кирпич
}

export type BossInfo = {
	Id: string,
	DisplayName: string,
	Model: string, -- Имя модели в ServerStorage.Bosses
	WalkSpeed: number, -- Скорость в режиме погони
	ReturnSpeed: number, -- Скорость возвращения на место
	CatchDistance: number, -- Дистанция «поймал»
	LoseDistance: number, -- Если вор убежал дальше — босс сдаётся
}

----------------------------------------------------------------------
-- 1. GameConfig — общие правила сервера
----------------------------------------------------------------------

DataConfig.GameConfig = table.freeze({
	MaxPlayers = 6, -- ВАЖНО: также выставить в Game Settings → Places → Max Players

	-- Экономика
	StartingCash = 100,
	IncomeTickInterval = 1, -- Как часто начисляется пассивный доход (сек)

	-- База
	BaseSlotCount = 10, -- Кол-во слотов под брейнротов на базе
	BasePlotsFolder = "BasePlots", -- workspace.BasePlots: 6 точек-участков (Plot1..Plot6)

	-- Красная кнопка / лазеры
	-- Лазеры есть ТОЛЬКО в дверных проёмах баз (Plot.Doorway.Lasers)
	RedButtonHoldTime = 5, -- Сколько держать кнопку для активации лазеров (сек)
	LaserDuration = 60, -- Сколько лазеры остаются включёнными (сек)
	LaserCooldown = 30, -- Перезарядка после выключения (сек)

	-- Кража
	AlarmDuration = 10, -- Сколько звучит тревога у жертвы (сек)
	WantedDuration = 15, -- Сколько висит экран «WANTED» у вора (сек)

	-- Бита (PvP)
	BatCooldown = 0.8, -- Задержка между ударами (сек)
	BatRange = 7, -- Макс. дистанция удара (studs) — проверка на сервере
	BatKnockback = 40, -- Сила отталкивания при попадании

	-- Пушки
	CannonCount = 3, -- Нейтральные пушки в Shooting Zone
	CannonClaimTimeout = 20, -- Если занял пушку и не выстрелил — освобождается (сек)
	CannonsFolder = "Cannons", -- workspace.Cannons

	-- Стены
	WallRegenTime = 5 * 60, -- Регенерация стены через 5 минут (сек)
	WallGridSize = Vector2.new(12, 10), -- Кирпичей по ширине × высоте
	WallBrickSize = Vector3.new(4, 3, 3), -- Размер одного кирпича (studs)
	WallDebrisLifetime = 4, -- Через сколько удаляются обломки (сек)
	WallLanesFolder = "WallLanes", -- workspace.WallLanes: Lane1..Lane6 (точка стены на игрока)

	-- Босс
	BossAggroCooldown = 3, -- Пауза перед новой погоней после возврата (сек)

	-- Сохранение
	ProfileStoreName = "PlayerData_v1",
})

----------------------------------------------------------------------
-- 2. Редкости (9 штук)
----------------------------------------------------------------------

DataConfig.Rarities = table.freeze({
	Common = { Order = 1, DisplayName = "Обычный", Color = Color3.fromRGB(180, 180, 180), LaunchPower = 10, LaunchSpeed = 120, CannonSkin = "Cannon_Common" },
	Uncommon = { Order = 2, DisplayName = "Необычный", Color = Color3.fromRGB(85, 200, 85), LaunchPower = 25, LaunchSpeed = 135, CannonSkin = "Cannon_Uncommon" },
	Rare = { Order = 3, DisplayName = "Редкий", Color = Color3.fromRGB(60, 140, 255), LaunchPower = 50, LaunchSpeed = 150, CannonSkin = "Cannon_Rare" },
	Epic = { Order = 4, DisplayName = "Эпический", Color = Color3.fromRGB(170, 70, 255), LaunchPower = 100, LaunchSpeed = 165, CannonSkin = "Cannon_Epic" },
	Legendary = { Order = 5, DisplayName = "Легендарный", Color = Color3.fromRGB(255, 170, 0), LaunchPower = 200, LaunchSpeed = 180, CannonSkin = "Cannon_Legendary" },
	Mythic = { Order = 6, DisplayName = "Мифический", Color = Color3.fromRGB(255, 60, 90), LaunchPower = 400, LaunchSpeed = 195, CannonSkin = "Cannon_Mythic" },
	Divine = { Order = 7, DisplayName = "Божественный", Color = Color3.fromRGB(255, 240, 150), LaunchPower = 800, LaunchSpeed = 210, CannonSkin = "Cannon_Divine" },
	Secret = { Order = 8, DisplayName = "Секретный", Color = Color3.fromRGB(20, 20, 20), LaunchPower = 1600, LaunchSpeed = 225, CannonSkin = "Cannon_Secret" },
	Godly = { Order = 9, DisplayName = "Брейнрот-Бог", Color = Color3.fromRGB(0, 255, 255), LaunchPower = 3200, LaunchSpeed = 240, CannonSkin = "Cannon_Godly" },
} :: { [RarityName]: RarityInfo })

----------------------------------------------------------------------
-- 3. BrainrotConfig — все мем-персонажи
--    Ключ таблицы = Id (именно он пишется в сохранение).
----------------------------------------------------------------------

DataConfig.BrainrotConfig = table.freeze({
	Noobini = { Id = "Noobini", DisplayName = "Нубини Пиццанини", Rarity = "Common", Income = 1, Model = "Noobini" },
	Pipi = { Id = "Pipi", DisplayName = "Пипи Кивини", Rarity = "Uncommon", Income = 4, Model = "Pipi" },
	Patapim = { Id = "Patapim", DisplayName = "Брр Брр Патапим", Rarity = "Rare", Income = 15, Model = "Patapim", Boss = "StoneGolem" },
	Sahur = { Id = "Sahur", DisplayName = "Тунг Тунг Сахур", Rarity = "Epic", Income = 50, Model = "Sahur", Boss = "StoneGolem" },
	Tralalero = { Id = "Tralalero", DisplayName = "Тралалеро Тралала", Rarity = "Legendary", Income = 150, Model = "Tralalero", Boss = "IronKnight" },
	Bombardiro = { Id = "Bombardiro", DisplayName = "Бомбардиро Крокодило", Rarity = "Mythic", Income = 500, Model = "Bombardiro", Boss = "IronKnight" },
	Cappuccino = { Id = "Cappuccino", DisplayName = "Каппучино Ассассино", Rarity = "Divine", Income = 1500, Model = "Cappuccino", Boss = "VoidKing" },
	Lirili = { Id = "Lirili", DisplayName = "Лирили Ларила", Rarity = "Secret", Income = 5000, Model = "Lirili", Boss = "VoidKing" },
	Garamaraman = { Id = "Garamaraman", DisplayName = "Гарамараман", Rarity = "Godly", Income = 20000, Model = "Garamaraman", Boss = "VoidKing" },
} :: { [string]: BrainrotInfo })

----------------------------------------------------------------------
-- 4. WallConfig — 9 тиров стен
--    Стена №N для игрока = тир N (индекс массива = тир).
----------------------------------------------------------------------

DataConfig.WallConfig = table.freeze({
	{ Tier = 1, Name = "Дерево", Material = Enum.Material.WoodPlanks, Color = Color3.fromRGB(150, 100, 60), BrickHP = 10, MinPower = 0, Reward = 5 },
	{ Tier = 2, Name = "Камень", Material = Enum.Material.Cobblestone, Color = Color3.fromRGB(120, 120, 120), BrickHP = 25, MinPower = 20, Reward = 15 },
	{ Tier = 3, Name = "Железо", Material = Enum.Material.DiamondPlate, Color = Color3.fromRGB(160, 165, 175), BrickHP = 60, MinPower = 45, Reward = 40 },
	{ Tier = 4, Name = "Золото", Material = Enum.Material.Metal, Color = Color3.fromRGB(240, 200, 50), BrickHP = 120, MinPower = 90, Reward = 100 },
	{ Tier = 5, Name = "Алмаз", Material = Enum.Material.Glass, Color = Color3.fromRGB(120, 230, 255), BrickHP = 250, MinPower = 180, Reward = 250 },
	{ Tier = 6, Name = "Обсидиан", Material = Enum.Material.Basalt, Color = Color3.fromRGB(40, 20, 60), BrickHP = 500, MinPower = 350, Reward = 600 },
	{ Tier = 7, Name = "Кристалл", Material = Enum.Material.Ice, Color = Color3.fromRGB(255, 120, 230), BrickHP = 1000, MinPower = 700, Reward = 1500 },
	{ Tier = 8, Name = "Титан", Material = Enum.Material.Foil, Color = Color3.fromRGB(200, 200, 220), BrickHP = 2000, MinPower = 1400, Reward = 4000 },
	{ Tier = 9, Name = "Пустота", Material = Enum.Material.Neon, Color = Color3.fromRGB(10, 0, 30), BrickHP = 4000, MinPower = 3000, Reward = 10000 },
} :: { WallTier })

----------------------------------------------------------------------
-- 5. BossConfig — спящие боссы в Boss Zone
----------------------------------------------------------------------

DataConfig.BossConfig = table.freeze({
	StoneGolem = { Id = "StoneGolem", DisplayName = "Каменный Голем", Model = "StoneGolem", WalkSpeed = 18, ReturnSpeed = 24, CatchDistance = 6, LoseDistance = 250 },
	IronKnight = { Id = "IronKnight", DisplayName = "Железный Рыцарь", Model = "IronKnight", WalkSpeed = 22, ReturnSpeed = 28, CatchDistance = 6, LoseDistance = 300 },
	VoidKing = { Id = "VoidKing", DisplayName = "Король Пустоты", Model = "VoidKing", WalkSpeed = 26, ReturnSpeed = 32, CatchDistance = 7, LoseDistance = 350 },
} :: { [string]: BossInfo })

----------------------------------------------------------------------
-- 6. Шаблон сохранения (используется SaveService / ProfileService)
--    Новые поля добавляем сюда — ProfileService сам подставит их
--    старым игрокам через profile:Reconcile().
----------------------------------------------------------------------

DataConfig.ProfileTemplate = table.freeze({
	Cash = DataConfig.GameConfig.StartingCash,
	-- Слоты базы: [номер слота] = Id брейнрота (пустые слоты = nil)
	BaseSlots = {} :: { [string]: string }, -- ключи-строки ("1".."10"), т.к. DataStore не любит «дырявые» массивы
	Stats = {
		BricksBroken = 0,
		BrainrotsStolen = 0,
		HighestWallTier = 0,
	},
})

----------------------------------------------------------------------
-- 7. Имена RemoteEvent'ов (создаются сервером в ReplicatedStorage.Remotes)
----------------------------------------------------------------------

DataConfig.Remotes = table.freeze({
	-- Клиент → Сервер
	"RequestPickup", -- Взять брейнрота со слота (своего или чужого)
	"RequestPlace", -- Поставить брейнрота в слот
	"RequestCannon", -- Вставить брейнрота в пушку
	"RequestFire", -- Нажать «Hit»
	"RedButtonHold", -- Начал/закончил держать красную кнопку (bool)
	"BatSwing", -- Взмах битой

	-- Сервер → Клиент
	"Alarm", -- Жертве: у тебя крадут!
	"Wanted", -- Вору: экран WANTED
	"LaserState", -- Состояние лазеров в дверях базы
	"BossState", -- Смена состояния босса (для музыки/UI)
	"Notify", -- Общие всплывающие сообщения
})

----------------------------------------------------------------------
-- ХЕЛПЕРЫ (чистые функции, без побочных эффектов)
----------------------------------------------------------------------

-- Получить данные брейнрота по Id (nil, если такого нет)
function DataConfig.GetBrainrot(id: string): BrainrotInfo?
	return DataConfig.BrainrotConfig[id]
end

-- Получить данные редкости для конкретного брейнрота
function DataConfig.GetRarityOf(id: string): RarityInfo?
	local info = DataConfig.BrainrotConfig[id]
	return if info then DataConfig.Rarities[info.Rarity] else nil
end

-- Получить тир стены (1..9)
function DataConfig.GetWallTier(tier: number): WallTier?
	return DataConfig.WallConfig[tier]
end

return table.freeze(DataConfig)
]=====])

writeScript("ServerScriptService", { "Server" }, "Main", "Script", [=====[--!strict
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
]=====])

writeScript("ServerScriptService", { "Server", "Services" }, "SaveService", "ModuleScript", [=====[--!strict
--[[
	SaveService — единственный сервис, который читает и пишет профили игроков.
	Работает строго через ProfileService (ReplicatedStorage.Packages.ProfileService).

	Жизненный цикл игрока:
	  PlayerAdded    → загрузка профиля (ForceLoad) → Reconcile → чистка данных
	                 → сигнал ProfileLoaded  (BaseService спавнит базу)
	  PlayerRemoving → сигнал PlayerLeaving  (BaseService возвращает брейнрота из рук
	                   и деспавнит базу) → profile:Release() (финальное сохранение)

	Правило данных: слоты в профиле меняются ТОЛЬКО когда брейнрот реально
	поставлен/украден. Пока брейнрот «в руках» — в профиле он остаётся за
	владельцем, поэтому выход/краш сервера никогда не теряет брейнротов.

	Другие сервисы НЕ трогают profile.Data напрямую — только через API ниже.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileService = require(ReplicatedStorage.Packages.ProfileService) :: any
local DataConfig = require(ReplicatedStorage.Shared.DataConfig)

local GameConfig = DataConfig.GameConfig

----------------------------------------------------------------------
-- Мини-сигнал (чтобы не тянуть отдельную библиотеку)
----------------------------------------------------------------------

type Signal = {
	Connect: (self: Signal, fn: (...any) -> ()) -> (),
	Fire: (self: Signal, ...any) -> (),
}

local function createSignal(): Signal
	local listeners: { (...any) -> () } = {}
	local signal = {}

	function signal:Connect(fn)
		table.insert(listeners, fn)
	end

	-- task.spawn запускает слушателя сразу (до первого yield),
	-- поэтому порядок сохраняется, а ошибка одного не ломает остальных
	function signal:Fire(...)
		for _, fn in listeners do
			task.spawn(fn, ...)
		end
	end

	return signal :: any
end

----------------------------------------------------------------------
-- Состояние
----------------------------------------------------------------------

local SaveService = {}

SaveService.ProfileLoaded = createSignal() -- (player, data) — профиль готов
SaveService.PlayerLeaving = createSignal() -- (player, data) — до Release профиля.
-- ВАЖНО: слушатели PlayerLeaving не должны yield'ить (task.wait и т.п.),
-- иначе профиль сохранится раньше, чем они закончат работу.

local profileStore = ProfileService.GetProfileStore(GameConfig.ProfileStoreName, DataConfig.ProfileTemplate)
local profiles: { [Player]: any } = {}

----------------------------------------------------------------------
-- Внутренние функции
----------------------------------------------------------------------

-- Убираем из слотов брейнротов, которых больше нет в конфиге
-- (например, переименовали Id) и слоты за пределами BaseSlotCount
local function sanitizeData(data)
	for slot, id in data.BaseSlots do
		local index = tonumber(slot)
		if not DataConfig.GetBrainrot(id) or not index or index < 1 or index > GameConfig.BaseSlotCount then
			data.BaseSlots[slot] = nil
		end
	end
end

-- Деньги дублируем в атрибут — клиентский UI читает его без Remote'ов
local function syncCash(player: Player, data)
	player:SetAttribute("Cash", data.Cash)
end

local function onPlayerAdded(player: Player)
	local profile = profileStore:LoadProfileAsync("Player_" .. player.UserId, "ForceLoad")

	if not profile then
		-- Профиль занят другим сервером и не освободился — безопаснее кикнуть
		player:Kick("Не удалось загрузить данные. Перезайдите, пожалуйста.")
		return
	end

	profile:AddUserId(player.UserId) -- GDPR
	profile:Reconcile() -- подставляем новые поля из шаблона

	-- Если профиль открыли на другом сервере — этот сервер обязан отпустить игрока
	profile:ListenToRelease(function()
		profiles[player] = nil
		player:Kick("Ваши данные открыты на другом сервере.")
	end)

	-- Игрок мог выйти, пока профиль грузился
	if not player:IsDescendantOf(Players) then
		profile:Release()
		return
	end

	sanitizeData(profile.Data)
	profiles[player] = profile
	syncCash(player, profile.Data)
	player:SetAttribute("DataLoaded", true)

	SaveService.ProfileLoaded:Fire(player, profile.Data)
end

local function onPlayerRemoving(player: Player)
	local profile = profiles[player]
	if not profile then
		return
	end

	-- Сначала даём сервисам прибраться (деспавн базы, возврат брейнрота из рук),
	-- и только потом сохраняем — чтобы в профиль попало финальное состояние
	SaveService.PlayerLeaving:Fire(player, profile.Data)

	profiles[player] = nil
	profile:Release()
end

----------------------------------------------------------------------
-- Жизненный цикл сервиса
----------------------------------------------------------------------

function SaveService:Init(_services)
	-- Зависимостей нет: SaveService грузится первым
end

function SaveService:Start()
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(onPlayerRemoving)

	-- Игроки, зашедшие до подписки (актуально для Studio)
	for _, player in Players:GetPlayers() do
		task.spawn(onPlayerAdded, player)
	end

	-- Финальные сохранения при закрытии сервера ProfileService делает сам
	-- (внутренний BindToClose), здесь ничего добавлять не нужно
end

----------------------------------------------------------------------
-- Публичное API: общее
----------------------------------------------------------------------

-- Данные игрока или nil, если профиль ещё не загружен / уже выгружен
function SaveService:GetData(player: Player)
	local profile = profiles[player]
	return profile and profile.Data
end

function SaveService:IsLoaded(player: Player): boolean
	return profiles[player] ~= nil
end

----------------------------------------------------------------------
-- Публичное API: деньги
----------------------------------------------------------------------

function SaveService:GetCash(player: Player): number
	local data = self:GetData(player)
	return data and data.Cash or 0
end

function SaveService:AddCash(player: Player, amount: number)
	local data = self:GetData(player)
	if not data or amount <= 0 then
		return
	end
	data.Cash += amount
	syncCash(player, data)
end

-- Возвращает true, если денег хватило и они списаны
function SaveService:SpendCash(player: Player, amount: number): boolean
	local data = self:GetData(player)
	if not data or amount < 0 or data.Cash < amount then
		return false
	end
	data.Cash -= amount
	syncCash(player, data)
	return true
end

----------------------------------------------------------------------
-- Публичное API: слоты базы (ключи — строки "1".."BaseSlotCount")
----------------------------------------------------------------------

-- Таблица слотов только для чтения: { ["1"] = "Noobini", ... }
function SaveService:GetSlots(player: Player): { [string]: string }
	local data = self:GetData(player)
	return data and table.clone(data.BaseSlots) or {}
end

function SaveService:GetSlot(player: Player, slot: string): string?
	local data = self:GetData(player)
	return data and data.BaseSlots[slot]
end

-- Поставить брейнрота (id) или очистить слот (nil). Возвращает успех.
function SaveService:SetSlot(player: Player, slot: string, brainrotId: string?): boolean
	local data = self:GetData(player)
	local index = tonumber(slot)
	if not data or not index or index < 1 or index > GameConfig.BaseSlotCount then
		return false
	end
	if brainrotId and not DataConfig.GetBrainrot(brainrotId) then
		return false
	end
	data.BaseSlots[slot] = brainrotId
	return true
end

-- Первый свободный слот или nil, если база заполнена
function SaveService:FindFreeSlot(player: Player): string?
	local data = self:GetData(player)
	if not data then
		return nil
	end
	for i = 1, GameConfig.BaseSlotCount do
		local key = tostring(i)
		if data.BaseSlots[key] == nil then
			return key
		end
	end
	return nil
end

----------------------------------------------------------------------
-- Публичное API: статистика
----------------------------------------------------------------------

function SaveService:IncrementStat(player: Player, stat: string, amount: number?)
	local data = self:GetData(player)
	if data and data.Stats[stat] ~= nil then
		data.Stats[stat] += amount or 1
	end
end

-- Для рекордов вида «максимальный тир стены»
function SaveService:SetStatMax(player: Player, stat: string, value: number)
	local data = self:GetData(player)
	if data and data.Stats[stat] ~= nil then
		data.Stats[stat] = math.max(data.Stats[stat], value)
	end
end

return SaveService
]=====])


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
