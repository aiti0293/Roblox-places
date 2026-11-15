--[[
	HUD — the on-screen interface (LocalScript in StarterPlayerScripts.Client).

	  • Money with the storage limit          (player attributes Money / MoneyCap)
	  • Wave number, countdown, wolves left   (Workspace.Base attributes WaveNumber / WaveState / NextWaveIn)
	  • Town Hall HP bar                      (Workspace.Base.TownHall attributes HP / MaxHP)
	  • Notifications                         (Remotes.Notify)
	  • Werewolf shop: opens when the player activates an empty owned plot
	    (Remotes.OpenShop); buying sends Remotes.RequestPlaceUnit.

	The client only shows state and sends requests — the server validates everything.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local Shared = ReplicatedStorage:WaitForChild("Shared")
local DataConfig = require(Shared:WaitForChild("DataConfig"))
local UnitModels = require(Shared:WaitForChild("UnitModels"))
local Remotes = ReplicatedStorage:WaitForChild("Remotes")

local player = Players.LocalPlayer
local base = Workspace:WaitForChild("Base")
local townHall = base:WaitForChild("TownHall")

----------------------------------------------------------------------
-- Theme (dark medieval panels, gold titles)
----------------------------------------------------------------------

local THEME = {
	Panel = Color3.fromRGB(20, 18, 24),
	PanelLight = Color3.fromRGB(36, 32, 42),
	Stroke = Color3.fromRGB(110, 92, 60),
	Gold = Color3.fromRGB(255, 205, 80),
	Text = Color3.fromRGB(242, 238, 230),
	Muted = Color3.fromRGB(160, 154, 146),
	Blood = Color3.fromRGB(190, 20, 30),
	Disabled = Color3.fromRGB(70, 66, 72),
}
local TITLE_FONT = Enum.Font.Fantasy
local BODY_FONT = Enum.Font.GothamBold

local UNIT_ORDER = { "Ripper", "Bloodfang", "Nightmaw", "Alpha" }

----------------------------------------------------------------------
-- UI helpers
----------------------------------------------------------------------

local function make(className: string, props: { [string]: any }, children: { Instance }?): any
	local inst = Instance.new(className)
	for key, value in props do
		if key ~= "Parent" then
			(inst :: any)[key] = value
		end
	end
	for _, child in children or {} do
		child.Parent = inst
	end
	inst.Parent = props.Parent
	return inst
end

local function corner(radius: number): UICorner
	return make("UICorner", { CornerRadius = UDim.new(0, radius) })
end

local function stroke(color: Color3, thickness: number): UIStroke
	return make("UIStroke", { Color = color, Thickness = thickness, ApplyStrokeMode = Enum.ApplyStrokeMode.Border })
end

local function panel(props: { [string]: any }): Frame
	props.BackgroundColor3 = props.BackgroundColor3 or THEME.Panel
	props.BackgroundTransparency = props.BackgroundTransparency or 0.1
	props.BorderSizePixel = 0
	return make("Frame", props, { corner(8), stroke(THEME.Stroke, 2) })
end

local function text(props: { [string]: any }): TextLabel
	props.BackgroundTransparency = 1
	props.Font = props.Font or BODY_FONT
	props.TextColor3 = props.TextColor3 or THEME.Text
	props.TextScaled = props.TextScaled ~= false
	return make("TextLabel", props)
end

local function bar(parent: Instance, position: UDim2, size: UDim2, fillColor: Color3): Frame
	local back = make("Frame", {
		Parent = parent,
		Position = position,
		Size = size,
		BackgroundColor3 = Color3.fromRGB(10, 10, 12),
		BorderSizePixel = 0,
	}, { corner(4) })
	return make("Frame", {
		Parent = back,
		Name = "Fill",
		Size = UDim2.fromScale(1, 1),
		BackgroundColor3 = fillColor,
		BorderSizePixel = 0,
	}, { corner(4) })
end

----------------------------------------------------------------------
-- Screen
----------------------------------------------------------------------

local gui = make("ScreenGui", {
	Name = "HUD",
	ResetOnSpawn = false,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	Parent = player:WaitForChild("PlayerGui"),
})
local uiScale = make("UIScale", { Parent = gui })
local function updateScale()
	local camera = Workspace.CurrentCamera
	if camera then
		uiScale.Scale = math.clamp(camera.ViewportSize.X / 1280, 0.55, 1)
	end
end
updateScale()
Workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)

----------------------------------------------------------------------
-- Money (top-left)
----------------------------------------------------------------------

local moneyPanel = panel({ Parent = gui, Position = UDim2.fromOffset(16, 16), Size = UDim2.fromOffset(240, 62) })
-- Voxel coin: two squares
make("Frame", {
	Parent = moneyPanel,
	Position = UDim2.fromOffset(12, 13),
	Size = UDim2.fromOffset(30, 30),
	BackgroundColor3 = THEME.Gold,
	BorderSizePixel = 0,
}, {
	make("Frame", {
		Position = UDim2.fromOffset(9, 9),
		Size = UDim2.fromOffset(12, 12),
		BackgroundColor3 = Color3.fromRGB(200, 140, 30),
		BorderSizePixel = 0,
	}),
})
local moneyText = text({ Parent = moneyPanel, Position = UDim2.fromOffset(52, 8), Size = UDim2.fromOffset(110, 30), TextXAlignment = Enum.TextXAlignment.Left, TextColor3 = THEME.Gold })
local capText = text({ Parent = moneyPanel, Position = UDim2.fromOffset(160, 14), Size = UDim2.fromOffset(70, 20), TextXAlignment = Enum.TextXAlignment.Right, TextColor3 = THEME.Muted })
local moneyFill = bar(moneyPanel, UDim2.fromOffset(52, 44), UDim2.fromOffset(176, 7), THEME.Gold)

local function money(): number
	return player:GetAttribute("Money") or 0
end

local refreshShopButtons: () -> () = function() end

local function updateMoney()
	local cap = player:GetAttribute("MoneyCap") or 1
	moneyText.Text = `${money()}`
	capText.Text = `/ {cap}`
	moneyFill.Size = UDim2.fromScale(math.clamp(money() / cap, 0, 1), 1)
	-- Storage full: the bar turns red so the player spends money
	moneyFill.BackgroundColor3 = if money() >= cap then THEME.Blood else THEME.Gold
	refreshShopButtons()
end
player:GetAttributeChangedSignal("Money"):Connect(updateMoney)
player:GetAttributeChangedSignal("MoneyCap"):Connect(updateMoney)

----------------------------------------------------------------------
-- Wave + Town Hall HP (top-center)
----------------------------------------------------------------------

local wavePanel = panel({
	Parent = gui,
	AnchorPoint = Vector2.new(0.5, 0),
	Position = UDim2.new(0.5, 0, 0, 12),
	Size = UDim2.fromOffset(320, 100),
})
local waveTitle = text({ Parent = wavePanel, Font = TITLE_FONT, Position = UDim2.fromOffset(0, 6), Size = UDim2.new(1, 0, 0, 30), TextColor3 = THEME.Gold })
local waveStatus = text({ Parent = wavePanel, Position = UDim2.fromOffset(10, 38), Size = UDim2.new(1, -20, 0, 18), TextColor3 = THEME.Muted })
local hallFill = bar(wavePanel, UDim2.fromOffset(14, 66), UDim2.new(1, -28, 0, 22), THEME.Blood)
local hallText = text({ Parent = wavePanel, Position = UDim2.fromOffset(14, 68), Size = UDim2.new(1, -28, 0, 18), ZIndex = 3, TextStrokeTransparency = 0.4 })

local function enemiesLeft(): number
	local folder = Workspace:FindFirstChild("Enemies")
	return if folder then #folder:GetChildren() else 0
end

local function updateWave()
	local state = base:GetAttribute("WaveState") or "Waiting"
	local n = base:GetAttribute("WaveNumber") or 0
	if state == "Wave" then
		waveTitle.Text = `WAVE {n}`
		waveStatus.Text = `Wolves attacking — {enemiesLeft()} left`
		waveStatus.TextColor3 = THEME.Blood
	elseif state == "Intermission" then
		waveTitle.Text = `WAVE {n + 1}`
		waveStatus.Text = `Next wave in {base:GetAttribute("NextWaveIn") or 0}s`
		waveStatus.TextColor3 = THEME.Muted
	else
		waveTitle.Text = "THE FOREST IS QUIET"
		waveStatus.Text = "Waiting for the base owner"
		waveStatus.TextColor3 = THEME.Muted
	end
end

local function updateHall()
	local hp = townHall:GetAttribute("HP") or 0
	local maxHp = townHall:GetAttribute("MaxHP") or 1
	hallFill.Size = UDim2.fromScale(math.clamp(hp / maxHp, 0, 1), 1)
	hallText.Text = `TOWN HALL  {hp} / {maxHp}`
end

for _, name in { "WaveState", "WaveNumber", "NextWaveIn" } do
	base:GetAttributeChangedSignal(name):Connect(updateWave)
end
townHall:GetAttributeChangedSignal("HP"):Connect(updateHall)
townHall:GetAttributeChangedSignal("MaxHP"):Connect(updateHall)
task.spawn(function()
	local folder = Workspace:WaitForChild("Enemies", 30)
	if folder then
		folder.ChildAdded:Connect(updateWave)
		folder.ChildRemoved:Connect(updateWave)
	end
end)

----------------------------------------------------------------------
-- Notifications (bottom-center toasts)
----------------------------------------------------------------------

local toastHolder = make("Frame", {
	Parent = gui,
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -120),
	Size = UDim2.fromOffset(520, 200),
	BackgroundTransparency = 1,
}, {
	make("UIListLayout", {
		VerticalAlignment = Enum.VerticalAlignment.Bottom,
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		Padding = UDim.new(0, 6),
		SortOrder = Enum.SortOrder.LayoutOrder,
	}),
})
local toastCount = 0

local function toast(message: string)
	toastCount += 1
	local frame = panel({ Parent = toastHolder, Size = UDim2.fromOffset(500, 38), LayoutOrder = toastCount })
	local label = text({ Parent = frame, Text = message, Position = UDim2.fromOffset(12, 6), Size = UDim2.new(1, -24, 1, -12) })
	task.delay(3.5, function()
		local info = TweenInfo.new(0.5)
		TweenService:Create(frame, info, { BackgroundTransparency = 1 }):Play()
		TweenService:Create(label, info, { TextTransparency = 1 }):Play()
		task.wait(0.5)
		frame:Destroy()
	end)
end
Remotes:WaitForChild("Notify").OnClientEvent:Connect(toast)

----------------------------------------------------------------------
-- Werewolf shop
----------------------------------------------------------------------

local currentSlot: string? = nil
local spinning: { Model } = {}

local overlay = make("Frame", {
	Parent = gui,
	Name = "ShopOverlay",
	Active = true, -- blocks clicks to the world behind the shop
	Size = UDim2.fromScale(1, 1),
	BackgroundColor3 = Color3.new(0, 0, 0),
	BackgroundTransparency = 0.45,
	Visible = false,
	ZIndex = 10,
})
local shop = panel({
	Parent = overlay,
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.fromScale(0.5, 0.5),
	Size = UDim2.fromOffset(780, 420),
	BackgroundTransparency = 0.02,
	ZIndex = 11,
})
text({ Parent = shop, Font = TITLE_FONT, Text = "SUMMON A WEREWOLF", Position = UDim2.fromOffset(0, 10), Size = UDim2.new(1, 0, 0, 38), TextColor3 = THEME.Gold, ZIndex = 12 })
local shopSubtitle = text({ Parent = shop, Position = UDim2.fromOffset(0, 48), Size = UDim2.new(1, 0, 0, 18), TextColor3 = THEME.Muted, ZIndex = 12 })
local closeButton = make("TextButton", {
	Parent = shop,
	Text = "X",
	Font = BODY_FONT,
	TextScaled = true,
	TextColor3 = THEME.Text,
	BackgroundColor3 = THEME.Blood,
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, -10, 0, 10),
	Size = UDim2.fromOffset(34, 34),
	ZIndex = 12,
}, { corner(6) })

local cards = make("Frame", {
	Parent = shop,
	Position = UDim2.fromOffset(20, 80),
	Size = UDim2.new(1, -40, 1, -96),
	BackgroundTransparency = 1,
	ZIndex = 11,
}, {
	make("UIListLayout", {
		FillDirection = Enum.FillDirection.Horizontal,
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		Padding = UDim.new(0, 12),
	}),
})

local buyButtons: { [string]: TextButton } = {}

local function closeShop()
	overlay.Visible = false
	currentSlot = nil
end

local function buildCard(unitId: string, order: number)
	local info = DataConfig.GetUnit(unitId)
	if not info then
		return
	end
	local rarity = DataConfig.Rarities[info.Rarity]
	local card = make("Frame", {
		Parent = cards,
		LayoutOrder = order,
		Size = UDim2.fromOffset(173, 324),
		BackgroundColor3 = THEME.PanelLight,
		BorderSizePixel = 0,
		ZIndex = 12,
	}, { corner(8), stroke(rarity.Color, 2) })
	make("Frame", { Parent = card, Size = UDim2.new(1, 0, 0, 6), BackgroundColor3 = rarity.Color, BorderSizePixel = 0, ZIndex = 13 }, { corner(8) })

	-- 3D preview of the werewolf
	local viewport = make("ViewportFrame", {
		Parent = card,
		Position = UDim2.fromOffset(6, 10),
		Size = UDim2.new(1, -12, 0, 150),
		BackgroundColor3 = Color3.fromRGB(14, 12, 16),
		Ambient = Color3.fromRGB(140, 130, 130),
		LightColor = Color3.fromRGB(255, 240, 220),
		LightDirection = Vector3.new(-1, -1, 1),
		ZIndex = 13,
	}, { corner(6) })
	local model = UnitModels.Build(info.Model)
	model:PivotTo(CFrame.new())
	model.Parent = viewport
	table.insert(spinning, model)
	local camera = make("Camera", { Parent = viewport, FieldOfView = 40 })
	camera.CFrame = CFrame.lookAt(Vector3.new(4, 6.5, -14), Vector3.new(0, 4.3, 0))
	viewport.CurrentCamera = camera

	text({ Parent = card, Font = TITLE_FONT, Text = info.DisplayName, Position = UDim2.fromOffset(6, 164), Size = UDim2.new(1, -12, 0, 28), ZIndex = 13 })
	text({ Parent = card, Text = rarity.DisplayName:upper(), Position = UDim2.fromOffset(6, 192), Size = UDim2.new(1, -12, 0, 16), TextColor3 = rarity.Color, ZIndex = 13 })
	text({
		Parent = card,
		Text = `{rarity.AttackType}  ·  {info.Damage} dmg\n{info.Range} range  ·  {info.FireRate}/s`,
		Position = UDim2.fromOffset(8, 214),
		Size = UDim2.new(1, -16, 0, 36),
		TextColor3 = THEME.Muted,
		ZIndex = 13,
	})
	local buy = make("TextButton", {
		Parent = card,
		Font = BODY_FONT,
		TextScaled = true,
		Text = `${info.Price}`,
		TextColor3 = Color3.fromRGB(30, 22, 10),
		BackgroundColor3 = THEME.Gold,
		Position = UDim2.new(0, 10, 1, -54),
		Size = UDim2.new(1, -20, 0, 42),
		ZIndex = 13,
	}, { corner(6), make("UIPadding", { PaddingTop = UDim.new(0, 8), PaddingBottom = UDim.new(0, 8) }) })
	buyButtons[unitId] = buy
	buy.Activated:Connect(function()
		if currentSlot and money() >= info.Price then
			Remotes:WaitForChild("RequestPlaceUnit"):FireServer(currentSlot, unitId)
			closeShop()
		end
	end)
end

for i, unitId in UNIT_ORDER do
	buildCard(unitId, i)
end

refreshShopButtons = function()
	for unitId, button in buyButtons do
		local info = DataConfig.GetUnit(unitId)
		local affordable = info ~= nil and money() >= info.Price
		button.BackgroundColor3 = if affordable then THEME.Gold else THEME.Disabled
		button.TextColor3 = if affordable then Color3.fromRGB(30, 22, 10) else THEME.Muted
		button.AutoButtonColor = affordable
	end
end

local function openShop(slot: string)
	currentSlot = slot
	local plot = base:FindFirstChild("BrainrotPlots") and base.BrainrotPlots:FindFirstChild("Plot" .. slot)
	local spot = plot and plot:FindFirstChild("Spot")
	local row = spot and spot:GetAttribute("Row")
	shopSubtitle.Text = if row then `Plot #{slot}  ·  Row {row}` else `Plot #{slot}`
	refreshShopButtons()
	overlay.Visible = true
end

closeButton.Activated:Connect(closeShop)
Remotes:WaitForChild("OpenShop").OnClientEvent:Connect(openShop)

-- Slowly spin the previews while the shop is open
RunService.RenderStepped:Connect(function(dt)
	if overlay.Visible then
		for _, model in spinning do
			model:PivotTo(model:GetPivot() * CFrame.Angles(0, dt * 0.8, 0))
		end
	end
end)

----------------------------------------------------------------------
-- Initial state
----------------------------------------------------------------------

updateMoney()
updateWave()
updateHall()
