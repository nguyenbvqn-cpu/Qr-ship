// Chạy mọi bài thử: node tests/run-all.js   (cần Node.js; không cần cài thêm gì)
// Mỗi bài thử đọc index.html, chạy code của app trong một DOM giả và in OK/FAIL.
// Chạy riêng một bài: node tests/test-parse.js index.html
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");
const html = path.join(__dirname, "..", "index.html");
const files = fs.readdirSync(__dirname).filter(f => /^test-.*\.js$/.test(f)).sort();
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(__dirname, f), html], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || ""), last = out.trim().split("\n").pop();
  const pass = r.status === 0;
  if (!pass) bad++;
  console.log((pass ? "OK   " : "LỖI  ") + f.padEnd(16) + (pass ? "" : last));
  if (!pass) console.log(out.split("\n").filter(l => /^FAIL|Error/.test(l)).map(l => "      " + l).join("\n"));
}
console.log(bad ? bad + "/" + files.length + " bài thử có lỗi" : "Tất cả " + files.length + " bài thử OK");
process.exit(bad ? 1 : 0);
