// Thử: ô nợ / mua đồ / rút tiền: dấu phẩy là cộng như ô cộng/trừ
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
function mkEl(id) { const h = {}; return { id, _h: h, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, options: [], max: "",
  classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) }, toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
  addEventListener(t, f) { h[t] = f }, appendChild(c) { return c }, setAttribute() {}, querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, scrollTo() {} } }
const fmt = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
const T = fmt(new Date());
let els = {}, store = { "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }), ship_orders: "[]" };
const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
const ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} }, console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async () => {} } }, location: { origin: "x", pathname: "/", hash: "" }, URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
const ev = s => vm.runInContext(s, ctx);
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const P = s => ev("parseSigned(" + JSON.stringify(s) + ")");
[["165,645", 810000], ["300,150", 450000], ["20,30,50", 100000], ["300k+150k", 450000], ["500k", 500000], ["1tr2", 1200000], ["1.200.000", 1200000],
 ["1,200,000", 1200000], ["500,000", 500000], ["1,500,000+200k", 1700000], ["165,645,000", 165645000], ["1,5tr", 1500000], ["", 0], ["0", 0], ["165, 645", 810000], ["200,000,50", 250000]]
  .forEach(([s, v]) => ok(P(s) === v, "\"" + s + "\" = " + P(s)));
els.btnMoney.onclick();
const type = (id, v) => { els[id].value = v; els[id]._h.input({ target: els[id] }) };
type("mDebt", "165,645"); type("mBuy", "300,150"); type("mWq", "100,50"); type("mWs", "20,30");
const c = ev("calcMoney()");
ok(c.v.debt === 810000 && c.v.buy === 450000 && c.v.wq === 150000 && c.v.ws === 50000, "ô nợ 810k, mua đồ 450k, rút QR 150k, rút SMS 50k");
ok(c.net === 450000 - 810000 - 150000 - 50000, "được hưởng tính theo: " + c.net);
console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
