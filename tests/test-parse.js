// Thử: đọc đơn "Hộp to ... / Đơn này là 1 to là 100k nhé"
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
let els = {}, store = { "sb-tkjfswyytbvitvlehnxp-auth-token": "{}" };
const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: () => [], querySelector: () => mkEl("q"), addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
const ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
  console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async () => {} } }, location: { origin: "x", pathname: "/", hash: "" },
  URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const P = (t, s) => { ctx._t = t; ctx._s = s; return vm.runInContext("parseOrder(_t,_s)", ctx) };

const r = P("0900000001\nHộp to tới quán nước cạnh bè cá nhé\nĐơn này là 1 to là 100k nhé", 20000);
console.log(JSON.stringify({ phone: r.phone, goods: r.goods, ship: r.ship }));
ok(r.phone === "0900000001", "1. SĐT");
ok(r.goods === 100000, "1. tiền hàng 100k (" + r.goods + ")");
ok(r.ship === 20000, "1. ship mặc định 20k (" + r.ship + ")");
const G = (t, want, m) => { const g = P(t, 20000).goods; ok(g === want, m + " → " + g) };
G("0900000001\nHộp to tới quán nước cạnh bè cá nhé", 100000, "2. chỉ tin đầu 'Hộp to…' (trước ra 0) = 1 hộp to 100k");
G("0900000001\nhop to toi quan nuoc", 100000, "2. không dấu 'hop to' = 100k");
G("0900000001\nHộp to, hộp bé nhé", 155000, "3. 'hộp to, hộp bé' = 100k + 55k");
G("0900000001\nLấy hộp sốt me với hộp rút xương", 120000, "3. 'hộp sốt me với hộp rút xương' = 55k + 65k");
G("0900000001\nShip cho bé nhà mình\nnhà to màu xanh", 0, "4. không có chữ hộp: 'cho bé', 'nhà to' không tính tiền");
G("0900000001\nShop to tới quán", 0, "4. 'Shop' không bị hiểu là 'hộp'");
G("0900000001\nHộp chân gà tới quán", 0, "4. hộp mà không rõ loại: vẫn 0 để tự sửa");
G("0900000001\n2 hộp to", 200000, "5. có số lượng: '2 hộp to' = 200k (như cũ)");
G("0900000001\nHộp to\n1 me 55k", 55000, "6. đã có giá ở dòng khác thì không đoán thêm (như cũ)");
G("0900000001\nHộp to tới quán\nĐơn này 150k", 150000, "6. 'đơn này 150k' vẫn là tổng tiền hàng");
G("0900000001\nHộp to\nck 130k", 110000, "6. 'ck 130k' vẫn là tổng khách trả (hàng = 130k − 20k)");
const s = P("0900000001\nHộp to tới quán\nship 25k", 20000);
ok(s.goods === 100000 && s.ship === 25000, "7. 'Hộp to' + 'ship 25k': hàng 100k, ship 25k (" + s.goods + ", " + s.ship + ")");
G("0900000001\nShip cho e đến quán cà phê\n1 luộc 100k\nGọi trước 5 phút nhé", 100000, "8. đơn cũ '1 luộc 100k' vẫn 100k");
// gõ thiếu dấu
G("cho mình 1 hộp chân gà thảo quả nho và 1 rút xương lắc cóc đến số nhà 2a ngõ 47 phố A sđt 0900000002", 120000, "9. 'thảo quả nho' (nhỏ) 55k + 'rút xương lắc cóc' 65k = 120k (trước ra 165k)");
G("0900000001\n1 hop be", 55000, "9. '1 hop be' = 55k");
G("0900000001\n1 tron", 65000, "9. '1 tron' = 65k");
G("0900000001\n1 hop thao qua", 100000, "9. '1 hop thao qua' = 100k");
G("0900000001\n1 ot xanh", 75000, "9. '1 ot xanh' = 75k");
G("0900000001\n1 hộp to gần cây xăng", 100000, "10. 'cây' có dấu không bị hiểu là 'cay' (vẫn hộp to 100k)");
G("0900000001\n1 hộp to giao cho mẹ", 100000, "10. 'mẹ' không bị hiểu là 'me'");
G("0900000001\n1 hộp to tới bè", 100000, "10. 'bè' không bị hiểu là 'bé'");
// "m" gõ nhầm của "k"
G("12 - Phố A\n0900000001\n1 luộc 55m\n1 trộn 65k", 120000, "11. '1 luộc 55m' = 55k (trước ra luộc 100k theo bảng giá) + trộn 65k = 120k");
G("0900000001\n1 luộc 55m\n1 trộn 65k\nĐơn này phải là 120k tiền đồ", 120000, "11. có dòng 'Đơn này … 120k tiền đồ' vẫn 120k");
G("0900000001\n2 bé 55m", 110000, "11. '2 bé 55m' = 2 × 55k");
G("0900000001\n1 hộp to\nĐi thẳng 50m rẽ trái", 100000, "11. '50m' trong địa chỉ không tính tiền");
G("0900000001\n1 hộp to, nhà cách 50m", 100000, "11. '1 hộp to, nhà cách 50m': 50m không phải giá");
console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
