extends Node

## RunState is the single source of truth for the meta layer: day, phase,
## flags, bonds, and the memories Cael keeps between loops.
## The battle simulation never reads this directly; the screen layer passes
## the small number of values the simulation needs.

const SAVE_PATH := "user://ninth_day_run.json"
const PHASES: Array[String] = ["morning", "afternoon", "night"]
const PHASE_TITLES := {
	"morning": "Morning · The Crack",
	"afternoon": "Afternoon · Ember Row",
	"night": "Night · The Spire",
}
const PHASE_ENCOUNTERS := {
	"morning": &"tutorial",
	"afternoon": &"ashwright",
	"night": &"full",
}
const PHASE_TYPES := {
	"morning": "story · battle · inheritance",
	"afternoon": "story · battle · inheritance",
	"night": "story · choice",
}

var day: int = 1
var completed: Dictionary = {}
var flags: Dictionary = {}
var seen_lines: Dictionary = {}
var bonds: Dictionary = {}
var inheritances: Array[String] = []
var equipped: Array[String] = []
var pending_phase: String = ""
var current_screen: String = "title"
var day_complete: bool = false

func _ready() -> void:
	load_run()

func has_run() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func new_cycle() -> void:
	day = 1
	completed.clear()
	flags.clear()
	seen_lines.clear()
	bonds.clear()
	inheritances.clear()
	equipped.clear()
	pending_phase = ""
	current_screen = "title"
	day_complete = false
	save()

func load_run() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	var text := file.get_as_text()
	file.close()
	var data = JSON.parse_string(text)
	if not data is Dictionary:
		return false
	from_dict(data)
	return true

func save() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(to_dict()))
	file.close()

func to_dict() -> Dictionary:
	return {
		"version": 1,
		"day": day,
		"completed": completed.duplicate(),
		"flags": flags.duplicate(),
		"seen_lines": seen_lines.duplicate(),
		"bonds": bonds.duplicate(),
		"inheritances": inheritances.duplicate(),
		"equipped": equipped.duplicate(),
		"pending_phase": pending_phase,
		"current_screen": current_screen,
		"day_complete": day_complete,
	}

func from_dict(data: Dictionary) -> void:
	day = int(data.get("day", 1))
	completed = _string_key_dict(data.get("completed", {}))
	flags = _string_key_dict(data.get("flags", {}))
	seen_lines = _string_key_dict(data.get("seen_lines", {}))
	bonds = _string_key_dict(data.get("bonds", {}))
	inheritances = _string_array(data.get("inheritances", []))
	equipped = _string_array(data.get("equipped", []))
	pending_phase = String(data.get("pending_phase", ""))
	current_screen = String(data.get("current_screen", "title"))
	day_complete = bool(data.get("day_complete", false))

func phase_key(p_day: int, phase: String) -> String:
	return "%d:%s" % [p_day, phase]

func is_phase_completed(p_day: int, phase: String) -> bool:
	return bool(completed.get(phase_key(p_day, phase), false))

func complete_phase(phase: String) -> void:
	completed[phase_key(day, phase)] = true
	if phase == "night":
		day_complete = true
	save()

func is_phase_unlocked(phase: String) -> bool:
	match phase:
		"morning":
			return true
		"afternoon":
			return is_phase_completed(day, "morning")
		"night":
			return is_phase_completed(day, "afternoon")
		_:
			return false

func is_day_unlocked(p_day: int) -> bool:
	if p_day <= 1:
		return true
	return is_phase_completed(p_day - 1, "night")

func next_phase() -> String:
	for phase in PHASES:
		if not is_phase_completed(day, phase) and is_phase_unlocked(phase):
			return phase
	return ""

func phase_title(phase: String) -> String:
	return String(PHASE_TITLES.get(phase, phase.capitalize()))

func phase_type(phase: String) -> String:
	return String(PHASE_TYPES.get(phase, "story"))

func encounter_for_phase(phase: String) -> StringName:
	return StringName(PHASE_ENCOUNTERS.get(phase, &"full"))

func set_flag(flag_id: String, value: Variant = true) -> void:
	flags[flag_id] = value
	save()

func get_flag(flag_id: String, fallback: Variant = false) -> Variant:
	return flags.get(flag_id, fallback)

func mark_seen(line_id: String) -> void:
	seen_lines[line_id] = true

func add_bond(bond_id: String, amount: int = 1) -> void:
	bonds[bond_id] = int(bonds.get(bond_id, 0)) + amount
	save()

func bond_rank(bond_id: String) -> int:
	return int(bonds.get(bond_id, 0))

func add_inheritance(inheritance_id: String) -> void:
	if inheritance_id == "":
		return
	if not inheritance_id in inheritances:
		inheritances.append(inheritance_id)
	if equipped.size() < 6 and not inheritance_id in equipped:
		equipped.append(inheritance_id)
	save()

func has_inheritance(inheritance_id: String) -> bool:
	return inheritance_id in inheritances

func battle_modifiers() -> Dictionary:
	return InheritanceDB.modifiers(equipped)

func _string_key_dict(value: Variant) -> Dictionary:
	var out: Dictionary = {}
	if value is Dictionary:
		for key in value.keys():
			out[String(key)] = value[key]
	return out

func _string_array(value: Variant) -> Array[String]:
	var out: Array[String] = []
	if value is Array:
		for item in value:
			out.append(String(item))
	return out
