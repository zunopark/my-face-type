"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trackPaymentSuccess, trackPaymentFail, ServiceType } from "@/lib/mixpanel";
import { confirmPayment as confirmPaymentAction } from "@/app/actions/analyze";
import { createSajuAnalysis, getSajuAnalysisByShareId, updateSajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import { updateFaceAnalysisSupabase } from "@/lib/db/faceSupabaseDB";
import { getStoredUtmParams } from "@/components/providers/MixpanelProvider";

const MAX_RETRY = 3;
const BASE_DELAY = 1500;

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");
  const resultId = searchParams.get("id");
  const reportType = searchParams.get("type") || "base";
  const couponCode = searchParams.get("couponCode");
  const addonsParam = searchParams.get("addons");
  const selectedAddons = addonsParam ? addonsParam.split(",").filter(Boolean) : [];

  const [status, setStatus] = useState<"loading" | "success" | "fail">("loading");
  const [message, setMessage] = useState("🔄 결제 확인 중...");
  const [tipIdx, setTipIdx] = useState(0);

  const tips = [
    "🔄 결제 확인 중...",
    "⏳ 서버 응답 대기...",
    "📡 네트워크 재시도 준비...",
  ];

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus("fail");
      setMessage("❌ 잘못된 접근입니다.");
      return;
    }

    // 결제 성공 페이지 진입은 별도 추적 안함 (실제 성공시 아래서 추적)

    // 팁 스피너
    const spinner = setInterval(() => {
      setTipIdx((prev) => (prev + 1) % tips.length);
    }, 10000);

    handleConfirmPayment(1);

    return () => clearInterval(spinner);
  }, [paymentKey, orderId, amount]);

  useEffect(() => {
    if (status === "loading") {
      setMessage(tips[tipIdx]);
    }
  }, [tipIdx, status]);

  const handleConfirmPayment = async (attempt: number) => {
    try {
      const result = await confirmPaymentAction(
        paymentKey!,
        orderId!,
        Number(amount)
      );

      if (!result.success) {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : JSON.stringify(result.error) || "알 수 없는 오류";
        throw new Error(errorMsg);
      }

      // 결제 성공
      setStatus("success");
      setMessage("✅ 결제가 완료되었습니다!");

      // 쿠폰 사용 시 수량 차감 (할인 쿠폰용 - 무료 쿠폰은 각 detail 페이지에서 처리)
      if (couponCode) {
        try {
          const useRes = await fetch("/api/coupon/use", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: couponCode,
              serviceType: orderId?.startsWith("saju") ? "saju_love"
                : orderId?.startsWith("new-year") ? "new_year"
                : orderId?.startsWith("couple") ? "couple"
                : "face",
            }),
          });
          const useResult = await useRes.json();
          if (!useResult.success) {
            console.error("쿠폰 수량 차감 실패:", useResult.error);
          }
        } catch (couponErr) {
          console.error("쿠폰 수량 차감 실패:", couponErr);
        }
      }

      // 결제 성공 추적
      const serviceTypeMap: Record<string, ServiceType> = {
        saju: "saju_love",
        new_year: "new_year",
        couple: "couple",
        base: "face",
        wealth: "face",
        love: "face",
        marriage: "face",
        career: "face",
      };
      const serviceType = serviceTypeMap[reportType] || "face";

      // Supabase에서 사용자 정보 조회 (Mixpanel + Slack 공용)
      let userName: string | null = null;
      let supabaseData: Awaited<ReturnType<typeof getSajuAnalysisByShareId>> = null;
      if (resultId && (reportType === "saju" || reportType === "new_year")) {
        supabaseData = await getSajuAnalysisByShareId(resultId);
        userName = supabaseData?.user_info?.userName || null;
      }

      // 사주 결제인 경우 상세 정보 추가
      if (reportType === "saju" && resultId) {
        if (supabaseData) {
          trackPaymentSuccess(serviceType, {
            order_id: orderId,
            amount: Number(amount),
            result_id: resultId,
            report_type: reportType,
            user_name: supabaseData.user_info?.userName,
            gender: supabaseData.user_info?.gender,
            birth_date: supabaseData.user_info?.date,
            birth_time: supabaseData.user_info?.time || "모름",
            calendar: supabaseData.user_info?.calendar,
            status: supabaseData.user_info?.status,
            user_concern: supabaseData.user_info?.userConcern,
          });
        } else {
          trackPaymentSuccess(serviceType, {
            order_id: orderId,
            amount: Number(amount),
            result_id: resultId,
            report_type: reportType,
          });
        }
      } else if (reportType === "new_year" && resultId) {
        if (supabaseData) {
          trackPaymentSuccess(serviceType, {
            order_id: orderId,
            amount: Number(amount),
            result_id: resultId,
            report_type: reportType,
            user_name: supabaseData.user_info?.userName,
            gender: supabaseData.user_info?.gender,
            birth_date: supabaseData.user_info?.date,
            birth_time: supabaseData.user_info?.time || "모름",
            calendar: supabaseData.user_info?.calendar,
          });
        } else {
          trackPaymentSuccess(serviceType, {
            order_id: orderId,
            amount: Number(amount),
            result_id: resultId,
            report_type: reportType,
          });
        }
      } else {
        trackPaymentSuccess(serviceType, {
          order_id: orderId,
          amount: Number(amount),
          result_id: resultId,
          report_type: reportType,
        });
      }

      // UTM 정보 조회 (인플루언서 연결)
      let utmSource: string | null = null;
      let influencerId: string | null = null;
      let influencerName: string | null = null;
      try {
        const utmParams = getStoredUtmParams();
        if (utmParams.utm_source) {
          utmSource = utmParams.utm_source;
          const infRes = await fetch(`/api/admin/influencers?slug=${encodeURIComponent(utmSource)}`);
          if (infRes.ok) {
            const infData = await infRes.json();
            if (infData && infData.id) {
              influencerId = infData.id;
              influencerName = infData.name || null;
            }
          }
        }
      } catch (utmErr) {
        console.error("UTM 정보 조회 실패:", utmErr);
      }

      // Slack 결제 알림
      fetch("/api/slack/payment-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType,
          userName: userName || "-",
          amount: Number(amount),
          couponCode: couponCode || null,
          influencerName: influencerName || null,
          gender: supabaseData?.user_info?.gender || null,
          birthDate: supabaseData?.user_info?.date || null,
          birthTime: supabaseData?.user_info?.time || null,
          wish: supabaseData?.user_info?.wish2026 || supabaseData?.user_info?.userConcern || null,
        }),
      }).catch((err) => console.error("Slack 알림 실패:", err));

      // 결제 정보 업데이트
      if (resultId) {
        try {
          if (reportType === "saju") {
            // 사주 결제인 경우 - Supabase만 업데이트
            const isDiscount = orderId?.includes("discount") || !!couponCode;
            const paymentInfo = {
              method: "toss" as const,
              price: Number(amount),
              isDiscount,
              ...(couponCode ? { couponCode } : {}),
            };

            await updateSajuAnalysis(resultId, {
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_info: paymentInfo,
            });
            console.log("✅ Supabase 결제 상태 업데이트 완료");
          } else if (reportType === "new_year") {
            // 신년 사주 결제인 경우 - Supabase만 업데이트
            const isDiscount = orderId?.includes("discount") || !!couponCode;
            const paymentInfo = {
              method: "toss" as const,
              price: Number(amount),
              isDiscount,
              ...(couponCode ? { couponCode } : {}),
            };

            await updateSajuAnalysis(resultId, {
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_info: paymentInfo,
            });
            console.log("✅ Supabase 신년사주 결제 상태 업데이트 완료");
          } else if (reportType === "couple") {
            // 궁합 결제 - Supabase만 업데이트
            await updateFaceAnalysisSupabase(resultId, {
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_info: { method: "toss" as const, price: Number(amount), ...(couponCode ? { couponCode } : {}) },
            });
            console.log("✅ Supabase 궁합 결제 상태 업데이트 완료");
          } else {
            // 관상 결제 - Supabase만 업데이트
            await updateFaceAnalysisSupabase(resultId, {
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_info: {
                method: "toss" as const,
                price: Number(amount),
                ...(couponCode ? { couponCode } : {}),
                selected_addons: selectedAddons,
              },
            });
            console.log("✅ Supabase 관상 결제 상태 업데이트 완료");
          }
        } catch (e) {
          console.error("결제 정보 업데이트 실패:", e);
        }
      }

      // 2초 후 결과 페이지로 이동
      setTimeout(() => {
        if (reportType === "saju") {
          router.push(`/saju-love/result?id=${resultId}`);
        } else if (reportType === "new_year") {
          router.push(`/new-year/result?id=${resultId}`);
        } else if (reportType === "couple") {
          router.push(`/couple/result?id=${resultId}`);
        } else {
          router.push(`/face/result?id=${resultId}`);
        }
      }, 2000);
    } catch (err) {
      console.warn(`⚠️ [${attempt}] 확인 실패:`, err);

      if (attempt < MAX_RETRY) {
        setMessage(`🔄 재시도 ${attempt}/${MAX_RETRY}…`);
        const delay = BASE_DELAY * Math.pow(2, attempt - 1);
        setTimeout(() => handleConfirmPayment(attempt + 1), delay);
      } else {
        setStatus("fail");
        setMessage("❌ 결제 확인 실패. 다시 시도해 주세요.");

        // 결제 실패 추적
        const serviceTypeMap: Record<string, ServiceType> = {
          saju: "saju_love",
          new_year: "new_year",
          couple: "couple",
          base: "face",
        };
        const serviceType = serviceTypeMap[reportType] || "face";

        trackPaymentFail(serviceType, {
          error: err instanceof Error ? err.message : "Unknown error",
          order_id: orderId,
          amount: Number(amount),
          result_id: resultId,
        });
      }
    }
  };

  const handleRetry = () => {
    setStatus("loading");
    setMessage("🔄 결제 확인 재시도 중...");
    handleConfirmPayment(1);
  };

  return (
    <div className="success-page">
      <h2 id="status" className={status === "success" ? "success" : status === "fail" ? "fail" : ""}>
        {message}
      </h2>
      <p>잠시만 기다려주세요.</p>
      {status === "fail" && (
        <button id="retryBtn" onClick={handleRetry}>
          다시 시도
        </button>
      )}

      <style jsx>{`
        .success-page {
          font-family: sans-serif;
          text-align: center;
          padding: 40px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        h2 {
          font-size: 20px;
          margin-bottom: 12px;
        }
        .success {
          color: green;
        }
        .fail {
          color: red;
        }
        p {
          color: #666;
          margin-bottom: 24px;
        }
        #retryBtn {
          margin-top: 24px;
          padding: 10px 16px;
          font-size: 16px;
          cursor: pointer;
          background: #ffbe0a;
          border: none;
          border-radius: 8px;
          font-weight: 700;
        }
        #retryBtn:hover {
          background: #f5aa00;
        }
      `}</style>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: "40px" }}>
          <h2>🔄 결제 확인 중...</h2>
          <p>잠시만 기다려주세요.</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
