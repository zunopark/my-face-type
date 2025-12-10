"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { analyzeCoupleReport, analyzeCoupleScore } from "@/app/actions/analyze";
import Footer from "@/components/layout/Footer";
import { track } from "@/lib/mixpanel";

// TossPayments 타입 선언
declare global {
  interface Window {
    PaymentWidget: (
      clientKey: string,
      customerKey: string
    ) => {
      renderPaymentMethods: (
        selector: string,
        options: { value: number }
      ) => unknown;
      renderAgreement: (selector: string) => void;
      requestPayment: (options: {
        orderId: string;
        orderName: string;
        customerName: string;
        successUrl: string;
        failUrl: string;
      }) => Promise<void>;
    };
  }
}

// 결제 설정
const PAYMENT_CONFIG = {
  clientKey:
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ||
    "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l",
  price: 9900,
  discountPrice: 7900,
  originalPrice: 21140,
  orderName: "AI 커플 궁합 관상 보고서",
};

// 저장된 결과 타입
interface CoupleResult {
  id: string;
  features1: string;
  features2: string;
  image1Base64: string;
  image2Base64: string;
  relationshipType: string;
  relationshipFeeling: string;
  createdAt: string;
  reports: {
    couple: {
      paid: boolean;
      data: {
        summary: string;
        score: number;
        details: string[];
      } | null;
    };
  };
}

// 로딩 메시지
const LOADING_MESSAGES = [
  "두 사람의 관상을 확인하고 있어요...",
  "눈빛과 인상 흐름을 해석 중입니다...",
  "관상 속 궁합의 실마리를 찾는 중이에요...",
  "이마와 코선의 조화를 분석하고 있어요...",
  "입꼬리와 턱선의 에너지를 비교 중입니다...",
  "감정선의 방향을 정밀하게 읽는 중이에요...",
  "코와 눈매, 점을 통해 속궁합을 살펴보고 있어요...",
  "마지막 조언을 정리하고 있어요...",
];

function CoupleResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [result, setResult] = useState<CoupleResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [showResult, setShowResult] = useState(false);

  // 결제 모달 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const paymentWidgetRef = useRef<ReturnType<typeof window.PaymentWidget> | null>(null);
  const discountWidgetRef = useRef<ReturnType<typeof window.PaymentWidget> | null>(null);

  // 하단 고정 버튼 표시 여부
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  // localStorage에서 결과 가져오기
  useEffect(() => {
    if (!resultId) {
      router.push("/");
      return;
    }

    const stored = localStorage.getItem(`couple_result_${resultId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as CoupleResult;
      setResult(parsed);

      // 이미 분석 완료된 경우 바로 결과 표시
      if (parsed.reports?.couple?.data?.details?.length === 5) {
        setShowResult(true);
        setIsLoading(false);
        return;
      }

      // 분석 시작
      setIsLoading(false);
      startAnalysis(parsed);
    } else {
      router.push("/");
    }
  }, [resultId, router]);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || window.scrollY;
      setShowFloatingBtn(scrollTop > 1400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 분석 시작
  const startAnalysis = useCallback(async (data: CoupleResult) => {
    setIsAnalyzing(true);
    setProgress(0);

    // 진행률 애니메이션
    let currentProgress = 0;
    const progressTimer = setInterval(() => {
      if (currentProgress < 98) {
        currentProgress += Math.random() * 1.8;
        setProgress(Math.min(currentProgress, 98));
      }
    }, 300);

    // 메시지 애니메이션
    let msgIdx = 0;
    const messageTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[msgIdx]);
    }, 4000);

    try {
      // 궁합 리포트 생성
      const reportResult = await analyzeCoupleReport(
        data.features1,
        data.features2,
        data.relationshipType,
        data.relationshipFeeling
      );

      if (!reportResult.success) throw new Error(reportResult.error);

      const report = reportResult.data;

      // 궁합 점수 계산
      const scoreResult = await analyzeCoupleScore(report.detail1);

      if (!scoreResult.success) throw new Error(scoreResult.error);

      const score = scoreResult.data;

      clearInterval(progressTimer);
      clearInterval(messageTimer);
      setProgress(100);

      // 결과 데이터 구성
      const coupleData = {
        paid: false,
        data: {
          summary: score.score2,
          score: score.score1,
          details: [
            report.detail1,
            report.detail2,
            report.detail3,
            report.detail4,
            report.detail5,
          ],
        },
      };

      // 결과 업데이트
      const updatedResult: CoupleResult = {
        ...data,
        reports: {
          ...data.reports,
          couple: coupleData,
        },
      };

      // localStorage 업데이트
      localStorage.setItem(`couple_result_${data.id}`, JSON.stringify(updatedResult));
      setResult(updatedResult);
      setShowResult(true);
    } catch (error) {
      console.error("분석 오류:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      clearInterval(progressTimer);
      clearInterval(messageTimer);
      setIsAnalyzing(false);
    }
  }, []);

  // 결제 모달 열기
  const openPaymentModal = () => {
    if (!result) return;

    track("유료 관상 분석 보고서 버튼 클릭", {
      resultId: result.id,
      type: "궁합",
      price: PAYMENT_CONFIG.price,
    });

    setShowPaymentModal(true);

    // TossPayments 위젯 초기화
    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(PAYMENT_CONFIG.clientKey, customerKey);
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#love-method", {
          value: PAYMENT_CONFIG.price,
        });
        widget.renderAgreement("#love-agreement");
      }
    }, 100);
  };

  // 결제 요청
  const handlePaymentRequest = async () => {
    if (!paymentWidgetRef.current || !result) return;

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: `order_${Date.now()}`,
        orderName: PAYMENT_CONFIG.orderName,
        customerName: "고객",
        successUrl: `${window.location.origin}/payment/success?id=${encodeURIComponent(result.id)}&type=couple`,
        failUrl: `${window.location.origin}/payment/fail?id=${encodeURIComponent(result.id)}&type=couple`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  };

  // 결제 모달 닫기 (할인 모달 열기)
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;

    track("궁합 결제창 닫힘", {
      id: result?.id,
    });

    // 1초 후 깜짝 할인 모달 열기
    setTimeout(() => {
      openDiscountModal();
    }, 1000);
  };

  // 할인 모달 열기
  const openDiscountModal = () => {
    if (!result) return;

    track("궁합 할인 결제창 열림", {
      id: result.id,
    });

    setShowDiscountModal(true);

    // TossPayments 위젯 초기화
    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(PAYMENT_CONFIG.clientKey, customerKey);
        discountWidgetRef.current = widget;

        widget.renderPaymentMethods("#discount-method", {
          value: PAYMENT_CONFIG.discountPrice,
        });
        widget.renderAgreement("#discount-agreement");
      }
    }, 100);
  };

  // 할인 결제 요청
  const handleDiscountPaymentRequest = async () => {
    if (!discountWidgetRef.current || !result) return;

    try {
      track("궁합 할인 결제 시도", {
        id: result.id,
        price: PAYMENT_CONFIG.discountPrice,
      });

      await discountWidgetRef.current.requestPayment({
        orderId: `discount_${Date.now()}`,
        orderName: "AI 커플 궁합 관상 보고서 - 할인 특가",
        customerName: "고객",
        successUrl: `${window.location.origin}/payment/success?id=${encodeURIComponent(result.id)}&type=couple`,
        failUrl: `${window.location.origin}/payment/fail?id=${encodeURIComponent(result.id)}&type=couple`,
      });
    } catch (err) {
      console.error("할인 결제 오류:", err);
    }
  };

  // 할인 모달 닫기
  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    discountWidgetRef.current = null;

    track("궁합 할인 결제창 닫힘", {
      id: result?.id,
    });
  };

  // 간단한 마크다운 파서
  const simpleMD = (src: string = "") => {
    let text = src;
    // 헤딩
    text = text.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
    text = text.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
    text = text.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
    text = text.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    text = text.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    text = text.replace(/^# (.*$)/gim, "<h1>$1</h1>");
    // 굵게/이탤릭
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // 리스트
    text = text.replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>");
    text = text.replace(/(<\/ul>\s*)<ul>/g, "");
    return `<p>${text}</p>`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
      </div>
    );
  }

  if (!result) return null;

  const isPaid = result.reports?.couple?.paid ?? false;
  const reportData = result.reports?.couple?.data;

  return (
    <div className="main_body_wrap">
      {/* Header */}
      <header id="couple-report" className="header_chat_wrap">
        <div className="header_chat header_fixed">
          <Link href="/" style={{ marginRight: "12px", textDecoration: "none" }}>
            <div className="header_chat_title">관상</div>
          </Link>
        </div>
      </header>

      <div className="main_content_wrap">
        <div className="main_title_wrap">
          <div className="main_title">
            대한민국 1등 관상가가 알려주는<br />우리 관상 궁합 보고서
          </div>
          <div className="main_subtitle">#궁합 점수 #바람기 #애정운 #속궁합</div>
        </div>

        {/* 사진 쌍 */}
        <div className="photo-pair">
          {result.image1Base64 && (
            <Image
              src={result.image1Base64}
              alt="내 사진"
              width={100}
              height={100}
              style={{ objectFit: "cover", borderRadius: "50%", border: "3px solid #d4c5a9" }}
              unoptimized
            />
          )}
          <span className="material-icons heart">favorite</span>
          {result.image2Base64 && (
            <Image
              src={result.image2Base64}
              alt="상대 사진"
              width={100}
              height={100}
              style={{ objectFit: "cover", borderRadius: "50%", border: "3px solid #d4c5a9" }}
              unoptimized
            />
          )}
        </div>

        {/* 로딩 중 */}
        {isAnalyzing && (
          <div className="loading-box dark-mode" id="loading">
            <div className="loading-text">{loadingMessage}</div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 결과 */}
        {showResult && reportData && (
          <div className="report-container" style={{ display: "block" }}>
            {/* 궁합 점수 */}
            <div className="score-summary">
              <div className="score-summary-title">궁합 점수</div>
              <div className="score-num">
                <span>{reportData.score}</span>점
              </div>
              <div
                className="summary-wrap"
                dangerouslySetInnerHTML={{ __html: simpleMD(reportData.summary) }}
              />
            </div>

            {/* 전체 보기 버튼 (미결제 시) */}
            {!isPaid && (
              <div className="view-full-mask-button-wrap" id="viewFullBtn-wrap">
                <div className="view-full-wrap">
                  <div className="full-subtitle">
                    <span className="couple_bold">2명의 관상</span>을 낱낱이 분석하는<br />AI
                    관상가 양반의
                    <span className="couple_bold"> 새로운 관상 궁합</span> 풀이!
                  </div>
                  <div className="full-check-wrap">
                    <div className="full-check">
                      <div className="full-check-title">
                        20년 관상 전문가의 궁합 데이터 반영
                      </div>
                      <span className="material-icons full-check-icon">check_circle</span>
                    </div>
                    <div className="full-check">
                      <div className="full-check-title">8,000자 이상의 상세 설명</div>
                      <span className="material-icons full-check-icon">check_circle</span>
                    </div>
                    <div className="full-check">
                      <div className="full-check-title">겉궁합, 속궁합 전격 분석</div>
                      <span className="material-icons full-check-icon">check_circle</span>
                    </div>
                    <div className="full-check">
                      <div className="full-check-title">갈등의 원인과 해소 방법</div>
                      <span className="material-icons full-check-icon">check_circle</span>
                    </div>
                  </div>
                  <button className="view-full-btn" onClick={openPaymentModal}>
                    전체 궁합 관상 보고서 확인하기
                  </button>
                </div>
              </div>
            )}

            {/* 상세 섹션들 */}
            {reportData.details.map((detail, idx) => (
              <div key={idx} className="section">
                <div className="result-content-wrap">
                  <pre dangerouslySetInnerHTML={{ __html: simpleMD(detail) }} />
                  {!isPaid && (
                    <div className="result-mask">
                      <div className="blur-overlay" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 하단 고정 버튼 (미결제 시) */}
        {showResult && !isPaid && (
          <div id="view-full-btn-wrap2">
            <button
              className="view-full-always-btn"
              onClick={openPaymentModal}
              style={{ display: showFloatingBtn ? "block" : "none" }}
            >
              전체 궁합 관상 보고서 확인하기
            </button>
          </div>
        )}
      </div>

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className="payment-overlay" style={{ display: "block" }}>
          <div className="payment-fullscreen">
            <div className="modal-content">
              <div className="payment-header">
                <div className="payment-title">커플 궁합 관상 리포트</div>
                <div className="payment-close" onClick={closePaymentModal}>
                  ✕
                </div>
              </div>
              <div className="payment-header">
                <div className="payment-subtitle">
                  얼굴만으로 밝혀지는 우리 관계의 모든 것
                </div>
              </div>

              <div className="report-wrap">
                <div className="report-title-wrap">
                  <div className="report-title">보고서 내용</div>
                  <div className="report-num">총 8,000자+ 심층 분석</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">1. 두 사람의 성격 궁합 분석</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">2. 관상으로 보는 연애 스타일</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">3. 나의 매력 & 유혹 전략</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">4. 헤어질 가능성과 주의할 점</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">
                    5. [+천기누설] 관상으로 보는 속궁합 분석 🔥
                  </div>
                </div>
              </div>

              <div className="payment-price-wrap">
                <div className="payment-original-price-title">보고서 금액</div>
                <div className="payment-original-price">
                  {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                </div>
              </div>

              <div className="payment-coupon-wrap">
                <div className="payment-coupon">쿠폰 할인 적용 💸</div>
              </div>
              <div className="payment-coupon-price-wrap">
                <div className="payment-coupon-title">
                  궁합 관상 보고서 런칭 특별가<br />(~07.27 단 7일간)
                </div>
                <div className="payment-coupon-price">-11,240원</div>
              </div>

              <div id="love-method" style={{ padding: 0, margin: 0 }} />
              <div id="love-agreement" />

              <div className="payment-final-price-wrap">
                <div className="payment-final-price-title">최종 결제 금액</div>
                <div className="payment-final-price-price-wrap">
                  <div className="payment-originam-price2">
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </div>
                  <div className="payment-final-price">
                    <div className="payment-final-price-discount">53%</div>
                    <div className="payment-final-price-num">
                      {PAYMENT_CONFIG.price.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>
              <button className="payment-final-btn" onClick={handlePaymentRequest}>
                보고서 확인하기
              </button>
              <div className="payment-empty" />
            </div>
          </div>
        </div>
      )}

      {/* 할인 모달 */}
      {showDiscountModal && (
        <div className="payment-overlay" style={{ display: "block" }}>
          <div className="payment-fullscreen">
            <div className="modal-content">
              <div className="payment-header">
                <div className="payment-title">🎁 깜짝 선물! 2,000원 추가 할인</div>
                <div className="payment-close" onClick={closeDiscountModal}>
                  ✕
                </div>
              </div>
              <div className="payment-header">
                <div className="payment-subtitle">
                  얼굴만으로 밝혀지는 우리 관계의 모든 것
                </div>
              </div>

              <div className="report-wrap">
                <div className="report-title-wrap">
                  <div className="report-title">보고서 내용</div>
                  <div className="report-num">총 8,000자+ 심층 분석</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">1. 두 사람의 성격 궁합 분석</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">2. 관상으로 보는 연애 스타일</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">3. 나의 매력 & 유혹 전략</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">4. 헤어질 가능성과 주의할 점</div>
                </div>
                <div className="report-contents-wrap">
                  <div className="report-contents">
                    5. [+천기누설] 관상으로 보는 속궁합 분석 🔥
                  </div>
                </div>
              </div>

              <div className="payment-price-wrap">
                <div className="payment-original-price-title">보고서 금액</div>
                <div className="payment-original-price">
                  {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                </div>
              </div>

              <div className="payment-coupon-wrap">
                <div className="payment-coupon">쿠폰 할인 적용 💸</div>
              </div>
              <div className="payment-coupon-price-wrap">
                <div className="payment-coupon-title">
                  궁합 관상 보고서 특별가 + 추가 2천원 할인
                </div>
                <div className="payment-coupon-price">-13,240원</div>
              </div>

              <div id="discount-method" />
              <div id="discount-agreement" />

              <div className="payment-final-price-wrap">
                <div className="payment-final-price-title">최종 결제 금액</div>
                <div className="payment-final-price-price-wrap">
                  <div className="payment-originam-price2">
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </div>
                  <div className="payment-final-price">
                    <div className="payment-final-price-discount">63%</div>
                    <div className="payment-final-price-num">
                      {PAYMENT_CONFIG.discountPrice.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>
              <button className="payment-final-btn" onClick={handleDiscountPaymentRequest}>
                보고서 확인하기
              </button>
              <div className="payment-empty" />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function CoupleResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
        </div>
      }
    >
      <CoupleResultContent />
    </Suspense>
  );
}
