"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  trackPageView,
  trackPaymentModalOpen,
  trackPaymentModalClose,
  trackPaymentAttempt,
  trackCouponApplied,
  trackPaymentSuccess,
} from "@/lib/mixpanel";
import { NewYearRecord } from "@/lib/db/newYearDB";
import {
  getSajuAnalysisByShareId,
  updateSajuAnalysis,
} from "@/lib/db/sajuAnalysisDB";
import styles from "./detail.module.css";

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
  price: 26900,
  originalPrice: 49800,
  orderName: "AI 2026 신년 운세 심층 분석",
};

// 일간별 신년운세 성향 데이터
const dayMasterData: Record<
  string,
  { headline: string; summary: string; keywords: string[] }
> = {
  甲: {
    headline: "뿌리 깊은 나무처럼 2026년을 든든히 맞이하는 당신",
    summary:
      "갑목일간은 곧은 소나무처럼 한결같은 성품을 가졌어요. 2026년에는 그 의연함이 빛을 발해 주변의 신뢰를 한층 더 얻게 됩니다.",
    keywords: ["리더십", "성장운", "신뢰"],
  },
  乙: {
    headline: "유연하게 변화에 적응하며 기회를 잡는 해",
    summary:
      "을목일간은 덩굴처럼 유연한 적응력을 지녔어요. 2026년에는 그 끈기가 새로운 기회를 만들어냅니다.",
    keywords: ["적응력", "기회운", "인내"],
  },
  丙: {
    headline: "태양처럼 빛나는 한 해, 주목받는 2026년",
    summary:
      "병화일간은 태양처럼 따뜻하고 밝은 에너지를 가졌어요. 2026년에는 그 존재감이 더욱 빛나게 됩니다.",
    keywords: ["명예운", "열정", "주목"],
  },
  丁: {
    headline: "은은한 촛불처럼 주변을 밝히는 한 해",
    summary:
      "정화일간은 촛불처럼 섬세하고 따뜻해요. 2026년에는 그 온기가 주변에 희망을 전합니다.",
    keywords: ["섬세함", "창조", "희망"],
  },
  戊: {
    headline: "큰 산처럼 흔들림 없이 목표를 향해 나아가는 해",
    summary:
      "무토일간은 큰 산처럼 넓은 포용력을 지녔어요. 2026년에는 안정적인 기반 위에서 성장합니다.",
    keywords: ["안정", "포용", "신뢰"],
  },
  己: {
    headline: "묵묵히 실속을 챙기며 결실을 맺는 한 해",
    summary:
      "기토일간은 농사짓는 땅처럼 실속을 중시해요. 2026년에는 꾸준한 노력이 결실을 맺습니다.",
    keywords: ["실속", "결실", "꾸준함"],
  },
  庚: {
    headline: "강철 같은 의지로 새로운 도전을 이끄는 해",
    summary:
      "경금일간은 강철처럼 강인한 의지를 가졌어요. 2026년에는 그 결단력이 큰 성과를 이끕니다.",
    keywords: ["결단력", "도전", "성과"],
  },
  辛: {
    headline: "보석처럼 빛나는 가치를 발견하는 한 해",
    summary:
      "신금일간은 보석처럼 섬세한 감각을 지녔어요. 2026년에는 자신의 진정한 가치를 발견합니다.",
    keywords: ["섬세함", "가치", "완벽"],
  },
  壬: {
    headline: "넓은 바다처럼 새로운 가능성을 품는 해",
    summary:
      "임수일간은 바다처럼 깊은 지혜를 가졌어요. 2026년에는 그 포용력이 새로운 기회를 열어줍니다.",
    keywords: ["지혜", "가능성", "포용"],
  },
  癸: {
    headline: "촉촉한 이슬처럼 마음을 정화하는 한 해",
    summary:
      "계수일간은 이슬처럼 섬세한 감성을 지녔어요. 2026년에는 그 감성이 창조적인 결과를 낳습니다.",
    keywords: ["감성", "창조", "정화"],
  },
};

// 일간별 운세 날씨 데이터
const weatherData: Record<
  string,
  { emoji: string; weather: string; abilityTitle: string; abilityDesc: string }
> = {
  甲: {
    emoji: "🌤️",
    weather: "묵혀둔 재능을 밖으로 꺼내야만 빛을 보는 해",
    abilityTitle: "숨겨진 포텐을 터트리는 올라운더",
    abilityDesc:
      "판이 깔렸으니 춤을 춘다.\n일도 놀이처럼 즐기니 결과물마저 예술이 된다.",
  },
  乙: {
    emoji: "🌅",
    weather: "가만히 있어도 세상의 시선이 나에게 꽂히는 해",
    abilityTitle: "시선을 훔치는 분위기 메이커",
    abilityDesc:
      "꽃이 만개하듯 매력이 절정에 달하니,\n나 자체가 걸어 다니는 브랜드가 된다.",
  },
  丙: {
    emoji: "☀️",
    weather: "누구의 눈치도 보지 않고 마음껏 질주하는 해",
    abilityTitle: "대체 불가능한 독보적 존재감",
    abilityDesc:
      "어딜 가나 자연스레 중심에 선다.\n행보가 곧 트렌드가 되는 압도적인 영향력을 발휘한다.",
  },
  丁: {
    emoji: "⚡",
    weather: "치열한 경쟁 속에서 결국 승기를 잡아채는 해",
    abilityTitle: "판세를 뒤집는 반전의 승부사",
    abilityDesc:
      "거대한 불길이 내 힘이 된다.\n위기를 기회로 바꾸는 탁월한 센스가 돋보인다.",
  },
  戊: {
    emoji: "🌄",
    weather: "나의 가치를 인정받고 우뚝 서는 해",
    abilityTitle: "깊이가 남다른 진짜 실력자",
    abilityDesc:
      "가벼운 유행에 휩쓸리지 않고,\n오랫동안 쌓아온 지식과 실력이 드디어 빛을 발한다.",
  },
  己: {
    emoji: "🌈",
    weather: "노력해온 것들이 확실한 몫으로 돌아오는 해",
    abilityTitle: "실패 없는 확신의 결과주의자",
    abilityDesc:
      "차곡차곡 쌓아온 안목이 비로소 빛을 발하니,\n누구도 부정할 수 없는 단단한 자산이 된다.",
  },
  庚: {
    emoji: "⛈️",
    weather: "뜨거운 담금질을 견디고 다시 태어나는 해",
    abilityTitle: "한계를 뛰어넘는 성장의 아이콘",
    abilityDesc:
      "힘들수록 더 불타오른다.\n압박감을 성과로 승화시키는 비범한 저력이 드러난다.",
  },
  辛: {
    emoji: "🌟",
    weather: "갈고 닦을수록 빛이 나고 이름값이 높아지는 해",
    abilityTitle: "가장 높은 곳에서 빛나는 주인공",
    abilityDesc:
      "조명 아래 보석처럼 빛난다.\n갈고 닦아 최상의 가치를 만드는 세련된 감각이 돋보인다.",
  },
  壬: {
    emoji: "🌊",
    weather: "판을 크게 벌려 거대한 기회의 파도에 올라타는 해",
    abilityTitle: "흐름을 읽는 감각적인 리더",
    abilityDesc:
      "큰 물에서 노니,\n넓은 시야로 기회를 포착하는 탁월한 직관이 발휘된다.",
  },
  癸: {
    emoji: "🌦️",
    weather: "남들은 모르는 알짜배기 실속을 쏙쏙 챙겨가는 해",
    abilityTitle: "티 안 나게 이득 보는 실속파",
    abilityDesc:
      "화려함 속에 감춰진 알맹이를 차지하니,\n영리하게 내 몫을 챙기는 현명함이 드러난다.",
  },
};

// 오행 색상
const elementColors: Record<string, string> = {
  木: "#2aa86c",
  wood: "#2aa86c",
  Wood: "#2aa86c",
  火: "#ff6a6a",
  fire: "#ff6a6a",
  Fire: "#ff6a6a",
  土: "#caa46a",
  earth: "#caa46a",
  Earth: "#caa46a",
  金: "#9a9a9a",
  metal: "#9a9a9a",
  Metal: "#9a9a9a",
  水: "#6aa7ff",
  water: "#6aa7ff",
  Water: "#6aa7ff",
};

// 오행 한글 변환 함수 (음양 포함)
const getElementKorean = (
  element: string | undefined,
  yinYang?: string,
): string => {
  if (!element) return "";
  const el = element.toLowerCase();
  const sign = yinYang?.toLowerCase() === "yang" ? "+" : "-";
  if (el === "fire" || element === "火") return `${sign}화`;
  if (el === "wood" || element === "木") return `${sign}목`;
  if (el === "water" || element === "水") return `${sign}수`;
  if (el === "metal" || element === "金") return `${sign}금`;
  if (el === "earth" || element === "土") return `${sign}토`;
  return "";
};

function NewYearDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [data, setData] = useState<NewYearRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 결제 관련 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const [influencerDiscountName, setInfluencerDiscountName] = useState("");
  const paymentWidgetRef = useRef<ReturnType<
    typeof window.PaymentWidget
  > | null>(null);
  const isApplyingCouponRef = useRef(false);

  // T/F 성향 선택
  const [personalityType, setPersonalityType] = useState<"T" | "F">("T");

  // 데이터 로드
  useEffect(() => {
    if (!resultId) {
      router.push("/new-year");
      return;
    }

    const loadData = async () => {
      const serverData = await getSajuAnalysisByShareId(resultId);
      if (!serverData) {
        router.push("/new-year");
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userInfo = serverData.user_info as any;
      const record: NewYearRecord = {
        id: serverData.id,
        createdAt: serverData.created_at || new Date().toISOString(),
        input: {
          userName: userInfo?.userName || "-",
          gender: userInfo?.gender || "male",
          date: userInfo?.date || "",
          calendar: (userInfo?.calendar as "solar" | "lunar") || "solar",
          time: userInfo?.time || null,
          jobStatus: userInfo?.jobStatus || "",
          relationshipStatus: userInfo?.relationshipStatus || "",
          wish2026: userInfo?.wish2026 || "",
        },
        rawSajuData: serverData.raw_saju_data as NewYearRecord["rawSajuData"],
        sajuData: serverData.raw_saju_data as NewYearRecord["sajuData"],
        analysis: serverData.analysis_result
          ? (serverData.analysis_result as NewYearRecord["analysis"])
          : null,
        paid: serverData.is_paid || false,
        paidAt: serverData.paid_at || undefined,
        seenIntro: false,
      };

      setData(record);
      setIsLoading(false);

      trackPageView("new_year_detail", {
        id: record.id,
        gender: record.input.gender,
        user_name: record.input.userName,
        birth_date: record.input.date,
        birth_time: record.input.time || "모름",
        job_status: record.input.jobStatus,
        relationship_status: record.input.relationshipStatus,
        day_master: record.sajuData.dayMaster?.char,
        day_master_title: record.sajuData.dayMaster?.title,
      });
    };

    loadData();
  }, [resultId, router]);

  // 시간 포맷
  const formatTimeToSi = (timeStr: string | null) => {
    if (!timeStr) return "";
    const timeMap: Record<string, string> = {
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
    return timeMap[timeStr] || "";
  };

  // 결제 모달 열기
  const openPaymentModal = useCallback(() => {
    if (!data) return;

    const paymentPrice = PAYMENT_CONFIG.price;

    trackPaymentModalOpen("new_year", {
      id: data.id,
      price: paymentPrice,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
    });

    setShowPaymentModal(true);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(
          PAYMENT_CONFIG.clientKey,
          customerKey,
        );
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#new-year-payment-method", {
          value: paymentPrice,
        });
        widget.renderAgreement("#new-year-agreement");
      }
    }, 100);
  }, [data]);

  // 인플루언서 링크 자동 할인 적용
  useEffect(() => {
    if (!showPaymentModal || !data || appliedCoupon) return;

    const applyInfluencerDiscount = async () => {
      try {
        const utmSource = localStorage.getItem("utm_source");
        if (!utmSource) return;

        const res = await fetch(`/api/influencer/discount?slug=${encodeURIComponent(utmSource)}&serviceType=new_year`);
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
          } catch (e) { console.error("무료 쿠폰 결제 처리 실패:", e); }
          try {
            await fetch("/api/coupon/use", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: result.discount_code, serviceType: "new_year" }),
            });
          } catch (e) { console.error("쿠폰 수량 차감 실패:", e); }
          router.push(`/new-year/result?id=${data.id}`);
        } else {
          setAppliedCoupon({ code: result.discount_code, discount });
          if (paymentWidgetRef.current) {
            const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
            paymentWidgetRef.current.renderPaymentMethods("#new-year-payment-method", { value: newPrice });
          }
        }
      } catch (err) {
        console.error("인플루언서 할인 적용 오류:", err);
      }
    };

    const timer = setTimeout(applyInfluencerDiscount, 200);
    return () => clearTimeout(timer);
  }, [showPaymentModal, data, appliedCoupon, router]);

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
        body: JSON.stringify({ code, serviceType: "new_year" }),
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
        // Supabase 결제 완료 처리
        try {
          await updateSajuAnalysis(data.id, {
            is_paid: true,
            paid_at: new Date().toISOString(),
            payment_info: {
              method: "coupon",
              price: 0,
              couponCode: code,
              isDiscount: true,
            },
          });
        } catch (e) {
          console.error("무료 쿠폰 결제 처리 실패:", e);
        }

        // 3. 결과 확정 후 쿠폰 수량 차감
        try {
          await fetch("/api/coupon/use", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, serviceType: "new_year" }),
          });
        } catch (e) {
          console.error("쿠폰 수량 차감 실패:", e);
        }

        trackCouponApplied("new_year", {
          coupon_code: code,
          discount: PAYMENT_CONFIG.price,
          is_free: true,
          final_price: 0,
        });
        trackPaymentSuccess("new_year", {
          id: data.id,
          price: 0,
          method: "coupon",
          coupon_code: code,
        });

        // 4. 결과 페이지로 이동
        router.push(`/new-year/result?id=${data.id}`);
        return;
      }

      // 할인 쿠폰
      setAppliedCoupon({ code, discount });

      if (paymentWidgetRef.current) {
        const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
        paymentWidgetRef.current.renderPaymentMethods(
          "#new-year-payment-method",
          {
            value: newPrice,
          },
        );
      }
    } catch (error) {
      console.error("쿠폰 검증 오류:", error);
      setCouponError("쿠폰 확인 중 오류가 발생했습니다");
    } finally {
      isApplyingCouponRef.current = false;
      setIsApplyingCoupon(false);
    }
  }, [data, couponCode, router]);

  // 결제 요청
  const handlePaymentRequest = useCallback(async () => {
    if (!paymentWidgetRef.current || !data) return;

    // T/F 성향 선택을 sessionStorage에 저장 (결제 리다이렉트 후 복원용)
    sessionStorage.setItem(`personalityType_${data.id}`, personalityType);

    const basePrice = PAYMENT_CONFIG.price;

    const finalPrice = appliedCoupon
      ? basePrice - appliedCoupon.discount
      : basePrice;

    trackPaymentAttempt("new_year", {
      id: data.id,
      price: finalPrice,
      is_discount: !!appliedCoupon,
      coupon_code: appliedCoupon?.code,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
    });

    try {
      const orderSuffix = appliedCoupon ? `-${appliedCoupon.code}` : "";
      const orderNameSuffix = appliedCoupon
        ? ` - ${appliedCoupon.code} 할인`
        : "";

      await paymentWidgetRef.current.requestPayment({
        orderId: `new-year${orderSuffix}_${Date.now()}`,
        orderName: `${PAYMENT_CONFIG.orderName}${orderNameSuffix}`,
        customerName: data.input.userName || "고객",
        successUrl: `${
          window.location.origin
        }/payment/success?type=new_year&id=${encodeURIComponent(data.id)}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
        failUrl: `${
          window.location.origin
        }/payment/fail?id=${encodeURIComponent(data.id)}&type=new_year`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  }, [data, appliedCoupon, personalityType]);

  // 결제 모달 닫기
  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;

    trackPaymentModalClose("new_year", {
      id: data?.id,
      reason: "user_close",
    });

    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
    setInfluencerDiscountName("");
  }, [data]);

  const getColor = (element: string | undefined) => {
    if (!element) return "#333";
    return (
      elementColors[element] || elementColors[element.toLowerCase()] || "#333"
    );
  };

  if (isLoading) {
    return (
      <div className={styles.main_body_wrap}>
        <div className={styles.loading_wrap}>
          <div className={styles.loading_spinner} />
          <div className={styles.loading_text}>분석 결과를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { input, sajuData } = data;
  const dayMaster = sajuData.dayMaster;
  const pillars = sajuData.pillars as Record<
    string,
    {
      stem?: {
        char?: string;
        korean?: string;
        element?: string;
        yinYang?: string;
      };
      branch?: {
        char?: string;
        korean?: string;
        element?: string;
        yinYang?: string;
      };
      tenGodStem?: string;
      tenGodBranchMain?: string;
    }
  >;
  const dmData = dayMasterData[dayMaster.char];
  const birthTime = formatTimeToSi(input.time);

  // 오행 한자 맵
  const elementHanjaMap: Record<string, string> = {
    wood: "木",
    fire: "火",
    earth: "土",
    metal: "金",
    water: "水",
  };
  const elementKey = dayMaster.element?.toLowerCase() || "";
  const elementHanja = elementKey ? elementHanjaMap[elementKey] || "" : "";

  return (
    <div className={styles.main_body_wrap}>
      {/* 뒤로가기 */}
      <button
        className={styles.back_btn}
        onClick={() => router.push("/new-year")}
      >
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>정보 다시 입력</span>
      </button>

      {/* 결과 컨텐츠 */}
      <div className={styles.result_wrap}>
        {/* 섹션 1: 상단 이미지 */}
        <section className={`${styles.detail_section} ${styles.section_1}`}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new-year/img/detail.png" alt="2026 신년 운세" />
          </div>
        </section>

        {/* 운세 날씨 카드 */}
        {weatherData[dayMaster.char] && (
          <section className={styles.weather_section}>
            <p className={styles.weather_label}>60년에 한번, 불기둥의 해</p>
            <h2 className={styles.weather_title}>2026년 병오년 운세 날씨</h2>

            <div className={styles.weather_quote_section}>
              <span className={styles.weather_quote_mark}>"</span>
              <div className={styles.weather_emoji}>
                {weatherData[dayMaster.char].emoji}
              </div>
              <p className={styles.weather_headline}>
                {weatherData[dayMaster.char].weather}
              </p>
              <span className={styles.weather_quote_mark_bottom}>"</span>
            </div>

            {/* 블러 처리된 미리보기 */}
            <div className={styles.blurred_preview}>
              <p>
                불의 기운이 강한 올 해는 당신의{" "}
                <span className={styles.blur_text}>
                  숨겨진 잠재력이 빛을 발하는 시기입니다. 특히 창의적인 분야에서
                  두각을 나타내며
                </span>
              </p>
            </div>
          </section>
        )}

        {/* detail2 이미지 */}
        <section className={styles.detail_section}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new-year/img/detail2.png" alt="2026 신년 운세 상세" />
          </div>
        </section>

        {/* 능력 카드 */}
        {weatherData[dayMaster.char] && (
          <section className={styles.ability_section}>
            <p className={styles.ability_label}>당신의 사주에 나타난,</p>
            <h2 className={styles.ability_title_main}>
              올해 돋보일 나만의 능력
            </h2>

            <div className={styles.ability_quote_section}>
              <span className={styles.ability_quote_mark}>"</span>
              <p className={styles.ability_headline}>
                {weatherData[dayMaster.char].abilityTitle
                  .split(" ")
                  .slice(0, -1)
                  .join(" ")}
                <br />
                <span className={styles.ability_highlight}>
                  {
                    weatherData[dayMaster.char].abilityTitle
                      .split(" ")
                      .slice(-1)[0]
                  }
                </span>
              </p>
              <span className={styles.ability_quote_mark_bottom}>"</span>
            </div>

            <p className={styles.ability_desc}>
              {weatherData[dayMaster.char].abilityDesc}
            </p>

            {/* 블러 처리된 미리보기 */}
            <div className={styles.blurred_preview}>
              <p>
                올해는 당신의 재능 중,{" "}
                <span className={styles.blur_text}>
                  특히 리더십과 소통 능력이 빛을 발하는 시기입니다. 팀을
                  이끌거나 새로운 프로젝트를 시작하기에
                </span>
              </p>
            </div>

            {/* 잠금 미리보기 박스 */}
            <div className={styles.locked_preview_box}>
              <div className={styles.lock_icon}>
                <span className="material-icons">lock</span>
              </div>
              <p className={styles.locked_title}>이런 내용을 알려드려요!</p>
              <ul className={styles.locked_list}>
                <li>
                  <span className={styles.bullet}>💙</span>
                  2026년 병오년과 내 사주의 오행 궁합 분석
                </li>
                <li>
                  <span className={styles.bullet}>💙</span>
                  올해 발현될 나의 역량, 일잘러 포인트
                </li>
                <li>
                  <span className={styles.bullet}>💙</span>
                  나에게 맞는 돈 버는 수단{" "}
                  <span className={styles.sub_text}>
                    (직장 vs 투자 vs 부업 vs 사업)
                  </span>
                </li>
                <li>
                  <span className={styles.bullet}>💙</span>
                  찾아올 수 있는 위기 vs 기회 키워드
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* detail3 이미지 */}
        <section className={styles.detail_section}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new-year/img/detail3.png" alt="2026 신년 운세 상세" />
          </div>
        </section>

        {/* 고민 유도 섹션 */}
        <div className={styles.hesitate_section}>
          <p className={styles.hesitate_question}>아직 고민하고 계신가요?</p>
          <div className={styles.hesitate_hint_box}>
            <p className={styles.hesitate_hint}>
              <strong>까치도령이 이미 2026년 운세를 분석하고 있어요!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className={styles.bottom_fixed_btn}>
        <button className={styles.analyze_btn} onClick={openPaymentModal}>
          내 신년 운세 분석 받기
        </button>
      </div>

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className={styles["payment-overlay"]} style={{ display: "flex" }}>
          <div className={styles["payment-fullscreen"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["payment-header"]}>
                <div className={styles["payment-title"]}>
                  까치도령 신년 운세 복채
                </div>
                <div
                  className={styles["payment-close"]}
                  onClick={closePaymentModal}
                >
                  ✕
                </div>
              </div>

              {/* 결제 금액 섹션 */}
              <div className={styles["payment-amount-section"]}>
                <h3 className={styles["payment-amount-title"]}>복채</h3>

                {/* 정가 */}
                <div className={styles["payment-row"]}>
                  <span className={styles["payment-row-label"]}>
                    까치도령 2026 신년 운세 보고서
                  </span>
                  <span className={styles["payment-row-value"]}>
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </span>
                </div>

                {/* 할인 */}
                <div className={`${styles["payment-row"]} ${styles.discount}`}>
                  <span className={styles["payment-row-label"]}>
                    병오년(丙午年) 3월 특가 할인
                  </span>
                  <span className={styles["discount-amount"]}>
                    -
                    {(
                      PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.price
                    ).toLocaleString()}
                    원
                  </span>
                </div>

                {/* 쿠폰 할인 */}
                {appliedCoupon && (
                  <div
                    className={`${styles["payment-row"]} ${styles.discount}`}
                  >
                    <span className={styles["payment-row-label"]}>
                      {influencerDiscountName ? `특별 추가 할인 (${influencerDiscountName})` : `${appliedCoupon.code} 쿠폰`}
                    </span>
                    <span className={styles["discount-amount"]}>
                      -{appliedCoupon.discount.toLocaleString()}원
                    </span>
                  </div>
                )}

                <div className={styles["payment-divider"]} />

                {/* 최종 금액 */}
                <div className={`${styles["payment-row"]} ${styles.final}`}>
                  <span className={styles["payment-row-label"]}>
                    최종 결제금액
                  </span>
                  <span className={styles["payment-row-final-value"]}>
                    {appliedCoupon
                      ? (
                          PAYMENT_CONFIG.price - appliedCoupon.discount
                        ).toLocaleString()
                      : PAYMENT_CONFIG.price.toLocaleString()}
                    원
                  </span>
                </div>
              </div>

              {/* 쿠폰 입력 */}
              <div className={styles["coupon-section"]}>
                <div className={styles["coupon-input-row"]}>
                  <input
                    type="text"
                    className={styles["coupon-input"]}
                    placeholder="쿠폰 코드 입력"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError("");
                    }}
                    disabled={!!appliedCoupon}
                  />
                  <button
                    className={styles["coupon-submit-btn"]}
                    onClick={handleCouponSubmit}
                    disabled={!!appliedCoupon || isApplyingCoupon}
                  >
                    {isApplyingCoupon
                      ? "확인 중..."
                      : appliedCoupon
                        ? "적용됨"
                        : "적용"}
                  </button>
                </div>
                {couponError && (
                  <div className={styles["coupon-error"]}>{couponError}</div>
                )}
              </div>

              <div style={{ padding: "0 20px" }}>
                <div
                  id="new-year-payment-method"
                  style={{ padding: 0, margin: 0 }}
                />
                <div id="new-year-agreement" />
              </div>
              {/* 직설 분석 선택 */}
              <div className={styles["spicy-section"]}>
                <label className={styles["spicy-label"]}>
                  <span className={styles["spicy-text"]}>
                    직설적으로 말해줘도 괜찮아요
                  </span>
                  <input
                    type="checkbox"
                    checked={personalityType === "T"}
                    onChange={(e) =>
                      setPersonalityType(e.target.checked ? "T" : "F")
                    }
                    className={styles["spicy-checkbox"]}
                  />
                  <span className={styles["spicy-toggle"]} />
                </label>
              </div>
              <button
                className={styles["payment-final-btn"]}
                onClick={handlePaymentRequest}
              >
                복채 결제하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewYearDetailPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.main_body_wrap}>
          <div className={styles.loading_wrap}>
            <div className={styles.loading_spinner} />
            <div className={styles.loading_text}>로딩 중...</div>
          </div>
        </div>
      }
    >
      <NewYearDetailContent />
    </Suspense>
  );
}
