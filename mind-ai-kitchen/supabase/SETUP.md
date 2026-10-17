# Kết nối Mind AI Kitchen với Supabase và Vercel

Hướng dẫn này chỉ chứa tên biến và đường dẫn lấy cấu hình. Không ghi API key, token hay mật khẩu thật vào file này.

## 1. Biến cần có

| Biến | Bắt buộc | Lấy ở đâu | Ghi chú |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Có | Supabase Dashboard → Project Settings → API / Project URL | URL công khai của project, dạng `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Có | Supabase Dashboard → Project Settings → API Keys → Publishable key | Có thể dùng ở frontend; không dùng Secret key hoặc `service_role` ở đây |
| `GEMINI_API_KEY` | Có cho tính năng AI | Google AI Studio → Get API key | Chỉ dùng phía server; tuyệt đối không thêm tiền tố `NEXT_PUBLIC_` |
| `APP_ORIGIN` | Có | Tự đặt theo môi trường | Local: `http://localhost:3000`; production: domain HTTPS chính thức |
| `UPSTASH_REDIS_REST_URL` | Khuyến nghị cho Vercel | Upstash Console → Redis database → REST API | Dùng rate limiter dùng chung giữa các serverless instances |
| `UPSTASH_REDIS_REST_TOKEN` | Khuyến nghị cho Vercel | Cùng mục REST API của database Upstash | Secret; không gửi hoặc commit lên Git |

`SUPABASE_SERVICE_ROLE_KEY` không cần cho luồng đăng nhập và truy cập dữ liệu thông thường của ứng dụng. Không đặt key này trong biến `NEXT_PUBLIC_*`. Chỉ cấu hình nếu có một tác vụ quản trị phía máy chủ được thiết kế rõ ràng để dùng nó.

## 2. Điền cấu hình local

File `.env.local` đã có trong thư mục dự án và bị Git bỏ qua. Hãy thêm hoặc cập nhật các dòng dưới đây trong file đó; giữ nguyên các biến khác đang dùng, chẳng hạn `GEMINI_API_KEY` và `APP_ORIGIN`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
GEMINI_API_KEY=<gemini-api-key>
APP_ORIGIN=http://localhost:3000
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
```

Sau khi lưu, khởi động lại server phát triển. Không chụp/gửi ảnh có các giá trị key nhìn thấy được.

## 3. Lấy từng API/key

### Supabase

1. Mở project Supabase của Mind AI Kitchen.
2. Vào **Project Settings → API** (Dashboard mới có thể ghi **API Keys**).
3. Sao chép **Project URL** vào `NEXT_PUBLIC_SUPABASE_URL`.
4. Sao chép **Publishable key** vào `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Không dùng hoặc chia sẻ **Secret key** / `service_role` cho cấu hình frontend.

### Gemini

1. Mở [Google AI Studio](https://aistudio.google.com/app/apikey) và đăng nhập Google.
2. Chọn tạo API key, gắn với Google Cloud project nếu được yêu cầu.
3. Sao chép key một lần vào `GEMINI_API_KEY` trong `.env.local` và Vercel. Không đưa key vào source code hay biến `NEXT_PUBLIC_*`.

### Upstash Redis (khuyến nghị cho production trên Vercel)

1. Tạo database Redis trong [Upstash Console](https://console.upstash.com/).
2. Chọn database → mục **REST API**.
3. Sao chép REST URL vào `UPSTASH_REDIS_REST_URL`, REST token vào `UPSTASH_REDIS_REST_TOKEN`.
4. Dùng cùng cặp biến trên local và Vercel. Đừng dùng token trong trình duyệt.

## 4. Cấu hình Vercel

Trong Vercel → project ứng dụng → **Settings → Environment Variables**, tạo các biến sau:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `GEMINI_API_KEY`
- `APP_ORIGIN` = domain production, ví dụ `https://<ten-du-an>.vercel.app` (không thêm dấu `/` ở cuối)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Chọn **Production**; chọn **Preview** nếu cần thử trên preview deployment. Sau khi lưu, redeploy để deployment mới nhận biến. Không cần tạo `SUPABASE_SERVICE_ROLE_KEY` cho cấu hình tiêu chuẩn.

## 5. Supabase Auth redirect URLs

Trong Supabase → **Authentication → URL Configuration**:

- **Site URL**: domain production chính thức.
- **Redirect URLs**: thêm `http://localhost:3000/auth/callback` và `https://<domain-production>/auth/callback`.

Nếu bật Google OAuth, Google Cloud OAuth client phải dùng callback URL do Supabase hiển thị cho Google provider (thường `https://<project-ref>.supabase.co/auth/v1/callback`). Đây không phải callback URL của ứng dụng.

## 6. Áp dụng database migration

Tại thư mục gốc của ứng dụng, chạy Supabase CLI và áp dụng migration đã lưu trong `supabase/migrations/`:

```powershell
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Thay `<project-ref>` bằng phần đứng trước `.supabase.co` trong Project URL. Kiểm tra đúng project trước khi xác nhận lệnh `db push`.

### Thêm công thức mẫu Cộng đồng bằng SQL Editor

Migration đầu tiên tạo các bảng tài khoản/cộng đồng. Để thêm bốn công thức biên tập vào Supabase, chạy riêng file `supabase/migrations/20261017000200_community_featured_recipes.sql` trong **SQL Editor → New query → Run**. Không chạy lại migration đầu tiên đã áp dụng. File này tạo bảng chỉ đọc cho khách chưa đăng nhập và có thể chạy lại an toàn; nó không tạo tài khoản giả và các món được gắn nhãn rõ là công thức mẫu.

Tham khảo tài liệu chính thức: [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Google AI Studio API keys](https://ai.google.dev/gemini-api/docs/api-key), [Upstash Redis REST](https://upstash.com/docs/redis/howto/connect-with-upstash-redis), [Vercel environment variables](https://vercel.com/docs/environment-variables).
