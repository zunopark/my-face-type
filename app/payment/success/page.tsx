"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trackPaymentSuccess, trackPaymentFail, ServiceType } from "@/lib/mixpanel";
import { confirmPayment as confirmPaymentAction } from "@/app/actions/analyze";
import { markSajuLovePaid, getSajuLoveRecord } from "@/lib/db/sajuLoveDB";
import { markFaceReportPaid } from "@/lib/db/faceAnalysisDB";
import { markCoupleAnalysisPaid } from "@/lib/db/coupleAnalysisDB";
import { createSajuAnalysis, getSajuAnalysisByShareId, updateSajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import { uploadSajuLoveImages } from "@/lib/storage/imageStorage";

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

      // 결제 성공 추적
      const serviceTypeMap: Record<string, ServiceType> = {
        saju: "saju_love",
        couple: "couple",
        base: "face",
        wealth: "face",
        love: "face",
        marriage: "face",
        career: "face",
      };
      const serviceType = serviceTypeMap[reportType] || "face";

      // 사주 결제인 경우 상세 정보 추가
      if (reportType === "saju" && resultId) {
        const sajuRecord = await getSajuLoveRecord(resultId);
        if (sajuRecord) {
          trackPaymentSuccess(serviceType, {
            order_id: orderId,
            amount: Number(amount),
            result_id: resultId,
            report_type: reportType,
            // 유저 입력 정보
            user_name: sajuRecord.input.userName,
            gender: sajuRecord.input.gender,
            birth_date: sajuRecord.input.date,
            birth_time: sajuRecord.input.time || "모름",
            calendar: sajuRecord.input.calendar,
            status: sajuRecord.input.status,
            user_concern: sajuRecord.input.userConcern,
            // 사주 정보
            day_master: sajuRecord.sajuData.dayMaster?.char,
            day_master_title: sajuRecord.sajuData.dayMaster?.title,
            day_master_element: sajuRecord.sajuData.dayMaster?.element,
            day_master_yinyang: sajuRecord.sajuData.dayMaster?.yinYang,
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

      // 결제 정보 업데이트
      if (resultId) {
        try {
          if (reportType === "saju") {
            // 사주 결제인 경우
            const isDiscount = orderId?.includes("discount") || false;
            const paymentInfo = {
              method: "toss" as const,
              price: Number(amount),
              isDiscount,
            };

            // IndexedDB 업데이트
            await markSajuLovePaid(resultId, paymentInfo);

            // Supabase 결제 상태 업데이트
            const sajuRecord = await getSajuLoveRecord(resultId);
            if (sajuRecord) {
              const existsInSupabase = await getSajuAnalysisByShareId(resultId);
              if (existsInSupabase) {
                // 이미 있으면 결제 상태만 업데이트
                await updateSajuAnalysis(resultId, {
                  is_paid: true,
                  paid_at: new Date().toISOString(),
                  payment_info: paymentInfo,
                });
                console.log("✅ Supabase 결제 상태 업데이트 완료");
              } else {
                // 없으면 새로 생성
                // 이미지 Storage에 업로드
                const imagePaths: string[] = [];
                if (sajuRecord.loveAnalysis?.ideal_partner_image?.image_base64 ||
                    sajuRecord.loveAnalysis?.avoid_type_image?.image_base64) {
                  try {
                    const uploadedImages = await uploadSajuLoveImages(resultId, {
                      idealPartner: sajuRecord.loveAnalysis?.ideal_partner_image?.image_base64,
                      avoidType: sajuRecord.loveAnalysis?.avoid_type_image?.image_base64,
                    });
                    if (uploadedImages.idealPartner) imagePaths.push(uploadedImages.idealPartner.path);
                    if (uploadedImages.avoidType) imagePaths.push(uploadedImages.avoidType.path);
                  } catch (imgErr) {
                    console.error("이미지 업로드 실패:", imgErr);
                  }
                }

                // Supabase DB에 저장
                await createSajuAnalysis({
                  service_type: "saju_love",
                  id: resultId,
                  user_info: {
                    userName: sajuRecord.input.userName,
                    gender: sajuRecord.input.gender,
                    date: sajuRecord.input.date,
                    calendar: sajuRecord.input.calendar as "solar" | "lunar",
                    time: sajuRecord.input.time,
                    userConcern: sajuRecord.input.userConcern,
                    status: sajuRecord.input.status,
                  },
                  raw_saju_data: sajuRecord.rawSajuData || null,
                  analysis_result: sajuRecord.loveAnalysis ? {
                    ...sajuRecord.loveAnalysis,
                    // base64 이미지 제거 (Storage에 저장됨)
                    ideal_partner_image: sajuRecord.loveAnalysis.ideal_partner_image ? {
                      prompt: sajuRecord.loveAnalysis.ideal_partner_image.prompt,
                      storage_path: imagePaths[0],
                    } : undefined,
                    avoid_type_image: sajuRecord.loveAnalysis.avoid_type_image ? {
                      prompt: sajuRecord.loveAnalysis.avoid_type_image.prompt,
                      storage_path: imagePaths[1],
                    } : undefined,
                  } : null,
                  image_paths: imagePaths,
                  is_paid: true,
                  paid_at: new Date().toISOString(),
                  payment_info: paymentInfo,
                });
                console.log("✅ Supabase에 사주 분석 결과 저장 완료");
              }
            }
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

        // 결제 실패 추적
        const serviceTypeMap: Record<string, ServiceType> = {
          saju: "saju_love",
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
