extends RefCounted
class_name ActionRecord

var actor_id: StringName = &""
var action_id: StringName = &""
var display_name: String = ""
var tone: int = BattleTypes.Tone.BELL
var base_power: int = 0
var base_heal: int = 0
var target_ids: Array[StringName] = []
var turn: int = 0
var echoable: bool = true
var status_id: StringName = &""
var status_duration: int = 0
var target_rule: int = BattleTypes.TargetRule.SINGLE_ENEMY
var locked: bool = false

func can_replay() -> bool:
	return echoable and not locked

func label() -> String:
	var suffix := ""
	if locked:
		suffix = " [stolen]"
	elif not echoable:
		suffix = " [unechoable]"
	return "%s (%s)%s" % [display_name, BattleTypes.tone_name(tone), suffix]

func to_dict() -> Dictionary:
	return {
		"actor_id": String(actor_id),
		"action_id": String(action_id),
		"display_name": display_name,
		"tone": tone,
		"base_power": base_power,
		"base_heal": base_heal,
		"target_ids": target_ids.map(func(v): return String(v)),
		"turn": turn,
		"echoable": echoable,
		"status_id": String(status_id),
		"status_duration": status_duration,
		"target_rule": target_rule,
		"locked": locked,
	}
