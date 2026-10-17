# Đối chiếu góp ý ban tổ chức

Nguồn yêu cầu: hai ảnh report người dùng cung cấp. Tài liệu này phân biệt việc đã có trong mã nguồn với bằng chứng còn cần thu thập trước khi phát hành rộng rãi.

| Góp ý | Thay đổi đã thực hiện | Bằng chứng và giới hạn |
| --- | --- | --- |
| Ngắt AI trong quá trình nấu, ưu tiên yêu cầu mới | Nút dừng ngay; dừng lời đọc trước khi xử lý khẩu lệnh; tự đọc được quản lý riêng; chỉ chuyển bước khi nhận kết quả cuối; loại phủ định; chống xử lý trùng; xử lý mất quyền micro | Kiểm thử câu lệnh và E2E mô phỏng. Chưa đo độ trễ/nghe nhầm với tiếng máy hút mùi, nước chảy hoặc âm thanh loa thật. |
| Nhận diện nhầm/bỏ sót nguyên liệu dị ứng | Nguyên liệu từ ảnh bắt buộc xác nhận riêng; nhắc kiểm tra nhãn/gia vị/nhiễm chéo; rà soát cả đầu vào và nội dung công thức; chặn nấu khi phát hiện xung đột; rà soát lại khi hồ sơ đổi | 41 ca từ khóa có cả dương/âm. Đây là lớp phòng ngừa, không bảo đảm nhận ra mọi thành phần ẩn hoặc dị ứng. |
| Nguồn trích dẫn để người dùng đối chiếu | Nguồn USDA riêng cho từng nguyên liệu/khối lượng; liên kết FDA và FoodSafety.gov; trang giải thích cách tính và giới hạn | 10 bản ghi USDA đã đối chiếu; không đủ dữ liệu thì không hiển thị tổng dinh dưỡng. Công thức mới do AI tạo, không giả mạo là công thức đã xuất bản từ các nguồn trên. |
| Lưu/tái sử dụng tư vấn và thay đổi người dùng | IndexedDB có lịch sử công thức, phản hồi, hồ sơ, bữa ăn; sổ tìm kiếm/yêu thích; sao lưu/khôi phục; phản hồi dùng cho lần tạo món tiếp theo | Đã kiểm tra lưu lại, mở lại, phần ăn, nhập/xuất và dữ liệu cũ. Chưa có cơ sở dữ liệu tập trung hoặc đăng nhập/đồng bộ tự động giữa thiết bị. Nếu BTC yêu cầu đồng bộ máy chủ thì mục này chưa nghiệm thu đầy đủ. |
| Đánh giá gợi ý chặt hơn, không chỉ dựa AI chấm | Bỏ điểm chung tự tạo; hiển thị điều kiện kiểm tra và độ bao phủ dữ liệu; schema và kiểm tra mã nguyên liệu phía máy chủ; test lỗi API, dữ liệu và phản hồi | Đã có kiểm thử tự động độc lập với điểm AI. Chưa có nghiên cứu chất lượng công thức với người dùng/đầu bếp; không gán kết quả tự động thành chất lượng nấu thực tế. |
| Công bố rõ dữ liệu test làm cơ sở kết quả | Dataset có từng đầu vào/nhãn kỳ vọng; runner gọi mã production; JSON kết quả có hash dữ liệu, confusion matrix, precision/recall; tài liệu đánh giá và quy trình thu thập mới | Bộ hiện tại là 41 ca tổng hợp được xây cùng phần sửa lỗi; không phải tập mù độc lập, không phải dữ liệu lâm sàng. |

## Điều kiện để xác nhận hoàn tất nghiệm thu

- Có người phụ trách chuyên môn rà soát quy tắc dị ứng, thuật ngữ, nhãn gia vị và hướng dẫn nấu chín.
- Có tập ảnh và phiên ghi âm có quyền sử dụng, nhãn do người độc lập lập, ghi rõ số mẫu/thiết bị/điều kiện.
- Có đánh giá công thức theo tiêu chí trong EVALUATION.md với ít nhất hai người chấm; lưu cả trường hợp thất bại và bất đồng.
- Xác nhận với BTC việc lưu trên thiết bị kèm sao lưu có đáp ứng yêu cầu hay cần tài khoản và đồng bộ máy chủ. Không chuyển hồ sơ ăn uống sang một dịch vụ lưu trữ mới khi chưa chọn hạ tầng và chính sách truy cập.
- Cấu hình môi trường production, hạn mức, HTTPS; chạy smoke test tích hợp thật và kiểm thử tải trên chính môi trường đó.
