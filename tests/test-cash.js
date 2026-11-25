// Thử: "Tiền mặt đang có" = đầu ngày − tiền hàng mọi đơn + thu tiền mặt (+ rút − mua đồ + nợ)
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
const T = fmt(new Date());
let els, store, ctx, clip = "";
function boot(st) {
  els = {}; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], querySelector: () => mkEl("q"), addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async t => { clip = t } } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
const type = (id, v) => { els[id].value = v; els[id]._h.input({ target: els[id] }) };
const den = (k, v) => els.denBody._h.input({ target: { dataset: { den: k }, value: v } });
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

// Ví dụ của người dùng: đầu ngày 2.000k, 10 đơn mỗi đơn hàng 100k (đã trả 1.000k), 2 đơn tiền mặt mỗi đơn 120k
const O = (id, kind, paid) => ({ id, day: T, phone: "09000000" + String(id).padStart(2, "0"), goods: 100000, ship: 20000, paid, cash: kind === "tm", msgSent: kind === "sms", note: "" });
const os = [O(1, "tm", true), O(2, "tm", true), O(3, "qr", true), O(4, "qr", true), O(5, "qr", true), O(6, "sms", true), O(7, "sms", false), O(8, "qr", false), O(9, "qr", false), O(10, "qr", false)];
boot({ ship_orders: JSON.stringify(os) });
els.btnMoney.onclick();
den("cs:500", "4");
const c = ev("cashNow()");
ok(c.start === 2000000 && c.goods === 1000000 && c.gn === 10 && c.tm.v === 240000, "0. đầu ngày 2.000k, tiền hàng 10 đơn 1.000k, thu TM 2 đơn 240k");
ok(c.now === 1240000, "1. tiền mặt đang có = 2.000k − 1.000k + 240k = 1.240k (" + c.now + ")");
let s = els.sumBody.innerHTML;
ok(s.includes("💵 Tiền mặt đang có") && s.includes("<td>1.240k</td>"), "1. đầu bảng 💰 có dòng Tiền mặt đang có 1.240k");
ok(s.includes("đầu ngày 2.000k − tiền hàng 10 đơn 1.000k + thu tiền mặt 2 đơn 240k"), "1. dòng nhỏ giải thích cách tính");
ok(s.indexOf("Tiền mặt đang có") < s.indexOf("QR ("), "1. nằm trên cùng, trước QR/SMS");
ok(s.includes("Thu tiền mặt (2 đơn)</td><td>240k") && !/>Tiền mặt \(/.test(s), "1. dòng cũ đổi tên thành 'Thu tiền mặt (2 đơn) 240k'");
ok(s.includes("Tổng đã thu (6 đơn)"), "1. Tổng đã thu vẫn như cũ");
ok(!s.includes("Đếm cuối ngày"), "1. chưa đếm cuối ngày thì không có dòng chênh");

// 2. mua đồ, rút, nợ
type("mBuy", "50k"); s = els.sumBody.innerHTML;
ok(s.includes("<td>1.190k</td>") && s.includes("−50k mua đồ"), "2. mua đồ 50k: còn 1.190k (cập nhật ngay khi gõ)");
type("mWs", "300k"); s = els.sumBody.innerHTML;
ok(s.includes("<td>1.490k</td>") && s.includes("+300k rút"), "2. rút TK SMS 300k ra tiền mặt: 1.490k");
type("mDebt", "20k"); s = els.sumBody.innerHTML;
ok(s.includes("<td>1.510k</td>") && s.includes("+20k nợ"), "2. nợ 20k: 1.510k");

// 3. đếm cuối ngày -> chênh
den("ce:500", "3"); den("ce:20", "1");
s = els.sumBody.innerHTML;
ok(s.includes("Đếm cuối ngày") && s.includes("<td>1.520k</td>") && s.includes("chênh +10k"), "3. đếm cuối ngày 1.520k: chênh +10k");
// Được hưởng khớp: cuối ngày đúng bằng tiền mặt đang có -> được hưởng = đã thu (gồm SMS chưa ck) − tiền hàng mọi đơn
type("mBuy", ""); type("mWs", ""); type("mDebt", "");
den("ce:500", "2"); den("ce:200", "1"); den("ce:20", "2");  // 1.240k
const m = ev("calcMoney()"), c3 = ev("cashNow()");
ok(c3.end === c3.now && m.net === 240000 + 360003 + 120000 + 120000 - 1000000, "3. đếm đúng 1.240k: chênh 0 (3 đơn QR chưa thu nên âm; +3đ lẻ QR), Được hưởng = thu − tiền hàng (" + m.net + ")");

(async () => {
  await els.sumCopy.onclick();
  ok(clip.split("\n")[1] === "TIỀN MẶT ĐANG CÓ: 1.240k (đầu ngày 2.000k − tiền hàng 10 đơn 1.000k + thu tiền mặt 2 đơn 240k)", "4. sao chép tổng có dòng tiền mặt đang có:\n" + clip);
  ok(clip.includes("Đếm cuối ngày: 1.240k (khớp)") && els.sumBody.innerHTML.includes("khớp so với tiền mặt đang có"), "4. đếm khớp thì ghi (khớp)");
  ok(clip.includes("Thu tiền mặt (2 đơn): 240k"), "4. dòng thu tiền mặt");
  // 5. chưa đếm đầu ngày: vẫn tính, số âm hiện dấu −
  boot({ ship_orders: JSON.stringify(os) });
  els.btnMoney.onclick();
  ok(els.sumBody.innerHTML.includes("<td>−760k</td>") && els.sumBody.innerHTML.includes("đầu ngày 0"), "5. chưa nhập đầu ngày: −760k, ghi rõ đầu ngày 0");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
