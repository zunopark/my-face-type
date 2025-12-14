"use client";

// ============================================================
// 🔧 결제 스킵 설정 (개발/테스트용)
// true: 결제 없이 바로 결과 페이지로 이동
// false: 정상 결제 프로세스 진행
const SKIP_PAYMENT = true;
// ============================================================

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trackPageView, trackPaymentModalOpen, trackPaymentModalClose, trackPaymentAttempt } from "@/lib/mixpanel";
import { getSajuLoveRecord, SajuLoveRecord } from "@/lib/db/sajuLoveDB";
import "./detail.css";

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
  clientKey: process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l",
  price: 9900,
  discountPrice: 7900,
  originalPrice: 29900,
  orderName: "AI 연애 사주 심층 분석",
};

// 일간별 성향 데이터
const dayMasterData: Record<string, { headline: string; summary: string; appearance: string[] }> = {
  "甲": {
    headline: "단아함과 우아함이 돋보이는 청순 주인공 스타일",
    summary: "갑목일간은 기둥처럼 곧고 깨끗하고 맑은 이미지를 지녀 주변을 정화시키는 매력이 있어요. 묵묵히 뿌리를 내리고 자라는 의연함으로 상대를 지켜주는 든든한 연애 성향을 가집니다.",
    appearance: ["당당함과 품위 있는 태도", "시원하고 뚜렷한 눈매", "균형 잡히고 늘씬한 체형"],
  },
  "乙": {
    headline: "유연한 생명력, 강인함이 숨겨진 야생화 타입",
    summary: "을목일간은 덩굴처럼 상대를 감싸 안으며 끈질기게 관계를 이어가는 헌신적인 연애 스타일이에요.",
    appearance: ["어떤 환경이든 소화하는 뛰어난 적응력", "쉽게 꺾이지 않는 끈질긴 인내심", "희망적인 에너지를 전파하는 유연한 분위기"],
  },
  "丙": {
    headline: "타고난 스포트라이트, 빛나는 태양의 아우라",
    summary: "병화일간은 태양처럼 화끈하고 정열적으로 상대를 대하며, 숨김없이 솔직한 사랑을 하는 타입이에요.",
    appearance: ["주변을 압도하는 밝고 열정적인 존재감", "명예와 의리를 중시하는 시원한 성격", "망설임 없는 적극적인 행동력"],
  },
  "丁": {
    headline: "은은한 섬광, 온기를 품은 촛불 감성",
    summary: "정화일간은 촛불처럼 은은하고 섬세하게 상대를 보살피며, 따뜻한 마음으로 오래도록 관계를 유지하는 연애 타입이에요.",
    appearance: ["조용함 속에 숨겨진 섬세한 열정", "타인에게 온기를 나누는 따뜻한 분위기", "실용적 감각이 뛰어난 창조적인 능력"],
  },
  "戊": {
    headline: "고요함 속에 깊이가 있는 고급스러운 우아미",
    summary: "큰 산의 대지처럼 깊고 넉넉한 포용력으로 상대를 안정시키는 연애 스타일이에요.",
    appearance: ["정돈되고 흐트러짐 없는 깔끔한 인상", "매우 섬세하고 힘 있는 페이스 라인", "고급스러움을 발산하는 절제된 아우라"],
  },
  "己": {
    headline: "묵묵히 곁을 지키는 안정감 마스터",
    summary: "기토일간은 농사짓는 땅처럼 묵묵히 상대를 길러내고 돌보는 가장 헌신적이고 현실적인 연애 타입이에요.",
    appearance: ["차분하고 정적인 분위기의 소유자", "디테일한 부분까지 챙기는 살뜰한 실속파", "뛰어난 생활력과 알뜰한 관리 능력"],
  },
  "庚": {
    headline: "흔들림 없는 신뢰, 강철 로맨티스트",
    summary: "경금일간은 사랑하는 사람에게 흔들림 없는 신뢰와 강력한 보호를 제공하는 의리파예요.",
    appearance: ["흔들림 없는 강인한 신념과 의지", "냉철하고 단호한 카리스마", "추진력과 결단력이 뛰어난 리더 타입"],
  },
  "辛": {
    headline: "예리한 완벽함, 빛나는 보석 같은 귀티",
    summary: "신금일간은 잘 연마된 보석처럼 자신을 꾸미고, 관계에서도 예리한 감각으로 최상의 완벽함을 추구하는 이상적인 연애 타입이에요.",
    appearance: ["예리하고 섬세한 완벽주의 성향", "냉철해 보이지만 의리가 강한 반전 매력", "깔끔하고 정제된 외모에서 풍기는 귀티"],
  },
  "壬": {
    headline: "깊은 지혜의 바다, 포용력 마스터",
    summary: "임수일간은 끝없이 넓은 바다처럼 모든 것을 담아낼 수 있는 포용력으로 상대를 이해하고 감싸주는 연애 타입이에요.",
    appearance: ["넓고 깊은 마음으로 타인을 포용하는 지혜", "넉넉하고 듬직하여 신뢰감을 주는 이미지", "철학적인 깊이가 느껴지는 사색가적 면모"],
  },
  "癸": {
    headline: "촉촉한 감성의 소유자, 예술적 영감의 샘",
    summary: "계수일간은 비나 이슬처럼 촉촉하고 섬세한 감성으로 상대를 위로하고 감싸주며, 조용히 헌신하는 연애 타입이에요.",
    appearance: ["감성이 풍부한 예술적 영감의 소유자", "차분함 속에 숨겨진 섬세한 감정 기복", "주변에 풍요와 안정을 가져다주는 매력"],
  },
};

// 오행 색상
const elementColors: Record<string, string> = {
  "木": "#2aa86c", wood: "#2aa86c", Wood: "#2aa86c",
  "火": "#ff6a6a", fire: "#ff6a6a", Fire: "#ff6a6a",
  "土": "#caa46a", earth: "#caa46a", Earth: "#caa46a",
  "金": "#9a9a9a", metal: "#9a9a9a", Metal: "#9a9a9a",
  "水": "#6aa7ff", water: "#6aa7ff", Water: "#6aa7ff",
};

const elementBgColors: Record<string, string> = {
  "木": "rgba(42, 168, 108, 0.12)", wood: "rgba(42, 168, 108, 0.12)", Wood: "rgba(42, 168, 108, 0.12)",
  "火": "rgba(255, 106, 106, 0.12)", fire: "rgba(255, 106, 106, 0.12)", Fire: "rgba(255, 106, 106, 0.12)",
  "土": "rgba(202, 164, 106, 0.12)", earth: "rgba(202, 164, 106, 0.12)", Earth: "rgba(202, 164, 106, 0.12)",
  "金": "rgba(154, 154, 154, 0.12)", metal: "rgba(154, 154, 154, 0.12)", Metal: "rgba(154, 154, 154, 0.12)",
  "水": "rgba(106, 167, 255, 0.12)", water: "rgba(106, 167, 255, 0.12)", Water: "rgba(106, 167, 255, 0.12)",
};

// 오행 한글 변환 함수 (음양 포함)
const getElementKorean = (element: string | undefined, yinYang?: string): string => {
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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const paymentWidgetRef = useRef<ReturnType<typeof window.PaymentWidget> | null>(null);
  const discountWidgetRef = useRef<ReturnType<typeof window.PaymentWidget> | null>(null);

  // 데이터 로드 (IndexedDB에서)
  useEffect(() => {
    if (!resultId) {
      router.push("/saju-love");
      return;
    }

    const loadData = async () => {
      const record = await getSajuLoveRecord(resultId);
      if (record) {
        setData(record);
        setIsLoading(false);

        trackPageView("saju_love_detail", {
          gender: record.input.gender,
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
      "00:30": "자시 (23:30~01:30)",
      "02:30": "축시 (01:30~03:30)",
      "04:30": "인시 (03:30~05:30)",
      "06:30": "묘시 (05:30~07:30)",
      "08:30": "진시 (07:30~09:30)",
      "10:30": "사시 (09:30~11:30)",
      "12:30": "오시 (11:30~13:30)",
      "14:30": "미시 (13:30~15:30)",
      "16:30": "신시 (15:30~17:30)",
      "18:30": "유시 (17:30~19:30)",
      "20:30": "술시 (19:30~21:30)",
      "22:30": "해시 (21:30~23:30)",
    };
    return timeMap[timeStr] || "";
  };

  // 결제 모달 열기 (또는 스킵 시 바로 결과 페이지로 이동)
  const openPaymentModal = async () => {
    if (!data) return;

    // 결제 스킵 모드: 바로 결과 페이지로 이동
    if (SKIP_PAYMENT) {
      const { markSajuLovePaid } = await import("@/lib/db/sajuLoveDB");
      await markSajuLovePaid(data.id);
      router.push(`/saju-love/result?id=${encodeURIComponent(data.id)}`);
      return;
    }

    trackPaymentModalOpen("saju_love", {
      id: data.id,
      price: PAYMENT_CONFIG.price,
    });

    setShowPaymentModal(true);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(PAYMENT_CONFIG.clientKey, customerKey);
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#saju-payment-method", {
          value: PAYMENT_CONFIG.price,
        });
        widget.renderAgreement("#saju-agreement");
      }
    }, 100);
  };

  // 결제 요청
  const handlePaymentRequest = async () => {
    if (!paymentWidgetRef.current || !data) return;

    try {
      await paymentWidgetRef.current.requestPayment({
        orderId: `saju-love_${Date.now()}`,
        orderName: PAYMENT_CONFIG.orderName,
        customerName: data.input.userName || "고객",
        successUrl: `${window.location.origin}/payment/success?type=saju&id=${encodeURIComponent(data.id)}`,
        failUrl: `${window.location.origin}/payment/fail?id=${encodeURIComponent(data.id)}&type=saju`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  };

  // 결제 모달 닫기 (할인 모달 열기)
  const closePaymentModal = () => {
    setShowPaymentModal(false);
    paymentWidgetRef.current = null;

    trackPaymentModalClose("saju_love", {
      id: data?.id,
      reason: "user_close",
    });

    // 1초 후 깜짝 할인 모달 열기
    setTimeout(() => {
      openDiscountModal();
    }, 1000);
  };

  // 할인 모달 열기
  const openDiscountModal = () => {
    if (!data) return;

    trackPaymentModalOpen("saju_love", {
      id: data.id,
      price: PAYMENT_CONFIG.discountPrice,
      is_discount: true,
    });

    setShowDiscountModal(true);

    setTimeout(() => {
      if (typeof window !== "undefined" && window.PaymentWidget) {
        const customerKey = `customer_${Date.now()}`;
        const widget = window.PaymentWidget(PAYMENT_CONFIG.clientKey, customerKey);
        discountWidgetRef.current = widget;

        widget.renderPaymentMethods("#saju-discount-method", {
          value: PAYMENT_CONFIG.discountPrice,
        });
        widget.renderAgreement("#saju-discount-agreement");
      }
    }, 100);
  };

  // 할인 결제 요청
  const handleDiscountPaymentRequest = async () => {
    if (!discountWidgetRef.current || !data) return;

    try {
      trackPaymentAttempt("saju_love", {
        id: data.id,
        price: PAYMENT_CONFIG.discountPrice,
        is_discount: true,
      });

      await discountWidgetRef.current.requestPayment({
        orderId: `saju-love-discount_${Date.now()}`,
        orderName: "AI 연애 사주 심층 분석 - 할인 특가",
        customerName: data.input.userName || "고객",
        successUrl: `${window.location.origin}/payment/success?type=saju&id=${encodeURIComponent(data.id)}`,
        failUrl: `${window.location.origin}/payment/fail?id=${encodeURIComponent(data.id)}&type=saju`,
      });
    } catch (err) {
      console.error("할인 결제 오류:", err);
    }
  };

  // 할인 모달 닫기
  const closeDiscountModal = () => {
    setShowDiscountModal(false);
    discountWidgetRef.current = null;

    trackPaymentModalClose("saju_love", {
      id: data?.id,
      reason: "user_close",
      is_discount: true,
    });
  };

  const getColor = (element: string | undefined) => {
    if (!element) return "#333";
    return elementColors[element] || elementColors[element.toLowerCase()] || "#333";
  };

  const getBgColor = (element: string | undefined) => {
    if (!element) return "transparent";
    return elementBgColors[element] || elementBgColors[element.toLowerCase()] || "transparent";
  };

  if (isLoading) {
    return (
      <div className="main_body_wrap">
        <div className="loading_wrap">
          <div className="loading_spinner" />
          <div className="loading_text">분석 결과를 불러오는 중...</div>
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
    wood: "木", fire: "火", earth: "土", metal: "金", water: "水",
  };
  const elementKey = dayMaster.element?.toLowerCase() || "";
  const elementHanja = elementKey ? elementHanjaMap[elementKey] || "" : "";

  return (
    <div className="main_body_wrap">
      {/* 뒤로가기 */}
      <Link href="/saju-love" className="back_btn">
        <span className="material-icons">arrow_back</span>
        <span className="back_btn_text">사주 다시 입력</span>
      </Link>

      {/* 결과 컨텐츠 */}
      <div className="result_wrap">
        {/* 섹션 1: 상단 이미지 + 정보 */}
        <section className="detail_section section_1">
          <div className="hero_image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/detail.png" alt="연애 사주" />
          </div>

          <div className="info_card">
            <div className="info_main">
              <span className="info_name">{input.userName}</span>
              <span className="info_birth">
                {input.date}{birthTime ? ` | ${birthTime}` : ""}
              </span>
            </div>
            <div className="info_ilju">
              <span className="ilju_char">{dayMaster.char}</span>
              <span className="ilju_title">{dayMaster.title}</span>
            </div>
          </div>

          {/* 사주 팔자 테이블 */}
          <div className="pillars_section">
            <div className="pillars_header">
              <span className="material-icons">view_column</span>
              사주 팔자
            </div>
            <div className="saju_table_wrap">
              <table className="saju_table">
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
                  <tr className="row_cheongan">
                    <td className="row_label">천간</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.stem?.char) return <td key={key} className="cell_empty">—</td>;
                      return (
                        <td key={key}>
                          <span className="char_main" style={{ color: getColor(p.stem.element) }}>
                            {p.stem.char}{p.stem.korean}
                          </span>
                          <span className="char_element" style={{ color: getColor(p.stem.element) }}>
                            {getElementKorean(p.stem.element, p.stem.yinYang)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 십성 (천간) */}
                  <tr className="row_sipsung">
                    <td className="row_label">십성</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td key={key} className="cell_sipsung" style={{ color: getColor(p?.stem?.element) }}>
                          {p?.tenGodStem || "—"}
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지지 */}
                  <tr className="row_jiji">
                    <td className="row_label">지지</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.branch?.char) return <td key={key} className="cell_empty">—</td>;
                      return (
                        <td key={key}>
                          <span className="char_main" style={{ color: getColor(p.branch.element) }}>
                            {p.branch.char}{p.branch.korean}
                          </span>
                          <span className="char_element" style={{ color: getColor(p.branch.element) }}>
                            {getElementKorean(p.branch.element, p.branch.yinYang)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 십성 (지지) */}
                  <tr className="row_sipsung">
                    <td className="row_label">십성</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td key={key} className="cell_sipsung" style={{ color: getColor(p?.branch?.element) }}>
                          {p?.tenGodBranchMain || "—"}
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지장간 */}
                  <tr className="row_extra">
                    <td className="row_label">지장간</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      const jijanggan = p?.jijanggan;
                      let displayValue = "—";
                      if (typeof jijanggan === 'string') {
                        displayValue = jijanggan;
                      } else if (jijanggan && typeof jijanggan === 'object') {
                        const obj = jijanggan as { display?: string; displayKorean?: string };
                        // 한자(한글) 형태로 표시
                        if (obj.display && obj.displayKorean) {
                          displayValue = `${obj.display}(${obj.displayKorean})`;
                        } else {
                          displayValue = obj.displayKorean || obj.display || "—";
                        }
                      }
                      return <td key={key} className="cell_extra">{displayValue}</td>;
                    })}
                  </tr>
                  {/* 12운성 */}
                  <tr className="row_extra">
                    <td className="row_label">12운성</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      // API에서는 twelveStage로 반환됨
                      const twelveStage = (p as unknown as { twelveStage?: string })?.twelveStage || p?.twelveUnsung;
                      const displayValue = typeof twelveStage === 'string'
                        ? twelveStage
                        : (twelveStage as unknown as { display?: string })?.display || "—";
                      return <td key={key} className="cell_extra">{displayValue}</td>;
                    })}
                  </tr>
                  {/* 12신살 */}
                  <tr className="row_extra">
                    <td className="row_label">12신살</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      const twelveSinsal = p?.twelveSinsal;
                      const displayValue = typeof twelveSinsal === 'string'
                        ? twelveSinsal
                        : (twelveSinsal as unknown as { display?: string })?.display || "—";
                      return <td key={key} className="cell_extra">{displayValue}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 신살과 길성 */}
          <div className="sinsal_section">
            <div className="sinsal_header">
              <span className="material-icons">auto_awesome</span>
              신살과 길성
            </div>
            <div className="sinsal_tags">
              {/* 활성화된 신살 태그들 */}
              {sajuData.sinsal?._active?.map((name, i) => {
                // 길성(귀인)은 파란색, 신살은 빨간색
                const isGilsung = name.includes("귀인") || name === "천의성";
                return (
                  <span key={i} className={`sinsal_tag ${isGilsung ? "gilsung" : ""}`}>
                    {name}
                  </span>
                );
              })}
              {/* 활성화된 신살이 없는 경우 */}
              {(!sajuData.sinsal?._active || sajuData.sinsal._active.length === 0) && (
                <span className="sinsal_empty">특이 신살 없음</span>
              )}
            </div>

            {/* 신살과 길성 테이블 */}
            <div className="sinsal_table_wrap">
              <table className="sinsal_table">
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
                  <tr>
                    <td className="row_label">천간</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td key={key}>
                          <span className="char_hanja" style={{ color: getColor(p?.stem?.element) }}>
                            {p?.stem?.char || "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 천간 신살/길성 */}
                  <tr>
                    <td className="row_label">신살</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const byPillar = sajuData.sinsal?._byPillar;
                      const stemSinsal = byPillar?.[key]?.stem || [];
                      return (
                        <td key={key} className="cell_gilsung">
                          {stemSinsal.length > 0 ? stemSinsal.join(", ") : "×"}
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지지 */}
                  <tr>
                    <td className="row_label">지지</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      return (
                        <td key={key}>
                          <span className="char_hanja" style={{ color: getColor(p?.branch?.element) }}>
                            {p?.branch?.char || "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지지 신살/길성 */}
                  <tr>
                    <td className="row_label">신살</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const byPillar = sajuData.sinsal?._byPillar;
                      const branchSinsal = byPillar?.[key]?.branch || [];
                      return (
                        <td key={key} className="cell_gilsung">
                          {branchSinsal.length > 0 ? branchSinsal.join(", ") : "×"}
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
        <section className="detail_section section_2">
          <div className="section_label">이성을 사로잡는</div>
          <div className="section_main_title">나의 결정적 매력</div>

          {dmData && (
            <>
              <div className="charm_headline_wrap">
                <span className="charm_quote">&ldquo;</span>
                <div className="charm_headline">{dmData.headline}</div>
                <span className="charm_quote">&rdquo;</span>
              </div>
              <div className="charm_ilgan_info">
                {dayMaster.title} | {dayMaster.char}{elementHanja}
              </div>

              <div className="charm_detail_wrap">
                <h3 className="charm_detail_title">내 일간 성향</h3>
                <p className="charm_detail_desc">{dmData.summary}</p>

                <div className="charm_appearance_wrap">
                  <h3 className="charm_detail_title">내 일간의 분위기</h3>
                  <ul className="charm_appearance_list">
                    {dmData.appearance.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  <div className="charm_appearance_fade" />
                </div>
              </div>
            </>
          )}

          {/* 이런 내용을 알려드려요 */}
          <div className="info_preview_box">
            <div className="info_preview_lock">
              <span className="material-icons">lock</span>
            </div>
            <div className="info_preview_header">
              <span>이런 내용을 알려드려요!</span>
            </div>
            <ul className="info_preview_list">
              <li>
                <span className="material-symbols-outlined">favorite</span>
                처음 본 순간 이성이 느끼는 나의 매력
              </li>
              <li>
                <span className="material-symbols-outlined">favorite</span>
                내 연애 스타일 장점과 숨겨진 반전 매력
              </li>
              <li>
                <span className="material-symbols-outlined">favorite</span>
                인만추 vs 자만추 vs 결정사, 나에게 맞는 방식은
              </li>
              <li>
                <span className="material-symbols-outlined">favorite</span>
                내가 끌리는 사람 vs 나에게 끌리는 사람
              </li>
            </ul>
          </div>
        </section>

        {/* 섹션 3: 하단 이미지 */}
        <section className="detail_section section_3">
          <div className="hero_image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/saju-love/img/deatil2.png" alt="운명의 상대" />
          </div>
        </section>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="bottom_fixed_btn">
        <button className="analyze_btn" onClick={openPaymentModal}>
          내 연애 사주 분석 받기
        </button>
      </div>

      {/* 결제 모달 */}
      {showPaymentModal && (
        <div className="payment-overlay" style={{ display: "block" }}>
          <div className="payment-fullscreen">
            <div className="modal-content">
              <div className="payment-header">
                <div className="payment-title">색동낭자 연애 사주팔자 분석</div>
                <div className="payment-close" onClick={closePaymentModal}>✕</div>
              </div>

              {/* 사주 요약 */}
              <div className="payment-saju-summary">
                <div className="saju-summary-row">
                  <span className="saju-summary-label">일간</span>
                  <span className="saju-summary-value">{dayMaster.char} ({dayMaster.title})</span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">신강/신약</span>
                  <span className="saju-summary-value">{sajuData.loveFacts?.dayMasterStrength || sajuData.fiveElements?.strength || "—"}</span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">도화살</span>
                  <span className="saju-summary-value">
                    {sajuData.loveFacts?.peachBlossom?.hasPeach || sajuData.sinsal?.도화살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">홍염살</span>
                  <span className="saju-summary-value">
                    {sajuData.sinsal?.홍염살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">화개살</span>
                  <span className="saju-summary-value">
                    {sajuData.sinsal?.화개살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">배우자운</span>
                  <span className="saju-summary-value">
                    {(sajuData.loveFacts?.spouseStars?.hitCount ?? 0) > 0
                      ? `${sajuData.loveFacts?.spouseTargetType} ${sajuData.loveFacts?.spouseStars?.hitCount}개`
                      : "없음"}
                  </span>
                </div>
              </div>

              <div className="payment-intro">
                <p>
                  사주 팔자 기반의 <strong>10,000자 이상</strong> 연애 심층 보고서
                </p>
              </div>

              <div className="report-wrap">
                <div className="report-section">
                  <div className="report-section-title">1장. 나만의 매력과 연애 성향</div>
                  <div className="report-section-desc">
                    처음 본 순간 이성이 느끼는 나의 매력, 내 연애 스타일 장점과 숨겨진 반전 매력, 인만추 vs 자만추 vs 결정사 중 나에게 맞는 방식, 내가 끌리는 사람 vs 나에게 끌리는 사람까지 분석합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">2장. 앞으로 펼쳐질 사랑의 흐름</div>
                  <div className="report-section-desc">
                    앞으로의 연애 총운 흐름, 향후 3년간 연애운 증폭 시기와 총 몇 번의 연애 기회가 있을지, 바로 지금 이번 달 연애 운세까지 상세하게 분석합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">3장. 결국 만나게 될 운명의 상대</div>
                  <div className="report-section-desc">
                    운명의 짝 그 사람의 외모, 성격, 직업군까지 모든 것, 언제 어떻게 만나게 될지, 그 사람을 끌어당길 나만의 공략법까지 구체적으로 풀이합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">4장. 운명이라 착각하는 가짜 인연</div>
                  <div className="report-section-desc">
                    내가 유독 약해지는 사람 유형, 운명이라고 착각하게 되는 이유, 가짜 인연을 거르는 방법을 알려드립니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">5장. 누구에게도 말 못할, 그 사람과의 스킨십</div>
                  <div className="report-section-desc">
                    상대를 홀리는 나의 성적 매력, 그 사람의 성적 매력, 그 사람과의 스킨십 궁합까지 은밀하게 풀이합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">6장. 색동낭자의 귀띔</div>
                  <div className="report-section-desc">
                    입력한 고민에 대해 사주 기반으로 뼈 때리는 직언과 현실적인 처방전을 1:1 맞춤 상담 형식으로 제공합니다.
                  </div>
                </div>
              </div>

              <div className="payment-price-wrap">
                <div className="payment-original-price-title">정가</div>
                <div className="payment-original-price">{PAYMENT_CONFIG.originalPrice.toLocaleString()}원</div>
              </div>

              <div className="payment-coupon-wrap">
                <div className="payment-coupon">출시 기념 할인</div>
              </div>
              <div className="payment-coupon-price-wrap">
                <div className="payment-coupon-title">출시 기념 오늘만 특별 할인</div>
                <div className="payment-coupon-price">-{(PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.price).toLocaleString()}원</div>
              </div>

              <div id="saju-payment-method" style={{ padding: 0, margin: 0 }} />
              <div id="saju-agreement" />

              <div className="payment-final-price-wrap">
                <div className="payment-final-price-title">최종 결제 금액</div>
                <div className="payment-final-price-price-wrap">
                  <div className="payment-originam-price2">{PAYMENT_CONFIG.originalPrice.toLocaleString()}원</div>
                  <div className="payment-final-price">
                    <div className="payment-final-price-discount">{Math.floor((1 - PAYMENT_CONFIG.price / PAYMENT_CONFIG.originalPrice) * 100)}%</div>
                    <div className="payment-final-price-num">{PAYMENT_CONFIG.price.toLocaleString()}원</div>
                  </div>
                </div>
              </div>
              <button className="payment-final-btn" onClick={handlePaymentRequest}>
                심층 분석 받기
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

              {/* 사주 요약 */}
              <div className="payment-saju-summary">
                <div className="saju-summary-row">
                  <span className="saju-summary-label">일간</span>
                  <span className="saju-summary-value">{dayMaster.char} ({dayMaster.title})</span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">신강/신약</span>
                  <span className="saju-summary-value">{sajuData.loveFacts?.dayMasterStrength || sajuData.fiveElements?.strength || "—"}</span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">도화살</span>
                  <span className="saju-summary-value">
                    {sajuData.loveFacts?.peachBlossom?.hasPeach || sajuData.sinsal?.도화살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">홍염살</span>
                  <span className="saju-summary-value">
                    {sajuData.sinsal?.홍염살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">화개살</span>
                  <span className="saju-summary-value">
                    {sajuData.sinsal?.화개살?.has ? "있음" : "없음"}
                  </span>
                </div>
                <div className="saju-summary-row">
                  <span className="saju-summary-label">배우자운</span>
                  <span className="saju-summary-value">
                    {(sajuData.loveFacts?.spouseStars?.hitCount ?? 0) > 0
                      ? `${sajuData.loveFacts?.spouseTargetType} ${sajuData.loveFacts?.spouseStars?.hitCount}개`
                      : "없음"}
                  </span>
                </div>
              </div>

              <div className="payment-intro">
                <p>
                  사주 팔자 기반의 <strong>10,000자 이상</strong> 연애 심층 보고서
                </p>
              </div>

              <div className="report-wrap">
                <div className="report-section">
                  <div className="report-section-title">1장. 나만의 매력과 연애 성향</div>
                  <div className="report-section-desc">
                    처음 본 순간 이성이 느끼는 나의 매력, 내 연애 스타일 장점과 숨겨진 반전 매력, 인만추 vs 자만추 vs 결정사 중 나에게 맞는 방식, 내가 끌리는 사람 vs 나에게 끌리는 사람까지 분석합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">2장. 앞으로 펼쳐질 사랑의 흐름</div>
                  <div className="report-section-desc">
                    앞으로의 연애 총운 흐름, 향후 3년간 연애운 증폭 시기와 총 몇 번의 연애 기회가 있을지, 바로 지금 이번 달 연애 운세까지 상세하게 분석합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">3장. 결국 만나게 될 운명의 상대</div>
                  <div className="report-section-desc">
                    운명의 짝 그 사람의 외모, 성격, 직업군까지 모든 것, 언제 어떻게 만나게 될지, 그 사람을 끌어당길 나만의 공략법까지 구체적으로 풀이합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">4장. 운명이라 착각하는 가짜 인연</div>
                  <div className="report-section-desc">
                    내가 유독 약해지는 사람 유형, 운명이라고 착각하게 되는 이유, 가짜 인연을 거르는 방법을 알려드립니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">5장. 누구에게도 말 못할, 그 사람과의 스킨십</div>
                  <div className="report-section-desc">
                    상대를 홀리는 나의 성적 매력, 그 사람의 성적 매력, 그 사람과의 스킨십 궁합까지 은밀하게 풀이합니다.
                  </div>
                </div>
                <div className="report-section">
                  <div className="report-section-title">6장. 색동낭자의 귀띔</div>
                  <div className="report-section-desc">
                    입력한 고민에 대해 사주 기반으로 뼈 때리는 직언과 현실적인 처방전을 1:1 맞춤 상담 형식으로 제공합니다.
                  </div>
                </div>
              </div>

              <div className="payment-price-wrap">
                <div className="payment-original-price-title">정가</div>
                <div className="payment-original-price">{PAYMENT_CONFIG.originalPrice.toLocaleString()}원</div>
              </div>

              <div className="payment-coupon-wrap">
                <div className="payment-coupon">출시 기념 할인 + 추가 할인</div>
              </div>
              <div className="payment-coupon-price-wrap">
                <div className="payment-coupon-title">출시 기념 특별 할인 + 추가 2천원 할인</div>
                <div className="payment-coupon-price">-{(PAYMENT_CONFIG.originalPrice - PAYMENT_CONFIG.discountPrice).toLocaleString()}원</div>
              </div>

              <div id="saju-discount-method" style={{ padding: 0, margin: 0 }} />
              <div id="saju-discount-agreement" />

              <div className="payment-final-price-wrap">
                <div className="payment-final-price-title">최종 결제 금액</div>
                <div className="payment-final-price-price-wrap">
                  <div className="payment-originam-price2">{PAYMENT_CONFIG.originalPrice.toLocaleString()}원</div>
                  <div className="payment-final-price">
                    <div className="payment-final-price-discount">{Math.floor((1 - PAYMENT_CONFIG.discountPrice / PAYMENT_CONFIG.originalPrice) * 100)}%</div>
                    <div className="payment-final-price-num">{PAYMENT_CONFIG.discountPrice.toLocaleString()}원</div>
                  </div>
                </div>
              </div>
              <button className="payment-final-btn" onClick={handleDiscountPaymentRequest}>
                할인가로 심층 분석 받기
              </button>
              <div className="payment-empty" />
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
        <div className="main_body_wrap">
          <div className="loading_wrap">
            <div className="loading_spinner" />
            <div className="loading_text">로딩 중...</div>
          </div>
        </div>
      }
    >
      <SajuDetailContent />
    </Suspense>
  );
}
