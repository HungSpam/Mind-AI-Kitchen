import Link from 'next/link';
import { FOOD_REFERENCES, SAFETY_SOURCES } from '@/lib/nutritionDatabase';
export default function AboutPage() {
  return (
    <article className="document">
      <div className="page-head">
        <p className="eyebrow">Minh bạch từ căn bếp</p>
        <h1>Bạn biết dữ liệu đến từ đâu.</h1>
        <p>Cách Mind Kitchen tạo món, lưu thông tin và giúp bạn kiểm tra lại những gợi ý.</p>
      </div>
      <h2>Công thức và dị ứng</h2>
      <p>
        Công thức được Google Gemini tạo từ nguyên liệu bạn xác nhận, hồ sơ hiện tại và tối đa 5
        phản hồi gần đây. Ứng dụng kiểm tra cấu trúc, đối chiếu mã nguyên liệu và dò từ khóa dị ứng
        trong tên món, mô tả, nguyên liệu và bước nấu. Công thức bị phát hiện xung đột sẽ không được
        dùng để bắt đầu nấu.
      </p>
      <p>
        Ảnh có thể bỏ sót thực phẩm hoặc thành phần ẩn. Bộ dò từ khóa cũng có thể bỏ sót hay cảnh
        báo nhầm. Kiểm tra nhãn, gia vị và nhiễm chéo là bước cần thiết; ứng dụng không bảo đảm một
        món ăn không gây dị ứng và không thay thế tư vấn chuyên môn.
      </p>
      <ul>
        {SAFETY_SOURCES.map((s) => (
          <li key={s.url}>
            <a className="link" href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title} ↗
            </a>{' '}
            — {s.note}
          </li>
        ))}
      </ul>
      <h2>Dinh dưỡng có thể đối chiếu</h2>
      <p>
        Hiện có {FOOD_REFERENCES.length} bản ghi USDA FoodData Central đã được đối chiếu ngày
        16/10/2026. Mỗi số liệu tính theo 100 g phần ăn được và trạng thái chế biến ghi trong bản
        ghi. Ứng dụng nhân với khối lượng bạn nhập; chỉ hiển thị tổng calories và macros khi tất cả
        nguyên liệu đều có dữ liệu phù hợp. Không lấy số dinh dưỡng do AI tự ước đoán.
      </p>
      <p>
        Tên thực phẩm phải khớp bản ghi hỗ trợ. Đậu phụ cứng, thịt sống và cơm đã nấu không thể tự
        động dùng thay cho mọi loại đậu phụ, thịt đã chín hoặc gạo sống. Cách chế biến và sản phẩm
        thực tế có thể làm thay đổi giá trị.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Thực phẩm tham chiếu</th>
              <th>kcal / 100 g</th>
              <th>Nguồn gốc</th>
            </tr>
          </thead>
          <tbody>
            {FOOD_REFERENCES.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.calories}</td>
                <td>
                  <a
                    className="link"
                    href={'https://fdc.nal.usda.gov/food-details/' + f.id + '/nutrients'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    USDA {f.id} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Thông tin của bạn được lưu thế nào?</h2>
      <p>
        Hồ sơ và phiên đang mở được lưu trong localStorage; công thức, phản hồi, phiên bản hồ sơ và
        nhật ký bữa ăn được lưu trong cơ sở dữ liệu IndexedDB trên trình duyệt này. Chưa có tài
        khoản hay đồng bộ máy chủ. Xóa dữ liệu trình duyệt hoặc dùng chế độ riêng tư có thể làm mất
        dữ liệu; bạn có thể xuất và nhập bản sao lưu trong{' '}
        <Link className="link" href="/library">
          Sổ công thức
        </Link>
        .
      </p>
      <p>
        Khi yêu cầu AI, nguyên liệu, hồ sơ ăn uống và phản hồi liên quan được gửi đến máy chủ ứng
        dụng rồi đến Google Gemini. Ảnh chỉ gửi khi bạn chọn nhận diện ảnh. Máy chủ ứng dụng không
        lưu ảnh hoặc hồ sơ trong cơ sở dữ liệu và không ghi chúng vào nhật ký lỗi. Chính sách lưu dữ
        liệu của nhà cung cấp AI tùy loại tài khoản và điều khoản dịch vụ.
      </p>
      <p>
        <a
          className="link"
          href="https://ai.google.dev/gemini-api/terms"
          target="_blank"
          rel="noopener noreferrer"
        >
          Điều khoản Gemini API ↗
        </a>
        . Nhận giọng nói dùng dịch vụ của trình duyệt; một số trình duyệt gửi âm thanh đến dịch vụ
        nhận dạng của họ. Bạn chủ động bật/tắt micro.
      </p>
      <h2>Đánh giá chất lượng</h2>
      <p>
        Ứng dụng hiển thị các điều kiện đã kiểm tra và độ bao phủ dữ liệu thay vì gán một điểm “an
        toàn” hoặc “phù hợp” chung. Công thức AI chưa được đầu bếp kiểm chứng thực nghiệm. Đánh giá
        sao và ghi chú là phản hồi cá nhân của bạn.
      </p>
      <p>
        Bộ kiểm thử trong mã nguồn gọi trực tiếp các hàm đang sử dụng, có ca đúng/sai, dị ứng hỗn
        hợp, tiếng Việt không dấu, khẩu lệnh phủ định, dữ liệu thiếu, lưu trữ và lỗi API. Những ca
        mô phỏng không thay thế kiểm thử với ảnh thực, tiếng ồn thực tế và đánh giá của chuyên gia.
      </p>
    </article>
  );
}
