"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { track } from "@/lib/mixpanel";
import { confirmPayment as confirmPaymentAction } from "@/app/actions/analyze";
import { markSajuLovePaid } from "@/lib/db/sajuLoveDB";
import { markFaceReportPaid } from "@/lib/db/faceAnalysisDB";
import { markCoupleAnalysisPaid } from "@/lib/db/coupleAnalysisDB";

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

    track("관상 결제 성공 페이지 진입", {
      url: window.location.href,
      ua: navigator.userAgent,
      ts: new Date().toISOString(),
    });

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
        throw new Error(result.error);
      }

      // 결제 성공
      setStatus("success");
      setMessage("✅ 결제가 완료되었습니다!");

      track("관상 결제 성공", {
        orderId,
        amount,
        paymentKey,
        resultId,
        reportType,
        ts: new Date().toISOString(),
      });

      // 결제 정보 업데이트
      if (resultId) {
        try {
          if (reportType === "saju") {
            // 사주 결제인 경우
            await markSajuLovePaid(resultId);
          } else if (reportType === "couple") {
            // 궁합 결제인 경우
            await markCoupleAnalysisPaid(resultId);
          } else {
            // 관상 결제인 경우 (base, wealth, love, marriage, career)
            await markFaceReportPaid(resultId, reportType as "base" | "wealth" | "love" | "marriage" | "career");
          }
        } catch (e) {
          console.error("결제 정보 업데이트 실패:", e);
        }
      }

      // 2초 후 결과 페이지로 이동
      setTimeout(() => {
        if (reportType === "saju") {
          router.push(`/saju-love/result?id=${resultId}`);
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

        track("관상 결제 실패", {
          error: err instanceof Error ? err.message : "Unknown error",
          orderId,
          amount,
          paymentKey,
          resultId,
          ts: new Date().toISOString(),
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
