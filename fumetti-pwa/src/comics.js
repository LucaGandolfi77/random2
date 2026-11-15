import { sentinelle01 } from "./issues/sentinelle-01.js";
import { sentinelle02 } from "./issues/sentinelle-02.js";

export const ISSUES = [sentinelle01, sentinelle02];

const LAYOUTS = {
  splash: 1,
  duo: 2,
  trio: 3,
  quad: 4,
  five: 5,
  six: 6,
  tall: 3
};

export const TEXT_KINDS = ["speech", "thought", "whisper", "shout", "caption", "tv", "radio", "end", "sfx"];

export function getIssue(id) {
  return ISSUES.find((issue) => issue.id === id) || null;
}

/* A quiet validation pass used by the tests and by the reader in dev.
 * It returns an array of human-readable errors; an empty array is valid. */
export function validateIssue(issue, vocab = {}) {
  const errors = [];
  const backgrounds = new Set(vocab.backgrounds || []);
  const characters = new Set(vocab.characters || []);
  const poses = new Set(vocab.poses || []);
  const fx = new Set(vocab.fx || []);

  if (!issue || typeof issue !== "object") return ["issue is missing"];
  if (!issue.id) errors.push("issue.id is missing");
  if (!issue.title) errors.push("issue.title is missing");
  if (!issue.end || !issue.end.teaser) errors.push("issue.end.teaser is missing");
  if (!issue.cover || !issue.cover.bg) errors.push("issue.cover is missing a background");
  if (!Array.isArray(issue.pages) || !issue.pages.length) {
    errors.push("issue.pages is empty");
    return errors;
  }

  const panelIds = new Set();

  issue.pages.forEach((page, pageIndex) => {
    const where = `pages[${pageIndex}]`;
    if (!page.id) errors.push(`${where}.id is missing`);
    if (!(page.layout in LAYOUTS)) {
      errors.push(`${where}.layout "${page.layout}" is unknown`);
    }
    if (!Array.isArray(page.panels) || !page.panels.length) {
      errors.push(`${where}.panels is empty`);
      return;
    }
    if (page.layout in LAYOUTS && page.panels.length !== LAYOUTS[page.layout]) {
      errors.push(`${where}.layout "${page.layout}" wants ${LAYOUTS[page.layout]} panels, found ${page.panels.length}`);
    }

    let words = 0;

    page.panels.forEach((panel, panelIndex) => {
      const at = `${where}.panels[${panelIndex}]`;
      if (!panel.id) errors.push(`${at}.id is missing`);
      if (panel.id && panelIds.has(panel.id)) errors.push(`${at}.id "${panel.id}" is duplicated`);
      if (panel.id) panelIds.add(panel.id);
      if (backgrounds.size && !backgrounds.has(panel.bg)) {
        errors.push(`${at}.bg "${panel.bg}" is not in art.js`);
      }
      (panel.fx || []).forEach((key) => {
        if (fx.size && !fx.has(key)) errors.push(`${at}.fx "${key}" is not in art.js`);
      });
      (panel.chars || []).forEach((char, charIndex) => {
        if (characters.size && !characters.has(char.who)) {
          errors.push(`${at}.chars[${charIndex}] "${char.who}" is not in art.js`);
        }
        if (poses.size && !poses.has(char.pose || "stand")) {
          errors.push(`${at}.chars[${charIndex}] pose "${char.pose}" is not in art.js`);
        }
        if (typeof char.x !== "number" || char.x < 0 || char.x > 1) {
          errors.push(`${at}.chars[${charIndex}].x must be 0..1`);
        }
        if (typeof char.y !== "number" || char.y < 0 || char.y > 1) {
          errors.push(`${at}.chars[${charIndex}].y must be 0..1`);
        }
      });

      const texts = panel.balloons || [];
      texts.forEach((item, textIndex) => {
        const t = `${at}.balloons[${textIndex}]`;
        if (!TEXT_KINDS.includes(item.kind)) errors.push(`${t}.kind "${item.kind}" is unknown`);
        if (!item.text || !String(item.text).trim()) errors.push(`${t}.text is empty`);
        if (/\bTODO\b|lorem ipsum/i.test(String(item.text || ""))) {
          errors.push(`${t}.text still looks like a placeholder`);
        }
        if (item.kind !== "sfx") {
          if (typeof item.x !== "number" || item.x < 0 || item.x > 1) errors.push(`${t}.x must be 0..1`);
          if (typeof item.y !== "number" || item.y < 0 || item.y > 1) errors.push(`${t}.y must be 0..1`);
          if (typeof item.w !== "number" || item.w < 0.08 || item.w > 1) errors.push(`${t}.w must be 0.08..1`);
          if (["speech", "thought", "whisper", "shout"].includes(item.kind) && !item.who) {
            errors.push(`${t}.who is missing`);
          }
          words += String(item.text || "").trim().split(/\s+/).length;
        }
      });
    });

    if (!words) errors.push(`${where} has no readable text`);
  });

  return errors;
}
