-- QR ship: bảng lưu dữ liệu online.
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ → Run. Chỉ cần chạy 1 lần.
-- Chạy lại cũng không sao: không xóa, không ghi đè dữ liệu đang có.

create table if not exists public.ship_kv (
  user_id uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  k       text   not null,            -- "cfg" hoặc "day:YYYY-MM-DD"
  v       jsonb,                      -- nội dung (tài khoản + bảng giá, hoặc đơn + bảng tiền của ngày)
  m       bigint not null default 0,  -- thời điểm sửa (ms); bên nào lớn hơn thì thắng
  primary key (user_id, k)
);

-- Mỗi người đăng nhập chỉ đọc/ghi được dòng của chính mình.
alter table public.ship_kv enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ship_kv' and policyname = 'ship_kv_own'
  ) then
    create policy ship_kv_own on public.ship_kv
      for all to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- Cho người đã đăng nhập dùng bảng qua API; người chưa đăng nhập không có quyền gì.
grant select, insert, update, delete on public.ship_kv to authenticated;
revoke all on public.ship_kv from anon;
