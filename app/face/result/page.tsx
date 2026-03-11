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
  trackPageView,
} from "@/lib/mixpanel";
import { updateFaceAnalysisSupabase, getFaceAnalysisSupabase } from "@/lib/db/faceSupabaseDB";
import { createReview, getReviewByRecordId, Review } from "@/lib/db/reviewDB";
import { getImageUrl } from "@/lib/storage/imageStorage";

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
  basePrice: 9900,
  addonPrice: 5000,
  freeAddonCount: 1,
  discountAmount: 2000,
  originalPrice: 29900,
  orderName: "관상 상세 분석 서비스",
};

// 추가 보고서 옵션
const ADDON_OPTIONS = [
  { key: "wealth", label: "재물운" },
  { key: "love", label: "연애운" },
  { key: "career", label: "직업운" },
  { key: "health", label: "건강운" },
  { key: "marriage", label: "결혼운" },
] as const;

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
    marriage?: string;
  };
  reports: {
    base: { paid: boolean; data: unknown };
    wealth: { paid: boolean; data: unknown };
    love: { paid: boolean; data: unknown };
    marriage: { paid: boolean; data: unknown };
    career: { paid: boolean; data: unknown };
    health: { paid: boolean; data: unknown };
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
  { key: "face_reading", reportKey: "base", title: "부위별 관상 심층 풀이" },
  { key: "love", reportKey: "love", title: "연애운 심층 풀이" },
  { key: "career", reportKey: "career", title: "직업운 심층 풀이" },
  { key: "wealth", reportKey: "wealth", title: "재물운 심층 풀이" },
  { key: "health", reportKey: "health", title: "건강운 심층 풀이" },
  { key: "marriage", reportKey: "marriage", title: "결혼운 심층 풀이" },
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
  const isApplyingCouponRef = useRef(false);

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
  const [influencerDiscountName, setInfluencerDiscountName] = useState("");

  // 추가 보고서 선택 상태 (1개만 무료 선택)
  const [selectedAddon, setSelectedAddon] = useState<string | null>("wealth");
  const selectedAddons = selectedAddon ? new Set([selectedAddon]) : new Set<string>();
  const totalPrice = PAYMENT_CONFIG.basePrice;

  const toggleAddon = (key: string) => {
    setSelectedAddon((prev) => (prev === key ? null : key));
  };

  // 리뷰 관련 상태
  const [reviewRating, setReviewRating] = useState(4);
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
      const supabaseRecord = await getFaceAnalysisSupabase(resultId);
      if (!supabaseRecord) {
        router.push("/");
        return;
      }

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
        imageBase64: imageUrl,
        features: supabaseRecord.features || "",
        paid: supabaseRecord.is_paid || false,
        timestamp: supabaseRecord.created_at || new Date().toISOString(),
        summary: analysisResult?.base?.data?.summary,
        detail: analysisResult?.base?.data?.detail,
        sections: analysisResult?.base?.data?.sections,
        reports: supabaseRecord.analysis_result as FaceResult["reports"],
      };

      setResult(parsed);
      trackPageView("face_result", { id: parsed.id, paid: parsed.paid });

      // 이미 분석 완료된 경우 바로 결과 표시
      if (parsed.summary && parsed.detail) {
        setShowResult(true);
        setIsLoading(false);
        return;
      }

      // 결제 완료 상태면 분석 시작
      if (parsed.paid || parsed.reports?.base?.paid) {
        // 이미지가 URL이면 base64로 변환 필요 (분석 API는 base64 사용)
        if (imageUrl && !parsed.imageBase64.startsWith("data:")) {
          try {
            const imgResponse = await fetch(imageUrl);
            const imgBlob = await imgResponse.blob();
            const reader = new FileReader();
            const base64: string = await new Promise((resolve, reject) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(imgBlob);
            });
            parsed.imageBase64 = base64;
          } catch (imgErr) {
            console.error("이미지 로드 실패:", imgErr);
          }
        }
        setIsLoading(false);
        startRealAnalysis(parsed);
        return;
      }

      // 미결제 상태: 가라 분석 시작
      const loadingDoneKey = `base_report_loading_done_${resultId}`;
      const loadingDone = sessionStorage.getItem(loadingDoneKey);

      if (loadingDone) {
        setShowPaymentPage(true);
        setIsLoading(false);
      } else {
        setShowFakeAnalysis(true);
        setIsLoading(false);
        startFakeAnalysis(resultId);
      }
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

      // 선택된 섹션 결정: reports에서 paid=true인 항목
      const paidSections: string[] = ["face_reading"]; // base는 항상 포함
      if (data.reports) {
        for (const addon of ADDON_OPTIONS) {
          const reportKey = addon.key as keyof typeof data.reports;
          if (data.reports[reportKey]?.paid) {
            paidSections.push(addon.key);
          }
        }
      }
      formData.append("sections", paidSections.join(","));
      console.log("📤 요청 섹션:", paidSections.join(","));

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

      // Supabase 업데이트
      await updateFaceAnalysisSupabase(data.id, {
        features: features || data.features,
        analysis_result: updatedResult.reports as Record<string, unknown>,
      });

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
  const handleFreeCouponPayment = useCallback(async (couponCodeParam?: string) => {
    if (!result) return;

    try {
      // 선택된 addon 전부 paid=true로 마킹
      const updatedReports = {
        ...result.reports,
        base: { paid: true, data: result.reports?.base?.data || null },
      };
      for (const addonKey of selectedAddons) {
        const reportKey = addonKey as keyof typeof updatedReports;
        updatedReports[reportKey] = { paid: true, data: updatedReports[reportKey]?.data || null };
      }

      // Supabase 결제 완료 + 분석 결과 저장
      await updateFaceAnalysisSupabase(result.id, {
        analysis_result: updatedReports as Record<string, unknown>,
        is_paid: true,
        paid_at: new Date().toISOString(),
        payment_info: { method: "coupon", price: 0, couponCode: couponCodeParam || appliedCoupon?.code },
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
  }, [result, startRealAnalysis, appliedCoupon, selectedAddons]);

  // 쿠폰 검증 및 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!couponCode.trim() || isApplyingCouponRef.current) return;

    const code = couponCode.trim();
    isApplyingCouponRef.current = true;

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
      const discount = isFree ? totalPrice : data.discount_amount;

      setCouponError("");
      setAppliedCoupon({ code, discount, isFree });

      // 쿠폰 적용 이벤트 트래킹
      trackCouponApplied("face", {
        id: result?.id,
        coupon_code: code,
        discount,
        is_free: isFree,
        original_price: totalPrice,
        final_price: isFree
          ? 0
          : Math.max(totalPrice - discount, 100),
      });

      if (isFree) {
        // 1. 결과 저장 확정 (쿠폰 코드를 직접 전달 - setState 반영 전이므로)
        await handleFreeCouponPayment(code);

        // 2. 결과 확정 후 쿠폰 수량 차감
        try {
          await fetch("/api/coupon/use", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, serviceType: "face" }),
          });
        } catch (e) {
          console.error("쿠폰 수량 차감 실패:", e);
        }

        // 3. 이벤트 트래킹
        trackPaymentSuccess("face", {
          id: result?.id,
          order_id: `free_coupon_${Date.now()}`,
          amount: 0,
          original_price: totalPrice,
          coupon_code: code,
          is_free_coupon: true,
          report_type: "base",
        });
      } else {
        // 일반 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(totalPrice - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#payment-method", {
            value: newPrice,
          });
        }
      }
    } catch (error) {
      console.error("쿠폰 검증 오류:", error);
      setCouponError("쿠폰 확인 중 오류가 발생했습니다");
    } finally {
      isApplyingCouponRef.current = false;
    }
  }, [couponCode, handleFreeCouponPayment, result?.id, totalPrice]);

  // 결제 모달 열기
  const openPaymentModal = () => {
    if (!result) return;

    trackPaymentModalOpen("face", {
      id: result.id,
      price: totalPrice,
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
          value: totalPrice,
        });
        widget.renderAgreement("#agreement");
      }
    }, 100);
  };

  // 인플루언서 링크 자동 할인 적용
  useEffect(() => {
    if (!showPaymentModal || !result || appliedCoupon) return;

    const applyInfluencerDiscount = async () => {
      try {
        const utmSource = localStorage.getItem("utm_source");
        if (!utmSource) return;

        const res = await fetch(`/api/influencer/discount?slug=${encodeURIComponent(utmSource)}&serviceType=face`);
        const discountResult = await res.json();
        if (!discountResult.hasDiscount) return;

        const discount = discountResult.is_free ? totalPrice : discountResult.discount_amount;
        setInfluencerDiscountName(discountResult.influencer_name || "");

        if (discountResult.is_free) {
          setAppliedCoupon({ code: discountResult.discount_code, discount, isFree: true });
          handleFreeCouponPayment(discountResult.discount_code);
        } else {
          setAppliedCoupon({ code: discountResult.discount_code, discount, isFree: false });
          if (paymentWidgetRef.current) {
            const newPrice = Math.max(totalPrice - discount, 100);
            paymentWidgetRef.current.renderPaymentMethods("#payment-method", { value: newPrice });
          }
        }
      } catch (err) {
        console.error("인플루언서 할인 적용 오류:", err);
      }
    };

    const timer = setTimeout(applyInfluencerDiscount, 200);
    return () => clearTimeout(timer);
  }, [showPaymentModal, result, appliedCoupon, handleFreeCouponPayment, totalPrice]);

  // 결제 요청
  const handlePaymentRequest = async () => {
    if (!paymentWidgetRef.current || !result) return;

    const finalPrice = appliedCoupon
      ? Math.max(totalPrice - appliedCoupon.discount, 100)
      : totalPrice;

    const orderSuffix = appliedCoupon ? `-${appliedCoupon.code}` : "";
    const orderNameSuffix = appliedCoupon
      ? ` - ${appliedCoupon.code} 할인`
      : "";

    const addonsParam = selectedAddons.size > 0 ? `&addons=${Array.from(selectedAddons).join(",")}` : "";

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
          }/payment/success?id=${encodeURIComponent(result.id)}&type=base${addonsParam}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
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
    setInfluencerDiscountName("");

  };

  // 할인 모달 열기
  const discountPrice = totalPrice - PAYMENT_CONFIG.discountAmount;

  const openDiscountModal = () => {
    if (!result) return;

    trackPaymentModalOpen("face", {
      id: result.id,
      price: discountPrice,
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
          value: discountPrice,
        });
        widget.renderAgreement("#discount-agreement");
      }
    }, 100);
  };

  // 할인 결제 요청
  const handleDiscountPaymentRequest = async () => {
    if (!discountWidgetRef.current || !result) return;

    const addonsParam = selectedAddons.size > 0 ? `&addons=${Array.from(selectedAddons).join(",")}` : "";

    try {
      trackPaymentAttempt("face", {
        id: result.id,
        price: discountPrice,
        is_discount: true,
      });

      await discountWidgetRef.current.requestPayment({
        orderId: `discount_${Date.now()}`,
        orderName: "AI 관상 프리미엄 보고서 - 할인 특가",
        customerName: "고객",
        successUrl: `${window.location.origin
          }/payment/success?id=${encodeURIComponent(result.id)}&type=base${addonsParam}`,
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
                          alt="관상 사진"
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

          {/* AI 수묵화 초상 (원본 대체) */}
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
                        alt="관상 사진"
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

                  {/* 기본 항목 */}
                  <div className={styles.payment_row}>
                    <span className={styles.payment_row_label}>
                      부위별 관상 심층 풀이
                    </span>
                    <span className={styles.payment_row_value}>
                      {PAYMENT_CONFIG.basePrice.toLocaleString()}원
                    </span>
                  </div>

                  {/* 무료 추가 보고서 선택 (인라인) */}
                  <div className={styles.addon_inline_wrap}>
                    <div className={styles.addon_inline_title}>추가 보고서 무료 선택 1개</div>
                    <div className={styles.addon_inline_items}>
                      {ADDON_OPTIONS.map((opt) => {
                        const isSelected = selectedAddon === opt.key;
                        return (
                          <button
                            key={opt.key}
                            className={`${styles.addon_inline_chip} ${isSelected ? styles.addon_inline_chip_active : ""}`}
                            onClick={() => toggleAddon(opt.key)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 쿠폰 할인 적용 표시 */}
                  {appliedCoupon && !appliedCoupon.isFree && (
                    <div className={`${styles.payment_row} ${styles.discount}`}>
                      <span className={styles.payment_row_label}>
                        {influencerDiscountName ? `특별 추가 할인 (${influencerDiscountName})` : `${appliedCoupon.code} 쿠폰`}
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
                        ? Math.max(totalPrice - appliedCoupon.discount, 0).toLocaleString()
                        : totalPrice.toLocaleString()}원
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

                  {/* 기본 항목 */}
                  <div className={styles.payment_row}>
                    <span className={styles.payment_row_label}>
                      부위별 관상 심층 풀이
                    </span>
                    <span className={styles.payment_row_value}>
                      {PAYMENT_CONFIG.basePrice.toLocaleString()}원
                    </span>
                  </div>

                  {/* 무료 추가 보고서 선택 (인라인) */}
                  <div className={styles.addon_inline_wrap}>
                    <div className={styles.addon_inline_title}>추가 보고서 무료 선택 1개</div>
                    <div className={styles.addon_inline_items}>
                      {ADDON_OPTIONS.map((opt) => {
                        const isSelected = selectedAddon === opt.key;
                        return (
                          <button
                            key={opt.key}
                            className={`${styles.addon_inline_chip} ${isSelected ? styles.addon_inline_chip_active : ""}`}
                            onClick={() => toggleAddon(opt.key)}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 할인 */}
                  <div className={`${styles.payment_row} ${styles.discount}`}>
                    <span className={styles.payment_row_label}>
                      깜짝 추가 할인
                    </span>
                    <div className={styles.payment_row_discount_value}>
                      <span className={styles.discount_amount}>
                        -{PAYMENT_CONFIG.discountAmount.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className={styles.payment_divider} />

                  {/* 최종 금액 */}
                  <div className={`${styles.payment_row} ${styles.final}`}>
                    <span className={styles.payment_row_label}>최종 결제금액</span>
                    <span className={styles.payment_row_final_value}>
                      {discountPrice.toLocaleString()}원
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
                        alt="관상 사진"
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

          {/* AI 수묵화 초상 (원본 대체) */}
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
                        alt="관상 사진"
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
