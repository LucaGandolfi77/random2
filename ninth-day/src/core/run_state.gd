extends Node

## RunState is the single source of truth for the meta layer: day, phase,
## flags, bonds, and the memories Cael keeps between loops.
## The battle simulation never reads this directly; the screen layer passes
## the small number of values the simulation needs.

const SAVE_PATH := "user://ninth_day_run.json"
const PHASES: Array[String] = ["morning", "afternoon", "night"]
const LAST_AUTHORED_DAY := 9
const BOND_IDS: Array[String] = ["mara", "iven", "wren", "oria", "toma", "vey"]
const BOND_MAX := 3

## Optional bond threads. Each one unlocks the day after its anchor day and
## grants a memory of its own. Two of them end in an elite battle.
const SIDE_THREADS := {
	"mara": {
		"name": "The Second Batch",
		"after_day": 2,
		"story_id": "side_mara",
		"inheritance": "second_batch",
		"battle": "",
		"bg": "ember_row",
		"closing": "Mara leaves the oven door open. The row smells like something beginning.",
	},
	"iven": {
		"name": "The Small Debts",
		"after_day": 3,
		"story_id": "side_iven",
		"inheritance": "small_debts",
		"battle": "hollow_choir_reborn",
		"bg": "checkpoint",
		"closing": "The Choir sings for the Watch. Iven does not look away.",
	},
	"wren": {
		"name": "Counting the Living",
		"after_day": 5,
		"story_id": "side_wren",
		"inheritance": "living_count",
		"battle": "",
		"bg": "roof",
		"closing": "Wren counts the windows twice. The second count is larger.",
	},
	"oria": {
		"name": "What the Roses Keep",
		"after_day": 6,
		"story_id": "side_oria",
		"inheritance": "rose_kept",
		"battle": "",
		"bg": "garden",
		"closing": "Oria cuts one rose and gives it to you. It does not wilt on the way down.",
	},
	"toma": {
		"name": "The Page After",
		"after_day": 7,
		"story_id": "side_toma",
		"inheritance": "page_after",
		"battle": "",
		"bg": "wren_house",
		"closing": "Toma writes the date, then the day after it. The ink holds.",
	},
	"vey": {
		"name": "The Door Left Open",
		"after_day": 8,
		"story_id": "side_vey",
		"inheritance": "door_open",
		"battle": "sera_remnant",
		"bg": "sanctuary",
		"closing": "Vey leaves the inner door open. Something in the dark decides not to follow.",
	},
	"ledger": {
		"name": "The Better Ledger",
		"after_day": 2,
		"kind": "interlude",
		"requires": {"flag": "elias_free"},
		"requirement_hint": "Elias must keep his ledger",
		"story_id": "side_ledger",
		"inheritance": "better_ledger",
		"battle": "",
		"bg": "ember_row",
		"closing": "Elias writes a new page. This time, no one is crossed out.",
	},
	"ninth_name": {
		"name": "The Ninth Name",
		"after_day": 5,
		"kind": "interlude",
		"requires": {"flag": "wren_truth"},
		"requirement_hint": "Wren must tell you who rang the Bell",
		"story_id": "side_ninth_name",
		"inheritance": "ninth_name",
		"battle": "",
		"bg": "garden",
		"closing": "Wren says the name once. The garden holds it without blooming.",
	},
	"remnant": {
		"name": "The Watch Remnant",
		"after_day": 6,
		"kind": "interlude",
		"requires": {"any_flags": ["allied_watch", "allied_rebels"]},
		"requirement_hint": "You must have chosen a side on Day 6",
		"story_id": "side_remnant",
		"inheritance": "watch_remnant",
		"battle": "watch_remnant",
		"bg": "checkpoint",
		"closing": "The checkpoint is quiet. The Watch is not gone; it is only waiting.",
	},
}
const DAY_PHASES := {
	1: {
		"morning": {"title": "Morning · The Crack", "type": "story · battle · inheritance", "encounter": "tutorial"},
		"afternoon": {"title": "Afternoon · Ember Row", "type": "story · battle · inheritance", "encounter": "ashwright"},
		"night": {"title": "Night · The Spire", "type": "story · choice", "encounter": ""},
	},
	2: {
		"morning": {"title": "Morning · The Checkpoint", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Watch Hound", "type": "story · battle · inheritance", "encounter": "watch_hound"},
		"night": {"title": "Night · A Debt Paid", "type": "story · choice", "encounter": ""},
	},
	3: {
		"morning": {"title": "Morning · Descent", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Counterweights", "type": "story · battle · inheritance", "encounter": "bellows"},
		"night": {"title": "Night · The Choir's Offer", "type": "story · choice", "encounter": ""},
	},
	4: {
		"morning": {"title": "Morning · Saint Orra", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Clockwork Saint", "type": "story · battle · inheritance", "encounter": "clockwork_saint"},
		"night": {"title": "Night · The First Wren", "type": "story · choice", "encounter": ""},
	},
	5: {
		"morning": {"title": "Morning · Wren's House", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Hollow Bellkeeper", "type": "story · battle · inheritance", "encounter": "hollow_bellkeeper"},
		"night": {"title": "Night · The First Crack", "type": "story · choice", "encounter": ""},
	},
	6: {
		"morning": {"title": "Morning · The Coup", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Watch Closes", "type": "story · battle · inheritance", "encounter": "iron_choir"},
		"night": {"title": "Night · The Hollowed", "type": "story · choice", "encounter": ""},
	},
	7: {
		"morning": {"title": "Morning · Vey's Sanctuary", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Offer", "type": "story · optional battle · inheritance", "encounter": "saint_of_ash"},
		"night": {"title": "Night · What Mercy Costs", "type": "story · choice", "encounter": ""},
	},
	8: {
		"morning": {"title": "Morning · The Ascent", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Unbound Saint", "type": "story · battle · inheritance", "encounter": "clockwork_unbound"},
		"night": {"title": "Night · The Ninth Day", "type": "story · choice", "encounter": ""},
	},
	9: {
		"morning": {"title": "Morning · The Last Morning", "type": "story · choice", "encounter": ""},
		"afternoon": {"title": "Afternoon · The Quiet", "type": "story · battle · inheritance", "encounter": "the_quiet"},
		"night": {"title": "Night · The Ninth Day", "type": "story · ending", "encounter": ""},
	},
}

var day: int = 1
var cycle_number: int = 1
var completed: Dictionary = {}
var flags: Dictionary = {}
var seen_lines: Dictionary = {}
var bonds: Dictionary = {}
var side_threads: Dictionary = {}
var inheritances: Array[String] = []
var equipped: Array[String] = []
var pending_phase: String = ""
var pending_story: String = ""
var pending_thread: String = ""
var pending_encounter: String = ""
var current_screen: String = "title"
var journal_return: String = "map"
var day_complete: bool = false
var cycle_complete: bool = false
var true_ending_seen: bool = false

func _ready() -> void:
	load_run()

func has_run() -> bool:
	return FileAccess.file_exists(SAVE_PATH)

func new_cycle() -> void:
	_reset_run()
	cycle_number = 1
	side_threads.clear()
	bonds.clear()
	inheritances.clear()
	equipped.clear()
	seen_lines.clear()
	true_ending_seen = false
	save()

## Carries memories and bonds into the next loop. Choices, phase completion,
## and ending postures reset; knowledge of the city does not.
func begin_next_cycle() -> void:
	cycle_number += 1
	_reset_run()
	save()

func _reset_run() -> void:
	day = 1
	completed.clear()
	flags.clear()
	pending_phase = ""
	pending_story = ""
	pending_thread = ""
	pending_encounter = ""
	current_screen = "title"
	journal_return = "map"
	day_complete = false
	cycle_complete = false

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
		"version": 2,
		"day": day,
		"cycle_number": cycle_number,
		"completed": completed.duplicate(),
		"flags": flags.duplicate(),
		"seen_lines": seen_lines.duplicate(),
		"bonds": bonds.duplicate(),
		"side_threads": side_threads.duplicate(),
		"inheritances": inheritances.duplicate(),
		"equipped": equipped.duplicate(),
		"pending_phase": pending_phase,
		"pending_story": pending_story,
		"pending_thread": pending_thread,
		"pending_encounter": pending_encounter,
		"current_screen": current_screen,
		"journal_return": journal_return,
		"day_complete": day_complete,
		"cycle_complete": cycle_complete,
		"true_ending_seen": true_ending_seen,
	}

func from_dict(data: Dictionary) -> void:
	day = int(data.get("day", 1))
	cycle_number = maxi(1, int(data.get("cycle_number", 1)))
	completed = _string_key_dict(data.get("completed", {}))
	flags = _string_key_dict(data.get("flags", {}))
	seen_lines = _string_key_dict(data.get("seen_lines", {}))
	bonds = _string_key_dict(data.get("bonds", {}))
	side_threads = _string_key_dict(data.get("side_threads", {}))
	inheritances = _string_array(data.get("inheritances", []))
	equipped = _string_array(data.get("equipped", []))
	pending_phase = String(data.get("pending_phase", ""))
	pending_story = String(data.get("pending_story", ""))
	pending_thread = String(data.get("pending_thread", ""))
	pending_encounter = String(data.get("pending_encounter", ""))
	current_screen = String(data.get("current_screen", "title"))
	journal_return = String(data.get("journal_return", "map"))
	day_complete = bool(data.get("day_complete", false))
	cycle_complete = bool(data.get("cycle_complete", false))
	true_ending_seen = bool(data.get("true_ending_seen", false))

func phase_key(p_day: int, phase: String) -> String:
	return "%d:%s" % [p_day, phase]

func is_phase_completed(p_day: int, phase: String) -> bool:
	return bool(completed.get(phase_key(p_day, phase), false))

func complete_phase(phase: String) -> void:
	completed[phase_key(day, phase)] = true
	if phase == "night":
		day_complete = true
	save()

func advance_day() -> void:
	pending_phase = ""
	current_screen = "map"
	if day < 9:
		day += 1
		day_complete = false
	else:
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
	if not DAY_PHASES.has(day):
		return ""
	for phase in PHASES:
		if not is_phase_completed(day, phase) and is_phase_unlocked(phase):
			return phase
	return ""

func phase_title(phase: String) -> String:
	return phase_title_for(day, phase)

func phase_title_for(p_day: int, phase: String) -> String:
	var data: Dictionary = DAY_PHASES.get(p_day, {}).get(phase, {})
	return String(data.get("title", phase.capitalize()))

func phase_type(phase: String) -> String:
	return phase_type_for(day, phase)

func phase_type_for(p_day: int, phase: String) -> String:
	var data: Dictionary = DAY_PHASES.get(p_day, {}).get(phase, {})
	return String(data.get("type", "story"))

func encounter_for_phase(phase: String) -> StringName:
	if day == 6 and phase == "afternoon":
		return &"sera_vane" if bool(get_flag("allied_rebels", false)) else &"iron_choir"
	if day == 7 and phase == "afternoon":
		return &"" if bool(get_flag("accepted_mercy", false)) else &"saint_of_ash"
	return StringName(phase_data(day, phase).get("encounter", ""))

func phase_data(p_day: int, phase: String) -> Dictionary:
	return DAY_PHASES.get(p_day, {}).get(phase, {})

func set_flag(flag_id: String, value: Variant = true) -> void:
	flags[flag_id] = value
	save()

func get_flag(flag_id: String, fallback: Variant = false) -> Variant:
	return flags.get(flag_id, fallback)

func mark_seen(line_id: String) -> void:
	seen_lines[line_id] = true

func add_bond(bond_id: String, amount: int = 1) -> void:
	bonds[bond_id] = mini(BOND_MAX, int(bonds.get(bond_id, 0)) + amount)
	save()

func bond_rank(bond_id: String) -> int:
	return int(bonds.get(bond_id, 0))

func all_bonds_maxed() -> bool:
	for bond_id in BOND_IDS:
		if bond_rank(bond_id) < BOND_MAX:
			return false
	return true

func side_thread_ids() -> Array[String]:
	var out: Array[String] = []
	for thread_id in SIDE_THREADS.keys():
		out.append(String(thread_id))
	return out

func side_thread_data(thread_id: String) -> Dictionary:
	return SIDE_THREADS.get(thread_id, {})

func is_side_thread_complete(thread_id: String) -> bool:
	return bool(side_threads.get(thread_id, false))

func side_thread_available(thread_id: String) -> bool:
	if is_side_thread_complete(thread_id):
		return false
	var data := side_thread_data(thread_id)
	if data.is_empty():
		return false
	if not _requirement_met(data.get("requires", {})):
		return false
	return is_phase_completed(int(data.get("after_day", 0)), "night")

func _requirement_met(requires: Variant) -> bool:
	if not requires is Dictionary or requires.is_empty():
		return true
	if requires.has("flag") and not bool(get_flag(String(requires["flag"]), false)):
		return false
	if requires.has("any_flags"):
		var any_met := false
		for flag_id in requires["any_flags"]:
			if bool(get_flag(String(flag_id), false)):
				any_met = true
				break
		if not any_met:
			return false
	if requires.has("thread") and not is_side_thread_complete(String(requires["thread"])):
		return false
	return true

func open_side_thread(thread_id: String) -> void:
	pending_story = String(side_thread_data(thread_id).get("story_id", ""))
	pending_thread = thread_id
	pending_phase = ""
	pending_encounter = ""
	current_screen = "side_story"
	save()

func complete_side_thread(thread_id: String) -> void:
	var data := side_thread_data(thread_id)
	if data.is_empty():
		return
	side_threads[thread_id] = true
	var card_id := String(data.get("inheritance", ""))
	if card_id != "":
		add_inheritance(card_id)
	pending_story = ""
	pending_thread = ""
	pending_encounter = ""
	current_screen = "map"
	save()

func clear_pending_story() -> void:
	pending_story = ""
	pending_thread = ""
	pending_encounter = ""

func open_journal(from_screen: String) -> void:
	journal_return = from_screen
	current_screen = "journal"
	save()

func true_ending_ready() -> bool:
	return bool(get_flag("ending_break", false)) \
		and bool(get_flag("has_hidden_bell", false)) \
		and all_bonds_maxed()

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
