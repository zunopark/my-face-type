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
import styles from "./result.module.css";
import {
  trackPaymentModalOpen,
  trackPaymentModalClose,
  trackPaymentAttempt,
  trackPaymentSuccess,
  trackCouponApplied,
} from "@/lib/mixpanel";
import {
  getFaceAnalysisRecord,
  updateFaceAnalysisRecord,
  FaceAnalysisRecord,
} from "@/lib/db/faceAnalysisDB";
import { upsertFaceAnalysisSupabase, updateFaceAnalysisSupabase, getFaceAnalysisSupabase } from "@/lib/db/faceSupabaseDB";
import { createReview, getReviewByRecordId, Review } from "@/lib/db/reviewDB";
import { uploadFaceImage, getImageUrl } from "@/lib/storage/imageStorage";

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
  portraitBase64?: string;
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

  // 리뷰 관련 상태
  const [reviewRating, setReviewRating] = useState(3);
  const [reviewContent, setReviewContent] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalDismissed, setReviewModalDismissed] = useState(false);
  const reviewModalTriggered = useRef(false);

  // IndexedDB 또는 Supabase에서 결과 가져오기
  useEffect(() => {
    if (!resultId) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      // 1. 먼저 IndexedDB에서 확인
      const stored = await getFaceAnalysisRecord(resultId);
      if (stored) {
        // FaceAnalysisRecord를 FaceResult로 변환
        const parsed: FaceResult = {
          id: stored.id,
          imageBase64: stored.imageBase64,
          portraitBase64: (stored as unknown as Record<string, unknown>).portraitBase64 as string | undefined,
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
        return;
      }

      // 2. IndexedDB에 없으면 Supabase에서 확인
      console.log("IndexedDB에 없음, Supabase에서 확인:", resultId);
      const supabaseRecord = await getFaceAnalysisSupabase(resultId);

      if (supabaseRecord && supabaseRecord.is_paid) {
        console.log("Supabase에서 결제 완료된 기록 발견:", supabaseRecord);

        // 이미지 URL 가져오기
        let imageUrl = "";
        if (supabaseRecord.image_path) {
          imageUrl = getImageUrl(supabaseRecord.image_path);
        }

        // analysis_result에서 데이터 파싱
        const analysisResult = supabaseRecord.analysis_result as {
          base?: { data?: { summary?: string; detail?: string; sections?: FaceResult["sections"] } };
        } | null;

        const parsed: FaceResult = {
          id: supabaseRecord.id,
          imageBase64: imageUrl, // Storage URL 사용
          features: supabaseRecord.features || "",
          paid: true,
          timestamp: supabaseRecord.created_at || new Date().toISOString(),
          summary: analysisResult?.base?.data?.summary,
          detail: analysisResult?.base?.data?.detail,
          sections: analysisResult?.base?.data?.sections,
          reports: supabaseRecord.analysis_result as FaceResult["reports"],
        };

        setResult(parsed);

        // 분석 결과가 있으면 바로 표시
        if (parsed.summary || parsed.sections) {
          setShowResult(true);
          setIsLoading(false);
          return;
        }

        // 결제는 됐지만 분석 결과가 없으면 다시 분석
        if (!imageUrl) {
          console.error("이미지 URL을 가져올 수 없음");
          alert("이미지를 불러올 수 없습니다. 다시 시도해주세요.");
          router.push("/face");
          return;
        }

        // 이미지 URL → base64 변환 후 재분석
        try {
          const imgResponse = await fetch(imageUrl);
          const imgBlob = await imgResponse.blob();
          const reader = new FileReader();
          const imageBase64: string = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(imgBlob);
          });

          const retryParsed: FaceResult = { ...parsed, imageBase64 };
          setResult(retryParsed);
          setIsLoading(false);
          startRealAnalysis(retryParsed);
        } catch (imgErr) {
          console.error("이미지 로드 실패:", imgErr);
          alert("이미지를 불러올 수 없습니다. 다시 시도해주세요.");
          router.push("/face");
        }
        return;
      }

      // 3. Supabase에도 없거나 미결제 상태면 홈으로
      console.log("데이터를 찾을 수 없음, 홈으로 이동");
      router.push("/");
    };

    loadData();
  }, [resultId, router]);

  // 리뷰 존재 여부 확인
  useEffect(() => {
    if (!resultId || !showResult) return;
    const checkReview = async () => {
      const review = await getReviewByRecordId("face", resultId);
      if (review) {
        setExistingReview(review);
        setReviewSubmitted(true);
      }
    };
    checkReview();
  }, [resultId, showResult]);

  // 스크롤 감지 → 리뷰 모달 띄우기
  useEffect(() => {
    if (!showResult || !resultId) return;
    const dismissed = sessionStorage.getItem(`review_dismissed_${resultId}`);
    if (dismissed) {
      setReviewModalDismissed(true);
      return;
    }

    const handleScroll = () => {
      if (reviewModalTriggered.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0 && scrollTop / docHeight > 0.75) {
        reviewModalTriggered.current = true;
        setShowReviewModal(true);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [showResult, resultId]);

  const dismissReviewModal = () => {
    setShowReviewModal(false);
    setReviewModalDismissed(true);
    if (resultId) sessionStorage.setItem(`review_dismissed_${resultId}`, "true");
  };

  // 리뷰 제출
  const handleReviewSubmit = async () => {
    if (!reviewContent.trim() || !resultId) return;
    setIsReviewSubmitting(true);
    const review = await createReview({
      service_type: "face",
      record_id: resultId,
      user_name: "익명",
      rating: reviewRating,
      content: reviewContent.trim(),
      is_public: true,
    });
    if (review) {
      setExistingReview(review);
      setReviewSubmitted(true);
    }
    setIsReviewSubmitting(false);
  };

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
      console.log("🔍 API 전체 응답:", JSON.stringify(apiResult, null, 2).substring(0, 1000));

      // 에러 체크 (error 키가 존재하면 에러)
      if ("error" in apiResult) {
        throw new Error(apiResult.error || "서버에서 알 수 없는 오류가 발생했습니다.");
      }

      clearInterval(progressTimer);
      setAnalysisProgress(100);

      const { summary, detail, sections, features } = apiResult;
      console.log("🔍 summary 존재:", !!summary, "길이:", summary?.length);
      console.log("🔍 detail 존재:", !!detail, "길이:", detail?.length);
      console.log("🔍 sections 존재:", !!sections);
      console.log("🔍 sections 내용:", sections);
      console.log("🔍 features 존재:", !!features);

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

      // Supabase에도 분석 결과 저장
      try {
        await updateFaceAnalysisSupabase(data.id, {
          features: features || data.features,
          analysis_result: updatedResult.reports as Record<string, unknown>,
        });
        console.log("✅ Supabase에 관상 분석 결과 저장 완료");
      } catch (supabaseErr) {
        console.error("Supabase 분석 결과 저장 실패:", supabaseErr);
      }

      console.log("🔍 updatedResult:", {
        summary: updatedResult.summary?.substring(0, 50),
        detail: updatedResult.detail?.substring(0, 50),
        sections: updatedResult.sections,
        hasSections: !!updatedResult.sections && Object.values(updatedResult.sections).some(v => v)
      });

      setResult(updatedResult);
      setShowResult(true);
      console.log("✅ setResult, setShowResult 완료");
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

      // Supabase 저장 (정통 관상 - 무료 쿠폰)
      try {
        // 이미지 Storage 업로드
        const uploadedImage = await uploadFaceImage(result.id, result.imageBase64);

        // Supabase에 저장/업데이트
        await upsertFaceAnalysisSupabase({
          id: result.id,
          service_type: "face",
          features: result.features,
          image_path: uploadedImage?.path,
          analysis_result: result.reports as Record<string, unknown>,
          is_paid: true,
          paid_at: new Date().toISOString(),
          payment_info: { method: "coupon", price: 0, couponCode: appliedCoupon?.code },
        });
        console.log("✅ Supabase에 정통 관상 결과 저장 완료 (무료 쿠폰)");
      } catch (supabaseErr) {
        console.error("Supabase 정통 관상 저장 실패:", supabaseErr);
      }

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
  }, [result, startRealAnalysis, appliedCoupon]);

  // 쿠폰 검증 및 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!couponCode.trim()) return;

    const code = couponCode.trim();

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, serviceType: "face" }),
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
      trackCouponApplied("face", {
        id: result?.id,
        coupon_code: code,
        discount,
        is_free: isFree,
        original_price: PAYMENT_CONFIG.price,
        final_price: isFree
          ? 0
          : Math.max(PAYMENT_CONFIG.price - discount, 100),
      });

      if (isFree) {
        // 무료 쿠폰: 결제 없이 바로 완료 처리
        await handleFreeCouponPayment();

        // 쿠폰 수량 차감
        await fetch("/api/coupon/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, serviceType: "face" }),
        });

        // 무료 쿠폰 결제 성공 이벤트 트래킹
        trackPaymentSuccess("face", {
          id: result?.id,
          order_id: `free_coupon_${Date.now()}`,
          amount: 0,
          original_price: PAYMENT_CONFIG.price,
          coupon_code: code,
          is_free_coupon: true,
          report_type: "base",
        });
      } else {
        // 일반 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#payment-method", {
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
        successUrl: `${window.location.origin
          }/payment/success?id=${encodeURIComponent(result.id)}&type=base${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
        failUrl: `${window.location.origin
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
        successUrl: `${window.location.origin
          }/payment/success?id=${encodeURIComponent(result.id)}&type=base`,
        failUrl: `${window.location.origin
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

  // 마크다운 파서 (심플 버전)
  const simpleMD = (src: string = ""): string => {
    if (!src) return "";

    // 1. 불필요한 제목/헤더 제거 (sections로 이미 분리됨)
    src = src.replace(/^#{1,4}\s*\d*\.?\s*.+$/gm, "");
    src = src.replace(/^#*\s*정통\s*심층\s*관상\s*보고서\s*$/gim, "");

    // 2. 수평선 제거
    src = src.replace(/^\s*[-_*]{3,}\s*$/gm, "");

    // 3. 표(table) 파싱
    src = src.replace(
      /(?:^|\n)((?:\|.+\|\n?)+)/g,
      (match, tableBlock) => {
        const rows = tableBlock.trim().split('\n').filter((r: string) => r.trim());
        if (rows.length < 2) return match;

        // 구분선 행 제거 (|---|---|, |:---|:---|, | --- | --- | 등)
        const dataRows = rows.filter((r: string) => {
          const cleaned = r.replace(/\s/g, '');
          return !/^\|[-:]+(\|[-:]+)+\|?$/.test(cleaned);
        });
        if (dataRows.length === 0) return match;

        let html = '<table class="md-table">';
        dataRows.forEach((row: string, idx: number) => {
          const cells = row.split('|').filter((c: string) => c.trim() !== '');
          const tag = idx === 0 ? 'th' : 'td';
          html += '<tr>';
          cells.forEach((cell: string) => {
            html += `<${tag}>${cell.trim()}</${tag}>`;
          });
          html += '</tr>';
        });
        html += '</table>';
        return '\n' + html + '\n';
      }
    );

    // 4. 소제목: **1-1. 제목** ― 설명
    src = src.replace(
      /^\*\*(\d+-\d+)\.\s*([^*]+)\*\*\s*[―\-–]\s*(.+)$/gm,
      '\n<div class="sub-title"><strong>$1. $2</strong> — $3</div>\n'
    );
    src = src.replace(
      /^\*\*(\d+-\d+)\.\s*([^*]+)\*\*\s*$/gm,
      '\n<div class="sub-title"><strong>$1. $2</strong></div>\n'
    );

    // 5. 천기누설: ++ **제목** ― 설명 (그냥 소제목처럼)
    src = src.replace(
      /^\+\+\s*\*\*([^*]+)\*\*\s*[―\-–]\s*(.+)$/gm,
      '\n<div class="sub-title"><strong>$1</strong> — $2</div>\n'
    );

    // 6. 인용문 > 텍스트
    src = src.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');
    src = src.replace(/<\/blockquote>\n<blockquote>/g, '<br>');

    // 7. 굵게 **텍스트** → 형광펜 밑줄
    src = src.replace(/\*\*([^*]+)\*\*/g, '<strong class="hl">$1</strong>');

    // 8. 기울임 *텍스트*
    src = src.replace(/(?<![*])\*([^*\n]+)\*(?![*])/g, "<em>$1</em>");

    // 9. 빈 줄 정리 및 문단 처리
    src = src.replace(/\n{3,}/g, "\n\n");
    src = src.replace(/\n\n/g, "</p><p>");
    src = src.replace(/\n/g, "<br>");

    // 10. 빈 태그 정리
    src = src.replace(/<p>\s*<\/p>/g, "");
    src = src.replace(/<p><br>/g, "<p>");
    src = src.replace(/<br><\/p>/g, "</p>");
    src = src.replace(/<p>\s*(<div|<table|<blockquote)/g, "$1");
    src = src.replace(/(<\/div>|<\/table>|<\/blockquote>)\s*<\/p>/g, "$1");
    src = src.replace(/<br>\s*(<div|<table|<blockquote)/g, "$1");
    src = src.replace(/(<\/div>|<\/table>|<\/blockquote>)\s*<br>/g, "$1");

    return `<p>${src}</p>`.replace(/<p>\s*<\/p>/g, "").replace(/^<p>\s*/, "").replace(/\s*<\/p>$/, "");
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
      <div className={`${styles.fake_analysis_overlay} ${styles.active}`}>
        <div className={styles.fake_analysis_content}>
          <div className={styles.main_content_wrap}>
            <div className={styles.border}>
              <div className={styles.frame}>
                <div className={styles.image}>
                  <div className={styles.file_upload}>
                    <div
                      className={styles.file_upload_content}
                      style={{ display: "block" }}
                    >
                      <div className={styles.image_square_frame}>
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
          {/* 붓그림 초상화 (숨김 처리) */}
          {/* {result.portraitBase64 && (
            <div className={styles.portrait_section}>
              <div className={styles.portrait_label}>AI 수묵화 초상</div>
              <div className={styles.portrait_frame}>
                <Image
                  src={result.portraitBase64}
                  alt="붓그림 초상화"
                  width={280}
                  height={280}
                  style={{ objectFit: "contain", borderRadius: "12px" }}
                  unoptimized
                />
              </div>
            </div>
          )} */}
          <div className={styles.fake_analysis_spinner} />
          <div className={styles.fake_analysis_text}>{fakeMessage}</div>
          <div className={styles.fake_analysis_progress_wrap}>
            <div
              className={styles.fake_analysis_progress_bar}
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
      <div className={styles.main_body_wrap}>
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className={styles.back_btn_glass}>
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className={styles.main_content_wrap}>
          <div className={styles.main_title_wrap}>
            <div className={styles.main_title}>인공지능이 알려주는 관상 테스트</div>
            <div className={styles.main_subtitle}>AI 관상 | 관상가 양반</div>
          </div>

          {/* 업로드된 이미지 */}
          <div className={styles.border}>
            <div className={styles.frame}>
              <div className={styles.image}>
                <div className={styles.file_upload}>
                  <div
                    className={styles.file_upload_content}
                    style={{ display: "block" }}
                  >
                    <div className={styles.image_square_frame}>
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

          {/* 붓그림 초상화 (숨김 처리) */}
          {/* {result.portraitBase64 && (
            <div className={styles.portrait_section}>
              <div className={styles.portrait_label}>AI 수묵화 초상</div>
              <div className={styles.portrait_frame}>
                <Image
                  src={result.portraitBase64}
                  alt="붓그림 초상화"
                  width={300}
                  height={300}
                  style={{ objectFit: "contain", borderRadius: "12px" }}
                  unoptimized
                />
              </div>
            </div>
          )} */}

          {/* faceteller 이미지 */}
          <div className={styles.face_teller_wrap}>
            <Image
              src="/img/faceteller.jpg"
              alt="관상 분석 완료"
              width={350}
              height={500}
              className={styles.face_teller_img}
              unoptimized
            />
          </div>
        </div>

        {/* 결제 버튼 영역 */}
        <div
          className={styles.result_btn_wrap}
          data-state="ready"
          style={{ display: "flex" }}
        >
          <div className={styles.result_btn_status}>관상 분석을 완료했습니다.</div>
          <button className={styles.result_btn} onClick={openPaymentModal}>
            관상 풀이 지금 확인하기
          </button>
        </div>

        {/* 결제 모달 */}
        {showPaymentModal && (
          <div className={styles.payment_overlay}>
            <div className={styles.payment_fullscreen}>
              <div className={styles.modal_content}>
                {/* 헤더 */}
                <div className={styles.payment_header}>
                  <div className={styles.payment_title}>
                    관상가 양반 복채
                  </div>
                  <div className={styles.payment_close} onClick={closePaymentModal}>
                    ✕
                  </div>
                </div>

                {/* 금액 섹션 */}
                <div className={styles.payment_amount_section}>
                  <h3 className={styles.payment_amount_title}>복채</h3>

                  {/* 정가 */}
                  <div className={styles.payment_row}>
                    <span className={styles.payment_row_label}>
                      관상 심층 분석 20,000자 보고서
                    </span>
                    <span className={styles.payment_row_value}>
                      {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                    </span>
                  </div>

                  {/* 할인 */}
                  <div className={`${styles.payment_row} ${styles.discount}`}>
                    <span className={styles.payment_row_label}>
                      병오년 구정 특별 할인
                    </span>
                    <div className={styles.payment_row_discount_value}>
                      <span className={styles.discount_badge}>
                        {Math.floor(
                          (1 - PAYMENT_CONFIG.price / PAYMENT_CONFIG.originalPrice) * 100
                        )}%
                      </span>
                      <span className={styles.discount_amount}>
                        -{(PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.price).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 쿠폰 할인 적용 표시 */}
                  {appliedCoupon && !appliedCoupon.isFree && (
                    <div className={`${styles.payment_row} ${styles.discount}`}>
                      <span className={styles.payment_row_label}>
                        {appliedCoupon.code} 쿠폰
                      </span>
                      <span className={styles.discount_amount}>
                        -{appliedCoupon.discount.toLocaleString()}원
                      </span>
                    </div>
                  )}

                  {/* 구분선 */}
                  <div className={styles.payment_divider} />

                  {/* 최종 금액 */}
                  <div className={`${styles.payment_row} ${styles.final}`}>
                    <span className={styles.payment_row_label}>최종 결제금액</span>
                    <span className={styles.payment_row_final_value}>
                      {appliedCoupon
                        ? Math.max(PAYMENT_CONFIG.price - appliedCoupon.discount, 0).toLocaleString()
                        : PAYMENT_CONFIG.price.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* 쿠폰 입력 섹션 */}
                <div className={styles.coupon_section}>
                  <div className={styles.coupon_input_row}>
                    <input
                      type="text"
                      className={styles.coupon_input}
                      placeholder="쿠폰 코드 입력"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        setCouponError("");
                      }}
                      disabled={!!appliedCoupon}
                    />
                    <button
                      className={styles.coupon_submit_btn}
                      onClick={handleCouponSubmit}
                      disabled={!!appliedCoupon}
                    >
                      {appliedCoupon ? "적용됨" : "적용"}
                    </button>
                  </div>
                  {couponError && (
                    <div className={styles.coupon_error}>{couponError}</div>
                  )}
                </div>

                <div id="payment-method" />
                <div id="agreement" />

                <button
                  className={styles.payment_final_btn}
                  onClick={handlePaymentRequest}
                >
                  복채 결제하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 할인 모달 */}
        {showDiscountModal && (
          <div className={styles.payment_overlay}>
            <div className={styles.payment_fullscreen}>
              <div className={styles.modal_content}>
                {/* 헤더 */}
                <div className={styles.payment_header}>
                  <div className={styles.payment_title}>
                    🎁 깜짝 선물! 추가 2,000원 할인
                  </div>
                  <div className={styles.payment_close} onClick={closeDiscountModal}>
                    ✕
                  </div>
                </div>

                {/* 금액 섹션 */}
                <div className={styles.payment_amount_section}>
                  <h3 className={styles.payment_amount_title}>특별 할인가</h3>

                  {/* 정가 */}
                  <div className={styles.payment_row}>
                    <span className={styles.payment_row_label}>
                      관상 심층 분석 보고서
                    </span>
                    <span className={styles.payment_row_value}>
                      {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                    </span>
                  </div>

                  {/* 할인 */}
                  <div className={`${styles.payment_row} ${styles.discount}`}>
                    <span className={styles.payment_row_label}>
                      특별가 + 추가 2천원 할인
                    </span>
                    <div className={styles.payment_row_discount_value}>
                      <span className={styles.discount_badge}>
                        {Math.floor(
                          (1 - PAYMENT_CONFIG.discountPrice / PAYMENT_CONFIG.originalPrice) * 100
                        )}%
                      </span>
                      <span className={styles.discount_amount}>
                        -{(PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.discountPrice).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className={styles.payment_divider} />

                  {/* 최종 금액 */}
                  <div className={`${styles.payment_row} ${styles.final}`}>
                    <span className={styles.payment_row_label}>최종 결제금액</span>
                    <span className={styles.payment_row_final_value}>
                      {PAYMENT_CONFIG.discountPrice.toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div id="discount-method" />
                <div id="discount-agreement" />

                <button
                  className={styles.payment_final_btn}
                  onClick={handleDiscountPaymentRequest}
                >
                  할인가로 복채 결제하기
                </button>
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
      <div className={styles.main_body_wrap}>
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className={styles.back_btn_glass}>
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className={styles.main_content_wrap} style={{ paddingTop: "60px" }}>
          <div className={styles.main_title_wrap}>
            <div className={styles.main_title}>인공지능이 알려주는 관상 테스트</div>
            <div className={styles.main_subtitle}>AI 관상 | 관상가 양반</div>
          </div>

          <div className={styles.border}>
            <div className={styles.frame}>
              <div className={styles.image}>
                <div className={styles.file_upload}>
                  <div
                    className={styles.file_upload_content}
                    style={{ display: "block" }}
                  >
                    <div className={styles.image_square_frame}>
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

          <div className={styles.result}>
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
  if (showResult && (result.summary || result.sections || result.detail)) {
    return (
      <div className={styles.main_body_wrap}>
        {/* 다른 사진으로 버튼 */}
        <Link href="/face" className={styles.back_btn_glass}>
          <span className="material-icons">arrow_back</span>
          <span>다른 사진으로</span>
        </Link>

        <div className={styles.main_content_wrap} style={{ paddingTop: "60px" }}>
          <div className={styles.main_title_wrap}>
            <div className={styles.main_title}>인공지능이 알려주는 관상 테스트</div>
            <div className={styles.main_subtitle}>AI 관상 | 관상가 양반</div>
          </div>

          <div className={styles.border}>
            <div className={styles.frame}>
              <div className={styles.image}>
                <div className={styles.file_upload}>
                  <div
                    className={styles.file_upload_content}
                    style={{ display: "block" }}
                  >
                    <div className={styles.image_square_frame}>
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

          {/* 붓그림 초상화 (숨김 처리) */}
          {/* {result.portraitBase64 && (
            <div className={styles.portrait_section}>
              <div className={styles.portrait_label}>AI 수묵화 초상</div>
              <div className={styles.portrait_frame}>
                <Image
                  src={result.portraitBase64}
                  alt="붓그림 초상화"
                  width={300}
                  height={300}
                  style={{ objectFit: "contain", borderRadius: "12px" }}
                  unoptimized
                />
              </div>
            </div>
          )} */}

          <div className={styles.result}>
            {/* Summary */}
            {result.summary && (
              <div className={styles.face_summary_section}>
                <div
                  className={styles.face_summary}
                  dangerouslySetInnerHTML={{ __html: simpleMD(result.summary) }}
                />
              </div>
            )}

            {/* Sections */}
            {result.sections && Object.values(result.sections).some(v => v) && (
              <div className={styles.report_cards_container}>
                {SECTION_CONFIG.filter(
                  (sec) =>
                    result.sections?.[sec.key as keyof typeof result.sections]
                ).map((sec) => (
                  <div key={sec.key} className={styles.report_card}>
                    <div className={styles.report_card_header}>
                      <h3 className={styles.report_card_title}>{sec.title}</h3>
                    </div>
                    <div
                      className={styles.report_card_content}
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

            {/* Detail fallback - sections가 없거나 비어있으면 detail 표시 */}
            {result.detail && (!result.sections || !Object.values(result.sections).some(v => v)) && (
              <div className={styles.face_detail_section}>
                <div
                  className={styles.face_detail}
                  dangerouslySetInnerHTML={{ __html: simpleMD(result.detail) }}
                />
              </div>
            )}

            {/* 인라인 리뷰 폼 (모달 닫은 후 표시) */}
            {reviewModalDismissed && !reviewSubmitted && !existingReview && (
              <div className={styles.review_section}>
                <div className={styles.review_header}>
                  <h4 className={styles.review_title}>관상가 양반에게 후기를 남겨주세요</h4>
                  <p className={styles.review_subtitle}>소중한 의견이 더 나은 서비스를 만듭니다</p>
                </div>

                <div className={styles.review_rating_options}>
                  {[
                    { value: 1, label: "아쉬워요" },
                    { value: 2, label: "보통" },
                    { value: 3, label: "좋았어요" },
                    { value: 4, label: "고마워요" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`${styles.review_rating_btn} ${reviewRating === option.value ? styles.active : ""}`}
                      onClick={() => setReviewRating(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className={styles.review_content_input}>
                  <textarea
                    className={styles.review_textarea}
                    placeholder="관상 분석은 어떠셨나요? 솔직한 후기를 남겨주세요."
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    maxLength={500}
                  />
                  <span className={styles.review_char_count}>{reviewContent.length}/500</span>
                </div>

                <button
                  className={styles.review_submit_btn}
                  onClick={handleReviewSubmit}
                  disabled={isReviewSubmitting || !reviewContent.trim()}
                >
                  {isReviewSubmitting ? "등록 중..." : "후기 남기기"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 리뷰 하단 슬라이드 모달 */}
        {showReviewModal && !reviewSubmitted && !existingReview && (
          <div className={styles.review_modal_overlay} onClick={dismissReviewModal}>
            <div className={styles.review_modal} onClick={(e) => e.stopPropagation()}>
              <button className={styles.review_modal_close} onClick={dismissReviewModal}>✕</button>
              <div className={styles.review_header}>
                <h4 className={styles.review_title}>관상가 양반에게 후기를 남겨주세요</h4>
                <p className={styles.review_subtitle}>소중한 의견이 더 나은 서비스를 만듭니다</p>
              </div>

              <div className={styles.review_rating_options}>
                {[
                  { value: 1, label: "아쉬워요" },
                  { value: 2, label: "보통" },
                  { value: 3, label: "좋았어요" },
                  { value: 4, label: "고마워요" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.review_rating_btn} ${reviewRating === option.value ? styles.active : ""}`}
                    onClick={() => setReviewRating(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className={styles.review_content_input}>
                <textarea
                  className={styles.review_textarea}
                  placeholder="관상 분석은 어떠셨나요? 솔직한 후기를 남겨주세요."
                  value={reviewContent}
                  onChange={(e) => setReviewContent(e.target.value)}
                  maxLength={500}
                />
                <span className={styles.review_char_count}>{reviewContent.length}/500</span>
              </div>

              <button
                className={styles.review_submit_btn}
                onClick={async () => {
                  await handleReviewSubmit();
                  dismissReviewModal();
                }}
                disabled={isReviewSubmitting || !reviewContent.trim()}
              >
                {isReviewSubmitting ? "등록 중..." : "후기 남기기"}
              </button>
            </div>
          </div>
        )}

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
