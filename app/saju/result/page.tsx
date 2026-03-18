"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
const SAJU_API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;
import { trackPageView, trackPaymentModalOpen, trackPaymentModalClose, trackPaymentAttempt, trackCouponApplied, trackPaymentSuccess } from "@/lib/mixpanel";
import { getSajuAnalysisByShareId, updateSajuAnalysis, SajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import {
  getColor,
  getStemElement,
  getBranchElement,
  getBranchKorean,
  getStemKorean,
  getElementKorean,
  escapeHTML,
  simpleMD as simpleMDBase,
} from "@/lib/saju-utils";
import { ScenePlayer, Scene, CardScene, WaitingScene, ActionScene } from "@/components/scene-player";
import { getChapterConfig, CHAPTER_TITLES, sajuPlayerConfig } from "./config";
import styles from "./result.module.css";

// TossPayments 타입 선언
declare global {
  interface Window {
    PaymentWidget: (
      clientKey: string,
      customerKey: string,
    ) => {
      renderPaymentMethods: (
        selector: string,
        options: { value: number },
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
  price: 23900,
  discountPrice: 9900,
  originalPrice: 44800,
  orderName: "운학선인 정통 종합 사주 분석",
};

// 간소화된 레코드 타입
interface SajuRecord {
  id: string;
  createdAt: string;
  paid: boolean;
  paidAt?: string;
  seenIntro: boolean;
  input: {
    userName: string;
    gender: string;
    date: string;
    calendar: "solar" | "lunar";
    time: string | null;
    userConcern: string;
  };
  rawSajuData: Record<string, unknown>;
  sajuData: {
    dayMaster: { char: string; title: string; element?: string; yinYang?: string };
    pillars: Record<string, unknown>;
    fiveElements?: Record<string, unknown>;
    sinsal?: Record<string, unknown>;
    daeun?: Record<string, unknown>;
    zodiac?: Record<string, unknown>;
    luckCycles?: Record<string, unknown>;
    currentSaeun?: Record<string, unknown>;
  };
  analysisResult: {
    user_name: string;
    chapters: { number: number; title: string; content: string }[];
  } | null;
  paymentInfo?: {
    method: string;
    price: number;
    couponCode?: string;
    isDiscount?: boolean;
  };
}

// Supabase → SajuRecord 변환
function supabaseToRecord(r: SajuAnalysis, seenIntro = false): SajuRecord {
  const raw = r.raw_saju_data as Record<string, unknown> | null;
  const result = r.analysis_result as {
    user_name?: string;
    chapters?: Array<{ number: number; title: string; content: string }>;
  } | null;

  return {
    id: r.id,
    createdAt: r.created_at || new Date().toISOString(),
    paid: r.is_paid || false,
    paidAt: r.paid_at || undefined,
    seenIntro,
    input: {
      userName: r.user_info?.userName || "",
      gender: r.user_info?.gender || "",
      date: r.user_info?.date || "",
      calendar: r.user_info?.calendar || "solar",
      time: r.user_info?.time || null,
      userConcern: r.user_info?.userConcern || "",
    },
    rawSajuData: (r.raw_saju_data as Record<string, unknown>) || {},
    sajuData: {
      dayMaster: (raw?.dayMaster as SajuRecord["sajuData"]["dayMaster"]) || { char: "", title: "" },
      pillars: (raw?.pillars as Record<string, unknown>) || {},
      fiveElements: raw?.fiveElements as Record<string, unknown>,
      sinsal: raw?.sinsal as Record<string, unknown>,
      daeun: raw?.daeun as Record<string, unknown>,
      zodiac: raw?.zodiac as Record<string, unknown>,
      luckCycles: raw?.luckCycles as Record<string, unknown>,
      currentSaeun: raw?.currentSaeun as Record<string, unknown>,
    },
    analysisResult: result ? {
      user_name: result.user_name || "",
      chapters: result.chapters || [],
    } : null,
    paymentInfo: r.payment_info ? {
      method: r.payment_info.method,
      price: r.payment_info.price,
      couponCode: r.payment_info.couponCode,
      isDiscount: r.payment_info.isDiscount,
    } : undefined,
  };
}

// 운학선인 전용 마크다운 파서
const simpleMD = (src: string = "") =>
  simpleMDBase(src, {
    name: "운학선인",
    pinchImg: "/saju/img/unhak-1.jpg",
    sokdakImg: "/saju/img/unhak-1.jpg",
    todakImg: "/saju/img/unhak-1.jpg",
  });

// 분석 결과 타입
interface GeneralAnalysisResult {
  user_name: string;
  chapters: {
    number: number;
    title: string;
    content: string;
  }[];
}

// 챕터 콘텐츠 포매팅
function formatChapterContent(content: string): string {
  return simpleMD(content);
}

function SajuResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SajuRecord | null>(null);
  const MAX_AUTO_RETRY = 2;

  // 씬 상태
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [jumpIndex, setJumpIndex] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);
  const [allTocUnlocked, setAllTocUnlocked] = useState(false);

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const pendingDataRef = useRef<SajuRecord | null>(null);

  // 결제 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [influencerDiscountName, setInfluencerDiscountName] = useState("");
  const paymentWidgetRef = useRef<ReturnType<typeof window.PaymentWidget> | null>(null);
  const isApplyingCouponRef = useRef(false);

  // 페이지 상태: free_preview | payment | loading_full | full_result
  const [pageState, setPageState] = useState<"free_preview" | "payment" | "loading_full" | "full_result">("free_preview");

  // 채팅 Q&A 상태
  const [chatMessages, setChatMessages] = useState<{ sender: "unhak" | "user"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatRemaining, setChatRemaining] = useState(5);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const isFetchingRef = useRef(false);
  const partialStartedRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startLoadingMessagesRef = useRef<(userName: string) => void>(() => {});
  const fetchAnalysisRef = useRef<(record: SajuRecord) => void>(() => {});

  // 이미지 프리로드
  useEffect(() => {
    const imageUrls = Array.from(
      { length: 25 },
      (_, i) => `/saju/img/unhak-${i + 1}.jpg`
    );
    const preloadImages = async () => {
      const batchSize = 3;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(
            (url) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve();
                img.src = url;
              })
          )
        );
      }
    };
    preloadImages();
  }, []);

  const getChapterKey = (chapter: { number?: number; title?: string }): string => {
    if (typeof chapter.number === "number" && chapter.number >= 1 && chapter.number <= 6) {
      return `chapter${chapter.number}`;
    }
    const title = chapter.title || "";
    if (title.includes("1장")) return "chapter1";
    if (title.includes("2장")) return "chapter2";
    if (title.includes("3장")) return "chapter3";
    if (title.includes("4장")) return "chapter4";
    if (title.includes("5장")) return "chapter5";
    if (title.includes("6장")) return "chapter6";
    return "chapter1";
  };

  // 무료 미리보기 씬 (들어가며 + 1장 + paywall)
  const buildFreeScenes = useCallback((record: SajuRecord): Scene[] => {
    const userName = record.input?.userName || "고객";
    return [
      { kind: "dialogue", id: "opening-dialogue", text: `허허, ${userName}님이시구먼.\n이 늙은이가 사주를 풀어드리겠네.`, bgImage: "/saju/img/unhak-1.jpg" },
      { kind: "dialogue", id: "intro-guide-dialogue", text: `${userName}님의 사주를 살펴보기 전에,\n먼저 사주팔자가 무엇인지 간단히 알려드리겠네.`, bgImage: "/saju/img/unhak-4.jpg" },
      { kind: "card", id: "intro-card", bgImage: "/saju/img/unhak-5.jpg", tocLabel: "들어가며" },
      { kind: "dialogue", id: "saju-intro-dialogue", text: `그럼 이제 ${userName}님의\n사주 원국을 펼쳐보겠네.`, bgImage: "/saju/img/unhak-5.jpg" },
      { kind: "card", id: "saju-card", bgImage: "/saju/img/unhak-7.jpg", tocLabel: "사주 원국" },
      { kind: "dialogue", id: "chapter1-pre", text: `1장에서는 사주팔자의 뜻을 풀어드리겠네.\n이 부분은 무료로 살펴보시게.`, bgImage: "/saju/img/unhak-6.jpg" },
      { kind: "card", id: "chapter-chapter1-report", bgImage: "/saju/img/unhak-7.jpg", chapterIndex: 0, tocLabel: `1장. ${CHAPTER_TITLES[0]}` },
      { kind: "dialogue", id: "chapter1-outro", text: `어떠신가, ${userName}님의 팔자가 보이시는가?\n나머지 5장의 깊은 풀이를 보시려면\n전체 풀이를 열어보시게.`, bgImage: "/saju/img/unhak-8.jpg" },
      { kind: "action", id: "paywall", bgImage: "/saju/img/unhak-1.jpg" },
    ];
  }, []);

  // 유료 전체 씬 (2~6장 + 엔딩 + 채팅 Q&A)
  const buildPaidScenes = useCallback((record: SajuRecord): Scene[] => {
    const result: Scene[] = [];
    const userName = record.analysisResult?.user_name || record.input?.userName || "고객";
    const chapters = record.analysisResult?.chapters || [];
    const chapterConfig = getChapterConfig(userName);

    // 들어가며 + 사주원국 (재방문 시에도 보여줌)
    result.push({ kind: "dialogue", id: "opening-dialogue", text: `${userName}님, 다시 오셨구먼.\n사주 풀이를 이어서 보시게.`, bgImage: "/saju/img/unhak-1.jpg" });
    result.push({ kind: "card", id: "intro-card", bgImage: "/saju/img/unhak-5.jpg", tocLabel: "들어가며" });
    result.push({ kind: "card", id: "saju-card", bgImage: "/saju/img/unhak-7.jpg", tocLabel: "사주 원국" });

    // 각 챕터
    chapters.forEach((chapter, index) => {
      const chapterKey = getChapterKey(chapter);
      const config = chapterConfig[chapterKey];
      const chapterNum = parseInt(chapterKey.replace("chapter", ""));

      if (config?.intro) {
        result.push({ kind: "dialogue", id: `chapter-${chapterKey}-intro`, text: config.intro, bgImage: config.introBg || "/saju/img/unhak-1.jpg" });
      }

      result.push({ kind: "card", id: `chapter-${chapterKey}-report`, bgImage: config?.reportBg || "/saju/img/unhak-1.jpg", chapterIndex: index, tocLabel: `${chapterNum}장. ${CHAPTER_TITLES[chapterNum - 1] || ""}` });

      if (config?.outro) {
        result.push({ kind: "dialogue", id: `chapter-${chapterKey}-outro`, text: config.outro, bgImage: config.outroBg || "/saju/img/unhak-1.jpg" });
      }
    });

    // 엔딩
    result.push({ kind: "dialogue", id: "ending-intro", text: `${userName}님, 여기까지 긴 풀이를 함께해주셔서 감사하네.\n사주의 깊은 뜻이 조금은 보이시는가?`, bgImage: "/saju/img/unhak-24.jpg" });
    result.push({ kind: "dialogue", id: "ending-outro", text: `앞으로의 삶에\n늘 좋은 기운이 함께하시길 바라겠네.\n\n궁금한 것이 있으면 물어보시게.`, bgImage: "/saju/img/unhak-24.jpg" });
    result.push({ kind: "card", id: "ending", bgImage: "/saju/img/unhak-24.jpg", tocLabel: "마무리" });

    // 채팅 Q&A
    result.push({ kind: "action", id: "chat-qa", bgImage: "/saju/img/unhak-25.jpg" });

    return result;
  }, []);

  // 대기 씬 (결제 후 분석 중)
  const buildWaitingScenes = useCallback((record: SajuRecord): Scene[] => {
    const userName = record.input?.userName || "고객";
    return [
      { kind: "dialogue", id: "paid-dialogue", text: `${userName}님, 감사하네.\n이제 깊은 풀이를 시작하겠네.`, bgImage: "/saju/img/unhak-1.jpg" },
      { kind: "waiting", id: "waiting", bgImage: "/saju/img/unhak-1.jpg" },
    ];
  }, []);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const loadingMsgs = [
      `${userName}님의 사주 팔자를 분석하고 있네`,
      "지금 페이지를 나가면 분석이 완료되지 않을 수 있네",
      `${userName}님의 오행 관계를 살피고 있네`,
      "대운의 흐름을 읽고 있네",
      "곧 분석이 완료되겠네",
    ];
    let index = 0;
    setLoadingMessage(loadingMsgs[0]);

    loadingIntervalRef.current = setInterval(() => {
      index = (index + 1) % loadingMsgs.length;
      setLoadingMessage(loadingMsgs[index]);
    }, 4000);
  }, []);

  const stopLoadingMessages = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  // 분석 API 호출 (2~6장)
  const fetchAnalysis = useCallback(
    async (storedData: SajuRecord, retryCount = 0) => {
      const MAX_RETRIES = 2;
      const userName = storedData.input?.userName || "고객";

      if (retryCount === 0) {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        startLoadingMessages(userName);
      }

      try {
        const response = await fetch(`${SAJU_API_URL}/saju_general/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saju_data: {
              ...storedData.sajuData,
              input: storedData.input,
            },
            user_name: storedData.input?.userName || "",
            user_concern: storedData.input?.userConcern?.trim() || "",
            year: new Date().getFullYear(),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "분석에 실패했습니다.");
        }

        const analysisResult = (await response.json()) as GeneralAnalysisResult;

        const updatedData: SajuRecord = {
          ...storedData,
          analysisResult,
        };

        // Supabase에 분석 결과 저장
        try {
          await updateSajuAnalysis(storedData.id, {
            analysis_result: {
              user_name: analysisResult.user_name,
              chapters: analysisResult.chapters,
            },
          });
        } catch (dbErr) {
          console.error("Supabase 업데이트 실패:", dbErr);
        }

        stopLoadingMessages();
        setIsAnalyzing(false);
        isFetchingRef.current = false;
        sessionStorage.removeItem(`saju_retry_${storedData.id}`);

        if (partialStartedRef.current) {
          pendingDataRef.current = updatedData;
          setAnalysisComplete(true);
        } else {
          setData(updatedData);
          setPageState("full_result");
          setScenes(buildPaidScenes(updatedData));
          setIsLoading(false);
        }
      } catch (err) {
        stopLoadingMessages();
        setIsAnalyzing(false);
        isFetchingRef.current = false;

        console.error("분석 API 실패:", err);

        const retryKey = `saju_retry_${storedData.id}`;
        const currentRetry = parseInt(sessionStorage.getItem(retryKey) || "0", 10);

        if (currentRetry < MAX_AUTO_RETRY) {
          sessionStorage.setItem(retryKey, String(currentRetry + 1));
          setTimeout(() => window.location.reload(), 2000);
          return;
        }

        sessionStorage.removeItem(retryKey);
        setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    },
    [startLoadingMessages, stopLoadingMessages, buildPaidScenes]
  );

  useEffect(() => {
    startLoadingMessagesRef.current = startLoadingMessages;
    fetchAnalysisRef.current = fetchAnalysis;
  }, [startLoadingMessages, fetchAnalysis]);

  // 초기화
  useEffect(() => {
    if (!resultId) {
      setError("결과를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const supabaseRecord = await getSajuAnalysisByShareId(resultId);
        const seenIntroKey = `seenIntro_saju_${resultId}`;
        const seenIntro = sessionStorage.getItem(seenIntroKey) === "true";
        const record = supabaseRecord ? supabaseToRecord(supabaseRecord, seenIntro) : null;

        if (!record) {
          setError("데이터를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        trackPageView("saju_result", {
          id: record.id,
          user_name: record.input.userName,
          gender: record.input.gender,
          birth_date: record.input.date,
          paid: record.paid || false,
          day_master: record.sajuData.dayMaster?.char,
        });

        // 돌아온 유저 처리
        if (record.paid && record.analysisResult) {
          // 결제 완료 & 분석 완료 → 바로 전체 씬
          setData(record);
          setPageState("full_result");
          setScenes(buildPaidScenes(record));
          setAllTocUnlocked(true);
          setIsLoading(false);
          return;
        }

        if (record.paid && !record.analysisResult) {
          // 결제 완료 & 분석 미완료 → 분석 시작
          setData(record);
          setPageState("loading_full");
          setIsAnalyzing(true);
          setScenes(buildWaitingScenes(record));
          setIsLoading(false);
          partialStartedRef.current = true;
          fetchAnalysis(record);
          return;
        }

        // 미결제 → 무료 미리보기
        setData(record);
        setPageState("free_preview");

        if (record.seenIntro) {
          setScenes(buildFreeScenes(record));
          setIsLoading(false);
          return;
        }

        // 첫 방문: 가라 로딩
        startLoadingMessages(record.input?.userName || "고객");
        setTimeout(() => {
          stopLoadingMessages();
          sessionStorage.setItem(seenIntroKey, "true");
          setScenes(buildFreeScenes(record));
          setIsLoading(false);
        }, 8000);
      } catch (err) {
        console.error("loadData 에러:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    loadData();
  }, [resultId, searchParams, fetchAnalysis, buildFreeScenes, buildPaidScenes, buildWaitingScenes, startLoadingMessages, stopLoadingMessages]);

  // 분석 완료 시 씬 전환
  const handleAnalysisTransition = useCallback(() => {
    if (pendingDataRef.current) {
      const updatedData = pendingDataRef.current;
      setData(updatedData);
      setPageState("full_result");
      const fullScenes = buildPaidScenes(updatedData);
      const chapter2IntroIndex = fullScenes.findIndex((s) => s.id === "chapter-chapter2-intro");
      setScenes(fullScenes);
      setJumpIndex(chapter2IntroIndex >= 0 ? chapter2IntroIndex : 0);
      setSceneKey((k) => k + 1);
      pendingDataRef.current = null;
      setAnalysisComplete(false);
    }
  }, [buildPaidScenes]);

  // 결제 모달 열기
  const openPaymentModal = useCallback(() => {
    if (!data) return;
    const paymentPrice = PAYMENT_CONFIG.price;
    trackPaymentModalOpen("saju", { id: data.id, price: paymentPrice });
    setShowPaymentModal(true);

    // TossPayments 스크립트 로드 + 위젯 렌더
    const loadTossWidget = () => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(PAYMENT_CONFIG.clientKey, customerKey);
        paymentWidgetRef.current = widget;
        widget.renderPaymentMethods("#saju-general-payment-method", { value: paymentPrice });
        widget.renderAgreement("#saju-general-agreement");
      }
    };

    // 스크립트가 아직 없으면 동적 로드
    if (!window.PaymentWidget) {
      const script = document.createElement("script");
      script.src = "https://js.tosspayments.com/v1/payment-widget";
      script.onload = () => setTimeout(loadTossWidget, 100);
      document.head.appendChild(script);
    } else {
      setTimeout(loadTossWidget, 100);
    }
  }, [data]);

  // 인플루언서 자동 할인
  useEffect(() => {
    if (!showPaymentModal || !data || appliedCoupon) return;

    const applyInfluencerDiscount = async () => {
      try {
        const utmSource = localStorage.getItem("utm_source");
        if (!utmSource) return;
        const res = await fetch(`/api/influencer/discount?slug=${encodeURIComponent(utmSource)}&serviceType=saju`);
        const result = await res.json();
        if (!result.hasDiscount) return;
        const discount = result.is_free ? PAYMENT_CONFIG.price : result.discount_amount;
        setInfluencerDiscountName(result.influencer_name || "");

        if (result.is_free) {
          setAppliedCoupon({ code: result.discount_code, discount });
          try {
            await updateSajuAnalysis(data.id, {
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_info: { method: "coupon", price: 0, couponCode: result.discount_code, isDiscount: true },
            });
          } catch (e) { console.error("무료 쿠폰 처리 실패:", e); }
          try {
            await fetch("/api/coupon/use", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: result.discount_code, serviceType: "saju" }),
            });
          } catch (e) { console.error("쿠폰 차감 실패:", e); }
          // Slack 알림
          fetch("/api/slack/payment-notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceType: "saju",
              userName: data.input.userName,
              amount: 0,
              couponCode: result.discount_code,
              influencerName: result.influencer_name || null,
              gender: data.input.gender,
              birthDate: data.input.date,
              birthTime: data.input.time,
              wish: data.input.userConcern || null,
            }),
          }).catch(() => {});
          // 결제 완료 → 분석 시작
          setShowPaymentModal(false);
          handlePaidTransition();
        } else {
          setAppliedCoupon({ code: result.discount_code, discount });
          if (paymentWidgetRef.current) {
            const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
            paymentWidgetRef.current.renderPaymentMethods("#saju-general-payment-method", { value: newPrice });
          }
        }
      } catch (err) {
        console.error("인플루언서 할인 오류:", err);
      }
    };

    const timer = setTimeout(applyInfluencerDiscount, 200);
    return () => clearTimeout(timer);
  }, [showPaymentModal, data, appliedCoupon]);

  // 쿠폰 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!data || !couponCode.trim() || isApplyingCouponRef.current) return;
    const code = couponCode.trim();
    isApplyingCouponRef.current = true;
    setIsApplyingCoupon(true);

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, serviceType: "saju" }),
      });
      const result = await res.json();
      if (!result.valid) {
        setCouponError(result.error || "유효하지 않은 쿠폰입니다");
        return;
      }
      const isFree = result.is_free;
      const discount = isFree ? PAYMENT_CONFIG.price : result.discount_amount;
      setCouponError("");

      if (isFree) {
        setAppliedCoupon({ code, discount });
        try {
          await updateSajuAnalysis(data.id, {
            is_paid: true, paid_at: new Date().toISOString(),
            payment_info: { method: "coupon", price: 0, couponCode: code, isDiscount: true },
          });
        } catch (e) { console.error("무료 쿠폰 처리 실패:", e); }
        try {
          await fetch("/api/coupon/use", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, serviceType: "saju" }),
          });
        } catch (e) { console.error("쿠폰 차감 실패:", e); }
        trackCouponApplied("saju", { coupon_code: code, discount: PAYMENT_CONFIG.price, is_free: true, final_price: 0 });
        trackPaymentSuccess("saju", { id: data.id, price: 0, method: "coupon", coupon_code: code });
        // Slack 알림
        fetch("/api/slack/payment-notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceType: "saju",
            userName: data.input.userName,
            amount: 0,
            couponCode: code,
            influencerName: null,
            gender: data.input.gender,
            birthDate: data.input.date,
            birthTime: data.input.time,
            wish: data.input.userConcern || null,
          }),
        }).catch(() => {});
        setShowPaymentModal(false);
        handlePaidTransition();
      } else {
        setAppliedCoupon({ code, discount });
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#saju-general-payment-method", { value: newPrice });
        }
      }
    } catch (error) {
      console.error("쿠폰 오류:", error);
      setCouponError("쿠폰 확인 중 오류가 발생했습니다");
    } finally {
      isApplyingCouponRef.current = false;
      setIsApplyingCoupon(false);
    }
  }, [data, couponCode]);

  // 결제 요청
  const handlePaymentRequest = useCallback(async () => {
    if (!paymentWidgetRef.current || !data) return;
    const finalPrice = appliedCoupon ? PAYMENT_CONFIG.price - appliedCoupon.discount : PAYMENT_CONFIG.price;
    trackPaymentAttempt("saju", { id: data.id, price: finalPrice, is_discount: !!appliedCoupon });

    try {
      const orderSuffix = appliedCoupon ? `-${appliedCoupon.code}` : "";
      await paymentWidgetRef.current.requestPayment({
        orderId: `saju-general${orderSuffix}_${Date.now()}`,
        orderName: PAYMENT_CONFIG.orderName,
        customerName: data.input.userName || "고객",
        successUrl: `${window.location.origin}/payment/success?type=saju_general&id=${encodeURIComponent(data.id)}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
        failUrl: `${window.location.origin}/payment/fail?id=${encodeURIComponent(data.id)}&type=saju_general`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  }, [data, appliedCoupon]);

  // 결제 모달 닫기
  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;
    trackPaymentModalClose("saju", { id: data?.id, reason: "user_close" });
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setInfluencerDiscountName("");
  }, [data]);

  // 결제 완료 후 전환
  const handlePaidTransition = useCallback(() => {
    if (!data) return;
    const updatedData = { ...data, paid: true };
    setData(updatedData);
    setPageState("loading_full");
    setIsAnalyzing(true);
    setScenes(buildWaitingScenes(updatedData));
    setSceneKey((k) => k + 1);
    setJumpIndex(0);
    partialStartedRef.current = true;
    fetchAnalysis(updatedData);
  }, [data, buildWaitingScenes, fetchAnalysis]);

  // 채팅 Q&A 전송
  const handleChatSend = useCallback(async () => {
    if (!data || !chatInput.trim() || isChatSending || chatRemaining <= 0) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: question }]);
    setIsChatSending(true);

    try {
      const response = await fetch(`${SAJU_API_URL}/saju_general/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saju_data: { ...data.sajuData, input: data.input },
          analysis_result: data.analysisResult,
          question,
          user_name: data.input.userName,
        }),
      });

      if (!response.ok) throw new Error("채팅 응답 실패");
      const result = await response.json();
      const answer = result.answer || result.response || "답변을 생성하지 못했네. 다시 물어봐주시게.";
      setChatMessages((prev) => [...prev, { sender: "unhak", text: answer }]);
      setChatRemaining((prev) => prev - 1);
    } catch (err) {
      console.error("채팅 오류:", err);
      setChatMessages((prev) => [...prev, { sender: "unhak", text: "허허, 잠시 오류가 생겼네. 다시 한 번 물어봐주시게." }]);
    } finally {
      setIsChatSending(false);
    }
  }, [data, chatInput, isChatSending, chatRemaining]);

  // 채팅 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className={styles.saju_result_page}>
        <div className="main_body_wrap" style={{ background: "white", minHeight: "100vh", width: "100%", maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          <div className={styles.loading_spinner} style={{ width: 40, height: 40, border: "4px solid #e8dff5", borderTopColor: "#6b4c9a", borderRadius: "50%", animation: "saju-spin 1s linear infinite" }} />
          <p className={styles.loading_text}>
            {loadingMessage || "분석 결과를 불러오는 중..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.saju_result_page}>
        <div style={{ background: "white", minHeight: "100vh", width: "100%", maxWidth: 500, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 20, textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.6 }}>
            정말 죄송합니다.<br />사주 분석에 오류가 발생했습니다.<br />다시 한 번 시도해주세요.
          </p>
          <button className={styles.retry_btn} onClick={() => window.location.reload()}>
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  if (!data || scenes.length === 0) return null;

  const userName = data.analysisResult?.user_name || data.input?.userName || "고객";

  // 카드 렌더링
  const renderCard = (scene: CardScene) => {
    if (scene.id === "intro-card") return <IntroCard userName={userName} data={data} />;
    if (scene.id === "saju-card") return <SajuOriginalCard data={data} />;
    if (scene.id === "ending") return <EndingCard data={data} />;
    if (scene.chapterIndex != null && data.analysisResult?.chapters?.[scene.chapterIndex]) {
      return <ReportCard chapter={data.analysisResult.chapters[scene.chapterIndex]} chapterIndex={scene.chapterIndex} />;
    }
    return null;
  };

  // 대기 렌더링
  const renderWaiting = (
    _scene: WaitingScene,
    props: { isComplete: boolean; onTransition: () => void }
  ) => (
    <WaitingCard
      userName={userName}
      isComplete={props.isComplete}
      onTransition={props.onTransition}
    />
  );

  // 액션 렌더링
  const renderAction = (scene: ActionScene, onComplete: () => void) => {
    if (scene.id === "paywall") {
      return (
        <div className={styles.paywall_wrap}>
          <div className={styles.paywall_title}>
            나머지 5장의 깊은 풀이를<br />열어보시겠는가?
          </div>
          <div className={styles.paywall_subtitle}>
            그대의 본색, 숨은 기운, 역학관계,<br />대운의 물결, 그리고 이 늙은이의 당부까지<br />모든 풀이를 펼쳐드리겠네.
          </div>
          <button className={styles.paywall_btn} onClick={openPaymentModal}>
            전체 풀이 열기
          </button>
        </div>
      );
    }
    if (scene.id === "chat-qa") {
      return (
        <div className={styles.chat_qa_wrap}>
          <div className={styles.chat_qa_title}>운학선인에게 물어보기</div>
          <div className={styles.chat_qa_subtitle}>
            사주 풀이에 대해 궁금한 점을 물어보세요 (남은 횟수: {chatRemaining}회)
          </div>
          <div className={styles.chat_qa_messages}>
            {chatMessages.length === 0 && (
              <div className={styles.chat_qa_bubble_unhak}>
                {userName}님, 사주 풀이를 보시고 궁금한 점이 있으시면 편히 물어보시게.
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={msg.sender === "unhak" ? styles.chat_qa_bubble_unhak : styles.chat_qa_bubble_user}
              >
                {msg.text}
              </div>
            ))}
            {isChatSending && (
              <div className={styles.chat_qa_typing}>
                <div className={styles.chat_qa_typing_dot} />
                <div className={styles.chat_qa_typing_dot} />
                <div className={styles.chat_qa_typing_dot} />
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className={styles.chat_qa_input_wrap}>
            <input
              type="text"
              className={styles.chat_qa_input}
              placeholder={chatRemaining > 0 ? "궁금한 점을 물어보세요..." : "질문 횟수를 모두 사용했습니다"}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleChatSend(); }}
              disabled={chatRemaining <= 0 || isChatSending}
            />
            <button
              className={styles.chat_qa_send_btn}
              onClick={handleChatSend}
              disabled={!chatInput.trim() || chatRemaining <= 0 || isChatSending}
            >
              <span className="material-icons" style={{ fontSize: 20 }}>send</span>
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <ScenePlayer
        key={sceneKey}
        config={sajuPlayerConfig}
        scenes={scenes}
        initialIndex={jumpIndex}
        styles={styles}
        renderCard={renderCard}
        renderWaiting={renderWaiting}
        renderAction={renderAction}
        analysisComplete={analysisComplete}
        onAnalysisTransition={handleAnalysisTransition}
        allTocUnlocked={allTocUnlocked}
      />

      {/* 결제 오버레이 */}
      {showPaymentModal && (
        <div className={styles.payment_overlay} onClick={closePaymentModal}>
          <div className={styles.payment_modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.payment_header}>
              <div className={styles.payment_title}>전체 풀이 열기</div>
              <button className={styles.payment_close_btn} onClick={closePaymentModal}>✕</button>
            </div>

            <div className={styles.payment_price_info}>
              <div className={styles.payment_original_price}>
                {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
              </div>
              <div className={styles.payment_final_price}>
                {appliedCoupon
                  ? `${Math.max(PAYMENT_CONFIG.price - appliedCoupon.discount, 0).toLocaleString()}원`
                  : `${PAYMENT_CONFIG.price.toLocaleString()}원`
                }
                {appliedCoupon && (
                  <span className={styles.payment_discount_badge}>할인 적용</span>
                )}
              </div>
              {influencerDiscountName && (
                <div style={{ fontSize: 13, color: "#6b4c9a", marginTop: 4 }}>
                  {influencerDiscountName} 할인 적용됨
                </div>
              )}
            </div>

            {/* 쿠폰 */}
            <div className={styles.coupon_section}>
              <div className={styles.coupon_input_row}>
                <input
                  type="text"
                  className={styles.coupon_input}
                  placeholder="쿠폰 코드 입력"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                  disabled={!!appliedCoupon}
                />
                <button
                  className={styles.coupon_apply_btn}
                  onClick={handleCouponSubmit}
                  disabled={!couponCode.trim() || isApplyingCoupon || !!appliedCoupon}
                >
                  {isApplyingCoupon ? "확인중..." : "적용"}
                </button>
              </div>
              {couponError && <div className={styles.coupon_error}>{couponError}</div>}
              {appliedCoupon && (
                <div className={styles.coupon_success}>
                  쿠폰이 적용되었습니다! (-{appliedCoupon.discount.toLocaleString()}원)
                </div>
              )}
            </div>

            {/* 결제 위젯 */}
            <div className={styles.payment_widget_area}>
              <div id="saju-general-payment-method" />
              <div id="saju-general-agreement" />
            </div>

            <button className={styles.payment_submit_btn} onClick={handlePaymentRequest}>
              결제하기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 들어가며 카드
function IntroCard({ userName, data }: { userName: string; data: SajuRecord }) {
  return (
    <div className={styles.chapter_section}>
      <div className={styles.section_title}>들어가며</div>
      <div className={styles.section_content}>
        <p>
          {userName}님, 허허... 이 늙은이가 사주를 풀어드리겠네.
        </p>
        <p>
          사주(四柱)란 태어난 <strong>연, 월, 일, 시</strong> 네 기둥을 말하고,
          팔자(八字)란 각 기둥의 천간과 지지, 합 여덟 글자를 이르는 말이네.
        </p>
        <p>
          이 여덟 글자 속에 {userName}님의 타고난 기질, 재능, 건강,
          인간관계, 재물운, 그리고 삶의 흐름이 담겨 있다네.
        </p>
        <p>
          물론 사주는 정해진 운명이 아니라, 삶의 <strong>경향성과 가능성</strong>을 보여주는 것이네.
          어떻게 활용하느냐는 그대의 몫이지.
        </p>
      </div>
    </div>
  );
}

// 사주 원국 카드
function SajuOriginalCard({ data }: { data: SajuRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const dayMaster = data.sajuData?.dayMaster;
  const fiveElements = data.sajuData?.fiveElements;
  const input = data.input;

  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const timeMap: Record<string, string> = {
      "00:30": "자시", "02:30": "축시", "04:30": "인시", "06:30": "묘시",
      "08:30": "진시", "10:30": "사시", "12:30": "오시", "14:30": "미시",
      "16:30": "신시", "18:30": "유시", "20:30": "술시", "22:30": "해시",
    };
    return timeMap[time] || null;
  };

  const birthTime = formatTimeToSi(input?.time);

  // 오행 퍼센트
  const elementPercent: Record<string, number> = (fiveElements?.percent as Record<string, number>) || {};
  const elementOrder = [
    { key: "wood", label: "목(木)", color: "#2aa86c" },
    { key: "fire", label: "화(火)", color: "#ff6a6a" },
    { key: "earth", label: "토(土)", color: "#caa46a" },
    { key: "metal", label: "금(金)", color: "#9a9a9a" },
    { key: "water", label: "수(水)", color: "#6aa7ff" },
  ];

  const maxPercent = Math.max(...elementOrder.map(e => elementPercent[e.key] || 0), 1);

  return (
    <div className={styles.chapter_section}>
      <div className={styles.section_title}>{userName}님의 사주 원국</div>
      <div className={styles.section_content}>
        {/* 기본 정보 */}
        <div style={{ marginBottom: 16, fontSize: 14, color: "#666" }}>
          {input?.date} {birthTime ? `| ${birthTime}` : ""} | {dayMaster?.title || ""}
        </div>

        {/* 사주 원국표 */}
        <div className={styles.saju_table_wrap}>
          <table className={styles.saju_table}>
            <thead>
              <tr>
                <th></th>
                <th>시주</th>
                <th>일주</th>
                <th>월주</th>
                <th>연주</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.row_label}>천간</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key] as Record<string, unknown> | undefined;
                  const stem = p?.stem as Record<string, unknown> | undefined;
                  if (!stem?.char) return <td key={key}>—</td>;
                  const element = getStemElement(stem.char as string);
                  const color = getColor(element);
                  return (
                    <td key={key}>
                      <span className={styles.saju_char} style={{ color }}>{stem.char as string}</span>
                      <span className={styles.saju_label}>{getStemKorean(stem.char as string)}</span>
                      <span className={styles.saju_element_tag} style={{ background: color }}>
                        {getElementKorean(element)}
                      </span>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td className={styles.row_label}>지지</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key] as Record<string, unknown> | undefined;
                  const branch = p?.branch as Record<string, unknown> | undefined;
                  if (!branch?.char) return <td key={key}>—</td>;
                  const element = getBranchElement(branch.char as string);
                  const color = getColor(element);
                  return (
                    <td key={key}>
                      <span className={styles.saju_char} style={{ color }}>{branch.char as string}</span>
                      <span className={styles.saju_label}>{getBranchKorean(branch.char as string)}</span>
                      <span className={styles.saju_element_tag} style={{ background: color }}>
                        {getElementKorean(element)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 일간 정보 */}
        {dayMaster?.char && (
          <div className={styles.subsection}>
            <div className={styles.subsection_title}>일간: {dayMaster.char} ({dayMaster.title})</div>
            <p>
              일간은 사주의 중심이 되는 글자로, {userName}님의 본질적인 기질과 성격을 나타내네.
              {dayMaster.element && ` ${getElementKorean(dayMaster.element)}의 기운을 타고났구먼.`}
            </p>
          </div>
        )}

        {/* 오행 차트 */}
        {Object.keys(elementPercent).length > 0 && (
          <div className={styles.subsection}>
            <div className={styles.subsection_title}>오행 분포</div>
            <div className={styles.five_element_chart}>
              {elementOrder.map((el) => {
                const pct = elementPercent[el.key] || 0;
                const height = Math.max((pct / maxPercent) * 80, 4);
                return (
                  <div key={el.key} className={styles.element_bar_wrap}>
                    <span className={styles.element_bar_percent}>{pct}%</span>
                    <div
                      className={styles.element_bar}
                      style={{ height, background: el.color }}
                    />
                    <span className={styles.element_bar_label}>{el.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 리포트 카드
function ReportCard({
  chapter,
  chapterIndex,
}: {
  chapter: { title: string; content: string };
  chapterIndex: number;
}) {
  const rawTitle = chapter.title || "";
  const chapterMatch = rawTitle.match(/(\d+)장/);
  const chapterNum = chapterMatch ? parseInt(chapterMatch[1]) : chapterIndex + 1;
  const labelText = `${chapterNum}장`;
  const titleText = rawTitle
    .replace(/^#+\s*/, "")
    .replace(/\[(\d+)장\]\s*/, "")
    .replace(/^(\d+)장\s*/, "")
    .trim();

  return (
    <div className={styles.chapter_section}>
      <div className={styles.section_title}>
        <span style={{ color: "#6b4c9a", marginRight: 8 }}>{labelText}</span>
        {titleText}
      </div>
      <div
        className={styles.section_content}
        dangerouslySetInnerHTML={{ __html: formatChapterContent(chapter.content || "") }}
      />
    </div>
  );
}

// 엔딩 카드
function EndingCard({ data }: { data: SajuRecord }) {
  const userName = data.input?.userName || "고객";
  return (
    <div className={styles.chapter_section}>
      <div className={styles.section_title}>마무리</div>
      <div className={styles.section_content}>
        <p>
          {userName}님, 여기까지 긴 사주 풀이를 함께해주셔서 감사하네.
        </p>
        <p>
          사주는 정해진 운명이 아니라, 삶의 흐름과 가능성을 보여주는 것이네.
          좋은 기운은 살리고, 약한 부분은 보완하며 살아가시게.
        </p>
        <p>
          앞으로의 삶에 늘 좋은 기운이 함께하시길 바라겠네.
        </p>
      </div>
    </div>
  );
}

// 대기 카드
function WaitingCard({
  userName,
  isComplete,
  onTransition,
}: {
  userName: string;
  isComplete: boolean;
  onTransition: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = [
    `${userName}님의 사주를 분석하고 있네`,
    "오행의 관계를 살피고 있네",
    "대운의 흐름을 읽고 있네",
    "십성과 신살을 확인하고 있네",
    "곧 분석이 완료되겠네",
  ];

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      setTimeout(onTransition, 1500);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 3, 90));
    }, 500);

    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(msgInterval);
    };
  }, [isComplete, onTransition]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh", padding: 40, textAlign: "center", gap: 24,
    }}>
      <div style={{
        width: 50, height: 50, border: "4px solid #e8dff5",
        borderTopColor: "#6b4c9a", borderRadius: "50%",
        animation: "saju-spin 1s linear infinite",
      }} />
      <div style={{
        width: "80%", height: 6, background: "rgba(255,255,255,0.2)",
        borderRadius: 3, overflow: "hidden",
      }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: "linear-gradient(90deg, #6b4c9a, #9b7fcf)",
          borderRadius: 3, transition: "width 0.5s ease",
        }} />
      </div>
      <p style={{
        color: "rgba(255,255,255,0.8)", fontSize: 15,
        fontFamily: "'MaruBuri', serif", lineHeight: 1.6,
      }}>
        {messages[msgIndex]}
      </p>
      <style jsx>{`
        @keyframes saju-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function SajuResultPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100vh", gap: 20, background: "white",
        }}>
          <div style={{
            width: 40, height: 40, border: "4px solid #e8dff5",
            borderTopColor: "#6b4c9a", borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{ color: "#4b3778", fontWeight: 600 }}>로딩 중...</p>
          <style jsx>{`
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </div>
      }
    >
      <SajuResultContent />
    </Suspense>
  );
}
