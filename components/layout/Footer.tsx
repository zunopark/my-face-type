import Link from "next/link";

const APP_VERSION = "2.21";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer_text_wrap">
        <span className="footer_company">AI 관상가 양반</span>
      </div>

      <div className="business_info">
        <div><strong>상호명 (대표자명)</strong> – 엔맥스 (윤용섭)</div>
        <div><strong>사업자등록번호</strong> - 418-12-65319</div>
        <div><strong>사업장 주소</strong> - 서울특별시 마포구 월드컵북로 6길 57-6, 2층 (연남동)</div>
        <div><strong>유선번호</strong> – 010-7189-9943</div>
        <div><strong>통신판매업 신고번호</strong> - 제 2023-성남분당B-0437 호</div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <a href="mailto:dydtjq94@yonsei.ac.kr" className="contact_me">고객센터</a>
        <a href="mailto:dydtjq94@yonsei.ac.kr" className="contact_me">API 또는 협업 문의</a>
        <Link href="/refund" className="contact_me">환불 정책 보기</Link>
      </div>

      <span className="footer_text_wrap">
        &copy; 2025. NMAX, All Rights Reserved. App Version: {APP_VERSION}
      </span>
    </footer>
  );
}
