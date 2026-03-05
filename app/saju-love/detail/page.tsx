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
import { SajuLoveRecord } from "@/lib/db/sajuLoveDB";
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
  price: 23900,
  discountPrice: 9900,
  originalPrice: 44800,
  orderName: "AI 연애 사주 심층 분석",
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
  yinYang?: string,
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
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
  } | null>(null);
  const paymentWidgetRef = useRef<ReturnType<
    typeof window.PaymentWidget
  > | null>(null);
  const isApplyingCouponRef = useRef(false);

  // 데이터 로드 (IndexedDB에서)
  useEffect(() => {
    if (!resultId) {
      router.push("/saju-love");
      return;
    }

    const loadData = async () => {
      const supabaseRecord = await getSajuAnalysisByShareId(resultId);
      if (!supabaseRecord) {
        setIsLoading(false);
        return;
      }

      const raw = supabaseRecord.raw_saju_data as Record<
        string,
        unknown
      > | null;
      const record: SajuLoveRecord = {
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
          dayMaster:
            (raw?.dayMaster as SajuLoveRecord["sajuData"]["dayMaster"]) || {
              char: "",
              title: "",
            },
          pillars:
            (raw?.pillars as SajuLoveRecord["sajuData"]["pillars"]) || {},
          fiveElements:
            raw?.fiveElements as SajuLoveRecord["sajuData"]["fiveElements"],
          loveFacts: raw?.loveFacts as SajuLoveRecord["sajuData"]["loveFacts"],
          sinsal: raw?.sinsal as SajuLoveRecord["sajuData"]["sinsal"],
          daeun: raw?.daeun as SajuLoveRecord["sajuData"]["daeun"],
          zodiac: raw?.zodiac as SajuLoveRecord["sajuData"]["zodiac"],
        },
        loveAnalysis: null,
        paymentInfo: supabaseRecord.payment_info
          ? {
              method: supabaseRecord.payment_info.method,
              price: supabaseRecord.payment_info.price,
              couponCode: supabaseRecord.payment_info.couponCode,
              isDiscount: supabaseRecord.payment_info.isDiscount,
            }
          : undefined,
      };

      if (record) {
        setData(record);
        setIsLoading(false);

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

    trackPaymentModalOpen("saju_love", {
      id: data.id,
      price: paymentPrice,
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
          customerKey,
        );
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#saju-payment-method", {
          value: paymentPrice,
        });
        widget.renderAgreement("#saju-agreement");
      }
    }, 100);
  }, [data]);

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

      if (isFree) {
        setAppliedCoupon({ code, discount });

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
            body: JSON.stringify({ code, serviceType: "saju_love" }),
          });
        } catch (e) {
          console.error("쿠폰 수량 차감 실패:", e);
        }

        trackCouponApplied("saju_love", {
          coupon_code: code,
          discount: PAYMENT_CONFIG.price,
          is_free: true,
          final_price: 0,
        });
        trackPaymentSuccess("saju_love", {
          id: data.id,
          price: 0,
          method: "coupon",
          coupon_code: code,
        });

        // 4. 결과 페이지로 이동
        router.push(`/saju-love/result?id=${data.id}`);
      } else {
        setAppliedCoupon({ code, discount });

        // 할인 쿠폰: 결제 위젯 금액 업데이트
        if (paymentWidgetRef.current) {
          const newPrice = Math.max(PAYMENT_CONFIG.price - discount, 100);
          paymentWidgetRef.current.renderPaymentMethods(
            "#saju-payment-method",
            {
              value: newPrice,
            },
          );
        }
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

    const basePrice = PAYMENT_CONFIG.price;

    const finalPrice = appliedCoupon
      ? basePrice - appliedCoupon.discount
      : basePrice;

    trackPaymentAttempt("saju_love", {
      id: data.id,
      price: finalPrice,
      is_discount: !!appliedCoupon,
      coupon_code: appliedCoupon?.code,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
      user_concern: data.input.userConcern,
    });

    try {
      const orderSuffix = appliedCoupon ? `-${appliedCoupon.code}` : "";
      const orderNameSuffix = appliedCoupon
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
        onClick={() => router.push("/saju-love")}
      >
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
                              p.branch.yinYang,
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
          <div className={styles.section_eyebrow}>이성을 사로잡는</div>
          <div className={styles.section_main_title}>나의 결정적 매력</div>

          {dmData && (
            <>
              <div className={styles.charm_headline_wrap}>
                <div className={styles.charm_headline}>{dmData.headline}</div>
              </div>

              <div className={styles.charm_ilgan_badge}>
                <span className={styles.charm_ilgan_char}>
                  {dayMaster.char}
                </span>
                <span className={styles.charm_ilgan_label}>
                  {dayMaster.title} · {elementHanja}
                </span>
              </div>

              <div className={styles.charm_body}>
                <p className={styles.charm_summary}>{dmData.summary}</p>

                <ul className={styles.charm_traits}>
                  {dmData.appearance.map((item, i) => (
                    <li key={i}>
                      <span className={styles.charm_trait_dot} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>

        {/* 섹션 3: 하단 이미지 */}
        <section className={`${styles.detail_section} ${styles.section_3}`}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail2.jpg" alt="운명의 상대" />
          </div>
          {/* 후기 섹션 - detail3 대체 */}
          <div className={styles.review_section}>
            <div className={styles.review_title_wrap}>
              <span className={styles.review_title_red}>색동낭자가</span>
              <span className={styles.review_title_red}>
                자신하는 100% 실제 후기
              </span>
            </div>

            <div className={styles.review_card}>
              <p className={styles.review_headline}>
                &ldquo;굳이 비싼 돈 주고 점집을 찾아다닐 필요가 있을까?&rdquo;
              </p>
              <p className={styles.review_body}>
                싶을 만큼 퀄리티가 좋았어요!! 내용도 다른 곳의 2배 이상? 엄청
                많음. 내가 어떤 사람에게 끌리는지, 내 성향이 어떤지 등등{" "}
                <strong>
                  너무 정확하게 맞춰서 놀랐어요. 진짜 내 취향 어떻게 안 거지...
                  볼수록 신기함.
                </strong>
                <br />
                사실 모바일로 사주를 보면 내 사정을 잘 몰라서 생뚱맞은 소리를
                하지 않을까 싶었는데.. 내가 어떤 상황인지 설정할 수 있어서 더
                자세한 결과를 확인할 수 있다는 게! 젤 좋았던 포인트!!!!
                <br />
                언제 운명의 짝을 만나게 될 지 말해줬는데 이것까지 맞는다면 다시
                성지순례하러 올게요!!!
              </p>
              <div className={styles.review_footer}>
                <span className={styles.review_avatar}>🐵</span>
                <div className={styles.review_footer_info}>
                  <span className={styles.review_name}>유지민 님 (26)</span>
                  <span className={styles.review_stars}>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>

            <div className={styles.review_card}>
              <p className={styles.review_headline}>
                &ldquo;지금까지 사주를 수도없이 많이 본 사람인데요.&rdquo;
              </p>
              <p className={styles.review_body}>
                이건{" "}
                <strong>
                  실제 역술가한테 사주를 본 것 처럼 세세하고, 물어보기 껄끄러운
                  성적인 질문이나 관계도 알려줘요ㅋㅋ
                </strong>{" "}
                생각보다 알차고 많은 내용이 있어서 놀랐네요;; 썸단계 플러팅
                방법, 스킨십, 재회 필살기까지 연애 궁금증을 다 해소해줘요.
                알잘딱깔센인게 참 좋은 것 같습니다 ㅎㅎ
              </p>
              <div className={styles.review_footer}>
                <span className={styles.review_avatar}>🥰</span>
                <div className={styles.review_footer_info}>
                  <span className={styles.review_name}>김승희 님 (30)</span>
                  <span className={styles.review_stars}>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>

            <div className={styles.review_card}>
              <p className={styles.review_headline}>
                &ldquo;내 연애 성향과 끌리는 사람까지 다 맞네요...&rdquo;
              </p>
              <p className={styles.review_body}>
                다른 곳들과 다르게 NPC 게임처럼 진행돼서 재밌게 사주를 볼 수
                있고, 지루하지가 않네요. 사주는 잘 모르는데 사주 용어들 풀이를
                중간에 해줘서 이해하기 편했어요!
                <br />
                일반 사주풀이와 더불어{" "}
                <strong>
                  연애와 관련한 모든 것들을 다 알려주는데, 특히 내 연애 성향과
                  끌리는 사람까지 다 맞아서 너무 신기했어요!!!
                </strong>
                <br />
                저에게 맞는 운명의 상대 초상화도 만들어주는데.. 제발 그 사람이랑
                만나고 싶어요. 제발. 친구들한테도 이미 추천해줬어요 최고 💘
              </p>
              <div className={styles.review_footer}>
                <span className={styles.review_avatar}>🥳</span>
                <div className={styles.review_footer_info}>
                  <span className={styles.review_name}>강소윤 님 (23)</span>
                  <span className={styles.review_stars}>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>

            <div className={styles.review_card}>
              <p className={styles.review_headline}>
                &ldquo;간지러운 곳을 정확하게 긁어주는 느낌&rdquo;
              </p>
              <p className={styles.review_body}>
                다른 사주 앱들은 연애만 집중해서 이렇게 자세하게 파고들어서
                분석해주지 않아서 늘 궁금한 게 풀리지 않은 느낌이었거든요 ㅋㅋ
                <br />
                <strong>
                  색동낭자는 정말 간지러운 곳을 정확하게 긁어줘 다시는 안
                  간지럽게 해주는 느낌이에요!!!
                </strong>{" "}
                이해하기 쉽게 알려주는 것도 완전 센스만점..
                <br />
                지금 썸붕난 상태라 기분이 너무 안 좋았는데ㅋ쿠ㅜ 계속해서 이번이
                끝이 아니라고 위로해주고 앞으로 4주간, 그리고 2년간 내 새로운
                인연의 흐름을 보여주면서 응원해줘서 힘이 나네요.
                <br />
                무엇보다 내가 좋아하는 사람보다 나를 좋아해주는 사람을 만나는 게
                더 좋다고 사주 풀이를 바탕으로 알려줘서 속시원했어요.
                <br />
                <span className={styles.review_highlight}>
                  악연의 얼굴도 그려주는데 전남친, 소개팅남이랑 똑같이 생겨서
                  소름..
                </span>
                <br />
                친구들이랑 비교해보니 넘 재밌네요
              </p>
              <div className={styles.review_footer}>
                <span className={styles.review_avatar}>🧐</span>
                <div className={styles.review_footer_info}>
                  <span className={styles.review_name}>박현지 님 (25)</span>
                  <span className={styles.review_stars}>⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>
          </div>
          {/* 목차 섹션 */}
          <div className={styles.toc_section}>
            <div className={styles.toc_top}>
              <h2 className={styles.toc_main_title}>
                색동낭자 연애사주
                <br />
                목차
              </h2>
              <div className={styles.toc_points}>
                <span className={styles.toc_point}>
                  <strong>Point 1</strong> 20,000자 이상 분량
                </span>
                <span className={styles.toc_point}>
                  <strong>Point 2</strong> 구체적인 연애운 상승 비법부터
                </span>
                <span className={styles.toc_point}>
                  <strong>Point 3</strong> 1:1 맞춤 상담까지 한 번에
                </span>
              </div>
            </div>

            {/* 1장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>1장</div>
              <h3 className={styles.toc_chapter_title}>
                나만의 매력과
                <br />
                연애 성향
              </h3>
              <ul className={styles.toc_list}>
                <li>풀이 1 처음 본 순간 이성이 느끼는 나의 매력</li>
                <li>풀이 2 내 연애 스타일 장점과 숨겨진 반전 매력</li>
                <li>
                  풀이 3 인만추 vs 자만추 vs 결정사,
                  <br />
                  나에게 맞는 방식은
                </li>
                <li>
                  풀이 4 내가 끌리는 사람 vs 나에게 끌리는 사람
                  <span className={styles.toc_sub}>
                    · 어떤 사람을 만나야 행복하게 연애할 수 있을까?
                  </span>
                </li>
              </ul>
            </div>

            <div className={styles.toc_divider} />

            {/* 2장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>2장</div>
              <h3 className={styles.toc_chapter_title}>
                앞으로 펼쳐질
                <br />
                사랑의 흐름
              </h3>
              <ul className={styles.toc_list}>
                <li>풀이 1 앞으로의 연애 좋은 흐름</li>
                <li>
                  풀이 2 향후 3년간 연애운 종합 시기
                  <span className={styles.toc_sub}>
                    · 몇 번의 만남 기회가 있을까
                  </span>
                  <span className={styles.toc_sub}>
                    · 시기마다 어떤 사람이 나타날까
                  </span>
                </li>
                <li>
                  풀이 3 바로 지금, 이번 달 연애 운세
                  <span className={styles.toc_sub}>
                    · 이번 달 연애운의 길흉과 포인트
                  </span>
                  <span className={styles.toc_sub}>
                    · 인연을 만드는 이달의 실천 가이드
                  </span>
                </li>
              </ul>
            </div>

            <div className={styles.toc_divider} />

            {/* 3장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>3장</div>
              <h3 className={styles.toc_chapter_title}>
                결국 만나게 될<br />
                운명의 상대
              </h3>
              <ul className={styles.toc_list}>
                <li>
                  풀이 1 운명의 짝, 그 사람의 모든 것
                  <span className={styles.toc_sub}>
                    · 그 사람의 초성부터 MBTI, 직업 특성, 성향까지
                  </span>
                  <span className={styles.toc_sub}>
                    · 만남의 장소와 오르는 길
                  </span>
                </li>
                <li>
                  풀이 2 언제, 어떻게 만나게 될까
                  <span className={styles.toc_sub}>
                    · 소개팅인, 독서모임, 소개 구체적인 첫소개 루트
                  </span>
                </li>
                <li>
                  풀이 3 그 사람을 끌어당길 나만의 공략법
                  <span className={styles.toc_sub}>
                    · 첫 데이트 장소 추천, 스타일링 가이드, 플러팅 팁
                  </span>
                </li>
              </ul>
              <div className={styles.toc_bonus}>
                <span className={styles.toc_bonus_label}>보너스</span>
                <span className={styles.toc_bonus_title}>
                  운명의 상대 이미지
                </span>
              </div>
            </div>

            <div className={styles.toc_divider} />

            {/* 4장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>4장</div>
              <h3 className={styles.toc_chapter_title}>
                운명으로 착각하는
                <br />
                가짜인연
              </h3>
              <ul className={styles.toc_list}>
                <li>
                  풀이 1 내가 유독 약해지는 가짜 인연
                  <span className={styles.toc_sub}>
                    · 왜 유독 그런 타입에게 끌릴까
                  </span>
                </li>
                <li>
                  풀이 2 운명으로 착각하게 되는 이유
                  <span className={styles.toc_sub}>
                    · 첫 끌림 뒤에 숨은 진짜 이유
                  </span>
                </li>
                <li>
                  풀이 3 가짜 인연을 거르는 법
                  <span className={styles.toc_sub}>
                    · 구체적인 필터링 체크 포인트
                  </span>
                </li>
              </ul>
              <div className={styles.toc_bonus}>
                <span className={styles.toc_bonus_label}>보너스</span>
                <span className={styles.toc_bonus_title}>
                  피해야 할 인연 이미지
                </span>
              </div>
            </div>

            <div className={styles.toc_divider} />

            {/* 5장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>5장</div>
              <h3 className={styles.toc_chapter_title}>
                누구에게도 말 못할,
                <br />
                19금 연애 사주
              </h3>
              <div className={styles.toc_blur_wrap}>
                <div className={styles.toc_blur_content}>
                  <ul className={styles.toc_list}>
                    <li>
                      풀이 1 사주로 보는 나의 은밀한 성향
                      <br />
                      <span className={styles.toc_sub}>
                        · 내 안에 숨겨진 욕구와 판타지
                      </span>
                      <span className={styles.toc_sub}>
                        · 나도 몰랐던 민감 포인트
                      </span>
                    </li>
                    <li>
                      풀이 2 운명의 상대와의 궁합 케미
                      <br />
                      <span className={styles.toc_sub}>
                        · 빈도, 주도권, 스타일 궁합 분석
                      </span>
                    </li>
                    <li>
                      풀이 3 더 깊어지는 관계를 위한 가이드
                      <br />
                      <span className={styles.toc_sub}>
                        · 상대를 사로잡는 나만의 무기
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className={styles.toc_divider} />

            {/* 6장 */}
            <div className={styles.toc_chapter}>
              <div className={styles.toc_chapter_num}>6장</div>
              <h3 className={styles.toc_chapter_title}>색동낭자의 귀띔</h3>
              <p className={styles.toc_chapter_desc}>
                고민에 대한 사주 기반 맞춤 조언
              </p>
            </div>

            {/* 보너스 풀이 */}
            <div className={styles.toc_extra_bonus}>
              + 그 외 보너스 풀이 추가 제공
            </div>
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
      </div>

      {/* 하단 고정 버튼 */}
      <div className={styles.bottom_fixed_btn}>
        <button className={styles.analyze_btn} onClick={openPaymentModal}>
          내 연애 사주 분석 받기
        </button>
      </div>

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className={styles["payment-overlay"]} style={{ display: "flex" }}>
          <div className={styles["payment-fullscreen"]}>
            <div className={styles["modal-content"]}>
              <div className={styles["payment-header"]}>
                <div className={styles["payment-title"]}>
                  색동낭자 연애 사주 복채
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
                    색동낭자 연애 사주 20,000자 보고서
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
                  <div className={styles["payment-row-discount-value"]}>
                    <span className={styles["discount-badge"]}>
                      {Math.floor(
                        (1 -
                          PAYMENT_CONFIG.price / PAYMENT_CONFIG.originalPrice) *
                          100,
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

                {/* 쿠폰 할인 적용 표시 */}
                {appliedCoupon && (
                  <div
                    className={`${styles["payment-row"]} ${styles.discount}`}
                  >
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
