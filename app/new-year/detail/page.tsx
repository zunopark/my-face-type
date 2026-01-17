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
  getNewYearRecord,
  NewYearRecord,
  saveNewYearRecord,
} from "@/lib/db/newYearDB";
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
  price: 26900,
  originalPrice: 49800,
  studentPrice: 4900,
  orderName: "AI 2026 신년 운세 심층 분석",
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

  // 데이터 로드
  useEffect(() => {
    if (!resultId) {
      router.push("/new-year");
      return;
    }

    const loadData = async () => {
      const record = await getNewYearRecord(resultId);

      if (record) {
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
      } else {
        router.push("/new-year");
      }
    };

    loadData();
  }, [resultId, router]);

  // 학생 모달 자동 표시
  useEffect(() => {
    if (data && !isLoading) {
      const age = calculateAge(data.input.date);
      const isStudentUser = age < 20;
      if (isStudentUser && !studentCouponApplied) {
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

    const paymentPrice = studentCouponApplied
      ? PAYMENT_CONFIG.studentPrice
      : PAYMENT_CONFIG.price;

    trackPaymentModalOpen("new_year", {
      id: data.id,
      price: paymentPrice,
      is_student: studentCouponApplied,
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
          customerKey
        );
        paymentWidgetRef.current = widget;

        widget.renderPaymentMethods("#new-year-payment-method", {
          value: paymentPrice,
        });
        widget.renderAgreement("#new-year-agreement");
      }
    }, 100);
  }, [data, studentCouponApplied]);

  // 무료 쿠폰 코드 목록
  const FREE_COUPONS = ["newyearfree", "2026free", "yangban2026"];

  // 쿠폰 적용
  const handleCouponSubmit = useCallback(async () => {
    if (!data || !couponCode.trim()) return;

    const code = couponCode.trim().toLowerCase();

    // 무료 쿠폰 체크 - 바로 결과 페이지로 이동
    if (FREE_COUPONS.includes(code)) {
      setCouponError("");

      // 결제 완료 처리
      await saveNewYearRecord({
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

      // 결과 페이지로 이동
      router.push(`/new-year/result?id=${data.id}`);
      return;
    }

    // 할인 쿠폰 체크
    let discount = 0;
    if (code === "newyear10000") {
      discount = 10000;
    } else if (code === "newyear5000") {
      discount = 5000;
    }

    if (discount > 0) {
      setCouponError("");
      setAppliedCoupon({ code: couponCode, discount });

      if (paymentWidgetRef.current) {
        const newPrice = PAYMENT_CONFIG.price - discount;
        paymentWidgetRef.current.renderPaymentMethods("#new-year-payment-method", {
          value: newPrice,
        });
      }
    } else {
      setCouponError("유효하지 않은 쿠폰입니다");
    }
  }, [data, couponCode, router]);

  // 결제 요청
  const handlePaymentRequest = useCallback(async () => {
    if (!paymentWidgetRef.current || !data) return;

    const basePrice = studentCouponApplied
      ? PAYMENT_CONFIG.studentPrice
      : PAYMENT_CONFIG.price;

    const finalPrice = appliedCoupon
      ? basePrice - appliedCoupon.discount
      : basePrice;

    trackPaymentAttempt("new_year", {
      id: data.id,
      price: finalPrice,
      is_student: studentCouponApplied,
      is_discount: !!appliedCoupon,
      coupon_code: appliedCoupon?.code,
      user_name: data.input.userName,
      gender: data.input.gender,
      birth_date: data.input.date,
      day_master: data.sajuData.dayMaster?.char,
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
        orderId: `new-year${orderSuffix}_${Date.now()}`,
        orderName: `${PAYMENT_CONFIG.orderName}${orderNameSuffix}`,
        customerName: data.input.userName || "고객",
        successUrl: `${
          window.location.origin
        }/payment/success?type=new_year&id=${encodeURIComponent(data.id)}`,
        failUrl: `${
          window.location.origin
        }/payment/fail?id=${encodeURIComponent(data.id)}&type=new_year`,
      });
    } catch (err) {
      console.error("결제 오류:", err);
    }
  }, [data, appliedCoupon, studentCouponApplied]);

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
  const pillars = sajuData.pillars as Record<string, {
    stem?: { char?: string; korean?: string; element?: string; yinYang?: string };
    branch?: { char?: string; korean?: string; element?: string; yinYang?: string };
    tenGodStem?: string;
    tenGodBranchMain?: string;
  }>;
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
      <button className={styles.back_btn} onClick={() => router.push("/new-year")}>
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>정보 다시 입력</span>
      </button>

      {/* 결과 컨텐츠 */}
      <div className={styles.result_wrap}>
        {/* 섹션 1: 상단 이미지 + 정보 */}
        <section className={`${styles.detail_section} ${styles.section_1}`}>
          <div className={styles.hero_image}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/new-year/img/detail.png" alt="2026 신년 운세" />
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

        {/* 섹션 2: 내 사주와 2026년 궁합 */}
        <section className={`${styles.detail_section} ${styles.section_2}`}>
          <div className={styles.section_label}>60년에 한번, 불기둥의 해</div>
          <div className={styles.section_main_title}>내 사주와 2026년 궁합</div>

          {/* 사주 궁합 테이블 */}
          <div className={styles.compatibility_table_wrap}>
            <div className={styles.compatibility_left}>
              <div className={styles.compatibility_label}>내 사주 팔자</div>
              <div className={styles.compatibility_pillars}>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  return (
                    <div key={key} className={styles.compatibility_pillar}>
                      <div
                        className={styles.compat_stem}
                        style={{
                          backgroundColor: p?.stem?.char
                            ? `${getColor(p.stem.element)}20`
                            : "#f5f5f5",
                          borderColor: p?.stem?.char
                            ? getColor(p.stem.element)
                            : "#ddd",
                        }}
                      >
                        <span
                          className={styles.compat_char}
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {p?.stem?.char || "—"}
                          {p?.stem?.korean || ""}
                        </span>
                        <span
                          className={styles.compat_element}
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {getElementKorean(p?.stem?.element, p?.stem?.yinYang) || ""}
                        </span>
                      </div>
                      <div
                        className={styles.compat_branch}
                        style={{
                          backgroundColor: p?.branch?.char
                            ? `${getColor(p.branch.element)}20`
                            : "#f5f5f5",
                          borderColor: p?.branch?.char
                            ? getColor(p.branch.element)
                            : "#ddd",
                        }}
                      >
                        <span
                          className={styles.compat_char}
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {p?.branch?.char || "—"}
                          {p?.branch?.korean || ""}
                        </span>
                        <span
                          className={styles.compat_element}
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {getElementKorean(p?.branch?.element, p?.branch?.yinYang) || ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.compatibility_plus}>+</div>

            <div className={styles.compatibility_right}>
              <div className={styles.compatibility_label}>2026년</div>
              <div className={styles.compatibility_pillars}>
                <div className={`${styles.compatibility_pillar} ${styles.year_2026}`}>
                  <div
                    className={styles.compat_stem}
                    style={{
                      backgroundColor: "rgba(255, 106, 106, 0.15)",
                      borderColor: "#ff6a6a",
                    }}
                  >
                    <span className={styles.compat_char} style={{ color: "#ff6a6a" }}>
                      병丙
                    </span>
                    <span className={styles.compat_element} style={{ color: "#ff6a6a" }}>
                      +화
                    </span>
                  </div>
                  <div
                    className={styles.compat_branch}
                    style={{
                      backgroundColor: "rgba(255, 106, 106, 0.15)",
                      borderColor: "#ff6a6a",
                    }}
                  >
                    <span className={styles.compat_char} style={{ color: "#ff6a6a" }}>
                      오午
                    </span>
                    <span className={styles.compat_element} style={{ color: "#ff6a6a" }}>
                      -화
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 블러 처리된 궁합 설명 */}
          <div className={styles.blurred_content_section}>
            <p className={styles.blurred_intro}>
              <strong>불의 기운이 강한</strong> 올 해는 당신의
            </p>
            <div className={styles.blurred_text_block}>
              <p>창의력과 표현력이 극대화되는 시기입니다. 특히 화(火)의 에너지가 당신의 사주와 만나 새로운 가능성을 열어줄 것입니다.</p>
            </div>
          </div>

          {/* 생존 필살기 섹션 */}
          <div className={styles.survival_section}>
            <p className={styles.survival_subtitle}>당신의 사주에 나타난,</p>
            <h3 className={styles.survival_title}>2026년 나의 생존 필살기</h3>

            {dmData && (
              <div className={styles.charm_headline_wrap}>
                <span className={styles.charm_quote}>"</span>
                <div className={styles.charm_headline}>{dmData.headline}</div>
                <span className={styles.charm_quote}>"</span>
              </div>
            )}

            {/* 블러 처리된 콘텐츠들 */}
            <div className={styles.blurred_content_section}>
              <p className={styles.blurred_intro}>올해는 당신의 재능 중,</p>
              <div className={styles.blurred_text_block}>
                <p>숨겨져 있던 리더십과 커뮤니케이션 능력이 빛을 발하게 됩니다. 주변 사람들에게 영향력을 미치는 역할을 맡게 될 가능성이 높아요.</p>
              </div>
            </div>

            <div className={styles.blurred_content_section}>
              <p className={styles.blurred_intro}>
                <strong>나에게 맞는 돈 버는 수단:</strong> 투자 vs 사업
              </p>
              <div className={styles.blurred_text_block}>
                <p>당신의 사주 구성을 보면 안정적인 수입원을 기반으로 부수입을 늘려가는 전략이 유리합니다. 무리한 투자보다는 실력을 쌓는 데 집중하세요.</p>
              </div>
            </div>
          </div>

          {/* 잠금 미리보기 박스 */}
          <div className={`${styles.info_preview_box} ${styles.locked}`}>
            <div className={styles.lock_icon}>
              <span className="material-icons">lock</span>
            </div>
            <div className={styles.preview_title}>이런 내용을 알려드려요!</div>
            <ul className={styles.preview_list}>
              <li>2026년 병오년과 내 사주의 오행 궁합 분석</li>
              <li>올해 발현될 나의 역량, 일잘러 포인트</li>
              <li>나에게 맞는 돈 버는 수단 (직장 vs 투자 vs 부업)</li>
              <li>찾아올 수 있는 위기 vs 기회 키워드</li>
            </ul>
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

        {/* 가격 비교 섹션 */}
        <div className={styles.price_compare_section}>
          <p className={styles.price_compare_title}>
            까치도령 신년 운세 분석 보고서 복채
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

          <div className={styles.price_vs}>VS</div>

          <div className={styles.our_price_section}>
            <div className={styles.our_price_badge}>까치도령 신년 운세</div>
            <div className={styles.our_price_original}>
              정가 <s>{PAYMENT_CONFIG.originalPrice.toLocaleString()}원</s>
            </div>
            <div className={styles.our_price_final}>
              {PAYMENT_CONFIG.price.toLocaleString()}원
            </div>
            <div className={styles.our_price_discount}>
              {Math.floor(
                (1 - PAYMENT_CONFIG.price / PAYMENT_CONFIG.originalPrice) * 100
              )}
              % 할인
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 버튼 */}
      <div className={styles.bottom_fixed_btn}>
        <button className={styles.analyze_btn} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
          준비중입니다
        </button>
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
              학생분들의 새해를 응원해요!
              <br />
              학생이시면 <strong>커피 한 잔</strong>에 풀이하고 있어요
            </p>
            <ul className={styles.student_modal_list}>
              <li>20,000자 신년 운세 심층 분석</li>
              <li>2026년 월별 운세 캘린더</li>
              <li>재물운, 직장운, 건강운, 연애운</li>
              <li className={styles.bonus}>보너스: 나만의 행운 부적</li>
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
                    : "까치도령 신년 운세 복채"}
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
                    까치도령 신년 운세 20,000자 보고서
                  </span>
                  <span className={styles["payment-row-value"]}>
                    {PAYMENT_CONFIG.originalPrice.toLocaleString()}원
                  </span>
                </div>

                {/* 할인 */}
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

                {/* 쿠폰 할인 */}
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

              {/* 쿠폰 입력 */}
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
                  id="new-year-payment-method"
                  style={{ padding: 0, margin: 0 }}
                />
                <div id="new-year-agreement" />
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
