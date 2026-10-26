extends SceneTree

func _initialize() -> void:
	var texture: Texture2D = load("res://icon.svg")
	if texture == null:
		printerr("Could not load icon")
		quit(1)
		return
	var base := texture.get_image()
	base.resize(192, 192, Image.INTERPOLATE_LANCZOS)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://content/icons"))
	var error := base.save_png("res://content/icons/icon_192.png")
	if error == OK:
		print("Wrote content/icons/icon_192.png")
	else:
		printerr("Failed to write icon: ", error)
	quit(0 if error == OK else 1)
