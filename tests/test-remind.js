// Thử: nút "Nhắn lại" ở tab SMS chỉ nhắn "Alo"
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");
function mkEl(id) {
  const h = {};
  return { id, _h: h, value: "", textContent: "", innerHTML: "", dataset: {}, style: {}, options: [], max: "", _attr: {},
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener(t, f) { h[t] = f }, appendChild(c) { return c }, setAttribute(k, v) { this._attr[k] = v }, querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, scrollTo() {} };
}
const fmt = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
const T = fmt(new Date());
let els, store, ctx, clip = "", docH = {}, docDoc = null;
function boot(st) {
  els = {}; docH = {}; clip = ""; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }) }, st);
  const doc = docDoc = { hidden: false, getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], addEventListener(t, f) { (docH[t] = docH[t] || []).push(f) }, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout: f => f(), clearTimeout() {}, setInterval: () => 0, navigator: { userAgent: "Android", clipboard: { writeText: async t => { clip = t } } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
// bấm nút data-a=a trong thẻ đơn thứ i
function click(a, i) {
  const card = { dataset: { i: String(i) } }, a_el = mkEl("a"); a_el.dataset.a = a; a_el.closest = s => s === ".order" ? card : (s === "a" ? a_el : a_el);
  let prevented = false;
  els.list._h.click({ target: a_el, preventDefault() { prevented = true } });
  return { el: a_el, prevented };
}
const orders = [
  { id: 1, day: T, phone: "0900000001", goods: 100000, ship: 20000, paid: false, msgSent: true, msgAt: 1000, note: "" },
  { id: 2, day: T, phone: "0900000002", goods: 80000, ship: 20000, paid: false, msgSent: true, msgAt: 2000, note: "" },
  { id: 3, day: T, phone: "0900000003", goods: 55000, ship: 20000, paid: false, note: "" },
];
boot({ ship_orders: JSON.stringify(orders), ship_tab: JSON.stringify("m"), ship_cfgB: JSON.stringify({ bankIdx: 0, account: "123", holder: "A" }) });
ev("render()");
const L = els.list.innerHTML;
ok(/data-a="resend" href="sms:0900000001\?body=Alo"/.test(L), "1. nút Nhắn lại đơn 1 mở tin nhắn sẵn chữ Alo");
ok(/data-a="resend" href="sms:0900000002\?body=Alo"/.test(L), "1. nút Nhắn lại đơn 2 cũng là Alo");
ok(!/data-a="resend" href="[^"]*123/.test(L), "1. Nhắn lại không còn gửi STK");
ok(L.indexOf("0900000002") < L.indexOf("0900000001"), "1. thứ tự: nhắn sau (đơn 2) ở trên");

// 2. bấm Nhắn lại đơn 1 (đang ở dưới)
(async () => {
  const r = click("resend", 0);
  await new Promise(s => setImmediate(s));
  ok(r.el._attr.href === "sms:0900000001?body=Alo", "2. bấm: href = sms:...?body=Alo (" + r.el._attr.href + ")");
  ok(clip === "" && els.toastTxt.textContent === "", "2. Nhắn lại: không sao chép, không hiện thông báo (" + JSON.stringify(clip) + ")");
  const o = JSON.parse(store.ship_orders);
  ok(o[0].msgAt === 1000 && o[0].msgSent === true, "2. giờ nhắn STK giữ nguyên, đơn vẫn ở tab SMS");
  ev("render()");
  const L2 = els.list.innerHTML;
  ok(L2.indexOf("0900000002") < L2.indexOf("0900000001"), "2. đơn không nhảy chỗ sau khi nhắc");

  // 3. Nhắn lại không cần tài khoản STK
  boot({ ship_orders: JSON.stringify(orders), ship_tab: JSON.stringify("m") });
  clip = "";
  const r3 = click("resend", 0);
  await new Promise(s => setImmediate(s));
  ok(!r3.prevented && r3.el._attr.href === "sms:0900000001?body=Alo", "3. chưa nhập TK ở ⚙ vẫn nhắn Alo được");

  // 4. Nút Nhắn STK (đơn mới) vẫn gửi đủ STK
  boot({ ship_orders: JSON.stringify(orders), ship_tab: JSON.stringify("n"), ship_cfgB: JSON.stringify({ bankIdx: 0, account: "123", holder: "A" }) });
  ev("render()");
  ok(/data-a="msg" href="sms:0900000003\?body=[^"]*123/.test(els.list.innerHTML), "4. nút Nhắn STK vẫn có số TK trong tin");
  clip = "";
  const r4 = click("msg", 2);
  await new Promise(s => setImmediate(s));
  const o4 = JSON.parse(store.ship_orders)[2];
  ok(clip.includes("123") && clip !== "Alo" && o4.msgSent && o4.msgAt > 2000, "4. bấm Nhắn STK: tin đủ STK, đơn sang tab SMS lên đầu");
  ok(r4.el._attr.href.includes("123"), "4. href Nhắn STK có số TK");
  ok(clip.includes("123") && els.toastTxt.textContent === "" && !els.toast, "4. Nhắn STK: chép sẵn nhưng không hiện thông báo");

  // 4b. Chép lỗi -> hiện thông báo có tin nhắn + nút Sao chép lại
  boot({ ship_orders: JSON.stringify(orders), ship_tab: JSON.stringify("n"), ship_cfgB: JSON.stringify({ bankIdx: 0, account: "123", holder: "A" }) });
  ctx.navigator.clipboard.writeText = async () => { throw new Error("no") };
  ctx.setTimeout = () => 0;  // không cho hẹn giờ tắt thông báo chạy ngay
  ctx.document.getElementById("toast").classList.add("hidden");
  click("msg", 2);
  await new Promise(s => setImmediate(s));
  ok(!els.toast.classList.contains("hidden") && els.toastTxt.textContent.includes("123") && !els.toastCopy.classList.contains("hidden"), "4b. chép lỗi: hiện thông báo kèm tin STK và nút Sao chép lại");
  // chạm vào thông báo để tắt
  els.toastTxt.onclick();
  ok(els.toast.classList.contains("hidden"), "4b. chạm vào thông báo thì tắt");
  // rời app thì tắt thông báo
  ev('toast("thử")');
  ok(!els.toast.classList.contains("hidden"), "4c. thông báo đang hiện");
  docDoc.hidden = true; docH.visibilitychange.forEach(f => f());
  ok(els.toast.classList.contains("hidden"), "4c. rời app (trang ẩn) thì thông báo tắt");
  docDoc.hidden = false; docH.visibilitychange.forEach(f => f());
  ok(els.toast.classList.contains("hidden"), "4c. quay lại app không hiện lại");

  // 5. Nhắn lại đơn chưa có SĐT vẫn báo
  boot({ ship_orders: JSON.stringify([{ id: 9, day: T, phone: "", goods: 1, ship: 0, paid: false, msgSent: true, note: "" }]), ship_tab: JSON.stringify("m") });
  const r5 = click("resend", 0);
  ok(r5.prevented, "5. đơn chưa có SĐT: không mở tin nhắn");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
