extends RefCounted
class_name BattleStore

## Persists one in-progress battle. The store is deliberately small:
## the simulation owns serialization, this owns the file.

const DEFAULT_PATH := "user://ninth_day_battle.json"

static func save(sim: BattleSim, path: String = DEFAULT_PATH) -> Error:
	if sim == null:
		return ERR_INVALID_PARAMETER
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return FileAccess.get_open_error()
	file.store_string(JSON.stringify(sim.to_save()))
	file.close()
	return OK

static func load_into(sim: BattleSim, path: String = DEFAULT_PATH) -> bool:
	if sim == null or not FileAccess.file_exists(path):
		return false
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return false
	var text := file.get_as_text()
	file.close()
	var data = JSON.parse_string(text)
	if not data is Dictionary:
		return false
	return sim.load_save(data)

static func has_save(path: String = DEFAULT_PATH) -> bool:
	return FileAccess.file_exists(path)

static func delete(path: String = DEFAULT_PATH) -> void:
	if not FileAccess.file_exists(path):
		return
	var dir := DirAccess.open(path.get_base_dir())
	if dir != null:
		dir.remove(path.get_file())
