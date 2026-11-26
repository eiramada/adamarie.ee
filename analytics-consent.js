(() => {
  // Set the real GA4 web stream Measurement ID before deployment.
  const measurementId = "";
  const storageKey = "adamarie.analytics-consent.v1";
  const lifetime = 180 * 24 * 60 * 60;
  const configured = /^G-[A-Z0-9]{6,}$/.test(measurementId);
  const production = ["adamarie.ee", "www.adamarie.ee"].includes(location.hostname);
  const banner = document.getElementById("cookie-banner");
  const settings = [...document.querySelectorAll("[data-cookie-settings]")];
  if (!banner || !configured || !production) return;

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
  let loaded = false;
  let opener = null;
  window[disableKey] = true;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && ["granted", "denied"].includes(saved.choice) &&
          Number.isFinite(saved.expires) && saved.expires > Date.now()) {
        return saved.choice;
      }
    } catch {
      // No usable storage: never assume consent.
    }
    return null;
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        choice, expires: Date.now() + lifetime * 1000
      }));
      return readChoice() === choice;
    } catch {
      return false;
    }
  }

  function clearAnalyticsCookies() {
    for (const cookie of document.cookie.split(";")) {
      const name = cookie.split("=")[0].trim();
      if (name !== "_ga" && !name.startsWith("_ga_")) continue;
      const expired = name + "=; Max-Age=0; Path=/; SameSite=Lax";
      document.cookie = expired;
      document.cookie = expired + "; Domain=" + location.hostname;
      document.cookie = expired + "; Domain=adamarie.ee";
    }
  }

  function loadAnalytics() {
    if (loaded || readChoice() !== "granted") return;
    loaded = true;
    window[disableKey] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", denied);
    window.gtag("consent", "update", { ...denied, analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: lifetime,
      cookie_update: false,
      page_location: location.origin + location.pathname
    });
    const tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
  }

  function stopAnalytics() {
    window[disableKey] = true;
    clearAnalyticsCookies();
    // An already loaded third-party script cannot be reliably unloaded.
    // Reload with the saved denial rather than sending a consent ping.
    if (loaded) location.reload();
  }

  function showBanner(focus = false) {
    const choice = readChoice();
    status.textContent = choice === "granted" ? "Praegune valik: analüütika lubatud."
      : choice === "denied" ? "Praegune valik: analüütika keelatud." : "";
    banner.hidden = false;
    if (focus) reject.focus();
  }

  function hideBanner() {
    banner.hidden = true;
    if (opener) opener.focus();
    opener = null;
  }

  function choose(choice) {
    if (!saveChoice(choice)) {
      if (choice === "denied") {
        try { localStorage.removeItem(storageKey); } catch { /* storage blocked */ }
        window[disableKey] = true;
        clearAnalyticsCookies();
        if (loaded && readChoice() !== "granted") location.reload();
      }
      status.textContent = "Valikut ei õnnestunud salvestada. Analüütikat ei lubata ilma salvestatud nõusolekuta.";
      return;
    }
    hideBanner();
    if (choice === "granted") loadAnalytics();
    else stopAnalytics();
  }

  accept.addEventListener("click", () => choose("granted"));
  reject.addEventListener("click", () => choose("denied"));
  for (const button of settings) {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      showBanner(true);
    });
  }

  function syncChoice() {
    const choice = readChoice();
    if (choice === "granted") {
      hideBanner();
      loadAnalytics();
    } else {
      stopAnalytics();
      if (choice === "denied") hideBanner();
      else showBanner();
    }
  }

  window.addEventListener("storage", event => {
    if (event.key === storageKey || event.key === null) syncChoice();
  });
  window.addEventListener("pageshow", event => {
    if (event.persisted) syncChoice();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && loaded && readChoice() !== "granted") stopAnalytics();
  });
  syncChoice();
})();
