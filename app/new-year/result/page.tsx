"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getNewYearRecord,
  updateNewYearRecord,
  NewYearRecord,
} from "@/lib/db/newYearDB";
import { analyzeNewYear } from "@/app/actions/analyze";
import "../new-year.css";

// 직업 상태 한글 변환
const JOB_STATUS_KR: Record<string, string> = {
  employee: "직장인",
  job_seeker: "취준생",
  student: "학생",
  freelancer: "프리랜서",
  business_owner: "사업가",
  unemployed: "무직",
};

// 연애 상태 한글 변환
const RELATIONSHIP_KR: Record<string, string> = {
  single: "솔로",
  some: "썸",
  couple: "연애중",
  married: "기혼",
};

// 오행 색상
const elementColors: Record<string, string> = {
  木: "#2aa86c",
  wood: "#2aa86c",
  火: "#ff6a6a",
  fire: "#ff6a6a",
  土: "#caa46a",
  earth: "#caa46a",
  金: "#9a9a9a",
  metal: "#9a9a9a",
  水: "#6aa7ff",
  water: "#6aa7ff",
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

// 시간 포맷
const formatTimeToSi = (timeStr: string | null) => {
  if (!timeStr) return "";
  const timeMap: Record<string, string> = {
    "00:30": "자시",
    "02:30": "축시",
    "04:30": "인시",
    "06:30": "묘시",
    "08:30": "진시",
    "10:30": "사시",
    "12:30": "오시",
    "14:30": "미시",
    "16:30": "신시",
    "18:30": "유시",
    "20:30": "술시",
    "22:30": "해시",
  };
  return timeMap[timeStr] || "";
};

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [data, setData] = useState<NewYearRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 프로그레스 애니메이션 (5분 = 300초 기준)
  const startProgress = () => {
    setProgress(0);
    const totalDuration = 300000; // 5분
    const interval = 1000; // 1초마다 업데이트
    const increment = 100 / (totalDuration / interval);

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        // 99%에서 멈춤 (실제 완료 시 100%로)
        if (next >= 99) {
          return 99;
        }
        return next;
      });
    }, interval);
  };

  const stopProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(100);
  };

  // 데이터 로드 (분석은 버튼 클릭 시에만)
  useEffect(() => {
    if (!resultId) {
      router.push("/new-year");
      return;
    }

    const loadData = async () => {
      const record = await getNewYearRecord(resultId);

      if (!record) {
        setError("데이터를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      setData(record);
      setIsLoading(false);
    };

    loadData();
  }, [resultId, router]);

  // 분석 시작 (버튼 클릭 시)
  const handleStartAnalysis = async () => {
    if (!data) return;

    setIsAnalyzing(true);
    startProgress();

    try {
      // 분석 상태 업데이트
      await updateNewYearRecord(data.id, {
        isAnalyzing: true,
        analysisStartedAt: new Date().toISOString(),
      });

      // 신년 사주 분석 API 호출
      const analysisResult = await analyzeNewYear({
        saju_data: data.rawSajuData || {},
        user_name: data.input.userName,
        user_job_status: data.input.jobStatus,
        user_relationship_status: data.input.relationshipStatus,
        user_wish_2026: data.input.wish2026,
        year: 2026,
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error(analysisResult.error || "분석 실패");
      }

      // API 응답에서 analysis 추출 (응답 구조: { success, analysis: { chapters, full_text }, ... })
      const analysisData = analysisResult.data.analysis || analysisResult.data;

      // 결과 저장
      const updatedRecord = {
        ...data,
        analysis: analysisData,
        isAnalyzing: false,
      };

      await updateNewYearRecord(data.id, {
        analysis: analysisData,
        isAnalyzing: false,
      });

      stopProgress();
      setData(updatedRecord);
      setIsAnalyzing(false);
    } catch (err) {
      console.error("분석 에러:", err);
      stopProgress();
      setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIsAnalyzing(false);

      await updateNewYearRecord(data.id, { isAnalyzing: false });
    }
  };

  const getColor = (element: string | undefined) => {
    if (!element) return "#333";
    return (
      elementColors[element] || elementColors[element.toLowerCase()] || "#333"
    );
  };

  // 에러 화면
  if (error) {
    return (
      <div className="new_year_wrap">
        <div className="error_message">
          <p>{error}</p>
          <button
            className="submit_btn"
            style={{ marginTop: 20, maxWidth: 200 }}
            onClick={() => router.push("/new-year")}
          >
            다시 시작하기
          </button>
        </div>
      </div>
    );
  }

  // 초기 로딩 화면
  if (isLoading) {
    return (
      <div className="new_year_wrap">
        <div className="loading_overlay" style={{ position: "relative" }}>
          <div className="loading_spinner" />
          <p className="loading_text">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 데이터 없음
  if (!data) {
    return (
      <div className="new_year_wrap">
        <div className="error_message">
          <p>데이터를 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const { input, sajuData, analysis } = data;
  const dayMaster = sajuData.dayMaster;
  // pillars 타입 정의
  type PillarData = {
    stem?: { char?: string; element?: string; yinYang?: string };
    branch?: { char?: string; element?: string; yinYang?: string };
  };
  const pillars = (sajuData.pillars || {}) as Record<string, PillarData>;
  const birthTime = formatTimeToSi(input.time);

  // 분석 전: 사주 정보 + 분석 버튼
  if (!analysis) {
    return (
      <div className="new_year_wrap">
        {/* 분석 중 오버레이 */}
        {isAnalyzing && (
          <div className="loading_overlay">
            <div className="loading_content">
              <div className="loading_spinner" />
              <p className="loading_text">천기동자가 운세를 분석하고 있어요</p>
              <p className="loading_subtext">잠시만 기다려주세요...</p>

              {/* 프로그레스 바 */}
              <div className="progress_wrap">
                <div className="progress_bar">
                  <div
                    className="progress_fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="progress_text">{Math.floor(progress)}%</p>
              </div>

              <div className="loading_tips">
                <p className="tips_title">분석 중인 내용</p>
                <ul className="tips_list">
                  <li>2026년 총운 분석</li>
                  <li>월별 운세 흐름</li>
                  <li>재물운 · 직업운</li>
                  <li>연애운 · 건강운</li>
                  <li>행운의 방향과 조언</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="result_wrap">
          {/* 헤더 */}
          <div className="result_header">
            <p className="result_title">2026 신년 운세</p>
            <p className="result_subtitle">{input.userName}님의 사주 정보</p>
          </div>

          {/* 사용자 정보 카드 */}
          <div className="info_card">
            <div className="info_row">
              <span className="info_label">이름</span>
              <span className="info_value">{input.userName}</span>
            </div>
            <div className="info_row">
              <span className="info_label">생년월일</span>
              <span className="info_value">
                {input.date} {birthTime && `(${birthTime})`}
              </span>
            </div>
            <div className="info_row">
              <span className="info_label">일간</span>
              <span className="info_value" style={{ color: getColor(dayMaster.element) }}>
                {dayMaster.char} ({dayMaster.title})
              </span>
            </div>
            <div className="info_row">
              <span className="info_label">직업</span>
              <span className="info_value">{JOB_STATUS_KR[input.jobStatus] || input.jobStatus}</span>
            </div>
            <div className="info_row">
              <span className="info_label">연애 상태</span>
              <span className="info_value">{RELATIONSHIP_KR[input.relationshipStatus] || input.relationshipStatus}</span>
            </div>
          </div>

          {/* 사주 팔자 테이블 */}
          <div className="pillars_section">
            <p className="pillars_title">사주 팔자</p>
            <div className="saju_table_wrap">
              <table className="saju_table">
                <thead>
                  <tr>
                    <th></th>
                    <th>시주</th>
                    <th>일주</th>
                    <th>월주</th>
                    <th>년주</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 천간 */}
                  <tr className="row_cheongan">
                    <td className="row_label">천간</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.stem?.char)
                        return (
                          <td key={key} className="cell_empty">—</td>
                        );
                      return (
                        <td key={key}>
                          <span
                            className="char_main"
                            style={{ color: getColor(p.stem.element) }}
                          >
                            {p.stem.char}
                          </span>
                          <span
                            className="char_element"
                            style={{ color: getColor(p.stem.element) }}
                          >
                            {getElementKorean(p.stem.element, p.stem.yinYang)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* 지지 */}
                  <tr className="row_jiji">
                    <td className="row_label">지지</td>
                    {(["hour", "day", "month", "year"] as const).map((key) => {
                      const p = pillars[key];
                      if (!p?.branch?.char)
                        return (
                          <td key={key} className="cell_empty">—</td>
                        );
                      return (
                        <td key={key}>
                          <span
                            className="char_main"
                            style={{ color: getColor(p.branch.element) }}
                          >
                            {p.branch.char}
                          </span>
                          <span
                            className="char_element"
                            style={{ color: getColor(p.branch.element) }}
                          >
                            {getElementKorean(p.branch.element, p.branch.yinYang)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2026년 소원 (입력한 경우) */}
          {input.wish2026 && (
            <div className="wish_section">
              <p className="wish_title">2026년 소원</p>
              <p className="wish_content">{input.wish2026}</p>
            </div>
          )}
        </div>

        {/* 하단 고정 버튼 */}
        <div className="bottom_fixed">
          <button
            className="analyze_btn"
            onClick={handleStartAnalysis}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "분석 중..." : "2026 신년 사주 분석하기"}
          </button>
          <button
            className="back_btn_small"
            onClick={() => router.push("/new-year")}
          >
            다시 입력하기
          </button>
        </div>
      </div>
    );
  }

  // 분석 완료: 결과 표시
  return (
    <div className="new_year_wrap">
      <div className="result_wrap">
        {/* 헤더 */}
        <div className="result_header">
          <p className="result_title">2026 신년 운세</p>
          <p className="result_subtitle">{input.userName}님의 병오년 운세</p>
          <div className="result_user_info">
            <span style={{ color: getColor(dayMaster.element) }}>
              일간: {dayMaster.char} ({dayMaster.title})
            </span>
            <span>{JOB_STATUS_KR[input.jobStatus] || input.jobStatus}</span>
            <span>{RELATIONSHIP_KR[input.relationshipStatus] || input.relationshipStatus}</span>
          </div>
        </div>

        {/* 분석 결과 챕터들 */}
        {analysis?.chapters?.map((chapter, index) => (
          <div key={index} className="chapter_card">
            <div className="chapter_header">
              <span className="chapter_number">{chapter.number || index + 1}</span>
              <span className="chapter_title">{chapter.title}</span>
            </div>
            <div
              className="chapter_content"
              dangerouslySetInnerHTML={{
                __html: formatContent(chapter.content),
              }}
            />
          </div>
        ))}
      </div>

      {/* 하단 버튼 */}
      <div className="bottom_fixed">
        <button className="bottom_btn" onClick={() => router.push("/new-year")}>
          다시 보기
        </button>
      </div>
    </div>
  );
}

// 마크다운 -> HTML 간단 변환
function formatContent(content: string): string {
  if (!content) return "";

  let html = content
    // 볼드
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // 이탤릭
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // 밑줄
    .replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
    // 인용
    .replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>")
    // 리스트
    .replace(/^-\s+(.+)$/gm, "<li>$1</li>")
    // 줄바꿈
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // 연속된 li를 ul로 감싸기
  html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");

  // 연속된 blockquote 합치기
  html = html.replace(
    /(<blockquote>.*?<\/blockquote>)+/g,
    (match) => "<blockquote>" + match.replace(/<\/?blockquote>/g, "") + "</blockquote>"
  );

  return `<p>${html}</p>`;
}

export default function NewYearResultPage() {
  return (
    <Suspense
      fallback={
        <div className="new_year_wrap">
          <div className="loading_overlay" style={{ position: "relative" }}>
            <div className="loading_spinner" />
            <p className="loading_text">로딩 중...</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}
