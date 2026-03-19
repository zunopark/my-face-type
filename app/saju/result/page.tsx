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
    taiYuan?: Record<string, unknown>;
    mingGong?: Record<string, unknown>;
    shenGong?: Record<string, unknown>;
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
      taiYuan: (raw?.gong as Record<string, unknown>)?.taiYuan as Record<string, unknown>,
      mingGong: (raw?.gong as Record<string, unknown>)?.mingGong as Record<string, unknown>,
      shenGong: (raw?.gong as Record<string, unknown>)?.shenGong as Record<string, unknown>,
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
      { kind: "dialogue", id: "opening-dialogue", text: `${userName}님, 어서 오세요.\n사주팔자를 풀어드리겠습니다.`, bgImage: "/saju/img/unhak-1.jpg" },
      { kind: "dialogue", id: "intro-guide-dialogue", text: `${userName}님의 사주를 살펴보기 전에,\n먼저 사주팔자가 무엇인지 간단히 알려드릴게요.`, bgImage: "/saju/img/unhak-4.jpg" },
      { kind: "card", id: "intro-card", bgImage: "/saju/img/unhak-5.jpg", tocLabel: "들어가며" },
      { kind: "dialogue", id: "saju-intro-dialogue", text: `그럼 이제 ${userName}님의\n사주 원국을 펼쳐볼게요.`, bgImage: "/saju/img/unhak-5.jpg" },
      { kind: "card", id: "saju-card", bgImage: "/saju/img/unhak-7.jpg", tocLabel: "사주 원국" },
      { kind: "dialogue", id: "chapter1-pre", text: `1장에서는 사주팔자의 뜻을 풀어드릴게요.\n이 부분은 무료로 살펴보실 수 있습니다.`, bgImage: "/saju/img/unhak-6.jpg" },
      { kind: "card", id: "chapter-chapter1-report", bgImage: "/saju/img/unhak-7.jpg", chapterIndex: 0, tocLabel: `1장. ${CHAPTER_TITLES[0]}` },
      { kind: "dialogue", id: "chapter1-outro", text: `어떠세요, ${userName}님의 팔자가 보이시나요?\n나머지 5장의 깊은 풀이를 보시려면\n전체 풀이를 열어보세요.`, bgImage: "/saju/img/unhak-8.jpg" },
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
    result.push({ kind: "dialogue", id: "opening-dialogue", text: `${userName}님, 다시 오셨군요.\n사주 풀이를 이어서 보여드릴게요.`, bgImage: "/saju/img/unhak-1.jpg" });
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

    // 마무리 카드
    result.push({ kind: "dialogue", id: "ending-intro", text: `${userName}님, 여기까지 긴 풀이를 함께해주셔서 감사합니다.\n사주의 깊은 뜻이 조금은 보이시나요?`, bgImage: "/saju/img/unhak-24.jpg" });
    result.push({ kind: "dialogue", id: "ending-outro", text: `앞으로의 삶에\n늘 좋은 기운이 함께하시길 바랍니다.\n\n궁금한 것이 있으면 물어보세요.`, bgImage: "/saju/img/unhak-24.jpg" });
    result.push({ kind: "card", id: "summary", bgImage: "/saju/img/unhak-24.jpg", tocLabel: "마무리" });

    // 채팅 Q&A
    result.push({ kind: "dialogue", id: "chat-qa-intro", text: `${userName}님, 사주 풀이를 보시고\n궁금한 점이 있으시면 편히 물어보세요.`, bgImage: "/saju/img/unhak-25.jpg" });
    result.push({ kind: "action", id: "chat-qa", bgImage: "/saju/img/unhak-25.jpg", tocLabel: "운학선인에게 물어보기" });

    // 진짜 엔딩 (처음부터 다시 보기 / 홈으로)
    result.push({ kind: "card", id: "ending", bgImage: "/saju/img/unhak-24.jpg" });

    return result;
  }, []);

  // 대기 씬 (결제 후 분석 중)
  const buildWaitingScenes = useCallback((record: SajuRecord): Scene[] => {
    const userName = record.input?.userName || "고객";
    return [
      { kind: "dialogue", id: "paid-dialogue", text: `${userName}님, 감사합니다.\n이제 깊은 풀이를 시작하겠습니다.`, bgImage: "/saju/img/unhak-1.jpg" },
      { kind: "waiting", id: "waiting", bgImage: "/saju/img/unhak-1.jpg" },
    ];
  }, []);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const loadingMsgs = [
      `${userName}님의 사주 팔자를 분석하고 있습니다`,
      "지금 페이지를 나가면 분석이 완료되지 않을 수 있어요",
      `${userName}님의 오행 관계를 살피고 있습니다`,
      "대운의 흐름을 읽고 있습니다",
      "곧 분석이 완료됩니다",
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
          chat_history: chatMessages.map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      if (!response.ok) throw new Error("채팅 응답 실패");
      const result = await response.json();
      const answer = result.answer || result.response || "답변을 생성하지 못했습니다. 다시 물어봐주세요.";
      setChatMessages((prev) => [...prev, { sender: "unhak", text: answer }]);
      setChatRemaining((prev) => prev - 1);
    } catch (err) {
      console.error("채팅 오류:", err);
      setChatMessages((prev) => [...prev, { sender: "unhak", text: "잠시 오류가 생겼습니다. 다시 한 번 물어봐주세요." }]);
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
    if (scene.id === "summary") return <EndingCard data={data} />;
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
            나머지 5장의 깊은 풀이를<br />열어보시겠어요?
          </div>
          <div className={styles.paywall_subtitle}>
            본색, 숨은 기운, 역학관계,<br />대운의 물결, 그리고 운학선인의 당부까지<br />모든 풀이를 펼쳐드리겠습니다.
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
                {userName}님, 사주 풀이를 보시고 궁금한 점이 있으시면 편히 물어보세요.
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

// 일간별 종합 성격 데이터 (일반 사주용)
const dayMasterGeneralData: Record<
  string,
  { headline: string; summary: string; keywords: string[] }
> = {
  甲: {
    headline: "곧고 당당한, 큰 나무 같은 기질",
    summary:
      "갑목일간은 우뚝 솟은 큰 나무처럼 곧고 당당합니다. 리더십이 강하고 정의감이 있으며, 새로운 일을 개척하는 능력이 뛰어납니다.",
    keywords: ["리더십", "정의감", "개척정신"],
  },
  乙: {
    headline: "유연하고 끈질긴, 덩굴 같은 기질",
    summary:
      "을목일간은 덩굴처럼 유연하면서도 끈질긴 생명력을 지녔습니다. 어떤 환경에도 적응하며 부드러운 외교력으로 사람을 이끕니다.",
    keywords: ["적응력", "외교력", "인내심"],
  },
  丙: {
    headline: "밝고 열정적인, 태양 같은 기질",
    summary:
      "병화일간은 태양처럼 밝고 열정적입니다. 긍정적인 에너지로 주변을 환하게 만들며, 표현력과 추진력이 뛰어납니다.",
    keywords: ["열정", "긍정에너지", "추진력"],
  },
  丁: {
    headline: "은은하고 섬세한, 촛불 같은 기질",
    summary:
      "정화일간은 촛불처럼 은은하고 섬세합니다. 학문과 예술에 재능이 있으며, 깊은 통찰력으로 사물의 본질을 꿰뚫어 봅니다.",
    keywords: ["섬세함", "통찰력", "학문적"],
  },
  戊: {
    headline: "넉넉하고 듬직한, 큰 산 같은 기질",
    summary:
      "무토일간은 큰 산처럼 넉넉하고 듬직합니다. 포용력이 크고 신뢰감을 주며, 중심을 잡아주는 안정적인 성격입니다.",
    keywords: ["포용력", "안정감", "신뢰"],
  },
  己: {
    headline: "묵묵히 가꾸는, 대지 같은 기질",
    summary:
      "기토일간은 농사짓는 대지처럼 성실하고 현실적입니다. 남을 돌보는 헌신적인 성격이며, 실속 있게 일을 처리합니다.",
    keywords: ["성실함", "헌신", "실속"],
  },
  庚: {
    headline: "강인하고 결단력 있는, 강철 같은 기질",
    summary:
      "경금일간은 강철처럼 단단하고 결단력이 있습니다. 의리가 있고 약속을 중시하며, 목표를 향해 거침없이 나아갑니다.",
    keywords: ["결단력", "의리", "추진력"],
  },
  辛: {
    headline: "빛나고 정교한, 보석 같은 기질",
    summary:
      "신금일간은 보석처럼 빛나고 정교합니다. 심미안이 뛰어나고 완벽을 추구하며, 예민한 감각으로 세밀한 일을 잘 해냅니다.",
    keywords: ["완벽주의", "심미안", "정교함"],
  },
  壬: {
    headline: "넓고 지혜로운, 바다 같은 기질",
    summary:
      "임수일간은 바다처럼 넓은 포용력과 깊은 지혜를 지녔습니다. 총명하고 창의적이며, 큰 그림을 그리는 능력이 뛰어납니다.",
    keywords: ["지혜", "창의력", "포용력"],
  },
  癸: {
    headline: "촉촉하고 감성적인, 이슬 같은 기질",
    summary:
      "계수일간은 이슬처럼 촉촉하고 감성이 풍부합니다. 직관력이 뛰어나고 섬세하며, 조용히 깊이 있는 사고를 합니다.",
    keywords: ["감성", "직관력", "섬세함"],
  },
};

// 신강/신약 종합 해석 (일반 사주용)
const strengthGeneralInterpretation: Record<
  string,
  {
    title: string;
    mainRatio: string;
    traits: string[];
    pattern: string[];
    goodPoints: string[];
    warning: string[];
    advice: string;
  }
> = {
  극신강: {
    title: "자기 확신이 매우 강한 유형",
    mainRatio: "주체성 100%",
    traits: ["독립적이고 자기 주장이 강함", "남의 도움을 잘 받지 않음", "자기 방식을 고집함"],
    pattern: ["내가 알아서 할게", "간섭하지 마", "내 방식이 맞아"],
    goodPoints: ["뚝심과 결단력", "흔들림 없는 중심"],
    warning: ["타인의 조언을 무시할 수 있음", "융통성이 부족할 수 있음", "인간관계에서 독단적"],
    advice: "주변의 의견을 경청하는 연습이 필요합니다. 재물운에서 과도한 투자를 주의하세요.",
  },
  태강: {
    title: "주도적으로 밀고 나가는 유형",
    mainRatio: "주체성 85~90%",
    traits: ["자기 확신이 강함", "결정이 빠름", "추진력이 뛰어남"],
    pattern: ["내가 결정할게", "이렇게 하면 돼", "걱정 마, 내가 다 할게"],
    goodPoints: ["결단력과 추진력", "주변에 안정감을 줌", "리더십이 뛰어남"],
    warning: ["타인의 의견을 놓칠 수 있음", "융통성이 부족할 수 있음"],
    advice: "사업이나 조직에서 리더 역할에 적합하지만, 협업 능력을 기르면 더 큰 성공이 가능합니다.",
  },
  신강: {
    title: "자기 주관이 뚜렷한 유형",
    mainRatio: "주체성 70~80%",
    traits: ["독립적", "자기 스타일이 확실함", "직접적이고 솔직함"],
    pattern: ["내가 알아서 할게", "이게 맞다고 생각해", "난 이게 좋아"],
    goodPoints: ["결단력이 있음", "주변을 이끌어줌", "흔들리지 않는 중심"],
    warning: ["고집이 세다는 소리를 들을 수 있음", "타협이 필요한 상황에서 어려움"],
    advice: "직장에서 관리자 역할에 적합합니다. 건강 면에서 과로를 주의하세요.",
  },
  중화: {
    title: "균형 잡힌 이상적인 유형",
    mainRatio: "주체성 50%",
    traits: ["상황에 따라 유연하게 대처", "균형 잡힌 성격"],
    pattern: ["같이 정하자", "상황 봐서 결정할게", "이것도 괜찮고 저것도 괜찮아"],
    goodPoints: ["어떤 환경에도 적응 잘함", "인간관계가 원만함", "안정적인 삶"],
    warning: [],
    advice: "타고난 균형감이 장점입니다. 다양한 분야에서 고르게 발전할 수 있습니다.",
  },
  신약: {
    title: "주변과 조화를 이루는 유형",
    mainRatio: "주체성 20~30%",
    traits: ["배려심이 깊음", "협조적", "헌신적"],
    pattern: ["다른 사람은 어떻게 생각해?", "내가 맞출게", "같이 하면 좋겠어"],
    goodPoints: ["협동심이 뛰어남", "배려심이 깊음", "갈등을 피하려 함"],
    warning: ["자기 의견을 제대로 말하지 못함", "스트레스를 안으로 쌓음"],
    advice: "자신감을 키우는 것이 중요합니다. 건강 관리에 특히 신경 쓰세요.",
  },
  태약: {
    title: "주변에 많이 맞추는 유형",
    mainRatio: "주체성 10~15%",
    traits: ["배려심이 매우 깊음", "맞춰주는 게 편함", "갈등을 회피함"],
    pattern: ["네가 원하는 대로 할게", "난 괜찮아", "네가 좋으면 돼"],
    goodPoints: ["헌신적", "주변을 편하게 해줌", "부드러운 성격"],
    warning: ["자기 주장이 약함", "참다가 한번에 터질 수 있음", "건강에 무리가 올 수 있음"],
    advice: "자기 자신을 먼저 챙기는 연습이 필요합니다. 체력 관리가 특히 중요합니다.",
  },
  극신약: {
    title: "완전히 주변 환경에 영향받는 유형",
    mainRatio: "주체성이 거의 없음",
    traits: ["자존감이 낮을 수 있음", "의존적", "불안감이 있음"],
    pattern: ["시키는 대로 할게...", "내가 뭘 잘못했을까?", "혼자는 어려워..."],
    goodPoints: ["헌신적", "타인을 최우선으로 생각"],
    warning: ["주체성 부족으로 이용당할 수 있음", "건강이 약할 수 있음", "자기 자신을 잃어버림"],
    advice: "자존감을 높이고 독립심을 기르는 것이 최우선입니다. 건강 관리를 철저히 하세요.",
  },
};

// 들어가며 카드
function IntroCard({ userName, data }: { userName: string; data: SajuRecord }) {
  return (
    <div className={`${styles.report_card} ${styles.intro_card} ${styles.saju_card_simple}`}>
      {/* 인사 */}
      <div className={`${styles.intro_section} ${styles.intro_welcome} ${styles.compact}`}>
        <p className={styles.welcome_sub}>사주팔자 풀이</p>
        <p className={styles.welcome_main}>{userName}님, 반갑습니다</p>
        <p className={styles.welcome_text}>
          운학선인이 {userName}님의 사주를 풀어드리겠습니다.
          <br />
          먼저 사주팔자가 무엇인지 알려드릴게요.
        </p>
      </div>

      {/* 사주팔자란? */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>사주팔자란?</h3>
        <p className={styles.intro_section_subtitle}>태어난 순간에 담긴 우주의 기운</p>

        <div className={styles.intro_section_content}>
          <p>
            <strong>사주(四柱)</strong>란 태어난 <strong>연(년), 월, 일, 시</strong> 네 개의 기둥을 말합니다.
            마치 집을 떠받치는 네 기둥처럼, 사람의 삶을 지탱하는 네 축이에요.
          </p>
          <p>
            <strong>팔자(八字)</strong>란 이 네 기둥 각각에 붙는 두 글자, 총 여덟 글자를 말합니다.
            위쪽 글자를 <strong>천간</strong>(하늘의 기운), 아래쪽 글자를 <strong>지지</strong>(땅의 기운)라고 해요.
          </p>
          <p>
            쉽게 말하면, {userName}님이 태어난 바로 그 순간의 하늘과 땅의 기운을 여덟 글자로 기록한 것이 사주팔자입니다.
          </p>
        </div>

        <div className={styles.saju_explain_card}>
          <p className={styles.saju_explain_title}>왜 태어난 시간이 중요할까요?</p>
          <p className={styles.saju_explain_text}>
            동양 철학에서는 세상 만물이 기운의 흐름 속에 있다고 봅니다.
            태어나는 순간 우주에 흐르던 기운이 그 사람에게 각인되는 것이죠.
            같은 날 태어나도 시간이 다르면 다른 기운을 받기 때문에, 성격과 운명의 흐름이 달라집니다.
          </p>
        </div>
      </div>

      {/* 네 기둥의 의미 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>네 기둥이 각각 뜻하는 것</h3>

        <div className={styles.intro_section_content}>
          <p>
            네 기둥은 단순히 시간 구분이 아니라, 각각 삶의 다른 영역과 시기를 담당합니다.
          </p>
        </div>

        <div className={styles.element_meaning_list}>
          <div className={styles.element_meaning_item}>
            <strong>년주(年柱) - 뿌리</strong>
            <p>
              조상, 부모, 가문의 기운을 담고 있습니다.
              {userName}님이 어떤 환경에서 자랐는지, 사회적 배경과 초년운(1~20세)을 나타내요.
            </p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>월주(月柱) - 줄기</strong>
            <p>
              부모, 형제, 사회생활의 기운입니다.
              직업 적성과 사회적 역할, 청년기(20~40세)의 운을 보여줍니다.
              사주에서 <strong>가장 강한 영향력</strong>을 가진 기둥이에요.
            </p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>일주(日柱) - 꽃</strong>
            <p>
              <strong>나 자신</strong>을 나타내는 가장 핵심적인 기둥입니다.
              일주의 천간(일간)이 곧 {userName}님의 본질이에요.
              배우자 궁이기도 해서, 결혼운과 중년기(40~60세)를 봅니다.
            </p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>시주(時柱) - 열매</strong>
            <p>
              자녀, 제자, 말년의 결실을 담고 있습니다.
              노년기(60세~)의 운과 삶의 최종 결과를 나타내요.
            </p>
          </div>
        </div>
      </div>

      {/* 천간과 지지 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>천간과 지지</h3>
        <p className={styles.intro_section_subtitle}>하늘의 기운, 땅의 기운</p>

        <div className={styles.intro_section_content}>
          <p>
            각 기둥은 위아래 두 글자로 이루어져 있습니다.
            위쪽 <strong>천간(天干)</strong>은 하늘의 기운으로, 겉으로 드러나는 성격과 행동 방식을 나타내요.
            아래쪽 <strong>지지(地支)</strong>는 땅의 기운으로, 내면의 욕구와 무의식적 성향을 보여줍니다.
          </p>
        </div>

        <div className={styles.element_meaning_list}>
          <div className={styles.element_meaning_item}>
            <strong>천간 - 10개의 하늘 글자</strong>
            <p>
              갑(甲), 을(乙), 병(丙), 정(丁), 무(戊), 기(己), 경(庚), 신(辛), 임(壬), 계(癸).
              이 10개 글자가 오행(목, 화, 토, 금, 수)과 음양으로 나뉘어 각각 고유한 기운을 가집니다.
            </p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>지지 - 12개의 땅 글자</strong>
            <p>
              자(子), 축(丑), 인(寅), 묘(卯), 진(辰), 사(巳), 오(午), 미(未), 신(申), 유(酉), 술(戌), 해(亥).
              우리가 아는 12띠(쥐, 소, 호랑이...)가 바로 이 12지지에서 나온 것이에요.
            </p>
          </div>
        </div>
      </div>

      {/* 오행이란 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>오행(五行)이란?</h3>
        <p className={styles.intro_section_subtitle}>세상을 이루는 다섯 가지 기운</p>

        <div className={styles.intro_section_content}>
          <p>
            사주의 모든 글자는 <strong>목(木), 화(火), 토(土), 금(金), 수(水)</strong> 다섯 가지 기운 중 하나에 속합니다.
            이 오행의 균형과 관계가 {userName}님의 성격, 건강, 재물, 인간관계를 결정합니다.
          </p>
        </div>

        <div className={styles.element_meaning_list}>
          <div className={styles.element_meaning_item}>
            <strong style={{ color: "#2aa86c" }}>목(木) - 나무의 기운</strong>
            <p>성장, 시작, 창의력, 인자함을 상징합니다. 봄의 기운이에요. 간담과 관련되며, 새로운 것을 시작하는 힘입니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong style={{ color: "#ff6a6a" }}>화(火) - 불의 기운</strong>
            <p>열정, 표현, 예의, 밝음을 상징합니다. 여름의 기운이에요. 심장과 관련되며, 빛나고 드러내는 힘입니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong style={{ color: "#caa46a" }}>토(土) - 흙의 기운</strong>
            <p>안정, 중재, 신뢰, 포용을 상징합니다. 환절기의 기운이에요. 비위와 관련되며, 중심을 잡아주는 힘입니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong style={{ color: "#9a9a9a" }}>금(金) - 쇠의 기운</strong>
            <p>결단, 의리, 정의, 깔끔함을 상징합니다. 가을의 기운이에요. 폐와 관련되며, 정리하고 마무리하는 힘입니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong style={{ color: "#4a90d9" }}>수(水) - 물의 기운</strong>
            <p>지혜, 유연함, 소통, 적응력을 상징합니다. 겨울의 기운이에요. 신장과 관련되며, 흐르고 스며드는 힘입니다.</p>
          </div>
        </div>

        <div className={styles.saju_explain_card}>
          <p className={styles.saju_explain_title}>오행의 상생과 상극</p>
          <p className={styles.saju_explain_text}>
            오행은 서로 돕기도 하고(상생), 억제하기도 합니다(상극).
            목은 화를 낳고, 화는 토를 낳고, 토는 금을 낳고, 금은 수를 낳고, 수는 목을 낳습니다.
            반대로 목은 토를 극하고, 토는 수를 극하고, 수는 화를 극하고, 화는 금을 극하고, 금은 목을 극합니다.
            이 관계가 사주 안에서 어떻게 작용하느냐에 따라 삶의 조화와 갈등이 결정됩니다.
          </p>
        </div>
      </div>

      {/* 십성이란 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>십성(十星)이란?</h3>
        <p className={styles.intro_section_subtitle}>나와 세상의 관계를 보여주는 열 가지 별</p>

        <div className={styles.intro_section_content}>
          <p>
            십성은 일간(나)을 기준으로 다른 글자들과의 관계를 나타낸 것입니다.
            같은 글자라도 내 일간이 무엇이냐에 따라 의미가 완전히 달라져요.
          </p>
        </div>

        <div className={styles.element_meaning_list}>
          <div className={styles.element_meaning_item}>
            <strong>비견 / 겁재</strong>
            <p>나와 같은 오행. 형제, 동료, 경쟁자를 뜻합니다. 자존심, 독립심, 경쟁심과 관련됩니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>식신 / 상관</strong>
            <p>내가 낳는 오행. 표현력, 재능, 자녀를 뜻합니다. 창의력과 말솜씨, 기술과 관련됩니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>편재 / 정재</strong>
            <p>내가 극하는 오행. 재물, 아버지, 이성(남성 기준)을 뜻합니다. 돈 관리, 현실 감각과 관련됩니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>편관 / 정관</strong>
            <p>나를 극하는 오행. 직장, 명예, 규율, 이성(여성 기준)을 뜻합니다. 책임감, 사회적 지위와 관련됩니다.</p>
          </div>
          <div className={styles.element_meaning_item}>
            <strong>편인 / 정인</strong>
            <p>나를 낳는 오행. 어머니, 학문, 보호를 뜻합니다. 배움, 자격증, 정신적 안정과 관련됩니다.</p>
          </div>
        </div>
      </div>

      {/* 대운이란 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>대운(大運)이란?</h3>
        <p className={styles.intro_section_subtitle}>10년마다 바뀌는 인생의 큰 흐름</p>

        <div className={styles.intro_section_content}>
          <p>
            사주 원국이 타고난 설계도라면, <strong>대운</strong>은 10년 단위로 바뀌는 환경의 변화입니다.
            같은 사주를 가지고 태어나도 대운의 흐름에 따라 10대에 잘 풀리는 사람, 40대에 꽃피는 사람이 다릅니다.
          </p>
          <p>
            대운 위에 매년 바뀌는 <strong>세운(연운)</strong>, 매월 바뀌는 <strong>월운</strong>이 겹쳐져서
            그 해, 그 달의 운세가 결정됩니다.
          </p>
        </div>

        <div className={styles.saju_explain_card}>
          <p className={styles.saju_explain_title}>사주 + 운 = 완성된 해석</p>
          <p className={styles.saju_explain_text}>
            타고난 사주만으로는 절반만 보는 것입니다.
            사주(원국)가 씨앗이라면, 대운은 토양과 날씨에 해당해요.
            좋은 씨앗도 환경이 안 맞으면 못 자라고, 평범한 씨앗도 좋은 환경을 만나면 크게 자랍니다.
            그래서 사주와 운을 함께 보는 것이 중요합니다.
          </p>
        </div>
      </div>

      {/* 마무리 안내 */}
      <div className={styles.intro_section}>
        <div className={`${styles.intro_section_content}`} style={{ textAlign: "center" }}>
          <p>
            지금까지 사주팔자의 기본 개념을 알아보았습니다.
          </p>
          <p>
            이제 {userName}님의 <strong>실제 사주 원국</strong>을 펼쳐볼게요.
            <br />
            여덟 글자 속에 어떤 이야기가 담겨 있는지 함께 살펴봅시다.
          </p>
        </div>
      </div>
    </div>
  );
}

// 사주 원국 카드 (상세)
function SajuOriginalCard({ data }: { data: SajuRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const sajuData = data.sajuData;
  const dayMaster = data.sajuData?.dayMaster;
  const fiveElements = data.sajuData?.fiveElements;
  const input = data.input;

  // 대운/연운/월운 스크롤 ref
  const daeunScrollRef = useRef<HTMLDivElement>(null);
  const yeonunScrollRef = useRef<HTMLDivElement>(null);
  const wolunScrollRef = useRef<HTMLDivElement>(null);

  // 태어난 시간을 시진으로 변환 (시간 범위 포함)
  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const timeMap: Record<string, string> = {
      "0030": "자시 (23:30~01:29)",
      "0230": "축시 (01:30~03:29)",
      "0430": "인시 (03:30~05:29)",
      "0630": "묘시 (05:30~07:29)",
      "0830": "진시 (07:30~09:29)",
      "1030": "사시 (09:30~11:29)",
      "1230": "오시 (11:30~13:29)",
      "1430": "미시 (13:30~15:29)",
      "1630": "신시 (15:30~17:29)",
      "1830": "유시 (17:30~19:29)",
      "2030": "술시 (19:30~21:29)",
      "2230": "해시 (21:30~23:29)",
      "00:30": "자시 (23:30~01:29)",
      "02:30": "축시 (01:30~03:29)",
      "04:30": "인시 (03:30~05:29)",
      "06:30": "묘시 (05:30~07:29)",
      "08:30": "진시 (07:30~09:29)",
      "10:30": "사시 (09:30~11:29)",
      "12:30": "오시 (11:30~13:29)",
      "14:30": "미시 (13:30~15:29)",
      "16:30": "신시 (15:30~17:29)",
      "18:30": "유시 (17:30~19:29)",
      "20:30": "술시 (19:30~21:29)",
      "22:30": "해시 (21:30~23:29)",
    };
    if (timeMap[time]) return timeMap[time];
    const hour = parseInt(time.replace(":", "").slice(0, 2), 10);
    if (!isNaN(hour)) {
      if (hour >= 23 || hour < 1) return "자시 (23:30~01:29)";
      if (hour >= 1 && hour < 3) return "축시 (01:30~03:29)";
      if (hour >= 3 && hour < 5) return "인시 (03:30~05:29)";
      if (hour >= 5 && hour < 7) return "묘시 (05:30~07:29)";
      if (hour >= 7 && hour < 9) return "진시 (07:30~09:29)";
      if (hour >= 9 && hour < 11) return "사시 (09:30~11:29)";
      if (hour >= 11 && hour < 13) return "오시 (11:30~13:29)";
      if (hour >= 13 && hour < 15) return "미시 (13:30~15:29)";
      if (hour >= 15 && hour < 17) return "신시 (15:30~17:29)";
      if (hour >= 17 && hour < 19) return "유시 (17:30~19:29)";
      if (hour >= 19 && hour < 21) return "술시 (19:30~21:29)";
      if (hour >= 21 && hour < 23) return "해시 (21:30~23:29)";
    }
    return null;
  };

  const birthTime = formatTimeToSi(input?.time);

  // 일간 데이터
  const dmData = dayMaster?.char ? dayMasterGeneralData[dayMaster.char] : null;

  // 신강/신약 레벨
  const strengthLevel =
    (fiveElements as Record<string, unknown>)?.strengthLevel as string ||
    (fiveElements as Record<string, unknown>)?.strength as string ||
    "중화";
  const strengthData =
    strengthGeneralInterpretation[strengthLevel] ||
    strengthGeneralInterpretation["중화"];

  // 오행 퍼센트
  const elementPercent: Record<string, number> =
    (fiveElements as Record<string, unknown>)?.percent as Record<string, number> || {};

  // pillar 헬퍼 (Record<string, unknown> 캐스팅)
  type PillarData = {
    stem?: { char?: string; korean?: string; element?: string; yinYang?: string } | null;
    branch?: { char?: string; korean?: string; element?: string; yinYang?: string } | null;
    tenGodStem?: string;
    tenGodBranchMain?: string;
    twelveStage?: string;
    twelveUnsung?: string;
    twelveSinsal?: string;
  };
  const getPillar = (key: string): PillarData => {
    const p = pillars[key] as Record<string, unknown> | undefined;
    if (!p) return {};
    return {
      stem: p.stem as PillarData["stem"],
      branch: p.branch as PillarData["branch"],
      tenGodStem: p.tenGodStem as string | undefined,
      tenGodBranchMain: p.tenGodBranchMain as string | undefined,
      twelveStage: p.twelveStage as string | undefined,
      twelveUnsung: p.twelveUnsung as string | undefined,
      twelveSinsal: p.twelveSinsal as string | undefined,
    };
  };

  // 대운/연운/월운 스크롤 위치 설정
  useEffect(() => {
    const daeunData = (sajuData as Record<string, unknown>)?.daeun as Record<string, unknown>;
    const luckCyclesData = (sajuData as Record<string, unknown>)?.luckCycles as Record<string, unknown>;
    const daeunFromLuckCycles = luckCyclesData?.daeun as Record<string, unknown>;
    const direction = daeunData?.direction || daeunFromLuckCycles?.direction || "";
    const isReverse = direction === "역행";

    const birthYear = data?.input?.date ? parseInt(data.input.date.split("-")[0]) : 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentAge = birthYear ? currentYear - birthYear + 1 : 0;

    const daeunList = (daeunData?.list || daeunFromLuckCycles?.list || []) as Array<{
      startAge: number; endAge: number; ganZhi?: string;
    }>;
    const filteredDaeunList = daeunList.filter((d) => d.ganZhi);
    const displayList = isReverse ? [...filteredDaeunList].reverse() : filteredDaeunList;

    if (daeunScrollRef.current) {
      const currentIdx = displayList.findIndex((d) => currentAge >= d.startAge && currentAge <= d.endAge);
      if (currentIdx !== -1) {
        const cardWidth = 68;
        const containerWidth = daeunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(0, currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2);
        daeunScrollRef.current.scrollLeft = scrollPosition;
      }
    }

    if (yeonunScrollRef.current) {
      const yeonunList = (luckCyclesData?.yeonun as Array<Record<string, unknown>>) || [];
      const displayYeonun = isReverse ? [...yeonunList].reverse() : yeonunList;
      const currentIdx = displayYeonun.findIndex((yn) => (yn.year as number) === currentYear);
      if (currentIdx !== -1) {
        const cardWidth = 68;
        const containerWidth = yeonunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(0, currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2);
        yeonunScrollRef.current.scrollLeft = scrollPosition;
      }
    }

    if (wolunScrollRef.current) {
      const wolunList = (luckCyclesData?.wolun as Array<Record<string, unknown>>) || [];
      const displayWolun = isReverse ? [...wolunList].reverse() : wolunList;
      const currentIdx = displayWolun.findIndex((wn) => (wn.month as number) === currentMonth);
      if (currentIdx !== -1) {
        const cardWidth = 50;
        const containerWidth = wolunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(0, currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2);
        wolunScrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [data, sajuData]);

  return (
    <div className={`${styles.report_card} ${styles.intro_card} ${styles.saju_card_simple}`}>
      {/* 장면 1: 장 오프닝 */}
      <div className={`${styles.intro_section} ${styles.intro_welcome} ${styles.compact}`}>
        <p className={styles.welcome_sub}>사주 원국</p>
        <p className={styles.welcome_main}>{userName}님의 사주</p>
        <p className={styles.welcome_text}>
          {userName}님의 사주에는 어떤 글자들이 있을까요?
          <br />
          지금부터 하나씩 살펴보겠습니다.
        </p>
      </div>

      {/* 장면 2: 사주원국표 */}
      <div className={styles.intro_section}>
        {/* 기본 정보 */}
        <div className={styles.saju_info_header}>
          <span className={styles.saju_info_name}>{userName}님의 사주</span>
          <span className={styles.saju_info_date}>
            {input?.date}
            {birthTime ? ` | ${birthTime}` : ""}
          </span>
        </div>

        {/* 사주 원국표 */}
        <div className={styles.saju_table_card}>
          <table className={styles.saju_full_table}>
            <thead>
              <tr>
                <th></th>
                <th>時</th>
                <th>日</th>
                <th>月</th>
                <th>年</th>
              </tr>
            </thead>
            <tbody>
              {/* 십성 (천간) */}
              <tr className={styles.row_sipsung_top}>
                <td className={styles.row_label}>십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <span className={styles.sipsung_text}>
                        {p.tenGodStem || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 천간 */}
              <tr className={styles.row_cheongan}>
                <td className={styles.row_label}>천간</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p.stem?.element) }}
                        >
                          {p.stem?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
                          {p.stem?.korean || ""}
                          {p.stem?.element
                            ? getElementKorean(p.stem.element, p.stem.yinYang)
                            : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr className={styles.row_jiji}>
                <td className={styles.row_label}>지지</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p.branch?.element) }}
                        >
                          {p.branch?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
                          {p.branch?.korean || ""}
                          {p.branch?.element
                            ? getElementKorean(p.branch.element, p.branch.yinYang)
                            : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (지지) */}
              <tr className={styles.row_sipsung_bottom}>
                <td className={styles.row_label}>십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <span className={styles.sipsung_text}>
                        {p.tenGodBranchMain || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십이운성 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>십이운성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  const twelveStage = p.twelveStage || p.twelveUnsung;
                  const displayValue =
                    typeof twelveStage === "string"
                      ? twelveStage
                      : (twelveStage as unknown as { display?: string })?.display || "—";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 12신살 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>12신살</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = getPillar(key);
                  const isDay = key === "day";
                  const twelveSinsal = p.twelveSinsal;
                  const displayValue =
                    typeof twelveSinsal === "string"
                      ? twelveSinsal
                      : (twelveSinsal as unknown as { display?: string })?.display || "—";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 신살 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>신살</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const isDay = key === "day";
                  const byPillar = (sajuData?.sinsal as Record<string, unknown>)?._byPillar as Record<string, { stem: string[]; branch: string[] }> | undefined;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  const allSinsal = [...stemSinsal, ...branchSinsal].filter(
                    (s) => !s.includes("귀인")
                  );
                  const highlightSinsal = ["역마살", "화개살", "양인살"];
                  return (
                    <td
                      key={key}
                      className={`${styles.cell_sinsal} ${isDay ? styles.highlight : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className={styles.sinsal_vertical}>
                          {allSinsal.map((s, i) => (
                            <span
                              key={i}
                              className={
                                highlightSinsal.some((hs) => s.includes(hs))
                                  ? "sinsal_highlight"
                                  : ""
                              }
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 귀인 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>귀인</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const isDay = key === "day";
                  const byPillar = (sajuData?.sinsal as Record<string, unknown>)?._byPillar as Record<string, { stem: string[]; branch: string[] }> | undefined;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  const allSinsal = [...stemSinsal, ...branchSinsal].filter(
                    (s) => s.includes("귀인")
                  );
                  return (
                    <td
                      key={key}
                      className={`${styles.cell_gilsung} ${isDay ? styles.highlight : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className={styles.gilsung_vertical}>
                          {allSinsal.map((s, i) => (
                            <span key={i}>{s}</span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 사주원국 설명 */}
        <div className={styles.intro_section_content} style={{ marginTop: "16px" }}>
          <p style={{ textAlign: "center" }}>
            처음 보면 무슨 말인지 잘 모르시겠죠?
            <br />
            당연해요, 괜찮습니다!
          </p>
          <p style={{ textAlign: "center", marginTop: "12px" }}>
            지금부터 <strong>사주원국</strong>이 뭔지,
            <br />
            이 글자들이 어떤 의미를 담고 있는지
            <br />
            차근차근 알려드리겠습니다.
          </p>
        </div>

        <div className={styles.saju_explain_card}>
          <p className={styles.saju_explain_title}>사주원국이란?</p>
          <p className={styles.saju_explain_text}>
            {userName}님의 생년월일시에 해당하는 하늘과 땅의 글자를 십성,
            십이운성, 살 등과 함께 적은 표입니다.
          </p>
        </div>
      </div>

      {/* 장면 3: 천간/지지 분리 설명 */}
      <div className={styles.intro_section}>
        <div className={styles.intro_section_content}>
          <p>
            생년월일시를 가지고 역학달력에 따라 <strong>사주(四柱)</strong>를
            적습니다.
          </p>
          <p>
            각각의 기둥을 위 아래로 나누면, 하늘의 기운을 담은{" "}
            <strong>천간</strong>과 땅의 기운을 담은 <strong>지지</strong>가
            됩니다.
          </p>
        </div>

        <div className={styles.saju_split_table}>
          <div className={styles.split_row}>
            <span className={styles.split_label}>
              천간
              <br />
              (天干)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = getPillar(key);
              return (
                <div key={key} className={styles.split_cell}>
                  <span
                    className={styles.split_hanja}
                    style={{ color: getColor(p.stem?.element) }}
                  >
                    {p.stem?.char || "—"}
                  </span>
                  <span className={styles.split_korean}>{p.stem?.korean || ""}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.split_row}>
            <span className={styles.split_label}>
              지지
              <br />
              (地支)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = getPillar(key);
              return (
                <div key={key} className={styles.split_cell}>
                  <span
                    className={styles.split_hanja}
                    style={{ color: getColor(p.branch?.element) }}
                  >
                    {p.branch?.char || "—"}
                  </span>
                  <span className={styles.split_korean}>
                    {p.branch?.korean || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 각 요소 의미 설명 (일반 사주용) */}
        <div className={styles.saju_elements_meaning}>
          <p className={styles.elements_meaning_title}>
            각 요소가 의미하는 것
          </p>
          <div className={styles.element_meaning_list}>
            <div className={styles.element_meaning_item}>
              <strong>천간(天干)</strong>
              <p>
                겉으로 드러나는 성격과 행동 양식. 사회에서 보여지는 나의
                모습입니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>지지(地支)</strong>
              <p>
                내면의 본능과 잠재력. 무의식적인 성향과 실제로 추구하는
                가치가 담겨 있습니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십성(十星)</strong>
              <p>
                나와 다른 글자의 관계. 직업, 재물, 인간관계의 패턴을
                알 수 있습니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십이운성(十二運星)</strong>
              <p>
                에너지의 강약. 각 기둥에서 나의 힘이 어떤 단계에 있는지
                나타냅니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>12신살</strong>
              <p>
                특별한 기운이나 사건의 징조. 삶에 영향을 미치는 특수한
                에너지입니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>신살(神殺)</strong>
              <p>
                길흉을 나타내는 특별한 기운. 역마살, 화개살 등 삶의 특징을
                보여줍니다.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>귀인(貴人)</strong>
              <p>
                나를 도와주는 좋은 기운. 어려울 때 도움을 받을 수 있는
                복된 에너지입니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 장면 5: 일간 강조 */}
      <div className={styles.intro_section}>
        {/* 운학선인 대화 - 일간 설명 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            그리고 일주의 천간, 즉 &apos;일간&apos;은
            <br />
            {userName}님 자신을 나타내는 글자입니다.
            <br />
            <br />
            사주를 해석할 때 가장 중심이 되는 부분이에요.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>일간(日干)</h3>
        <p className={styles.intro_section_subtitle}>일주 천간 = 나를 대표하는 글자</p>

        <div className={styles.ilgan_simple_display}>
          <span
            className={styles.ilgan_char}
            style={{ color: getColor(dayMaster?.element) }}
          >
            {dayMaster?.char}
          </span>
          <span className={styles.ilgan_label}>{dayMaster?.title}</span>
        </div>

        <div className={styles.intro_section_content}>
          {dmData && (
            <div className={styles.ilgan_love_box}>
              <p className={styles.ilgan_headline}>{dmData.headline}</p>
              <p className={styles.ilgan_summary}>{dmData.summary}</p>
              <div className={styles.ilgan_keywords}>
                {dmData.keywords.map((kw, i) => (
                  <span key={i} className={styles.ilgan_keyword}>
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 장면 7: 각 기둥별 의미 해석 */}
      <div className={styles.intro_section}>
        {/* 운학선인 대화 - 기둥별 관계 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            그럼 이제 각 기둥이 어떤 의미를 갖는지 볼까요?
            <br />
            기둥마다 나타내는 영역이 다릅니다.
          </p>
        </div>

        <div className={styles.pillar_timing_cards}>
          <div className={styles.timing_card}>
            {/* 미니 사주표 - 년주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = getPillar(key);
                const isHighlight = key === "year";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{ color: isHighlight ? getColor(p.stem?.element) : undefined }}
                    >
                      {p.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{ color: isHighlight ? getColor(p.branch?.element) : undefined }}
                    >
                      {p.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>년주(年柱)</span>
              <span className={styles.timing_period}>뿌리 · 조상, 부모</span>
            </div>
            <p className={styles.timing_desc}>
              나의 뿌리, 조상과 부모님, 그리고 사회적 배경을 나타냅니다.
            </p>
            <p className={styles.timing_love}>
              삶에서는: 가문, 초년운(1~20세), 사회적 기반
            </p>
          </div>

          <div className={styles.timing_card}>
            {/* 미니 사주표 - 월주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = getPillar(key);
                const isHighlight = key === "month";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{ color: isHighlight ? getColor(p.stem?.element) : undefined }}
                    >
                      {p.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{ color: isHighlight ? getColor(p.branch?.element) : undefined }}
                    >
                      {p.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>월주(月柱)</span>
              <span className={styles.timing_period}>줄기 · 형제, 사회</span>
            </div>
            <p className={styles.timing_desc}>
              나의 줄기, 부모님과 형제, 그리고 사회생활을 나타냅니다.
            </p>
            <p className={styles.timing_love}>
              삶에서는: 직업운, 청년기(20~40세), 사회적 역할
            </p>
          </div>

          <div className={`${styles.timing_card} ${styles.highlight}`}>
            {/* 미니 사주표 - 일주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = getPillar(key);
                const isHighlight = key === "day";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{ color: isHighlight ? getColor(p.stem?.element) : undefined }}
                    >
                      {p.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{ color: isHighlight ? getColor(p.branch?.element) : undefined }}
                    >
                      {p.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>일주(日柱)</span>
              <span className={styles.timing_period}>꽃 · 나, 배우자</span>
            </div>
            <p className={styles.timing_desc}>
              나의 꽃, 나 자신과 배우자를 나타내는 가장 중요한 자리입니다.
            </p>
            <p className={styles.timing_love}>
              삶에서는: 가장 중요! 나의 본질, 중년기(40~60세), 배우자와의 관계
            </p>
          </div>

          <div className={styles.timing_card}>
            {/* 미니 사주표 - 시주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = getPillar(key);
                const isHighlight = key === "hour";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{ color: isHighlight ? getColor(p.stem?.element) : undefined }}
                    >
                      {p.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{ color: isHighlight ? getColor(p.branch?.element) : undefined }}
                    >
                      {p.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>시주(時柱)</span>
              <span className={styles.timing_period}>열매 · 자녀, 결실</span>
            </div>
            <p className={styles.timing_desc}>
              나의 열매, 자녀와 말년의 결실을 나타냅니다.
            </p>
            <p className={styles.timing_love}>
              삶에서는: 자녀운, 말년운(60세 이후), 인생의 결실
            </p>
          </div>
        </div>
      </div>

      {/* 장면 8: 오행 */}
      <div className={styles.intro_section}>
        {/* 운학선인 대화 - 오행 설명 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            기둥마다 색이 다르죠?
            <br />
            이것이 목·화·토·금·수, 오행입니다.
            <br />
            <br />
            오행의 균형이 삶의 조화를 결정합니다.
            <br />
            상생하면 조화, 상극하면 갈등이에요.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>{userName}님의 오행</h3>

        {/* 오행비율 막대그래프 */}
        {Object.keys(elementPercent).length > 0 && (
          <div className={styles.ohang_chart_card}>
            <p className={styles.ohang_chart_title}>나의 오행 비율</p>
            {[
              { key: "wood", label: "목(木)", color: "#2aa86c" },
              { key: "fire", label: "화(火)", color: "#ff6a6a" },
              { key: "earth", label: "토(土)", color: "#caa46a" },
              { key: "metal", label: "금(金)", color: "#a0a0a0" },
              { key: "water", label: "수(水)", color: "#4a90d9" },
            ].map(({ key, label, color }) => {
              const pct = elementPercent[key] || 0;
              const status =
                pct >= 30
                  ? "과다"
                  : pct >= 10
                    ? "적정"
                    : pct > 0
                      ? "부족"
                      : "결핍";
              return (
                <div key={key} className={styles.ohang_bar_row}>
                  <span className={styles.ohang_label} style={{ color }}>
                    {label}
                  </span>
                  <div className={styles.ohang_bar_track}>
                    <div
                      className={styles.ohang_bar_fill}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className={styles.ohang_pct}>{pct.toFixed(1)}%</span>
                  <span className={`${styles.ohang_status} ${styles[status]}`}>{status}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 나의 오행 분석 */}
        <div className={styles.ohang_analysis_section}>
          <p className={styles.ohang_section_title}>{userName}님의 오행 분석</p>
          {[
            {
              key: "wood",
              label: "목(木)",
              color: "#2aa86c",
              keyword: "성장 · 진취 · 인(仁)",
              baseDesc:
                "성장과 발전의 기운입니다. 창의력, 계획성, 진취적 기상을 나타냅니다.",
              overTitle: "과도한 진취성",
              overDesc:
                "새로운 일을 벌이기 좋아하지만 마무리가 약할 수 있습니다. 고집이 세고 자기주장이 강할 수 있어요.",
              overAdvice:
                "한 가지에 집중하는 연습이 필요합니다. 금(金)의 기운(절제, 규율)으로 보완하면 좋습니다.",
              lackTitle: "소극적인 추진력",
              lackDesc:
                "새로운 시작이 두렵고 계획을 실행에 옮기기 어렵습니다. 변화보다 현상 유지를 선호해요.",
              lackAdvice:
                "용기를 내어 도전해보세요. 작은 목표부터 실행하면 자신감이 붙습니다.",
            },
            {
              key: "fire",
              label: "화(火)",
              color: "#ff6a6a",
              keyword: "열정 · 표현 · 예(禮)",
              baseDesc:
                "열정과 표현의 기운입니다. 예의, 밝음, 적극적 행동력을 나타냅니다.",
              overTitle: "과도한 열정",
              overDesc:
                "열정적이지만 급하고 감정 기복이 클 수 있습니다. 한 번에 올인하다 쉽게 번아웃될 수 있어요.",
              overAdvice:
                "감정 조절이 필요합니다. 수(水)의 기운(침착, 지혜)으로 열기를 식히면 좋습니다.",
              lackTitle: "표현력 부족",
              lackDesc:
                "열정이 부족하고 의욕이 떨어질 수 있습니다. 사회활동이나 대인관계에서 소극적이 되기 쉬워요.",
              lackAdvice:
                "작은 것부터 표현하는 연습을 해보세요. 밝은 에너지를 주는 활동을 찾아보세요.",
            },
            {
              key: "earth",
              label: "토(土)",
              color: "#caa46a",
              keyword: "안정 · 신뢰 · 신(信)",
              baseDesc:
                "안정과 중재의 기운입니다. 신뢰, 포용력, 중심을 잡아주는 역할을 합니다.",
              overTitle: "과도한 보수성",
              overDesc:
                "안정을 추구하지만 변화를 두려워하고 고집이 셀 수 있습니다. 새로운 기회를 놓칠 수 있어요.",
              overAdvice:
                "유연함이 필요합니다. 목(木)의 기운(변화, 성장)으로 답답함을 뚫어보세요.",
              lackTitle: "불안정한 중심",
              lackDesc:
                "중심이 없고 쉽게 흔들립니다. 한 곳에 정착하기 어렵고 약속을 지키기 힘들 수 있어요.",
              lackAdvice:
                "규칙적인 생활 습관을 만들어보세요. 안정적인 환경이 도움이 됩니다.",
            },
            {
              key: "metal",
              label: "금(金)",
              color: "#a0a0a0",
              keyword: "결단 · 의리 · 의(義)",
              baseDesc: "결단과 정의의 기운입니다. 의리, 원칙, 깔끔한 판단력을 나타냅니다.",
              overTitle: "과도한 원칙주의",
              overDesc:
                "원칙적이지만 너무 깐깐하고 비판적일 수 있습니다. 남에게 냉정하다는 인상을 줄 수 있어요.",
              overAdvice:
                "따뜻함이 필요합니다. 화(火)의 기운(열정, 따뜻함)으로 보완하면 좋습니다.",
              lackTitle: "우유부단함",
              lackDesc:
                "결단력이 부족하고 정리를 잘 못합니다. 이것저것 끌려다니기 쉬워요.",
              lackAdvice:
                "작은 결정부터 연습하세요. 명확한 기준을 세우는 것이 중요합니다.",
            },
            {
              key: "water",
              label: "수(水)",
              color: "#4a90d9",
              keyword: "지혜 · 소통 · 지(智)",
              baseDesc:
                "지혜와 소통의 기운입니다. 유연함, 적응력, 깊은 사고력을 나타냅니다.",
              overTitle: "과도한 생각",
              overDesc:
                "생각이 많고 걱정이 많을 수 있습니다. 우유부단하고 실행력이 부족할 수 있어요.",
              overAdvice:
                "행동으로 옮기는 연습이 필요합니다. 토(土)의 기운(실행, 안정)으로 중심을 잡으세요.",
              lackTitle: "소통 부족",
              lackDesc:
                "융통성이 부족하고 변화에 둔합니다. 상황 판단이 느릴 수 있어요.",
              lackAdvice:
                "다양한 사람을 만나고 경험을 넓혀보세요. 유연한 사고를 기르는 것이 중요합니다.",
            },
          ].map(
            ({
              key,
              label,
              color,
              keyword,
              baseDesc,
              overTitle,
              overDesc,
              overAdvice,
              lackTitle,
              lackDesc,
              lackAdvice,
            }) => {
              const pct = elementPercent[key] || 0;
              const status =
                pct >= 30
                  ? "과다"
                  : pct >= 10
                    ? "적정"
                    : pct > 0
                      ? "부족"
                      : "결핍";
              const isOver = status === "과다";
              const isNormal = status === "적정";
              return (
                <div key={key} className={styles.ohang_analysis_card}>
                  <div className={styles.ohang_analysis_header}>
                    <span className={styles.ohang_element} style={{ color }}>
                      {label}
                    </span>
                    <span className={styles.ohang_keyword}>{keyword}</span>
                  </div>
                  <p className={styles.ohang_base_desc}>{baseDesc}</p>
                  {!isNormal && (
                    <>
                      <p className={styles.ohang_analysis_title}>
                        <span className={`${styles.ohang_status_badge} ${styles[status]}`}>
                          {isOver
                            ? "과다"
                            : status === "결핍"
                              ? "결핍"
                              : "부족"}
                        </span>
                        {isOver ? overTitle : lackTitle}
                      </p>
                      <p className={styles.ohang_analysis_desc}>
                        {isOver ? overDesc : lackDesc}
                      </p>
                      <p className={styles.ohang_analysis_advice}>
                        {isOver ? overAdvice : lackAdvice}
                      </p>
                    </>
                  )}
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* 장면 9: 신강신약 */}
      <div className={styles.intro_section}>
        {/* 운학선인 대화 - 신강신약 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            마지막으로, {userName}님의 에너지가
            <br />
            강한지 약한지도 살펴보겠습니다.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>신강신약</h3>
        <p className={styles.intro_section_subtitle}>일간 에너지의 강약</p>

        <div className={styles.intro_section_content}>
          <p>
            신강/신약은 일간의 힘이 얼마나 강한지를 나타냅니다. 삶에서{" "}
            <strong>주체성과 추진력</strong>에 영향을 줍니다.
          </p>
        </div>

        <div className={styles.strength_gauge_card}>
          <div className={styles.gauge_labels}>
            {["극신약", "태약", "신약", "중화", "신강", "태강", "극신강"].map(
              (level) => (
                <span
                  key={level}
                  className={level === strengthLevel ? "active" : ""}
                >
                  {level}
                </span>
              )
            )}
          </div>
          <div className={styles.gauge_track}>
            {["극신약", "태약", "신약", "중화", "신강", "태강", "극신강"].map(
              (level) => (
                <div
                  key={level}
                  className={`${styles.gauge_dot} ${level === strengthLevel ? styles.active : ""}`}
                />
              )
            )}
          </div>
          <p className={styles.strength_result_text}>
            일간{" "}
            <strong style={{ color: getColor(dayMaster?.element) }}>
              {dayMaster?.char}
            </strong>
            , <strong>{strengthLevel}</strong>
          </p>
        </div>

        {/* 상세 해석 카드 */}
        <div className={styles.strength_detail_card}>
          <p className={styles.strength_detail_title}>{strengthData.title}</p>
          <p className={styles.strength_detail_ratio}>{strengthData.mainRatio}</p>

          <table className={styles.strength_detail_table}>
            <tbody>
              <tr>
                <th>주요 특징</th>
                <td>{strengthData.traits.join(", ")}</td>
              </tr>
              <tr>
                <th>행동 패턴</th>
                <td>
                  {strengthData.pattern.map((p, i) => (
                    <span key={i} className={styles.pattern_quote}>
                      {p}
                    </span>
                  ))}
                </td>
              </tr>
              {strengthData.goodPoints.length > 0 && (
                <tr className={styles.good_row}>
                  <th>장점</th>
                  <td>{strengthData.goodPoints.join(", ")}</td>
                </tr>
              )}
              {strengthData.warning.length > 0 && (
                <tr className={styles.warning_row}>
                  <th>주의할 점</th>
                  <td>{strengthData.warning.join(", ")}</td>
                </tr>
              )}
              <tr className={styles.ideal_row}>
                <th>조언</th>
                <td>{strengthData.advice}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 장면 10: 마무리 전환 */}
      <div className={`${styles.intro_section} ${styles.saju_outro_section}`}>
        {/* 사주 원국 마무리 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            여기까지가 {userName}님의 기본 사주 원국입니다.
            <br />
            <br />
            하지만 제대로 된 분석을 위해선
            <br />더 많은 요소들을 함께 봐야 합니다.
          </p>
        </div>

        {/* 대운/연운/월운 상세 표시 */}
        <div className={styles.luck_cycles_wrap}>
          {(() => {
            const daeunData = (sajuData as Record<string, unknown>)?.daeun as Record<string, unknown>;
            const luckCyclesData = (sajuData as Record<string, unknown>)?.luckCycles as Record<string, unknown>;
            const daeunFromLuckCycles = luckCyclesData?.daeun as Record<string, unknown>;
            const direction = daeunData?.direction || daeunFromLuckCycles?.direction || "";
            const isReverse = direction === "역행";

            const birthYear = data?.input?.date ? parseInt(data.input.date.split("-")[0]) : 0;
            const currentYear = new Date().getFullYear();
            const currentAge = birthYear ? currentYear - birthYear + 1 : 0;

            const daeunList = (daeunData?.list || daeunFromLuckCycles?.list || []) as Array<{
              index?: number; startAge: number; endAge: number; ganZhi?: string; ganZhiKor?: string;
            }>;
            const currentDaeun = daeunList.find((d) => currentAge >= d.startAge && currentAge <= d.endAge);

            return (
              <>
                {/* 대운 */}
                <div className={styles.luck_section}>
                  <h5 className={styles.luck_section_title}>대운</h5>
                  <div className={styles.luck_scroll_wrap} ref={daeunScrollRef}>
                    <div className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}>
                      {(isReverse ? [...daeunList].reverse() : daeunList)
                        .filter((dy) => dy.ganZhi)
                        .map((dy, idx) => {
                          const ganZhi = dy.ganZhi || "";
                          const stem = ganZhi[0] || "";
                          const branch = ganZhi[1] || "";
                          const stemElement = getStemElement(stem);
                          const branchElement = getBranchElement(branch);
                          const daeunItem = (
                            daeunFromLuckCycles?.list as Array<Record<string, unknown>>
                          )?.[isReverse ? daeunList.length - 1 - idx : idx];
                          const tenGodStem = (daeunItem?.tenGodStem as string) || "";
                          const twelveStage = (daeunItem?.twelveStage as string) || "";
                          const isCurrentDaeun = dy === currentDaeun;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card} ${isCurrentDaeun ? styles.current : ""}`}
                            >
                              <div className={styles.luck_card_top}>
                                <span className={styles.luck_card_age}>{dy.startAge}</span>
                                <span className={styles.luck_card_tengod}>{tenGodStem || "-"}</span>
                              </div>
                              <div className={`${styles.luck_card_stem} ${styles["elem_" + stemElement]}`}>
                                <span className={styles.char_hanja}>{stem}</span>
                                <span className={styles.char_korean}>{getStemKorean(stem)}</span>
                              </div>
                              <div className={`${styles.luck_card_branch} ${styles["elem_" + branchElement]}`}>
                                <span className={styles.char_hanja}>{branch}</span>
                                <span className={styles.char_korean}>{getBranchKorean(branch)}</span>
                              </div>
                              <div className={styles.luck_card_bottom}>
                                <span className={styles.luck_card_tengod_branch}>
                                  {(daeunItem?.tenGodBranch as string) || "-"}
                                </span>
                                <span className={styles.luck_card_stage}>{twelveStage || "-"}</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* 연운 */}
                {luckCyclesData?.yeonun && (
                  <div className={styles.luck_section}>
                    <h5 className={styles.luck_section_title}>연운</h5>
                    <div className={styles.luck_scroll_wrap} ref={yeonunScrollRef}>
                      <div className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}>
                        {(isReverse
                          ? [...(luckCyclesData.yeonun as Array<Record<string, unknown>>)].reverse()
                          : (luckCyclesData.yeonun as Array<Record<string, unknown>>)
                        ).map((yn, idx) => {
                          const ganZhi = (yn.ganZhi as string) || "";
                          const stem = ganZhi[0] || "";
                          const branch = ganZhi[1] || "";
                          const stemElement = getStemElement(stem);
                          const branchElement = getBranchElement(branch);
                          const isCurrentYear = yn.year === currentYear;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card} ${isCurrentYear ? styles.current : ""}`}
                            >
                              <div className={styles.luck_card_top}>
                                <span className={styles.luck_card_year}>{String(yn.year)}</span>
                                <span className={styles.luck_card_tengod}>
                                  {(yn.tenGodStem as string) || "-"}
                                </span>
                              </div>
                              <div className={`${styles.luck_card_stem} ${styles["elem_" + stemElement]}`}>
                                <span className={styles.char_hanja}>{stem}</span>
                                <span className={styles.char_korean}>{getStemKorean(stem)}</span>
                              </div>
                              <div className={`${styles.luck_card_branch} ${styles["elem_" + branchElement]}`}>
                                <span className={styles.char_hanja}>{branch}</span>
                                <span className={styles.char_korean}>{getBranchKorean(branch)}</span>
                              </div>
                              <div className={styles.luck_card_bottom}>
                                <span className={styles.luck_card_tengod_branch}>
                                  {(yn.tenGodBranch as string) || "-"}
                                </span>
                                <span className={styles.luck_card_stage}>
                                  {(yn.twelveStage as string) || "-"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 월운 */}
                {luckCyclesData?.wolun && (
                  <div className={styles.luck_section}>
                    <h5 className={styles.luck_section_title}>월운</h5>
                    <div className={styles.luck_scroll_wrap} ref={wolunScrollRef}>
                      <div className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}>
                        {(isReverse
                          ? [...(luckCyclesData.wolun as Array<Record<string, unknown>>)].reverse()
                          : (luckCyclesData.wolun as Array<Record<string, unknown>>)
                        ).map((wn, idx) => {
                          const currentMonth = new Date().getMonth() + 1;
                          const isCurrentMonth = wn.month === currentMonth;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card_mini} ${isCurrentMonth ? styles.current : ""}`}
                            >
                              <span className={styles.luck_mini_month}>{String(wn.month)}월</span>
                              <span className={styles.luck_mini_tengod}>
                                {(wn.tenGodStem as string) || "-"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 추가 정보 미니 섹션 */}
                <div className={styles.extra_info_mini}>
                  {/* 태원/명궁/신궁 */}
                  <div className={styles.extra_info_row}>
                    <span className={styles.extra_label}>태원/명궁/신궁</span>
                    <div className={styles.extra_values}>
                      <span className={styles.extra_ganzi}>
                        {String(
                          ((sajuData as Record<string, unknown>)?.taiYuan as Record<string, unknown>)?.ganZhi || "-"
                        )}
                      </span>
                      <span className={styles.extra_ganzi}>
                        {String(
                          ((sajuData as Record<string, unknown>)?.mingGong as Record<string, unknown>)?.ganZhi || "-"
                        )}
                      </span>
                      <span className={styles.extra_ganzi}>
                        {String(
                          ((sajuData as Record<string, unknown>)?.shenGong as Record<string, unknown>)?.ganZhi || "-"
                        )}
                      </span>
                    </div>
                    <span className={styles.extra_usage}>선천기질·운명</span>
                  </div>
                  {/* 득력 */}
                  <div className={styles.extra_info_row}>
                    <span className={styles.extra_label}>득력</span>
                    <div className={styles.extra_values}>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukryung ? styles.on : ""}`}
                      >
                        령
                      </span>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukji ? styles.on : ""}`}
                      >
                        지
                      </span>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukse ? styles.on : ""}`}
                      >
                        세
                      </span>
                    </div>
                    <span className={styles.extra_usage}>에너지 강약</span>
                  </div>
                  {/* 납음(일주) */}
                  {(() => {
                    const nayinData = (sajuData as Record<string, unknown>)?.nayin as Record<string, string> | undefined;
                    const dayNayin = nayinData?.day;
                    return dayNayin ? (
                      <div className={styles.extra_info_row}>
                        <span className={styles.extra_label}>납음(일주)</span>
                        <div className={styles.extra_values}>
                          <span className={styles.extra_text}>{dayNayin}</span>
                        </div>
                        <span className={styles.extra_usage}>깊은 기질</span>
                      </div>
                    ) : null;
                  })()}
                </div>
              </>
            );
          })()}
        </div>

        {/* 분석 기반 설명 - 마지막 강조 멘트 */}
        <div className={`${styles.nangja_comment} ${styles.nangja_final}`}>
          <p className={styles.nangja_text}>
            <span className={styles.nangja_question}>
              점점 사주가 어려워지지 않으셨나요?
            </span>
          </p>
          <p className={`${styles.nangja_text} ${styles.nangja_reassure}`}>
            걱정 마세요.
            <br />
            사주 전문가들과 함께 만들고 검증한
            <br />
            운학선인이 이 모든 것을 종합하여
            <br />
            <strong>{userName}님만의 종합 사주 보고서</strong>를 준비했습니다.
          </p>
        </div>
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
          {userName}님, 여기까지 긴 사주 풀이를 함께해주셔서 감사합니다.
        </p>
        <p>
          사주는 정해진 운명이 아니라, 삶의 흐름과 가능성을 보여주는 것이네.
          좋은 기운은 살리고, 약한 부분은 보완하며 살아가세요.
        </p>
        <p>
          앞으로의 삶에 늘 좋은 기운이 함께하시길 바랍니다.
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
    `${userName}님의 사주를 분석하고 있습니다`,
    "오행의 관계를 살피고 있습니다",
    "대운의 흐름을 읽고 있습니다",
    "십성과 신살을 확인하고 있습니다",
    "곧 분석이 완료됩니다",
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
