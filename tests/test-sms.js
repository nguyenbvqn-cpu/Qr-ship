// Thử thứ tự tab SMS: nhắn sau lên trên, chưa ck đứng trên đã ck; tab khác giữ nguyên
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
function mkEl(id) {
  return { id, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, options: [],
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener() {}, appendChild(c) { return c }, setAttribute() {}, querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, scrollTo() {} };
}
const els = {}, d = new Date(), T = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const O = (id, msgAt, paid, extra) => Object.assign({ id, day: T, phone: "09000000" + id, goods: 50000, ship: 20000, msgSent: true, msgAt, paid, note: "n" + id }, extra || {});
const store = {
  "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }), ship_tab: JSON.stringify("m"),
  ship_orders: JSON.stringify([
    O(11, 1000, true), O(12, 3000, false), O(13, 2000, true), O(14, 5000, false), O(15, 4000, true), O(16, 0, true), O(17, 0, true),
    { id: 21, day: T, phone: "0911", goods: 1, ship: 0, note: "a" }, { id: 22, day: T, phone: "0922", goods: 1, ship: 0, note: "b" },
  ]),
};
const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
const ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
  console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: {} }, location: { origin: "x", pathname: "/", hash: "" },
  URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
const ev = s => vm.runInContext(s, ctx);
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

const ids = () => ev("tabIdx().map(k=>orders[k].id).join(',')");
ok(ev("tab") === "m", "đang ở tab SMS");
ok(ids() === "14,12,15,13,11,17,16", "SMS: chưa ck 14(5000) 12(3000) rồi đã ck 15,13,11, cuối là đơn cũ không có giờ (17 sau 16): " + ids());
ok(!/data-a="up"/.test(els.list.innerHTML), "SMS: không còn nút ▲▼ (xếp tự động theo giờ)");
ok(/n14[\s\S]*n12[\s\S]*n15[\s\S]*n13[\s\S]*n11/.test(els.list.innerHTML), "SMS: danh sách vẽ đúng thứ tự");
// nhắn lại đơn 11 -> lên đầu nhóm đã ck
ev("orders.find(o=>o.id===11).msgAt=9000");
ok(ids().startsWith("14,12,11,"), "nhắn lại đơn 11 -> lên đầu nhóm đã ck: " + ids());
ev("setTab('n')");
ok(ids() === "21,22" && /data-a="up"/.test(els.list.innerHTML), "tab Mới: giữ thứ tự cũ, vẫn có ▲▼");
console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
