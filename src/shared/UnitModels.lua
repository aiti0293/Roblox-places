--!strict
--[[
	UnitModels — voxel definitions of the units (see VoxelModel).

	Every unit is a werewolf: tall, hunched and muscular, black fur, blood stains,
	glowing eyes and very long sharp fangs. The head is the UpperJaw group, the
	LowerJaw group (with lower fangs) has a hinge at its back and swings open
	before an attack:
	    LowerJaw:PivotTo(LowerJaw:GetPivot() * CFrame.Angles(UnitModels.JawOpenAngle, 0, 0))
	Rarities share the body; a skin changes eye color and fur tint.
	Height ~9 studs, the model faces -Z, origin = bottom center.
]]

local VoxelModel = require(script.Parent.VoxelModel)

local UnitModels = {}

UnitModels.JawOpenAngle = math.rad(-40) -- negative = jaw swings down

local V = Vector3.new

local voxels: { VoxelModel.Voxel } = {
	-- Paws, digitigrade legs, hips
	{ Pos = V(-2, 0.5, -1), Size = V(2.2, 1, 3.5), Color = "dark" },
	{ Pos = V(2, 0.5, -1), Size = V(2.2, 1, 3.5), Color = "dark" },
	{ Pos = V(-2, 2, 0.6), Size = V(1.6, 3, 1.6), Color = "fur" },
	{ Pos = V(2, 2, 0.6), Size = V(1.6, 3, 1.6), Color = "fur" },
	{ Pos = V(-2, 4.5, -0.3), Size = V(2.4, 2.5, 2.6), Color = "fur2" },
	{ Pos = V(2, 4.5, -0.3), Size = V(2.4, 2.5, 2.6), Color = "fur2" },
	{ Pos = V(0, 6, 0), Size = V(5, 1.6, 3.2), Color = "fur" },
	-- Tail
	{ Pos = V(0, 5.8, 2.4), Size = V(1.2, 1.2, 2), Color = "fur" },
	{ Pos = V(0, 5.1, 3.9), Size = V(1, 1, 1.6), Color = "dark" },

	-- Torso: abdomen, huge chest, traps
	{ Pos = V(0, 7.8, -0.2), Size = V(4.4, 2.4, 3), Color = "fur" },
	{ Pos = V(0, 10.3, -0.8), Size = V(7, 3, 4), Color = "fur" },
	{ Pos = V(0, 12.2, 0), Size = V(8.4, 1.6, 3.6), Color = "fur" },
	-- Muscles: pecs and abs
	{ Pos = V(-1.4, 10.4, -2.95), Size = V(2.4, 2, 0.4), Color = "fur2" },
	{ Pos = V(1.4, 10.4, -2.95), Size = V(2.4, 2, 0.4), Color = "fur2" },
	{ Pos = V(-0.7, 8.4, -1.85), Size = V(1.2, 0.8, 0.4), Color = "fur2" },
	{ Pos = V(0.7, 8.4, -1.85), Size = V(1.2, 0.8, 0.4), Color = "fur2" },
	{ Pos = V(-0.7, 7.4, -1.85), Size = V(1.2, 0.8, 0.4), Color = "fur2" },
	{ Pos = V(0.7, 7.4, -1.85), Size = V(1.2, 0.8, 0.4), Color = "fur2" },
	-- Mane spikes along the back
	{ Pos = V(-1.6, 13.3, 1.3), Size = V(1, 1.2, 1.6), Color = "dark" },
	{ Pos = V(0, 13.7, 1.5), Size = V(1.2, 1.6, 1.8), Color = "dark" },
	{ Pos = V(1.6, 13.3, 1.3), Size = V(1, 1.2, 1.6), Color = "dark" },
	{ Pos = V(0, 11, 1.6), Size = V(2.4, 1.2, 1), Color = "dark" },

	-- Arms: shoulders, upper arms, big forearms, hands with long claws
	{ Pos = V(-4.4, 11.6, -0.6), Size = V(2.6, 2.6, 2.8), Color = "fur2" },
	{ Pos = V(4.4, 11.6, -0.6), Size = V(2.6, 2.6, 2.8), Color = "fur2" },
	{ Pos = V(-4.9, 9.3, -0.8), Size = V(2.2, 3.2, 2.2), Color = "fur" },
	{ Pos = V(4.9, 9.3, -0.8), Size = V(2.2, 3.2, 2.2), Color = "fur" },
	{ Pos = V(-5.2, 6.5, -1.4), Size = V(2.6, 3, 2.6), Color = "fur2" },
	{ Pos = V(5.2, 6.5, -1.4), Size = V(2.6, 3, 2.6), Color = "fur2" },
	{ Pos = V(-5.3, 4.4, -1.8), Size = V(2.4, 1.4, 2.4), Color = "dark" },
	{ Pos = V(5.3, 4.4, -1.8), Size = V(2.4, 1.4, 2.4), Color = "dark" },

	-- Neck
	{ Pos = V(0, 12.7, -1.7), Size = V(3, 1.6, 2.4), Color = "fur" },
	-- Inside of the mouth (visible when the jaw opens)
	{ Pos = V(0, 12.95, -5), Size = V(2, 0.4, 2.6), Color = "mouth" },

	-- Blood: chest splatter, abs, chin
	{ Pos = V(1.3, 9.6, -3.2), Size = V(1.6, 1.2, 0.2), Color = "blood" },
	{ Pos = V(0.6, 9, -3.2), Size = V(0.4, 1, 0.2), Color = "blood" },
	{ Pos = V(-0.9, 7.9, -2.1), Size = V(0.8, 0.5, 0.2), Color = "blood" },

	-- HEAD (UpperJaw): skull, snout, nose, glowing eyes, brow, ears
	{ Pos = V(0, 14.2, -2.6), Size = V(4, 3, 3.6), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(0, 13.8, -5.4), Size = V(2.6, 1.6, 2.6), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(0, 14.5, -6.8), Size = V(1, 0.6, 0.4), Color = "nose", Group = "UpperJaw" },
	{ Pos = V(-1.1, 14.8, -4.45), Size = V(0.9, 0.5, 0.2), Color = "eye", Group = "UpperJaw" },
	{ Pos = V(1.1, 14.8, -4.45), Size = V(0.9, 0.5, 0.2), Color = "eye", Group = "UpperJaw" },
	{ Pos = V(0, 15.4, -4.3), Size = V(3.8, 0.6, 0.8), Color = "dark", Group = "UpperJaw" },
	{ Pos = V(-1.4, 16.6, -2.2), Size = V(1, 2.2, 1), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(1.4, 16.6, -2.2), Size = V(1, 2.2, 1), Color = "fur", Group = "UpperJaw" },
	{ Pos = V(-1.4, 17.9, -2.2), Size = V(0.6, 0.6, 0.6), Color = "dark", Group = "UpperJaw" },
	{ Pos = V(1.4, 17.9, -2.2), Size = V(0.6, 0.6, 0.6), Color = "dark", Group = "UpperJaw" },
	-- Upper teeth: two very long fangs + small teeth
	{ Pos = V(-1.0, 12.1, -6.75), Size = V(0.4, 2, 0.4), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(1.0, 12.1, -6.75), Size = V(0.4, 2, 0.4), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(-0.3, 12.6, -6.5), Size = V(0.3, 0.8, 0.3), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(0.3, 12.6, -6.5), Size = V(0.3, 0.8, 0.3), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(-1.15, 12.6, -5.3), Size = V(0.3, 0.8, 0.3), Color = "tooth", Group = "UpperJaw" },
	{ Pos = V(1.15, 12.6, -5.3), Size = V(0.3, 0.8, 0.3), Color = "tooth", Group = "UpperJaw" },
	-- Blood on the upper fangs
	{ Pos = V(-1.0, 11.05, -6.75), Size = V(0.42, 0.3, 0.42), Color = "blood", Group = "UpperJaw" },
	{ Pos = V(1.0, 11.05, -6.75), Size = V(0.42, 0.3, 0.42), Color = "blood", Group = "UpperJaw" },

	-- LOWER JAW: jaw, lower fangs sticking up in front of the snout, bloody chin
	{ Pos = V(0, 12.4, -5.2), Size = V(2.4, 1, 2.8), Color = "fur", Group = "LowerJaw" },
	{ Pos = V(-0.5, 13.4, -6.85), Size = V(0.35, 1.6, 0.35), Color = "tooth", Group = "LowerJaw" },
	{ Pos = V(0.5, 13.4, -6.85), Size = V(0.35, 1.6, 0.35), Color = "tooth", Group = "LowerJaw" },
	{ Pos = V(0, 12.95, -6.6), Size = V(1, 0.5, 0.3), Color = "tooth", Group = "LowerJaw" },
	{ Pos = V(0, 11.8, -6.2), Size = V(1.4, 0.3, 0.8), Color = "blood", Group = "LowerJaw" },
}

-- Long claws with bloody tips (3 per hand)
for _, side in { -1, 1 } do
	for _, dx in { -0.8, 0, 0.8 } do
		table.insert(voxels, { Pos = V(side * 5.3 + dx, 3.0, -2.5), Size = V(0.4, 1.6, 0.4), Color = "tooth" })
		table.insert(voxels, { Pos = V(side * 5.3 + dx, 2.05, -2.5), Size = V(0.42, 0.4, 0.42), Color = "blood" })
	end
	-- Toe claws
	for _, dx in { -0.7, 0, 0.7 } do
		table.insert(voxels, { Pos = V(side * 2 + dx, 0.35, -3.05), Size = V(0.4, 0.4, 0.7), Color = "tooth" })
	end
end

local WEREWOLF: VoxelModel.Definition = {
	VoxelSize = 0.5,
	Palette = {
		fur = Color3.fromRGB(24, 22, 26),
		fur2 = Color3.fromRGB(40, 36, 42), -- muscle highlights
		dark = Color3.fromRGB(10, 9, 11),
		nose = Color3.fromRGB(5, 5, 5),
		eye = Color3.fromRGB(255, 30, 30),
		tooth = Color3.fromRGB(236, 230, 212),
		blood = Color3.fromRGB(125, 0, 10),
		mouth = Color3.fromRGB(70, 0, 8),
	},
	NeonColors = { eye = true },
	Groups = {
		UpperJaw = { Hinge = V(0, 12.9, -3.8) },
		LowerJaw = { Hinge = V(0, 12.9, -3.8) },
	},
	Voxels = voxels,
}

-- Skins per unit: same black werewolf, different eyes / fur tint by rarity
local SKINS: { [string]: { [string]: Color3 }? } = {
	Ripper = nil, -- Common: red eyes
	Bloodfang = { -- Rare: fiery eyes, reddish fur
		eye = Color3.fromRGB(255, 140, 20),
		fur2 = Color3.fromRGB(58, 30, 26),
	},
	Nightmaw = { -- Epic: violet eyes, purple sheen
		eye = Color3.fromRGB(190, 70, 255),
		fur2 = Color3.fromRGB(42, 30, 58),
	},
	Alpha = { -- Legendary: golden eyes, silver muscles
		eye = Color3.fromRGB(255, 205, 40),
		fur2 = Color3.fromRGB(78, 78, 86),
	},
}

-- Builds a unit model at the origin (bottom center, facing -Z)
function UnitModels.Build(modelKey: string): Model
	return VoxelModel.Build(WEREWOLF, modelKey, SKINS[modelKey])
end

return UnitModels
