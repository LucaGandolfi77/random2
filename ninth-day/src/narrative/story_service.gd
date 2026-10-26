extends Node
class_name StoryService

## A small, deterministic dialogue runner for the vertical slice.
## The API mirrors the planned InkService: start, line, choices, end.
## Swapping this for inkgd later only touches this file and StoryView.

signal line_ready(line: Dictionary)
signal choices_ready(prompt: String, choices: Array)
signal story_ended(story_id: String)

const STORY_PATH := "res://content/stories/day_01.json"

var story_id: String = ""
var story: Dictionary = {}
var node_id: String = ""
var line_index: int = -1
var state: Node = null

func start(p_story_id: String) -> bool:
	story_id = p_story_id
	var file := FileAccess.open(STORY_PATH, FileAccess.READ)
	if file == null:
		push_warning("Cannot open story file: " + STORY_PATH)
		return false
	var all_stories = JSON.parse_string(file.get_as_text())
	file.close()
	if not all_stories is Dictionary or not all_stories.has(p_story_id):
		push_warning("Unknown story: " + p_story_id)
		return false
	story = all_stories[p_story_id]
	_goto(String(story.get("start", "")))
	return true

func current_line() -> Dictionary:
	if node_id == "" or line_index < 0:
		return {}
	var node: Dictionary = _node()
	var lines: Array = node.get("lines", [])
	if line_index >= lines.size():
		return {}
	return lines[line_index]

func story_title() -> String:
	return String(story.get("title", "Untitled"))

func current_choices() -> Array:
	if node_id == "":
		return []
	return _visible_choices(_node())

func current_prompt() -> String:
	if node_id == "":
		return ""
	return String(_node().get("prompt", ""))

func is_finished() -> bool:
	if node_id == "":
		return true
	var node := _node()
	var lines: Array = node.get("lines", [])
	return line_index >= lines.size() and node.get("choices", []).is_empty() and String(node.get("next", "")) == ""

func advance() -> void:
	if node_id == "":
		return
	var node: Dictionary = _node()
	var lines: Array = node.get("lines", [])
	line_index += 1
	while line_index < lines.size() and not _line_visible(lines[line_index]):
		line_index += 1
	if line_index < lines.size():
		_emit_line(lines[line_index])
	else:
		_node_finished(node)

func choose(index: int) -> void:
	var node: Dictionary = _node()
	var visible := _visible_choices(node)
	if index < 0 or index >= visible.size():
		return
	var choice: Dictionary = visible[index]
	var flag_id := String(choice.get("flag", ""))
	if flag_id != "" and state != null:
		state.set_flag(flag_id, true)
	var bond = choice.get("bond", [])
	if bond is Array and bond.size() >= 2 and state != null:
		state.add_bond(String(bond[0]), int(bond[1]))
	var next_id := String(choice.get("next", ""))
	if next_id == "":
		story_ended.emit(story_id)
	else:
		_goto(next_id)

func _goto(p_node_id: String) -> void:
	if p_node_id == "" or not story.get("nodes", {}).has(p_node_id):
		story_ended.emit(story_id)
		return
	node_id = p_node_id
	line_index = -1
	var node: Dictionary = _node()
	var lines: Array = node.get("lines", [])
	while line_index + 1 < lines.size() and not _line_visible(lines[line_index + 1]):
		line_index += 1
	line_index += 1
	if line_index < lines.size():
		_emit_line(lines[line_index])
	elif not node.get("choices", []).is_empty():
		_emit_choices(node)
	else:
		_node_finished(node)

func _node_finished(node: Dictionary) -> void:
	var next_id := String(node.get("next", ""))
	if next_id != "":
		_goto(next_id)
	elif not node.get("choices", []).is_empty():
		_emit_choices(node)
	else:
		story_ended.emit(story_id)

func _emit_line(line: Dictionary) -> void:
	var line_id := String(line.get("id", ""))
	var merged := line.duplicate()
	if not merged.has("bg") and _node().has("bg"):
		merged["bg"] = _node()["bg"]
	if line_id != "":
		if state != null:
			state.mark_seen(line_id)
	line_ready.emit(merged)

func _emit_choices(node: Dictionary) -> void:
	var visible := _visible_choices(node)
	if visible.is_empty():
		story_ended.emit(story_id)
		return
	choices_ready.emit(String(node.get("prompt", "")), visible)

func _visible_choices(node: Dictionary) -> Array:
	var out: Array = []
	for choice in node.get("choices", []):
		if _choice_visible(choice):
			out.append(choice)
	return out

func _choice_visible(choice: Dictionary) -> bool:
	var condition := String(choice.get("condition", ""))
	if condition == "":
		return true
	if condition.begins_with("!"):
		return not _flag(condition.substr(1), false)
	return _flag(condition, false)

func _line_visible(line: Dictionary) -> bool:
	var condition := String(line.get("condition", ""))
	if condition == "":
		return true
	if condition.begins_with("!"):
		return not _flag(condition.substr(1), false)
	return _flag(condition, false)

func _flag(flag_id: String, fallback: Variant = false) -> Variant:
	if state == null:
		return fallback
	return state.get_flag(flag_id, fallback)

func _node() -> Dictionary:
	return story.get("nodes", {}).get(node_id, {})
