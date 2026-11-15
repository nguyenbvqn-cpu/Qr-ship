# QR ship – ghi chú dự án

Web app một trang (PWA) cho người đi ship: tạo QR chuyển khoản, nhắn STK, thu tiền mặt, tổng kết ngày/tháng.
Người dùng nói tiếng Việt, dùng chủ yếu trên điện thoại Android (Chrome). Trả lời người dùng bằng tiếng Việt, ngắn gọn.

## Triển khai
- Toàn bộ app nằm trong `index.html` (HTML + CSS + JS, không build). Kèm `sw.js` (service worker), `manifest.webmanifest`, icon.
- GitHub Pages từ nhánh `main`, thư mục gốc: https://nguyenbvqn-cpu.github.io/Qr-ship/
- Push lên `main` là web tự cập nhật sau 1–2 phút. Khi đổi cách cache, tăng `const V` trong `sw.js`.
- `sw.js`: trang chính lấy mạng trước (network-first), thư viện CDN (qrcode-generator, supabase-js) cache-first.
- Repo public: KHÔNG để số tài khoản, khóa, dữ liệu khách trong mã. Tài khoản nhập trong app (⚙), lưu localStorage.

## Cấu trúc JS trong index.html
- Khối `/*CORE*/ … /*ENDCORE*/`: hàm thuần, test được bằng Node: `buildVietQR` (EMVCo + CRC16), `parseOrder`
  (đọc tin Zalo), bảng giá `CATALOG_DEFAULT`/`setCatalog`/`catalogLine`, `matchBank` (khớp tin biến động số dư),
  `buildMsg` (tin nhắn STK), `amountOf` (= hàng + ship + 1đ lẻ, dùng cho QR), `msgAmountOf` (= hàng + ship).
- Phần còn lại: UI, localStorage, lịch sử, đồng bộ Supabase.
- Hiển thị tiền dùng `mk(v)` (dạng 100k, 3.965k; bỏ phần lẻ < 50đ). Chỉ màn hình QR cho khách hiện số chính xác.

## Nghiệp vụ (người dùng đã chốt)
- Đơn dán từ Zalo: lấy SĐT, tiền hàng, ship (mặc định 20k, nút −/+ bước 5k).
  - "10 luộc 100k" = 10 × 100k; "đơn này / tiền đồ là 165k" = tổng tiền hàng; "65l" là gõ nhầm "65k";
    giá không ghi k trên dòng số lượng ("1 trộn 65") hiểu là nghìn.
  - Không ghi giá thì tra bảng giá (sửa được trong ⚙), dòng trên ưu tiên trước:
    bé/nhỏ 55k · sốt me/me 55k · rút xương/trộn 65k · ớt xanh/cay 75k · lắc/cóc 55k · mắm 55k · to 100k · luộc/thảo quả 100k.
- QR: VietQR, nội dung `QR chan ga - <SĐT>`, số tiền = hàng + ship + 1đ.
- Tin nhắn STK (tài khoản thứ 2) dạng: `95k / STK / Ngân hàng / Tên / Noi dung : SĐT`, không cộng 1đ.
- Tab dưới đáy: Mới / QR / SMS (đã ck/tổng) / TM (tiền mặt). Đơn chưa thu lên đầu; SMS chưa ck: nhắn sau lên trên.
- Tab SMS: dán biến động số dư → khớp theo SĐT hoặc tên người chuyển (chữ IN HOA), rồi theo số tiền; trùng số tiền thì cho chọn.
- Dán đơn trùng (SĐT hoặc nội dung) → hỏi xác nhận. Thu QR xong → về tab Mới.
- 💰 Tiền: đếm số tờ 500k…5k đầu/cuối ngày. Được hưởng = (cuối − đầu) + mua đồ − nợ + số dư TK QR + số dư TK SMS;
  số dư TK QR = QR đã thu − rút QR; số dư TK SMS = SMS đã ck + chưa ck − rút SMS.
- 📊 Tổng: QR/SMS/TM, tiền hàng, ship (+ ship chưa thu), chưa thu. 📅 Lịch sử: theo ngày, tổng tháng.
- Sang ngày mới: đơn + bảng tiền ngày cũ cất vào `ship_hist` (không xóa). Ảnh chỉ giữ trong ngày.

## Lưu trữ
- localStorage: `ship_orders`, `ship_hist`, `ship_money`, `ship_cfgQ`, `ship_cfgB`, `ship_catalog`, `ship_photos`, `ship_tab`,
  `ship_sb` (URL + anon key Supabase), `ship_mtime` (thời điểm sửa từng khóa đồng bộ).
- Đồng bộ Supabase (tùy chọn, đăng nhập email): bảng `ship_kv(user_id, k, v jsonb, m bigint)` có RLS theo `auth.uid()`.
  Khóa `cfg` và `day:YYYY-MM-DD`; bên có `m` lớn hơn thắng. Đồng bộ khi sửa (1,5 giây), khi mở lại app, mỗi 30 giây.
  Trạng thái: người dùng có thể chưa tạo project Supabase / chưa chạy SQL.

## Cách kiểm tra
- Không có test tự động. Cách đã dùng: tách khối CORE chạy bằng Node để thử `parseOrder`/`matchBank`/`buildVietQR`
  với các tin mẫu thật; giả lập DOM tối thiểu để bấm thử luồng UI. Chạy `node --check` cho phần script trước khi push.
- Không dùng `alert/confirm/prompt`: tự làm hộp thoại trong trang.
