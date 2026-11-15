(() => {
  "use strict";

  const STORAGE_KEY = "bing-daily-language";
  const PUBLIC_URL = "https://morecats.github.io/wallpaper-daily/";
  const languages = {
    en: {
      language: "en", locale: "en-US", name: "Wallpaper Daily", market: "en-US",
      timeZone: "America/Los_Angeles", dateField: "start_date", archive: "US-en",
      titles: ["A Picture.", "A Story.", "A Landscape.", "Discover More."],
      seoTitle: "Wallpaper Daily — Daily Bing Wallpapers & Photo Widgets",
      description: "Discover a new Bing wallpaper every day with Wallpaper Daily for iPhone and iPad. Explore nature photography and photo widgets. Download on the App Store.",
      keywords: "Wallpaper Daily,Bing wallpaper,daily wallpaper,iPhone wallpaper,iPad wallpaper,photo widgets,nature photography,今日美图,今日美圖",
      badge: "en-us", download: "Download Wallpaper Daily on the App Store",
      languageLabel: "Language", photoFallback: "Bing daily wallpaper"
    },
    "zh-Hans": {
      language: "zh-Hans", locale: "zh-CN", name: "今日美图", market: "zh-CN",
      timeZone: "Asia/Shanghai", dateField: "end_date", archive: "CN-zh",
      titles: ["一张图片。", "一个故事。", "一处风景。", "发现精彩世界。"],
      seoTitle: "今日美图 Wallpaper Daily — 每日必应壁纸与照片小组件",
      description: "今日美图为 iPhone 和 iPad 带来每日必应壁纸与照片小组件，欣赏自然风光与摄影作品。在 App Store 下载 Wallpaper Daily，发现精彩世界。",
      keywords: "今日美图,Wallpaper Daily,必应壁纸,每日壁纸,iPhone 壁纸,iPad 壁纸,照片小组件,自然风光,摄影",
      badge: "zh-cn", download: "在 App Store 下载今日美图",
      languageLabel: "语言", photoFallback: "Bing 每日图片"
    },
    "zh-Hant": {
      language: "zh-Hant", locale: "zh-TW", name: "今日美圖", market: "zh-CN",
      timeZone: "Asia/Taipei", dateField: "end_date", archive: "CN-zh",
      titles: ["一張圖片。", "一個故事。", "一處風景。", "發現精彩世界。"],
      seoTitle: "今日美圖 Wallpaper Daily — 每日必應桌布與照片小工具",
      description: "今日美圖為 iPhone 和 iPad 帶來每日必應桌布與照片小工具，欣賞自然風景與攝影作品。在 App Store 下載 Wallpaper Daily，發現精彩世界。",
      keywords: "今日美圖,Wallpaper Daily,必應桌布,每日桌布,iPhone 桌布,iPad 桌布,照片小工具,自然風景,攝影",
      badge: "zh-tw", download: "在 App Store 下載今日美圖",
      languageLabel: "語言", photoFallback: "Bing 每日圖片"
    }
  };
  let active;
  let converterPromise;
  const languageSwitcher = document.querySelector(".lang-switch");
  const languageButtons = [...languageSwitcher.querySelectorAll("button")];

  function updateSearchMetadata() {
    const url = new URL(PUBLIC_URL);
    url.searchParams.set("lang", active.language);
    document.title = active.seoTitle;
    const values = {
      'meta[name="description"]': active.description,
      'meta[name="keywords"]': active.keywords,
      'meta[property="og:title"]': active.seoTitle,
      'meta[property="og:description"]': active.description,
      'meta[property="og:url"]': url.href,
      'meta[property="og:locale"]': active.locale.replace("-", "_"),
      'meta[name="twitter:title"]': active.seoTitle,
      'meta[name="twitter:description"]': active.description
    };
    for (const [selector, value] of Object.entries(values)) document.querySelector(selector).content = value;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = url.href;
    const schema = document.getElementById("app-structured-data");
    const data = JSON.parse(schema.textContent);
    Object.assign(data, { name: active.name, description: active.description, url: url.href, inLanguage: active.language });
    schema.textContent = JSON.stringify(data);
  }

  function updateSlider(animate = false) {
    const button = languageButtons.find(item => item.dataset.lang === active.language);
    if (!button) return;
    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = button;
    languageSwitcher.dataset.sliderAnimate = String(animate && languageSwitcher.dataset.sliderReady === "true");
    languageSwitcher.style.setProperty("--slider-x", `${offsetLeft}px`);
    languageSwitcher.style.setProperty("--slider-y", `${offsetTop}px`);
    languageSwitcher.style.setProperty("--slider-width", `${offsetWidth}px`);
    languageSwitcher.style.setProperty("--slider-height", `${offsetHeight}px`);
    languageSwitcher.dataset.sliderReady = "true";
  }

  function supportedLanguage(value) {
    if (typeof value !== "string") return null;
    const language = value.toLowerCase();
    if (/^zh(?:-|$)/.test(language)) {
      if (/(?:^|-)hans(?:-|$)/.test(language)) return "zh-Hans";
      return /(?:hant|tw|hk|mo)(?:-|$)/.test(language) ? "zh-Hant" : "zh-Hans";
    }
    return /^en(?:-|$)/.test(language) ? "en" : null;
  }

  function initialLanguage() {
    const parameter = new URLSearchParams(location.search).get("lang");
    if (Object.hasOwn(languages, parameter)) return parameter;
    try {
      const saved = supportedLanguage(localStorage.getItem(STORAGE_KEY));
      if (saved) return saved;
    } catch { /* Storage may be unavailable in private or local-file previews. */ }
    for (const language of navigator.languages || [navigator.language]) {
      const supported = supportedLanguage(language);
      if (supported) return supported;
    }
    return "en";
  }

  function traditionalConverter() {
    if (!converterPromise) converterPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "./assets/vendor/opencc-cn2t-1.4.2.js";
      script.onload = () => {
        try {
          resolve(window.OpenCC.Converter({ from: "cn", to: "tw" }));
        } catch (error) {
          converterPromise = null;
          reject(error);
        }
      };
      script.onerror = () => {
        converterPromise = null;
        script.remove();
        reject(new Error("The Traditional Chinese converter could not load"));
      };
      document.head.append(script);
    });
    return converterPromise;
  }

  function applyLanguage(language, animateSlider = false) {
    active = languages[language];
    document.documentElement.lang = active.language;
    updateSearchMetadata();
    document.getElementById("app-name").textContent = active.name;
    const tagline = document.querySelector(".app-tagline");
    tagline.lang = active.language;
    tagline.querySelectorAll("span").forEach((line, index) => { line.textContent = active.titles[index]; });
    const store = document.querySelector(".app-store-link");
    store.setAttribute("aria-label", active.download);
    const badge = store.querySelector("img");
    badge.src = `./assets/app-store-${active.badge}.svg`;
    badge.alt = active.download;
    document.getElementById("language-label").textContent = active.languageLabel;
    languageButtons.forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.lang === active.language));
    });
    updateSlider(animateSlider);
    try {
      const url = new URL(location.href);
      url.searchParams.set("lang", active.language);
      history.replaceState(null, "", url);
    } catch { /* Some local-file previews cannot rewrite the URL. */ }
  }

  window.BingDailyLocale = {
    current: () => active,
    async caption(text, language) {
      return language === "zh-Hant" ? (await traditionalConverter())(text) : text;
    }
  };

  languageButtons.forEach(button => {
    button.addEventListener("click", () => {
      const language = button.dataset.lang;
      if (!Object.hasOwn(languages, language) || language === active.language) return;
      applyLanguage(language, true);
      try { localStorage.setItem(STORAGE_KEY, language); } catch { /* Keep the current session usable. */ }
      window.dispatchEvent(new Event("bingdaily:languagechange"));
    });
  });
  applyLanguage(initialLanguage());
  document.fonts?.ready.then(() => updateSlider());
  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => updateSlider());
    observer.observe(languageSwitcher);
    languageButtons.forEach(button => observer.observe(button));
  } else {
    window.addEventListener("resize", () => updateSlider());
  }
})();
