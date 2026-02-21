"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
const API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;
import Footer from "@/components/layout/Footer";
import {
  trackPaymentModalOpen,
  trackPaymentModalClose,
  trackPaymentAttempt,
  trackPaymentSuccess,
  trackCouponApplied,
} from "@/lib/mixpanel";
import {
  getCoupleAnalysisRecord,
  updateCoupleAnalysisRecord,
  CoupleAnalysisRecord,
} from "@/lib/db/coupleAnalysisDB";
import { upsertFaceAnalysisSupabase } from "@/lib/db/faceSupabaseDB";
import { uploadCoupleImages } from "@/lib/storage/imageStorage";

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

  // 쿠폰 관련 상태
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    isFree: boolean;
  } | null>(null);

  // IndexedDB에서 결과 가져오기
  useEffect(() => {
    if (!resultId) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      const stored = await getCoupleAnalysisRecord(resultId);
      if (stored) {
        // CoupleAnalysisRecord를 CoupleResult로 변환
        const existingReport = stored.report as CoupleResult["reports"] | null;
        const parsed: CoupleResult = {
          id: stored.id,
          features1: stored.features1,
          features2: stored.features2,
          image1Base64: stored.image1Base64,
          image2Base64: stored.image2Base64,
          relationshipType: stored.relationshipType,
          relationshipFeeling: stored.relationshipFeeling,
          createdAt: stored.createdAt,
          reports: {
            couple: {
              paid: stored.paid || false,
              data: existingReport?.couple?.data || null,
            },
          },
        };
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
    };

    loadData();
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
      // 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
      // 궁합 리포트 생성
      const reportResponse = await fetch(`${API_URL}/analyze/couple/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features1: data.features1,
          features2: data.features2,
          relationshipType: data.relationshipType,
          relationshipFeeling: data.relationshipFeeling,
        }),
      });

      if (!reportResponse.ok) {
        const errorText = await reportResponse.text();
        throw new Error(errorText || "궁합 분석에 실패했습니다.");
      }

      const report = await reportResponse.json();

      // 궁합 점수 계산
      const scoreResponse = await fetch(`${API_URL}/analyze/couple/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detail1: report.detail1 }),
      });

      if (!scoreResponse.ok) {
        const errorText = await scoreResponse.text();
        throw new Error(errorText || "점수 계산에 실패했습니다.");
      }

      const score = await scoreResponse.json();

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

      // IndexedDB 업데이트
      await updateCoupleAnalysisRecord(data.id, {
        report: updatedResult.reports as unknown,
      });
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

  // 무료 쿠폰 결제 처리
  const handleFreeCouponPayment = useCallback(async () => {
    if (!result) return;

    try {
      // IndexedDB에 결제 완료 표시
      await updateCoupleAnalysisRecord(result.id, {
        paid: true,
        paidAt: new Date().toISOString(),
        report: {
          ...result.reports,
          couple: { ...result.reports.couple, paid: true },
        },
      });

      // Supabase 저장 (궁합 관상 - 무료 쿠폰)
      try {
        // 이미지 Storage 업로드
        const uploadedImages = await uploadCoupleImages(result.id, {
          image1: result.image1Base64,
          image2: result.image2Base64,
        });

        // Supabase에 저장/업데이트
        await upsertFaceAnalysisSupabase({
          id: result.id,
          service_type: "couple",
          features1: result.features1,
          features2: result.features2,
          image1_path: uploadedImages.image1Path,
          image2_path: uploadedImages.image2Path,
          relationship_type: result.relationshipType,
          relationship_feeling: result.relationshipFeeling,
          couple_report: result.reports.couple as unknown as Record<string, unknown>,
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_info: { method: "coupon", price: 0, couponCode: appliedCoupon?.code },
        });
        console.log("✅ Supabase에 궁합 관상 결과 저장 완료 (무료 쿠폰)");
      } catch (supabaseErr) {
        console.error("Supabase 궁합 관상 저장 실패:", supabaseErr);
      }

      // 모달 닫기
      setShowPaymentModal(false);

      // 결과 업데이트
      const updatedResult = {
        ...result,
        reports: {
          ...result.reports,
          couple: { ...result.reports.couple, paid: true },
        },
      };
      setResult(updatedResult);
    } catch (error) {
      console.error("무료 쿠폰 처리 오류:", error);
      setCouponError("쿠폰 처리 중 오류가 발생했습니다");
    }
  }, [result, appliedCoupon]);

  // 쿠폰 검증 및 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!couponCode.trim()) return;

    const code = couponCode.trim();

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, serviceType: "couple" }),
      });
      const data = await res.json();

      if (!data.valid) {
        setCouponError(data.error || "유효하지 않은 쿠폰입니다");
        return;
      }

      const isFree = data.is_free;
      const discount = isFree ? PAYMENT_CONFIG.price : data.discount_amount;

      setCouponError("");
      setAppliedCoupon({ code, discount, isFree });

      // 쿠폰 적용 이벤트 트래킹
      trackCouponApplied("couple", {
        id: result?.id,
        coupon_code: code,
        discount,
        is_free: isFree,
        original_price: PAYMENT_CONFIG.price,
        final_price: isFree ? 0 : Math.max(PAYMENT_CONFIG.price - discount, 100),
      });

      if (isFree) {
        // 무료 쿠폰: 결제 없이 바로 완료 처리
        await handleFreeCouponPayment();

        // 쿠폰 수량 차감
        await fetch("/api/coupon/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        // 무료 쿠폰 결제 성공 이벤트 트래킹
        trackPaymentSuccess("couple", {
          id: result?.id,
          order_id: `free_coupon_${Date.now()}`,
          amount: 0,
          original_price: PAYMENT_CONFIG.price,
          coupon_code: code,
          is_free_coupon: true,
          report_type: "couple",
        });
      } else {
        // 일반 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#love-method", {
            value: newPrice,
          });
        }
      }
    } catch (error) {
      console.error("쿠폰 검증 오류:", error);
      setCouponError("쿠폰 확인 중 오류가 발생했습니다");
    }
  }, [couponCode, handleFreeCouponPayment, result?.id]);

  // 결제 모달 열기
  const openPaymentModal = () => {
    if (!result) return;

    trackPaymentModalOpen("couple", {
      id: result.id,
      price: PAYMENT_CONFIG.price,
      is_discount: false,
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

    const finalPrice = appliedCoupon
      ? Math.max(PAYMENT_CONFIG.price - appliedCoupon.discount, 100)
      : PAYMENT_CONFIG.price;

    const orderSuffix = appliedCoupon ? `-${appliedCoupon.code}` : "";
    const orderNameSuffix = appliedCoupon ? ` - ${appliedCoupon.code} 할인` : "";

    try {
      trackPaymentAttempt("couple", {
        id: result.id,
        price: finalPrice,
        is_discount: !!appliedCoupon,
        coupon_code: appliedCoupon?.code,
      });

      await paymentWidgetRef.current.requestPayment({
        orderId: `order${orderSuffix}_${Date.now()}`,
        orderName: `${PAYMENT_CONFIG.orderName}${orderNameSuffix}`,
        customerName: "고객",
        successUrl: `${window.location.origin}/payment/success?id=${encodeURIComponent(result.id)}&type=couple${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
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

    trackPaymentModalClose("couple", {
      id: result?.id,
      reason: "user_close",
    });

    // 쿠폰 상태 초기화
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");

    // 1초 후 깜짝 할인 모달 열기
    setTimeout(() => {
      openDiscountModal();
    }, 1000);
  };

  // 할인 모달 열기
  const openDiscountModal = () => {
    if (!result) return;

    trackPaymentModalOpen("couple", {
      id: result.id,
      price: PAYMENT_CONFIG.discountPrice,
      is_discount: true,
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
      trackPaymentAttempt("couple", {
        id: result.id,
        price: PAYMENT_CONFIG.discountPrice,
        is_discount: true,
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

    trackPaymentModalClose("couple", {
      id: result?.id,
      reason: "user_close",
      is_discount: true,
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
      {/* 다른 사진으로 버튼 */}
      <Link href="/face?tab=match" className="back-btn-glass">
        <span className="material-icons">arrow_back</span>
        <span>다른 사진으로</span>
      </Link>

      <div className="main_content_wrap" style={{ paddingTop: "60px" }}>
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
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 2,
                      pointerEvents: 'none',
                      backdropFilter: 'blur(6px)',
                      WebkitBackdropFilter: 'blur(6px)',
                      maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 5%, rgba(0,0,0,0.6) 10%, rgba(0,0,0,0.85) 18%, black 28%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 5%, rgba(0,0,0,0.6) 10%, rgba(0,0,0,0.85) 18%, black 28%)',
                      background: 'linear-gradient(to bottom, transparent 0%, rgba(253,252,248,0.4) 8%, rgba(253,252,248,0.75) 18%, rgba(253,252,248,0.95) 35%, #fdfcf8 100%)',
                    }} />
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
                  궁합 관상 보고서 2025년 연말 특별가<br />(~12.31)
                </div>
                <div className="payment-coupon-price">-11,240원</div>
              </div>

              {/* 쿠폰 입력 섹션 */}
              <div className="coupon-section">
                <div className="coupon-input-row">
                  <input
                    type="text"
                    className="coupon-input"
                    placeholder="쿠폰 코드 입력"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError("");
                    }}
                    disabled={!!appliedCoupon}
                  />
                  <button
                    className="coupon-submit-btn"
                    onClick={handleCouponSubmit}
                    disabled={!!appliedCoupon}
                  >
                    {appliedCoupon ? "적용됨" : "적용"}
                  </button>
                </div>
                {couponError && <div className="coupon-error">{couponError}</div>}
              </div>

              {/* 쿠폰 할인 적용 표시 */}
              {appliedCoupon && !appliedCoupon.isFree && (
                <div className="payment-coupon-price-wrap">
                  <div className="payment-coupon-title">
                    {appliedCoupon.code} 쿠폰 적용
                  </div>
                  <div className="payment-coupon-price">
                    -{appliedCoupon.discount.toLocaleString()}원
                  </div>
                </div>
              )}

              <div id="love-method" style={{ padding: 0, margin: 0 }} />
              <div id="love-agreement" />

              <div className="payment-final-price-wrap">
                <div className="payment-final-price-title">최종 결제 금액</div>
                <div className="payment-final-price-price-wrap">
                  <div className="payment-originam-price2">
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </div>
                  <div className="payment-final-price">
                    <div className="payment-final-price-discount">
                      {Math.floor((1 - (appliedCoupon ? PAYMENT_CONFIG.price - appliedCoupon.discount : PAYMENT_CONFIG.price) / PAYMENT_CONFIG.originalPrice) * 100)}%
                    </div>
                    <div className="payment-final-price-num">
                      {appliedCoupon
                        ? Math.max(PAYMENT_CONFIG.price - appliedCoupon.discount, 0).toLocaleString()
                        : PAYMENT_CONFIG.price.toLocaleString()}원
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
                    <div className="payment-final-price-discount">{Math.floor((1 - PAYMENT_CONFIG.discountPrice / PAYMENT_CONFIG.originalPrice) * 100)}%</div>
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
