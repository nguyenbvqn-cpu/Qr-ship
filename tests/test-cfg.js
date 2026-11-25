// Thử: máy mới đăng nhập -> không bật ⚙ nếu tài khoản có sẵn trên Supabase
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
const TOKEN = "sb-tkjfswyytbvitvlehnxp-auth-token";

function mkEl(id, opts) {
  const kids = [];
  return {
    id, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, children: kids, options: [],
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { kids.push(c); if (c && (c.onload || c.onerror)) setTimeout(() => (opts && opts.libFails ? c.onerror() : c.onload()), 0); return c },
    setAttribute() {}, getAttribute() { return null }, querySelector() { return mkEl("q") }, querySelectorAll() { return [] },
    closest() { return null }, focus() {}, click() {}, scrollTo() {},
  };
}
let els, doc, store, ctx;
function boot(opts) {
  els = {}; store = Object.assign({}, opts.store || {});
  doc = { getElementById: id => els[id] || (els[id] = (() => { const e = mkEl(id); if (id === "cfg") e.classList.add("hidden"); return e })()),
    createElement: t => mkEl("new-" + t, opts), querySelectorAll: () => [], addEventListener() {}, head: mkEl("head", opts), body: mkEl("body"),
    documentElement: mkEl("html") };
  const remote = opts.remote || [];
  const sb = { auth: {
      getSession: async () => ({ data: { session: opts.session || null }, error: null }), onAuthStateChange() {}, signInWithOAuth: async () => ({}) },
    from: () => ({
      select: c => { const q = Promise.resolve({ data: remote.map(r => ({ k: r.k, m: r.m })), error: null }); q.in = async () => ({ data: remote, error: null }); return q },
      upsert: async () => ({ error: null }) }) };
  ctx = {
    document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: {} },
    location: { origin: "https://x", pathname: "/Qr-ship/", hash: "" }, URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number,
    scrollTo() {}, addEventListener() {}, history: {},
  };
  ctx.window = Object.assign(opts.libFails ? {} : { supabase: { createClient: () => sb } }, ctx);
  vm.createContext(ctx); vm.runInContext(code, ctx, { filename: "app.js" });
}
const cfgOpen = () => !doc.getElementById("cfg").classList.contains("hidden");
const tick = () => new Promise(r => setTimeout(r, 30));
let fail = 0;
const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const S = { user: { id: "u1", email: "a@gmail.com" } };
const REMOTE_CFG = [{ k: "cfg", m: 1, v: { cfgQ: { bankIdx: 13, account: "5678" }, cfgB: { bankIdx: 0, account: "99", holder: "N" }, catalog: null } }];

(async () => {
  boot({ store: { [TOKEN]: "{}" }, session: S, remote: REMOTE_CFG });
  ok(!cfgOpen(), "1. máy mới đã đăng nhập: lúc mở chưa bật ⚙ (đợi đồng bộ)");
  await tick(); await tick();
  ok(!cfgOpen() && els.accQ.value === "5678", "1. đồng bộ mang tài khoản về -> vào thẳng trang chính, ⚙ đã có số TK");

  boot({ store: { [TOKEN]: "{}" }, session: S, remote: [] });
  await tick(); await tick();
  ok(cfgOpen(), "2. trên mạng cũng chưa có tài khoản -> mở ⚙ để nhập");

  boot({ store: { [TOKEN]: "{}", ship_cfgQ: JSON.stringify({ bankIdx: 13, account: "5678" }) }, session: S, remote: [] });
  await tick(); await tick();
  ok(!cfgOpen(), "3. máy đã có tài khoản -> không mở ⚙");

  boot({ store: {}, remote: REMOTE_CFG });
  await tick(); await tick();
  ok(!cfgOpen() && doc.documentElement.classList.contains("locked"), "4. chưa đăng nhập -> khóa, không mở ⚙");

  boot({ store: { [TOKEN]: "{}" }, libFails: true });
  await tick(); await tick();
  ok(cfgOpen(), "5. mất mạng + chưa có tài khoản -> mở ⚙");

  // 6. Tự mở ⚙ (trên mạng chưa có), người dùng tự đóng -> lần đồng bộ sau không mở lại
  boot({ store: { [TOKEN]: "{}" }, session: S, remote: [] });
  await tick(); await tick();
  els.btnCfg.onclick(); ok(!cfgOpen(), "6. người dùng đóng ⚙");
  await vm.runInContext("syncNow()", ctx); await tick();
  ok(!cfgOpen(), "6. đồng bộ lần sau không tự mở lại");

  console.log(fail ? fail + " lỗi" : "Tất cả OK");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("LỖI:", e); process.exit(1) });
