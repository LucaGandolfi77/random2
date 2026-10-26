extends RefCounted
class_name BattleTypes

enum Side {
	PLAYER,
	ENEMY,
}

enum Tone {
	BELL,
	EMBER,
	HUSH,
}

enum TargetRule {
	SINGLE_ENEMY,
	ALL_ENEMIES,
	SINGLE_ALLY,
	ALL_ALLIES,
	SELF,
}

static func tone_name(tone: int) -> String:
	match tone:
		Tone.BELL:
			return "Bell"
		Tone.EMBER:
			return "Ember"
		Tone.HUSH:
			return "Hush"
		_:
			return "Unknown"

static func side_name(side: int) -> String:
	match side:
		Side.PLAYER:
			return "Party"
		Side.ENEMY:
			return "Enemy"
		_:
			return "Unknown"

static func counter_tone(tone: int) -> int:
	# Bell breaks Hush, Hush smothers Ember, Ember cracks Bell.
	match tone:
		Tone.BELL:
			return Tone.HUSH
		Tone.HUSH:
			return Tone.EMBER
		Tone.EMBER:
			return Tone.BELL
		_:
			return tone

static func tone_bonus_bp(attacker_tone: int, defender_tone: int) -> int:
	if counter_tone(attacker_tone) == defender_tone:
		return 125
	return 100

static func tone_matches(attacker_tone: int, defender_tone: int) -> bool:
	return attacker_tone == defender_tone
