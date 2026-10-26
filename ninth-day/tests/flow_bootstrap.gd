extends Node

## Bootstrap for the end-to-end flow test. The harness is attached to /root
## so it survives the scene changes it drives.

func _ready() -> void:
	var harness: Node = load("res://tests/flow_test.gd").new()
	harness.name = "FlowHarness"
	get_tree().root.add_child.call_deferred(harness)
