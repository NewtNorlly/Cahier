const entryKey = "cahier-paper-entry";
const easing = "cubic-bezier(.22,.7,.22,1)";
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let busy = false;

interface PaperEntry { path: string; time: number; cover: string; }

function centeredRect() {
  const height = Math.min(innerHeight * .68, 560, (innerWidth - 64) * 297 / 210);
  const width = height * 210 / 297;
  return { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
}

function position(element: HTMLElement, rect: { left: number; top: number; width: number; height: number }) {
  Object.assign(element.style, {
    left: rect.left + "px", top: rect.top + "px", width: rect.width + "px", height: rect.height + "px",
  });
}

function createFlight(entry: PaperEntry) {
  const layer = document.createElement("div");
  layer.className = "paper-flight";
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;
  const backdrop = document.createElement("div");
  backdrop.className = "paper-flight__backdrop";
  const stack = document.createElement("div");
  stack.className = "paper-stack paper-flight__stack";
  const leaves = document.createElement("span");
  leaves.className = "paper-stack__leaves";
  for (let i = 1; i <= 12; i++) {
    const leaf = document.createElement("span");
    leaf.className = "paper-stack__leaf";
    leaf.style.setProperty("--leaf", String(i));
    leaves.append(leaf);
  }
  const cover = document.createElement("span");
  cover.className = "book-card__cover";
  const image = document.createElement("img");
  image.src = entry.cover;
  image.alt = "";
  cover.append(image);
  stack.append(leaves, cover);
  layer.append(backdrop, stack);
  document.body.append(layer);
  return { layer, backdrop, stack, cover, leaves };
}

// Close-packed paper edges loosen slightly while the stack is being lifted.
function liftLeaves(leaves: HTMLElement, animate: boolean, scale = 1) {
  return [...leaves.children].map((leaf, index) => {
    const n = index + 1;
    const frames = [
      { transform: `translate(${n * .3}px,${n * .45}px)` },
      { transform: `translate(${n * 1.1 / scale}px,${n * 1.5 / scale}px) rotate(${n * .025}deg)` },
    ];
    return leaf.animate(frames, { duration: animate ? 760 : 0, easing, fill: "forwards" });
  });
}

function resetOpening() {
  document.querySelectorAll(".paper-flight").forEach(node => node.remove());
  document.querySelectorAll(".is-paper-lifted").forEach(node => node.classList.remove("is-paper-lifted"));
  document.documentElement.classList.remove("paper-entry-pending");
  document.body.style.overflow = "";
  busy = false;
}
window.addEventListener("pageshow", event => { if (event.persisted) resetOpening(); });

document.querySelectorAll<HTMLAnchorElement>("#panel-literature .book-card").forEach(link => {
  link.addEventListener("click", async event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        link.target === "_blank" || reducedMotion()) return;
    if (busy) { event.preventDefault(); return; }
    const source = link.querySelector<HTMLElement>(".paper-stack");
    const image = source?.querySelector("img");
    if (!source || !image || typeof source.animate !== "function") return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin) return;
    event.preventDefault();
    busy = true;
    const entry: PaperEntry = {
      path: destination.pathname, time: Date.now(),
      cover: link.dataset.openingCover || image.currentSrc || image.src,
    };
    try { sessionStorage.setItem(entryKey, JSON.stringify(entry)); }
    catch { location.assign(link.href); return; }
    const original = source.getBoundingClientRect();
    const { layer, backdrop, stack, leaves } = createFlight(entry);
    position(stack, original);
    // Transfer the visible object in the same frame: never show two copies of the cover.
    link.classList.add("is-paper-lifted");
    document.body.style.overflow = "hidden";
    const target = centeredRect();
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.href = link.href;
    document.head.append(prefetch);
    const watchdog = window.setTimeout(() => { resetOpening(); location.assign(link.href); }, 4000);
    const dx = target.left - original.left, dy = target.top - original.top;
    const scale = target.width / original.width;
    liftLeaves(leaves, true, scale);
    try {
      await Promise.all([
        backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, fill: "forwards" }).finished,
        stack.animate([
          { transform: "translate(0,0) scale(1) rotate(0deg)" },
          { transform: `translate(${dx * .74}px,${dy * .74 - 16}px) scale(${1 + (scale - 1) * .78}) rotate(-1.2deg)`, offset: .55 },
          { transform: `translate(${dx}px,${dy}px) scale(${scale}) rotate(-.45deg)` },
        ], { duration: 820, easing, fill: "forwards" }).finished,
      ]);
      location.assign(link.href);
    } catch {
      layer.remove();
      location.assign(link.href);
    } finally { clearTimeout(watchdog); }
  });
});

// A temporary visual copy lets the existing reader keep its pagination and editing DOM.
function paperSurface(paper: HTMLElement, rect: DOMRect) {
  const sheet = document.createElement("div");
  sheet.className = "paper-flight__sheet";
  position(sheet, rect);
  const copy = paper.cloneNode(true) as HTMLElement;
  copy.removeAttribute("id");
  copy.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  copy.querySelectorAll("[contenteditable]").forEach(node => node.removeAttribute("contenteditable"));
  copy.style.cssText = `position:absolute;top:0;left:0;margin:0;width:${paper.offsetWidth}px;height:${paper.offsetHeight}px;max-width:none;zoom:1;opacity:1;display:flex;transition:none;transform-origin:top left;`;
  copy.style.setProperty("transform", `scale(${rect.width / paper.offsetWidth})`, "important");
  sheet.append(copy);
  return sheet;
}

async function enterDocument() {
  let entry: PaperEntry | null = null;
  try {
    entry = JSON.parse(sessionStorage.getItem(entryKey) || "null");
    sessionStorage.removeItem(entryKey);
  } catch { resetOpening(); return; }
  if (!entry || entry.path !== location.pathname || Date.now() - entry.time > 12000 ||
      !document.body.classList.contains("literature-reader") || reducedMotion()) {
    resetOpening(); return;
  }
  const firstPaper = document.querySelector<HTMLElement>(".folio__paper--main");
  if (!firstPaper) { resetOpening(); return; }
  const { layer, stack, backdrop, leaves } = createFlight(entry);
  const start = centeredRect();
  position(stack, start);
  stack.style.transform = "rotate(-.45deg)";
  liftLeaves(leaves, false);
  document.body.style.overflow = "hidden";
  const animations: Animation[] = [];
  const sheets: HTMLElement[] = [];
  try {
    await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 800))]);
    window.scrollTo({ top: firstPaper.getBoundingClientRect().top + scrollY - 110, behavior: "instant" });
    await new Promise(requestAnimationFrame);
    const papers = [...document.querySelectorAll<HTMLElement>(".doc-canvas .folio__paper")]
      .filter(paper => {
        const rect = paper.getBoundingClientRect();
        return rect.width > 0 && rect.top < innerHeight * 2 && rect.bottom > 0 &&
          (paper.classList.contains("folio__paper--main") || document.documentElement.classList.contains("is-notes-open"));
      });
    for (const [index, paper] of papers.entries()) {
      const rect = paper.getBoundingClientRect();
      const notes = paper.classList.contains("folio__paper--notes");
      const sheet = paperSurface(paper, rect);
      layer.insertBefore(sheet, stack);
      sheets.push(sheet);
      const dx = notes ? innerWidth + 40 - rect.left : start.left - rect.left + index * 2;
      const dy = start.top - rect.top + index * 4;
      const sx = start.width / rect.width;
      const sy = start.height / rect.height;
      animations.push(sheet.animate([
        { transform: `translate(${dx}px,${dy}px) scale(${sx},${sy}) rotate(${notes ? .6 : -.45}deg)`, opacity: notes ? 0 : 1 },
        { opacity: 1, offset: .25 },
        { transform: "none", opacity: 1 },
      ], { duration: 950, delay: notes ? 180 + index * 40 : index * 55, easing, fill: "both" }));
      const ink = sheet.querySelector<HTMLElement>(".folio__col");
      if (ink) animations.push(ink.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 500, delay: 180 + index * 45, fill: "both",
      }));
    }
    // The top sheet slips upward as the loose original pages unfold beneath it.
    animations.push(stack.animate([
      { transform: "rotate(-.45deg)", opacity: 1 },
      { transform: "translate(-12px,-100px) rotate(-2deg)", opacity: 0 },
    ], { duration: 570, easing, fill: "forwards" }));
    await Promise.all(animations.map(animation => animation.finished));
    document.documentElement.classList.remove("paper-entry-pending");
    document.getElementById("siteHeader")?.classList.remove("is-hidden");
    const reveal = [backdrop, ...sheets].map(element => element.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180, fill: "forwards",
    }));
    animations.push(...reveal);
    await Promise.all(reveal.map(animation => animation.finished));
    firstPaper.tabIndex = -1;
    firstPaper.focus({ preventScroll: true });
  } finally {
    animations.forEach(animation => animation.cancel());
    resetOpening();
    // Restoring scrolling can dispatch a delayed scroll event on narrow screens.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      window.dispatchEvent(new Event("cahier:paper-opened"));
    }));
  }
}
void enterDocument().catch(resetOpening);
