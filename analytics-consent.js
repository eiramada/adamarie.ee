(() => {
  const measurementId = "G-JB9KXMQC1J";
  const storageKey = "adamarie.analytics-consent.v1";
  const denialCookie = "adamarie_analytics_denied";
  const lifetime = 60 * 24 * 60 * 60;
  const production = location.protocol === "https:" &&
    ["adamarie.ee", "www.adamarie.ee"].includes(location.hostname);
  const banner = document.getElementById("cookie-banner");
  if (!banner) return;

  const accept = banner.querySelector("[data-cookie-accept]");
  const reject = banner.querySelector("[data-cookie-reject]");
  const status = banner.querySelector("[data-cookie-status]");
  const disableKey = "ga-disable-" + measurementId;
  const denied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };
  let tag = null;
  let stopped = false;
  let blocked = false;
  let opener = null;
  let timer;
  window[disableKey] = true;

  function hasDenialCookie() {
    return document.cookie.split(";").some(cookie =>
      cookie.trim().startsWith(denialCookie + "="));
  }

  function setDenialCookie(maxAge) {
    document.cookie = denialCookie + "=1; Max-Age=" + maxAge +
      "; Path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  }

  function readChoice() {
    try {
      if (hasDenialCookie()) return { choice: "denied" };
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && ["granted", "denied"].includes(saved.choice) &&
          Number.isFinite(saved.expires) && saved.expires > Date.now()) return saved;
    } catch {
      // No usable storage: never assume consent.
    }
    return null;
  }

  function saveChoice(choice) {
    const value = JSON.stringify({ choice, expires: Date.now() + lifetime * 1000 });
    try {
      localStorage.setItem(storageKey, value);
      if (localStorage.getItem(storageKey) === value) {
        if (choice === "granted") {
          setDenialCookie(0);
          return !hasDenialCookie();
        }
        return true;
      }
    } catch {
      // If writing fails, try to invalidate any earlier grant below.
    }
    if (choice === "denied") {
      try { localStorage.removeItem(storageKey); } catch { /* use fallback */ }
      try {
        setDenialCookie(lifetime);
        if (hasDenialCookie()) return true;
      } catch { /* report failure to the visitor below */ }
    }
    return false;
  }

  function clearAnalyticsCookies() {
    if (!production) return;
    try {
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0].trim();
        if (name !== "_ga" && !name.startsWith("_ga_")) continue;
        const expired = name + "=; Max-Age=0; Path=/; SameSite=Lax";
        document.cookie = expired;
        document.cookie = expired + "; Domain=" + location.hostname;
        document.cookie = expired + "; Domain=adamarie.ee";
      }
    } catch {
      // A blocked cookie API cannot prevent us from disabling the tag.
    }
  }

  function safeReferrer() {
    try {
      const url = new URL(document.referrer);
      return ["http:", "https:"].includes(url.protocol) ? url.origin : "";
    } catch {
      return "";
    }
  }

  function loadAnalytics(expires) {
    clearTimeout(timer);
    // Ordinary cross-tab changes use storage events. Poll while consent is
    // granted to detect fallback-cookie changes and consent expiry.
    timer = setTimeout(syncChoice, Math.max(0, Math.min(5000, expires - Date.now())));
    if (!production || tag) return;
    if (stopped) {
      location.reload();
      return;
    }
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", denied);
    window.gtag("consent", "update", { ...denied, analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: Math.min(lifetime, Math.max(1, Math.floor((expires - Date.now()) / 1000))),
      cookie_update: false,
      cookie_flags: "SameSite=Lax;Secure",
      page_location: location.origin + location.pathname,
      page_referrer: safeReferrer()
    });
    tag = document.createElement("script");
    tag.async = true;
    tag.referrerPolicy = "no-referrer";
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
  }

  function stopAnalytics(reload) {
    clearTimeout(timer);
    window[disableKey] = true;
    if (tag) {
      window.gtag("consent", "update", denied);
      tag.remove();
      tag = null;
      stopped = true;
    }
    clearAnalyticsCookies();
    // An executed third-party script cannot reliably be unloaded.
    // Never reload into a readable earlier grant if withdrawal failed.
    if (stopped && reload) location.reload();
  }

  function showBanner(focus = false) {
    const choice = blocked ? "denied" : readChoice()?.choice;
    status.textContent = choice === "granted" ? "Praegune valik: analüütika lubatud."
      : choice === "denied" ? "Praegune valik: analüütika keelatud." : "";
    banner.hidden = false;
    if (focus) reject.focus();
  }

  function hideBanner() {
    const focusedInside = banner.contains(document.activeElement);
    banner.hidden = true;
    if (opener) opener.focus();
    else if (focusedInside) document.querySelector("[data-cookie-settings]")?.focus();
    opener = null;
  }

  function choose(choice) {
    if (choice === "denied") {
      const saved = saveChoice("denied");
      blocked = !saved;
      stopAnalytics(saved && readChoice()?.choice !== "granted");
      if (saved) hideBanner();
      else {
        showBanner();
        status.textContent = "Analüütika on sellel lehel peatatud, kuid keeldumist ei õnnestunud salvestada. Enne uuesti külastamist kustuta brauseri selle veebilehe andmed või luba valiku salvestamine.";
      }
      return;
    }
    if (!saveChoice("granted")) {
      status.textContent = "Valikut ei õnnestunud salvestada. Analüütika lubamiseks peab brauser võimaldama nõusoleku salvestamist.";
      return;
    }
    blocked = false;
    hideBanner();
    syncChoice();
  }

  function syncChoice() {
    if (blocked) return;
    const saved = readChoice();
    if (saved?.choice === "granted") {
      if (!opener) hideBanner();
      loadAnalytics(saved.expires);
    } else {
      stopAnalytics(true);
      if (saved?.choice === "denied") {
        if (!opener) hideBanner();
      } else showBanner();
    }
  }

  accept.addEventListener("click", () => choose("granted"));
  reject.addEventListener("click", () => choose("denied"));
  for (const button of document.querySelectorAll("[data-cookie-settings]")) {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      showBanner(true);
    });
  }
  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) syncChoice();
  });
  window.addEventListener("pageshow", syncChoice);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncChoice();
  });
  syncChoice();
})();
