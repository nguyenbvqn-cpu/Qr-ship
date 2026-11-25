// Thử: đầu ngày tự lấy số tờ cuối ngày của ngày gần nhất trước đó
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
function mkEl(id) {
  const h = {};
  return { id, _h: h, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, options: [], max: "",
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener(t, f) { h[t] = f }, appendChild(c) { return c }, setAttribute() {}, querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, scrollTo() {} };
}
const fmt = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
const ago = n => { const x = new Date(); x.setDate(x.getDate() - n); return fmt(x) };
const T = ago(0), Y = ago(1), Y2 = ago(2), Y3 = ago(3);
const M = (day, cs, ce) => ({ day, cs, ce, debt: "", buy: "", wq: "", ws: "" });
let els, store, ctx;
function boot(st) {
  els = {}; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async () => {} } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
const typeCs = (d, v) => els.denBody._h.input({ target: { dataset: { den: "cs:" + d }, value: v } });
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

// 1. Hôm qua đếm cuối ngày 500k×2, 100k×3; hôm nay mở 💰 -> đầu ngày tự có
boot({ ship_hist: JSON.stringify({ [Y]: { orders: [], money: M(Y, { 500: "1" }, { 500: "2", 100: "3" }) } }) });
els.btnMoney.onclick();
ok(ev("JSON.stringify(money.cs)") === JSON.stringify({ 500: "2", 100: "3" }) && ev("money.csFrom") === Y, "1. đầu ngày hôm nay = cuối ngày hôm qua (500k×2, 100k×3)");
ok(ev("calcMoney().v.start") === 1300000, "1. tổng đầu ngày 1.300k");
ok(/tự lấy từ cuối ngày/.test(els.csHint.textContent), "1. có dòng ghi chú: " + els.csHint.textContent);
ok(JSON.parse(store.ship_money).csFrom === Y, "1. đã lưu (đồng bộ được)");

// 2. Sửa lại cuối ngày hôm qua (mở ngày hôm qua) -> hôm nay mở 💰 cập nhật theo
ev("openDay(" + JSON.stringify(Y) + ")");
els.btnMoney.onclick();
els.denBody._h.input({ target: { dataset: { den: "ce:500" }, value: "4" } });
ev("openDay(null)");
els.btnMoney.onclick();
ok(ev("money.cs[500]") === "4", "2. sửa cuối ngày hôm qua thành 500k×4 -> đầu ngày hôm nay theo: " + ev("money.cs[500]"));

// 3. Tự sửa đầu ngày hôm nay -> giữ số tự sửa, không bị ghi đè
typeCs(500, "1");
ok(ev("money.csManual") === true && ev("money.csFrom") === undefined, "3. sửa tay -> thôi lấy tự động");
els.btnMoney.onclick();
ok(ev("money.cs[500]") === "1" && els.csHint.textContent === "", "3. mở lại 💰: vẫn là số tự sửa (500k×1), không còn ghi chú");

// 4. Bảng đầu ngày đã nhập tay từ trước (bản cũ, không có cờ) -> không bị ghi đè
boot({ ship_hist: JSON.stringify({ [Y]: { orders: [], money: M(Y, {}, { 500: "2" }) } }), ship_money: JSON.stringify(M(T, { 200: "5" }, {})) });
els.btnMoney.onclick();
ok(ev("JSON.stringify(money.cs)") === JSON.stringify({ 200: "5" }), "4. đầu ngày đã nhập từ trước giữ nguyên");

// 5. Hôm qua quên đếm cuối ngày -> lấy ngày gần nhất có đếm (hôm kia)
boot({ ship_hist: JSON.stringify({ [Y3]: { orders: [], money: M(Y3, {}, { 10: "9" }) }, [Y2]: { orders: [], money: M(Y2, {}, { 50: "7" }) }, [Y]: { orders: [], money: M(Y, { 20: "1" }, {}) } }) });
els.btnMoney.onclick();
ok(ev("JSON.stringify(money.cs)") === JSON.stringify({ 50: "7" }) && ev("money.csFrom") === Y2, "5. lấy cuối ngày hôm kia (50k×7)");

// 6. Mở ngày hôm kia để sửa -> đầu ngày lấy từ ngày trước nó, không lấy ngày sau
ev("openDay(" + JSON.stringify(Y2) + ")");
els.btnMoney.onclick();
ok(ev("money.day") === Y2 && ev("JSON.stringify(money.ce)") === JSON.stringify({ 50: "7" }), "6. mở hôm kia: thấy cuối ngày 50k×7 của nó");
ok(ev("JSON.stringify(money.cs)") === JSON.stringify({ 10: "9" }) && ev("money.csFrom") === Y3, "6. đầu ngày hôm kia = cuối ngày 3 hôm trước (10k×9)");
ev("openDay(null)");

// 7. Chưa từng đếm cuối ngày -> đầu ngày để trống
boot({});
els.btnMoney.onclick();
ok(ev("JSON.stringify(money.cs)") === "{}" && els.csHint.textContent === "", "7. không có ngày trước -> để trống");

console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
