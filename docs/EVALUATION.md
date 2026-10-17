# Phương pháp và dữ liệu đánh giá

## Những gì bộ kiểm thử hiện tại đo

- `domain.test.cjs` chạy bộ dò dị ứng thật, tính dinh dưỡng thật, schema và xử lý khẩu lệnh; không chép lại thuật toán để tạo kết quả thuận lợi.
- `api.test.cjs` gọi route handler thật, chỉ thay phản hồi mạng từ AI. Đo hợp đồng dữ liệu, không đo khả năng sinh món của Gemini.
- `server.test.cjs` kiểm tra giới hạn thân request, chế độ production từ chối khi thiếu Redis, lỗi mạng, phản hồi sai và vượt hạn mức.
- `storage.test.cjs` dùng Dexie thật với IndexedDB mô phỏng. Đo cập nhật/idempotency, phản hồi, tính phần ăn, tổng ngày, nhập/xuất, hồ sơ hiện tại và bảo toàn dữ liệu cũ.
- `e2e/app.spec.ts` chạy trình duyệt Chromium/Edge trên desktop và màn hình iPhone mô phỏng. Đo luồng người dùng, lưu qua reload, dị ứng sau khi đổi hồ sơ, lỗi AI, ảnh cần xác nhận, dữ liệu phiên hỏng, sao lưu sang context mới và ngắt giọng đọc mô phỏng. Không phải kiểm thử Safari/iPhone thật.

## Dataset dị ứng v2.0

Tệp `tests/benchmark-dataset.json`: 41 trường hợp tổng hợp, gồm 29 có xung đột và 12 không có xung đột theo nhãn mong đợi. Có tiếng Việt có/không dấu, tiếng Anh, gia vị có thành phần ẩn, nhiều nhóm dị ứng cùng lúc, thực phẩm tự khai báo, khớp nhầm do dấu/ranh giới từ, sữa thực vật và quả bơ.

Nguồn: 8 ca hồi quy có sẵn trong repo và 33 ca bổ sung trong quá trình sửa lỗi. Nhãn được viết để kiểm tra quy tắc phần mềm, chưa được chuyên gia độc lập duyệt. Không có thông tin cá nhân hoặc ảnh người dùng. Bộ này được dùng khi phát triển thuật toán nên không được gọi là tập kiểm thử mù. Trường `expectedAllergenGroup` cũ chỉ là chú thích; thước đo chính là `expectedRisk`, và một số ca yêu cầu từ khóa cụ thể.

`npm run benchmark` tạo `test-results/benchmark.json` với SHA-256 của chính file dữ liệu, thời điểm chạy, kết quả từng ca và confusion matrix:

- TP: có xung đột và phát hiện được.
- TN: không xung đột và không phát hiện.
- FP: cảnh báo nhầm.
- FN: bỏ sót xung đột đã gán nhãn.
- Precision = TP/(TP+FP); recall = TP/(TP+FN). Không có mẫu tương ứng thì trả null.

Kết quả 41/41 trên bộ này chỉ chứng minh không tái phát các lỗi đã mô tả. Không suy ra xác suất an toàn, tỷ lệ bỏ sót ngoài thực tế hoặc chất lượng món ăn.

## Dinh dưỡng

10 bản ghi USDA FoodData Central được đối chiếu qua dữ liệu công khai ngày 16/10/2026. Tên, mã nguồn, trạng thái thực phẩm và trị số nằm trong `src/lib/nutritionDatabase.ts`; trang `/about` và kết quả món hiển thị nguồn. Tổng chỉ tính khi tất cả thành phần có khối lượng và bản ghi khớp. Dữ liệu chưa phủ toàn bộ món Việt, thương hiệu gia vị, biến đổi do chế biến hoặc khẩu phần điều trị.

## Kế hoạch nghiệm thu thực tế — chưa có kết quả

Không điền số đo khi chưa thực hiện. Đề xuất chuẩn bị trước một tập độc lập và khóa phiên bản trước khi đánh giá:

| Hạng mục | Thiết kế thu thập | Chỉ số cần ghi |
| --- | --- | --- |
| Nhận diện ảnh | Ít nhất 100 ảnh có quyền sử dụng, nhiều ánh sáng, vật che, bao bì và nhiều nguyên liệu; hai người lập danh sách chuẩn | Precision/recall theo nguyên liệu, bỏ sót dị nguyên, kết quả trống, sửa tay cần thiết; chia theo điều kiện |
| Công thức | Ít nhất 60 tình huống nguyên liệu/khẩu vị, kể cả thiếu gia vị và nhiều dị ứng; lưu model, prompt version, thời gian, đầu vào/đầu ra | Vi phạm dị ứng, nguyên liệu ngoài danh sách, khả thi, rõ định lượng, thời gian, phù hợp khẩu vị; không gộp lỗi dị ứng vào điểm trung bình |
| Chấm độc lập | Hai người có chuyên môn chấm ẩn danh theo thang 1–5 với mô tả rõ mỗi mức; hội ý các ca bất đồng | Phân bố điểm, mức đồng thuận, số ca phải loại; không chỉ báo điểm trung bình |
| Nấu thực | Chọn món từ nhiều nhóm nguyên liệu và mức khó, cân nguyên liệu thực, ghi thời gian và nhiệt độ | Có hoàn thành được không, sai lệch thời gian/định lượng, lỗi nghiêm trọng |
| Giọng nói | Nhiều giọng vùng miền, desktop/mobile thật, yên tĩnh/quạt/nước chảy/loa đang đọc; lặp mỗi lệnh | Nhận đúng, chuyển nhầm, bỏ lệnh, độ trễ ngắt p50/p95 từ âm thanh đến dừng phát, mất quyền micro |
| Khả dụng | Người mới thực hiện nhập → xác nhận → nấu → lưu → tìm lại, có người dùng bàn phím/trình đọc màn hình | Hoàn thành, thời gian, điểm kẹt, thao tác nhầm; kiểm tra cỡ chữ và tương phản |

Các số mẫu trên là đề xuất quy trình, chưa phải số mẫu đã thu thập và không tự bảo đảm ý nghĩa thống kê. Phải công bố tiêu chí chọn mẫu, nhãn, các lần loại mẫu, model, cấu hình, ngày chạy và toàn bộ lỗi. Không chỉnh quy tắc theo tập độc lập rồi báo kết quả đó như một lần đánh giá mù mới.

## Giới hạn cần theo dõi

Bộ dò hiện dựa từ khóa nên có thể bỏ sót cách gọi mới hoặc cảnh báo thừa. Kiểm tra mã nguyên liệu không chứng minh mọi danh từ trong câu hướng dẫn tự do đều thuộc danh sách; cần người dùng kiểm tra công thức. Đọc và nhận giọng nói có thể dùng dịch vụ trình duyệt và có phản hồi âm thanh từ loa. Các hạn chế này phải giữ trong sản phẩm và báo cáo nghiệm thu.
