extends RefCounted
class_name InheritanceDB

const PATH := "res://content/inheritances.json"

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

static func all() -> Dictionary:
	_ensure()
	return _data.get("cards", {})

static func card(card_id: String) -> Dictionary:
	_ensure()
	return _data.get("cards", {}).get(card_id, {})

static func offers(phase: String, p_day: int = 1) -> Array[String]:
	_ensure()
	var out: Array[String] = []
	var offers_data = _data.get("offers", {})
	var source: Variant = offers_data
	if offers_data is Dictionary and offers_data.has(str(p_day)):
		source = offers_data[str(p_day)]
	elif offers_data is Dictionary and offers_data.has("day_%02d" % p_day):
		source = offers_data["day_%02d" % p_day]
	if not source is Dictionary:
		return out
	for card_id in source.get(phase, []):
		out.append(String(card_id))
	return out

static func modifiers(card_ids: Array[String]) -> Dictionary:
	_ensure()
	var totals: Dictionary = {}
	var cards: Dictionary = _data.get("cards", {})
	for card_id in card_ids:
		var card_data: Dictionary = cards.get(card_id, {})
		for key in card_data.get("modifiers", {}).keys():
			totals[key] = int(totals.get(key, 0)) + int(card_data["modifiers"][key])
	return totals
