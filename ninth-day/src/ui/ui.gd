extends RefCounted
class_name Ui

static func label(text: String, size: int, color: Color = Palette.PAPER, wrap: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	return l

static func heading(text: String) -> Label:
	return label(text, 24, Palette.BRASS)

static func overline(text: String) -> Label:
	return label(text, 11, Palette.BRASS)

static func body(text: String) -> Label:
	return label(text, 15, Palette.PAPER, true)

static func button(text: String, height: int = 52, accent: Color = Palette.BRASS) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(0, height)
	b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	b.add_theme_font_size_override("font_size", 15)
	b.add_theme_color_override("font_color", Palette.PAPER)
	b.add_theme_color_override("font_hover_color", accent)
	b.add_theme_color_override("font_pressed_color", accent)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Palette.PANEL
	normal.border_color = Palette.LINE
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(4)
	normal.content_margin_left = 14
	normal.content_margin_right = 14
	normal.content_margin_top = 10
	normal.content_margin_bottom = 10
	var hover := normal.duplicate() as StyleBoxFlat
	hover.bg_color = Palette.BG_RAISED
	hover.border_color = accent
	var pressed := normal.duplicate() as StyleBoxFlat
	pressed.bg_color = Palette.BG
	pressed.border_color = accent
	b.add_theme_stylebox_override("normal", normal)
	b.add_theme_stylebox_override("hover", hover)
	b.add_theme_stylebox_override("pressed", pressed)
	b.add_theme_stylebox_override("disabled", normal)
	b.add_theme_color_override("font_disabled_color", Palette.MUTED)
	return b

static func card_button(text: String, height: int = 84) -> Button:
	var b := button(text, height)
	b.add_theme_font_size_override("font_size", 14)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	return b

static func panel_style(bg: Color = Palette.PANEL, border: Color = Palette.LINE) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(1)
	style.set_corner_radius_all(5)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style

static func rule(color: Color = Palette.LINE) -> HSeparator:
	var s := HSeparator.new()
	s.add_theme_constant_override("separation", 10)
	var style := StyleBoxLine.new()
	style.color = color
	style.thickness = 1
	s.add_theme_stylebox_override("separator", style)
	return s

static func add_backdrop(root: Control, tint: Color = Palette.BRASS) -> void:
	var bg := ColorRect.new()
	bg.color = Palette.BG
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(bg)

	var glow := ColorRect.new()
	glow.color = Color(tint.r, tint.g, tint.b, 0.05)
	glow.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE)
	glow.offset_bottom = 360
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(glow)

	var left := ColorRect.new()
	left.color = Color(Palette.BRASS_DARK.r, Palette.BRASS_DARK.g, Palette.BRASS_DARK.b, 0.35)
	left.set_anchors_and_offsets_preset(Control.PRESET_LEFT_WIDE)
	left.offset_left = 12
	left.offset_right = 13
	left.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(left)

	var right := ColorRect.new()
	right.color = left.color
	right.set_anchors_and_offsets_preset(Control.PRESET_RIGHT_WIDE)
	right.offset_left = -13
	right.offset_right = -12
	right.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(right)

static func apply_safe_area(
	margin: MarginContainer,
	base_left: int = 30,
	base_right: int = 30,
	base_top: int = 24,
	base_bottom: int = 20
) -> void:
	var left := base_left
	var right := base_right
	var top := base_top
	var bottom := base_bottom
	if OS.has_feature("mobile"):
		var window_size := DisplayServer.window_get_size()
		var safe := DisplayServer.get_display_safe_area()
		if window_size.x > 0 and window_size.y > 0 and safe.size.x > 0 and safe.size.y > 0:
			var viewport_size := margin.get_viewport_rect().size
			var sx := viewport_size.x / float(window_size.x)
			var sy := viewport_size.y / float(window_size.y)
			left = maxi(base_left, int(ceil(safe.position.x * sx)) + 8)
			top = maxi(base_top, int(ceil(safe.position.y * sy)) + 8)
			right = maxi(base_right, int(ceil((window_size.x - safe.end.x) * sx)) + 8)
			bottom = maxi(base_bottom, int(ceil((window_size.y - safe.end.y) * sy)) + 8)
	margin.add_theme_constant_override("margin_left", left)
	margin.add_theme_constant_override("margin_right", right)
	margin.add_theme_constant_override("margin_top", top)
	margin.add_theme_constant_override("margin_bottom", bottom)

static func screen_margin(root: Control, top: int = 24, bottom: int = 20) -> MarginContainer:
	var margin := MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.add_child(margin)
	apply_safe_area(margin, 30, 30, top, bottom)
	return margin
