import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "이용약관",
  description: "양반가 서비스 이용약관",
};

export default function TermsPage() {
  return (
    <div className="main_body_wrap" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <Link href="/" className="back-btn-glass">
        <span className="material-icons">arrow_back_ios</span>
        <span>홈으로</span>
      </Link>

      <div style={{ width: "100%", padding: "60px 20px 40px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2c", marginBottom: 4 }}>
          양반가 서비스 이용약관
        </h1>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 28 }}>시행일: 2025년 6월 30일</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: 14, color: "#444", lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제1조 (목적)</h2>
            <p>
              이 약관은 엔맥스(이하 &quot;회사&quot;)가 운영하는 양반가 서비스(이하 &quot;서비스&quot;)를 이용함에 있어
              회사와 이용자 간의 권리, 의무 및 책임사항, 서비스 이용 조건 등 기본적인 사항을 규정하는 것을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제2조 (정의)</h2>
            <p style={{ marginBottom: 8 }}>이 약관에서 사용하는 주요 용어의 정의는 다음과 같습니다.</p>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>&quot;서비스&quot;란 회사가 제공하는 사주, 관상 등 전통 운세 관련 AI 분석 서비스 일체를 의미합니다.</li>
              <li>&quot;이용자&quot;란 이 약관에 동의하고 서비스를 이용하는 자를 의미합니다.</li>
              <li>&quot;유료 서비스&quot;란 이용자가 결제 후 이용할 수 있는 운세 분석 콘텐츠를 의미합니다.</li>
              <li>&quot;콘텐츠&quot;란 서비스 내에서 AI가 생성하거나 회사가 제공하는 문자, 이미지, 데이터 등 일체의 결과물을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제3조 (약관의 게시 및 개정)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>회사는 이 약관을 서비스 초기 화면 또는 연결 화면에 게시합니다.</li>
              <li>회사는 관련 법령에 위배되지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 적용일 7일 전에 공지합니다.</li>
              <li>이용자에게 불리한 변경은 최소 30일 전에 공지하며, 이용자가 동의하지 않을 경우 서비스 이용을 중단할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제4조 (이용계약의 성립)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>이용계약은 이용자가 서비스 이용에 동의하고, 필요한 정보를 입력하여 서비스를 이용함으로써 성립됩니다.</li>
              <li>별도의 회원가입 절차 없이 서비스를 이용할 수 있으며, 서비스 이용 시 이 약관에 동의한 것으로 간주합니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제5조 (서비스의 내용)</h2>
            <p style={{ marginBottom: 8 }}>회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>AI 기반 신년 운세 분석 서비스 (2026 신년 운세)</li>
              <li>AI 기반 연애 사주 분석 서비스</li>
              <li>AI 기반 관상 분석 서비스</li>
              <li>AI 기반 궁합 관상 분석 서비스</li>
              <li>AI 기반 동물상 테스트 서비스</li>
              <li>기타 전통 운세 관련 서비스</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              회사는 서비스를 연중 24시간 제공하는 것을 원칙으로 합니다. 다만, 시스템 점검, 설비 교체, 통신 장애, 천재지변 등 불가피한 사유로 서비스가 일시 중단될 수 있으며, 사전 공지를 원칙으로 합니다.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제6조 (유료 서비스 및 결제)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>유료 서비스의 이용요금은 서비스 내 결제 페이지에 표시된 금액을 기준으로 합니다.</li>
              <li>이용자는 토스페이먼츠(TossPayments)를 통한 신용카드, 체크카드, 간편결제 등의 수단으로 결제할 수 있습니다.</li>
              <li>회사가 발급한 쿠폰 코드를 통해 할인 또는 무료로 유료 서비스를 이용할 수 있습니다.</li>
              <li>결제 완료 후 서비스가 즉시 제공되며, 환불 조건은 별도의 환불 정책에 따릅니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제7조 (환불 정책)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>결제 후 7일 이내, 서비스 이용 전 환불 요청 시 전액 환불</li>
              <li>이미 분석 결과를 확인한 경우, 결제 후 7일이 경과한 경우 환불 불가</li>
              <li>시스템 오류로 인한 서비스 장애 발생 시 전액 환불</li>
              <li>환불 요청은 고객센터(dydtjq94@yonsei.ac.kr)로 연락 바랍니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제8조 (AI 분석 결과의 한계)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>서비스에서 제공하는 AI 분석 결과는 오락 및 참고용이며, 전문적인 상담이나 진단을 대체하지 않습니다.</li>
              <li>이용자는 AI 분석 결과를 의료, 법률, 재무 등 중요한 의사결정의 근거로 삼아서는 안 됩니다.</li>
              <li>AI가 생성한 결과물은 매 조회 시 세부 내용이 달라질 수 있으며, 동일한 입력값에 대해서도 결과가 상이할 수 있습니다.</li>
              <li>AI 결과로 인해 발생한 손해에 대해 회사는 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제9조 (콘텐츠에 관한 권리)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>서비스 내 모든 콘텐츠(UI, 디자인, 텍스트, 알고리즘, 분석 결과 등)에 대한 지식재산권은 회사에 귀속됩니다.</li>
              <li>이용자는 분석 결과를 개인적인 용도로 이용할 수 있습니다. 다만, 회사의 사전 동의 없이 상업적 복제·배포·전송·2차적 저작물 작성은 금지됩니다.</li>
              <li>자동화 도구(스크립트, 크롤러 등)를 이용한 데이터 수집 및 서비스 운영 로직의 역공학(리버스 엔지니어링)은 금지됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제10조 (이용자의 의무)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>이용자는 서비스 이용 시 법령 및 이 약관을 준수해야 합니다.</li>
              <li>이용자는 서비스에 입력하는 정보의 정확성에 대해 스스로 책임집니다.</li>
              <li>이용자는 자신의 결제 수단 관리에 주의를 기울여야 하며, 부정 사용 발생 시 즉시 회사에 통보해야 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제11조 (손해배상 및 면책)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>회사는 무료로 제공하는 서비스와 관련하여 이용자에게 발생한 손해에 대해 책임을 지지 않습니다. 단, 회사의 고의 또는 중대한 과실로 인한 경우는 예외로 합니다.</li>
              <li>회사는 천재지변, 불가항력, 이용자의 귀책사유로 인한 서비스 중단 및 손해에 대해 책임을 지지 않습니다.</li>
              <li>AI 분석 결과를 활용한 의사결정으로 인한 손해는 전적으로 이용자의 책임입니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>제12조 (분쟁 해결 및 관할법원)</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>서비스 이용과 관련한 분쟁이 발생할 경우, 회사와 이용자는 상호 협의를 통해 원만히 해결하도록 노력합니다.</li>
              <li>협의로 해결되지 않는 경우, 회사 본사 소재지를 관할하는 법원을 전속 관할법원으로 합니다.</li>
            </ul>
          </section>

          <div style={{ background: "#f0ece4", padding: 16, borderRadius: 12, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#8b7355" }}>본 약관은 2025년 6월 30일부터 시행됩니다.</p>
            <p style={{ fontSize: 12, color: "#8b7355", marginTop: 4 }}>문의: dydtjq94@yonsei.ac.kr | 010-7189-9943</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
