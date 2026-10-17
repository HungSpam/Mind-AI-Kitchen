# Mind Kitchen

Trợ lý nấu ăn tiếng Việt: nhập nguyên liệu hoặc nhận diện ảnh, xác nhận thành phần, tạo công thức theo khẩu vị, nấu từng bước và lưu phản hồi cho lần sau.

Giao diện được thiết kế lại theo hướng sổ bếp: màu giấy ấm, xanh lá đậm, kiểu chữ rõ ràng, điều hướng cố định trên điện thoại, nút dừng giọng đọc luôn có trong chế độ nấu. Không hiển thị điểm “an toàn” do AI tự chấm hoặc công thức mẫu khi dịch vụ lỗi.

## Chạy dự án

Yêu cầu Node.js >=22.12 và npm. Chạy từ thư mục chứa README này:

```sh
npm run setup
```

Sao chép `mind-ai-kitchen/.env.example` thành `mind-ai-kitchen/.env.local`, điền khóa Gemini ở phía máy chủ. Sau đó:

```sh
npm run dev
```

Mở http://localhost:3000. Không có khóa AI vẫn dùng được nhập nguyên liệu, hồ sơ và công thức đã lưu; yêu cầu AI sẽ báo chưa cấu hình. Không dùng khóa với tiền tố `NEXT_PUBLIC_`, không commit `.env.local`.

## Cấu trúc

| Thư mục trong `mind-ai-kitchen` | Trách nhiệm |
| --- | --- |
| `src/app` | Trang ứng dụng và ba API recipe, vision, suggest |
| `src/components` | Khung điều hướng, thông báo, minh họa và thành phần giao diện |
| `src/features/cooking` | Khẩu lệnh, quản lý đọc/nghe và hẹn giờ |
| `src/lib` | Kiểm tra dị ứng, dữ liệu USDA, tính dinh dưỡng, IndexedDB, sao lưu và schema |
| `src/server` | Gọi Gemini, giới hạn yêu cầu, xử lý lỗi và kiểm tra HTTP |
| `src/store` | Trạng thái màn hình, hồ sơ hiện tại và di chuyển dữ liệu phiên cũ |
| `src/types` | Kiểu dữ liệu nghiệp vụ |
| `tests` | Kiểm tra logic, API, lưu trữ, dữ liệu hồi quy và trình duyệt |

Luồng dữ liệu: người dùng xác nhận nguyên liệu → API kiểm tra dữ liệu/dị ứng/hạn mức → Gemini trả cấu trúc → máy chủ kiểm tra lại và tính dinh dưỡng từ dữ liệu tham chiếu → lưu công thức → phản hồi → dùng tối đa 5 phản hồi gần đây trong gợi ý tiếp theo. Mỗi lần mở món hoặc vào bếp, ứng dụng kiểm tra lại với hồ sơ hiện tại.

## Lưu dữ liệu

Công thức, phản hồi, lịch sử hồ sơ và bữa ăn nằm trong **IndexedDB**, có chỉ mục và phiên bản schema. `localStorage` giữ hồ sơ hiện tại và phiên đang mở. Sổ công thức hỗ trợ tìm kiếm, yêu thích, xuất/nhập JSON; nhập không ghi đè phản hồi hoặc hồ sơ hiện tại. Bản ghi cũ không tương thích được giữ trong kho lưu trữ khi sao lưu, không đưa thẳng vào luồng nấu mới.

Đây là cơ sở dữ liệu trên thiết bị, **chưa có tài khoản hoặc đồng bộ máy chủ**. Đổi thiết bị cần xuất/nhập bản sao lưu. Không được giới thiệu tính năng này như đồng bộ đám mây. Xem giới hạn và các điều kiện nghiệm thu tại [đối chiếu report](docs/REPORT-TRACEABILITY.md).

## Kiểm tra

```sh
npm run typecheck
npm run lint
npm --prefix mind-ai-kitchen run format:check
npm test
npm run benchmark
npm run build
```

Kiểm thử trình duyệt chạy trên bản production cục bộ cổng 3100. Trong thư mục `mind-ai-kitchen`, mở máy chủ bằng `npm run start -- --hostname 127.0.0.1 --port 3100`, rồi ở cửa sổ khác:

```sh
npx playwright install chromium
npm run test:e2e
```

Windows có Edge: có thể đặt `$env:PLAYWRIGHT_CHANNEL='msedge'` trước khi chạy E2E. `TEST_BASE_URL` cho phép đổi địa chỉ. Ảnh chụp, báo cáo benchmark và trace nằm trong `test-results`; báo cáo HTML ở `playwright-report`. E2E dùng phản hồi AI cố định và mô phỏng giọng nói, không đo chất lượng Gemini hoặc micro thật. Xem [phương pháp đánh giá](docs/EVALUATION.md).

Kiểm tra tích hợp Gemini thật tùy chọn: chạy `node scripts/smoke-live.cjs` trong thư mục ứng dụng. Lệnh dùng hai nguyên liệu tổng hợp, có thể phát sinh phí API theo tài khoản và không xác nhận cấu hình Redis production. Không chạy tự động trong CI.

## Triển khai

1. Đặt `GEMINI_API_KEY`, `GEMINI_MODEL`, `APP_ORIGIN` là HTTPS origin chính xác của ứng dụng; không thêm dấu `/` cuối. Model phải còn được tài khoản Google hỗ trợ.
2. Đặt `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`. Production từ chối yêu cầu AI nếu thiếu hoặc không truy cập được bộ giới hạn dùng chung.
3. Chỉ đặt `TRUSTED_IP_HEADER` nếu hạ tầng luôn xóa/ghi đè header đó. Nếu để trống, mọi người dùng chia sẻ hạn mức 10 yêu cầu/phút; cần cấu hình proxy phù hợp trước khi mở cho nhiều người dùng.
4. Chạy `npm ci`, các kiểm tra trên, rồi `npm run build` và `npm start` trong thư mục ứng dụng. Dùng nền tảng Node hỗ trợ request tới 60 giây, HTTPS và biến môi trường bí mật. Reverse proxy cần giới hạn thân yêu cầu khoảng 3 MB và thời gian đọc; không cache API.
5. Cấu hình cảnh báo lỗi 5xx/429, hạn mức chi phí Google, Redis, theo dõi uptime và khả năng rollback phiên bản trước. Nhật ký ứng dụng chỉ ghi mã lỗi/trạng thái, không ghi ảnh, khóa, hồ sơ hoặc prompt.
6. Hoàn thành các cổng nghiệm thu trong tài liệu đánh giá trước khi gọi đây là bản production đã được kiểm chứng.

Lệnh build/dev dùng Webpack để tránh lỗi tiến trình CSS Turbopack trên máy Windows hiện tại. Production ghi `.next-production`, dev ghi `.next`, tránh phá tài nguyên khi chạy đồng thời. `next/font` tải font lúc build; môi trường CI cần truy cập nguồn font hoặc chuẩn bị font cục bộ trước khi build offline.

Có kiểm tra origin, giới hạn kích thước/schema, timeout AI, rate limit dùng chung và security headers. Các lớp này không thay thế xác thực người dùng nếu sau này bổ sung dữ liệu máy chủ. CSP hiện cho phép inline script/style để tương thích Next; chưa dùng nonce theo request.

## Trạng thái phát hành

Mã nguồn và giao diện đã được nâng cấp, có kiểm thử hồi quy và pipeline CI. Chưa triển khai lên một môi trường công khai và chưa có nghiệm thu chuyên gia, kiểm thử ảnh/âm thanh thực hoặc kiểm thử tải. Không có cam kết xếp hạng, hiệu quả sức khỏe hay an toàn dị ứng tuyệt đối.
