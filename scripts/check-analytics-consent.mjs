import { readFileSync } from "node:fs";

function check(condition, message) {
  if (!condition) throw new Error(message);
}
function simulate(source, options = {}, URLClass = URL) {
  let now = 1700000000000;
  let stored = options.choice ? JSON.stringify({ choice: options.choice,
    expires: now + (options.expired ? -1 : 60000) }) : null;
  const cookies = new Map(options.cookies || []);
  const scripts = [], commands = [], listeners = {};
  let pending, reloads = 0, removed = 0;
  const node = () => ({ hidden: true, textContent: "", events: {},
    addEventListener(type, fn) { this.events[type] = fn; }, focus() {} });
  const accept = node(), reject = node(), status = node(), settings = node(), banner = node();
  banner.querySelector = key => ({
    "[data-cookie-accept]": accept, "[data-cookie-reject]": reject,
    "[data-cookie-status]": status })[key];
  banner.contains = () => false;
  const document = {
    getElementById: () => banner, querySelectorAll: () => [settings],
    querySelector: () => settings, activeElement: null,
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
    addEventListener() {}
  };
  const localStorage = {
    getItem() { if (options.blockRead) throw Error("blocked"); return stored; },
    setItem(k, v) { if (options.blockWrite) throw Error("blocked"); stored = v; },
    removeItem() { if (options.blockRemove) throw Error("blocked"); stored = null; }
  };
  const location = { protocol: options.preview ? "http:" : "https:",
    hostname: options.preview ? "localhost" : "adamarie.ee",
    origin: options.preview ? "http://localhost" : "https://adamarie.ee",
    pathname: "/privaatsus.html", reload() { reloads++; } };
  const window = { dataLayer: { push(args) { commands.push([...args]); } },
    addEventListener(type, fn) { listeners[type] = fn; } };
  const clock = class extends Date { static now() { return now; } };
  new Function("window","document","localStorage","location","Date","setTimeout","clearTimeout","URL",source)(
    window,document,localStorage,location,clock,
    fn => { pending = fn; return 1; }, () => { pending = null; },URLClass);
  return {
    accept: () => accept.events.click(), reject: () => reject.events.click(),
    settings: () => settings.events.click(),
    advance: ms => { now += ms; pending?.(); },
    externalDenial: () => { stored = JSON.stringify({choice:"denied",expires:now+60000}); listeners.storage({key:"adamarie.analytics-consent.v1"}); },
    state: () => ({scripts,commands,reloads,removed,cookies,stored,hidden:banner.hidden,
      status:status.textContent,disabled:window["ga-disable-G-JB9KXMQC1J"]})
  };
}
function runTests(source, URLClass = URL) {
  let count = 0;
  const sim = options => simulate(source, options, URLClass);
  const test = (name, fn) => { fn(); count++; };
  test("fresh visit",()=>{const s=sim().state();check(!s.hidden&&s.disabled&&!s.scripts.length&&!s.commands.length,"fresh");});
  test("reject",()=>{const a=sim();a.reject();const s=a.state();check(s.hidden&&s.disabled&&!s.scripts.length&&JSON.parse(s.stored).choice==="denied","reject");});
  test("accept",()=>{const a=sim();a.accept();const s=a.state();const c=s.commands.find(x=>x[0]==="config"),u=s.commands.find(x=>x[1]==="update");
    check(s.hidden&&!s.disabled&&s.scripts.length===1&&c[1]==="G-JB9KXMQC1J"&&c[2].page_referrer==="https://example.org"&&c[2].page_location==="https://adamarie.ee/privaatsus.html"&&c[2].cookie_update===false&&c[2].allow_google_signals===false&&c[2].allow_ad_personalization_signals===false&&u[2].analytics_storage==="granted"&&u[2].ad_storage==="denied"&&u[2].ad_user_data==="denied"&&u[2].ad_personalization==="denied","config");
    a.settings();a.accept();check(a.state().hidden&&a.state().scripts.length===1,"reaccept");
  });
  test("saved denial",()=>{const s=sim({choice:"denied"}).state();check(s.hidden&&s.disabled&&!s.scripts.length,"saved denial");});
  test("saved grant",()=>{const s=sim({choice:"granted"}).state();check(s.hidden&&!s.disabled&&s.scripts.length===1,"saved grant");});
  test("withdrawal",()=>{const a=sim({choice:"granted",cookies:[["_ga","a"],["_ga_X","b"]]});a.settings();a.reject();const s=a.state();check(s.disabled&&s.removed===1&&s.reloads===1&&!s.cookies.has("_ga")&&!s.cookies.has("_ga_X")&&s.commands.at(-1)[2].analytics_storage==="denied"&&JSON.parse(s.stored).choice==="denied","withdraw");});
  test("fallback denial",()=>{const a=sim({choice:"granted",blockWrite:true,blockRemove:true});a.settings();a.reject();const s=a.state();check(s.disabled&&s.reloads===1&&s.cookies.has("adamarie_analytics_denied"),"fallback");check(sim({choice:"granted",cookies:[["adamarie_analytics_denied","1"]]}).state().scripts.length===0,"fallback reload");});
  test("all storage writes blocked",()=>{const a=sim({choice:"granted",blockWrite:true,blockRemove:true,blockCookies:true});a.settings();a.reject();const s=a.state();check(s.disabled&&!s.hidden&&!s.reloads&&s.status.includes("ei õnnestunud"),"total failure");});
  test("failed grant",()=>{const a=sim({blockWrite:true});a.accept();check(a.state().disabled&&!a.state().scripts.length&&!a.state().hidden,"failed grant");});
  test("expired on load",()=>{const s=sim({choice:"granted",expired:true}).state();check(!s.hidden&&s.disabled&&!s.scripts.length,"expired");});
  test("expired while open",()=>{const a=sim({choice:"granted"});a.advance(60001);check(a.state().disabled&&a.state().reloads===1,"expiry");});
  test("cross-tab denial",()=>{const a=sim({choice:"granted"});a.externalDenial();check(a.state().disabled&&a.state().reloads===1,"cross-tab");});
  test("local preview",()=>{const a=sim({preview:true});a.accept();check(!a.state().scripts.length&&a.state().disabled&&a.state().hidden,"preview");});
  return count;
}

const source = readFileSync(new URL("../analytics-consent.js", import.meta.url), "utf8");
console.log("Analytics consent checks passed: " + runTests(source));
