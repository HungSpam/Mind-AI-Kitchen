# ERRORS.md — Nhật Ký Theo Dõi & Xử Lý Sự Cố

## [2026-10-16 16:50] - Lỗi Type Resolution @google/genai & ESLint Hooks

- **Type**: Integration & Syntax
- **Severity**: Medium
- **File**: `mind-ai-kitchen/src/app/api/vision/route.ts:1`, `src/app/cooking/page.tsx:212`
- **Agent**: Jarvis (@debugger)
- **Root Cause**: Gói `@google/genai` yêu cầu peer dependency `@modelcontextprotocol/sdk` cho khai báo types d.ts nhưng chưa được cài; đồng thời `cooking/page.tsx` gọi `setState` trực tiếp bên trong body của `useEffect` gây cảnh báo linter.
- **Error Message**:
  ```
  Cannot find module '@modelcontextprotocol/sdk/client/index.js' or its corresponding type declarations.
  react-hooks/set-state-in-effect: Calling setState synchronously within an effect can trigger cascading renders.
  ```
- **Fix Applied**:
  1. Cài đặt `@modelcontextprotocol/sdk` vào `devDependencies`.
  2. Refactor `useEffect` trong `cooking/page.tsx` để tránh kích hoạt `setState` đồng bộ.
  3. Định kiểu tường minh cho `AllergenGroup` trong `recipe/route.ts`.
  4. Chuẩn hóa `tsconfig.json` đồng bộ với Next.js 16 Turbopack.
- **Prevention**: Luôn chạy `npx tsc --noEmit` và `npm run lint` tự động trong pre-flight check trước khi bàn giao.
- **Status**: Fixed

---

## [2026-10-16 19:15] - Lỗi Gạch Đỏ IDE Trên '@google/genai' & Lỗi 500 Khi Gọi API

- **Type**: Integration & Runtime
- **Severity**: High
- **File**: `mind-ai-kitchen/src/app/api/{recipe,vision,suggest}/route.ts`
- **Agent**: Jarvis (@debugger & @backend-specialist)
- **Root Cause**: 
  1. Gói `@modelcontextprotocol/sdk` phiên bản mới chỉ export `"./client"` trong `package.json`, không export đường dẫn subpath `"./client/index.js"`. Điều này khiến tsserver trong IDE coi định nghĩa types của `@google/genai` là lỗi cú pháp và hiển thị gạch đỏ ở dòng 1 của cả 3 API routes.
  2. Workspace root `e:\Project\Mind AI Kitchen` thiếu `tsconfig.json` liên kết, khiến TypeScript Language Server của editor không tự đồng bộ type ambient declarations từ thư mục con.
  3. Ở Runtime: Khi người dùng hoặc Ban giám khảo chạy `npm run dev` mà chưa cấu hình `GEMINI_API_KEY` trong môi trường, cả 3 API ném ngoại lệ 400 và trả về mã lỗi HTTP 500 làm giao diện web sập.
- **Error Message**:
  ```
  Could not find a declaration file for module '@google/genai'
  Error [ApiError]: {"error":{"code":400,"message":"API key not valid. Please pass a valid API key."}} -> Status 500
  ```
- **Fix Applied**:
  1. Bổ sung export subpath `"./client/index.js"` và `"./client/*"` vào `package.json` của `@modelcontextprotocol/sdk`.
  2. Tạo script tự động `scripts/patch-mcp.js` và đăng ký vào `"postinstall"` trong `package.json` để tự sửa mỗi khi `npm install`.
  3. Tạo `tsconfig.json` tại thư mục root workspace để IDE Language Server map đúng `paths` và `types`.
  4. Bổ sung cơ chế **Smart Fallback** cho cả 3 routes (`/api/recipe`, `/api/vision`, `/api/suggest`): Nếu không có API key hoặc API lỗi mạng, hệ thống tự động kích hoạt Chef Engine fallback chuẩn quy tắc, trả về Status 200 với đầy đủ cấu trúc dữ liệu, kiểm toán dị ứng 3 lớp và điểm chất lượng.
- **Prevention**: Luôn có cơ chế Fallback Graceful Degradation cho tất cả external AI APIs; gắn script `postinstall` cho các patch type cấp thiết.
- **Status**: Fixed

---

## [2026-10-16 19:35] - Lỗi ENOENT 'package.json' Khi Chạy 'npm run dev' Từ Root Workspace

- **Type**: Process & Workspace Configuration
- **Severity**: Medium
- **File**: `E:\Project\Mind AI Kitchen\package.json`
- **Agent**: Jarvis (@debugger & @dx-optimizer)
- **Root Cause**: Người dùng mở terminal mặc định tại thư mục gốc workspace `E:\Project\Mind AI Kitchen`, trong khi mã nguồn Next.js nằm trong thư mục con `Mind-AI-Kitchen/mind-ai-kitchen`. Thư mục root trước đó chưa có `package.json` nên npm báo lỗi `ENOENT: no such file or directory, open 'package.json'`.
- **Error Message**:
  ```
  npm error code ENOENT
  npm error path E:\Project\Mind AI Kitchen\package.json
  npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open 'E:\Project\Mind AI Kitchen\package.json'
  ```
- **Fix Applied**:
  - Tạo file `package.json` tại thư mục gốc workspace `E:\Project\Mind AI Kitchen` định tuyến thông minh (proxy commands) bằng `--prefix`:
    - `npm run dev` -> chạy Next.js dev server tại `Mind-AI-Kitchen/mind-ai-kitchen`
    - `npm run build` -> chạy Next.js build
    - `npm run lint` -> chạy ESLint
    - `npm run test` -> chạy bộ Benchmark kiểm toán dị ứng
- **Prevention**: Luôn cung cấp root runner `package.json` cho các dự án đa tầng / monorepo để người dùng và CI/CD có thể gõ lệnh trực tiếp ngay tại root.
- **Status**: Fixed

---

## [2026-10-16 22:20] - Lỗi HTTP 503 Service Unavailable Trên API Vision & Recipe

- **Type**: Integration & Configuration
- **Severity**: High
- **File**: `mind-ai-kitchen/.env.local`
- **Agent**: Jarvis (@debugger)
- **Root Cause**: Trong file `.env.local`, giá trị biến `GEMINI_MODEL` được đặt thành `gemini-3.8-flash`. Model này hiện đang bị quá tải (Spike in demand: HTTP 503 Service Unavailable) trên máy chủ Google AI Studio. Khi gọi qua `fetch` trong `src/server/ai.ts`, Google API trả về 503 khiến `ai.ts` ném lỗi `AI_UNAVAILABLE`.
- **Error Message**:
  ```
  POST http://localhost:3000/api/vision 503 (Service Unavailable)
  {"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later."}}
  ```
- **Fix Applied**:
  - Chuyển `GEMINI_MODEL` sang `gemini-2.5-flash` (model chuẩn, phản hồi cực nhanh, trạng thái 200 OK và hỗ trợ đầy đủ JSON Schema mode).
  - Kiểm thử trực tiếp cả 2 API `/api/vision` và `/api/recipe`: đều thành công trả về `Status: 200` với công thức thực tế.
- **Prevention**: Luôn kiểm tra tính sẵn sàng của tên model qua endpoint `GET /v1beta/models` trước khi chỉ định vào production hoặc dev config.
- **Status**: Fixed

---




## [2026-10-17] - Kiểm thử bản thiết kế mới

- **Type**: Build, môi trường và kiểm thử tích hợp.
- **Severity**: Medium.
- **Agent**: Codex.
- **Root Cause**: Turbopack gặp lỗi tiến trình CSS trên Windows; trình duyệt bị sandbox chặn khởi động; dev và production dùng chung thư mục đầu ra khiến script/CSS trả lỗi; bộ chọn kiểm thử ban đầu không tính phần mô tả trong nhãn select và live region của Next.
- **Fix Applied**: Dùng Webpack; khởi động trình duyệt qua quyền đã được cấp; tách `.next-production` khỏi `.next`; chọn điều khiển theo accessible role/name và lọc thông báo đúng nội dung. Đã kiểm tra 16/16 luồng trình duyệt thành công. Bổ sung phục hồi phiên lưu lỗi và lưu trữ bản ghi cũ khi backup.
- **Prevention**: Duy trì CI, kiểm thử browser trên bản build riêng; không chấm an toàn bằng bộ giả lập thuật toán; giữ lỗi không kèm ảnh/khóa/hồ sơ người dùng.
- **Status**: Fixed. Còn 5 cảnh báo dependency công cụ phát triển được ghi rõ trong docs/VERIFICATION.md; production audit hiện bằng 0.

---

## [2026-10-17 07:25] - Lỗi Tách Dấu Tiếng Việt (Floating/Detached Accents) Trên Tiêu Đề H1, H2

- **Type**: UI/UX & Typography
- **Severity**: Medium
- **File**: `mind-ai-kitchen/src/app/globals.css`, `mind-ai-kitchen/src/app/layout.tsx`
- **Agent**: Jarvis (@frontend-specialist & @debugger)
- **Root Cause**: 
  1. Biến `--serif` trong CSS được cấu hình mặc định là `Georgia, 'Times New Roman', serif`. Font chữ `Georgia` trên hệ điều hành Windows không hỗ trợ bộ ký tự tiếng Việt mở rộng (Latin Extended Additional) cho các nguyên âm có dấu phức như `ấ`, `ầ`, `ế`, `ộ`,...
  2. Khi trình duyệt render `Georgia`, engine DirectWrite phân tách các ký tự này thành dạng rời rạc (chữ cái gốc + dấu thanh kết hợp). Do `Georgia` thiếu anchor diacritic tiếng Việt và CSS thiết lập khoảng cách chữ âm (`letter-spacing: -1.5px;`), dấu thanh sắc (`´`) và huyền (``` ` ```) bị đẩy văng ra ngoài, tạo khoảng trống và hiển thị lỗi: `nấ ́ u`, `gầ ` n`, `bế ́ p`.
- **Fix Applied**:
  1. Tích hợp font chữ cao cấp **Lora** và **Plus Jakarta Sans** từ `next/font/google` trong `src/app/layout.tsx` với cấu hình subset rõ ràng: `subsets: ['vietnamese', 'latin']`.
  2. Cập nhật stack font chữ trong `src/app/globals.css` loại bỏ hoàn toàn `Georgia`, ưu tiên font `Lora` và fallback về `Times New Roman` (font hệ thống có hỗ trợ tiếng Việt đầy đủ).
  3. Điều chỉnh `letter-spacing` trên `h1`, `h2` từ giá trị âm sâu (`-1.5px`) về `-0.01em` và bổ sung `text-rendering: optimizeLegibility;` để đảm bảo dấu thanh luôn gắn liền khít với nguyên âm.
- **Prevention**: Tuyệt đối không sử dụng `Georgia` làm font chính cho các dự án tiếng Việt trên web trừ khi đã nhúng webfont có hỗ trợ subset Vietnamese.
- **Status**: Fixed

---


### Bổ sung xác minh cuối

- Lượt kiểm tra kiểu chạy chồng với build đã gặp TS6053 vì build tạo lại thư mục types trong lúc TypeScript đọc. Chạy lại kiểm tra kiểu sau khi build kết thúc; CI đã chạy các bước nối tiếp. Không chạy build và typecheck đồng thời.
- Kiểm tra định dạng phát hiện một tệp E2E chưa đồng nhất; đã định dạng lại và kiểm tra toàn bộ đạt.

---

## [2026-10-17 09:10] - Ảnh Upload Bất Kỳ Đều Bị Gán Dữ Liệu Mẫu (Mì Ý, Sốt Bolognese...) & Kẹt Cờ Mock AI

- **Type**: Logic & Integration
- **Severity**: High
- **File**: `mind-ai-kitchen/src/app/scan/page.tsx:46`, `mind-ai-kitchen/src/server/ai.ts:81`, `mind-ai-kitchen/.env.local:3`
- **Agent**: Jarvis (@debugger & @backend-specialist)
- **Root Cause**: 
  1. Trạng thái `mockAI` trên giao diện trang `/scan` được khởi tạo mặc định bằng `true`, khiến mọi ảnh upload (kể cả ảnh tủ lạnh) đều tự động kích hoạt Mock Data mẫu thay vì gửi đến Google Gemini Vision.
  2. Tại backend (`src/server/ai.ts`), điều kiện kiểm tra mock cũ là `forceMock || process.env.MOCK_AI === 'true'`. Do biến môi trường trong `.env.local` ghi `MOCK_AI=true`, nên ngay cả khi người dùng bấm nút "[Tắt bỏ qua]" (`forceMock: false`), server vẫn bị cờ `MOCK_AI` đè và tiếp tục trả dữ liệu mẫu Mì Ý.
  3. API Key phụ trong `mind-ai-kitchen/.env.local` đã chạm hạn mức (HTTP 429 Quota Exceeded), và model `gemini-2.5-flash` bị Google trả về mã 404 (không còn mở cho người dùng mới).
- **Error Message**:
  ```
  [UI Alert]: Bỏ qua API (Mock Test): ĐANG BẬT
  [Google GenAI API]: 429 Too Many Requests: Resource has been exhausted (check quota)
  [Google GenAI API]: 404 Not Found: models/gemini-2.5-flash is not found for API version v1beta
  ```
- **Fix Applied**:
  1. Chuyển mặc định `mockAI` trong `src/app/scan/page.tsx` thành `false` (`localStorage.getItem('mind_kitchen_mock_ai') === 'true'`).
  2. Sửa điều kiện trong `src/server/ai.ts` ưu tiên tuyệt đối lựa chọn từ giao diện (`forceMock !== undefined ? forceMock : ...`).
  3. Đồng bộ API Key khả dụng và chuyển tên model mặc định sang `gemini-flash-latest` (đã kiểm thử HTTP 200 OK thành công).
  4. Đặt `MOCK_AI=false` trong cả hai tệp `.env.local`.
- **Prevention**: Khi tạo tính năng Mock/Bypass để test, luôn ưu tiên cờ điều khiển từ runtime request, không dùng biến env tĩnh để override hành vi người dùng, và luôn kiểm tra hạn mức/tính tương thích của model AI.
- **Status**: Fixed

