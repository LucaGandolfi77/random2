extends Control
class_name StageArt

## Procedural stage illustrations for the vertical slice. These are deliberately
## abstract: ink silhouettes and brass hairlines, not final art.

var mode: String = "spire"
var tint: Color = Palette.BRASS

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	resized.connect(queue_redraw)

func set_mode(bg_id: String) -> void:
	mode = bg_id if bg_id != "" else "spire"
	match mode:
		"ember_row", "foundry":
			tint = Palette.EMBER
		"spire_night":
			tint = Palette.HUSH
		_:
			tint = Palette.BRASS
	queue_redraw()

func _draw() -> void:
	var rect := Rect2(Vector2.ZERO, size)
	draw_rect(rect, Palette.BG_RAISED)
	draw_rect(rect, Color(tint.r, tint.g, tint.b, 0.18), false, 1.0)

	var center := Vector2(size.x * 0.5, size.y * 0.56)
	for i in 4:
		draw_arc(center, 52.0 + i * 26.0, PI * 0.08, PI * 0.92, 48, Color(tint.r, tint.g, tint.b, 0.08), 1.0, true)
	draw_line(Vector2(18, size.y - 18), Vector2(size.x - 18, size.y - 18), Color(tint.r, tint.g, tint.b, 0.12), 1.0)

	match mode:
		"ember_row":
			_draw_rooftops()
		"foundry":
			_draw_foundry()
		"spire_night":
			_draw_night_spire()
		_:
			_draw_spire()

func _draw_spire() -> void:
	var cx := size.x * 0.5
	var top := size.y * 0.33
	var bottom := size.y * 0.76
	var bell := PackedVector2Array([
		Vector2(cx - 62, bottom),
		Vector2(cx - 62, top + 18),
		Vector2(cx - 26, top),
		Vector2(cx + 26, top),
		Vector2(cx + 62, top + 18),
		Vector2(cx + 62, bottom),
	])
	draw_polyline(bell, Color(tint.r, tint.g, tint.b, 0.34), 2.0, true)
	draw_line(Vector2(cx - 78, bottom), Vector2(cx + 78, bottom), Color(tint.r, tint.g, tint.b, 0.34), 2.0, true)
	draw_circle(Vector2(cx, bottom + 16), 7.0, Color(tint.r, tint.g, tint.b, 0.4))
	draw_line(Vector2(cx, size.y * 0.12), Vector2(cx, top), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	for i in 3:
		draw_line(Vector2(20, size.y * 0.2 + i * 14), Vector2(cx - 80 - i * 16, size.y * 0.2 + i * 14), Color(tint.r, tint.g, tint.b, 0.08), 1.0)
		draw_line(Vector2(size.x - 20, size.y * 0.2 + i * 14), Vector2(cx + 80 + i * 16, size.y * 0.2 + i * 14), Color(tint.r, tint.g, tint.b, 0.08), 1.0)

func _draw_rooftops() -> void:
	var base := size.y * 0.82
	var roof := PackedVector2Array([
		Vector2(0, base),
		Vector2(size.x * 0.12, base - 44),
		Vector2(size.x * 0.22, base - 26),
		Vector2(size.x * 0.36, base - 62),
		Vector2(size.x * 0.48, base - 36),
		Vector2(size.x * 0.62, base - 70),
		Vector2(size.x * 0.74, base - 32),
		Vector2(size.x * 0.88, base - 52),
		Vector2(size.x, base - 26),
		Vector2(size.x, size.y),
		Vector2(0, size.y),
	])
	draw_colored_polygon(roof, Color(0.07, 0.05, 0.06, 0.86))
	draw_polyline(roof.slice(0, 9), Color(tint.r, tint.g, tint.b, 0.28), 1.5, true)
	draw_circle(Vector2(size.x * 0.78, size.y * 0.22), 26.0, Color(tint.r, tint.g, tint.b, 0.12))
	for i in 4:
		var x := size.x * (0.24 + i * 0.12)
		var y := size.y * (0.4 - i * 0.03)
		draw_circle(Vector2(x, y), 7.0 + i * 2.0, Color(tint.r, tint.g, tint.b, 0.05))

func _draw_foundry() -> void:
	var cx := size.x * 0.5
	var base := size.y * 0.78
	draw_arc(Vector2(cx, base), 84.0, PI, TAU, 40, Color(tint.r, tint.g, tint.b, 0.32), 2.0, true)
	draw_line(Vector2(cx - 84, base), Vector2(cx - 84, size.y * 0.9), Color(tint.r, tint.g, tint.b, 0.3), 2.0)
	draw_line(Vector2(cx + 84, base), Vector2(cx + 84, size.y * 0.9), Color(tint.r, tint.g, tint.b, 0.3), 2.0)
	draw_circle(Vector2(cx, base), 44.0, Color(tint.r, tint.g, tint.b, 0.08))
	draw_circle(Vector2(cx, base), 24.0, Color(tint.r, tint.g, tint.b, 0.14))
	for i in 7:
		var angle := -PI * 0.85 + i * 0.28
		var r := 100.0 + (i % 3) * 12.0
		var p := Vector2(cx + cos(angle) * r, base + sin(angle) * r)
		draw_circle(p, 2.0 + (i % 2), Color(tint.r, tint.g, tint.b, 0.32))
	draw_line(Vector2(24, size.y * 0.24), Vector2(size.x - 24, size.y * 0.24), Color(tint.r, tint.g, tint.b, 0.08), 1.0)
	draw_line(Vector2(24, size.y * 0.28), Vector2(size.x - 24, size.y * 0.28), Color(tint.r, tint.g, tint.b, 0.05), 1.0)

func _draw_night_spire() -> void:
	var cx := size.x * 0.5
	var base := size.y * 0.86
	draw_circle(Vector2(size.x * 0.78, size.y * 0.22), 30.0, Color(tint.r, tint.g, tint.b, 0.14))
	draw_circle(Vector2(size.x * 0.76, size.y * 0.2), 26.0, Palette.BG_RAISED)
	var tower := PackedVector2Array([
		Vector2(cx - 52, base),
		Vector2(cx - 42, size.y * 0.36),
		Vector2(cx - 16, size.y * 0.2),
		Vector2(cx, size.y * 0.12),
		Vector2(cx + 16, size.y * 0.2),
		Vector2(cx + 42, size.y * 0.36),
		Vector2(cx + 52, base),
	])
	draw_colored_polygon(tower, Color(0.06, 0.05, 0.08, 0.9))
	draw_polyline(tower, Color(tint.r, tint.g, tint.b, 0.3), 1.5, true)
	draw_circle(Vector2(cx, size.y * 0.3), 16.0, Color(tint.r, tint.g, tint.b, 0.1))
	for i in 5:
		var x := 32.0 + i * (size.x - 64.0) / 4.0
		var y := size.y * (0.18 + (i % 3) * 0.08)
		draw_circle(Vector2(x, y), 1.5, Color(tint.r, tint.g, tint.b, 0.3))
