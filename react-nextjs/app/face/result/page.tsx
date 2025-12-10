"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { analyzeFaceFeatures } from "@/app/actions/analyze";
import Footer from "@/components/layout/Footer";

// 저장된 결과 타입
interface FaceResult {
  id: string;
  imageBase64: string;
  features: string;
  paid: boolean;
  timestamp: string;
  summary?: string;
  detail?: string;
  sections?: {
    face_reading?: string;
    love?: string;
    career?: string;
    wealth?: string;
    health?: string;
  };
  reports: {
    base: { paid: boolean; data: unknown };
    wealth: { paid: boolean; data: unknown };
    love: { paid: boolean; data: unknown };
    marriage: { paid: boolean; data: unknown };
    career: { paid: boolean; data: unknown };
  };
}

// 가라 분석 메시지
const FAKE_ANALYSIS_MESSAGES = [
  "관상학 분석 중",
  "오관(눈, 코, 입, 귀, 눈썹)을 분석 중입니다...",
  "삼정(이마, 코, 턱 세 구역)을 분석 중입니다...",
  "12궁을 통해 재물운을 분석 중입니다...",
  "12궁을 통해 건강운을 분석 중입니다...",
  "12궁을 통해 연애운을 분석 중입니다...",
  "12궁을 통해 직업운을 분석 중입니다...",
  "전체 관상을 종합하는 중입니다...",
  "관상학 보고서 작성 중",
  "최종 정리 중...",
];

// 섹션 설정
const SECTION_CONFIG = [
  { key: "face_reading", title: "부위별 관상 심층 풀이" },
  { key: "love", title: "연애운 심층 풀이" },
  { key: "career", title: "직업운 심층 풀이" },
  { key: "wealth", title: "재물운 심층 풀이" },
  { key: "health", title: "건강운 심층 풀이" },
];

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [result, setResult] = useState<FaceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 가라 분석 상태
  const [showFakeAnalysis, setShowFakeAnalysis] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeMessage, setFakeMessage] = useState(FAKE_ANALYSIS_MESSAGES[0]);

  // 결제 유도 페이지 표시 여부
  const [showPaymentPage, setShowPaymentPage] = useState(false);

  // 실제 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // 결과 렌더링 상태
  const [showResult, setShowResult] = useState(false);

  // localStorage에서 결과 가져오기
  useEffect(() => {
    if (!resultId) {
      router.push("/");
      return;
    }

    const stored = localStorage.getItem(`face_result_${resultId}`);
    if (stored) {
      const parsed = JSON.parse(stored) as FaceResult;
      setResult(parsed);

      // 이미 분석 완료된 경우 바로 결과 표시
      if (parsed.summary && parsed.detail) {
        setShowResult(true);
        setIsLoading(false);
        return;
      }

      // 결제 완료 상태면 바로 분석 시작
      if (parsed.paid || parsed.reports?.base?.paid) {
        setIsLoading(false);
        startRealAnalysis(parsed);
        return;
      }

      // 미결제 상태: 가라 분석 시작
      const loadingDoneKey = `base_report_loading_done_${resultId}`;
      const loadingDone = sessionStorage.getItem(loadingDoneKey);

      if (loadingDone) {
        // 이미 가라 분석 완료 → 결제 유도 페이지 표시
        setShowPaymentPage(true);
        setIsLoading(false);
      } else {
        // 가라 분석 시작
        setShowFakeAnalysis(true);
        setIsLoading(false);
        startFakeAnalysis(resultId);
      }
    } else {
      router.push("/");
    }
  }, [resultId, router]);

  // 가라 분석 (30초)
  const startFakeAnalysis = (id: string) => {
    const totalDuration = 30000;
    const progressInterval = 100;
    const msgChangeInterval = 3000;

    let progress = 0;
    let msgIdx = 0;

    const progressTimer = setInterval(() => {
      progress += (100 * progressInterval) / totalDuration;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressTimer);
      }
      setFakeProgress(Math.min(progress, 100));
    }, progressInterval);

    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % FAKE_ANALYSIS_MESSAGES.length;
      setFakeMessage(FAKE_ANALYSIS_MESSAGES[msgIdx]);
    }, msgChangeInterval);

    setTimeout(() => {
      clearInterval(progressTimer);
      clearInterval(msgTimer);
      setShowFakeAnalysis(false);
      setShowPaymentPage(true);
      sessionStorage.setItem(`base_report_loading_done_${id}`, "true");
    }, totalDuration);
  };

  // 실제 분석 시작 (결제 후)
  const startRealAnalysis = useCallback(
    async (data: FaceResult) => {
      setIsAnalyzing(true);
      setAnalysisProgress(0);

      // 진행률 애니메이션
      let progress = 0;
      const progressTimer = setInterval(() => {
        progress += Math.random() * 1.5;
        if (progress > 94) progress = 94;
        setAnalysisProgress(progress);
      }, 400);

      try {
        // face-teller2 API 호출
        const apiResult = await analyzeFaceFeatures(data.imageBase64.split(",")[1]);

        if (!apiResult.success) {
          throw new Error(apiResult.error);
        }

        clearInterval(progressTimer);
        setAnalysisProgress(100);

        const { summary, detail, sections, features } = apiResult.data;

        // 결과 업데이트
        const updatedResult: FaceResult = {
          ...data,
          summary,
          detail,
          sections,
          features: features || data.features,
          paid: true,
          reports: {
            ...data.reports,
            base: {
              paid: true,
              data: { summary, detail, sections },
            },
          },
        };

        // localStorage 업데이트
        localStorage.setItem(`face_result_${data.id}`, JSON.stringify(updatedResult));
        setResult(updatedResult);
        setShowResult(true);
      } catch (error) {
        console.error("분석 오류:", error);
        alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      } finally {
        clearInterval(progressTimer);
        setIsAnalyzing(false);
      }
    },
    []
  );

  // 결제 버튼 클릭 (임시: 바로 분석 시작)
  const handlePayment = () => {
    if (!result) return;

    // 결제 완료 처리
    const updatedResult = {
      ...result,
      paid: true,
      reports: {
        ...result.reports,
        base: { ...result.reports.base, paid: true },
      },
    };
    localStorage.setItem(`face_result_${result.id}`, JSON.stringify(updatedResult));
    setResult(updatedResult);
    setShowPaymentPage(false);
    startRealAnalysis(updatedResult);
  };

  // 간단한 마크다운 파서
  const simpleMD = (src: string = "") => {
    let result = src;
    // 굵게
    result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // 헤딩
    result = result.replace(/^### (.*)$/gm, "<h3>$1</h3>");
    result = result.replace(/^## (.*)$/gm, "<h2>$1</h2>");
    result = result.replace(/^# (.*)$/gm, "<h1>$1</h1>");
    // 줄바꿈
    result = result.replace(/\n/g, "<br/>");
    return result;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
      </div>
    );
  }

  if (!result) return null;

  // 가라 분석 오버레이
  if (showFakeAnalysis) {
    return (
      <div className="fake_analysis_overlay active">
        <div className="fake_analysis_content">
          <div className="main_content_wrap">
            <div className="border">
              <div className="frame">
                <div className="image">
                  <div className="file-upload">
                    <div className="file-upload-content" style={{ display: "block" }}>
                      <div className="image-square-frame">
                        <Image
                          src={result.imageBase64}
                          alt="분석 중인 사진"
                          fill
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="fake_analysis_spinner" />
          <div className="fake_analysis_text">{fakeMessage}</div>
          <div className="fake_analysis_progress_wrap">
            <div
              className="fake_analysis_progress_bar"
              style={{ width: `${fakeProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 결제 유도 페이지
  if (showPaymentPage) {
    return (
      <div className="main_body_wrap">
        <header className="header_chat_wrap">
          <div className="header_chat header_fixed">
            <Link href="/" style={{ marginRight: "12px", textDecoration: "none" }}>
              <div className="header_chat_title">관상</div>
            </Link>
          </div>
        </header>

        <div className="main_content_wrap">
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          {/* 업로드된 이미지 */}
          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div className="file-upload-content" style={{ display: "block" }}>
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석된 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* faceteller 이미지 */}
          <div className="face_teller_wrap">
            <Image
              src="/img/faceteller.png"
              alt="관상 분석 완료"
              width={350}
              height={500}
              className="face_teller_img"
              unoptimized
            />
          </div>
        </div>

        {/* 결제 버튼 영역 */}
        <div className="result_btn_wrap" data-state="ready" style={{ display: "flex" }}>
          <div className="result_btn_status">관상 분석을 완료했습니다.</div>
          <button className="result_btn" onClick={handlePayment}>
            관상 풀이 지금 확인하기
          </button>
        </div>

        <Footer />
      </div>
    );
  }

  // 분석 중
  if (isAnalyzing) {
    return (
      <div className="main_body_wrap">
        <header className="header_chat_wrap">
          <div className="header_chat header_fixed">
            <Link href="/" style={{ marginRight: "12px", textDecoration: "none" }}>
              <div className="header_chat_title">관상</div>
            </Link>
          </div>
        </header>

        <div className="main_content_wrap">
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div className="file-upload-content" style={{ display: "block" }}>
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석 중인 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="label-container" className="result">
            <div className="loading-box dark-mode">
              <div className="loading-text">보고서를 생성 중입니다...</div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${analysisProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // 결과 표시
  if (showResult && result.summary) {
    return (
      <div className="main_body_wrap">
        <header className="header_chat_wrap">
          <div className="header_chat header_fixed">
            <Link href="/" style={{ marginRight: "12px", textDecoration: "none" }}>
              <div className="header_chat_title">관상</div>
            </Link>
          </div>
        </header>

        <div className="main_content_wrap">
          <div className="main_title_wrap">
            <div className="main_title">인공지능이 알려주는 관상 테스트</div>
            <div className="main_subtitle">AI 관상 | 관상가 양반</div>
          </div>

          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  <div className="file-upload-content" style={{ display: "block" }}>
                    <div className="image-square-frame">
                      <Image
                        src={result.imageBase64}
                        alt="분석된 사진"
                        fill
                        style={{ objectFit: "cover" }}
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="label-container" className="result">
            {/* Summary */}
            <div className="face-summary-section">
              <div
                className="face-summary"
                dangerouslySetInnerHTML={{ __html: simpleMD(result.summary) }}
              />
            </div>

            {/* Sections */}
            {result.sections && (
              <div className="report-cards-container">
                {SECTION_CONFIG.filter(
                  (sec) => result.sections?.[sec.key as keyof typeof result.sections]
                ).map((sec) => (
                  <div key={sec.key} className="report-card">
                    <div className="report-card-header">
                      <h3 className="report-card-title">{sec.title}</h3>
                    </div>
                    <div
                      className="report-card-content"
                      dangerouslySetInnerHTML={{
                        __html: simpleMD(
                          result.sections?.[sec.key as keyof typeof result.sections] || ""
                        ),
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Detail fallback */}
            {!result.sections && result.detail && (
              <div className="face-detail-section">
                <div
                  className="face-detail"
                  dangerouslySetInnerHTML={{ __html: simpleMD(result.detail) }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    );
  }

  return null;
}

export default function FaceResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f8f7f1]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#553900]" />
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
