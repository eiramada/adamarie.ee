import { readFileSync } from "node:fs";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function simulate(source, options = {}, URLClass = URL) {
  let now = 1700000000000;
  let stored = options.raw ?? (options.choice ? JSON.stringify({
    choice: options.choice, expires: now + (options.expired ? -1 : 60000)
  }) : null);
  const cookies = new Map(options.cookies || []);
  const scripts = [], commands = [], listeners = {}, documentListeners = {};
  let pending, delay, reloads = 0, removed = 0, markup = "";
  const focusCalls = [];
  const node = () => ({ hidden: true, textContent: "", events: {},
    addEventListener(type, fn) { this.events[type] = fn; }, focus(options) { focusCalls.push(options); } });
  const accept = node(), reject = node(), status = node(), settings = node(), banner = node();
  banner.querySelector = key => ({
    "[data-cookie-accept]": accept, "[data-cookie-reject]": reject,
    "[data-cookie-status]": status
  })[key];
  banner.contains = element => element === accept || element === reject;
  const document = {
    body: { insertAdjacentHTML(position, html) { markup += html; } },
    getElementById: () => banner, querySelectorAll: () => [settings],
    activeElement: null, hidden: false,
    referrer: "https://example.org/private?email=example@example.org",
    get cookie() { return [...cookies].map(([k,v]) => k + "=" + v).join("; "); },
    set cookie(value) {
      if (options.blockCookies) return;
      const [pair, ...attrs] = value.split(";");
      const [name, val] = pair.split("=");
      if (attrs.some(a => a.trim() === "Max-Age=0")) cookies.delete(name);
      else cookies.set(name, val);
    },
    head: { appendChild(s) { scripts.push(s); } },
    createElement: () => ({ remove() { removed++; } }),
    addEventListener(type, fn) { documentListeners[type] = fn; }
  };
  const localStorage = {
    getItem() { if (options.blockRead) throw Error("blocked"); return stored; },
    setItem(k,v) { if (options.blockWrite) throw Error("blocked"); stored = v; },
    removeItem() { if (options.blockRemove) throw Error("blocked"); stored = null; }
  };
  const location = {
    protocol: options.preview ? "http:" : "https:",
    hostname: options.preview ? "localhost" : "adamarie.ee",
    origin: options.preview ? "http://localhost" : "https://adamarie.ee",
    pathname: "/privaatsus.html", reload() { reloads++; }
  };
  const window = { dataLayer: { push(args) { commands.push([...args]); } },
    addEventListener(type, fn) { listeners[type] = fn; } };
  const clock = class extends Date { static now() { return now; } };
  new Function("window","document","localStorage","location","Date","setTimeout","clearTimeout","URL",source)(
    window,document,localStorage,location,clock,
    (fn, ms) => { pending = fn; delay = ms; return 1; },
    () => { pending = null; delay = undefined; }, URLClass);
  return {
    accept: () => { document.activeElement = accept; accept.events.click(); },
    reject: () => { document.activeElement = reject; reject.events.click(); },
    settings: () => settings.events.click(),
    advance: ms => { now += ms; pending?.(); },
    revisit: () => listeners.pageshow(),
    externalDenial: () => {
      stored = JSON.stringify({choice:"denied",expires:now+60000});
      listeners.storage({key:"adamarie.analytics-consent.v1"});
    },
    blockWrites: (remove = false) => { options.blockWrite = true; options.blockRemove = remove; },
    state: () => ({ scripts,commands,reloads,removed,cookies,stored,delay,markup,focusCalls,
      hidden:banner.hidden,status:status.textContent,disabled:window["ga-disable-G-JB9KXMQC1J"] })
  };
}

function runTests(source, URLClass = URL) {
  let count = 0;
  const sim = options => simulate(source, options, URLClass);
  const test = (name, fn) => { try { fn(); count++; } catch (e) { throw Error(name + ": " + e.message); } };
  test("fresh visit", () => {
    const s = sim().state();
    check(!s.hidden && s.disabled && !s.scripts.length && !s.commands.length, "Google tag blocked");
    check(s.markup.includes('id="cookie-banner"') && s.markup.includes("privaatsus.html#kupsised"), "shared banner");
  });
  test("cookie labels", () => {
    const { markup } = sim().state();
    check(markup.includes("data-cookie-accept>Luba küpsised</button>") &&
      markup.includes("data-cookie-reject>Ära luba küpsised</button>"), "requested labels");
  });
  test("close banner without scrolling", () => {
    for (const action of ["accept", "reject"]) {
      const a = sim(); a[action]();
      check(a.state().focusCalls.at(-1)?.preventScroll === true, action + " preserves scroll");
      const b = sim(); b.settings(); b[action]();
      check(b.state().focusCalls.at(-1)?.preventScroll === true, action + " from settings preserves scroll");
    }
  });
  test("reject", () => {
    const a = sim(); a.reject(); const s = a.state();
    check(s.hidden && s.disabled && !s.scripts.length && JSON.parse(s.stored).choice === "denied", "persist denial");
  });
  test("accept", () => {
    const a = sim(); a.accept(); const s = a.state();
    const c = s.commands.find(x => x[0] === "config"), u = s.commands.find(x => x[1] === "update");
    check(s.hidden && !s.disabled && s.scripts.length === 1 && c[1] === "G-JB9KXMQC1J", "load only after grant");
    check(c[2].page_referrer === "https://example.org" && c[2].page_location === "https://adamarie.ee/privaatsus.html" &&
      c[2].cookie_update === false && c[2].allow_google_signals === false &&
      c[2].allow_ad_personalization_signals === false && u[2].analytics_storage === "granted" &&
      u[2].ad_storage === "denied" && u[2].ad_user_data === "denied" && u[2].ad_personalization === "denied", "minimal config");
    check(s.delay === 2147483647, "long delay is capped at timer limit");
    a.settings(); a.accept(); check(a.state().hidden && a.state().scripts.length === 1, "no duplicate tag");
  });
  test("saved denial", () => {
    const s = sim({choice:"denied"}).state();
    check(s.hidden && s.disabled && !s.scripts.length, "saved rejection");
  });
  test("saved grant", () => {
    const s = sim({choice:"granted"}).state();
    check(s.hidden && !s.disabled && s.scripts.length === 1 && s.delay === 60000, "grant and one expiry timer");
  });
  test("withdrawal", () => {
    const a = sim({choice:"granted",cookies:[["_ga","a"],["_ga_X","b"],["unrelated","c"]]});
    a.settings(); a.reject(); const s = a.state();
    check(s.disabled && s.removed === 1 && s.reloads === 1 && !s.cookies.has("_ga") &&
      !s.cookies.has("_ga_X") && s.cookies.has("unrelated") && s.commands.at(-1)[2].analytics_storage === "denied" &&
      JSON.parse(s.stored).choice === "denied", "stop and persist");
  });
  test("failed denial write removes old grant", () => {
    const a = sim({choice:"granted"}); a.blockWrites(); a.settings(); a.reject(); const s = a.state();
    check(s.disabled && s.stored === null && !s.hidden && s.status.includes("ei õnnestunud"), "clear grant and warn");
    check(sim({raw:s.stored}).state().scripts.length === 0, "no grant on return");
  });
  test("all writes blocked", () => {
    const a = sim({choice:"granted"}); a.blockWrites(true); a.settings(); a.reject(); a.revisit(); const s = a.state();
    check(s.disabled && s.removed === 1 && !s.reloads && !s.hidden && s.status.includes("kustuta"), "stop and warn without reloading");
    const b = sim({raw:s.stored,blockWrite:true,blockRemove:true}).state();
    check(b.disabled && !b.scripts.length, "read-only old grant rejected on reload");
  });
  test("failed grant", () => {
    const a = sim({blockWrite:true}); a.accept(); const s = a.state();
    check(s.disabled && !s.scripts.length && !s.hidden, "never grant without storage");
  });
  test("unreadable storage", () => {
    const s = sim({choice:"granted",blockRead:true,blockRemove:true}).state();
    check(s.disabled && !s.scripts.length && !s.hidden, "fail closed");
  });
  test("expired grant removed on load", () => {
    const s = sim({choice:"granted",expired:true}).state();
    check(s.stored === null && !s.hidden && s.disabled && !s.scripts.length, "remove expired state");
  });
  test("expired denial removed", () => {
    const s = sim({choice:"denied",expired:true}).state();
    check(s.stored === null && !s.hidden && s.disabled, "ask again");
  });
  test("invalid record removed", () => {
    const s = sim({raw:"not JSON"}).state();
    check(s.stored === null && s.disabled && !s.scripts.length, "invalid state");
  });
  test("expiry while open", () => {
    const a = sim({choice:"granted"}); a.advance(60001); const s = a.state();
    check(s.disabled && s.reloads === 1 && s.stored === null, "expire and stop");
  });
  test("cross-tab denial", () => {
    const a = sim({choice:"granted"}); a.externalDenial(); const s = a.state();
    check(s.disabled && s.reloads === 1, "honor external denial");
  });
  test("local preview", () => {
    const a = sim({preview:true}); a.accept(); const s = a.state();
    check(!s.scripts.length && s.disabled && s.hidden, "no Google request");
  });
  return count;
}

const source = readFileSync(new URL("../analytics-consent.js", import.meta.url), "utf8");
console.log("Analytics consent checks passed: " + runTests(source));
