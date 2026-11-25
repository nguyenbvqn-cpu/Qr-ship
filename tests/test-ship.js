// Thử: 📅 chỉ còn bảng tiền ship (tổng gồm cả ship đơn chưa thu, ghi số đơn chưa thu) + 💰 gộp bảng tổng
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
const T = ago(0), Y = ago(1), Y2 = ago(2);
const sameMonth = Y2.slice(0, 7) === T.slice(0, 7);
const O = (id, day, phone, goods, ship, paid, kind) => ({ id, day, phone, goods, ship, paid, cash: kind === "tm", msgSent: kind === "sms", note: "" });
let els, store, ctx, clip = "";
function boot(st) {
  els = {}; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async t => { clip = t } } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const tapDay = d => els.histBody._h.click({ target: { closest: s => s === "[data-day]" ? { dataset: { day: d } } : null } });
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

const hist = {
  [Y]: { orders: [O(1, Y, "0911111111", 100000, 20000, true, "qr"), O(2, Y, "0922222222", 65000, 25000, true, "tm"), O(3, Y, "0933333333", 55000, 20000, false, "qr"), O(4, Y, "0944444444", 55000, 0, true, "sms")], money: null },
  [Y2]: { orders: [O(5, Y2, "0955555555", 200000, 30000, true, "qr")], money: null },
};
hist[Y].orders[0].note = "Sdt: 0911111111\n1 luộc 100k\nToà A1 <chung cư>";
boot({ ship_hist: JSON.stringify(hist), ship_orders: JSON.stringify([O(6, T, "0966666666", 75000, 20000, true, "qr"), O(7, T, "0977777777", 55000, 15000, false, "sms")]) });

(async () => {
  // 1. Mở 📅 là thấy ngay bảng tiền ship
  els.btnHist.onclick();
  const b = els.histBody.innerHTML;
  ok(!els.histOv.classList.contains("hidden") && /<table class="shipt">/.test(b), "1. mở 📅 là bảng tiền ship luôn");
  ok(!html.includes('id="hvAll"') && !html.includes("Theo ngày"), "1. đã bỏ bảng Theo ngày");
  ok(els.hTitle.textContent.startsWith("Ship tháng "), "1. tiêu đề: " + els.hTitle.textContent);
  const rowsN = (b.match(/<tr data-day=/g) || []).length;
  const expDays = sameMonth ? 3 : (Y.slice(0, 7) === T.slice(0, 7) ? 2 : 1);
  ok(rowsN === expDays, "1. số dòng ngày = " + rowsN + " (cần " + expDays + ")");
  if (sameMonth) {
    ok(b.includes("Tiền ship theo đơn</td><td>130k"), "1. tổng ship tháng gồm cả đơn chưa thu: 20+25+20+0 + 30 + 20+15 = 130k");
    ok(b.includes('Thực nhận (đếm tiền)<div class="nc">chưa đếm: ') && b.includes("</div></td><td>—</td>"), "1. chưa đếm tiền ngày nào: thực nhận —");
    ok(b.includes('Chưa thu</span></td><td><span style="color:#b42318">2 đơn</span>'), "1. dòng Chưa thu: 2 đơn (không ghi tiền)");
    ok(!/chưa thu[^<]*\d+k/i.test(b), "1. không còn ghi số tiền ship chưa thu");
    ok(b.includes('Trung bình 1 ngày<div class="nc">theo tiền ship</div></td><td>43k'), "1. trung bình 130k/3 ≈ 43k");
    ok(b.includes("Số đơn</td><td>7"), "1. 7 đơn");
    ok(/data-day="[^"]+"><td>▸ [^<]+<div class="dueS">1 đơn chưa thu<\/div><\/td><td>4<\/td><td class="sp">65k<\/td><td class="net"><span class="nc">chưa đếm<\/span>/.test(b), "1. dòng hôm qua: 4 đơn · 65k · 1 đơn chưa thu · chưa đếm");
    ok(/data-day="[^"]+"><td>▸ [^<]+<\/td><td>1<\/td><td class="sp">30k<\/td>/.test(b), "1. ngày không có đơn chưa thu thì không ghi gì");
  }
  ok(html.includes(">Sao chép bảng tiền ship<"), "1. nút sao chép");

  // 2. Bấm vào hôm qua -> chi tiết từng đơn
  tapDay(Y);
  const b2 = els.histBody.innerHTML;
  ok(b2.includes("Mức ship: <b>25k</b> × 1 đơn · <b>20k</b> × 2 đơn · <b>0đ</b> × 1 đơn"), "2. mức ship 25k×1, 20k×2, 0đ×1");
  ok(/class="sl due" data-go="[^"]+"><div class="r"><span>3\. 0933333333 <small>· chưa thu/.test(b2), "2. đơn chưa thu tô đỏ");
  ok(b2.includes('<div class="n">Thu 120k\n1 luộc 100k\nToà A1 &lt;chung cư&gt;</div>'), "2. đơn 1 có nội dung đơn (bỏ dòng SĐT, chữ được thoát an toàn) + thu 120k");
  ok(b2.includes('<div class="n">Cần thu 75k</div>'), "2. đơn chưa thu: cần thu 75k");
  ok(b2.includes("2. 0922222222 <small>· TM · hàng 65k</small></span><b>25k</b>") && b2.includes('<div class="n">Thu 90k</div>'), "2. đơn TM không có ghi chú: chỉ có dòng thu 90k");
  ok(b2.includes('data-open="' + Y + '"'), "2. có nút mở ngày để sửa");
  tapDay(Y);
  ok(!els.histBody.innerHTML.includes("Mức ship"), "2. bấm lần nữa thì thu lại");

  // 3. Sao chép
  await els.hCopy.onclick();
  if (sameMonth) ok(clip.includes("Tổng ship theo đơn: 130k (7 đơn, 3 ngày)") && clip.includes("Tổng thực nhận: chưa đếm") && clip.includes("Chưa thu: 2 đơn") && clip.includes("4 đơn · ship 65k · thực nhận chưa đếm (1 đơn chưa thu)"), "3. sao chép:\n" + clip);

  // 4. Tháng trống
  els.hPrev.onclick(); els.hPrev.onclick(); els.hPrev.onclick();
  ok(els.histBody.innerHTML.includes("Chưa có đơn tháng này"), "4. tháng trống báo chưa có đơn");
  clip = ""; await els.hCopy.onclick();
  ok(clip === "", "4. tháng trống không sao chép");

  // 5. 💰 gộp bảng tổng
  ok(!html.includes('id="btnSum"') && !html.includes('id="sumOv"') && html.includes("💰 Tổng tiền"), "5. bỏ nút 📊, nút 💰 thành Tổng tiền");
  els.btnMoney.onclick();
  const s = els.sumBody.innerHTML, m = els.monBody.innerHTML;
  ok(!els.monOv.classList.contains("hidden"), "5. mở 💰");
  ok(s.includes("Tổng đã thu (1 đơn)") && s.includes("95k"), "5. phần tổng ở đầu: tổng đã thu 1 đơn 95k (75k+20k)");
  ok(s.includes("Tiền ship") && s.includes("+ 15k chưa thu") && s.includes("Chưa thu (1 đơn)"), "5. phần tổng vẫn ghi ship + chưa thu");
  ok(m.includes("Được hưởng"), "5. phần tiền được hưởng ở dưới");
  ok(html.includes(">Tổng kết hôm nay<"), "5. tiêu đề Tổng kết hôm nay");
  ok(html.indexOf('id="sumBody"') < html.indexOf('class="den"'), "5. bảng tổng nằm trên bảng đếm tờ");
  await els.sumCopy.onclick(); ok(clip.startsWith("Tổng kết ngày"), "5. Sao chép tổng");
  await els.monCopy.onclick(); ok(clip.startsWith("Tiền ngày") && clip.includes("ĐƯỢC HƯỞNG"), "5. Sao chép tiền");

  // 6. Mở ngày cũ: tiêu đề đổi
  els.monOv.classList.add("hidden");
  vm.runInContext("openDay(" + JSON.stringify(Y) + ")", ctx);
  ok(els.monTitle.textContent === "Tổng kết ngày " + (+Y.slice(8)) + "/" + (+Y.slice(5, 7)), "6. mở ngày cũ: " + els.monTitle.textContent);
  els.btnMoney.onclick();
  ok(els.sumBody.innerHTML.includes("Tổng đã thu (3 đơn)"), "6. tổng của ngày đang mở (3 đơn đã thu)");

  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
