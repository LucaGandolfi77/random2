extends RefCounted
class_name JournalDB

## Journal content: one recap line per phase and quiet thread, plus a
## knowledge-gated glossary. The journal is the diegetic record of what
## Cael keeps from loop to loop.

const PATH := "res://content/journal.json"

static var _data: Dictionary = {}

static func _ensure() -> void:
	if not _data.is_empty():
		return
	var file := FileAccess.open(PATH, FileAccess.READ)
	if file == null:
		return
	var parsed = JSON.parse_string(file.get_as_text())
	file.close()
	if parsed is Dictionary:
		_data = parsed

static func phase_entry(p_day: int, phase: String) -> Dictionary:
	_ensure()
	return _data.get("phases", {}).get("%d:%s" % [p_day, phase], {})

static func thread_entry(thread_id: String) -> Dictionary:
	_ensure()
	return _data.get("threads", {}).get(thread_id, {})

static func last_entry() -> Dictionary:
	for p_day in range(RunState.day, 0, -1):
		for phase in ["night", "afternoon", "morning"]:
			if not RunState.is_phase_completed(p_day, phase):
				continue
			var entry := phase_entry(p_day, phase)
			if not entry.is_empty():
				entry = entry.duplicate()
				entry["day"] = p_day
				entry["phase"] = phase
				return entry
	return {}

static func recap_line() -> String:
	var entry := last_entry()
	if entry.is_empty():
		return ""
	return "Day %d · %s\n%s" % [
		int(entry.get("day", 1)),
		String(entry.get("title", "Aurel")),
		String(entry.get("line", "")),
	]

static func glossary() -> Array[Dictionary]:
	_ensure()
	var out: Array[Dictionary] = []
	for entry in _data.get("glossary", []):
		if _unlocked(entry):
			out.append(entry)
	return out

static func glossary_total() -> int:
	_ensure()
	return _data.get("glossary", []).size()

static func _unlocked(entry: Dictionary) -> bool:
	if bool(entry.get("always", false)):
		return true
	var requires: Dictionary = entry.get("requires", {})
	if requires.is_empty():
		return false
	if requires.has("completed") and RunState.completed.has(String(requires["completed"])):
		return true
	if requires.has("any_completed"):
		for key in requires["any_completed"]:
			if RunState.completed.has(String(key)):
				return true
	if requires.has("flag") and bool(RunState.get_flag(String(requires["flag"]), false)):
		return true
	if requires.has("any_flags"):
		for flag_id in requires["any_flags"]:
			if bool(RunState.get_flag(String(flag_id), false)):
				return true
	if requires.has("thread") and RunState.is_side_thread_complete(String(requires["thread"])):
		return true
	if requires.has("bond"):
		var bond_parts: Array = requires["bond"]
		if bond_parts.size() >= 2 and RunState.bond_rank(String(bond_parts[0])) >= int(bond_parts[1]):
			return true
	if requires.has("cycle_after") and RunState.cycle_number > int(requires["cycle_after"]):
		return true
	if bool(requires.get("true_ending", false)) and RunState.true_ending_seen:
		return true
	return false

static func reload() -> void:
	_data.clear()
	_ensure()
