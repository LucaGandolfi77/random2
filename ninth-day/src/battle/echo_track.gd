extends RefCounted
class_name EchoTrack

var capacity: int = 3
var records: Array[ActionRecord] = []

func set_capacity(value: int) -> void:
	capacity = maxi(1, value)
	_trim()

func push(record: ActionRecord) -> void:
	records.append(record)
	_trim()

func replace(index: int, record: ActionRecord) -> bool:
	if index < 0 or index >= records.size():
		return false
	records[index] = record
	return true

func get_record(index: int) -> ActionRecord:
	if index < 0 or index >= records.size():
		return null
	return records[index]

func size() -> int:
	return records.size()

func clear() -> void:
	records.clear()

func first_replayable_index() -> int:
	for i in records.size():
		if records[i].can_replay():
			return i
	return -1

func _trim() -> void:
	while records.size() > capacity:
		records.pop_front()

func to_array() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	for record in records:
		out.append(record.to_dict())
	return out
