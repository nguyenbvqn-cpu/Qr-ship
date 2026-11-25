// Thử: 📅 cột "Thực nhận" = "Được hưởng" ở 💰 (đếm tiền), khác tiền ship theo đơn (khách bo thêm)
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
const T = ago(0), Y = ago(1), Y2 = ago(2), dm = d => (+d.slice(8)) + "/" + (+d.slice(5, 7));
const sameMonth = Y2.slice(0, 7) === T.slice(0, 7);
const O = (id, day, goods, ship, paid, kind) => ({ id, day, phone: "09000000" + id, goods, ship, paid, cash: kind === "tm", msgSent: kind === "sms", note: "" });
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
const tapDay = d => els.histBody._h.click({ target: { closest: s => s === "[data-day]" ? { dataset: { day: d } } : null } });
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const M = o => Object.assign({ cs: {}, ce: {}, debt: "", buy: "", wq: "", ws: "", adjQ: "", adjS: "" }, o);

// Hôm kia: ship 30k, đếm tiền: đầu 500k (tự nhập), cuối 750k, nợ 200k -> thực nhận 50k (khách bo 20k)
// Hôm qua: đầu ngày chưa nhập -> lấy cuối hôm kia 750k; cuối 700k, mua đồ 10k; QR 120.001 + SMS đã ck 75k + chưa ck 75k
//          -> (700−750) + 10 + 120.001 + 150 = 230.001đ (hiện 230k); ship 60k
// Hôm nay: chưa đếm tiền
const hist = {
  [Y2]: { orders: [O(5, Y2, 200000, 30000, true, "tm")], money: M({ day: Y2, cs: { 500: "1" }, csManual: true, ce: { 500: "1", 100: "2", 50: "1" }, debt: "200k" }) },
  [Y]: { orders: [O(1, Y, 100000, 20000, true, "qr"), O(2, Y, 55000, 20000, true, "sms"), O(3, Y, 55000, 20000, false, "sms")], money: M({ day: Y, ce: { 500: "1", 200: "1" }, buy: "10k" }) },
};
boot({ ship_hist: JSON.stringify(hist), ship_orders: JSON.stringify([O(6, T, 75000, 20000, true, "qr")]) });

(async () => {
  ok(ev("dayNet(dayData()," + JSON.stringify(Y2) + ")") === 50000, "0. hôm kia: thực nhận 50k");
  ok(ev("dayNet(dayData()," + JSON.stringify(Y) + ")") === 230001, "0. hôm qua: đầu ngày lấy cuối hôm kia -> 230.001");
  ok(ev("dayNet(dayData()," + JSON.stringify(T) + ")") === null, "0. hôm nay chưa đếm -> null");

  els.btnHist.onclick();
  const b = els.histBody.innerHTML;
  ok(b.includes("<th>Ngày</th><th>Đơn</th><th>Ship</th><th>Thực nhận</th>"), "1. bảng có cột Ship và Thực nhận");
  ok(b.includes('<td class="sp">30k</td><td class="net">50k</td>'), "1. hôm kia: ship 30k, thực nhận 50k");
  ok(b.includes('<td class="sp">60k</td><td class="net">230k</td>'), "1. hôm qua: ship 60k, thực nhận 230k");
  ok(b.includes('<td class="sp">20k</td><td class="net"><span class="nc">chưa đếm</span></td>'), "1. hôm nay: chưa đếm");
  if (sameMonth) {
    ok(b.includes("Tiền ship theo đơn</td><td>110k"), "1. tổng ship theo đơn 110k");
    ok(b.includes('Thực nhận (đếm tiền)<div class="nc">chưa đếm: ' + dm(T) + "</div></td><td>280k</td>"), "1. tổng thực nhận 280k (chỉ các ngày đã đếm), ghi ngày chưa đếm");
    ok(/<tr class="big"><td>Thực nhận/.test(b), "1. thực nhận là dòng to");
    ok(b.includes('Trung bình 1 ngày<div class="nc">thực nhận, 2 ngày đã đếm</div></td><td>140k'), "1. trung bình 280k/2 = 140k");
  }

  // 2. chi tiết ngày
  tapDay(Y2);
  ok(els.histBody.innerHTML.includes("Thực nhận: <b>50k</b> · ship theo đơn 30k (chênh +20k)"), "2. chi tiết hôm kia: thực nhận 50k, ship 30k, chênh +20k");
  tapDay(T);
  ok(els.histBody.innerHTML.includes("Chưa đếm tiền ngày này: bấm 💰 Tổng tiền để đếm cuối ngày."), "2. chi tiết hôm nay: nhắc đếm tiền");
  tapDay(Y);
  ok(els.histBody.innerHTML.includes("Chưa đếm") === false && els.histBody.innerHTML.includes("Thực nhận: <b>230k</b>"), "2. chi tiết hôm qua: 230k");

  // 3. sao chép
  await els.hCopy.onclick();
  if (sameMonth) ok(clip.includes(dm(Y2) + ": 1 đơn · ship 30k · thực nhận 50k") && clip.includes("Tổng thực nhận: 280k (chưa đếm: " + dm(T) + ")") && clip.includes("Tổng ship theo đơn: 110k"), "3. sao chép:\n" + clip);

  // 4. Số ở 📅 khớp số "Được hưởng" ở 💰 khi mở ngày đó
  ev("openDay(" + JSON.stringify(Y) + ")"); els.btnMoney.onclick();
  ok(ev("calcMoney().net") === 230001, "4. 💰 hôm qua: Được hưởng = 230.001, khớp 📅");
  els.dayBack.onclick();

  // 5. Hôm nay đếm tiền xong -> 📅 có thực nhận hôm nay; sửa đầu ngày tay vẫn khớp
  els.btnMoney.onclick();
  const den = (side, d, v) => els.denBody._h.input({ target: { dataset: { den: side + ":" + d }, value: v } });
  den("ce", 500, "1"); den("ce", 200, "1"); den("ce", 20, "1");  // cuối 720k, đầu tự lấy cuối hôm qua 700k
  const netT = ev("calcMoney().net");
  ok(netT === 20000 + 75000 + 20000 + 1, "5. 💰 hôm nay: (720−700) + QR 95.001 = " + netT);
  els.btnHist.onclick();
  ok(els.histBody.innerHTML.includes('<td class="sp">20k</td><td class="net">115k</td>'), "5. 📅 hôm nay: thực nhận 115k");
  den("cs", 200, "");  // tự sửa đầu ngày: bỏ tờ 200k -> đầu ngày 500k
  els.btnHist.onclick();
  ok(ev("dayNet(dayData()," + JSON.stringify(T) + ")") === ev("calcMoney().net") && ev("calcMoney().net") === 220000 + 95001, "5. sửa đầu ngày tay: 📅 vẫn khớp 💰 (" + ev("calcMoney().net") + ")");

  // 6. đếm cuối ngày toàn số 0 vẫn tính là đã đếm; âm thì có dấu −
  boot({ ship_hist: JSON.stringify({ [Y]: { orders: [O(1, Y, 100000, 20000, false, "qr")], money: M({ day: Y, cs: { 500: "1" }, csManual: true, ce: { 500: "0" } }) } }), ship_orders: "[]" });
  els.btnHist.onclick();
  ok(els.histBody.innerHTML.includes('<td class="sp">20k</td><td class="net">−500k</td>'), "6. cuối ngày 0đ: thực nhận −500k (có dấu −)");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
