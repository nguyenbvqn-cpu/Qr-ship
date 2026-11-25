// Thử: màn QR có thông tin đơn (hàng + ship, nội dung đơn) để đỡ nhầm
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
function mkEl(id) {
  const h = {};
  return { id, _h: h, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, options: [], max: "", scrollTop: 5,
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener(t, f) { h[t] = f }, appendChild(c) { return c }, setAttribute() {}, querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, scrollTo() {} };
}
const fmt = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
const T = fmt(new Date());
let els, store, ctx;
function boot(st) {
  els = {}; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1234" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], querySelector: () => mkEl("q"), addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    qrcode: () => ({ addData() {}, make() {}, getModuleCount: () => 21, isDark: () => false }),
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async () => {} } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

const O = (id, phone, goods, ship, note) => ({ id, day: T, phone, goods, ship, paid: false, cash: false, msgSent: false, qrShown: false, note });
boot({ ship_tab: JSON.stringify("n"), ship_orders: JSON.stringify([
  O(1, "0900000001", 100000, 20000, "Sdt: 0900000001\nShip cho e đến quán <cà phê>\n1 luộc 100k"),
  O(2, "0900000002", 230000, 25000, ""),
]) });
ok(/<div class="bank" id="ovBank"><\/div>\r?\n  <div class="info" id="ovInfo"><\/div>\r?\n  <div class="nav">/.test(html), "0. ô thông tin nằm dưới dòng ngân hàng, trên các nút");
ev("startQr(0)");
ok(!els.ov.classList.contains("hidden"), "1. mở màn QR");
ok(els.ovAmt.textContent === "120.001đ", "1. số tiền 120.001đ");
ok(els.ovInfo.innerHTML === "<b>Hàng 100k + ship 20k</b>\nShip cho e đến quán &lt;cà phê&gt;\n1 luộc 100k", "1. thông tin đơn: hàng + ship, nội dung (bỏ dòng Sdt, chữ được thoát an toàn): " + JSON.stringify(els.ovInfo.innerHTML));
ok(els.ovInfo.scrollTop === 0, "1. ô thông tin cuộn về đầu");
els.ovNext.onclick();
ok(els.ovIdx.textContent.startsWith("Đơn 2/2") && els.ovInfo.innerHTML === "<b>Hàng 230k + ship 25k</b>", "2. sang đơn 2: thông tin đổi theo, đơn không ghi chú chỉ có hàng + ship");
els.ovPrev.onclick();
ok(els.ovInfo.innerHTML.includes("1 luộc 100k"), "3. quay lại đơn 1: thông tin đơn 1");
console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
