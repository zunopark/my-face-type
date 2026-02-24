import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "환불 정책",
  description: "관상가 양반 서비스 환불 정책 안내",
};

export default function RefundPage() {
  return (
    <div className="main_body_wrap" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <Link href="/" className="back-btn-glass">
        <span className="material-icons">arrow_back_ios</span>
        <span>홈으로</span>
      </Link>

      <div style={{ width: "100%", padding: "60px 20px 40px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2c", marginBottom: 28 }}>
          환불 정책
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: 14, color: "#444", lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>1. 환불 가능 조건</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>결제 후 7일 이내 환불 요청 시</li>
              <li>서비스 이용 전 환불 요청 시</li>
              <li>시스템 오류로 인한 서비스 장애 발생 시</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>2. 환불 불가 조건</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>이미 분석 결과를 확인한 경우</li>
              <li>결제 후 7일이 경과한 경우</li>
              <li>부정한 방법으로 서비스를 이용한 경우</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>3. 환불 절차</h2>
            <ol style={{ paddingLeft: 20, listStyleType: "decimal" }}>
              <li>고객센터로 환불 요청 이메일 발송</li>
              <li>결제 정보 및 환불 사유 기재</li>
              <li>확인 후 3~5 영업일 이내 처리</li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>4. 환불 금액</h2>
            <p>결제 금액 전액이 환불되며, 결제 수단에 따라 환불 소요 시간이 다를 수 있습니다.</p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>5. 고객센터 연락처</h2>
            <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 13, color: "#666" }}>
                이메일: <a href="mailto:dydtjq94@yonsei.ac.kr" style={{ color: "#c4965a", textDecoration: "underline" }}>dydtjq94@yonsei.ac.kr</a>
              </p>
              <p style={{ fontSize: 13, color: "#666" }}>전화: 010-7189-9943</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
