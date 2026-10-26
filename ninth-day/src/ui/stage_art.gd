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
		"ember_row", "foundry", "checkpoint", "bellows", "garden", "ash":
			tint = Palette.EMBER
		"spire_night", "clockwork", "roof", "quiet", "sanctuary":
			tint = Palette.HUSH
		"wren_house":
			tint = Palette.BRASS
		"spire_ascent":
			tint = Palette.BRASS
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
		"checkpoint":
			_draw_checkpoint()
		"bellows":
			_draw_bellows()
		"garden":
			_draw_garden()
		"clockwork":
			_draw_clockwork()
		"roof":
			_draw_roof()
		"wren_house":
			_draw_wren_house()
		"quiet":
			_draw_quiet()
		"sanctuary":
			_draw_sanctuary()
		"ash":
			_draw_ash()
		"spire_ascent":
			_draw_spire_ascent()
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

func _draw_bellows() -> void:
	var cx := size.x * 0.5
	var base := size.y * 0.86
	for i in 4:
		var x := size.x * (0.2 + i * 0.2)
		draw_line(Vector2(x, 0), Vector2(x, size.y * (0.48 + (i % 2) * 0.08)), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
		for j in 5:
			draw_circle(Vector2(x, size.y * 0.1 + j * 18.0), 2.0, Color(tint.r, tint.g, tint.b, 0.2))
	draw_arc(Vector2(cx, size.y * 0.58), 64.0, 0, TAU, 48, Color(tint.r, tint.g, tint.b, 0.22), 2.0, true)
	for i in 12:
		var angle := TAU * i / 12.0
		var p1 := Vector2(cx + cos(angle) * 54.0, size.y * 0.58 + sin(angle) * 54.0)
		var p2 := Vector2(cx + cos(angle) * 70.0, size.y * 0.58 + sin(angle) * 70.0)
		draw_line(p1, p2, Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_arc(Vector2(cx, base), 100.0, PI, TAU, 40, Color(tint.r, tint.g, tint.b, 0.1), 1.0, true)
	draw_line(Vector2(cx - 100, base), Vector2(cx + 100, base), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	for i in 6:
		var x := size.x * (0.18 + (i % 3) * 0.28)
		var row := 0 if i < 3 else 1
		var y := size.y * (0.68 + row * 0.1)
		draw_circle(Vector2(x, y), 2.0, Color(tint.r, tint.g, tint.b, 0.3))

func _draw_checkpoint() -> void:
	var base := size.y * 0.86
	var left := size.x * 0.28
	var right := size.x * 0.72
	draw_rect(Rect2(Vector2(left - 10, size.y * 0.34), Vector2(right - left + 20, base - size.y * 0.34)), Color(tint.r, tint.g, tint.b, 0.04))
	draw_arc(Vector2((left + right) * 0.5, size.y * 0.42), (right - left) * 0.5, PI, TAU, 32, Color(tint.r, tint.g, tint.b, 0.26), 2.0, true)
	draw_line(Vector2(left, size.y * 0.42), Vector2(left, base), Color(tint.r, tint.g, tint.b, 0.26), 2.0, true)
	draw_line(Vector2(right, size.y * 0.42), Vector2(right, base), Color(tint.r, tint.g, tint.b, 0.26), 2.0, true)
	for i in 7:
		var x := left + (right - left) * i / 6.0
		draw_line(Vector2(x, size.y * 0.44), Vector2(x, base - 8), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
	draw_line(Vector2(left - 20, base - 8), Vector2(right + 20, base - 8), Color(tint.r, tint.g, tint.b, 0.3), 2.0, true)
	draw_circle(Vector2((left + right) * 0.5, size.y * 0.3), 5.0, Color(tint.r, tint.g, tint.b, 0.34))
	for i in 3:
		draw_line(Vector2(20, size.y * 0.22 + i * 10), Vector2(left - 24, size.y * 0.22 + i * 10), Color(tint.r, tint.g, tint.b, 0.06), 1.0)
		draw_line(Vector2(right + 24, size.y * 0.22 + i * 10), Vector2(size.x - 20, size.y * 0.22 + i * 10), Color(tint.r, tint.g, tint.b, 0.06), 1.0)

func _draw_garden() -> void:
	var base := size.y * 0.84
	draw_arc(Vector2(size.x * 0.5, size.y * 0.52), 96.0, PI, TAU, 40, Color(tint.r, tint.g, tint.b, 0.16), 1.5, true)
	for row in 3:
		var y := size.y * (0.56 + row * 0.11)
		for i in 7:
			var x := size.x * (0.16 + i * 0.115)
			draw_line(Vector2(x, y + 10), Vector2(x, y - 10), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
			draw_circle(Vector2(x, y - 12), 3.0 + (row % 2), Color(tint.r, tint.g, tint.b, 0.24))
	draw_line(Vector2(24, base), Vector2(size.x - 24, base), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
	for i in 4:
		var x := size.x * (0.2 + i * 0.2)
		draw_line(Vector2(x, size.y * 0.74), Vector2(x, base), Color(tint.r, tint.g, tint.b, 0.08), 1.0)

func _draw_clockwork() -> void:
	var cx := size.x * 0.5
	var cy := size.y * 0.56
	draw_circle(Vector2(cx, cy), 44.0, Color(tint.r, tint.g, tint.b, 0.06))
	draw_arc(Vector2(cx, cy), 44.0, 0, TAU, 48, Color(tint.r, tint.g, tint.b, 0.26), 2.0, true)
	for gear in 2:
		var center := Vector2(cx - 78 + gear * 156, cy + 26 - gear * 42)
		var radius := 30.0 - gear * 6
		draw_arc(center, radius, 0, TAU, 36, Color(tint.r, tint.g, tint.b, 0.2), 1.5, true)
		for i in 10:
			var angle := TAU * i / 10.0
			draw_line(center + Vector2(cos(angle), sin(angle)) * radius, center + Vector2(cos(angle), sin(angle)) * (radius + 7), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
	draw_line(Vector2(cx - 8, cy - 20), Vector2(cx + 6, cy + 16), Color(tint.r, tint.g, tint.b, 0.24), 2.0, true)
	draw_circle(Vector2(cx, cy), 5.0, Color(tint.r, tint.g, tint.b, 0.3))

func _draw_roof() -> void:
	var base := size.y * 0.8
	draw_circle(Vector2(size.x * 0.78, size.y * 0.2), 26.0, Color(tint.r, tint.g, tint.b, 0.16))
	draw_circle(Vector2(size.x * 0.76, size.y * 0.18), 23.0, Palette.BG_RAISED)
	for i in 4:
		var x := size.x * (0.1 + i * 0.26)
		var h := size.y * (0.26 + (i % 2) * 0.1)
		draw_rect(Rect2(Vector2(x, base - h), Vector2(size.x * 0.16, h)), Color(0.06, 0.05, 0.08, 0.9))
		draw_line(Vector2(x, base - h), Vector2(x + size.x * 0.16, base - h), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	draw_line(Vector2(0, base), Vector2(size.x, base), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	draw_circle(Vector2(size.x * 0.68, base - 8), 5.0, Color(tint.r, tint.g, tint.b, 0.32))
	draw_line(Vector2(size.x * 0.68, base - 8), Vector2(size.x * 0.68, base - 20), Color(tint.r, tint.g, tint.b, 0.26), 1.5)

func _draw_wren_house() -> void:
	var base := size.y * 0.86
	draw_rect(Rect2(Vector2(size.x * 0.16, size.y * 0.2), Vector2(size.x * 0.3, size.y * 0.28)), Color(tint.r, tint.g, tint.b, 0.06))
	draw_rect(Rect2(Vector2(size.x * 0.16, size.y * 0.2), Vector2(size.x * 0.3, size.y * 0.28)), Color(tint.r, tint.g, tint.b, 0.2), false, 1.0)
	draw_line(Vector2(size.x * 0.31, size.y * 0.2), Vector2(size.x * 0.31, size.y * 0.48), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	draw_line(Vector2(size.x * 0.16, size.y * 0.34), Vector2(size.x * 0.46, size.y * 0.34), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	draw_line(Vector2(size.x * 0.08, base), Vector2(size.x * 0.92, base), Color(tint.r, tint.g, tint.b, 0.24), 2.0)
	for i in 4:
		var x := size.x * (0.54 + i * 0.09)
		draw_line(Vector2(x, size.y * 0.22), Vector2(x, size.y * 0.5), Color(tint.r, tint.g, tint.b, 0.12), 1.0)
		draw_rect(Rect2(Vector2(x - 7, size.y * 0.3), Vector2(14, 22)), Color(tint.r, tint.g, tint.b, 0.06))
	draw_rect(Rect2(Vector2(size.x * 0.2, base - 50), Vector2(size.x * 0.38, 8)), Color(tint.r, tint.g, tint.b, 0.16))
	draw_line(Vector2(size.x * 0.24, base - 50), Vector2(size.x * 0.24, base), Color(tint.r, tint.g, tint.b, 0.12), 1.0)
	draw_line(Vector2(size.x * 0.54, base - 50), Vector2(size.x * 0.54, base), Color(tint.r, tint.g, tint.b, 0.12), 1.0)

func _draw_quiet() -> void:
	var cx := size.x * 0.5
	draw_circle(Vector2(cx, size.y * 0.52), 70.0, Color(0.01, 0.01, 0.02, 0.6))
	var crack := PackedVector2Array([
		Vector2(cx - 8, size.y * 0.16),
		Vector2(cx + 6, size.y * 0.34),
		Vector2(cx - 10, size.y * 0.46),
		Vector2(cx + 12, size.y * 0.62),
		Vector2(cx - 4, size.y * 0.82),
	])
	draw_polyline(crack, Color(0.92, 0.88, 0.78, 0.3), 2.0, true)
	for i in 5:
		var y := size.y * (0.24 + i * 0.12)
		draw_line(Vector2(cx - 90 - i * 8, y), Vector2(cx - 24, y + 8), Color(tint.r, tint.g, tint.b, 0.06), 1.0)
		draw_line(Vector2(cx + 24, y + 8), Vector2(cx + 90 + i * 8, y), Color(tint.r, tint.g, tint.b, 0.06), 1.0)

func _draw_sanctuary() -> void:
	var cx := size.x * 0.5
	var base := size.y * 0.82
	draw_arc(Vector2(cx, size.y * 0.46), 78.0, PI, TAU, 40, Color(tint.r, tint.g, tint.b, 0.22), 1.5, true)
	draw_line(Vector2(cx - 78, size.y * 0.46), Vector2(cx - 78, base), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
	draw_line(Vector2(cx + 78, size.y * 0.46), Vector2(cx + 78, base), Color(tint.r, tint.g, tint.b, 0.18), 1.0)
	draw_line(Vector2(cx - 100, base), Vector2(cx + 100, base), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	for i in 6:
		var x := size.x * (0.16 + i * 0.136)
		var h := 10.0 + (i % 3) * 6.0
		draw_line(Vector2(x, base - h), Vector2(x, base), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
		draw_circle(Vector2(x, base - h - 3), 2.0, Color(tint.r, tint.g, tint.b, 0.34))
	for i in 3:
		draw_line(Vector2(24, size.y * 0.2 + i * 12), Vector2(size.x - 24, size.y * 0.2 + i * 12), Color(tint.r, tint.g, tint.b, 0.05), 1.0)

func _draw_ash() -> void:
	var base := size.y * 0.82
	draw_arc(Vector2(size.x * 0.5, size.y * 0.58), 92.0, PI, TAU, 40, Color(tint.r, tint.g, tint.b, 0.12), 1.0, true)
	draw_line(Vector2(0, base), Vector2(size.x, base), Color(tint.r, tint.g, tint.b, 0.16), 1.0)
	for i in 14:
		var x := size.x * (0.06 + (i * 37 % 88) / 100.0)
		var y := size.y * (0.28 + (i * 53 % 48) / 100.0)
		draw_circle(Vector2(x, y), 1.0 + (i % 3) * 0.8, Color(tint.r, tint.g, tint.b, 0.18))
	for i in 5:
		var x := size.x * (0.3 + i * 0.1)
		draw_line(Vector2(x, size.y * 0.62), Vector2(x + 8, size.y * 0.3), Color(tint.r, tint.g, tint.b, 0.08), 1.0)
	draw_circle(Vector2(size.x * 0.5, size.y * 0.6), 12.0, Color(tint.r, tint.g, tint.b, 0.1))
	draw_circle(Vector2(size.x * 0.5, size.y * 0.6), 6.0, Color(tint.r, tint.g, tint.b, 0.18))

func _draw_spire_ascent() -> void:
	var cx := size.x * 0.5
	draw_line(Vector2(cx - 90, size.y * 0.88), Vector2(cx - 20, size.y * 0.68), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_line(Vector2(cx - 20, size.y * 0.68), Vector2(cx + 46, size.y * 0.52), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_line(Vector2(cx + 46, size.y * 0.52), Vector2(cx - 10, size.y * 0.38), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_line(Vector2(cx - 10, size.y * 0.38), Vector2(cx + 30, size.y * 0.26), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	for i in 9:
		var t := i / 9.0
		var x := lerpf(size.x * 0.2, size.x * 0.72, t)
		var y := lerpf(size.y * 0.88, size.y * 0.24, t)
		draw_line(Vector2(x - 12, y), Vector2(x + 12, y), Color(tint.r, tint.g, tint.b, 0.14), 1.0)
	draw_arc(Vector2(cx, size.y * 0.18), 46.0, PI, TAU, 32, Color(tint.r, tint.g, tint.b, 0.3), 1.5, true)
	draw_line(Vector2(cx - 46, size.y * 0.18), Vector2(cx - 46, size.y * 0.26), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_line(Vector2(cx + 46, size.y * 0.18), Vector2(cx + 46, size.y * 0.26), Color(tint.r, tint.g, tint.b, 0.2), 1.0)
	draw_circle(Vector2(cx, size.y * 0.27), 5.0, Color(tint.r, tint.g, tint.b, 0.36))
	for i in 4:
		draw_line(Vector2(22, size.y * (0.3 + i * 0.08)), Vector2(size.x - 22, size.y * (0.3 + i * 0.08)), Color(tint.r, tint.g, tint.b, 0.04), 1.0)

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
