'use client';
import Link from 'next/link';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel empty" role="alert">
      <h1>Căn bếp đang gặp trục trặc.</h1>
      <p>
        Không đọc được dữ liệu hoặc trang chưa tải xong. Nếu trình duyệt đang chặn lưu trữ, hãy cho
        phép dữ liệu trang web rồi thử lại.
      </p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn" onClick={reset}>
          Thử lại
        </button>
        <Link className="btn btn-secondary" href="/">
          Về căn bếp
        </Link>
      </div>
    </div>
  );
}
