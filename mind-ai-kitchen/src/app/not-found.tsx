import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="empty panel">
      <p className="eyebrow">404</p>
      <h1>Trang này không có trong sổ.</h1>
      <p>Trở về căn bếp để tiếp tục chuẩn bị bữa ăn.</p>
      <Link className="btn" href="/">
        Về căn bếp
      </Link>
    </div>
  );
}
