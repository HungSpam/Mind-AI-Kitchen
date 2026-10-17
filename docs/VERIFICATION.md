# Kết quả xác minh ngày 17/10/2026

## Kết quả đã quan sát

| Hạng mục | Kết quả |
| --- | --- |
| Kiểm tra kiểu và lint | Thành công |
| Kiểm tra logic, route API, lưu trữ và hạn mức | 86/86 kiểm tra thành công |
| Luồng trình duyệt | 16/16 thành công, Edge/Chromium desktop và iPhone 13 mô phỏng |
| Dataset dị ứng | 41/41: TP=29, TN=12, FP=0, FN=0 trên tập tổng hợp hiện tại |
| Build production | Thành công với Next.js 16.4.2, Webpack |
| Một lần gọi Gemini thật | HTTP 200, gemini-2.5-flash, khoảng 10,9 giây, 2 nguyên liệu và 5 bước |
| Kiểm tra gói production | `npm audit --omit=dev`: 0 cảnh báo tại thời điểm kiểm tra |

Ca live dùng ức gà và bông cải mẫu; không dùng ảnh hoặc hồ sơ cá nhân. Có thể chạy lại bằng script smoke-live; kết quả một lần không đo độ ổn định nhà cung cấp hoặc chất lượng công thức thực tế.

Ảnh desktop/mobile đã được xem để kiểm tra bố cục. E2E kiểm tra không tràn chiều ngang ở các màn chính và luồng món/nấu. Chưa có chứng nhận WCAG hoặc thử trên iOS/Safari thật.

## Điểm chưa hoàn tất để phát hành rộng rãi

- Môi trường hiện tại chưa cấu hình Redis production; API AI production sẽ trả 503 theo cơ chế từ chối an toàn. Cần điền thông số hạ tầng và kiểm tra lại trước khi mở cho người dùng.
- Kiểm tra toàn bộ dependency còn 5 cảnh báo high thuộc chuỗi công cụ phát triển `eslint-config-next → fast-glob → micromatch → braces`. Không nằm trong bộ gói production. Chưa có bản vá tương thích được audit đề xuất; không tự hạ ESLint Next xuống bản 14. Theo dõi bản vá, chỉ lint mã nguồn tin cậy, không gọi đây là dự án “không còn lỗ hổng”.
- Chưa có tài khoản/đồng bộ cơ sở dữ liệu máy chủ. IndexedDB và backup giải quyết mở lại/tái sử dụng trên thiết bị và chuyển thủ công.
- Chưa có tập ảnh/âm thanh thực được gán nhãn độc lập, chấm chuyên gia, đo độ trễ ngắt giọng thật, kiểm thử tải hoặc triển khai công khai.
- Bộ dị ứng là quy tắc từ khóa; precision/recall 100% chỉ áp dụng cho 41 ca đã biết. Không đại diện an toàn thực phẩm ngoài thực tế.

Xem `REPORT-TRACEABILITY.md` và `EVALUATION.md` để đối chiếu điều kiện nghiệm thu. CI đã được thêm vào repo nhưng chưa chạy trên GitHub trong phiên làm việc này.
