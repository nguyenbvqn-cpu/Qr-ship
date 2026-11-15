// Cache để mở nhanh và chạy khi mất mạng
const V = "qr-ship-v7";
const CORE = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  const isLib = /qrcode-generator|supabase-js/.test(u.href);
  if (u.origin !== location.origin && !isLib) return;
  // Trang chính: lấy bản mới từ mạng trước, mất mạng mới dùng bản lưu
  if (r.mode === "navigate" || u.pathname.endsWith(".html") || u.pathname.endsWith("/")) {
    e.respondWith(
      fetch(r).then(res => {
        const cp = res.clone();
        caches.open(V).then(c => c.put(r, cp));
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(h => h || caches.match("index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(hit => {
      const net = fetch(r)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const cp = res.clone();
            caches.open(V).then(c => c.put(r, cp));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
