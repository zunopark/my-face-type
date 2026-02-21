"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  trackPageView,
  trackPaymentModalOpen,
  trackPaymentModalClose,
  trackPaymentAttempt,
} from "@/lib/mixpanel";
import {
  getSajuLoveRecord,
  SajuLoveRecord,
  saveSajuLoveRecord,
} from "@/lib/db/sajuLoveDB";
import {
  getSajuAnalysisByShareId,
  createSajuAnalysis,
} from "@/lib/db/sajuAnalysisDB";
import styles from "./detail.module.css";

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
  price: 23900,
  discountPrice: 9900,
  originalPrice: 44800,
  studentPrice: 4900, // 학생 특별가
  orderName: "AI 연애 사주 심층 분석",
};

// 만 나이 계산 함수
const calculateAge = (birthDateStr: string): number => {
  const today = new Date();
  const birthDate = new Date(birthDateStr.replace(/-/g, "/"));
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
};

// 일간별 성향 데이터
const dayMasterData: Record<
  string,
  { headline: string; summary: string; appearance: string[] }
> = {
  甲: {
    headline: "단아함과 우아함이 돋보이는 청순 주인공 스타일",
    summary:
      "갑목일간은 기둥처럼 곧고 깨끗하고 맑은 이미지를 지녀 주변을 정화시키는 매력이 있어요. 묵묵히 뿌리를 내리고 자라는 의연함으로 상대를 지켜주는 든든한 연애 성향을 가집니다.",
    appearance: [
      "당당함과 품위 있는 태도",
      "시원하고 뚜렷한 눈매",
      "균형 잡히고 늘씬한 체형",
    ],
  },
  乙: {
    headline: "유연한 생명력, 강인함이 숨겨진 야생화 타입",
    summary:
      "을목일간은 덩굴처럼 상대를 감싸 안으며 끈질기게 관계를 이어가는 헌신적인 연애 스타일이에요.",
    appearance: [
      "어떤 환경이든 소화하는 뛰어난 적응력",
      "쉽게 꺾이지 않는 끈질긴 인내심",
      "희망적인 에너지를 전파하는 유연한 분위기",
    ],
  },
  丙: {
    headline: "타고난 스포트라이트, 빛나는 태양의 아우라",
    summary:
      "병화일간은 태양처럼 화끈하고 정열적으로 상대를 대하며, 숨김없이 솔직한 사랑을 하는 타입이에요.",
    appearance: [
      "주변을 압도하는 밝고 열정적인 존재감",
      "명예와 의리를 중시하는 시원한 성격",
      "망설임 없는 적극적인 행동력",
    ],
  },
  丁: {
    headline: "은은한 섬광, 온기를 품은 촛불 감성",
    summary:
      "정화일간은 촛불처럼 은은하고 섬세하게 상대를 보살피며, 따뜻한 마음으로 오래도록 관계를 유지하는 연애 타입이에요.",
    appearance: [
      "조용함 속에 숨겨진 섬세한 열정",
      "타인에게 온기를 나누는 따뜻한 분위기",
      "실용적 감각이 뛰어난 창조적인 능력",
    ],
  },
  戊: {
    headline: "고요함 속에 깊이가 있는 고급스러운 우아미",
    summary:
      "큰 산의 대지처럼 깊고 넉넉한 포용력으로 상대를 안정시키는 연애 스타일이에요.",
    appearance: [
      "정돈되고 흐트러짐 없는 깔끔한 인상",
      "매우 섬세하고 힘 있는 페이스 라인",
      "고급스러움을 발산하는 절제된 아우라",
    ],
  },
  己: {
    headline: "묵묵히 곁을 지키는 안정감 마스터",
    summary:
      "기토일간은 농사짓는 땅처럼 묵묵히 상대를 길러내고 돌보는 가장 헌신적이고 현실적인 연애 타입이에요.",
    appearance: [
      "차분하고 정적인 분위기의 소유자",
      "디테일한 부분까지 챙기는 살뜰한 실속파",
      "뛰어난 생활력과 알뜰한 관리 능력",
    ],
  },
  庚: {
    headline: "흔들림 없는 신뢰, 강철 로맨티스트",
    summary:
      "경금일간은 사랑하는 사람에게 흔들림 없는 신뢰와 강력한 보호를 제공하는 의리파예요.",
    appearance: [
      "흔들림 없는 강인한 신념과 의지",
      "냉철하고 단호한 카리스마",
      "추진력과 결단력이 뛰어난 리더 타입",
    ],
  },
  辛: {
    headline: "예리한 완벽함, 빛나는 보석 같은 귀티",
    summary:
      "신금일간은 잘 연마된 보석처럼 자신을 꾸미고, 관계에서도 예리한 감각으로 최상의 완벽함을 추구하는 이상적인 연애 타입이에요.",
    appearance: [
      "예리하고 섬세한 완벽주의 성향",
      "냉철해 보이지만 의리가 강한 반전 매력",
      "깔끔하고 정제된 외모에서 풍기는 귀티",
    ],
  },
  壬: {
    headline: "깊은 지혜의 바다, 포용력 마스터",
    summary:
      "임수일간은 끝없이 넓은 바다처럼 모든 것을 담아낼 수 있는 포용력으로 상대를 이해하고 감싸주는 연애 타입이에요.",
    appearance: [
      "넓고 깊은 마음으로 타인을 포용하는 지혜",
      "넉넉하고 듬직하여 신뢰감을 주는 이미지",
      "철학적인 깊이가 느껴지는 사색가적 면모",
    ],
  },
  癸: {
    headline: "촉촉한 감성의 소유자, 예술적 영감의 샘",
    summary:
      "계수일간은 비나 이슬처럼 촉촉하고 섬세한 감성으로 상대를 위로하고 감싸주며, 조용히 헌신하는 연애 타입이에요.",
    appearance: [
      "감성이 풍부한 예술적 영감의 소유자",
      "차분함 속에 숨겨진 섬세한 감정 기복",
      "주변에 풍요와 안정을 가져다주는 매력",
    ],
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
  yinYang?: string
): string => {
  if (!element) return "";
  const el = element.toLowerCase();
  // 음양 기호: yang(양) = +, yin(음) = -
  const sign = yinYang?.toLowerCase() === "yang" ? "+" : "-";
  if (el === "fire" || element === "火") return `${sign}화`;
  if (el === "wood" || element === "木") return `${sign}목`;
  if (el === "water" || element === "水") return `${sign}수`;
  if (el === "metal" || element === "金") return `${sign}금`;
  if (el === "earth" || element === "土") return `${sign}토`;
  return "";
};

function SajuDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [data, setData] = useState<SajuLoveRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 결제 관련 상태
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const paymentWidgetRef = useRef<ReturnType<
    typeof window.PaymentWidget
  > | null>(null);

  // 학생 할인 모달 상태
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentCouponApplied, setStudentCouponApplied] = useState(false);

  // 데이터 로드 (IndexedDB에서)
  useEffect(() => {
    if (!resultId) {
      router.push("/saju-love");
      return;
    }

    const loadData = async () => {
      let record = await getSajuLoveRecord(resultId);

      // IndexedDB에 없으면 Supabase에서 조회 (외부 공유 링크로 접근한 경우)
      if (!record) {
        console.log("🔍 IndexedDB에 없음 - Supabase 조회 시도");
        const supabaseRecord = await getSajuAnalysisByShareId(resultId);
        if (supabaseRecord) {
          console.log("✅ Supabase에서 데이터 발견");
          // Supabase 데이터를 SajuLoveRecord 형태로 변환
          record = {
            id: supabaseRecord.id,
            createdAt: supabaseRecord.created_at || new Date().toISOString(),
            paid: supabaseRecord.is_paid || false,
            paidAt: supabaseRecord.paid_at || undefined,
            seenIntro: false,
            input: {
              userName: supabaseRecord.user_info?.userName || "",
              gender: supabaseRecord.user_info?.gender || "",
              date: supabaseRecord.user_info?.date || "",
              calendar: supabaseRecord.user_info?.calendar || "solar",
              time: supabaseRecord.user_info?.time || null,
              userConcern: supabaseRecord.user_info?.userConcern || "",
              status: supabaseRecord.user_info?.status || "",
            },
            rawSajuData:
              supabaseRecord.raw_saju_data as SajuLoveRecord["rawSajuData"],
            sajuData: {
              dayMaster: ((
                supabaseRecord.raw_saju_data as Record<string, unknown>
              )?.dayMaster as SajuLoveRecord["sajuData"]["dayMaster"]) || {
                char: "",
                title: "",
              },
              pillars:
                ((supabaseRecord.raw_saju_data as Record<string, unknown>)
                  ?.pillars as SajuLoveRecord["sajuData"]["pillars"]) || {},
              fiveElements: (
                supabaseRecord.raw_saju_data as Record<string, unknown>
              )?.fiveElements as SajuLoveRecord["sajuData"]["fiveElements"],
              loveFacts: (
                supabaseRecord.raw_saju_data as Record<string, unknown>
              )?.loveFacts as SajuLoveRecord["sajuData"]["loveFacts"],
              sinsal: (supabaseRecord.raw_saju_data as Record<string, unknown>)
                ?.sinsal as SajuLoveRecord["sajuData"]["sinsal"],
              daeun: (supabaseRecord.raw_saju_data as Record<string, unknown>)
                ?.daeun as SajuLoveRecord["sajuData"]["daeun"],
              zodiac: (supabaseRecord.raw_saju_data as Record<string, unknown>)
                ?.zodiac as SajuLoveRecord["sajuData"]["zodiac"],
            },
            loveAnalysis: null, // detail 페이지에서는 분석 결과 필요 없음
            paymentInfo: supabaseRecord.payment_info
              ? {
                  method: supabaseRecord.payment_info.method,
                  price: supabaseRecord.payment_info.price,
                  couponCode: supabaseRecord.payment_info.couponCode,
                  isDiscount: supabaseRecord.payment_info.isDiscount,
                }
              : undefined,
          };

          // IndexedDB에도 저장 (다음 방문 시 로컬에서 빠르게 로드)
          try {
            await saveSajuLoveRecord(record);
            console.log("✅ 외부 공유 데이터 IndexedDB에 캐싱 완료");
          } catch (cacheErr) {
            console.warn("IndexedDB 캐싱 실패:", cacheErr);
          }
        }
      }

      if (record) {
        setData(record);
        setIsLoading(false);

        // IndexedDB에서 가져온 경우: Supabase에 없으면 저장 (fallback)
        const existsInSupabase = await getSajuAnalysisByShareId(resultId);
        if (!existsInSupabase) {
          console.log("🔄 Supabase에 없음 - fallback 저장");
          try {
            await createSajuAnalysis({
              service_type: "saju_love",
              id: record.id,
              user_info: {
                userName: record.input.userName,
                gender: record.input.gender,
                date: record.input.date,
                calendar: record.input.calendar as "solar" | "lunar",
                time: record.input.time,
                userConcern: record.input.userConcern,
                status: record.input.status,
              },
              raw_saju_data: record.rawSajuData || null,
              analysis_result: record.loveAnalysis
                ? {
                    user_name: record.loveAnalysis.user_name,
                    chapters: record.loveAnalysis.chapters,
                  }
                : null,
              image_paths: [],
              is_paid: record.paid || false,
              paid_at: record.paidAt || null,
              payment_info: record.paymentInfo || null,
            });
            console.log("✅ Supabase fallback 저장 완료");
          } catch (err) {
            console.error("Supabase fallback 저장 실패:", err);
          }
        }

        trackPageView("saju_love_detail", {
          id: record.id,
          gender: record.input.gender,
          user_name: record.input.userName,
          birth_date: record.input.date,
          birth_time: record.input.time || "모름",
          status: record.input.status,
          user_concern: record.input.userConcern,
          day_master: record.sajuData.dayMaster?.char,
          day_master_title: record.sajuData.dayMaster?.title,
        });
      } else {
        router.push("/saju-love");
      }
    };

    loadData();
  }, [resultId, router]);

  // 학생 모달 자동 표시 (데이터 로드 후)
  useEffect(() => {
    if (data && !isLoading) {
      const age = calculateAge(data.input.date);
      const isStudentUser = age < 20;
      if (isStudentUser && !studentCouponApplied) {
        // 1초 후 모달 표시
        const timer = setTimeout(() => {
          setShowStudentModal(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [data, isLoading, studentCouponApplied]);

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

    // 학생 쿠폰 적용 여부에 따라 가격 결정
    const paymentPrice = studentCouponApplied
      ? PAYMENT_CONFIG.studentPrice
      : PAYMENT_CONFIG.price;

    trackPaymentModalOpen("saju_love", {
      id: data.id,
      price: paymentPrice,
      is_student: studentCouponApplied,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
      user_concern: data.input.userConcern,
    });

    setShowPaymentModal(true);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(
          PAYMENT_CONFIG.clientKey,
          customerKey
        );
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#saju-payment-method", {
          value: paymentPrice,
        });
        widget.renderAgreement("#saju-agreement");
      }
    }, 100);
  }, [data, studentCouponApplied]);

  // 쿠폰 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!data || !couponCode.trim()) return;

    const code = couponCode.trim();

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, serviceType: "saju_love" }),
      });
      const result = await res.json();

      if (!result.valid) {
        setCouponError(result.error || "유효하지 않은 쿠폰입니다");
        return;
      }

      const isFree = result.is_free;
      const discount = isFree ? PAYMENT_CONFIG.price : result.discount_amount;

      setCouponError("");
      setAppliedCoupon({ code, discount });

      if (isFree) {
        // 무료 쿠폰: 결제 완료 처리
        await saveSajuLoveRecord({
          ...data,
          paid: true,
          paidAt: new Date().toISOString(),
          paymentInfo: {
            method: "coupon",
            price: 0,
            couponCode: code,
            isDiscount: true,
          },
        });

        // 쿠폰 수량 차감
        await fetch("/api/coupon/use", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        // 결과 페이지로 이동
        router.push(`/saju-love/result?id=${data.id}`);
      } else {
        // 할인 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods("#saju-payment-method", {
            value: newPrice,
          });
        }
      }
    } catch (error) {
      console.error("쿠폰 검증 오류:", error);
      setCouponError("쿠폰 확인 중 오류가 발생했습니다");
    }
  }, [data, couponCode, router]);

  // 결제 요청
  const handlePaymentRequest = useCallback(async () => {
    if (!paymentWidgetRef.current || !data) return;

    // 학생 쿠폰 적용 여부에 따라 가격 결정
    const basePrice = studentCouponApplied
      ? PAYMENT_CONFIG.studentPrice
      : PAYMENT_CONFIG.price;

    const finalPrice = appliedCoupon
      ? basePrice - appliedCoupon.discount
      : basePrice;

    trackPaymentAttempt("saju_love", {
      id: data.id,
      price: finalPrice,
      is_student: studentCouponApplied,
      is_discount: !!appliedCoupon,
      coupon_code: appliedCoupon?.code,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
      user_concern: data.input.userConcern,
    });

    try {
      const orderSuffix = studentCouponApplied
        ? "-student"
        : appliedCoupon
        ? `-${appliedCoupon.code}`
        : "";
      const orderNameSuffix = studentCouponApplied
        ? " - 학생 할인"
        : appliedCoupon
        ? ` - ${appliedCoupon.code} 할인`
        : "";

      await paymentWidgetRef.current.requestPayment({
        orderId: `saju-love${orderSuffix}_${Date.now()}`,
        orderName: `${PAYMENT_CONFIG.orderName}${orderNameSuffix}`,
        customerName: data.input.userName || "고객",
        successUrl: `${
          window.location.origin
        }/payment/success?type=saju&id=${encodeURIComponent(data.id)}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`,
        failUrl: `${
          window.location.origin
        }/payment/fail?id=${encodeURIComponent(data.id)}&type=saju`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  }, [data, appliedCoupon]);

  // 결제 모달 닫기
  const closePaymentModal = useCallback(() => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;

    trackPaymentModalClose("saju_love", {
      id: data?.id,
      reason: "user_close",
    });

    // 쿠폰 상태 리셋
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
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
  const pillars = sajuData.pillars;
  const dmData = dayMasterData[dayMaster.char];
  const birthTime = formatTimeToSi(input.time);

  // 학생 할인율 계산
  const studentDiscount = Math.floor(
    (1 - PAYMENT_CONFIG.studentPrice / PAYMENT_CONFIG.originalPrice) * 100
  );

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
      <button className={styles.back_btn} onClick={() => router.push("/saju-love")}>
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>사주 다시 입력</span>
      </button>

      {/* 결과 컨텐츠 */}
      <div className={styles.result_wrap}>
        {/* 섹션 1: 상단 이미지 + 정보 */}
        <section className={`${styles.detail_section} ${styles.section_1}`}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail.jpg" alt="연애 사주" />
          </div>

          <div className={styles.info_card}>
            <div className={styles.info_main}>
              <span className={styles.info_name}>{input.userName}</span>
              <span className={styles.info_birth}>
                {input.date}
                {birthTime ? ` | ${birthTime}` : ""}
              </span>
            </div>
            <div className={styles.info_ilju}>
              <span className={styles.ilju_char}>{dayMaster.char}</span>
              <span className={styles.ilju_title}>{dayMaster.title}</span>
            </div>
          </div>

          {/* 사주 팔자 테이블 */}
          <div className={styles.pillars_section}>
            <div className={styles.pillars_header}>
              <span className="material-icons">view_column</span>
              사주 팔자
            </div>
            <div className={styles.saju_table_wrap}>
              <table className={styles.saju_table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>생시</th>
                    <th>생일</th>
                    <th>생월</th>
                    <th>생년</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 천간 */}
                  <tr className={styles.row_cheongan}>
                    <td className={styles.row_label}>천간</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.stem?.char)
                        return (
                          <td key={key} className={styles.cell_empty}>
                            —
                          </td>
                        );
                      return (
                        <td key={key}>
                          <span
                            className={styles.char_main}
                            style={{ color: getColor(p.stem.element) }}
                          >
                            {p.stem.char}
                            {p.stem.korean}
                          </span>
                          <span
                            className={styles.char_element}
                            style={{ color: getColor(p.stem.element) }}
                          >
                            {getElementKorean(p.stem.element, p.stem.yinYang)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 십성 (천간) */}
                  <tr className={styles.row_sipsung}>
                    <td className={styles.row_label}>십성</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td
                          key={key}
                          className={styles.cell_sipsung}
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {p?.tenGodStem || "—"}
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지지 */}
                  <tr className={styles.row_jiji}>
                    <td className={styles.row_label}>지지</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.branch?.char)
                        return (
                          <td key={key} className={styles.cell_empty}>
                            —
                          </td>
                        );
                      return (
                        <td key={key}>
                          <span
                            className={styles.char_main}
                            style={{ color: getColor(p.branch.element) }}
                          >
                            {p.branch.char}
                            {p.branch.korean}
                          </span>
                          <span
                            className={styles.char_element}
                            style={{ color: getColor(p.branch.element) }}
                          >
                            {getElementKorean(
                              p.branch.element,
                              p.branch.yinYang
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 십성 (지지) */}
                  <tr className={styles.row_sipsung}>
                    <td className={styles.row_label}>십성</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td
                          key={key}
                          className={styles.cell_sipsung}
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {p?.tenGodBranchMain || "—"}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 섹션 2: 나의 결정적 매력 */}
        <section className={`${styles.detail_section} ${styles.section_2}`}>
          <div className={styles.section_label}>이성을 사로잡는</div>
          <div className={styles.section_main_title}>나의 결정적 매력</div>

          {dmData && (
            <>
              <div className={styles.charm_headline_wrap}>
                <span className={styles.charm_quote}>&ldquo;</span>
                <div className={styles.charm_headline}>{dmData.headline}</div>
                <span className={styles.charm_quote}>&rdquo;</span>
              </div>
              <div className={styles.charm_ilgan_info}>
                {dayMaster.title} | {dayMaster.char}
                {elementHanja}
              </div>

              <div className={styles.charm_detail_wrap}>
                <h3 className={styles.charm_detail_title}>내 일간 성향</h3>
                <p className={styles.charm_detail_desc}>{dmData.summary}</p>

                <div className={styles.charm_appearance_wrap}>
                  <h3 className={styles.charm_detail_title}>내 일간의 분위기</h3>
                  <ul className={styles.charm_appearance_list}>
                    {dmData.appearance.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <div className={styles.charm_appearance_fade} />
                </div>
              </div>
            </>
          )}

          {/* 이런 내용을 알려드려요 */}
          <div className={styles.info_preview_box}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/saju-love/img/info_preview_box.jpg"
              alt="이런 내용을 알려드려요"
            />
          </div>
        </section>

        {/* 섹션 3: 하단 이미지 */}
        <section className={`${styles.detail_section} ${styles.section_3}`}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail2.jpg" alt="운명의 상대" />
          </div>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail3.jpg" alt="연애 사주 분석" />
          </div>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail4.jpg" alt="사주 상세 분석" />
          </div>
        </section>

        {/* 고민 유도 섹션 */}
        <div className={styles.hesitate_section}>
          <p className={styles.hesitate_question}>아직 고민하고 계신가요?</p>
          <div className={styles.hesitate_hint_box}>
            <p className={styles.hesitate_hint}>
              <strong>색동낭자가 이미 연애 사주를 분석하고 있어요!</strong>
            </p>
          </div>
        </div>

        {/* 가격 비교 섹션 */}
        <div className={styles.price_compare_section}>
          {/* 다른 곳 가격 비교 */}
          <p className={styles.price_compare_title}>
            색동낭자 연애 사주 분석 보고서 복채
          </p>
          <div className={styles.price_compare_cards}>
            <div className={styles.price_card}>
              <span className={styles.price_card_badge}>
                오프라인
                <br />
                사주
              </span>
              <span className={styles.price_card_value}>5만원</span>
              <span className={styles.price_card_sep}>~</span>
              <span className={styles.price_card_value}>30만원</span>
            </div>
            <div className={styles.price_card}>
              <span className={styles.price_card_badge}>
                온라인
                <br />
                사주
              </span>
              <span className={styles.price_card_value}>3만원</span>
              <span className={styles.price_card_sep}>~</span>
              <span className={styles.price_card_value}>5만원</span>
            </div>
            <div className={styles.price_card}>
              <span className={styles.price_card_badge}>
                프리미엄
                <br />
                신점
              </span>
              <span className={styles.price_card_value}>20만원</span>
              <span className={styles.price_card_sep}>~</span>
              <span className={styles.price_card_value}>400만원</span>
            </div>
          </div>

          {/* VS */}
          <div className={styles.price_vs}>VS</div>

          {/* 우리 가격 이미지 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/saju-love/img/love-price.jpg"
            alt="색동낭자 가격"
            className={styles.price_compare_img}
          />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/saju-love/img/love-price2.jpg"
          alt="색동낭자 가격 상세"
          className={styles.price_final_img}
        />
      </div>

      {/* 하단 고정 버튼 */}
      <div className={styles.bottom_fixed_btn}>
        <button className={styles.analyze_btn} onClick={openPaymentModal}>
          내 연애 사주 분석 받기
        </button>
        {studentCouponApplied && (
          <p className={styles.student_applied_badge}>학생 할인 적용됨</p>
        )}
      </div>

      {/* 학생 할인 모달 */}
      {showStudentModal && (
        <div
          className={styles.student_modal_overlay}
          onClick={() => setShowStudentModal(false)}
        >
          <div className={styles.student_modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.student_modal_title}>혹시 학생이신가요?</p>
            <p className={styles.student_modal_desc}>
              학생분들의 연애를 응원해요!
              <br />
              학생이시면 <strong>커피 한 잔</strong>에 풀이하고 있어요
            </p>
            <ul className={styles.student_modal_list}>
              <li>20,000자 연애 사주 심층 분석</li>
              <li>운명의 상대 & 피해야 할 인연 사진</li>
              <li>2026년 월별 연애운 캘린더</li>
              <li className={styles.bonus}>보너스: 개인 연애 고민 풀이</li>
            </ul>
            <button
              className={styles.student_modal_confirm}
              onClick={() => {
                setStudentCouponApplied(true);
                setShowStudentModal(false);
              }}
            >
              네, 학생이에요 (90% 할인)
            </button>
          </div>
        </div>
      )}

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className={styles["payment-overlay"]} style={{ display: "flex" }}>
          <div className={styles["payment-fullscreen"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["payment-header"]}>
                <div className={styles["payment-title"]}>
                  {studentCouponApplied
                    ? "🎓 학생 특별 복채"
                    : "색동낭자 연애 사주 복채"}
                </div>
                <div className={styles["payment-close"]} onClick={closePaymentModal}>
                  ✕
                </div>
              </div>

              {/* 학생 할인 배너 */}
              {studentCouponApplied && (
                <div className={styles["student-payment-banner"]}>
                  <p className={styles["banner-text"]}>학생 할인이 적용되었어요</p>
                </div>
              )}

              {/* 결제 금액 섹션 */}
              <div className={styles["payment-amount-section"]}>
                <h3 className={styles["payment-amount-title"]}>복채</h3>

                {/* 정가 */}
                <div className={styles["payment-row"]}>
                  <span className={styles["payment-row-label"]}>
                    색동낭자 연애 사주 20,000자 보고서
                  </span>
                  <span className={styles["payment-row-value"]}>
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </span>
                </div>

                {/* 할인 - 학생/일반 분기 */}
                {studentCouponApplied ? (
                  <div className={`${styles["payment-row"]} ${styles.discount} ${styles["student-discount"]}`}>
                    <span className={styles["payment-row-label"]}>🎓 학생 특별 할인</span>
                    <div className={styles["payment-row-discount-value"]}>
                      <span className={`${styles["discount-badge"]} ${styles.student}`}>
                        {studentDiscount}%
                      </span>
                      <span className={styles["discount-amount"]}>
                        -
                        {(
                          PAYMENT_CONFIG.originalPrice -
                          PAYMENT_CONFIG.studentPrice
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={`${styles["payment-row"]} ${styles.discount}`}>
                    <span className={styles["payment-row-label"]}>
                      병오년(丙午年) 1월 특가 할인
                    </span>
                    <div className={styles["payment-row-discount-value"]}>
                      <span className={styles["discount-badge"]}>
                        {Math.floor(
                          (1 -
                            PAYMENT_CONFIG.price /
                              PAYMENT_CONFIG.originalPrice) *
                            100
                        )}
                        %
                      </span>
                      <span className={styles["discount-amount"]}>
                        -
                        {(
                          PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.price
                        ).toLocaleString()}
                        원
                      </span>
                    </div>
                  </div>
                )}

                {/* 쿠폰 할인 적용 표시 (학생 쿠폰 미적용 시만) */}
                {!studentCouponApplied && appliedCoupon && (
                  <div className={`${styles["payment-row"]} ${styles.discount}`}>
                    <span className={styles["payment-row-label"]}>
                      {appliedCoupon.code} 쿠폰
                    </span>
                    <span className={styles["discount-amount"]}>
                      -{appliedCoupon.discount.toLocaleString()}원
                    </span>
                  </div>
                )}

                {/* 구분선 */}
                <div className={styles["payment-divider"]} />

                {/* 최종 금액 */}
                <div className={`${styles["payment-row"]} ${styles.final}`}>
                  <span className={styles["payment-row-label"]}>최종 결제금액</span>
                  <span
                    className={`${styles["payment-row-final-value"]} ${
                      studentCouponApplied ? styles["student-price"] : ""
                    }`}
                  >
                    {studentCouponApplied
                      ? PAYMENT_CONFIG.studentPrice.toLocaleString()
                      : appliedCoupon
                      ? (
                          PAYMENT_CONFIG.price - appliedCoupon.discount
                        ).toLocaleString()
                      : PAYMENT_CONFIG.price.toLocaleString()}
                    원
                  </span>
                </div>
              </div>

              {/* 쿠폰 입력 (학생 쿠폰 미적용 시만) */}
              {!studentCouponApplied && (
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
                      disabled={!!appliedCoupon}
                    >
                      {appliedCoupon ? "적용됨" : "적용"}
                    </button>
                  </div>
                  {couponError && (
                    <div className={styles["coupon-error"]}>{couponError}</div>
                  )}
                </div>
              )}

              <div style={{ padding: "0 20px" }}>
                <div
                  id="saju-payment-method"
                  style={{ padding: 0, margin: 0 }}
                />
                <div id="saju-agreement" />
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

export default function SajuDetailPage() {
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
      <SajuDetailContent />
    </Suspense>
  );
}
