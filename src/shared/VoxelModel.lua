--!strict
--[[
	VoxelModel — builds blocky (voxel / LEGO style) models out of small cube Parts.

	A definition describes boxes on a voxel grid:
	  {
	    VoxelSize = 0.5,                         -- studs per grid unit
	    Palette = { body = Color3, ... },        -- color keys used by voxels
	    Voxels = {
	      { Pos = Vector3.new(0, 2.5, 0), Size = Vector3.new(6, 3, 6), Color = "body" },
	      { Pos = ..., Color = "tooth", Group = "LowerJaw" },   -- Size defaults to 1x1x1
	    },
	    Groups = { LowerJaw = { Hinge = Vector3.new(0, 4.5, 2) } },  -- animated sub-models
	  }
	Pos is the box center in grid units; the model origin (0,0,0) is the bottom center.
	The model faces -Z (Roblox "front").

	Every group becomes a child Model whose PrimaryPart is an invisible "Hinge" part,
	so a jaw can be rotated with:  jaw:PivotTo(jaw:GetPivot() * CFrame.Angles(angle, 0, 0))
	The root model's PrimaryPart is an invisible "Root" part at the origin (use PivotTo to place it).
]]

local VoxelModel = {}

export type Voxel = {
	Pos: Vector3,
	Size: Vector3?,
	Color: string,
	Group: string?,
	Material: Enum.Material?,
}

export type Definition = {
	VoxelSize: number,
	Palette: { [string]: Color3 },
	Voxels: { Voxel },
	Groups: { [string]: { Hinge: Vector3 } }?,
	NeonColors: { [string]: boolean }?, -- palette keys rendered as Neon
}

local function invisiblePart(name: string, cframe: CFrame): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = Vector3.new(0.2, 0.2, 0.2)
	p.CFrame = cframe
	p.Transparency = 1
	p.Anchored = true
	p.CanCollide = false
	p.CanQuery = false
	p.CanTouch = false
	return p
end

-- Builds the model at the world origin. paletteOverride replaces some palette colors
-- (e.g. a different body color for a rarer unit).
function VoxelModel.Build(def: Definition, name: string, paletteOverride: { [string]: Color3 }?): Model
	local vs = def.VoxelSize
	local model = Instance.new("Model")
	model.Name = name

	local root = invisiblePart("Root", CFrame.new())
	root.Parent = model
	model.PrimaryPart = root

	local groups: { [string]: Model } = {}
	for groupName, info in def.Groups or {} do
		local g = Instance.new("Model")
		g.Name = groupName
		local hinge = invisiblePart("Hinge", CFrame.new(info.Hinge * vs))
		hinge.Parent = g
		g.PrimaryPart = hinge
		g.Parent = model
		groups[groupName] = g
	end

	for i, v in def.Voxels do
		local key = v.Color
		local color = (paletteOverride and paletteOverride[key]) or def.Palette[key] or Color3.new(1, 0, 1)
		local p = Instance.new("Part")
		p.Name = key
		p.Size = (v.Size or Vector3.one) * vs
		p.CFrame = CFrame.new(v.Pos * vs)
		p.Color = color
		p.Material = v.Material
			or (if def.NeonColors and def.NeonColors[key] then Enum.Material.Neon else Enum.Material.SmoothPlastic)
		p.TopSurface = Enum.SurfaceType.Smooth
		p.BottomSurface = Enum.SurfaceType.Smooth
		p.Anchored = true
		p.CanCollide = false
		p.Parent = if v.Group and groups[v.Group] then groups[v.Group] else model
	end

	return model
end

return VoxelModel
