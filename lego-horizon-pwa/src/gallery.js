/* Fullscreen concept-art gallery: open at a specific image, swipe, arrows. */

export function initGallery({ dialog, track, counter, openers, prev, next }) {
  if (!dialog || !track || !counter) return () => {};
  const figures = [...track.querySelectorAll("figure")];
  const total = figures.length;
  let index = 0;
  let opener = null;

  const paint = () => {
    counter.textContent = `${index + 1} / ${total}`;
    if (prev) prev.disabled = index === 0;
    if (next) next.disabled = index === total - 1;
  };

  const goTo = (i, smooth = true) => {
    index = Math.max(0, Math.min(total - 1, i));
    track.scrollTo({
      left: figures[index].offsetLeft - track.offsetLeft,
      behavior: smooth ? "smooth" : "auto",
    });
    paint();
  };

  const openAt = (i) => {
    opener = document.activeElement;
    dialog.showModal();
    document.body.classList.add("no-scroll");
    goTo(i, false);
    (next || prev || dialog).focus?.();
  };

  openers.forEach((btn) => {
    btn.addEventListener("click", () => openAt(Number(btn.dataset.galleryIndex || 0)));
  });

  prev?.addEventListener("click", () => goTo(index - 1));
  next?.addEventListener("click", () => goTo(index + 1));

  let ticking = false;
  track.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const center = track.scrollLeft + track.clientWidth / 2;
      let closest = 0;
      let best = Infinity;
      figures.forEach((fig, i) => {
        const figCenter = fig.offsetLeft - track.offsetLeft + fig.clientWidth / 2;
        const d = Math.abs(figCenter - center);
        if (d < best) { best = d; closest = i; }
      });
      if (closest !== index) { index = closest; paint(); }
      ticking = false;
    });
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") { event.preventDefault(); goTo(index + 1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); goTo(index - 1); }
  });

  const close = () => {
    if (dialog.open) dialog.close();
  };
  dialog.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", close));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("close", () => {
    document.body.classList.remove("no-scroll");
    opener?.focus?.();
  });

  paint();
  return { openAt, goTo };
}
