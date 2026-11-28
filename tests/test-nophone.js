// Thử: đơn không có SĐT vẫn tạo được (cả khi dán nhiều đơn), nhưng không tạo QR
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
const add = t => { ctx._t = t; ev('orders.length=0;$("paste").value=_t;$("add").onclick()'); return JSON.parse(ev("JSON.stringify(orders.map(o=>[o.phone,o.goods]))")) };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
boot({ ship_tab: JSON.stringify("n"), ship_orders: "[]" });

// 1. tạo đơn không SĐT
let r = add("1 luộc 100k\nShip tới quán A");
ok(same(r, [["", 100000]]), "1. đơn lẻ không SĐT vẫn tạo được: " + JSON.stringify(r));
// 2. dán nhiều đơn: đoạn không SĐT không bị bỏ
r = add("0900000001\n1 luộc 100k\n\n0900000002\n1 trộn 65k\n\n1 bé 55k tới chợ B");
ok(same(r, [["0900000001", 100000], ["0900000002", 65000], ["", 55000]]), "2. 3 đơn, đơn thứ 3 không SĐT vẫn có (trước bị mất): " + JSON.stringify(r));
r = add("0900000001\n\n1 luộc 100k\n\n0900000002\n1 trộn 65k\n\nGọi trước 5 phút");
ok(same(r, [["0900000001", 100000], ["0900000002", 65000]]), "2. SĐT 1 tin, món 1 tin: gộp lại; lời dặn gộp vào đơn trước: " + JSON.stringify(r));
ok(ev("orders[1].note").includes("Gọi trước 5 phút"), "2. lời dặn nằm trong nội dung đơn 2");
r = add("Chị ơi\n\n0900000001\n1 luộc 100k\n\n0900000002\n1 trộn 65k");
ok(same(r, [["0900000001", 100000], ["0900000002", 65000]]), "2. đoạn đầu không có tiền hàng gộp vào đơn sau, không thành đơn rỗng: " + JSON.stringify(r));
r = add("0900000001\n1 luộc 100k\n\n1 bé 55k tới chợ B");
ok(same(r, [["0900000001", 155000]]), "2. chỉ 1 SĐT: cả tin là 1 đơn (như cũ): " + JSON.stringify(r));

// 3. không tạo QR
boot({ ship_tab: JSON.stringify("n"), ship_orders: JSON.stringify([O(1, "", 100000, 20000, "1 luộc 100k"), O(2, "0900000002", 65000, 20000, "1 trộn 65k")]) });
ev("render()");
const cards = els.list.innerHTML.split('class="card order');
ok(/data-a="show"/.test(cards[1]) && /class="ic primary off" data-a="show"/.test(cards[1]), "3. nút QR của đơn không SĐT bị làm mờ");
ok(/class="ic primary" data-a="show"/.test(cards[2]), "3. đơn có SĐT: nút QR bình thường");
ok(/class="btn blue ic off" data-a="msg"/.test(cards[1]) && /class="btn blue ic" data-a="msg"/.test(cards[2]), "3. nút SMS cũng mờ ở đơn không SĐT");
const click = (i, a) => { const btn = { dataset: { a }, closest: s => s === ".order" ? { dataset: { i: String(i) } } : btn }; els.list._h.click({ target: btn, preventDefault() {} }) };
ev('$("ov").classList.add("hidden")'); // DOM giả: màn QR lúc đầu đang ẩn
click(0, "show");
ok(ev('$("ov").classList.contains("hidden")'), "3. bấm QR ở đơn không SĐT: không mở màn QR");
ok(/không tạo QR/.test(ev('$("toastTxt").textContent')), "3. có thông báo vì sao: " + ev('$("toastTxt").textContent'));
ok(!ev("orders[0].qrShown"), "3. đơn không SĐT không chuyển sang tab QR");
click(1, "show");
ok(!ev('$("ov").classList.contains("hidden")'), "4. đơn có SĐT vẫn mở QR");
ok(ev('ovIds.length') === 1 && els.ovIdx.textContent.startsWith("Đơn 1/1"), "4. lướt QR bỏ qua đơn không SĐT: " + els.ovIdx.textContent);
ev('$("ov").classList.add("hidden")');
click(0, "cash");
ok(ev("orders[0].paid && orders[0].cash"), "5. đơn không SĐT vẫn thu tiền mặt được");
// 6. nhập SĐT xong thì tạo QR được
boot({ ship_tab: JSON.stringify("n"), ship_orders: JSON.stringify([O(1, "", 100000, 20000, "1 luộc 100k")]) });
ev("orders[0].phone='0900000001';render()");
ok(/class="ic primary" data-a="show"/.test(els.list.innerHTML), "6. nhập SĐT xong: nút QR sáng lại");
click(0, "show");
ok(!ev('$("ov").classList.contains("hidden")') && els.ovContent.textContent === "Nội dung: QR chan ga - 0900000001", "6. mở QR với SĐT vừa nhập");
console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
