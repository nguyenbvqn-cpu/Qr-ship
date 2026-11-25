// Thử: ô cộng/trừ (âm/dương) cho TK QR và TK SMS trong 💰
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
const pmQ = mkEl("pmQ"), pmS = mkEl("pmS"); pmQ.dataset.pm = "mAq"; pmS.dataset.pm = "mAs";
function boot(st) {
  els = {}; store = Object.assign({ "sb-tkjfswyytbvitvlehnxp-auth-token": "{}", ship_cfgQ: JSON.stringify({ bankIdx: 0, account: "1" }) }, st);
  const doc = { getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl(t), querySelectorAll: s => s === "[data-pm]" ? [pmQ, pmS] : [], addEventListener() {}, head: mkEl("h"), body: mkEl("b"), documentElement: mkEl("html") };
  ctx = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem() {} },
    console, setTimeout, clearTimeout, setInterval: () => 0, navigator: { clipboard: { writeText: async t => { clip = t } } }, location: { origin: "x", pathname: "/", hash: "" },
    URL, Date, Math, JSON, Promise, Set, Map, Intl, Array, Object, String, Number, scrollTo() {}, addEventListener() {}, history: {} };
  ctx.window = Object.assign({}, ctx); vm.createContext(ctx); vm.runInContext(code, ctx);
}
const ev = s => vm.runInContext(s, ctx);
const type = (id, v) => { els[id].value = v; els[id]._h.input({ target: els[id] }) };
let fail = 0; const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };

boot({ ship_orders: JSON.stringify([O(1, 100000, 20000, true, "qr"), O(2, 80000, 20000, true, "sms"), O(3, 55000, 20000, false, "sms")]) });

// 1. Đọc số âm/dương
const P = s => ev("parseSigned(" + JSON.stringify(s) + ")");
[["-50k", -50000], ["30k", 30000], ["+20k", 20000], ["−50k", -50000], ["- 50k", -50000], ["30k-10k", 20000], ["-1tr2", -1200000], ["-50", -50000], ["", 0], ["-1.200.000", -1200000], ["300k+150k", 450000], ["-20k-30k", -50000],
 ["165,645", 810000], ["165, 645", 810000], ["-165,645", -810000], ["165,645-10", 800000], ["1,5tr", 1500000], ["-1,5tr", -1500000],
 ["165k,645k", 810000], ["20,30,50", 100000], ["165;645", 810000], ["165,", 165000]]
  .forEach(([s, v]) => ok(P(s) === v, "1. \"" + s + "\" = " + P(s)));

// 2. Mở 💰, chưa gõ gì
els.btnMoney.onclick();
const base = ev("calcMoney()");
ok(base.balQ === 120001 && base.balS === 100000 && base.smsDue === 75000, "2. chưa gõ: TK QR " + base.balQ + ", TK SMS " + base.balS + " (100k+20k+1đ; chỉ đã ck 100k, chưa ck 75k để riêng)");

// 3. Gõ âm vào TK QR, dương vào TK SMS
type("mAq", "-50k");
type("mAs", "30k");
let c = ev("calcMoney()");
ok(c.balQ === base.balQ - 50000 && c.balS === base.balS + 30000, "3. TK QR −50k, TK SMS +30k");
ok(c.net === base.net - 20000, "3. được hưởng giảm 20k: " + base.net + " → " + c.net);
ok(/−50k \(cộng\/trừ\)/.test(els.monBody.innerHTML) && /\+30k \(cộng\/trừ\)/.test(els.monBody.innerHTML), "3. bảng có ghi chú cộng/trừ");
ok(JSON.parse(store.ship_money).adjQ === "-50k", "3. đã lưu (đồng bộ được)");

// 4. Nút ± đổi dấu
pmQ.onclick();
ok(els.mAq.value === "50k" && ev("calcMoney()").balQ === base.balQ + 50000, "4. bấm ± ở QR: -50k → 50k");
pmS.onclick();
ok(els.mAs.value === "-30k" && ev("calcMoney()").balS === base.balS - 30000, "4. bấm ± ở SMS: 30k → -30k");
type("mAq", ""); pmQ.onclick();
ok(els.mAq.value === "-", "4. ô trống bấm ± thì có sẵn dấu trừ để gõ tiếp");
type("mAq", "-15k");
ok(ev("calcMoney()").balQ === base.balQ - 15000, "4. gõ tiếp thành -15k");

// 5. Sao chép
(async () => {
  await els.monCopy.onclick();
  ok(clip.includes("−15k cộng/trừ") && clip.includes("−30k cộng/trừ"), "5. sao chép có cộng/trừ:\n" + clip);

  // 6. Mở lại 💰: giữ số đã gõ; bảng tiền cũ không có ô mới vẫn tính đúng
  els.btnMoney.onclick();
  ok(els.mAq.value === "-15k" && els.mAs.value === "-30k", "6. mở lại vẫn còn số đã gõ");
  boot({ ship_orders: JSON.stringify([O(1, 100000, 20000, true, "qr")]), ship_money: JSON.stringify({ day: T, cs: {}, ce: {}, debt: "", buy: "", wq: "10k", ws: "" }) });
  els.btnMoney.onclick();
  const c2 = ev("calcMoney()");
  ok(c2.balQ === 120001 - 10000 && els.mAq.value === "", "6. bảng tiền cũ (chưa có ô cộng/trừ) tính như trước");
  console.log(fail ? fail + " lỗi" : "Tất cả OK"); process.exit(fail ? 1 : 0);
})();
