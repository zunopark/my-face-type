import { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "양반가 서비스 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <div className="main_body_wrap" style={{ background: "#faf8f4", minHeight: "100vh" }}>
      <Link href="/" className="back-btn-glass">
        <span className="material-icons">arrow_back_ios</span>
        <span>홈으로</span>
      </Link>

      <div style={{ width: "100%", padding: "60px 20px 40px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2c2c2c", marginBottom: 4 }}>
          개인정보처리방침
        </h1>
        <p style={{ fontSize: 12, color: "#999", marginBottom: 28 }}>시행일: 2025년 6월 30일</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontSize: 14, color: "#444", lineHeight: 1.7 }}>
          <p>
            엔맥스(이하 &quot;회사&quot;)는 개인정보보호법 등 관련 법령에 따라 이용자의 개인정보를 보호하고,
            관련 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>1. 수집하는 개인정보 항목</h2>
            <p style={{ marginBottom: 12 }}>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#6b4423", marginBottom: 4 }}>사주 분석 서비스 (신년운세, 연애사주)</p>
                <p style={{ fontSize: 13, color: "#666" }}>이름, 생년월일, 태어난 시간, 성별, 양력/음력, 직업 상태, 연애 상태, 자유 입력 고민/소원</p>
              </div>
              <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#6b4423", marginBottom: 4 }}>관상 분석 서비스 (관상, 궁합)</p>
                <p style={{ fontSize: 13, color: "#666" }}>얼굴 사진, 성별, 관계 유형</p>
              </div>
              <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#6b4423", marginBottom: 4 }}>동물상 테스트</p>
                <p style={{ fontSize: 13, color: "#666" }}>성별 (얼굴 사진은 기기 내에서만 분석되며 서버로 전송되지 않습니다)</p>
              </div>
              <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#6b4423", marginBottom: 4 }}>결제 시</p>
                <p style={{ fontSize: 13, color: "#666" }}>결제 수단 정보, 결제 금액, 쿠폰 사용 내역 (카드 번호 등 결제 민감 정보는 토스페이먼츠에서 직접 처리하며, 회사는 보관하지 않습니다)</p>
              </div>
              <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#6b4423", marginBottom: 4 }}>자동 수집 정보</p>
                <p style={{ fontSize: 13, color: "#666" }}>서비스 이용 기록, 접속 로그, 접속 경로(UTM), 기기 정보</p>
              </div>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>2. 개인정보 수집 및 이용 목적</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>AI 사주·관상 분석 서비스 제공</li>
              <li>유료 서비스 결제 및 환불 처리</li>
              <li>서비스 이용 통계 분석 및 품질 개선</li>
              <li>고객 문의 응대 및 분쟁 처리</li>
              <li>마케팅 성과 분석 (접속 경로, 전환율 등)</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>3. 개인정보 보유 및 파기</h2>
            <p style={{ marginBottom: 8 }}>회사는 개인정보 이용 목적이 달성되면 지체 없이 파기합니다. 단, 관련 법령에 따라 아래 기간 동안 보관합니다.</p>
            <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 13, color: "#666" }}><strong>계약 또는 청약철회 기록:</strong> 5년 (전자상거래법)</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>대금결제 및 재화 공급 기록:</strong> 5년 (전자상거래법)</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>소비자 불만·분쟁 처리 기록:</strong> 3년 (전자상거래법)</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>접속 로그 기록:</strong> 3개월 (통신비밀보호법)</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>분석 결과 데이터:</strong> 결제일로부터 90일 후 자동 만료</p>
            </div>
            <p style={{ marginTop: 8, fontSize: 13 }}>
              파기 방법: 전자적 파일은 복구 불가능한 기술적 방법으로 삭제하며, 출력물은 분쇄 또는 소각합니다.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>4. 개인정보의 제3자 제공</h2>
            <p style={{ marginBottom: 8 }}>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 다음의 경우에 한하여 제공할 수 있습니다.</p>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>이용자가 사전에 명시적으로 동의한 경우</li>
              <li>법령에 근거하여 수사기관 등 국가기관의 적법한 요청이 있는 경우</li>
              <li>이용자의 생명·신체·재산 보호를 위해 긴급히 필요한 경우</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>5. 개인정보 처리 위탁</h2>
            <p style={{ marginBottom: 8 }}>회사는 서비스 제공을 위해 아래 업체에 개인정보 처리를 위탁합니다.</p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f0ece4" }}>
                    <th style={{ border: "1px solid #e0d8c8", padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#6b4423" }}>수탁업체</th>
                    <th style={{ border: "1px solid #e0d8c8", padding: "8px 10px", textAlign: "left", fontWeight: 600, color: "#6b4423" }}>위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>토스페이먼츠</td>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>결제 처리</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>Supabase (미국)</td>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>데이터 저장 및 파일 호스팅</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>Mixpanel (미국)</td>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>서비스 이용 통계 분석</td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>Google (미국)</td>
                    <td style={{ border: "1px solid #e0d8c8", padding: "8px 10px", color: "#666" }}>웹 분석(GA4), 광고 전환 추적</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>6. 쿠키 및 자동 수집 장치</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>회사는 서비스 이용 분석을 위해 Mixpanel(브라우저 localStorage), Google Analytics(쿠키)를 사용합니다.</li>
              <li>이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만, 일부 서비스 이용이 제한될 수 있습니다.</li>
              <li>동물상 테스트 서비스의 경우, 얼굴 사진은 이용자의 기기 내에서만 처리되며 외부 서버로 전송되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>7. 개인정보의 안전성 확보 조치</h2>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>데이터베이스 접근 권한 제한 및 접근 통제</li>
              <li>SSL/TLS를 통한 데이터 전송 구간 암호화</li>
              <li>개인정보 접근 기록 관리</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>8. 이용자의 권리와 행사 방법</h2>
            <p>
              이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다.
              아래 고객센터로 이메일 또는 서면으로 요청하시면 지체 없이 처리합니다.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>9. 개인정보 보호책임자</h2>
            <div style={{ background: "#f0ece4", padding: 12, borderRadius: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ fontSize: 13, color: "#666" }}><strong>성명:</strong> 윤용섭</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>직위:</strong> 대표</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>이메일:</strong> dydtjq94@yonsei.ac.kr</p>
              <p style={{ fontSize: 13, color: "#666" }}><strong>전화:</strong> 010-7189-9943</p>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>10. 개인정보 침해 신고 및 상담</h2>
            <p style={{ marginBottom: 8 }}>개인정보 침해 관련 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
            <ul style={{ paddingLeft: 20, listStyleType: "disc" }}>
              <li>개인정보침해신고센터: 국번 없이 118 / privacy.kisa.or.kr</li>
              <li>대검찰청 사이버범죄수사과: 국번 없이 1301 / spo.go.kr</li>
              <li>경찰청 사이버수사국: 국번 없이 182 / cyberbureau.police.go.kr</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#2c2c2c", marginBottom: 8 }}>11. 개인정보처리방침 변경</h2>
            <p>
              이 개인정보처리방침은 법령 변경 또는 서비스 변경에 따라 업데이트될 수 있습니다.
              중요한 변경 사항이 있을 경우 최소 7일 전에 서비스 내 공지합니다.
              이용자에게 불리한 변경은 최소 30일 전에 공지합니다.
            </p>
          </section>

          <div style={{ background: "#f0ece4", padding: 16, borderRadius: 12, marginTop: 8 }}>
            <p style={{ fontSize: 12, color: "#8b7355" }}>본 개인정보처리방침은 2025년 6월 30일부터 시행됩니다.</p>
            <p style={{ fontSize: 12, color: "#8b7355", marginTop: 4 }}>문의: dydtjq94@yonsei.ac.kr | 010-7189-9943</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
