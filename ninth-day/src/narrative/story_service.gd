extends Node
class_name StoryService

## Ink-backed dialogue service for the vertical slice.
## The runtime is inkgd; this adapter turns Ink lines and tags into the small
## presentation objects StoryView understands, and mirrors choice flags into
## RunState.

signal line_ready(line: Dictionary)
signal choices_ready(prompt: String, choices: Array)
signal story_ended(story_id: String)

const InkPlayerFactory := preload("res://addons/inkgd/ink_player_factory.gd")
const InkResource := preload("res://addons/inkgd/editor/import_plugins/ink_resource.gd")
const INK_JSON := "res://content/ink/day_01.ink.json"
const TITLES := {
	"day_01_morning": "The Crack",
	"day_01_afternoon": "Ember Row",
	"day_01_night": "What the Bell Keeps",
	"day_02_morning": "The Checkpoint",
	"day_02_afternoon": "The Watch Hound",
	"day_02_night": "A Debt Paid",
	"day_03_morning": "Descent",
	"day_03_afternoon": "The Counterweights",
	"day_03_night": "The Choir's Offer",
	"day_04_morning": "Saint Orra",
	"day_04_afternoon": "The Clockwork Saint",
	"day_04_night": "The First Wren",
	"day_05_morning": "Wren's House",
	"day_05_afternoon": "The Hollow Bellkeeper",
	"day_05_night": "The First Crack",
	"day_06_morning": "The Coup",
	"day_06_afternoon": "The Watch Closes",
	"day_06_night": "The Hollowed",
	"day_07_morning": "Vey's Sanctuary",
	"day_07_afternoon": "The Offer",
	"day_07_night": "What Mercy Costs",
	"day_08_morning": "The Ascent",
	"day_08_afternoon": "The Unbound Saint",
	"day_08_night": "The Ninth Day",
}
const INK_STATE_VARS := {
	"day_06_": ["allied_watch", "allied_rebels", "refused_all"],
	"day_07_": ["accepted_sanctuary", "questioned_vey", "refused_sanctuary", "accepted_mercy"],
	"day_08_": ["carried_ember", "carried_orra", "carried_watch"],
}

var story_id: String = ""
var state: Node = null

var _player: Node = null
var _loaded: bool = false
var _finished: bool = false
var _choice_cache: Array = []
var _last_line: Dictionary = {}
var _last_bg: String = ""
var _emitted_end: bool = false

func start(p_story_id: String) -> bool:
	story_id = p_story_id
	_finished = false
	_emitted_end = false
	_choice_cache.clear()
	_last_line.clear()
	_last_bg = ""
	_loaded = false
	if not FileAccess.file_exists(_ink_path_for(p_story_id)):
		push_warning("Missing compiled Ink story for: " + p_story_id)
		return false
	if _player != null:
		_player.queue_free()
		_player = null
	_player = InkPlayerFactory.create()
	_player.loads_in_background = false
	add_child(_player)
	var resource = InkResource.new()
	resource.json = FileAccess.get_file_as_string(_ink_path_for(p_story_id))
	_player.ink_file = resource
	_player.loaded.connect(_on_loaded.bind(p_story_id))
	_player.ended.connect(_on_ended)
	_player.create_story.call_deferred()
	return true

func advance() -> void:
	if _player == null or not _loaded or _finished:
		return
	_pump()

func choose(index: int) -> void:
	if _player == null or not _loaded or _finished:
		return
	if index < 0 or index >= _choice_cache.size():
		return
	_player.choose_choice_index(index)
	_choice_cache.clear()
	_pump()

func story_title() -> String:
	return String(TITLES.get(story_id, "Untitled"))

func current_line() -> Dictionary:
	return _last_line

func current_choices() -> Array:
	return _choice_cache.duplicate()

func current_prompt() -> String:
	return ""

func is_finished() -> bool:
	return _finished

func _on_loaded(successfully: bool, p_story_id: String) -> void:
	if not successfully:
		push_warning("Ink story failed to load: " + p_story_id)
		_emit_end()
		return
	_loaded = true
	if state != null:
		for prefix in INK_STATE_VARS.keys():
			if p_story_id.begins_with(prefix):
				for variable_name in INK_STATE_VARS[prefix]:
					_player.set_variable(variable_name, bool(state.get_flag(variable_name, false)))
	_player.choose_path(p_story_id)
	_pump()

func _on_ended() -> void:
	_finished = true
	_emit_end()

func _pump() -> void:
	for i in 80:
		if _finished or _emitted_end:
			return
		if _player.has_choices:
			_choice_cache = _player.current_choices.duplicate()
			var choices: Array = []
			for choice in _choice_cache:
				choices.append({
					"text": String(choice.text).strip_edges(),
					"tags": choice.tags if choice.tags != null else [],
				})
			choices_ready.emit("", choices)
			return
		if not _player.can_continue:
			_finished = true
			_emit_end()
			return

		var raw_text: String = _player.continue_story()
		var metadata := _parse_tags(_player.current_tags)
		var text: String = raw_text.strip_edges()
		if text == "":
			continue

		var bg := String(metadata.get("bg", ""))
		if bg == "":
			bg = _last_bg
		else:
			_last_bg = bg
		var line := {
			"id": metadata.get("id", ""),
			"speaker": metadata.get("speaker", "Narration"),
			"bg": bg,
			"portrait": metadata.get("portrait", ""),
			"expression": metadata.get("expression", ""),
			"text": text,
		}
		_last_line = line
		if state != null and String(line["id"]) != "":
			state.mark_seen(String(line["id"]))
		line_ready.emit(line)
		return

	_finished = true
	_emit_end()

func _parse_tags(tags: Array) -> Dictionary:
	var metadata: Dictionary = {}
	for raw_tag in tags:
		var tag := String(raw_tag).strip_edges()
		if tag == "":
			continue
		var separator := tag.find(":")
		if separator <= 0:
			continue
		var key := tag.substr(0, separator)
		var value := tag.substr(separator + 1)
		match key:
			"flag":
				if state != null:
					state.set_flag(value, true)
			"bond":
				var parts := value.split(":")
				if parts.size() >= 2 and state != null:
					state.add_bond(parts[0], int(parts[1]))
			_:
				metadata[key] = value
	return metadata

func _emit_end() -> void:
	if _emitted_end:
		return
	_emitted_end = true
	story_ended.emit(story_id)

func _ink_path_for(p_story_id: String) -> String:
	if p_story_id.begins_with("day_02_"):
		return "res://content/ink/day_02.ink.json"
	if p_story_id.begins_with("day_03_"):
		return "res://content/ink/day_03.ink.json"
	if p_story_id.begins_with("day_04_"):
		return "res://content/ink/day_04.ink.json"
	if p_story_id.begins_with("day_05_"):
		return "res://content/ink/day_05.ink.json"
	if p_story_id.begins_with("day_06_"):
		return "res://content/ink/day_06.ink.json"
	if p_story_id.begins_with("day_07_"):
		return "res://content/ink/day_07.ink.json"
	if p_story_id.begins_with("day_08_"):
		return "res://content/ink/day_08.ink.json"
	return INK_JSON
