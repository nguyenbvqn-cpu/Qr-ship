// Thử: Số dư TK SMS = đã ck − rút ± cộng/trừ (không gộp chưa ck); SMS chưa ck là dòng riêng, được hưởng không đổi
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
const O = (id, goods, ship, paid, kind) => ({ id, day: T, phone: "09000000" + id, goods, ship, paid, cash: kind === "tm", msgSent: kind === "sms", note: "" });
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
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

// Giống ảnh người dùng: SMS đã ck 810k (5 đơn), chưa ck 335k (2 đơn); QR 670k; cộng/trừ SMS gõ "2700"
const os = [
  O(1, 140000, 20000, true, "sms"), O(2, 140000, 20000, true, "sms"), O(3, 140000, 20000, true, "sms"), O(4, 140000, 20000, true, "sms"), O(5, 150000, 20000, true, "sms"),
  O(6, 230000, 20000, false, "sms"), O(7, 65000, 20000, false, "sms"),
  O(8, 150000, 17500, true, "tm"),
];
boot({ ship_orders: JSON.stringify(os) });
els.btnMoney.onclick();
const c0 = ev("calcMoney()");
ok(c0.x.g.sms.v === 810000 && c0.smsDue === 335000, "0. dữ liệu: đã ck 810k, chưa ck 335k");
type("mAs", "2700");
const c = ev("calcMoney()");
ok(c.balS === 3510000, "1. Số dư TK SMS = 810k + 2.700k = 3.510k (" + c.balS + ")");
ok(c.net === c.diff + c.v.buy - c.v.debt + c.balQ + 3510000 + 335000, "1. Được hưởng vẫn cộng cả chưa ck 335k");
const m = els.monBody.innerHTML;
ok(/\+ Số dư TK SMS<div[^>]*>đã ck 810k \+2\.700k \(cộng\/trừ\)<\/div><\/td><td>3\.510k<\/td>/.test(m), "2. dòng Số dư TK SMS: đã ck 810k +2.700k → 3.510k");
ok(!/Số dư TK SMS<div[^>]*>[^<]*chưa ck/.test(m), "2. dòng TK SMS không còn gộp chưa ck");
ok(m.includes('+ SMS chưa ck</span><div class="muted" style="font-size:12px;font-weight:400">2 đơn đã nhắn STK, khách chưa chuyển</div></td><td><span style="color:#b42318">335k</span>'), "2. dòng riêng + SMS chưa ck 335k (2 đơn), chữ đỏ");
ok(m.indexOf("Số dư TK SMS") < m.indexOf("SMS chưa ck") && m.indexOf("SMS chưa ck") < m.indexOf("Được hưởng"), "2. thứ tự: TK SMS → SMS chưa ck → Được hưởng");

(async () => {
  await els.monCopy.onclick();
  ok(clip.includes("Số dư TK SMS: 3.510k (đã ck 810k − rút 0 +2.700k cộng/trừ)") && clip.includes("SMS chưa ck: 335k (2 đơn)") && /ĐƯỢC HƯỞNG: /.test(clip.split("\n").pop()), "3. sao chép:\n" + clip);

  // 4. Không có đơn chưa ck: không có dòng chưa ck
  boot({ ship_orders: JSON.stringify(os.filter(o => o.paid)) });
  els.btnMoney.onclick();
  ok(!els.monBody.innerHTML.includes("SMS chưa ck"), "4. hết đơn chưa ck thì không hiện dòng đó");
  clip = ""; await els.monCopy.onclick();
  ok(!clip.includes("chưa ck") && clip.includes("ĐƯỢC HƯỞNG"), "4. sao chép không có dòng chưa ck");
  // 5. Tab SMS: "Đã ck" vẫn chỉ cộng đơn; có cộng/trừ thì thêm dòng Số dư TK SMS khớp 💰
  boot({ ship_orders: JSON.stringify(os), ship_tab: JSON.stringify("m") });
  ev("render()");
  let L = els.list.innerHTML;
  ok(L.includes('<b>Đã ck:</b> <span class="total" style="display:inline">810k</span> / 1.145k') && !L.includes("Số dư TK SMS"), "5. chưa gõ cộng/trừ: Đã ck 810k / 1.145k, không có dòng số dư");
  els.btnMoney.onclick(); type("mAs", "2700");
  els.monClose.onclick();  // đóng 💰 -> vẽ lại danh sách
  L = els.list.innerHTML;
  ok(L.includes('<b>Số dư TK SMS:</b> <span class="total" style="display:inline">3.510k</span>') && L.includes("đã ck 810k +2.700k cộng/trừ (sửa ở 💰 Tổng tiền)"), "5. gõ +2700 rồi đóng 💰: tab SMS hiện Số dư TK SMS 3.510k");
  ok(L.includes('<b>Đã ck:</b> <span class="total" style="display:inline">810k</span> / 1.145k'), "5. dòng Đã ck vẫn 810k / 1.145k (chỉ tính đơn)");
  els.btnMoney.onclick(); type("mWs", "500k"); type("mAs", "");
  els.monOv._h.click({ target: { id: "monOv" } });  // chạm ra ngoài để đóng
  L = els.list.innerHTML;
  ok(L.includes('<span class="total" style="display:inline">310k</span>') && L.includes("đã ck 810k − rút 500k (sửa"), "5. chỉ rút 500k: số dư 310k, chạm ngoài để đóng cũng cập nhật");
  els.btnMoney.onclick(); type("mWs", "1tr");
  els.monClose.onclick();
  ok(els.list.innerHTML.includes('display:inline">−190k</span>'), "5. rút nhiều hơn đã ck: số dư âm −190k");
  ev("setTab('q')");
  ok(!els.list.innerHTML.includes("Số dư TK SMS"), "5. tab khác không có dòng này");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
