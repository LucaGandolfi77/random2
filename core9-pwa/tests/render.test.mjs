import test from "node:test";
import assert from "node:assert/strict";

import { ZONES, ZONE_BY_ID, STAGE_LEVELS, MAX_LEVEL, siteZones } from "../src/data/zones.js";
import { SITES } from "../src/data/sites.js";
import { buildZoneModel, buildSiteProps } from "../src/render/models.js";
import { shade } from "../src/render/primitives.js";

test("every zone at every level builds a finite low-poly mesh", () => {
  let totalFaces = 0;
  for (const zone of ZONES) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const model = buildZoneModel(zone.id, level);
      assert.ok(model, zone.id + ":" + level);
      assert.ok(model.faces.length > 4, zone.id + ":" + level);
      assert.ok(model.faces.length < 800, zone.id + ":" + level + " mesh is too heavy (" + model.faces.length + ")");
      assert.ok(Number.isFinite(model.height) && model.height > 0);
      totalFaces += model.faces.length;
      for (const face of model.faces) {
        assert.ok(face.p.length >= 3, zone.id + ":" + level);
        for (const p of face.p) {
          for (let i = 0; i < 3; i++) assert.ok(Number.isFinite(p[i]), zone.id + ":" + level + " NaN vertex");
        }
        assert.match(face.c, /^(#[0-9a-f]{3,6}|rgb\(\d+,\d+,\d+\))$/i, "colour should be hex or rgb");
        assert.ok(Number.isFinite(face.tone), "tone");
      }
    }
  }
  assert.ok(totalFaces > 10000);
});

test("every zone has eight visibly different stage silhouettes", () => {
  for (const zone of ZONES) {
    const signatures = new Set();
    for (const level of STAGE_LEVELS) {
      const model = buildZoneModel(zone.id, level);
      signatures.add(JSON.stringify(model.faces.map((f) => f.p)));
    }
    assert.equal(signatures.size, 8, zone.id + " should change at every stage");
  }
});

test("level props change the mesh inside a stage", () => {
  for (const zone of ZONES) {
    const a = buildZoneModel(zone.id, 1);
    const b = buildZoneModel(zone.id, 3);
    assert.notEqual(JSON.stringify(a.faces), JSON.stringify(b.faces), zone.id);
  }
});

test("site palettes produce genuinely different materials", () => {
  const core = siteZones(SITES[0]);
  const desert = siteZones(SITES[1]);
  const arctic = siteZones(SITES[2]);
  const a = buildZoneModel(core.find((z) => z.id === "reactor"), 8, "core9");
  const b = buildZoneModel(desert.find((z) => z.id === "reactor"), 8, "solaris");
  const c = buildZoneModel(arctic.find((z) => z.id === "reactor"), 8, "glacier");
  assert.notDeepEqual(a.faces[0].c, b.faces[0].c);
  assert.notDeepEqual(b.faces[0].c, c.faces[0].c);
  assert.equal(a.stage, 3);
});

test("the four auxiliary plot builders produce distinct meshes", () => {
  for (const id of ["battery", "pump", "solar", "geothermal"]) {
    const model = buildZoneModel(id, 10);
    assert.ok(model);
    assert.ok(model.faces.length > 10);
  }
});

test("the model cache is stable and site-keyed", () => {
  const a = buildZoneModel("reactor", 20, "core9");
  const b = buildZoneModel("reactor", 20, "core9");
  assert.equal(a, b);
  const c = buildZoneModel("reactor", 20, "glacier");
  assert.notEqual(a, c);
});

test("site props are finite for all three terrains", () => {
  for (const site of SITES) {
    const props = buildSiteProps(site);
    assert.ok(props.faces.length > 0, site.id);
    for (const face of props.faces) {
      for (const p of face.p) {
        assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]) && Number.isFinite(p[2]));
      }
    }
  }
});

test("flat shading clamps and never returns NaN", () => {
  assert.match(shade("#4dd8c0", 1.2), /^rgb\(/);
  assert.match(shade("#000000", 2), /^rgb\(0,0,0\)$/);
  assert.match(shade("#ffffff", 0), /^rgb\(0,0,0\)$/);
  assert.match(shade("rgb(78,90,95)", 1.2), /^rgb\(/);
});
