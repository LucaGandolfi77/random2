import {
  FAMILY_LABEL,
  FAMILY_LONG,
  fmtNumber,
  fmtSigned,
  interpolate,
  t
} from "../data/strings";
import type { Bilancio, Lang } from "../data/types";

export function playUrl(): string {
  const base = typeof window === "undefined" ? "https://lucagandolfi77.github.io/random2/comune-2050-pwa/" : new URL(".", window.location.href).href;
  return base;
}

export function reportText(report: Bilancio, lang: Lang, url = playUrl()): string {
  const name = report.comune.identity.name;
  const title = interpolate(t(lang, "shareTitle"), { name });
  const body = interpolate(t(lang, "shareBody"), {
    name,
    score: fmtNumber(report.total, lang, 1),
    delta: fmtSigned(report.totalDelta, lang, 1),
    pop: fmtNumber(report.population, lang),
    baseline: fmtNumber(report.baselinePopulation, lang)
  });
  const axes = report.axes
    .map((axis) => `${FAMILY_LABEL[axis.key][lang]} ${fmtSigned(axis.delta, lang, 1)}`)
    .join(" · ");
  return `${title}\n${body}\n${axes}\n${t(lang, "shareCta")} ${url}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export async function shareReport(report: Bilancio, lang: Lang): Promise<"shared" | "copied" | "failed"> {
  const text = reportText(report, lang);
  const title = interpolate(t(lang, "shareTitle"), { name: report.comune.identity.name });
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url: playUrl() });
      return "shared";
    } catch {
      /* user cancelled or share failed: fall back to clipboard */
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(/\s+/);
  let line = "";
  let cursor = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursor);
      line = word;
      cursor += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursor);
    cursor += lineHeight;
  }
  return cursor;
}

export async function downloadReportCard(report: Bilancio, lang: Lang): Promise<void> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#f4ead6";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#1e2a38";
  ctx.lineWidth = 5;
  ctx.strokeRect(32, 32, width - 64, height - 64);
  ctx.strokeStyle = "#c65d3b";
  ctx.lineWidth = 2;
  ctx.strokeRect(48, 48, width - 96, height - 96);

  ctx.fillStyle = "#1e2a38";
  ctx.font = "700 26px Georgia, serif";
  ctx.fillText(t(lang, "appName"), 76, 104);
  ctx.font = "500 18px system-ui, sans-serif";
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(t(lang, "tagline"), 76, 134);

  ctx.fillStyle = "#1e2a38";
  ctx.font = "700 74px Georgia, serif";
  const name = report.comune.identity.name;
  ctx.fillText(name, 76, 238);
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(`${report.comune.identity.province} · ${report.comune.identity.region}`, 78, 276);

  ctx.fillStyle = "#1e2a38";
  ctx.font = "700 30px Georgia, serif";
  ctx.fillText(t(lang, "reportCardTitle"), 76, 344);
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(t(lang, "reportCardSubtitle"), 78, 376);

  ctx.fillStyle = "#1e2a38";
  ctx.font = "700 120px Georgia, serif";
  ctx.fillText(fmtNumber(report.total, lang, 1), 76, 520);
  ctx.font = "500 32px system-ui, sans-serif";
  ctx.fillStyle = report.totalDelta >= 0 ? "#4f7454" : "#a64b35";
  ctx.fillText(`${fmtSigned(report.totalDelta, lang, 1)} ${t(lang, "vsBaseline")}`, 78, 566);

  ctx.font = "500 16px system-ui, sans-serif";
  ctx.fillStyle = "#d9a441";
  ctx.fillRect(76, 604, 14, 10);
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(t(lang, "baseline"), 98, 614);
  ctx.fillStyle = "#1e2a38";
  ctx.fillRect(214, 604, 14, 10);
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(t(lang, "yourCity"), 236, 614);

  const barX = 76;
  const barY = 640;
  const barW = 928;
  const barH = 20;
  const step = 108;
  report.axes.forEach((axis, index) => {
    const y = barY + index * step;
    ctx.fillStyle = "#1e2a38";
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(FAMILY_LABEL[axis.key][lang], barX, y);
    ctx.fillStyle = "#e2d3b9";
    ctx.fillRect(barX, y + 14, barW, barH);
    ctx.fillStyle = "#d9a441";
    ctx.fillRect(barX, y + 14, (barW * axis.baseline) / 100, 8);
    ctx.fillStyle = "#1e2a38";
    ctx.fillRect(barX, y + 26, (barW * axis.final) / 100, 8);
    ctx.font = "700 21px system-ui, sans-serif";
    ctx.fillStyle = axis.delta >= 0 ? "#4f7454" : "#a64b35";
    ctx.fillText(fmtSigned(axis.delta, lang, 1), barX + barW - 78, y + 38);
    ctx.fillStyle = "#6a5a48";
    ctx.font = "500 16px system-ui, sans-serif";
    ctx.fillText(FAMILY_LONG[axis.key][lang], barX, y + 64);
  });

  const popY = barY + report.axes.length * step + 6;
  ctx.fillStyle = "#1e2a38";
  ctx.font = "600 24px system-ui, sans-serif";
  ctx.fillText(t(lang, "population2050"), barX, popY);
  ctx.font = "700 34px Georgia, serif";
  ctx.fillText(fmtNumber(report.population, lang), barX, popY + 42);
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillStyle = "#6a5a48";
  ctx.fillText(
    `${t(lang, "baseline2050")}: ${fmtNumber(report.baselinePopulation, lang)} · ${fmtSigned(
      report.populationDelta,
      lang
    )}`,
    barX,
    popY + 72
  );

  ctx.fillStyle = "#6a5a48";
  ctx.font = "500 16px system-ui, sans-serif";
  wrapText(ctx, t(lang, "disclaimer"), 76, 1210, 928, 19);
  ctx.font = "500 15px system-ui, sans-serif";
  wrapText(ctx, t(lang, "reportCardFoot"), 76, 1290, 928, 18);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = interpolate(t(lang, "downloadName"), { name: name.toLowerCase().replaceAll(" ", "-") });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copyReport(report: Bilancio, lang: Lang): Promise<boolean> {
  return copyText(reportText(report, lang));
}
