// Máy chủ tĩnh tạm để xem thử giao diện (chỉ localhost)
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");  // thư mục dự án (chứa index.html)
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".png": "image/png", ".webmanifest": "application/manifest+json" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  if (p === "/sw.js") { res.writeHead(404); return res.end(); } // không đăng ký service worker khi xem thử
  const f = path.join(root, path.normalize(p));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { "Content-Type": types[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); res.end(d); });
}).listen(8765, "127.0.0.1");
