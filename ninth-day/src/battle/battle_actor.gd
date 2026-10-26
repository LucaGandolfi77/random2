extends RefCounted
class_name BattleActor

var id: StringName = &""
var display_name: String = ""
var side: int = BattleTypes.Side.PLAYER
var tone: int = BattleTypes.Tone.BELL
var max_hp: int = 1
var hp: int = 1
var max_resolve: int = 3
var resolve: int = 3
var attack: int = 10
var defense: int = 10
var speed: int = 10
var is_boss: bool = false
var guarding: bool = false
var echo_available: bool = true
var statuses: Dictionary = {}
var actions: Array[BattleAction] = []
var intent_action: StringName = &""
var intent_target: StringName = &""

func _init(
	p_id: StringName = &"",
	p_name: String = "",
	p_side: int = BattleTypes.Side.PLAYER,
	p_tone: int = BattleTypes.Tone.BELL,
	p_max_hp: int = 1,
	p_attack: int = 10,
	p_defense: int = 10,
	p_speed: int = 10
) -> void:
	id = p_id
	display_name = p_name
	side = p_side
	tone = p_tone
	max_hp = p_max_hp
	hp = p_max_hp
	attack = p_attack
	defense = p_defense
	speed = p_speed
	max_resolve = 3
	resolve = max_resolve

func is_alive() -> bool:
	return hp > 0

func hp_ratio() -> float:
	if max_hp <= 0:
		return 0.0
	return clampf(float(hp) / float(max_hp), 0.0, 1.0)

func has_status(status_id: StringName) -> bool:
	return statuses.has(status_id)

func add_status(status_id: StringName, turns: int) -> void:
	if status_id == &"" or turns <= 0:
		return
	statuses[status_id] = maxi(int(statuses.get(status_id, 0)), turns)

func clear_status(status_id: StringName) -> void:
	statuses.erase(status_id)

func status_text() -> String:
	if statuses.is_empty():
		return ""
	var parts: Array[String] = []
	for key in statuses.keys():
		parts.append("%s(%d)" % [String(key).capitalize(), int(statuses[key])])
	return ", ".join(parts)

func take_damage(amount: int) -> int:
	var applied := mini(maxi(amount, 0), hp)
	hp -= applied
	return applied

func heal(amount: int) -> int:
	var applied := mini(maxi(amount, 0), max_hp - hp)
	hp += applied
	return applied

func to_summary() -> Dictionary:
	return {
		"id": String(id),
		"name": display_name,
		"side": side,
		"tone": tone,
		"hp": hp,
		"max_hp": max_hp,
		"resolve": resolve,
		"max_resolve": max_resolve,
		"guarding": guarding,
		"statuses": statuses.duplicate(),
	}
