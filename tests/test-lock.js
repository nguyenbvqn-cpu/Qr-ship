// Giả lập DOM tối thiểu + supabase giả để thử màn hình khóa / đăng nhập Google trong index.html
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync(process.argv[2], "utf8");
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]);
const code = scripts.join("\n;\n");
const TOKEN = "sb-tkjfswyytbvitvlehnxp-auth-token";

function mkEl(id, opts) {
  const kids = [];
  return {
    id, value: "", textContent: "", innerHTML: "", checked: false, disabled: false, dataset: {}, style: {},
    children: kids, childNodes: kids, options: [], files: [],
    classList: { _s: new Set(), add(...c) { c.forEach(x => this._s.add(x)) }, remove(...c) { c.forEach(x => this._s.delete(x)) },
      toggle(c, f) { const on = f === undefined ? !this._s.has(c) : !!f; on ? this._s.add(c) : this._s.delete(c); return on }, contains(c) { return this._s.has(c) } },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { kids.push(c); if (c && (c.onload || c.onerror)) setTimeout(() => (opts && opts.libFails ? c.onerror && c.onerror() : c.onload && c.onload()), 0); return c },
    append() {}, prepend() {}, remove() {}, insertBefore(c) { return c }, replaceChildren() {}, setAttribute() {}, getAttribute() { return null },
    querySelector() { return mkEl("q") }, querySelectorAll() { return [] }, closest() { return null }, focus() {}, blur() {}, click() {},
    select() {}, scrollIntoView() {}, scrollTo() {}, getContext() { return new Proxy({}, { get: () => () => {} }) },
    getBoundingClientRect() { return { top: 0, left: 0, width: 100, height: 100 } }, cloneNode() { return mkEl(id + "c") },
  };
}

const calls = [];
let fakeSession = null, store = {}, authCb = null;
function makeSb(opts) {
  return {
    auth: {
      getSession: async () => {
        if (opts.callback && opts.callbackSession) { fakeSession = opts.callbackSession; store[TOKEN] = "{}"; }
        if (opts.revoked) { delete store[TOKEN]; fakeSession = null; }
        return { data: { session: fakeSession }, error: opts.sessionError ? { message: opts.sessionError } : null };
      },
      onAuthStateChange: cb => { authCb = cb; return { data: { subscription: { unsubscribe() {} } } } },
      signInWithOAuth: async a => { calls.push(["oauth", a]); return { data: {}, error: null } },
      signOut: async a => { calls.push(["signOut", a]); if (opts.offline) return { error: { message: "Failed to fetch" } }; delete store[TOKEN]; fakeSession = null; return { error: null } },
    },
    from: () => ({
      select: c => { calls.push(["select", c]); const q = Promise.resolve({ data: [], error: null }); q.in = async () => ({ data: [], error: null }); return q },
      upsert: async rows => { calls.push(["upsert", rows.map(r => r.k)]); return { error: null } },
    }),
  };
}

let els, doc;
function run(opts) {
  opts = opts || {};
  els = {}; calls.length = 0; authCb = null;
  store = Object.assign({}, opts.store || {});
  fakeSession = opts.session || null;
  doc = {
    getElementById: id => els[id] || (els[id] = mkEl(id)), createElement: t => mkEl("new-" + t, opts),
    querySelector: () => mkEl("q"), querySelectorAll: () => [], addEventListener() {}, body: mkEl("body"), head: mkEl("head", opts),
    documentElement: mkEl("html"), hidden: false, activeElement: null,
  };
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) }, removeItem: k => { delete store[k] } };
  const win = {};
  if (!opts.libFails) win.supabase = { createClient: (u, k, o) => { calls.push(["createClient", u, k, o && o.auth && o.auth.flowType]); return makeSb(opts) } };
  const ctx = {
    document: doc, localStorage, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
    navigator: { clipboard: { writeText: async () => {} } },
    location: { origin: "https://nguyenbvqn-cpu.github.io", pathname: "/Qr-ship/", hash: opts.callback ? "#access_token=abc&type=bearer" : "", reload() {}, href: "https://nguyenbvqn-cpu.github.io/Qr-ship/" },
    alert() {}, confirm: () => true, prompt: () => null, fetch: async () => ({ ok: true, json: async () => ({}) }),
    Image: function () { return mkEl("img") }, URL, Date, Math, JSON, Promise, Set, Map, Intl, TextEncoder, Uint8Array, Array, Object, String, Number,
    requestAnimationFrame: f => setTimeout(f, 0), matchMedia: () => ({ matches: false, addEventListener() {} }), innerWidth: 400, innerHeight: 800,
    getComputedStyle: () => ({}), scrollTo() {}, history: { replaceState() {} }, addEventListener() {}, removeEventListener() {},
  };
  ctx.window = Object.assign(win, ctx);
  ctx.self = ctx.window;
  vm.createContext(ctx);
  vm.runInContext(code, ctx, { filename: "app.js" });
  return ctx;
}
const locked = () => doc.documentElement.classList.contains("locked");
const tick = () => new Promise(r => setTimeout(r, 30));
let fail = 0;
const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + " " + m); if (!c) fail++ };
const SESSION = { user: { id: "u1", email: "chu@gmail.com" } };

(async () => {
  console.log("inline scripts:", scripts.length);

  // 1. Người lạ mở web lần đầu: khóa ngay từ đầu, bấm nút -> sang Google
  run({});
  ok(locked(), "1. chưa đăng nhập: khóa ngay khi mở (trước khi tải thư viện)");
  await tick(); await tick();
  ok(locked(), "1. sau khi tải xong vẫn khóa");
  ok(/Đăng nhập Google/.test(els.lockMsg.textContent), "1. lời nhắc: " + els.lockMsg.textContent);
  await els.lockBtn.onclick(); await tick();
  const oc = calls.find(c => c[0] === "oauth");
  ok(oc && oc[1].provider === "google" && oc[1].options.redirectTo === "https://nguyenbvqn-cpu.github.io/Qr-ship/", "1. nút khóa -> Google, quay về đúng trang");
  ok(calls.some(c => c[0] === "createClient" && c[1] === "https://tkjfswyytbvitvlehnxp.supabase.co" && c[3] === "implicit"), "1. dùng URL/key gắn sẵn, không cần nhập");

  // 2. Google trả về (#access_token): hiện "Đang đăng nhập…", rồi mở khóa + đồng bộ
  run({ callback: true, callbackSession: SESSION });
  ok(locked() && els.lockMsg.textContent === "Đang đăng nhập…" && els.lockBtn.classList.contains("hidden"), "2. lúc quay về: 'Đang đăng nhập…', ẩn nút");
  await tick(); await tick();
  ok(!locked(), "2. có phiên -> mở khóa");
  ok(/chu@gmail.com/.test(els.sbWho.textContent), "2. ⚙ hiện email: " + els.sbWho.textContent);
  ok(calls.some(c => c[0] === "select"), "2. đồng bộ chạy");

  // 3. Chủ app mở lại (đã có phiên lưu): không khóa ngay từ đầu, không nháy màn khóa
  run({ store: { [TOKEN]: "{}" }, session: SESSION });
  ok(!locked(), "3. đã đăng nhập: mở thẳng app");
  await tick(); await tick();
  ok(!locked(), "3. sau khi tải vẫn mở");

  // 4. Mất mạng, thư viện không tải được, nhưng máy còn phiên -> vẫn dùng được app
  run({ store: { [TOKEN]: "{}" }, libFails: true });
  await tick(); await tick();
  ok(!locked(), "4. mất mạng + còn phiên -> vẫn mở app");

  // 5. Mất mạng, chưa từng đăng nhập -> khóa, báo lỗi mạng
  run({ libFails: true });
  await tick(); await tick();
  ok(locked() && /mạng/.test(els.lockErr.textContent), "5. mất mạng + chưa đăng nhập -> khóa, báo: " + els.lockErr.textContent);

  // 6. Phiên bị thu hồi trên server -> khóa lại
  run({ store: { [TOKEN]: "{}" }, revoked: true });
  await tick(); await tick();
  ok(locked(), "6. phiên bị thu hồi -> khóa");

  // 7. Đăng xuất (có mạng) -> khóa
  run({ store: { [TOKEN]: "{}" }, session: SESSION });
  await tick(); await tick();
  await els.sbLogout.onclick(); await tick();
  ok(locked() && !(TOKEN in store), "7. đăng xuất -> xóa phiên, khóa lại");

  // 8. Đăng xuất lúc mất mạng (signOut lỗi) -> vẫn xóa phiên và khóa
  run({ store: { [TOKEN]: "{}" }, session: SESSION, offline: true });
  await tick(); await tick();
  await els.sbLogout.onclick(); await tick();
  ok(locked() && !(TOKEN in store), "8. đăng xuất khi mất mạng -> vẫn khóa");

  // 9. Sự kiện SIGNED_OUT từ thư viện (vd. hết hạn) -> khóa
  run({ store: { [TOKEN]: "{}" }, session: SESSION });
  await tick(); await tick();
  delete store[TOKEN]; authCb && authCb("SIGNED_OUT", null);
  ok(locked(), "9. thư viện báo SIGNED_OUT -> khóa");

  console.log(fail ? fail + " lỗi" : "Tất cả OK");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("LỖI:", e); process.exit(1) });
