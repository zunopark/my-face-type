"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
// 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
const API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;

// Base64를 Blob으로 변환
function base64ToBlob(base64: string, mimeType: string = "image/jpeg"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
import Footer from "@/components/layout/Footer";
import {
  trackPaymentModalOpen,
  trackPaymentModalClose,
  trackPaymentAttempt,
} from "@/lib/mixpanel";
import {
  getFaceAnalysisRecord,
  updateFaceAnalysisRecord,
  FaceAnalysisRecord,
} from "@/lib/db/faceAnalysisDB";

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
  originalPrice: 29900,
  orderName: "관상 상세 분석 서비스",
};

// 저장된 결과 타입
interface FaceResult {
  id: string;
  imageBase64: string;
  features: string;
  paid: boolean;
  timestamp: string;
  summary?: string;
  detail?: string;
  sections?: {
    face_reading?: string;
    love?: string;
    career?: string;
    wealth?: string;
    health?: string;
  };
  reports: {
    base: { paid: boolean; data: unknown };
    wealth: { paid: boolean; data: unknown };
    love: { paid: boolean; data: unknown };
    marriage: { paid: boolean; data: unknown };
    career: { paid: boolean; data: unknown };
  };
}

// 가라 분석 메시지
const FAKE_ANALYSIS_MESSAGES = [
  "관상학 분석 중",
  "오관(눈, 코, 입, 귀, 눈썹)을 분석 중입니다...",
  "삼정(이마, 코, 턱 세 구역)을 분석 중입니다...",
  "12궁을 통해 재물운을 분석 중입니다...",
  "12궁을 통해 건강운을 분석 중입니다...",
  "12궁을 통해 연애운을 분석 중입니다...",
  "12궁을 통해 직업운을 분석 중입니다...",
  "전체 관상을 종합하는 중입니다...",
  "관상학 보고서 작성 중",
  "최종 정리 중...",
];

// 섹션 설정
const SECTION_CONFIG = [
  { key: "face_reading", title: "부위별 관상 심층 풀이" },
  { key: "love", title: "연애운 심층 풀이" },
  { key: "career", title: "직업운 심층 풀이" },
  { key: "wealth", title: "재물운 심층 풀이" },
  { key: "health", title: "건강운 심층 풀이" },
];

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [result, setResult] = useState<FaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 가라 분석 상태
  const [showFakeAnalysis, setShowFakeAnalysis] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeMessage, setFakeMessage] = useState(FAKE_ANALYSIS_MESSAGES[0]);

  // 결제 유도 페이지 표시 여부
  const [showPaymentPage, setShowPaymentPage] = useState(false);

  // 결제 모달 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const paymentWidgetRef = useRef<ReturnType<
    typeof window.PaymentWidget
  > | null>(null);
  const discountWidgetRef = useRef<ReturnType<
    typeof window.PaymentWidget
  > | null>(null);

  // 실제 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // 결과 렌더링 상태
  const [showResult, setShowResult] = useState(false);

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
      const stored = await getFaceAnalysisRecord(resultId);
      if (stored) {
        // FaceAnalysisRecord를 FaceResult로 변환
        const parsed: FaceResult = {
          id: stored.id,
          imageBase64: stored.imageBase64,
          features: stored.features,
          paid: stored.paid || false,
          timestamp: stored.timestamp,
          summary: (stored.reports?.base?.data as { summary?: string })
            ?.summary,
          detail: (stored.reports?.base?.data as { detail?: string })?.detail,
          sections: (
            stored.reports?.base?.data as { sections?: FaceResult["sections"] }
          )?.sections,
          reports: stored.reports as FaceResult["reports"],
        };
        setResult(parsed);

        // 이미 분석 완료된 경우 바로 결과 표시
        if (parsed.summary && parsed.detail) {
          setShowResult(true);
          setIsLoading(false);
          return;
        }

        // 결제 완료 상태면 바로 분석 시작
        if (parsed.paid || parsed.reports?.base?.paid) {
          setIsLoading(false);
          startRealAnalysis(parsed);
          return;
        }

        // 미결제 상태: 가라 분석 시작
        const loadingDoneKey = `base_report_loading_done_${resultId}`;
        const loadingDone = sessionStorage.getItem(loadingDoneKey);

        if (loadingDone) {
          // 이미 가라 분석 완료 → 결제 유도 페이지 표시
          setShowPaymentPage(true);
          setIsLoading(false);
        } else {
          // 가라 분석 시작
          setShowFakeAnalysis(true);
          setIsLoading(false);
          startFakeAnalysis(resultId);
        }
      } else {
        router.push("/");
      }
    };

    loadData();
  }, [resultId, router]);

  // 가라 분석 (30초)
  const startFakeAnalysis = (id: string) => {
    const totalDuration = 30000;
    const progressInterval = 100;
    const msgChangeInterval = 3000;

    let progress = 0;
    let msgIdx = 0;

    const progressTimer = setInterval(() => {
      progress += (100 * progressInterval) / totalDuration;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressTimer);
      }
      setFakeProgress(Math.min(progress, 100));
    }, progressInterval);

    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % FAKE_ANALYSIS_MESSAGES.length;
      setFakeMessage(FAKE_ANALYSIS_MESSAGES[msgIdx]);
    }, msgChangeInterval);

    setTimeout(() => {
      clearInterval(progressTimer);
      clearInterval(msgTimer);
      setShowFakeAnalysis(false);
      setShowPaymentPage(true);
      sessionStorage.setItem(`base_report_loading_done_${id}`, "true");
    }, totalDuration);
  };

  // 실제 분석 시작 (결제 후)
  const startRealAnalysis = useCallback(async (data: FaceResult) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // 진행률 애니메이션
    let progress = 0;
    const progressTimer = setInterval(() => {
      progress += Math.random() * 1.5;
      if (progress > 94) progress = 94;
      setAnalysisProgress(progress);
    }, 400);

    try {
      // 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
      const imageBase64 = data.imageBase64.split(",")[1];
      const blob = base64ToBlob(imageBase64);
      const formData = new FormData();
      formData.append("file", blob, "image.jpg");

      const response = await fetch(`${API_URL}/face-teller2/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "분석에 실패했습니다.");
      }

      const apiResult = await response.json();

      clearInterval(progressTimer);
      setAnalysisProgress(100);

      const { summary, detail, sections, features } = apiResult;

      // 결과 업데이트
      const updatedResult: FaceResult = {
        ...data,
        summary,
        detail,
        sections,
        features: features || data.features,
        paid: true,
        reports: {
          ...data.reports,
          base: {
            paid: true,
            data: { summary, detail, sections },
          },
        },
      };

      // IndexedDB 업데이트
      await updateFaceAnalysisRecord(data.id, {
        features: features || data.features,
        paid: true,
        reports: updatedResult.reports as FaceAnalysisRecord["reports"],
      });
      setResult(updatedResult);
      setShowResult(true);
    } catch (error) {
      console.error("분석 오류:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      clearInterval(progressTimer);
      setIsAnalyzing(false);
    }
  }, []);

  // 무료 쿠폰 결제 처리
  const handleFreeCouponPayment = useCallback(async () => {
    if (!result) return;

    try {
      // IndexedDB에 결제 완료 표시
      await updateFaceAnalysisRecord(result.id, {
        paid: true,
        reports: {
          ...result.reports,
          base: { paid: true, data: result.reports?.base?.data || null },
        } as FaceAnalysisRecord["reports"],
      });

      // 모달 닫고 분석 시작
      setShowPaymentModal(false);
      setShowPaymentPage(false);

      // 결과 업데이트
      const updatedResult = { ...result, paid: true };
      setResult(updatedResult);

      // 실제 분석 시작
      startRealAnalysis(updatedResult);
    } catch (error) {
      console.error("무료 쿠폰 처리 오류:", error);
      setCouponError("쿠폰 처리 중 오류가 발생했습니다");
    }
  }, [result, startRealAnalysis]);

  // 쿠폰 검증 및 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!couponCode.trim()) return;

    const code = couponCode.toUpperCase();
    let discount = 0;
    let isFree = false;

    // 관상 전용 쿠폰 코드
    if (code === "freehanhun") {
      isFree = true;
      discount = PAYMENT_CONFIG.price;
    } else if (code === "FACE10000") {
      discount = 10000;
    } else if (code === "FACE5000") {
      discount = 5000;
    } else if (code === "FACE2000") {
      discount = 2000;
    }

    if (discount > 0 || isFree) {
      setCouponError("");
      setAppliedCoupon({ code, discount, isFree });

      if (isFree) {
        // 무료 쿠폰: 결제 없이 바로 완료 처리
        await handleFreeCouponPayment();
      } else {
        // 일반 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#payment-method", {
            value: newPrice,
          });
        }
      }
    } else {
      setCouponError("유효하지 않은 쿠폰입니다");
    }
  }, [couponCode, handleFreeCouponPayment]);

  // 결제 모달 열기
  const openPaymentModal = () => {
    if (!result) return;

    trackPaymentModalOpen("face", {
      id: result.id,
      price: PAYMENT_CONFIG.price,
      is_discount: false,
    });

    setShowPaymentModal(true);

    // TossPayments 위젯 초기화
    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(
          PAYMENT_CONFIG.clientKey,
          customerKey
        );
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#payment-method", {
          value: PAYMENT_CONFIG.price,
        });
        widget.renderAgreement("#agreement");
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
    const orderNameSuffix = appliedCoupon
      ? ` - ${appliedCoupon.code} 할인`
      : "";

    try {
      trackPaymentAttempt("face", {
        id: result.id,
        price: finalPrice,
        is_discount: !!appliedCoupon,
        coupon_code: appliedCoupon?.code,
      });

      await paymentWidgetRef.current.requestPayment({
        orderId: `order${orderSuffix}_${Date.now()}`,
        orderName: `${PAYMENT_CONFIG.orderName}${orderNameSuffix}`,
        customerName: "고객",
        successUrl: `${
          window.location.origin
        }/payment/success?id=${encodeURIComponent(result.id)}&type=base`,
        failUrl: `${
          window.location.origin
        }/payment/fail?id=${encodeURIComponent(result.id)}&type=base`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
      trackPaymentModalClose("face", {
        id: result.id,
        reason: "payment_error",
      });
    }
  };

  // 결제 모달 닫기 (할인 모달 열기)
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;
    trackPaymentModalClose("face", { id: result?.id, reason: "user_close" });

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

    trackPaymentModalOpen("face", {
      id: result.id,
      price: PAYMENT_CONFIG.discountPrice,
      is_discount: true,
    });

    setShowDiscountModal(true);

    // TossPayments 위젯 초기화
    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(
          PAYMENT_CONFIG.clientKey,
          customerKey
        );
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
      trackPaymentAttempt("face", {
        id: result.id,
        price: PAYMENT_CONFIG.discountPrice,
        is_discount: true,
      });

      await discountWidgetRef.current.requestPayment({
        orderId: `discount_${Date.now()}`,
        orderName: "AI 관상 프리미엄 보고서 - 할인 특가",
        customerName: "고객",
        successUrl: `${
          window.location.origin
        }/payment/success?id=${encodeURIComponent(result.id)}&type=base`,
        failUrl: `${
          window.location.origin
        }/payment/fail?id=${encodeURIComponent(result.id)}&type=base`,
      });
    } catch (err) {
      console.error("할인 결제 오류:", err);
    }
  };

  // 할인 모달 닫기
  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    discountWidgetRef.current = null;
    trackPaymentModalClose("face", {
      id: result?.id,
      reason: "user_close",
      is_discount: true,
    });
  };

  // 간단한 마크다운 파서
  const simpleMD = (src: string = ""): string => {
    // 코드 블록 제거
    src = src.replace(/```[\s\S]*?```/g, "");
    // 헤딩
    src = src
      .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
      .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
      .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>");
    // 굵게/기울임 (복합)
    src = src
      .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>");
    // 이미지, 링크
    src = src
      .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
      .replace(
        /\[([^\]]+?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );
    // 테이블
    src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return match;
      let html = '<table class="md-table">';
      rows.forEach((row: string, idx: number) => {
        if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;
        const cells = row
          .split("|")
          .filter(
            (_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1
          );
        const tag = idx === 0 ? "th" : "td";
        html += "<tr>";
        cells.forEach((cell: string) => {
          html += `<${tag}>${cell.trim()}</${tag}>`;
        });
        html += "</tr>";
      });
      html += "</table>";
      return html;
    });
    // 수평선
    src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");
    // 인용문
    src = src.replace(/(^>\s?.*$\n?)+/gm, (match) => {
      const content = match
        .split("\n")
        .map((line) => line.replace(/^>\s?/, "").trim())
        .filter((line) => line)
        .join("<br>");
      return `<blockquote>${content}</blockquote>`;
    });
    // 리스트
    src = src
      .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
      .replace(/(<\/ul>\s*)<ul>/g, "")
      .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
      .replace(/(<\/ol>\s*)<ol>/g, "");
    // 기울임
    src = src
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
      .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
    // 취소선
    src = src.replace(/~~(.+?)~~/g, "<del>$1</del>");
    // 줄바꿈
    src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
    return `<p>${src}</p>`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
      </div>
    );
  }

  if (!result) return null;

  // 가라 분석 오버레이
  if (showFakeAnalysis) {
    return (
      <div className="fake_analysis_overlay active">
        <div className="fake_analysis_content">
          <div className="main_content_wrap">
            <div className="border">
              <div className="frame">
                <div className="image">
                  <div className="file-upload">
                    <div
                      className="file-upload-content"
                      style={{ display: "block" }}
                    >
                      <div className="image-square-frame">
                        <Image
                          src={result.imageBase64}
                          alt="분석 중인 사진"
                          fill
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="fake_analysis_spinner" />
          <div className="fake_analysis_text">{fakeMessage}</div>
          <div className="fake_analysis_progress_wrap">
            <div
              className="fake_analysis_progress_bar"
              style={{ width: `${fakeProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 결제 유도 페이지
  if (showPaymentPage) {
    return (
      <div className="main_body_wrap">
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className="back-btn-glass">
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className="main_content_wrap">
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          {/* 업로드된 이미지 */}
          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div
                    className="file-upload-content"
                    style={{ display: "block" }}
                  >
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석된 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* faceteller 이미지 */}
          <div className="face_teller_wrap">
            <Image
              src="/img/faceteller.jpg"
              alt="관상 분석 완료"
              width={350}
              height={500}
              className="face_teller_img"
              unoptimized
            />
          </div>
        </div>

        {/* 결제 버튼 영역 */}
        <div
          className="result_btn_wrap"
          data-state="ready"
          style={{ display: "flex" }}
        >
          <div className="result_btn_status">관상 분석을 완료했습니다.</div>
          <button className="result_btn" onClick={openPaymentModal}>
            관상 풀이 지금 확인하기
          </button>
        </div>

        {/* 결제 모달 */}
        {showPaymentModal && (
          <div className="payment-overlay" style={{ display: "block" }}>
            <div className="payment-fullscreen">
              <div className="modal-content">
                <div className="payment-header">
                  <div className="payment-title">
                    프리미엄 관상 심층 분석 보고서
                  </div>
                  <div className="payment-close" onClick={closePaymentModal}>
                    ✕
                  </div>
                </div>
                <div className="payment-header">
                  <div className="payment-subtitle">
                    1,500만명이 감탄한 20년 경력 관상가 보고서
                  </div>
                </div>

                <div className="report-wrap">
                  <div className="report-title-wrap">
                    <div className="report-title">보고서 내용</div>
                    <div className="report-num">총 20,000자 심층 분석</div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      1. 부위별 관상 심층 풀이 - 오관 분석 / 삼정 분석 / 12궁
                      분석 / 천기누설
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      2. 연애운 심층 풀이 - 타고난 인연 / 만남 오픈 타이밍 /
                      매력 풀이 / 이상적 상대 / 천기누설
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      3. 직업운 심층 풀이 - 적성과 장단점 / 직업 운 곡선 / 직장
                      vs 창업 / 천기누설
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      4. 재물운 심층 풀이 - 평생 모을 재산 / 재물운 강약점 /
                      돈이 붙는 환경 / 천기누설
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      5. 건강운 심층 풀이 - 타고난 체질,약점 / 건강 곡선 & 위기
                      / 천기누설
                    </div>
                  </div>
                </div>

                <div className="payment-price-wrap">
                  <div className="payment-original-price-title">
                    보고서 금액
                  </div>
                  <div className="payment-original-price">
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </div>
                </div>

                <div className="payment-coupon-wrap">
                  <div className="payment-coupon">쿠폰 할인 💸</div>
                </div>
                <div className="payment-coupon-price-wrap">
                  <div className="payment-coupon-title">
                    판매 10,000건 돌파 기념 2만원 할인
                  </div>
                  <div className="payment-coupon-price">-20,000원</div>
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
                  {couponError && (
                    <div className="coupon-error">{couponError}</div>
                  )}
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

                <div id="payment-method" />
                <div id="agreement" />

                <div className="payment-final-price-wrap">
                  <div className="payment-final-price-title">
                    최종 결제 금액
                  </div>
                  <div className="payment-final-price-price-wrap">
                    <div className="payment-originam-price2">
                      {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                    </div>
                    <div className="payment-final-price">
                      <div className="payment-final-price-discount">
                        {Math.floor(
                          (1 -
                            (appliedCoupon
                              ? PAYMENT_CONFIG.price - appliedCoupon.discount
                              : PAYMENT_CONFIG.price) /
                              PAYMENT_CONFIG.originalPrice) *
                            100
                        )}
                        %
                      </div>
                      <div className="payment-final-price-num">
                        {appliedCoupon
                          ? Math.max(
                              PAYMENT_CONFIG.price - appliedCoupon.discount,
                              0
                            ).toLocaleString()
                          : PAYMENT_CONFIG.price.toLocaleString()}
                        원
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  id="payment-button"
                  className="payment-final-btn"
                  onClick={handlePaymentRequest}
                >
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
                  <div className="payment-title">
                    🎁 깜짝 선물! 2,000원 추가 할인
                  </div>
                  <div className="payment-close" onClick={closeDiscountModal}>
                    ✕
                  </div>
                </div>
                <div className="payment-header">
                  <div className="payment-subtitle">
                    AI가 분석한 당신만의 심층 관상 보고서
                  </div>
                </div>

                <div className="report-wrap">
                  <div className="report-title-wrap">
                    <div className="report-title">보고서 내용</div>
                    <div className="report-num">총 10,000자+ 심층 분석</div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      1. 총운 분석 - 성격 & 인상 / 평생 운세 흐름
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      2. 연애운 심층 풀이 - 연애 스타일 & 이상형
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      3. 직업운 심층 풀이 - 적성과 장단점
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      4. 재물운 심층 풀이 - 평생 모을 재산
                    </div>
                  </div>
                  <div className="report-contents-wrap">
                    <div className="report-contents">
                      5. 건강운 심층 풀이 - 타고난 체질 & 위기 시점
                    </div>
                  </div>
                </div>

                <div className="payment-price-wrap">
                  <div className="payment-original-price-title">
                    보고서 금액
                  </div>
                  <div className="payment-original-price">
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </div>
                </div>

                <div className="payment-coupon-wrap">
                  <div className="payment-coupon">쿠폰 할인 적용 💸</div>
                </div>
                <div className="payment-coupon-price-wrap">
                  <div className="payment-coupon-title">
                    프리미엄 보고서 특별가 + 추가 2천원 할인
                  </div>
                  <div className="payment-coupon-price">-22,000원</div>
                </div>

                <div id="discount-method" />
                <div id="discount-agreement" />

                <div className="payment-final-price-wrap">
                  <div className="payment-final-price-title">
                    최종 결제 금액
                  </div>
                  <div className="payment-final-price-price-wrap">
                    <div className="payment-originam-price2">
                      {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                    </div>
                    <div className="payment-final-price">
                      <div className="payment-final-price-discount">
                        {Math.floor(
                          (1 -
                            PAYMENT_CONFIG.discountPrice /
                              PAYMENT_CONFIG.originalPrice) *
                            100
                        )}
                        %
                      </div>
                      <div className="payment-final-price-num">
                        {PAYMENT_CONFIG.discountPrice.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  className="payment-final-btn"
                  onClick={handleDiscountPaymentRequest}
                >
                  할인가로 보고서 확인하기
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

  // 분석 중
  if (isAnalyzing) {
    return (
      <div className="main_body_wrap">
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className="back-btn-glass">
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className="main_content_wrap" style={{ paddingTop: "60px" }}>
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div
                    className="file-upload-content"
                    style={{ display: "block" }}
                  >
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석 중인 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="label-container" className="result">
            <div className="loading-box dark-mode">
              <div className="loading-text">보고서를 생성 중입니다...</div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // 결과 표시
  if (showResult && result.summary) {
    return (
      <div className="main_body_wrap">
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className="back-btn-glass">
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className="main_content_wrap" style={{ paddingTop: "60px" }}>
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div
                    className="file-upload-content"
                    style={{ display: "block" }}
                  >
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석된 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="label-container" className="result">
            {/* Summary */}
            <div className="face-summary-section">
              <div
                className="face-summary"
                dangerouslySetInnerHTML={{ __html: simpleMD(result.summary) }}
              />
            </div>

            {/* Sections */}
            {result.sections && (
              <div className="report-cards-container">
                {SECTION_CONFIG.filter(
                  (sec) =>
                    result.sections?.[sec.key as keyof typeof result.sections]
                ).map((sec) => (
                  <div key={sec.key} className="report-card">
                    <div className="report-card-header">
                      <h3 className="report-card-title">{sec.title}</h3>
                    </div>
                    <div
                      className="report-card-content"
                      dangerouslySetInnerHTML={{
                        __html: simpleMD(
                          result.sections?.[
                            sec.key as keyof typeof result.sections
                          ] || ""
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Detail fallback */}
            {!result.sections && result.detail && (
              <div className="face-detail-section">
                <div
                  className="face-detail"
                  dangerouslySetInnerHTML={{ __html: simpleMD(result.detail) }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  return null;
}

export default function FaceResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
