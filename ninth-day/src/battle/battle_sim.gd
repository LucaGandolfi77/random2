extends RefCounted
class_name BattleSim

## Deterministic, node-free battle simulation for the Ninth Day greybox.
## The view reads state and calls commands; all outcomes are decided here.

var seed_value: int = 424242
var rng: RandomNumberGenerator
var encounter_id: StringName = &"full"
var party: Array[BattleActor] = []
var enemies: Array[BattleActor] = []
var player_order: Array[BattleActor] = []
var enemy_order: Array[BattleActor] = []
var echo_track: EchoTrack
var player_echo_available: bool = true
var enemy_echo_available: bool = true
var resonance: int = 0
var chord_ready: bool = false
var round_number: int = 1
var phase: String = "player"
var player_index: int = 0
var enemy_index: int = 0
var boss_stole_track: bool = false
var log_lines: Array[String] = []

func start(p_seed: int = 424242, p_encounter: StringName = &"full") -> void:
	seed_value = p_seed
	encounter_id = p_encounter
	rng = RandomNumberGenerator.new()
	rng.seed = p_seed
	party = _build_party()
	enemies = _build_enemies(p_encounter)
	player_order = _sorted_by_speed(party)
	enemy_order = _sorted_by_speed(enemies)
	echo_track = EchoTrack.new()
	echo_track.set_capacity(4 if _has_living_member(&"iven") else 3)
	player_echo_available = true
	enemy_echo_available = true
	resonance = 0
	chord_ready = false
	round_number = 1
	phase = "player"
	player_index = 0
	enemy_index = 0
	boss_stole_track = false
	log_lines.clear()
	_log(_encounter_intro())
	_skip_dead_players()
	_log("Round 1 — party turn.")
	_prepare_enemy_intents()

func apply_modifiers(mods: Dictionary) -> void:
	if mods.is_empty():
		return
	for actor in party:
		var max_hp_gain := int(mods.get("max_hp", 0))
		if max_hp_gain != 0:
			actor.max_hp = maxi(1, actor.max_hp + max_hp_gain)
			actor.hp = clampi(actor.hp + maxi(0, max_hp_gain), 0, actor.max_hp)
		var attack_gain := int(mods.get("attack", 0))
		actor.attack = maxi(1, actor.attack + attack_gain)
		var defense_gain := int(mods.get("defense", 0))
		actor.defense = maxi(1, actor.defense + defense_gain)
		var speed_gain := int(mods.get("speed", 0))
		actor.speed = maxi(1, actor.speed + speed_gain)
		var resolve_gain := int(mods.get("max_resolve", 0))
		if resolve_gain != 0:
			actor.max_resolve = maxi(1, actor.max_resolve + resolve_gain)
			actor.resolve = clampi(actor.resolve + maxi(0, resolve_gain), 0, actor.max_resolve)

func current_actor() -> BattleActor:
	if phase == "player" and player_index >= 0 and player_index < player_order.size():
		return player_order[player_index]
	if phase == "enemy" and enemy_index >= 0 and enemy_index < enemy_order.size():
		return enemy_order[enemy_index]
	return null

func is_player_turn() -> bool:
	return phase == "player" and current_actor() != null

func is_enemy_turn() -> bool:
	return phase == "enemy" and current_actor() != null

func is_finished() -> bool:
	return phase == "victory" or phase == "defeat"

func living_party() -> Array[BattleActor]:
	return _living(party)

func living_enemies() -> Array[BattleActor]:
	return _living(enemies)

func player_actions() -> Array[BattleAction]:
	var actor := current_actor()
	if actor == null or actor.side != BattleTypes.Side.PLAYER:
		return []
	return actor.actions

func use_action(action_id: StringName, target_id: StringName = &"") -> Array[String]:
	if not is_player_turn():
		return ["It is not the party's turn."]
	var actor := current_actor()
	var action := _find_action(actor, action_id)
	if action == null:
		return ["Unknown action: %s" % String(action_id)]
	if actor.resolve < action.cost:
		return ["%s needs %d Resolve." % [actor.display_name, action.cost]]
	var target := _resolve_target(actor, action.target_rule, target_id)
	if target == null and action.target_rule == BattleTypes.TargetRule.SINGLE_ENEMY:
		return ["No living target."]
	var events := _resolve_action(actor, action, target, false)
	_advance_player()
	return events

func use_guard() -> Array[String]:
	if not is_player_turn():
		return ["It is not the party's turn."]
	var actor := current_actor()
	actor.guarding = true
	actor.resolve = mini(actor.max_resolve, actor.resolve + 1)
	var events: Array[String] = []
	_event(events, "%s guards and recovers 1 Resolve." % actor.display_name)
	var record := ActionRecord.new()
	record.actor_id = actor.id
	record.action_id = &"guard"
	record.display_name = "Guard"
	record.tone = actor.tone
	record.base_power = 0
	var guard_targets: Array[StringName] = []
	guard_targets.append(actor.id)
	record.target_ids = guard_targets
	record.turn = round_number
	record.target_rule = BattleTypes.TargetRule.SELF
	echo_track.push(record)
	_advance_player()
	return events

func use_chord() -> Array[String]:
	if not is_player_turn():
		return ["It is not the party's turn."]
	if resonance < 3:
		return ["The Chord needs 3 Resonance."]
	var actor := current_actor()
	var events: Array[String] = []
	_event(events, "Chord: The Ninth Toll. %s rings the cracked bell." % actor.display_name)
	for enemy in living_enemies():
		var tone_bp := BattleTypes.tone_bonus_bp(BattleTypes.Tone.BELL, enemy.tone)
		var variance := rng.randi_range(90, 110)
		var damage := _calculate_damage(32, actor.attack, enemy.defense, tone_bp, 100, variance)
		var applied := enemy.take_damage(damage)
		_event(events, "The Ninth Toll hits %s for %d." % [enemy.display_name, applied])
	resonance = 0
	chord_ready = false
	_event(events, "Resonance spent. The bell is silent.")
	_check_end()
	if not is_finished():
		_advance_player()
	return events

func replay(index: int, target_id: StringName = &"") -> Array[String]:
	if not is_player_turn():
		return ["It is not the party's turn."]
	if not player_echo_available:
		return ["The party has already used its Echo this battle."]
	var record := echo_track.get_record(index)
	if record == null:
		return ["That Echo slot is empty."]
	if not record.can_replay():
		return ["That action cannot be echoed."]
	var actor := current_actor()
	player_echo_available = false
	var target := _resolve_target(actor, record.target_rule, target_id)
	var events := _resolve_record(actor, record, target)
	_advance_player()
	return events

func enemy_act() -> Array[String]:
	if not is_enemy_turn():
		return ["It is not the enemy's turn."]
	var actor := current_actor()
	var events: Array[String] = []
	if actor == null or not actor.is_alive():
		_advance_enemy()
		return events

	# Boss phase: steal a player's Echo card once, at half HP.
	if actor.is_boss and not boss_stole_track and actor.hp <= actor.max_hp / 2:
		var stolen := _steal_player_record()
		if stolen != null:
			boss_stole_track = true
			_event(events, "%s steals the Echo of %s. That card is locked." % [actor.display_name, stolen.display_name])

	# Capture a player record before the enemy action pushes a new one.
	var echo_record: ActionRecord = null
	var echo_chance := 1.0 if actor.id == &"hollow_bellkeeper" else 0.35
	if enemy_echo_available and rng.randf() < echo_chance:
		echo_record = _first_replayable_player_record()

	var action: BattleAction = null
	if actor.intent_action != &"":
		action = _find_action(actor, actor.intent_action)
	if action == null:
		action = _choose_enemy_action(actor)
	var target := _resolve_target(actor, action.target_rule, actor.intent_target)
	actor.intent_action = &""
	actor.intent_target = &""
	events.append_array(_resolve_action(actor, action, target, false))

	if echo_record != null and echo_record.can_replay():
		var echo_target := _resolve_target(actor, echo_record.target_rule, &"")
		_event(events, "%s echoes your %s." % [actor.display_name, echo_record.display_name])
		events.append_array(_resolve_record(actor, echo_record, echo_target, true))
		enemy_echo_available = false

	if not is_finished():
		_advance_enemy()
	return events

func to_save() -> Dictionary:
	return {
		"version": 1,
		"seed": seed_value,
		"encounter": String(encounter_id),
		"rng_state": str(rng.state),
		"round": round_number,
		"phase": phase,
		"player_index": player_index,
		"enemy_index": enemy_index,
		"player_echo_available": player_echo_available,
		"enemy_echo_available": enemy_echo_available,
		"resonance": resonance,
		"chord_ready": chord_ready,
		"boss_stole_track": boss_stole_track,
		"party": party.map(func(a: BattleActor) -> Dictionary: return _actor_save(a)),
		"enemies": enemies.map(func(a: BattleActor) -> Dictionary: return _actor_save(a)),
		"echo_track": echo_track.to_array() if echo_track != null else [],
		"echo_capacity": echo_track.capacity if echo_track != null else 3,
		"log_lines": log_lines.duplicate(),
	}

func load_save(data: Dictionary) -> bool:
	if data.is_empty():
		return false
	var saved_seed := int(data.get("seed", 424242))
	start(saved_seed, StringName(String(data.get("encounter", "full"))))
	var saved_state := String(data.get("rng_state", ""))
	if saved_state != "":
		rng.state = int(saved_state)
	player_order = _sorted_by_speed(party)
	enemy_order = _sorted_by_speed(enemies)
	_apply_actor_states(party, data.get("party", []))
	_apply_actor_states(enemies, data.get("enemies", []))
	echo_track = EchoTrack.new()
	echo_track.set_capacity(int(data.get("echo_capacity", 4)))
	for record_data in data.get("echo_track", []):
		if record_data is Dictionary:
			echo_track.push(_record_from_dict(record_data))
	round_number = int(data.get("round", 1))
	phase = String(data.get("phase", "player"))
	player_index = int(data.get("player_index", 0))
	enemy_index = int(data.get("enemy_index", 0))
	player_echo_available = bool(data.get("player_echo_available", true))
	enemy_echo_available = bool(data.get("enemy_echo_available", true))
	resonance = clampi(int(data.get("resonance", 0)), 0, 3)
	chord_ready = bool(data.get("chord_ready", resonance >= 3))
	boss_stole_track = bool(data.get("boss_stole_track", false))
	log_lines.clear()
	for line in data.get("log_lines", []):
		log_lines.append(String(line))
	while log_lines.size() > 80:
		log_lines.pop_front()
	return true

func _actor_save(actor: BattleActor) -> Dictionary:
	return {
		"id": String(actor.id),
		"hp": actor.hp,
		"max_hp": actor.max_hp,
		"resolve": actor.resolve,
		"max_resolve": actor.max_resolve,
		"guarding": actor.guarding,
		"echo_available": actor.echo_available,
		"statuses": actor.statuses.duplicate(),
		"intent_action": String(actor.intent_action),
		"intent_target": String(actor.intent_target),
	}

func _apply_actor_states(actors: Array[BattleActor], states: Array) -> void:
	for state in states:
		if not state is Dictionary:
			continue
		var actor := _actor_by_id(StringName(String(state.get("id", ""))))
		if actor == null:
			continue
		actor.hp = clampi(int(state.get("hp", actor.hp)), 0, actor.max_hp)
		actor.resolve = clampi(int(state.get("resolve", actor.resolve)), 0, actor.max_resolve)
		actor.guarding = bool(state.get("guarding", false))
		actor.echo_available = bool(state.get("echo_available", true))
		actor.statuses.clear()
		var statuses: Dictionary = state.get("statuses", {})
		for key in statuses.keys():
			actor.statuses[StringName(String(key))] = int(statuses[key])
		actor.intent_action = StringName(String(state.get("intent_action", "")))
		actor.intent_target = StringName(String(state.get("intent_target", "")))

func _record_from_dict(data: Dictionary) -> ActionRecord:
	var record := ActionRecord.new()
	record.actor_id = StringName(String(data.get("actor_id", "")))
	record.action_id = StringName(String(data.get("action_id", "")))
	record.display_name = String(data.get("display_name", ""))
	record.tone = int(data.get("tone", BattleTypes.Tone.BELL))
	record.base_power = int(data.get("base_power", 0))
	record.base_heal = int(data.get("base_heal", 0))
	var target_ids: Array[StringName] = []
	for target_id in data.get("target_ids", []):
		target_ids.append(StringName(String(target_id)))
	record.target_ids = target_ids
	record.turn = int(data.get("turn", 0))
	record.echoable = bool(data.get("echoable", true))
	record.status_id = StringName(String(data.get("status_id", "")))
	record.status_duration = int(data.get("status_duration", 0))
	record.target_rule = int(data.get("target_rule", BattleTypes.TargetRule.SINGLE_ENEMY))
	record.locked = bool(data.get("locked", false))
	return record

func preview_action(action_id: StringName, target_id: StringName = &"") -> Dictionary:
	if not is_player_turn():
		return {"allowed": false, "reason": "It is not the party's turn.", "targets": []}
	var actor := current_actor()
	var action := _find_action(actor, action_id)
	if action == null:
		return {"allowed": false, "reason": "Unknown action.", "targets": []}
	return _preview_effect(
		actor,
		action.tone,
		action.power,
		action.heal,
		action.target_rule,
		action.cost,
		action.status_id,
		action.status_duration,
		target_id,
		action.label()
	)

func preview_replay(index: int, target_id: StringName = &"") -> Dictionary:
	if not is_player_turn():
		return {"allowed": false, "reason": "It is not the party's turn.", "targets": []}
	if not player_echo_available:
		return {"allowed": false, "reason": "The Echo has already been spent this battle.", "targets": []}
	var record := echo_track.get_record(index)
	if record == null:
		return {"allowed": false, "reason": "That Echo slot is empty.", "targets": []}
	if not record.can_replay():
		return {"allowed": false, "reason": "That action cannot be echoed.", "targets": []}
	var actor := current_actor()
	return _preview_effect(
		actor,
		record.tone,
		record.base_power,
		record.base_heal,
		record.target_rule,
		0,
		record.status_id,
		record.status_duration,
		target_id,
		"Echo: " + record.display_name,
		true
	)

func _preview_effect(
	actor: BattleActor,
	tone: int,
	power: int,
	heal: int,
	target_rule: int,
	cost: int,
	status_id: StringName,
	status_duration: int,
	target_id: StringName,
	label_text: String,
	is_echo: bool = false
) -> Dictionary:
	var allowed := true
	var reason := ""
	if actor.resolve < cost:
		allowed = false
		reason = "Needs %d Resolve." % cost
	if is_echo and not player_echo_available:
		allowed = false
		reason = "The Echo has already been spent this battle."
	var target := _resolve_target(actor, target_rule, target_id)
	var targets := _targets_for(actor, target_rule, target)
	if targets.is_empty() and target_rule != BattleTypes.TargetRule.SELF:
		allowed = false
		reason = "No living target."

	var rows: Array[Dictionary] = []
	for t in targets:
		var row := {
			"id": String(t.id),
			"name": t.display_name,
			"tone": t.tone,
			"damage": 0,
			"heal": 0,
			"counter": false,
			"marked": false,
			"lethal": false,
			"hp": t.hp,
			"hp_after": t.hp,
		}
		if heal > 0:
			row["heal"] = mini(heal, t.max_hp - t.hp)
		if power > 0:
			var tone_bp := BattleTypes.tone_bonus_bp(tone, t.tone)
			var is_counter := BattleTypes.counter_tone(tone) == t.tone
			var marked := t.has_status(&"marked")
			if marked:
				tone_bp = tone_bp * 120 / 100
			var guard_bp := 50 if t.guarding else 100
			var damage := _calculate_damage(power, actor.attack, t.defense, tone_bp, guard_bp, 100)
			row["damage"] = damage
			row["counter"] = is_counter
			row["marked"] = marked
			row["lethal"] = damage >= t.hp
			row["hp_after"] = maxi(0, t.hp - damage)
		rows.append(row)

	var resonance_gain := 0
	var resonance_note := ""
	if is_echo:
		resonance_gain = 1
		resonance_note = "Echo builds 1 Resonance"
	elif power > 0 and not rows.is_empty() and BattleTypes.tone_matches(tone, int(rows[0]["tone"])):
		resonance_gain = 1
		resonance_note = "Tone match builds 1 Resonance"

	return {
		"allowed": allowed,
		"reason": reason,
		"label": label_text,
		"tone": tone,
		"cost": cost,
		"status_id": String(status_id),
		"status_duration": status_duration,
		"resonance_gain": resonance_gain,
		"resonance_note": resonance_note,
		"is_echo": is_echo,
		"targets": rows,
	}

func snapshot() -> Dictionary:
	return {
		"seed": seed_value,
		"round": round_number,
		"phase": phase,
		"player_index": player_index,
		"enemy_index": enemy_index,
		"player_echo_available": player_echo_available,
		"enemy_echo_available": enemy_echo_available,
		"resonance": resonance,
		"chord_ready": chord_ready,
		"boss_stole_track": boss_stole_track,
		"party": party.map(func(a: BattleActor) -> Dictionary: return a.to_summary()),
		"enemies": enemies.map(func(a: BattleActor) -> Dictionary: return a.to_summary()),
		"echo_track": echo_track.to_array() if echo_track != null else [],
	}

# --- Resolution ---------------------------------------------------------

func _resolve_action(
	actor: BattleActor,
	action: BattleAction,
	target: BattleActor,
	is_replay: bool,
	verb: String = "uses"
) -> Array[String]:
	var events: Array[String] = []
	if not is_replay:
		actor.resolve = maxi(0, actor.resolve - action.cost)

	var targets := _targets_for(actor, action.target_rule, target)
	if targets.is_empty() and action.target_rule == BattleTypes.TargetRule.SINGLE_ENEMY:
		_event(events, "No living target.")
		return events

	var target_ids: Array[StringName] = []
	for t in targets:
		target_ids.append(t.id)
		if action.heal > 0:
			var healed := t.heal(action.heal)
			_event(events, "%s restores %d HP to %s." % [actor.display_name, healed, t.display_name])
		if action.power > 0:
			var tone_bp := BattleTypes.tone_bonus_bp(action.tone, t.tone)
			if t.has_status(&"marked"):
				tone_bp = tone_bp * 120 / 100
				t.clear_status(&"marked")
			var guard_bp := 50 if t.guarding else 100
			var variance := rng.randi_range(90, 110)
			var damage := _calculate_damage(action.power, actor.attack, t.defense, tone_bp, guard_bp, variance)
			var applied := t.take_damage(damage)
			_event(events, "%s %s %s on %s for %d." % [actor.display_name, verb, action.display_name, t.display_name, applied])
			if not t.is_alive():
				_event(events, "%s falls." % t.display_name)
		if action.status_id != &"" and t.is_alive():
			t.add_status(action.status_id, action.status_duration)
			_event(events, "%s gains %s." % [t.display_name, String(action.status_id).capitalize()])

	if is_replay:
		_add_resonance(1, "echo", events)
	elif targets.size() > 0 and action.power > 0:
		if BattleTypes.tone_matches(action.tone, targets[0].tone):
			_add_resonance(1, "tone match", events)

	if not is_replay:
		var record := action.to_record(actor.id, target_ids, round_number)
		echo_track.push(record)
		echo_track.set_capacity(4 if _has_living_member(&"iven") else 3)

	_check_end()
	return events

func _resolve_record(actor: BattleActor, record: ActionRecord, target: BattleActor, from_enemy: bool = false) -> Array[String]:
	if record.action_id == &"guard":
		actor.guarding = true
		actor.resolve = mini(actor.max_resolve, actor.resolve + 1)
		var guard_events: Array[String] = []
		_event(guard_events, "%s echoes Guard and recovers 1 Resolve." % actor.display_name)
		_add_resonance(1, "echo", guard_events)
		return guard_events

	var action := BattleAction.new(
		record.action_id,
		record.display_name,
		record.tone,
		record.base_power,
		0,
		record.target_rule,
		record.base_heal,
		record.status_id,
		record.status_duration,
		false,
		"An echoed action."
	)
	var events := _resolve_action(actor, action, target, true, "echoes")
	if from_enemy:
		for i in events.size():
			events[i] = "[Enemy Echo] " + events[i]
	return events

func _calculate_damage(power: int, atk: int, defense: int, tone_bp: int, guard_bp: int, variance_bp: int) -> int:
	var base := power * (atk + 10) / maxi(1, defense + 10)
	var dmg := base * tone_bp / 100 * guard_bp / 100 * variance_bp / 100
	return maxi(1, dmg)

func _add_resonance(amount: int, reason: String, events: Array[String]) -> void:
	var before := resonance
	resonance = mini(3, resonance + amount)
	chord_ready = resonance >= 3
	if resonance != before:
		_event(events, "Resonance %d/3 (%s)." % [resonance, reason])
	if chord_ready and before < 3:
		_event(events, "CHORD READY — The Ninth Toll.")

func _targets_for(actor: BattleActor, rule: int, target: BattleActor) -> Array[BattleActor]:
	var out: Array[BattleActor] = []
	match rule:
		BattleTypes.TargetRule.SINGLE_ENEMY:
			if target != null and target.is_alive():
				out.append(target)
			else:
				var foes := _opponents_of(actor)
				if not foes.is_empty():
					out.append(foes[0])
		BattleTypes.TargetRule.ALL_ENEMIES:
			out = _opponents_of(actor)
		BattleTypes.TargetRule.SINGLE_ALLY:
			if target != null and target.is_alive():
				out.append(target)
			else:
				out = _lowest_hp_ally(actor)
		BattleTypes.TargetRule.ALL_ALLIES:
			out = _allies_of(actor)
		BattleTypes.TargetRule.SELF:
			out.append(actor)
	return out

func _resolve_target(actor: BattleActor, rule: int, target_id: StringName) -> BattleActor:
	if target_id != &"":
		var explicit := _actor_by_id(target_id)
		if explicit != null and explicit.is_alive():
			return explicit
	match rule:
		BattleTypes.TargetRule.SINGLE_ENEMY:
			var foes := _opponents_of(actor)
			return foes[0] if not foes.is_empty() else null
		BattleTypes.TargetRule.SINGLE_ALLY:
			var allies := _lowest_hp_ally(actor)
			return allies[0] if not allies.is_empty() else null
		BattleTypes.TargetRule.SELF:
			return actor
		_:
			return null

func _opponents_of(actor: BattleActor) -> Array[BattleActor]:
	return _living(enemies) if actor.side == BattleTypes.Side.PLAYER else _living(party)

func _allies_of(actor: BattleActor) -> Array[BattleActor]:
	return _living(party) if actor.side == BattleTypes.Side.PLAYER else _living(enemies)

func _lowest_hp_ally(actor: BattleActor) -> Array[BattleActor]:
	var allies := _allies_of(actor)
	if allies.is_empty():
		return []
	allies.sort_custom(func(a: BattleActor, b: BattleActor) -> bool:
		return a.hp < b.hp
	)
	var out: Array[BattleActor] = []
	out.append(allies[0])
	return out

func _actor_by_id(actor_id: StringName) -> BattleActor:
	for actor in party:
		if actor.id == actor_id:
			return actor
	for actor in enemies:
		if actor.id == actor_id:
			return actor
	return null

func _find_action(actor: BattleActor, action_id: StringName) -> BattleAction:
	for action in actor.actions:
		if action.id == action_id:
			return action
	return null

func _has_living_member(member_id: StringName) -> bool:
	for actor in party:
		if actor.id == member_id and actor.is_alive():
			return true
	return false

# --- Turn flow ----------------------------------------------------------

func _advance_player() -> void:
	if _check_end():
		return
	player_index += 1
	_skip_dead_players()
	if player_index >= player_order.size():
		phase = "enemy"
		enemy_index = 0
		_skip_dead_enemies()
		if enemy_index >= enemy_order.size():
			_end_round()
		else:
			_log("Enemy turn.")
	else:
		phase = "player"

func _skip_dead_players() -> void:
	while player_index < player_order.size() and not player_order[player_index].is_alive():
		player_index += 1

func _advance_enemy() -> void:
	if _check_end():
		return
	enemy_index += 1
	_skip_dead_enemies()
	if enemy_index >= enemy_order.size():
		_end_round()
	else:
		phase = "enemy"

func _skip_dead_enemies() -> void:
	while enemy_index < enemy_order.size() and not enemy_order[enemy_index].is_alive():
		enemy_index += 1

func _end_round() -> void:
	if _check_end():
		return
	for actor in party + enemies:
		if not actor.is_alive():
			continue
		if actor.has_status(&"burning"):
			var burn := actor.take_damage(6)
			_log("%s burns for %d." % [actor.display_name, burn])
		for status_id in actor.statuses.keys():
			var turns := int(actor.statuses[status_id]) - 1
			if turns <= 0:
				actor.statuses.erase(status_id)
			else:
				actor.statuses[status_id] = turns
		actor.guarding = false
	for enemy in enemies:
		enemy.intent_action = &""
		enemy.intent_target = &""
	if _check_end():
		return
	round_number += 1
	phase = "player"
	player_index = 0
	enemy_index = 0
	_skip_dead_players()
	for actor in living_party():
		actor.resolve = mini(actor.max_resolve, actor.resolve + 1)
	_log("Round %d — party turn." % round_number)
	_prepare_enemy_intents()

func _check_end() -> bool:
	if living_party().is_empty():
		phase = "defeat"
		_log("DEFEAT — the Bell catches you. Rewind and try again.")
		return true
	if living_enemies().is_empty():
		phase = "victory"
		_log("VICTORY — the song breaks. The Bell is quiet.")
		return true
	if encounter_id == &"clockwork_saint":
		for enemy in living_enemies():
			if enemy.id == &"clockwork_saint" and enemy.hp * 10 <= enemy.max_hp * 4:
				phase = "victory"
				_log("THE CLOCKWORK SAINT WITHDRAWS — its bell heart is cracked, not broken.")
				return true
	return false

# --- Enemy AI -----------------------------------------------------------

func _prepare_enemy_intents() -> void:
	for enemy in living_enemies():
		var action := _choose_enemy_action(enemy)
		enemy.intent_action = action.id
		var target := _resolve_target(enemy, action.target_rule, &"")
		enemy.intent_target = target.id if target != null else &""

func _choose_enemy_action(actor: BattleActor) -> BattleAction:
	var usable: Array[BattleAction] = []
	for action in actor.actions:
		if actor.resolve >= action.cost:
			usable.append(action)
	if usable.is_empty():
		return actor.actions[0]
	# Boss prioritizes its unechoable pressure move below half HP.
	if actor.is_boss and actor.hp <= actor.max_hp / 2:
		for action in usable:
			if not action.echoable:
				return action
	return usable[rng.randi_range(0, usable.size() - 1)]

func _first_replayable_player_record() -> ActionRecord:
	for i in echo_track.size():
		var record := echo_track.get_record(i)
		if record == null or not record.can_replay():
			continue
		var actor := _actor_by_id(record.actor_id)
		if actor != null and actor.side == BattleTypes.Side.PLAYER:
			return record
	return null

func _steal_player_record() -> ActionRecord:
	for i in echo_track.size():
		var record := echo_track.get_record(i)
		if record == null or record.locked:
			continue
		var actor := _actor_by_id(record.actor_id)
		if actor != null and actor.side == BattleTypes.Side.PLAYER:
			record.locked = true
			return record
	return null

# --- Construction -------------------------------------------------------

func _actions(items: Array) -> Array[BattleAction]:
	var out: Array[BattleAction] = []
	for item in items:
		if item is BattleAction:
			out.append(item)
	return out

func _build_party() -> Array[BattleActor]:
	var out: Array[BattleActor] = []

	var cael := BattleActor.new(&"cael", "Cael", BattleTypes.Side.PLAYER, BattleTypes.Tone.BELL, 90, 15, 11, 11)
	cael.max_resolve = 4
	cael.resolve = 4
	cael.actions = _actions([
		BattleAction.new(&"strike", "Iron Rod", BattleTypes.Tone.BELL, 12, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A plain strike."),
		BattleAction.new(&"cinder_lance", "Cinder Lance", BattleTypes.Tone.EMBER, 18, 1, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 2, true, "Ember attack. Burns."),
		BattleAction.new(&"hush_step", "Hush Step", BattleTypes.Tone.HUSH, 12, 1, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"slowed", 2, true, "Hush attack. Slows."),
	])
	out.append(cael)

	var iven := BattleActor.new(&"iven", "Iven", BattleTypes.Side.PLAYER, BattleTypes.Tone.BELL, 75, 13, 9, 13)
	iven.max_resolve = 3
	iven.resolve = 3
	iven.actions = _actions([
		BattleAction.new(&"strike", "Arbalest", BattleTypes.Tone.BELL, 10, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A precise shot."),
		BattleAction.new(&"ratchet_shot", "Ratchet Shot", BattleTypes.Tone.BELL, 16, 1, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"marked", 2, true, "Marks the target."),
		BattleAction.new(&"calibrate", "Calibrate", BattleTypes.Tone.BELL, 0, 1, BattleTypes.TargetRule.SELF, 12, &"", 0, true, "Repair a wound."),
	])
	out.append(iven)

	var mara := BattleActor.new(&"mara", "Mara", BattleTypes.Side.PLAYER, BattleTypes.Tone.EMBER, 110, 17, 13, 8)
	mara.max_resolve = 3
	mara.resolve = 3
	mara.actions = _actions([
		BattleAction.new(&"strike", "Iron Peel", BattleTypes.Tone.EMBER, 12, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A heavy swing."),
		BattleAction.new(&"iron_cleave", "Iron Cleave", BattleTypes.Tone.EMBER, 20, 1, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 2, true, "Ember cleave. Burns."),
		BattleAction.new(&"hold_fast", "Hold Fast", BattleTypes.Tone.BELL, 0, 1, BattleTypes.TargetRule.SINGLE_ALLY, 14, &"", 0, true, "A warm meal, remembered."),
	])
	out.append(mara)
	return out

func _encounter_intro() -> String:
	match encounter_id:
		&"tutorial":
			return "The Hollow Choir unfolds from the dark. It has no face, only a note."
		&"ashwright":
			return "The Ashwright waits in the foundry heat, hammer raised."
		&"watch_hound":
			return "The Watch Hound steps out of the ash. It does not growl. It has already decided."
		&"bellows":
			return "The counterweights scream overhead. The Ashwright is waiting at the bottom, and the Choir is singing."
		&"clockwork_saint":
			return "The garden guardian wakes. Brass hands fold. Somewhere inside it, a small bell begins to ring."
		&"hollow_bellkeeper":
			return "The Hollow Bellkeeper wears your face. It rings a bell that is not there."
		_:
			return "The Bell cracks. The Ashwright and the Hollow Choir answer."

func _build_enemies(encounter: StringName = &"full") -> Array[BattleActor]:
	var out: Array[BattleActor] = []

	var ashwright := BattleActor.new(&"ashwright", "The Ashwright", BattleTypes.Side.ENEMY, BattleTypes.Tone.EMBER, 140, 18, 10, 7)
	ashwright.is_boss = true
	ashwright.max_resolve = 99
	ashwright.resolve = 99
	ashwright.actions = _actions([
		BattleAction.new(&"strike", "Forge Hammer", BattleTypes.Tone.EMBER, 12, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A slow, heavy blow."),
		BattleAction.new(&"furnace_breath", "Furnace Breath", BattleTypes.Tone.EMBER, 20, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 2, true, "Breathes open flame."),
		BattleAction.new(&"vent", "Vent", BattleTypes.Tone.EMBER, 10, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 1, true, "Releases scalding steam."),
		BattleAction.new(&"overheat", "Overheat", BattleTypes.Tone.EMBER, 32, 0, BattleTypes.TargetRule.ALL_ENEMIES, 0, &"burning", 1, false, "The furnace opens. Unechoable."),
	])
	out.append(ashwright)

	var choir := BattleActor.new(&"hollow_choir", "Hollow Choir", BattleTypes.Side.ENEMY, BattleTypes.Tone.HUSH, 80, 14, 8, 9)
	choir.max_resolve = 99
	choir.resolve = 99
	choir.actions = _actions([
		BattleAction.new(&"strike", "Hollow Note", BattleTypes.Tone.HUSH, 10, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A note that does not end."),
		BattleAction.new(&"hush", "Hush", BattleTypes.Tone.HUSH, 14, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"slowed", 2, true, "Silence, cold and patient."),
		BattleAction.new(&"lullaby", "Lullaby", BattleTypes.Tone.HUSH, 18, 0, BattleTypes.TargetRule.ALL_ENEMIES, 0, &"slowed", 1, false, "The Choir sings the Bell to sleep."),
	])
	out.append(choir)

	var hound := BattleActor.new(&"watch_hound", "The Watch Hound", BattleTypes.Side.ENEMY, BattleTypes.Tone.HUSH, 105, 17, 10, 14)
	hound.max_resolve = 99
	hound.resolve = 99
	hound.actions = _actions([
		BattleAction.new(&"lockjaw", "Lockjaw", BattleTypes.Tone.HUSH, 16, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"marked", 2, true, "The Hound closes its jaw and does not let go."),
		BattleAction.new(&"rake", "Iron Rake", BattleTypes.Tone.EMBER, 14, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "A hooked paw opens the air."),
		BattleAction.new(&"bay", "Bay", BattleTypes.Tone.HUSH, 10, 0, BattleTypes.TargetRule.ALL_ENEMIES, 0, &"slowed", 1, false, "A sound the whole street remembers."),
	])

	var saint := BattleActor.new(&"clockwork_saint", "The Clockwork Saint", BattleTypes.Side.ENEMY, BattleTypes.Tone.HUSH, 200, 19, 14, 12)
	saint.is_boss = true
	saint.max_resolve = 99
	saint.resolve = 99
	saint.actions = _actions([
		BattleAction.new(&"procession", "Procession", BattleTypes.Tone.HUSH, 16, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"slowed", 2, true, "A measured step that does not stop."),
		BattleAction.new(&"bell_gear", "Bell Gear", BattleTypes.Tone.EMBER, 18, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 2, true, "A gear tooth strikes like a spark."),
		BattleAction.new(&"rewind", "Rewind", BattleTypes.Tone.HUSH, 0, 0, BattleTypes.TargetRule.SELF, 20, &"", 0, true, "The Saint turns its own hour back."),
		BattleAction.new(&"censure", "Censure", BattleTypes.Tone.HUSH, 24, 0, BattleTypes.TargetRule.ALL_ENEMIES, 0, &"slowed", 1, false, "A verdict delivered in brass."),
	])

	var hollow := BattleActor.new(&"hollow_bellkeeper", "The Hollow Bellkeeper", BattleTypes.Side.ENEMY, BattleTypes.Tone.BELL, 220, 21, 13, 15)
	hollow.is_boss = true
	hollow.max_resolve = 99
	hollow.resolve = 99
	hollow.actions = _actions([
		BattleAction.new(&"iron_rod", "Iron Rod", BattleTypes.Tone.BELL, 16, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"", 0, true, "Your own first strike, returned."),
		BattleAction.new(&"cinder_lance", "Cinder Lance", BattleTypes.Tone.EMBER, 20, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"burning", 2, true, "The fire you remember."),
		BattleAction.new(&"hush_step", "Hush Step", BattleTypes.Tone.HUSH, 16, 0, BattleTypes.TargetRule.SINGLE_ENEMY, 0, &"slowed", 2, true, "A step that arrives before you take it."),
		BattleAction.new(&"ninth_toll", "The Ninth Toll", BattleTypes.Tone.BELL, 34, 0, BattleTypes.TargetRule.ALL_ENEMIES, 0, &"slowed", 1, false, "The Chord, without a hand to guide it."),
	])

	match encounter:
		&"tutorial":
			choir.max_hp = 60
			choir.hp = 60
			choir.attack = 12
			return [choir]
		&"ashwright":
			ashwright.max_hp = 120
			ashwright.hp = 120
			return [ashwright]
		&"watch_hound":
			return [hound]
		&"bellows":
			ashwright.max_hp = 170
			ashwright.hp = 170
			ashwright.attack = 20
			ashwright.defense = 12
			choir.max_hp = 95
			choir.hp = 95
			choir.attack = 16
			return [ashwright, choir]
		&"clockwork_saint":
			return [saint]
		&"hollow_bellkeeper":
			return [hollow]
		_:
			return out

func _sorted_by_speed(actors: Array[BattleActor]) -> Array[BattleActor]:
	var copy: Array[BattleActor] = []
	for actor in actors:
		copy.append(actor)
	copy.sort_custom(func(a: BattleActor, b: BattleActor) -> bool:
		if a.speed == b.speed:
			return String(a.id) < String(b.id)
		return a.speed > b.speed
	)
	return copy

func _living(actors: Array[BattleActor]) -> Array[BattleActor]:
	var out: Array[BattleActor] = []
	for actor in actors:
		if actor.is_alive():
			out.append(actor)
	return out

# --- Logging ------------------------------------------------------------

func _log(message: String) -> void:
	log_lines.append(message)
	if log_lines.size() > 80:
		log_lines.pop_front()

func _event(events: Array[String], message: String) -> void:
	events.append(message)
	_log(message)
