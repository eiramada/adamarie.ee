(() => {
  const measurementId = "G-JB9KXMQC1J";
  const storageKey = "adamarie.analytics-consent.v1";
  const lifetime = 60 * 24 * 60 * 60;
  const production = location.protocol === "https:" &&
    ["adamarie.ee", "www.adamarie.ee"].includes(location.hostname);
  const disableKey = "ga-disable-" + measurementId;
  const denied = {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  };
  window[disableKey] = true;

  document.body.insertAdjacentHTML("beforeend", `
  <section class="cookie-banner" id="cookie-banner" aria-labelledby="cookie-heading" hidden>
    <h2 id="cookie-heading">Analüütikaküpsised</h2>
    <p>Soovi korral lubad Google Analytics 4 küpsised, et saaksime veebilehe kasutust mõõta ja seda parandada. Keeldumine ei mõjuta veebilehe kasutamist. Valikut saad igal ajal muuta jaluses.</p>
    <p><a href="privaatsus.html#kupsised">Loe privaatsuse ja küpsiste kohta</a>.</p>
    <div class="cookie-actions">
      <button type="button" data-cookie-reject>Ära luba küpsised</button>
      <button type="button" data-cookie-accept>Luba küpsised</button>
    </div>
    <p class="cookie-status" data-cookie-status role="status"></p>
  </section>
  `);
  const banner = document.getElementById("cookie-banner");
  const status = banner.querySelector("[data-cookie-status]");
  const settings = [...document.querySelectorAll("[data-cookie-settings]")];
  let opener, timer, tag;
  let stopped = false;
  let unsavedDenial = false;

  function removeChoice() {
    try {
      localStorage.removeItem(storageKey);
      return localStorage.getItem(storageKey) === null;
    } catch {
      return false;
    }
  }

  function readChoice() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return null;
      const saved = JSON.parse(raw);
      if (!saved || !["granted", "denied"].includes(saved.choice) ||
          !Number.isFinite(saved.expires) || saved.expires <= Date.now()) {
        removeChoice();
        return null;
      }
      // Do not trust a previous grant if the consent store is read-only.
      if (saved.choice === "granted") localStorage.setItem(storageKey, raw);
      return saved;
    } catch {
      removeChoice();
      return null;
    }
  }

  function saveChoice(choice) {
    const value = JSON.stringify({ choice, expires: Date.now() + lifetime * 1000 });
    try {
      localStorage.setItem(storageKey, value);
      return localStorage.getItem(storageKey) === value;
    } catch {
      return false;
    }
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
        if (location.hostname !== "adamarie.ee") {
          document.cookie = expired + "; Domain=adamarie.ee";
        }
      }
    } catch {
      // The tag stays disabled even if browser cookie access fails.
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

  function stopAnalytics(reload = false) {
    window[disableKey] = true;
    if (tag) {
      window.gtag("consent", "update", denied);
      tag.remove();
      tag = null;
      stopped = true;
    }
    clearAnalyticsCookies();
    // An executed third-party script cannot reliably be unloaded.
    if (stopped && reload) location.reload();
  }

  function showBanner(choice, focus = false) {
    status.textContent = choice === "granted" ? "Praegune valik: analüütika lubatud."
      : choice === "denied" ? "Praegune valik: analüütika keelatud." : "";
    banner.hidden = false;
    if (focus) banner.querySelector("[data-cookie-reject]").focus();
  }

  function hideBanner() {
    const focusedInside = banner.contains(document.activeElement);
    banner.hidden = true;
    if (opener || focusedInside) (opener || settings[0])?.focus({ preventScroll: true });
    opener = null;
  }

  function syncChoice() {
    clearTimeout(timer);
    if (unsavedDenial) return;
    const saved = readChoice();
    if (saved) {
      // setTimeout cannot represent delays longer than about 24.8 days.
      timer = setTimeout(syncChoice, Math.min(2147483647, Math.max(0, saved.expires - Date.now())));
    }
    if (saved?.choice === "granted") loadAnalytics(saved.expires);
    else stopAnalytics(true);
    if (opener || !saved) showBanner(saved?.choice);
    else hideBanner();
  }

  banner.querySelector("[data-cookie-accept]").addEventListener("click", () => {
    if (!saveChoice("granted")) {
      status.textContent = "Valikut ei õnnestunud salvestada. Analüütika jääb keelatuks, kui nõusolekut ei saa salvestada.";
      return;
    }
    unsavedDenial = false;
    hideBanner();
    syncChoice();
  });

  banner.querySelector("[data-cookie-reject]").addEventListener("click", () => {
    clearTimeout(timer);
    stopAnalytics();
    if (saveChoice("denied")) {
      unsavedDenial = false;
      hideBanner();
      syncChoice();
      return;
    }
    // Invalidate a previous grant even when saving a denial is unavailable.
    const removed = removeChoice();
    unsavedDenial = true;
    showBanner("denied");
    status.textContent = removed
      ? "Analüütika on peatatud. Keeldumist ei õnnestunud salvestada; järgmisel külastusel küsime uuesti sinu valikut."
      : "Analüütika on sellel lehel peatatud, kuid keeldumist ei õnnestunud salvestada. Enne uuesti külastamist kustuta brauseri selle veebilehe andmed.";
  });

  for (const button of settings) {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      showBanner(unsavedDenial ? "denied" : readChoice()?.choice, true);
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
