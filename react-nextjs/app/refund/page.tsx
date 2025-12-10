import { Metadata } from "next";
import { Header, Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "환불 정책",
  description: "관상가 양반 서비스 환불 정책 안내",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header showBack backHref="/" title="환불 정책" />

      <main className="flex-1 max-w-md mx-auto w-full p-4 pb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-bold mb-6">환불 정책</h1>

          <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
            <section>
              <h2 className="font-bold text-gray-900 mb-2">1. 환불 가능 조건</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>결제 후 7일 이내 환불 요청 시</li>
                <li>서비스 이용 전 환불 요청 시</li>
                <li>시스템 오류로 인한 서비스 장애 발생 시</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">2. 환불 불가 조건</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>이미 분석 결과를 확인한 경우</li>
                <li>결제 후 7일이 경과한 경우</li>
                <li>부정한 방법으로 서비스를 이용한 경우</li>
              </ul>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">3. 환불 절차</h2>
              <ol className="list-decimal list-inside space-y-1 text-gray-600">
                <li>고객센터로 환불 요청 이메일 발송</li>
                <li>결제 정보 및 환불 사유 기재</li>
                <li>확인 후 3~5 영업일 이내 처리</li>
              </ol>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">4. 환불 금액</h2>
              <p className="text-gray-600">
                결제 금액 전액이 환불되며, 결제 수단에 따라 환불 소요 시간이
                다를 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="font-bold text-gray-900 mb-2">5. 고객센터 연락처</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600">
                  이메일:{" "}
                  <a
                    href="mailto:dydtjq94@yonsei.ac.kr"
                    className="text-[var(--fortune-gold)] hover:underline"
                  >
                    dydtjq94@yonsei.ac.kr
                  </a>
                </p>
                <p className="text-gray-600 mt-1">전화: 010-7189-9943</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
