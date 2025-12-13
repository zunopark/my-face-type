"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/mixpanel";

function FailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const resultId = searchParams.get("id");
  const reportType = searchParams.get("type") || "base";
  const errorCode = searchParams.get("code");
  const errorMessage = searchParams.get("message");

  useEffect(() => {
    track("관상 결제 실패 페이지 진입", {
      resultId,
      reportType,
      errorCode,
      errorMessage,
    });
  }, [resultId, reportType, errorCode, errorMessage]);

  const handleGoToReport = () => {
    if (resultId && reportType) {
      if (reportType === "couple") {
        router.push(`/couple/result?id=${resultId}`);
      } else {
        router.push(`/face/result?id=${resultId}`);
      }
    } else {
      router.push("/");
    }
  };

  return (
    <div className="fail-page">
      <h2 className="fail">❌ 결제가 취소되었거나 실패했습니다.</h2>
      <p>다시 시도하거나 보고서 페이지로 이동할 수 있어요.</p>
      <button id="go-report-button" onClick={handleGoToReport}>
        보고서 페이지로 이동
      </button>

      <style jsx>{`
        .fail-page {
          background-color: #121212;
          color: #f0f0f0;
          font-family: "Pretendard", sans-serif;
          text-align: center;
          padding: 60px 20px;
          min-height: 100vh;
        }
        h2.fail {
          font-size: 22px;
          color: #ff4d4f;
          margin-bottom: 12px;
        }
        p {
          color: #bbbbbb;
          font-size: 15px;
          margin-bottom: 30px;
        }
        #go-report-button {
          background-color: #ffbe0a;
          color: #111;
          font-weight: 700;
          font-size: 15px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(255, 190, 10, 0.3);
          transition: background-color 0.2s;
        }
        #go-report-button:hover {
          background-color: #f5aa00;
        }
      `}</style>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ backgroundColor: "#121212", minHeight: "100vh" }} />
      }
    >
      <FailContent />
    </Suspense>
  );
}
