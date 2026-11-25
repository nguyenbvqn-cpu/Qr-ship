// Thử: 📅 bấm đơn chưa thu -> mở đúng đơn ở màn hình chính để nhắn nhắc / xác nhận đã thu
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
const T = ago(0), Y = ago(1);
const O = (id, day, phone, goods, ship, paid, kind) => ({ id, day, phone, goods, ship, paid, cash: kind === "tm", msgSent: kind === "sms", qrShown: kind === "qr", msgAt: 1, note: "" });
let els, store, ctx, clip = "", qsel = [], scrolled = [];
function boot(st) {
  els = {}; qsel = []; scrolled = [];
  store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }), ship_cfgB: JSON.stringify({ bankIdx: 0, account: "123", holder: "A" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [],
    querySelector: s => { qsel.push(s); const e = mkEl("q"); e.scrollIntoView = o => scrolled.push([s, o]); return e },
    addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { userAgent: "Android", clipboard: { writeText: async t => { clip = t } } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
const tapDay = d => els.histBody._h.click({ target: { closest: s => s === "[data-day]" ? { dataset: { day: d } } : null } });
const tapGo = v => els.histBody._h.click({ target: { closest: s => s === "[data-go]" ? { dataset: { go: v } } : null } });
const listClick = (a, i) => { const card = { dataset: { i: String(i) } }, b = mkEl("a"); b.dataset.a = a; b.closest = s => s === ".order" ? card : b; els.list._h.click({ target: b, preventDefault() {} }) };
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

const ID3 = 1731800000000.123;  // mã đơn thật là số lẻ (Date.now()+Math.random())
const hist = { [Y]: { orders: [O(1, Y, "0911111111", 100000, 20000, true, "qr"), O(2, Y, "0922222222", 65000, 25000, true, "tm"), O(ID3, Y, "0933333333", 130000, 20000, false, "sms"), O(4, Y, "0944444444", 55000, 20000, false, "")], money: null } };
hist[Y].orders[2].note = "Sdt: 0933333333\n1 luộc nhỏ";
boot({ ship_hist: JSON.stringify(hist), ship_tab: JSON.stringify("n"), ship_orders: JSON.stringify([O(6, T, "0966666666", 75000, 20000, true, "qr"), O(7, T, "0977777777", 55000, 15000, false, "qr")]) });

(async () => {
  // 1. Chi tiết ngày: đơn chưa thu có nút mở đơn, đơn đã thu thì không
  els.btnHist.onclick(); tapDay(Y);
  const b = els.histBody.innerHTML;
  ok(b.includes('data-go="' + Y + "|" + ID3 + '"'), "1. đơn chưa thu (SMS) bấm được: data-go có ngày|mã đơn");
  ok(b.includes('data-go="' + Y + '|4"'), "1. đơn chưa thu (Mới) cũng bấm được");
  ok((b.match(/data-go=/g) || []).length === 2, "1. chỉ 2 đơn chưa thu có data-go (đơn đã thu không có)");
  ok((b.match(/class="blue go"/g) || []).length === 2 && b.includes("Mở đơn: nhắn nhắc / xác nhận đã thu ›"), "1. có nút 'Mở đơn: nhắn nhắc / xác nhận đã thu'");

  // 2. Bấm đơn chưa thu ngày hôm qua -> mở ngày hôm qua, tab SMS, cuộn tới đơn, tô viền
  tapGo(Y + "|" + ID3);
  ok(ev("WORKDAY") === Y, "2. đã mở ngày hôm qua (WORKDAY=" + ev("WORKDAY") + ")");
  ok(els.histOv.classList.contains("hidden"), "2. đóng bảng 📅");
  ok(ev("tab") === "m", "2. sang tab SMS (tab=" + ev("tab") + ")");
  const idx = ev("orders.findIndex(o=>o.id===" + ID3 + ")");
  ok(scrolled.some(([s, o]) => s === '.order[data-i="' + idx + '"]' && o.block === "center"), "2. cuộn tới thẻ đơn: " + JSON.stringify(scrolled));
  const L = els.list.innerHTML;
  ok(new RegExp('class="card order  flash" data-i="' + idx + '"').test(L), "2. thẻ đơn được tô viền (flash)");
  ok((L.match(/ flash"/g) || []).length === 1, "2. chỉ 1 thẻ được tô");
  ok(L.includes('href="sms:0933333333?body=Alo"') && L.includes("Đã ck ✓"), "2. thẻ đơn có Nhắn lại (Alo) + Đã ck ✓");
  ok(els.toastTxt.textContent.includes("0933333333") && els.toastTxt.textContent.includes("Về hôm nay"), "2. báo: " + els.toastTxt.textContent);

  // 3. Xác nhận đã ck -> về hôm nay -> 📅 ngày hôm qua hết đơn chưa thu (còn đơn 4)
  listClick("paid", idx);
  ok(ev("orders[" + idx + "].paid") === true, "3. đã ck ✓");
  els.dayBack.onclick();
  ok(ev("WORKDAY") === null, "3. về hôm nay");
  const h2 = JSON.parse(store.ship_hist)[Y].orders.find(o => o.id === ID3);
  ok(h2 && h2.paid === true, "3. lịch sử hôm qua đã ghi đơn này đã thu");
  els.btnHist.onclick(); tapDay(Y);
  ok(!els.histBody.innerHTML.includes('data-go="' + Y + "|" + ID3 + '"') && els.histBody.innerHTML.includes('data-go="' + Y + '|4"'), "3. 📅: đơn đó hết đỏ, còn đơn 4 chưa thu");

  // 4. Đơn chưa thu ở tab Mới (chưa nhắn, chưa QR): mở sẵn ⋯ để thấy nút Đã thu QR
  tapGo(Y + "|4");
  ok(ev("WORKDAY") === Y && ev("tab") === "n", "4. mở ngày hôm qua, tab Mới");
  ok(ev("editing.has(4)") === true && els.list.innerHTML.includes("Đã thu QR"), "4. thẻ mở sẵn, thấy nút Đã thu QR");

  // 5. Đơn chưa thu của ngày đang mở (đang ở hôm qua, bấm đơn hôm nay) -> về hôm nay
  els.btnHist.onclick(); tapDay(T);
  ok(els.histBody.innerHTML.includes('data-go="' + T + '|7"'), "5. đơn hôm nay chưa thu cũng có nút");
  tapGo(T + "|7");
  ok(ev("WORKDAY") === null && ev("tab") === "q", "5. về hôm nay, sang tab QR (đơn đã hiện QR)");
  ok(els.list.innerHTML.includes(' flash" data-i="' + ev("orders.findIndex(o=>o.id===7)") + '"'), "5. tô viền đơn 7");
  ok(!els.toastTxt.textContent.includes("Về hôm nay"), "5. hôm nay thì không nhắc 'Về hôm nay': " + els.toastTxt.textContent);

  // 6. Đang ở hôm nay, bấm đơn hôm nay -> không mở lại ngày, chỉ đóng 📅
  els.btnHist.onclick(); tapDay(T); tapGo(T + "|7");
  ok(ev("WORKDAY") === null && els.histOv.classList.contains("hidden"), "6. vẫn hôm nay, 📅 đóng");

  // 7. Mã đơn không còn -> báo, không lỗi
  els.btnHist.onclick(); tapGo(T + "|999");
  ok(els.toastTxt.textContent === "Không tìm thấy đơn này.", "7. đơn không còn: báo không tìm thấy");

  // 8. Hết 5 giây thì bỏ tô viền
  await new Promise(r => setTimeout(r, 5100));
  ok(ev("flashId") === null, "8. sau 5 giây hết tô viền");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
