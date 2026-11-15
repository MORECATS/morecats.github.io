(() => {
  "use strict";

  let wallpaper = document.getElementById("wallpaper");
  const credit = document.getElementById("photo-credit");
  const defaultWallpaper = JSON.parse(document.getElementById("default-wallpaper-metadata").textContent);
  const wallpaperLayers = new Set([wallpaper]);
  const wallpaperAnimations = new Map();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let backgroundGeneration = 0;
  let pendingWallpaper = null;
  let current = null;
  let loadedKey = null;
  let activeKey = null;
  let activeController = null;
  let generation = 0;
  let lastAttempt = 0;
  let isLoading = false;

  function finishWallpaperTransition(target) {
    if (target !== wallpaper) return;
    target.style.opacity = "1";
    for (const animation of wallpaperAnimations.values()) animation.cancel();
    wallpaperAnimations.clear();
    for (const layer of wallpaperLayers) {
      if (layer === target) continue;
      layer.remove();
      wallpaperLayers.delete(layer);
    }
  }

  function setWallpaper(url, caption, preparedImage) {
    const source = new URL(url, document.baseURI).href;
    if (pendingWallpaper?.source === source) {
      pendingWallpaper.image.alt = caption;
      return;
    }
    const request = ++backgroundGeneration;
    pendingWallpaper?.image.removeAttribute("src");
    pendingWallpaper = null;
    if (wallpaper.src === source) {
      wallpaper.alt = caption;
      return;
    }
    const image = preparedImage || new Image();
    if (image.src !== source) image.src = source;
    image.alt = caption;
    pendingWallpaper = { image, source };
    const ready = preparedImage ? Promise.resolve() : image.decode();
    ready.then(() => {
      if (request !== backgroundGeneration) return;
      pendingWallpaper = null;
      // Preserve the visible blend when another switch arrives during a fade.
      for (const [layer, animation] of wallpaperAnimations) {
        layer.style.opacity = getComputedStyle(layer).opacity;
        animation.cancel();
      }
      wallpaperAnimations.clear();
      image.className = "wallpaper is-ready";
      image.style.opacity = "0";
      wallpaper.removeAttribute("id");
      wallpaper.setAttribute("aria-hidden", "true");
      image.id = "wallpaper";
      wallpaper.after(image);
      wallpaperLayers.add(image);
      wallpaper = image;
      if (reducedMotion.matches || typeof image.animate !== "function") {
        finishWallpaperTransition(image);
        return;
      }
      const animation = image.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 600, easing: "ease-in-out", fill: "forwards"
      });
      wallpaperAnimations.set(image, animation);
      animation.onfinish = () => finishWallpaperTransition(image);
    }).catch(() => {
      if (request !== backgroundGeneration) return;
      pendingWallpaper = null;
      if (image === wallpaper) finishWallpaperTransition(image);
    });
  }

  reducedMotion.addEventListener("change", event => {
    if (event.matches) finishWallpaperTransition(wallpaper);
  });

  function dateKey(timeZone, date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function archiveDate(value) {
    const digits = String(value ?? "").replaceAll("-", "");
    if (!/^\d{8}$/.test(digits)) return null;
    const date = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : null;
  }

  function httpsURL(value) {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value, "https://www.bing.com");
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  async function fetchJSON(url, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) controller.abort();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        mode: "cors", credentials: "omit", cache: "no-store", signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
    }
  }

  function preloadImage(url, signal) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let finished = false;
      const timeout = setTimeout(() => finish(new Error("Image timed out")), 45000);
      const abort = () => finish(new Error("Image load cancelled"));
      function finish(error) {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        signal.removeEventListener("abort", abort);
        image.onload = image.onerror = null;
        if (error) {
          image.removeAttribute("src");
          reject(error);
        } else resolve(image);
      }
      image.onload = () => {
        if (!image.naturalWidth) finish(new Error("Empty image"));
        else image.decode().then(() => finish(), error => finish(error));
      };
      image.onerror = () => finish(new Error("Image could not load"));
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      else image.src = url;
    });
  }

  async function display(record, today, locale, request, signal) {
    if (!record.url || !record.date) throw new Error("Invalid wallpaper");
    const [caption, image] = await Promise.all([
      window.BingDailyLocale.caption(record.copyright || locale.photoFallback, locale.language),
      wallpaper.src === record.url ? Promise.resolve() : preloadImage(record.url, signal)
    ]);
    if (request !== generation || signal.aborted) return;
    render(record, caption, today, locale, image);
    loadedKey = `${locale.language}:${today}`;
    try {
      localStorage.setItem(cacheKey(locale), JSON.stringify(record));
    } catch { /* Local file previews and private browsing may disable storage. */ }
  }

  function render(record, caption, today, locale, image) {
    setWallpaper(record.url, caption, image);
    const date = document.getElementById("photo-date");
    date.dateTime = record.date;
    const [, month, day] = record.date.split("-").map(Number);
    date.textContent = record.date.slice(0, 7) === today.slice(0, 7) ? String(day) : `${month}/${day}`;
    date.dataset.wide = String(date.textContent.includes("/"));
    date.title = new Intl.DateTimeFormat(locale.locale, {
      year: "numeric", month: "long", day: "numeric", timeZone: "UTC"
    }).format(new Date(`${record.date}T12:00:00Z`));
    date.setAttribute("aria-label", date.title);
    const copyright = document.getElementById("photo-copyright");
    copyright.textContent = caption;
    copyright.title = caption;
    copyright.href = httpsURL(record.link) || "https://www.bing.com/";
    credit.hidden = false;
    document.documentElement.dataset.wallpaperDate = record.date;
    current = { record, language: locale.language };
  }

  function showDefault(today, locale) {
    const caption = defaultWallpaper.captions[locale.language];
    render({
      date: defaultWallpaper.date,
      url: defaultWallpaper.url,
      copyright: caption,
      link: defaultWallpaper.links[locale.language],
      isDefault: true
    }, caption, today, locale);
  }

  function cacheKey(locale) {
    // Simplified and Traditional Chinese share source metadata, not converted captions.
    return `bing-daily-wallpaper:${locale.market}:v2`;
  }

  async function todayWallpaper(today, locale, signal) {
    const url = `https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=${locale.market}`;
    const data = await fetchJSON(url, signal);
    // The US display day is start_date; China starts on UTC's prior day, so uses end_date.
    const record = {
      date: archiveDate(data[locale.dateField]),
      url: httpsURL(data.url),
      copyright: typeof data.copyright === "string" ? data.copyright : "",
      link: data.copyright_link || "https://www.bing.com/"
    };
    if (!record.url || !record.date || record.date > today) throw new Error("Invalid daily response");
    return record;
  }

  async function latestArchivedWallpaper(today, locale, signal) {
    const [year, month] = today.split("-").map(Number);
    for (let offset = 0; offset < 2; offset++) {
      const date = new Date(Date.UTC(year, month - 1 - offset, 1));
      const key = `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      try {
        const records = await fetchJSON(`https://bing.npanuhin.me/${locale.archive}.${key}.min.json`, signal);
        if (!Array.isArray(records)) throw new Error("Invalid archive response");
        const photo = records.filter(item => item && archiveDate(item.date) === item.date && item.date <= today && httpsURL(item.url))
          .sort((a, b) => b.date.localeCompare(a.date))[0];
        if (photo) return {
          date: photo.date, url: httpsURL(photo.url),
          copyright: [photo.title, photo.copyright].filter(Boolean).join(" · "),
          link: "https://www.bing.com/"
        };
      } catch (error) {
        if (signal.aborted) throw error;
        // Try the preceding month when the new month has not been archived.
      }
    }
    throw new Error("No archived wallpaper available");
  }

  async function loadWallpaper(force = false) {
    const locale = window.BingDailyLocale.current();
    const today = dateKey(locale.timeZone);
    const key = `${locale.language}:${today}`;
    if (isLoading && activeKey === key && !force) return;
    if (!force && activeKey === key && loadedKey === key &&
        ((current?.record.date === today && !current.record.isDefault) || Date.now() - lastAttempt < 15 * 60 * 1000)) return;
    const request = ++generation;
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    activeKey = key;
    const signal = controller.signal;
    isLoading = true;
    lastAttempt = Date.now();
    if (!current || current.language !== locale.language) {
      showDefault(today, locale);
    }
    try {
      if (!force) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey(locale)));
          if (cached?.date === today && typeof cached.copyright === "string" && httpsURL(cached.url)) {
            await display({ ...cached, url: httpsURL(cached.url) }, today, locale, request, signal);
            return;
          }
        } catch { /* An invalid or unavailable cache falls through to the API. */ }
      }
      try {
        await display(await todayWallpaper(today, locale, signal), today, locale, request, signal);
      } catch {
        if (signal.aborted || request !== generation) return;
        await display(await latestArchivedWallpaper(today, locale, signal), today, locale, request, signal);
      }
    } catch {
      if (signal.aborted || request !== generation) return;
      // Keep the local default (or last successful photo) and retry silently later.
      loadedKey = key;
    } finally {
      if (request === generation) isLoading = false;
    }
  }

  window.addEventListener("bingdaily:languagechange", () => loadWallpaper());
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadWallpaper();
  });
  setInterval(() => { if (!document.hidden) loadWallpaper(); }, 60000);
  loadWallpaper();
})();
