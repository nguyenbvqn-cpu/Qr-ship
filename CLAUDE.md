# QR ship – ghi chú dự án

Web app một trang (PWA) cho người đi ship: tạo QR chuyển khoản, nhắn STK, thu tiền mặt, tổng kết ngày/tháng.
Người dùng nói tiếng Việt, dùng chủ yếu trên điện thoại Android (Chrome). Trả lời người dùng bằng tiếng Việt, ngắn gọn.

## Triển khai
- Toàn bộ app nằm trong `index.html` (HTML + CSS + JS, không build). Kèm `sw.js` (service worker), `manifest.webmanifest`, icon.
- GitHub Pages từ nhánh `main`, thư mục gốc: https://nguyenbvqn-cpu.github.io/Qr-ship/
- Push lên `main` là web tự cập nhật sau 1–2 phút. Khi đổi cách cache, tăng `const V` trong `sw.js`.
- `sw.js`: trang chính lấy mạng trước (network-first), thư viện CDN (qrcode-generator, supabase-js) cache-first.
- Repo public: KHÔNG để số tài khoản, khóa bí mật, dữ liệu khách trong mã. Tài khoản nhập trong app (⚙), lưu localStorage.
  Ngoại lệ đã thống nhất: Supabase URL + publishable key (`SB_URL`, `SB_KEY` ở `<script>` đầu trang) — loại công khai được,
  dữ liệu khóa bằng RLS. Tuyệt đối không đưa `sb_secret_…` hay Google Client Secret vào mã.
- App bị khóa: máy chưa có phiên đăng nhập Google (`localStorage` khóa `sb-<ref>-auth-token`) thì `html.locked` che toàn
  bộ app bằng `#lock`. Script ở `<head>` đặt class trước khi vẽ trang; `paintLock()` cập nhật theo `sbUser`/phiên đã lưu.
  Mất mạng mà còn phiên đã lưu thì vẫn mở app. Đây chỉ là khóa giao diện; bảo vệ dữ liệu thật là RLS + chỉ 1 tài khoản.

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
  - "ck/thu/cod 150k" = tổng tiền khách trả (hàng = tổng − ship). Các từ này chỉ tính khi đứng riêng; không dùng `\b`
    trong regex vì JS coi chữ có dấu là ranh giới ("1 luôck 100k" từng bị hiểu là "ck 100k").
    "20k ship" = ship 20k, nhưng "100k ship 25k" thì 100k là tiền hàng.
  - Không ghi giá thì tra bảng giá (sửa được trong ⚙), dòng trên ưu tiên trước:
    bé/nhỏ 55k · sốt me/me 55k · rút xương/trộn 65k · ớt xanh/cay 75k · lắc/cóc 55k · mắm 55k · to 100k · luộc/thảo quả 100k.
- QR: VietQR, nội dung `QR chan ga - <SĐT>`, số tiền = hàng + ship + 1đ.
- Tin nhắn STK (tài khoản thứ 2) dạng: `95k / STK / Ngân hàng / Tên / Noi dung : SĐT`, không cộng 1đ.
- Tab dưới đáy: Mới / QR / SMS (đã ck/tổng) / TM (tiền mặt). Đơn chưa thu lên đầu; tab SMS: nhắn sau lên trên (cả chưa ck lẫn đã ck,
  theo `msgAt`), không có nút ▲▼. Nút "Nhắn lại" ở tab SMS chỉ nhắn "Alo" (`REMIND`, người dùng yêu cầu), không gửi
  lại STK, không cần tài khoản ở ⚙ và không đổi `msgAt` (đơn không nhảy chỗ).
  Bấm nhắn tin KHÔNG hiện thông báo "Đã sao chép…" (người dùng thấy phiền, nó còn che màn hình khi quay lại): app Tin
  nhắn đã mở sẵn nội dung. Tin STK vẫn chép lặng lẽ vào bộ nhớ; chỉ khi chép lỗi mới hiện thông báo + "Sao chép lại".
  "Alo" không chép. Mọi thông báo tắt khi rời app (`visibilitychange` hidden) hoặc khi chạm vào nó.
- Tab SMS: dán biến động số dư → khớp theo SĐT hoặc tên người chuyển (chữ IN HOA), rồi theo số tiền; trùng số tiền thì cho chọn.
- Dán đơn trùng (SĐT hoặc nội dung) → hỏi xác nhận. Thu QR xong → về tab Mới.
- 💰 Tiền: đếm số tờ 500k…5k đầu/cuối ngày. Được hưởng = (cuối − đầu) + mua đồ − nợ + số dư TK QR + số dư TK SMS
  + SMS chưa ck; số dư TK QR = QR đã thu − rút QR + cộng/trừ QR; số dư TK SMS = SMS đã ck − rút SMS + cộng/trừ SMS
  (đúng tiền thật trong TK; người dùng yêu cầu: đã ck 810k + cộng 2.700k phải ra 3.510k). "SMS chưa ck" là dòng đỏ
  riêng ngay dưới, vẫn cộng vào được hưởng (tổng không đổi so với trước).
  Thẻ đầu tab SMS: "Đã ck x / tổng" chỉ cộng đơn; khi có cộng/trừ SMS hoặc rút SMS thì thêm dòng "Số dư TK SMS" = `balS`
  (người dùng thấy "Đã ck" vẫn 810k nên hỏi). Đóng 💰 thì `render()` lại để dòng này cập nhật.
  Mọi ô tiền trong 💰 (nợ, mua đồ, rút, cộng/trừ) đọc bằng `parseSigned`: gõ được số âm ("-50k", "30k-10k"), ô cộng/trừ
  (`adjQ`, `adjS`) có nút ± đổi dấu vì bàn phím khó gõ "-". Dấu phẩy là CỘNG (người dùng yêu cầu): "165,645" = 165k + 645k,
  "-165,645" = trừ cả hai; "1,5tr" vẫn là 1,5 triệu; số có đuôi ",000" ("1,200,000") vẫn là một số.
  Chỗ khác (tiền hàng trong đơn, `parseMoney`) vẫn coi "165,645" là 165.645đ.
  Không cần "chốt số": đầu ngày tự lấy số tờ cuối ngày của ngày gần nhất trước đó có đếm (`carryStart`, cờ `csFrom`),
  tự cập nhật nếu sửa cuối ngày hôm trước, cho tới khi người dùng tự sửa cột đầu ngày (`csManual`).
- 💰 "Tổng tiền" gộp cả bảng tổng (người dùng yêu cầu, bỏ nút 📊 riêng): đầu bảng là tổng kết (`paintSum`: QR/SMS/TM,
  tiền hàng, ship + ship chưa thu, chưa thu), dưới là "Tiền được hưởng" (đếm tờ, nợ, mua đồ…). 2 nút sao chép: tổng / tiền.
- 📅 chỉ còn bảng tiền ship theo tháng (`paintShip`; bảng "Theo ngày" người dùng thấy thừa nên đã bỏ): Ngày | Đơn |
  Ship | Thực nhận. Ship = ship MỌI đơn theo đơn, kể cả đơn chưa thu; đơn chưa thu chỉ ghi "n đơn chưa thu" (dưới ngày).
  Thực nhận = "Được hưởng" ở 💰 của ngày đó (`dayNet` → `calcMoney(orders, money)`), vì khách bo thêm nên tiền thật
  khác tiền ship (người dùng yêu cầu: ship 500k nhưng thực nhận 520k). Ngày chưa đếm cuối ngày (`counted`: chưa ô
  cuối ngày nào có số) ghi "chưa đếm", không cộng vào tổng; đầu ngày chưa sửa tay thì lấy cuối ngày trước như `carryStart`.
  Dòng to ở đầu là "Thực nhận (đếm tiền)"; "Trung bình 1 ngày" tính theo thực nhận các ngày đã đếm.
  Bấm ngày xem mức ship + từng đơn (`shipDet`: SĐT, cách thu, hàng, ship, số tiền thu, nội dung đơn bỏ dòng "Sdt:")
  và nút mở ngày đó để sửa. Đơn chưa thu có nút "Mở đơn: nhắn nhắc / xác nhận đã thu" (`data-go`, `goOrder`, người dùng
  yêu cầu): mở ngày đó nếu khác ngày đang mở, sang đúng tab, cuộn tới thẻ đơn, tô viền vàng 5 giây (`flashId`);
  đơn ở tab Mới thì mở sẵn ⋯ để thấy "Đã thu QR".
- Sang ngày mới: đơn + bảng tiền ngày cũ cất vào `ship_hist` (không xóa). Ảnh chỉ giữ trong ngày.
- Nhập/sửa đơn ngày đã qua: 📅 → chọn ngày → "Mở ngày" (hoặc nút trong ngày đang mở rộng). `WORKDAY` đè lên `today()`;
  `loadDay()` cất ngày đang mở vào `ship_hist` rồi lấy ngày cần mở RA KHỎI `ship_hist` (để sửa/xóa không bị bản cũ đè).
  Thanh vàng + header cam khi đang mở ngày cũ; "Về hôm nay" hoặc mở lại app là về hôm nay (`WORKDAY` không lưu;
  `loadDay()` lúc khởi động lấy lại đơn hôm nay nếu đang nằm trong lịch sử). Không cho mở ngày tương lai.

## Lưu trữ
- localStorage: `ship_orders`, `ship_hist`, `ship_money`, `ship_cfgQ`, `ship_cfgB`, `ship_catalog`, `ship_photos`, `ship_tab`,
  `ship_sb` (URL + anon key Supabase), `ship_mtime` (thời điểm sửa từng khóa đồng bộ).
- Đồng bộ Supabase (tùy chọn, đăng nhập Google): bảng `ship_kv(user_id, k, v jsonb, m bigint)` có RLS theo `auth.uid()`.
  Chỉ một người dùng (chủ app). Người dùng không muốn đăng nhập email/mật khẩu; đã chọn Google thay vì bỏ hẳn đăng nhập
  (bỏ hẳn thì key thành mật khẩu duy nhất cho SĐT khách + số TK). `signInWithOAuth` google, flowType implicit,
  redirectTo = trang hiện tại; khi quay lại app (visibilitychange) đọc lại phiên.
  Khóa `cfg` và `day:YYYY-MM-DD`; bên có `m` lớn hơn thắng. Đồng bộ khi sửa (1,5 giây), khi mở lại app, mỗi 30 giây.
  SQL tạo bảng + RLS + grant: `supabase.sql` (chạy 1 lần trong SQL Editor; project mới của Supabase có thể không tự
  cấp quyền Data API cho bảng mới nên file có `grant` rõ ràng).
  Trạng thái (15/11/2026): đã tạo project Supabase `qr-ship`, đã chạy `supabase.sql`, Site URL = trang GitHub Pages,
  Redirect URLs có `https://nguyenbvqn-cpu.github.io/Qr-ship/**`. Google provider cần OAuth client của Google Cloud
  (redirect URI `https://<project>.supabase.co/auth/v1/callback`); để consent screen ở chế độ Testing với email chủ app
  là test user để chỉ người đó đăng nhập được. Google Cloud project `qr-ship` đã tạo, Google provider đã bật.
  Supabase đã tắt "Allow new users to sign up" (16/11/2026) sau khi chủ app có tài khoản Google: không ai tạo thêm
  tài khoản được. Muốn thêm máy/người khác dùng chung thì phải bật lại tạm thời.

## Cách kiểm tra
- Không có test tự động. Cách đã dùng: tách khối CORE chạy bằng Node để thử `parseOrder`/`matchBank`/`buildVietQR`
  với các tin mẫu thật; giả lập DOM tối thiểu để bấm thử luồng UI. Chạy `node --check` cho phần script trước khi push.
- Không dùng `alert/confirm/prompt`: tự làm hộp thoại trong trang.
