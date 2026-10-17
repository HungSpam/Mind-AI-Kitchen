# Báo cáo sản phẩm và kế hoạch chỉnh sửa Mind AI Kitchen

**Ngày:** 17/10/2026 — Asia/Saigon  
**Căn cứ:** góp ý mới của chủ dự án, hai ảnh report của ban giám khảo, mã nguồn hiện tại và báo cáo kiểm thử đã có.  
**Phạm vi tài liệu:** đánh giá và kế hoạch triển khai. Các thiết kế, chỉ số và chức năng đề xuất bên dưới **chưa được triển khai hoặc nghiệm thu** trong lần lập báo cáo này.

## 1. Kết luận đánh giá

Bản sửa trước đã củng cố một số phần kỹ thuật nhưng đi lệch trải nghiệm cốt lõi: người dùng cần chụp nguyên liệu nhanh, nhận hỗ trợ chuyên môn và thao tác thuận tiện khi đứng bếp. Giao diện hiện tại dành quá nhiều diện tích cho lời giới thiệu, biểu mẫu và thông tin phụ. Có bố cục co giãn trên điện thoại chưa đồng nghĩa với thiết kế ưu tiên điện thoại.

Việc tự đổi biểu tượng và tên hiển thị thành “mind kitchen” cũng làm mất tính nhất quán của thương hiệu. Cần sửa lại theo bộ nhận diện được chủ dự án xác nhận, không tiếp tục tự thay logo bằng một biểu tượng thư viện.

Hướng sản phẩm cần chốt:

> **Mở app → chụp nguyên liệu → xem và sửa kết quả AI → chọn món → nấu từng hành động.**

AI thực hiện phần nhận diện và tính toán trước. Người dùng chỉ sửa điểm sai, bổ sung phần bị che khuất và xác nhận thông tin quan trọng. Thông tin nguồn, lịch sử và giải thích chi tiết vẫn có nhưng xuất hiện đúng lúc, không chiếm màn hình thao tác chính.

## 2. Đối chiếu góp ý của chủ dự án với hiện trạng

| ID | Góp ý | Bằng chứng hiện tại | Kết luận / mức ưu tiên |
| --- | --- | --- | --- |
| U1 | Logo sai | `Brand` trong `app-shell.tsx` dùng `CookingPot` và tên “mind kitchen”; `public/icon.svg` lại dùng mũ đầu bếp. Phiên bản Git trước có tên “Mind AI's Kitchen”. | Nhận diện không thống nhất. **P0:** xác nhận logo/tên chuẩn trước khi chỉnh giao diện tiếp. |
| U2 | Nhiều chữ, thiếu đơn giản và thực dụng | Trang chủ có lời giới thiệu và các khối giải thích; trang hồ sơ có mô tả, cảnh báo, lịch sử cùng xuất hiện; trang scan đặt biểu mẫu trước ảnh. | Thứ tự thông tin chưa đúng nhiệm vụ. **P0:** một hành động chính trên mỗi màn, rút gọn nội dung mặc định. |
| U3 | Ưu tiên chụp ảnh thay nhập tay | `scan/page.tsx` hiển thị “Trên bàn bếp” và các trường nhập trước “Nhập nhanh bằng ảnh”; ảnh được mô tả là cách nhập phụ. | Chưa đạt. **P0:** camera thành điểm vào chính; nhập tay là phương án bổ sung hoặc khi camera không dùng được. |
| U4 | Dock mobile có nút + giữa mở camera | `app-shell.tsx` có 4 liên kết, chưa có hành động camera ở giữa. | Chưa đạt. **P0:** dock mới với nút + nổi bật, mở chế độ chụp ngay từ thao tác bấm. |
| U5 | Chế độ nấu tập trung, chữ và nút lớn | `/cooking` có thẻ bước nhưng vẫn nằm trong AppShell chung; còn tiêu đề món, điều khiển đọc/nghe, bản ghi lời nói, hướng dẫn, liên kết và biểu mẫu lưu bữa ăn. | Đạt một phần. **P0:** tách chế độ nấu khỏi khung điều hướng; mỗi màn chỉ một hành động. |
| U6 | AI nhận số lượng, khối lượng và tính dinh dưỡng tự động, chính xác >80% | Prompt vision hiện yêu cầu không suy đoán định lượng; schema chỉ nhận `name`. `grams` do người dùng nhập. Dinh dưỡng hiện dựa 10 bản ghi thực phẩm và cần khối lượng. | Chưa có chức năng định lượng bằng ảnh; chưa có số đo độ chính xác. **P1, cần nghiên cứu và dữ liệu thật:** xây chuỗi nhận diện → định lượng → đối chiếu nguồn → tính toán. |

**Lưu ý về màn nấu:** mã hiện tại không có một cột phải riêng trong `/cooking`; phần công thức `/result` dùng bố cục nhiều cột. Tuy vậy, vấn đề người dùng nêu vẫn tồn tại: chế độ thực hành chưa được tách khỏi khung ứng dụng và thông tin phụ. Kế hoạch xử lý cả hai ngữ cảnh: đọc công thức đầy đủ trước khi nấu, tập trung tuyệt đối khi đang nấu.

P0 là việc sửa đúng hướng sử dụng trước khi mở rộng; P1 là năng lực cốt lõi cần hoàn thiện và đo lường; P2 là phần hỗ trợ sau khi luồng chính đã ổn. Các việc P1 vẫn là điều kiện nghiệm thu, không phải tùy chọn bỏ qua.

## 3. Đối chiếu lại với report ban giám khảo

| ID | Yêu cầu từ report | Đã có | Khoảng thiếu và việc cần làm |
| --- | --- | --- | --- |
| J1 | Ngắt AI, ưu tiên lệnh mới khi đang nấu | Có dừng đọc, xử lý lệnh tiếp/lùi/đọc lại, tránh một số câu phủ định; đã kiểm thử mô phỏng. | Kiểm thử với micro, loa và tiếng ồn thật; đo độ trễ; xử lý câu sửa ý và lệnh lặp. Nút dừng và lệnh giọng nói phải dùng được trong chế độ nấu mới. |
| J2 | Cảnh báo khi nhận diện nhầm hoặc bỏ sót dị nguyên | Xác nhận nguyên liệu ảnh; dò từ khóa trước/sau tạo món; kiểm tra lại khi hồ sơ đổi. | Không bỏ lớp xác nhận khi tự động hóa. Đưa cảnh báo cụ thể vào đúng nguyên liệu; bổ sung nhãn bao bì, gia vị, nhiễm chéo và dữ liệu kiểm thử chuyên gia. Không dùng ngưỡng 80% làm tiêu chuẩn an toàn dị ứng. |
| J3 | Có nguồn để kiểm tra gợi ý | Có nguồn USDA theo nguyên liệu và hướng dẫn an toàn tham khảo. | Mở rộng dữ liệu phù hợp thực phẩm Việt, lưu nguồn cho từng phép tính, phân biệt định lượng ước tính với dữ liệu tra cứu. Công thức AI tạo phải được ghi đúng bản chất, không gắn nguồn để ngụ ý nguồn đó đã chứng nhận món. |
| J4 | Dùng cơ sở dữ liệu để lưu, xem lại và tái sử dụng thay đổi của người dùng | IndexedDB lưu món, phản hồi, lịch sử hồ sơ; có backup và tái sử dụng phản hồi. | Đã giải quyết một phần vấn đề lịch sử trên thiết bị. Để xử lý đầy đủ rủi ro phụ thuộc trình duyệt, kế hoạch bổ sung tài khoản và đồng bộ cơ sở dữ liệu máy chủ; giữ chế độ khách để không cản trở chụp nhanh. |
| J5 | Đánh giá chất lượng chặt hơn, không chỉ vài ca hoặc AI tự chấm | Có kiểm thử chức năng, bỏ điểm chất lượng tự tạo. | Cần tập độc lập, người chấm độc lập, tiêu chí khả thi khi nấu, nguyên liệu ngoài danh sách, dị ứng và phù hợp khẩu vị. Test chạy đúng phần mềm không chứng minh món ăn có chất lượng. |
| J6 | Công bố dữ liệu test làm cơ sở kết quả | Có 41 ca tổng hợp dị ứng, runner và báo cáo dữ liệu. | Bổ sung dữ liệu ảnh, cân thực, số lượng, nguồn dinh dưỡng, ghi âm và đánh giá công thức; công bố cách chia tập, phiên bản, số mẫu, lỗi và giới hạn. |

Các số **86 kiểm tra logic, 16 luồng trình duyệt và 41 ca dị ứng** là kết quả đã ghi trong `VERIFICATION.md`. Báo cáo này không chạy lại hoặc mở rộng các phép đo đó. Chúng không chứng minh độ chính xác nhận diện/khối lượng/dinh dưỡng trên 80%, độ dễ dùng khi tay ướt hoặc khả năng nghe trong bếp thật.

## 4. Thiết kế trải nghiệm mục tiêu

### 4.1. Thương hiệu và ngôn ngữ

- Xác nhận một tên hiển thị duy nhất và tệp logo gốc. Biểu tượng mũ đầu bếp hiện có chỉ là tài sản trong repo, chưa đủ căn cứ coi là logo chính thức.
- Đồng bộ logo trên đầu trang, dock nếu có, favicon, ảnh chia sẻ và màn mở ứng dụng.
- Nội dung ngắn, trực tiếp: “Chụp nguyên liệu”, “Kiểm tra kết quả”, “Gợi ý món”, “Bắt đầu nấu”. Bỏ slogan và lời giới thiệu không giúp hoàn thành tác vụ.
- Dùng kiểu chữ dễ đọc cho thao tác và hướng dẫn nấu. Không lấy phong cách tạp chí làm ưu tiên cao hơn khả năng đọc nhanh.

### 4.2. Dock mobile và camera

Dock đề xuất: **Trang chủ · Món đã lưu · [+ Chụp] · Nhật ký · Hồ sơ**. Hai mục hỗ trợ chỉ được xuất hiện khi có màn chức năng thật; không tạo mục rỗng để đủ số lượng.

- Nút + ở chính giữa, vùng chạm khoảng 64 × 64 CSS px; tên truy cập rõ “Chụp nguyên liệu”.
- Một lần bấm + mở màn camera và bắt đầu yêu cầu camera sau hành động của người dùng. Không đưa người dùng qua trang biểu mẫu trước. Hộp thoại cấp quyền của hệ điều hành không được tính là một bước UI có thể loại bỏ.
- Ưu tiên camera sau; có nút chụp lớn, chọn ảnh từ thư viện và đóng. Không tải ảnh lên trước khi người dùng xác nhận sử dụng ảnh.
- Camera không được cấp quyền hoặc không hỗ trợ: hiển thị chọn ảnh/nhập tay ngay trong màn đó; giữ nguyên tiến trình.
- Khi đóng màn hoặc chuyển ứng dụng, dừng camera thích hợp; không để quay nền ngoài ý muốn. Giữ vị trí và dữ liệu nếu người dùng quay lại.
- Dock tôn trọng vùng an toàn của điện thoại, không che nút chính, bàn phím hay thông báo. Không có dock trong chế độ nấu.

Triển khai web cần xử lý quyền và môi trường HTTPS cho camera. `getUserMedia` hỗ trợ ràng buộc camera sau nhưng cần kiểm tra thiết bị/trình duyệt; không hứa mọi trình duyệt đều tự mở đúng camera. Tham chiếu: [MDN — getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

### 4.3. Chụp và kiểm tra kết quả AI

Luồng mặc định: **chụp → xem kết quả → sửa nhanh khi cần → tạo món**.

Mỗi nguyên liệu là một dòng hoặc thẻ nhỏ, ví dụ: **Cà chua · 3 quả · khoảng 300 g**. Đây chỉ là ví dụ hiển thị, không phải số đo mẫu đã kiểm chứng.

- AI điền tên, số lượng khi đếm được, khối lượng ước tính và trạng thái sống/chín nếu đủ căn cứ.
- Bấm vào kết quả để sửa bằng lựa chọn nhanh, tăng/giảm số lượng hoặc nhập số; không bắt người dùng gõ lại toàn bộ danh sách.
- Hiển thị “Cần kiểm tra” tại đúng mục chưa rõ. Không hiển thị phần trăm tin cậy do mô hình tự khai báo như độ chính xác đã đo.
- Không gộp hai cụm thực phẩm giống tên thành một cụm mà làm mất số lượng/khối lượng; cần nhận diện trùng giữa nhiều ảnh của cùng phiên chụp.
- Luôn có “Thiếu nguyên liệu?” để chụp bổ sung hoặc thêm nhanh. Với món có gia vị/bao bì, gợi ý chụp nhãn khi cần.
- Có một lần xác nhận danh sách sau khi xem lại. Những mục chưa rõ hoặc xung đột dị ứng phải được xử lý riêng; không có nút “xác nhận tất cả” bỏ qua cảnh báo nghiêm trọng.
- Hồ sơ dị ứng chưa khai báo không được diễn giải thành “không dị ứng”. Trước lần tạo món đầu tiên, hỏi ngắn về nhóm cần tránh hoặc cho phép người dùng chủ động xác nhận chưa ghi nhận.

### 4.4. Đọc công thức và thực hành nấu là hai chế độ

**Màn xem công thức:** tên món, thời gian, số phần, nguyên liệu, dinh dưỡng tóm tắt và “Bắt đầu nấu”. Bước chi tiết, nguồn và giải thích mở khi cần. Dị ứng cần xử lý vẫn hiển thị trực tiếp.

**Chế độ nấu:** toàn màn hình ứng dụng, không sidebar, không dock, không bảng dinh dưỡng, không lịch sử và không khối giải thích dài. Fullscreen của trình duyệt là tùy chọn; không phụ thuộc API fullscreen để sử dụng được chế độ này.

```text
Thoát                              Bước 3/8

            CHO CÀ CHUA VÀO CHẢO

                 Đảo nhẹ 2 phút
                  [ 02:00 ]

     [ BƯỚC TRƯỚC ]     [ BƯỚC TIẾP ]

             [ DỪNG ĐỌC ]   Micro: bật
```

Đây là sơ đồ nội dung, chưa phải thiết kế cuối. Cần bảo đảm:

- Một hành động chính mỗi bước; tách bước dài tại lúc tạo công thức, không đơn giản cắt bớt chữ. Giữ nguyên nhiệt độ, thời gian, dấu hiệu chín và thứ tự thao tác cần thiết.
- Tiêu đề hành động khoảng 32–40 px trên điện thoại, 40–56 px trên màn lớn; nội dung hỗ trợ khoảng 20–24 px. Cho phép phóng chữ, không giảm chữ để nhét nội dung dài.
- Nút chuyển bước cao 64–80 px, chiếm phần lớn chiều ngang; có thể dùng một tay. Nút dừng luôn tiếp cận được khi đang phát tiếng.
- Tiến độ ngắn; hẹn giờ chỉ xuất hiện ở bước cần chờ. Cài đặt giọng nói nằm trong bảng phụ; bản ghi lời nói chỉ hiện khi người dùng muốn kiểm tra hoặc cần sửa lỗi.
- Không tự chuyển bước chỉ vì hết giờ. Không dùng vuốt làm cách chuyển bước duy nhất.
- Hoàn thành nấu mới mở màn lưu bữa ăn riêng. Thoát nhầm hoặc quay lại không làm mất bước và trạng thái hẹn giờ.
- Có thể giữ sáng màn hình khi nền tảng hỗ trợ; mất quyền giữ sáng vẫn nấu tiếp được.

Kích thước trên là mục tiêu thiết kế cho bối cảnh bếp, cần thử thực tế. Mốc 44 × 44 CSS px của [WCAG 2.2 — Target Size Enhanced, mức AAA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) là tham chiếu kích thước mục tiêu; không có nghĩa nút đạt kích thước đó thì toàn ứng dụng đạt WCAG hoặc dùng tốt khi tay ướt.

### 4.5. Giọng nói khi tay bận

- “Dừng”, “tiếp”, “quay lại”, “đọc lại” hoạt động nhất quán. Ngắt lời đọc hiện tại trước khi thực thi lệnh hợp lệ mới.
- Lệnh dừng ưu tiên phản hồi nhanh; chuyển bước phải tránh kết quả nhận dạng chưa hoàn tất và câu phủ định.
- Xử lý lặp lệnh mà không nhảy nhiều bước; đo riêng trường hợp người dùng sửa ý giữa câu.
- Không để giọng đọc của ứng dụng tự kích hoạt chuyển bước. Kiểm thử loa ngoài; tai nghe là phương án hỗ trợ, không phải điều kiện bắt buộc để sản phẩm có thể đứng bếp.
- Khi micro lỗi, mất mạng hoặc chưa được cấp quyền, thông báo ngắn và vẫn giữ các nút lớn. Trạng thái đang nghe phải rõ.
- Mục tiêu thử nghiệm đề xuất: dừng bằng nút phản hồi p95 ≤200 ms; dừng bằng giọng p95 ≤1 giây tính từ khi người dùng nói hết từ dừng. Báo thêm thời gian tính từ lúc bắt đầu nói, tỷ lệ bỏ lệnh và chuyển nhầm; đây chưa phải số đo hiện tại.

## 5. AI tự nhận khối lượng, số lượng và tính dinh dưỡng

### 5.1. Không gộp các bài toán thành một chỉ số mơ hồ

Nhận đúng tên thực phẩm, đếm đúng số lượng, ước lượng đúng gram và tính đúng kcal/macros là các bài toán khác nhau. Ba quả cà chua không mặc nhiên tương đương một khối lượng cố định. Ảnh chụp cũng có thể không cho thấy dầu, nước sốt, phần khuất hoặc phần không ăn được.

Nghiên cứu Nutrition5k cung cấp ảnh/video, ảnh độ sâu, khối lượng thành phần và nhãn dinh dưỡng để nghiên cứu bài toán này. Đây là cơ sở tham khảo cách xây dữ liệu, **không phải bằng chứng ứng dụng hiện tại đạt bất kỳ mức chính xác nào**. Tham chiếu: [Nutrition5k, CVPR 2021](https://arxiv.org/abs/2103.03375).

Đề xuất kỹ thuật của dự án: tự ước lượng từ ảnh trước, nhưng khi thiếu căn cứ thì xin thêm một ảnh/góc nhìn hoặc một mốc kích thước. Không bắt buộc mọi người phải cân; đồng thời không gọi khối lượng suy ra từ một ảnh là khối lượng đã đo.

### 5.2. Chuỗi xử lý dự kiến

1. **Kiểm tra ảnh:** độ rõ, ánh sáng, thực phẩm có bị che, ảnh có thuộc cùng phiên/chứa vật trùng.
2. **Nhận diện từng đối tượng/cụm:** tên chuẩn, vùng ảnh, ứng viên thay thế, trạng thái chế biến.
3. **Đếm:** số lượng và đơn vị cho đồ rời; dùng “không áp dụng” với thực phẩm không đếm theo từng cái.
4. **Định lượng:** gram ước tính và khoảng giá trị; ghi rõ suy từ ảnh, số lượng, nhãn bao bì, vật chuẩn hay người dùng cân. Khi thông tin chưa đủ, hỏi đúng một thao tác bổ sung hữu ích.
5. **Đối chiếu dữ liệu:** chọn đúng thực phẩm/trạng thái/nhãn sản phẩm, phần ăn được; kiểm tra thành phần gây dị ứng và nguồn.
6. **Tính toán bằng mã:** gram × dữ liệu trên 100 g; cộng từng thành phần, chia khẩu phần, cập nhật khi người dùng sửa. Với món chín, cần quy tắc phù hợp về trạng thái nguyên liệu, lượng dầu/sốt và phần thực sự dùng.
7. **Trình bày:** “Dinh dưỡng ước tính” khi đầu vào là ước lượng; cho mở nguồn và sửa lượng. Thành phần thiếu dữ liệu không được tự tính bằng 0 hoặc tạo tổng giả như đã đầy đủ.

Mở rộng danh mục thực phẩm ưu tiên từ dữ liệu bếp Việt đã thu thập, không chỉ tăng số bản ghi. Mỗi bản ghi cần định danh, trạng thái, đơn vị, nguồn và ngày đối chiếu. USDA hỗ trợ tìm kiếm và truy xuất chi tiết thực phẩm; việc chọn đúng bản ghi vẫn là trách nhiệm của hệ thống. Tham chiếu: [USDA FoodData Central API Guide](https://fdc.nal.usda.gov/api-guide/).

### 5.3. Dữ liệu cần bổ sung

| Nhóm dữ liệu | Trường dự kiến |
| --- | --- |
| Nhận diện | `captureSessionId`, `observationId`, `foodId`, `name`, `region`, `preparationState` |
| Số lượng | `count`, `countUnit`, `countMethod`, trạng thái cần kiểm tra |
| Khối lượng | `estimatedGrams`, `rangeGrams`, `measurementMethod`, `confirmedGrams` nếu cân/sửa |
| Truy xuất | `sourceId`, `sourceVersion`, `modelVersion`, `promptVersion`, `estimatedAt` |
| Xác nhận | `reviewStatus`, `correctedFields`, liên kết ảnh phù hợp với chính sách lưu dữ liệu |
| Dinh dưỡng | Giá trị theo nguyên liệu/phần, trạng thái đầy đủ hay thiếu, nguồn dữ liệu và mức bất định của đầu vào |

Giữ riêng kết quả AI và chỉnh sửa của người dùng để đo sai số thật. Người dùng bấm xác nhận “trông hợp lý” không biến ước lượng thành số cân thực. Không dùng chính kết quả AI làm nhãn chuẩn cho đánh giá.

## 6. Định nghĩa và nghiệm thu mục tiêu “chính xác >80%”

**Yêu cầu >80% đến từ chủ dự án. Các công thức, dung sai và cách nghiệm thu sau là đề xuất để chốt trước khi thu thập/chạy test; chưa phải kết quả đã đạt.**

| Hạng mục | Cách đo đề xuất | Mục tiêu |
| --- | --- | --- |
| Nhận diện nguyên liệu | Precision, recall và F1, cả theo từng nhóm và toàn bộ; tính cả thực phẩm bị bỏ sót hoặc bịa thêm | F1 >0,80; công bố riêng precision/recall để tránh che giấu bỏ sót |
| Số lượng | Tỷ lệ đếm đúng hoàn toàn trên thực phẩm đếm được | >80%; ảnh khó/che khuất vẫn có trong báo cáo, không chỉ chọn vật rời dễ nhìn |
| Khối lượng | Tỷ lệ đối tượng có sai số tuyệt đối tương đối ≤20% so với cân thực | >80%; báo thêm MAE gram, sai số trung vị và p90 |
| Năng lượng | Tỷ lệ khẩu phần có sai số ≤20% so với tham chiếu từ cân thực + dữ liệu đối chiếu | >80%; công bố cách lập tham chiếu, không gọi là phép đo năng lượng trong phòng thí nghiệm |
| Protein, carbohydrate, fat | Đánh giá từng chất, không lấy kcal làm đại diện | Mỗi chất có chỉ số riêng; dung sai tương đối ≤20% với lượng ≥5 g, dung sai tuyệt đối ≤1 g với lượng <5 g là ngưỡng đề xuất cần chốt |
| Toàn luồng tự động | Phiên chụp nhận đúng tập nguyên liệu, đếm đúng mục đếm được, khối lượng và năng lượng cùng đạt dung sai, trước khi sửa tay | >80% trên phạm vi công bố; các bước đạt >80% riêng lẻ không đủ để suy ra toàn luồng đạt >80% |

Ví dụ: thực phẩm cân thực 250 g, dự đoán 210 g thì sai số 16%, đạt tiêu chí ±20%. Với 300 đơn vị đánh giá, 240 đơn vị đạt chỉ bằng 80%, chưa phải **trên** 80%. MAE/MAPE không được tự chuyển thành “độ chính xác” bằng một phép đổi tên.

Quy tắc chống đánh giá sai:

- Định trước danh mục hỗ trợ, điều kiện chụp, đơn vị đánh giá và quy tắc ghép dự đoán với nhãn chuẩn. Không loại mẫu sau khi thấy kết quả xấu.
- Công bố cả tỷ lệ hệ thống có thể trả lời và độ chính xác trên phần đã trả lời. Ca không ước lượng được hoặc thiếu đầu ra được tính là chưa đạt ở chỉ số toàn luồng tự động; không biến việc từ chối trả lời thành cách tăng điểm.
- Đo tách **một ảnh tự động**, **có ảnh/mốc kích thước bổ sung**, **sau khi người dùng chỉnh sửa**. Thành tích nhóm sau không được quảng bá thành thành tích tự động từ một ảnh.
- Khối lượng rất nhỏ và năng lượng gần 0 cần dung sai tuyệt đối được định trước; báo thành nhóm riêng để tránh tỷ lệ phần trăm mất ý nghĩa.
- Công bố khoảng tin cậy 95%, lấy mẫu lại theo phiên chụp để tránh coi nhiều ảnh cùng món là các mẫu độc lập. Chỉ khẳng định có bằng chứng thống kê “trên 80%” khi cận dưới phù hợp vượt 80%; nếu chưa đủ mẫu thì ghi rõ.
- Mục tiêu dị ứng tách riêng: ca có xung đột nghiêm trọng bị bỏ sót phải điều tra, sửa và kiểm tra lại trước khi phát hành. Không chấp nhận bỏ sót 20% dị nguyên chỉ vì mục tiêu định lượng là 80%.

## 7. Kế hoạch dữ liệu và đánh giá độc lập

### 7.1. Ảnh, cân và dinh dưỡng

Đề xuất khởi đầu **900 phiên nguyên liệu**, gồm 600 phiên phát triển/hiệu chỉnh và 300 phiên kiểm thử khóa; một phiên có thể có nhiều ảnh. Đây là quy mô dự kiến, chưa phải dữ liệu đang có và không tự bảo đảm đủ bằng chứng cho mọi nhóm thực phẩm.

- Ưu tiên khoảng 30–50 loại phổ biến: rau/củ/quả, trứng, thịt/cá, đậu, thực phẩm đóng gói, dầu/gia vị; cần kiểm tra quyền sử dụng nguồn dữ liệu tương ứng.
- Ghi nhiều điện thoại, ánh sáng, góc chụp, khoảng cách, mức che khuất; có cả số lượng ít/nhiều và vật chứa khác nhau.
- Cân phần ăn được của từng nguyên liệu, trừ bì, ghi số lượng và sống/chín. Cân phải phù hợp lượng cần đo; kiểm tra cân trước phiên ghi dữ liệu.
- Có nhãn bao bì hoặc bản ghi nguồn cho dinh dưỡng; không dùng giá trị model trả về làm đáp án chuẩn.
- Chia tập theo hộ gia đình/phiên nấu/đối tượng vật lý; không cho ảnh khác góc của cùng thực phẩm lọt sang hai tập. Tập test không dùng để chọn prompt hay ngưỡng.
- Hai người kiểm tra nhãn cho mẫu khó; báo số mẫu bất đồng, lý do loại mẫu và số mẫu từng nhóm. Bổ sung mẫu khi một nhóm quá ít để kết luận.

### 7.2. Chất lượng công thức và dị ứng

- Giữ bộ 41 ca hiện tại làm hồi quy; mở rộng bằng tình huống có nhãn bao bì, gia vị và tên Việt thực tế do người có chuyên môn rà soát.
- Ít nhất 60 tình huống công thức trong đợt thử ban đầu; hai người chấm độc lập theo khả thi, đúng nguyên liệu/định lượng, rõ hướng dẫn, hợp khẩu vị và an toàn.
- Có nấu thử một tập món đại diện. Một câu trả lời hợp schema không chứng minh thực hiện được.
- Báo riêng lỗi nghiêm trọng: xung đột dị ứng, nguyên liệu ngoài danh sách, bỏ điều kiện nhiệt độ/thời gian quan trọng. Không dùng điểm trung bình để bù cho các lỗi này.

### 7.3. Trải nghiệm đứng bếp và giọng nói

- Thử với 8–12 người ở vòng khả dụng đầu tiên; đây là vòng phát hiện vấn đề, chưa đủ cho kết luận đại diện mọi người dùng.
- Quan sát đọc hành động trong khoảng 3 giây, từ khoảng cách 0,8–1,2 m; thao tác bằng một tay hoặc tay đeo găng trong điều kiện thử an toàn. Không cần làm ướt thiết bị để mô phỏng tay bận.
- Thử Chrome Android và Safari iOS trên máy thật, điện thoại nhỏ/lớn, dọc/ngang và phóng chữ 200%.
- Ghi lệnh trong điều kiện yên tĩnh, quạt hút, nước chảy, loa đang đọc; có nhiều giọng vùng miền, câu phủ định, sửa ý và lặp lệnh.
- Mục tiêu khả dụng đề xuất: ≥90% hoàn thành tác vụ chính không cần hướng dẫn trong vòng thử; báo số người/số tác vụ, thao tác nhầm và thời gian thay vì chỉ báo “đã pass”.

Mỗi bộ dữ liệu cần manifest, phiên bản, cách thu thập, quyền sử dụng, tiêu chí nhãn và tập chia; mỗi lần chạy cần lưu model/prompt, cấu hình, thời gian, dự đoán gốc, hiệu chỉnh và kết quả từng mẫu.

## 8. Kế hoạch triển khai theo mốc

| Mốc | Công việc cụ thể | Đầu ra | Điều kiện qua mốc |
| --- | --- | --- | --- |
| M0 — Chốt hướng và bằng chứng | Xác nhận logo/tên chuẩn; chốt phạm vi thực phẩm và định nghĩa >80%; khóa danh sách góp ý; bắt đầu thiết kế thu thập dữ liệu | Bộ nhận diện được xác nhận; tiêu chí nghiệm thu và mẫu nhãn dữ liệu | Không còn tự diễn giải logo hoặc chỉ số chính xác |
| M1 — Thiết kế luồng mobile | Prototype chụp → sửa kết quả → món → nấu; dock +; hồ sơ gọn; bố cục nấu riêng; thử nhanh tác vụ | Prototype có trạng thái thường/lỗi/quyền camera; danh sách nội dung bỏ/giữ/thu gọn | Chủ dự án xác nhận luồng chính đáp ứng tính đơn giản; thử nhanh không phải tìm qua biểu mẫu để chụp |
| M2 — Camera và chế độ nấu | Làm camera thật; chọn ảnh/nhập tay dự phòng; tách AppShell cho `/cooking`; bước nguyên tử; nút lớn; giọng nói/hẹn giờ/phục hồi | Luồng sử dụng chạy được trên Android/iOS thật | Bấm + mở camera; không sidebar/dock khi nấu; không mất bước; không cắt mất chỉ dẫn quan trọng |
| M3 — Định lượng và dinh dưỡng | Schema mới; pipeline nhận diện/đếm/ước lượng; bản ghi nguồn; hiển thị bất định; chỉnh nhanh; so sánh một ảnh với phương án bổ sung | Bản thử nghiệm AI tự điền và tính lại; dữ liệu đo sai số trên tập phát triển | Không bịa số tin cậy; có căn cứ chọn phương án trước khi khóa test; nếu chưa đạt phải ghi “thử nghiệm” |
| M4 — Lưu trữ và cá nhân hóa | Thiết kế DB máy chủ và đăng nhập; đồng bộ hồ sơ/món/phản hồi; hàng đợi offline, xử lý xung đột; giữ chế độ khách và di chuyển IndexedDB | Lịch sử liên thiết bị; dữ liệu theo tài khoản; xuất/xóa dữ liệu và phục hồi | Tài khoản A không đọc dữ liệu B; sync không làm mất ghi chú hoặc ghi đè dị ứng mới; ảnh chỉ lưu theo lựa chọn rõ ràng |
| M5 — Nghiệm thu độc lập | Khóa phiên bản; chạy tập test chưa dùng phát triển; chấm công thức; thử bếp thật; đo voice; kiểm tra truy cập và tải | Báo cáo đủ mẫu, lỗi, nguồn, khoảng tin cậy; ma trận U1–U6/J1–J6 cập nhật | Đạt từng cổng nghiệm thu; chưa đạt chỉ số nào phải công bố, không gọi chung “đã hoàn tất report” |
| M6 — Phát hành có kiểm soát | Cấu hình môi trường, Redis, DB, quyền, hạn mức chi phí, theo dõi lỗi; thử bản staging; kế hoạch rollback | Bản phát hành và hướng dẫn vận hành | Kiểm tra trên hạ tầng đích đạt; có người phụ trách vận hành và đánh giá chuyên môn |

M0 → M1 → M2 là thứ tự ưu tiên sửa trải nghiệm. Việc thu thập dữ liệu bắt đầu từ M0 vì M3/M5 phụ thuộc dữ liệu thật. M4 có thể chuẩn bị trong thời gian thu thập nhưng không được để đăng nhập cản trở lần chụp đầu tiên. Chưa cam kết ngày hoàn thành M3/M5 khi chưa biết dữ liệu, thiết bị và nhân sự đánh giá có sẵn.

### Phạm vi mã nguồn dự kiến

| Khu vực | Thay đổi |
| --- | --- |
| `src/components/app-shell.tsx`, `src/app/layout.tsx`, `public/icon.svg` | Đồng bộ thương hiệu; dock camera; khung ứng dụng theo chế độ |
| `src/app/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/globals.css` | Trang chủ ưu tiên chụp; hồ sơ ngắn; kiểu chữ và khoảng cách mobile; thông tin phụ mở theo nhu cầu |
| `src/app/scan/page.tsx`, `src/lib/image.ts`, phần camera mới | Camera-first; trạng thái quyền/lỗi; xem/sửa kết quả; nhiều ảnh không đếm trùng |
| `src/app/api/vision/route.ts`, `src/lib/schemas.ts`, `src/types/domain.ts` | Đối tượng, số lượng, định lượng, phương pháp suy ra và trạng thái xác nhận |
| `src/lib/nutritionDatabase.ts`, `src/lib/recipe-review.ts` | Đối chiếu danh mục mở rộng; tính dinh dưỡng và nguồn theo đầu vào ước tính/đã cân |
| `src/app/api/recipe/route.ts`, `src/app/result/page.tsx` | Bước nấu một hành động; nguồn đúng ngữ cảnh; giữ kiểm tra dị ứng và nguyên liệu |
| `src/app/cooking/page.tsx`, `src/features/cooking` | Chế độ nấu độc lập, điều khiển lớn, ngắt lời đọc, giữ bước/hẹn giờ |
| `src/lib/db.ts`, `src/lib/backup.ts`, phần auth/sync/server DB mới | Đồng bộ có phân quyền, lịch sử và phản hồi; di chuyển dữ liệu không mất bản ghi |
| `tests`, `docs` | Test chức năng mới, dataset thực, benchmark định lượng, báo cáo chất lượng và nghiệm thu |

## 9. Tiêu chí bàn giao

- [ ] Logo và tên đúng bộ nhận diện; thống nhất mọi điểm xuất hiện.
- [ ] Luồng chính bắt đầu bằng chụp; không bắt nhập gram hoặc tên từng nguyên liệu ở bước đầu.
- [ ] Dock mobile có + giữa; camera mở sau một thao tác, có đường lui khi không cấp quyền.
- [ ] Nhận diện hiển thị số lượng/gram ước tính và sửa nhanh; không đánh tráo ước tính thành đo thực.
- [ ] Nấu trên màn riêng: một hành động, chữ lớn, nút lớn, dừng đọc thuận tiện, không sidebar/dock/thông tin phụ.
- [ ] Ngắt giọng và ưu tiên lệnh mới được đo với âm thanh thật, có kiểm tra tự nghe giọng loa.
- [ ] Đạt mục tiêu >80% theo định nghĩa đã khóa và phạm vi công bố; có bằng chứng độc lập, không chỉ AI tự chấm.
- [ ] Cảnh báo dị ứng còn nguyên hiệu lực khi rút gọn UI; xử lý được trường hợp bỏ sót/cảnh báo nhầm trong bộ chuyên gia.
- [ ] Dinh dưỡng có nguồn, trạng thái và cách tính; thiếu dữ liệu được thể hiện đúng.
- [ ] Lịch sử tư vấn/phản hồi/hồ sơ có thể lưu và tái sử dụng; đồng bộ máy chủ được kiểm thử phân quyền nếu nghiệm thu tính năng này.
- [ ] Đánh giá công thức và dataset đáp ứng J5/J6; mỗi góp ý có bằng chứng riêng.
- [ ] Test tự động, thử thiết bị thật và kiểm tra môi trường triển khai đều đạt; báo cáo các giới hạn còn lại.

## 10. Đầu vào còn cần trước khi triển khai các phần phụ thuộc

| Đầu vào | Ảnh hưởng |
| --- | --- |
| Logo gốc và tên thương hiệu chuẩn | Chặn việc chốt nhận diện M0; không chặn phân tích luồng |
| Chấp thuận định nghĩa đo >80%, danh mục thực phẩm và điều kiện chụp | Chặn việc tuyên bố đạt chỉ số; cần khóa trước tập test |
| Ảnh được phép dùng, cân và người lập nhãn/đánh giá | Chặn nghiệm thu AI thực tế M3/M5 |
| Thiết bị iOS/Android, người tham gia thử bếp | Chặn nghiệm thu camera/giọng nói/khả dụng thực tế |
| Hạ tầng DB/auth/Redis và chính sách lưu ảnh | Chặn triển khai đồng bộ và phát hành production, không chặn prototype |

Việc cần làm tiếp theo là chốt M0 và dựng prototype M1 theo luồng chụp–nấu mới. Chỉ tiếp tục mở rộng giao diện sau khi chứng minh người dùng tìm được hành động chính ngay và chế độ nấu đáp ứng bối cảnh đứng bếp.
