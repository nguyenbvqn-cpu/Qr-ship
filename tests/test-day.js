// Thử chế độ "mở ngày đã qua để nhập/sửa đơn": không mất đơn, bảng tiền, ảnh khi chuyển qua lại.
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const code = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join("\n;\n");

function mkEl(id) {
  const kids = [];
  return {
    id, value: "", textContent: "", innerHTML: "", checked: false, disabled: false, dataset: {}, style: {}, max: "",
    children: kids, childNodes: kids, options: [], files: [],
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener() {}, removeEventListener() {}, appendChild(c) { kids.push(c); return c },
    append() {}, prepend() {}, remove() {}, insertBefore(c) { return c }, replaceChildren() {}, setAttribute() {}, getAttribute() { return null },
    querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, blur() {}, click() {},
    select() {}, scrollIntoView() {}, scrollTo() {}, getContext() { return new Proxy({}, { get: () => () => {} }) },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 } }, cloneNode() { return mkEl(id + "c") },
  };
}
let els, doc, store, ctx;
function boot(st) {
  els = {}; store = st;
  doc = {
    getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl("new-" + t),
    querySelector: () => mkEl("q"), querySelectorAll: () => [], addEventListener() {}, body: mkEl("body"), head: mkEl("head"),
    documentElement: mkEl("html"), hidden: false, activeElement: null,
  };
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } };
  ctx = {
    document: doc, localStorage, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    navigator: { clipboard: { writeText: async () => {} } },
    location: { origin: "https://x", pathname: "/Qr-ship/", hash: "", reload() {}, href: "https://x/Qr-ship/" },
    fetch: async () => ({ ok: true, json: async () => ({}) }), Image: function () { return mkEl("img") },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, TextEncoder, Uint8Array, Array, Object, String, Number,
    requestAnimationFrame: f => setTimeout(f, 0), matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({}), scrollTo() {}, history: { replaceState() {} }, addEventListener() {}, removeEventListener() {},
  };
  // thư viện supabase giả: chưa đăng nhập (không đồng bộ), chỉ cần app chạy
  ctx.window = Object.assign({ supabase: { createClient: () => ({ auth: {
    getSession: async () => ({ data: { session: null }, error: null }), onAuthStateChange() {}, signInWithOAuth: async () => ({}) } }) } }, ctx);
  ctx.self = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: "app.js" });
}
const ev = s => vm.runInContext(s, ctx);
const J = k => JSON.parse(store[k] || "null");
let fail = 0;
const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  // Hôm nay T có 2 đơn (B có ảnh) + bảng tiền; hôm qua Y chỉ có bảng tiền (giống máy thật)
  const d = new Date(), y = new Date(); y.setDate(y.getDate() - 1);
  const fmt = x => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
  const T = fmt(d), Y = fmt(y);
  const A = { id: 1, day: T, phone: "0901111111", goods: 100000, ship: 20000, paid: true, qrShown: true, note: "A" };
  const B = { id: 2, day: T, phone: "0902222222", goods: 55000, ship: 20000, paid: false, msgSent: true, note: "B" };
  const start = {
    ship_orders: JSON.stringify([A, B]),
    ship_money: JSON.stringify({ day: T, cs: { 100: "3" }, ce: {}, debt: "", buy: "", wq: "", ws: "" }),
    ship_hist: JSON.stringify({ [Y]: { orders: [], money: { day: Y, cs: { 500: "2" }, ce: {}, debt: "", buy: "", wq: "", ws: "" } } }),
    ship_photos: JSON.stringify({ "2": ["data:image/jpeg;base64,xx"] }),
    ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "123" }),
    "sb-tkjfswyytbvitvlehnxp-auth-token": "{}",
  };
  boot(Object.assign({}, start)); await tick();
  ok(ev("orders.length") === 2 && ev("WORKDAY") === null, "khởi động: hôm nay có 2 đơn");

  // 1. Mở 📅, chọn hôm qua, bấm Mở ngày
  els.btnHist.onclick();
  ok(els.hDate.value === Y && els.hDate.max === T, "📅 ô chọn ngày mặc định là hôm qua " + els.hDate.value + ", tối đa hôm nay");
  els.hOpenDay.onclick(); await tick();
  ok(ev("WORKDAY") === Y && ev("today()") === Y, "1. đã mở ngày hôm qua");
  ok(ev("orders.length") === 0, "1. màn hình chính trống (hôm qua chưa có đơn)");
  ok(ev("money.cs[500]") === "2", "1. bảng tiền hôm qua được lấy ra (500k×2)");
  ok(doc.documentElement.classList.contains("past") && !els.dayBar.classList.contains("hidden"), "1. thanh vàng + header đổi màu");
  ok(/ngày \d+\/\d+/.test(els.dayBarTxt.textContent) && /ngày/.test(els.monTitle.textContent), "1. nhãn: " + els.dayBarTxt.textContent + " | " + els.monTitle.textContent);
  const h1 = J("ship_hist");
  ok(h1[T] && h1[T].orders.length === 2 && h1[T].money.cs[100] === "3" && !h1[Y], "1. đơn + tiền hôm nay được cất an toàn vào lịch sử");
  ok(J("ship_photos")["2"], "1. ảnh đơn hôm nay còn nguyên");

  // 2. Dán 2 đơn cho hôm qua, đánh dấu 1 đơn tiền mặt, sửa bảng tiền
  els.paste.value = "0903333333 2 to\n\n0904444444 1 bé 65k"; els.add.onclick(); await tick();
  ok(ev("orders.length") === 2 && ev("orders.every(o=>o.day===WORKDAY)"), "2. 2 đơn mới mang ngày hôm qua");
  ev("orders[0].cash=true;orders[0].paid=true;saveOrders();money.buy='50k';store('ship_money',money)");
  ok(ev("Object.keys(mtime).includes('day:'+WORKDAY)"), "2. đánh dấu cần đồng bộ cho đúng ngày hôm qua");
  ok(/Tổng kết ngày/.test(ev("sumText(summary())")) && ev("sumText(summary())").includes(String(y.getDate()) + "/" + String(y.getMonth() + 1)), "2. bảng tổng ghi ngày hôm qua");
  render = null;
  // 2b. lịch sử khi đang mở hôm qua: hôm nay vẫn hiện đủ
  ok(ev("dayData()[realToday()].orders.length") === 2 && ev("dayData()[WORKDAY].orders.length") === 2, "2. 📅 vẫn thấy đủ cả hôm nay và hôm qua");
  ok(ev("localVal('day:'+realToday()).orders.length") === 2 && ev("localVal('day:'+WORKDAY).orders.length") === 2, "2. dữ liệu đồng bộ của cả 2 ngày đúng");

  // 3. Về hôm nay
  els.dayBack.onclick(); await tick();
  ok(ev("WORKDAY") === null && ev("orders.length") === 2 && ev("orders.map(o=>o.id).sort().join()") === "1,2", "3. về hôm nay: đúng 2 đơn A, B");
  ok(ev("money.day") === T && ev("money.cs[100]") === "3", "3. bảng tiền hôm nay còn nguyên");
  const h3 = J("ship_hist");
  ok(!h3[T] && h3[Y].orders.length === 2 && h3[Y].orders.some(o => o.cash && o.paid), "3. 2 đơn hôm qua nằm trong lịch sử, giữ trạng thái tiền mặt");
  ok(h3[Y].money.buy === "50k" && h3[Y].money.cs[500] === "2", "3. bảng tiền hôm qua lưu cả số sửa (mua đồ 50k)");
  ok(J("ship_photos")["2"] && !doc.documentElement.classList.contains("past") && els.dayBar.classList.contains("hidden"), "3. ảnh còn, bỏ thanh vàng");

  // 4. Mở lại hôm qua, xóa 1 đơn, về -> đơn đã xóa không quay lại
  ev("openDay(" + JSON.stringify(Y) + ")");
  ok(ev("orders.length") === 2, "4. mở lại hôm qua thấy 2 đơn");
  ev("orders.splice(1,1);saveOrders()");
  ev("openDay(null)");
  ok(J("ship_hist")[Y].orders.length === 1 && ev("orders.length") === 2, "4. xóa đơn hôm qua -> lịch sử còn 1, hôm nay vẫn 2");

  // 5. Đang nhập hôm qua thì app bị tắt (mở lại) -> tự về hôm nay, không mất gì
  ev("openDay(" + JSON.stringify(Y) + ")");
  els.paste.value = "0905555555 1 luộc"; els.add.onclick(); await tick();
  const snap = Object.assign({}, store);
  boot(snap); await tick();
  ok(ev("WORKDAY") === null && ev("orders.length") === 2 && ev("orders.every(o=>o.day===realToday())"), "5. mở lại app: về hôm nay, đủ 2 đơn");
  ok(ev("money.cs[100]") === "3", "5. bảng tiền hôm nay khôi phục");
  const h5 = J("ship_hist");
  ok(!h5[T] && h5[Y].orders.length === 2, "5. hôm qua có 2 đơn (1 cũ + 1 vừa thêm)");
  ok(J("ship_photos")["2"], "5. ảnh hôm nay còn");

  // 6. Không cho mở ngày tương lai; chọn hôm nay = về chế độ thường
  const tm = new Date(); tm.setDate(tm.getDate() + 1);
  els.btnHist.onclick(); els.hDate.value = fmt(tm); els.hOpenDay.onclick();
  ok(ev("WORKDAY") === null, "6. ngày mai -> từ chối");
  els.hDate.value = T; els.hOpenDay.onclick();
  ok(ev("WORKDAY") === null && ev("orders.length") === 2, "6. chọn hôm nay -> vẫn ở hôm nay");

  // 7. Xóa hết đơn khi đang mở ngày cũ không xóa ảnh hôm nay
  ev("openDay(" + JSON.stringify(Y) + ")");
  els.clearAll.onclick(); els.clearAll.onclick();
  ok(ev("orders.length") === 0 && J("ship_photos")["2"], "7. xóa hết đơn hôm qua, ảnh hôm nay vẫn còn");
  ev("openDay(null)");
  ok(ev("orders.length") === 2, "7. về hôm nay vẫn 2 đơn");

  console.log(fail ? fail + " lỗi" : "Tất cả OK");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("LỖI:", e); process.exit(1) });
