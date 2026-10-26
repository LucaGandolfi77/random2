import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyFile,
  cleanName,
  extensionOf,
  formatTime,
  formatBytes
} from "../src/format.js";

test("classifyFile trusts the MIME type first", () => {
  assert.equal(classifyFile({ name: "track.bin", type: "audio/mpeg" }), "audio");
  assert.equal(classifyFile({ name: "clip.bin", type: "video/mp4" }), "video");
});

test("classifyFile falls back to the extension", () => {
  assert.equal(classifyFile({ name: "Song.MP3", type: "" }), "audio");
  assert.equal(classifyFile({ name: "holiday.webm", type: "" }), "video");
  assert.equal(classifyFile({ name: "notes.pdf", type: "application/pdf" }), null);
});

test("cleanName removes the extension and tidies underscores", () => {
  assert.equal(cleanName("my_song_01.mp3"), "my song 01");
  assert.equal(cleanName("C:\\Music\\Disco.mp4"), "Disco");
  assert.equal(cleanName("no-extension"), "no-extension");
});

test("extensionOf is uppercase and ignores dots in folders", () => {
  assert.equal(extensionOf("folder.v1/song.mp3"), "MP3");
  assert.equal(extensionOf("noext"), "");
});

test("formatTime handles minutes, hours and bad input", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(9), "0:09");
  assert.equal(formatTime(65), "1:05");
  assert.equal(formatTime(3661), "1:01:01");
  assert.equal(formatTime(NaN), "0:00");
  assert.equal(formatTime(-4), "0:00");
});

test("formatBytes uses binary units and sensible precision", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(5 * 1024 * 1024), "5.0 MB");
});
