extends RefCounted
class_name BattleAction

var id: StringName = &""
var display_name: String = ""
var description: String = ""
var tone: int = BattleTypes.Tone.BELL
var power: int = 0
var heal: int = 0
var cost: int = 0
var target_rule: int = BattleTypes.TargetRule.SINGLE_ENEMY
var status_id: StringName = &""
var status_duration: int = 0
var echoable: bool = true

func _init(
	p_id: StringName = &"",
	p_name: String = "",
	p_tone: int = BattleTypes.Tone.BELL,
	p_power: int = 0,
	p_cost: int = 0,
	p_target_rule: int = BattleTypes.TargetRule.SINGLE_ENEMY,
	p_heal: int = 0,
	p_status_id: StringName = &"",
	p_status_duration: int = 0,
	p_echoable: bool = true,
	p_description: String = ""
) -> void:
	id = p_id
	display_name = p_name
	tone = p_tone
	power = p_power
	cost = p_cost
	target_rule = p_target_rule
	heal = p_heal
	status_id = p_status_id
	status_duration = p_status_duration
	echoable = p_echoable
	description = p_description

func to_record(actor_id: StringName, targets: Array[StringName], turn: int) -> ActionRecord:
	var record := ActionRecord.new()
	record.actor_id = actor_id
	record.action_id = id
	record.display_name = display_name
	record.tone = tone
	record.base_power = power
	record.base_heal = heal
	record.target_ids = targets.duplicate()
	record.turn = turn
	record.echoable = echoable
	record.status_id = status_id
	record.status_duration = status_duration
	record.target_rule = target_rule
	return record

func label() -> String:
	var bits: Array[String] = [display_name]
	bits.append(BattleTypes.tone_name(tone))
	if power > 0:
		bits.append("%d pwr" % power)
	if heal > 0:
		bits.append("%d heal" % heal)
	if cost > 0:
		bits.append("%d res" % cost)
	return " · ".join(bits)
