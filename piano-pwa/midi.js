/* ============================================================
   Minimal Standard MIDI File parser for Piano Fall
   ------------------------------------------------------------
   Parses format 0/1 SMF files (PPQ or SMPTE timing) into
   absolute-time notes. No dependencies, no build step.

   Exposes:
     R2.midi.parse(arrayBuffer, fallbackName) -> {
       name, bpm, duration, notes: [{ midi, t, dur, channel }],
       format, trackCount
     }
   ============================================================ */
(function (root, factory) {
    var api = factory();
    if (typeof module === "object" && module.exports) module.exports = api;
    root.R2 = root.R2 || {};
    root.R2.midi = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    var MAX_FILE_BYTES = 5 * 1024 * 1024;
    var MAX_NOTES = 30000;

    function readStr(bytes, offset, len) {
        var s = "";
        for (var i = 0; i < len; i++) s += String.fromCharCode(bytes[offset + i]);
        return s;
    }

    function readVLQ(bytes, start, end) {
        var value = 0;
        var i = start;
        for (var n = 0; n < 4; n++) {
            if (i >= end) throw new Error("Truncated MIDI variable-length value.");
            var b = bytes[i++];
            value = (value << 7) | (b & 0x7f);
            if (!(b & 0x80)) return { value: value, next: i };
        }
        throw new Error("Invalid MIDI variable-length value.");
    }

    function decodeText(bytes) {
        var text = "";
        try {
            if (typeof TextDecoder !== "undefined") {
                text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
            } else {
                for (var i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]);
            }
        } catch (e) {
            for (var j = 0; j < bytes.length; j++) text += String.fromCharCode(bytes[j]);
        }
        return text.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    }

    function parseTrack(bytes, start, end) {
        var i = start;
        var tick = 0;
        var running = 0;
        var open = Object.create(null);
        var notes = [];
        var tempos = [];
        var name = "";

        while (i < end) {
            var delta = readVLQ(bytes, i, end);
            tick += delta.value;
            i = delta.next;
            if (i >= end) break;

            var status = bytes[i];
            if (status & 0x80) {
                i++;
                if (status < 0xf0) running = status;
            } else {
                status = running;
                if (!status) throw new Error("Invalid MIDI running status.");
            }

            if (status === 0xff) {
                if (i >= end) throw new Error("Truncated MIDI meta event.");
                var metaType = bytes[i++];
                var metaLen = readVLQ(bytes, i, end);
                i = metaLen.next;
                var metaEnd = i + metaLen.value;
                if (metaEnd > end) throw new Error("Truncated MIDI meta event.");
                if (metaType === 0x51 && metaLen.value === 3) {
                    var us = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
                    if (us > 0) tempos.push({ tick: tick, us: us });
                } else if ((metaType === 0x03 || metaType === 0x01) && !name && metaLen.value) {
                    name = decodeText(bytes.subarray(i, metaEnd));
                } else if (metaType === 0x2f) {
                    i = metaEnd;
                    break;
                }
                i = metaEnd;
                continue;
            }

            if (status === 0xf0 || status === 0xf7) {
                var sysexLen = readVLQ(bytes, i, end);
                i = sysexLen.next + sysexLen.value;
                if (i > end) throw new Error("Truncated MIDI sysex event.");
                continue;
            }

            if (status >= 0xf1 && status <= 0xfe) {
                var systemLen = status === 0xf2 ? 2 : (status === 0xf1 || status === 0xf3) ? 1 : 0;
                i += systemLen;
                if (i > end) throw new Error("Truncated MIDI system event.");
                continue;
            }

            if (status < 0x80) throw new Error("Invalid MIDI event status.");

            var high = status & 0xf0;
            var channel = status & 0x0f;
            var dataLen = (high === 0xc0 || high === 0xd0) ? 1 : 2;
            if (i + dataLen > end) throw new Error("Truncated MIDI channel event.");

            var d1 = bytes[i];
            var d2 = dataLen === 2 ? bytes[i + 1] : 0;
            i += dataLen;
            if (d1 > 127 || d2 > 127) throw new Error("Invalid MIDI data byte.");

            if (high === 0x90 && d2 > 0) {
                var onKey = channel + ":" + d1;
                if (!open[onKey]) open[onKey] = [];
                open[onKey].push(tick);
            } else if (high === 0x80 || (high === 0x90 && d2 === 0)) {
                var offKey = channel + ":" + d1;
                var stack = open[offKey];
                if (stack && stack.length) {
                    var onTick = stack.shift();
                    if (tick >= onTick) {
                        notes.push({ midi: d1, channel: channel, tick: onTick, dur: tick - onTick });
                    }
                }
            }
        }

        /* Close any notes that never got a note-off at the end of the track. */
        for (var key in open) {
            var pending = open[key];
            for (var p = 0; p < pending.length; p++) {
                var parts = key.split(":");
                notes.push({
                    midi: parseInt(parts[1], 10),
                    channel: parseInt(parts[0], 10),
                    tick: pending[p],
                    dur: Math.max(0, tick - pending[p]),
                });
            }
        }

        return { notes: notes, tempos: tempos, name: name, endTick: tick };
    }

    function makeTickToSec(division, tempoEvents, smpte, ticksPerSecond) {
        if (smpte) {
            return function (tick) { return tick / ticksPerSecond; };
        }

        var segments = [];
        var lastTick = 0;
        var lastSec = 0;
        var us = 500000;

        for (var i = 0; i < tempoEvents.length; i++) {
            var ev = tempoEvents[i];
            if (ev.tick < lastTick) continue;
            lastSec += (ev.tick - lastTick) * us / 1e6 / division;
            lastTick = ev.tick;
            us = ev.us;
            segments.push({ tick: lastTick, sec: lastSec, us: us });
        }

        return function (tick) {
            var lo = 0;
            var hi = segments.length - 1;
            var idx = -1;
            while (lo <= hi) {
                var mid = (lo + hi) >> 1;
                if (segments[mid].tick <= tick) {
                    idx = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            if (idx < 0) return tick * 500000 / 1e6 / division;
            var seg = segments[idx];
            return seg.sec + (tick - seg.tick) * seg.us / 1e6 / division;
        };
    }

    function parse(input, fallbackName) {
        var bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
        if (!bytes || bytes.length < 14) throw new Error("This file is too small to be a MIDI file.");
        if (bytes.length > MAX_FILE_BYTES) throw new Error("MIDI file is too large (max 5 MB).");

        if (readStr(bytes, 0, 4) !== "MThd") {
            throw new Error("Not a MIDI file (missing MThd header).");
        }

        var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        var headerLen = dv.getUint32(4);
        if (headerLen < 6 || 8 + headerLen > bytes.length) {
            throw new Error("Invalid MIDI header.");
        }

        var format = dv.getUint16(8);
        var trackCount = dv.getUint16(10);
        var division = dv.getUint16(12);

        if (format === 2) throw new Error("MIDI format 2 is not supported.");
        if (format !== 0 && format !== 1) throw new Error("Unsupported MIDI format.");
        if (!division) throw new Error("Invalid MIDI timing division.");

        var smpte = !!(division & 0x8000);
        var ticksPerSecond = 0;
        if (smpte) {
            var fps = 256 - ((division >> 8) & 0xff);
            var ticksPerFrame = division & 0xff;
            if (!fps || !ticksPerFrame) throw new Error("Invalid SMPTE timing.");
            ticksPerSecond = fps * ticksPerFrame;
        }

        var offset = 8 + headerLen;
        var tracks = [];
        while (offset + 8 <= bytes.length && tracks.length < 128) {
            var type = readStr(bytes, offset, 4);
            var len = dv.getUint32(offset + 4);
            offset += 8;
            if (offset + len > bytes.length) throw new Error("Truncated MIDI track.");
            if (type === "MTrk") {
                tracks.push(parseTrack(bytes, offset, offset + len));
            }
            offset += len;
        }

        if (!tracks.length) throw new Error("No MIDI tracks found.");

        var allNotes = [];
        var allTempos = [];
        var songName = "";

        for (var t = 0; t < tracks.length; t++) {
            var track = tracks[t];
            for (var n = 0; n < track.notes.length; n++) allNotes.push(track.notes[n]);
            for (var e = 0; e < track.tempos.length; e++) allTempos.push(track.tempos[e]);
            if (!songName && track.name) songName = track.name;
        }

        allTempos.sort(function (a, b) { return a.tick - b.tick; });
        var tempoEvents = [];
        for (var i = 0; i < allTempos.length; i++) {
            var tempo = allTempos[i];
            if (tempoEvents.length && tempoEvents[tempoEvents.length - 1].tick === tempo.tick) {
                tempoEvents[tempoEvents.length - 1].us = tempo.us;
            } else {
                tempoEvents.push({ tick: tempo.tick, us: tempo.us });
            }
        }
        if (!tempoEvents.length || tempoEvents[0].tick !== 0) {
            tempoEvents.unshift({ tick: 0, us: 500000 });
        }

        var tickToSec = makeTickToSec(division, tempoEvents, smpte, ticksPerSecond);
        var out = [];
        var seen = Object.create(null);
        var duration = 0;

        for (var k = 0; k < allNotes.length; k++) {
            var note = allNotes[k];
            if (note.channel === 9) continue; // percussion
            if (note.midi < 0 || note.midi > 127) continue;

            var start = tickToSec(note.tick);
            var end = tickToSec(note.tick + note.dur);
            var noteDur = Math.max(0, end - start);
            var dedupeKey = note.midi + ":" + Math.round(start * 1000);
            var prev = seen[dedupeKey];
            if (prev) {
                if (noteDur > prev.dur) prev.dur = noteDur;
                continue;
            }

            var item = { midi: note.midi, t: start, dur: noteDur, channel: note.channel };
            seen[dedupeKey] = item;
            out.push(item);
            if (start + noteDur > duration) duration = start + noteDur;
        }

        if (!out.length) throw new Error("No playable notes found in this MIDI file.");
        if (out.length > MAX_NOTES) {
            throw new Error("MIDI file has too many notes (max " + MAX_NOTES + ").");
        }

        out.sort(function (a, b) { return a.t - b.t || a.midi - b.midi; });

        var fallback = String(fallbackName || "MIDI file")
            .replace(/^.*[\\/]/, "")
            .replace(/\.(mid|midi)$/i, "")
            .trim();
        var finalName = (songName || fallback || "MIDI file").replace(/\s+/g, " ").slice(0, 80);

        return {
            name: finalName,
            bpm: 60e6 / tempoEvents[0].us,
            duration: duration,
            notes: out,
            format: format,
            trackCount: tracks.length,
        };
    }

    return { parse: parse };
});
