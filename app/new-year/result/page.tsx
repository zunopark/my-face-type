"use client";

import { useEffect, useState, Suspense } from "react";
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

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [data, setData] = useState<NewYearRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 데이터 로드 및 분석
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

      // 이미 분석이 완료되어 있으면 바로 표시
      if (record.analysis) {
        setIsLoading(false);
        return;
      }

      // 분석 시작
      setIsAnalyzing(true);
      setIsLoading(false);

      try {
        // 분석 상태 업데이트
        await updateNewYearRecord(record.id, {
          isAnalyzing: true,
          analysisStartedAt: new Date().toISOString(),
        });

        // 신년 사주 분석 API 호출
        const analysisResult = await analyzeNewYear({
          saju_data: record.rawSajuData || {},
          user_name: record.input.userName,
          user_job_status: record.input.jobStatus,
          user_relationship_status: record.input.relationshipStatus,
          user_wish_2026: record.input.wish2026,
          year: 2026,
        });

        if (!analysisResult.success || !analysisResult.data) {
          throw new Error(analysisResult.error || "분석 실패");
        }

        // 결과 저장
        const updatedRecord = {
          ...record,
          analysis: analysisResult.data,
          isAnalyzing: false,
        };

        await updateNewYearRecord(record.id, {
          analysis: analysisResult.data,
          isAnalyzing: false,
        });

        setData(updatedRecord);
        setIsAnalyzing(false);
      } catch (err) {
        console.error("분석 에러:", err);
        setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        setIsAnalyzing(false);

        await updateNewYearRecord(record.id, { isAnalyzing: false });
      }
    };

    loadData();
  }, [resultId, router]);

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

  // 로딩/분석 중 화면
  if (isLoading || isAnalyzing) {
    return (
      <div className="new_year_wrap">
        <div className="loading_overlay" style={{ position: "relative" }}>
          <div className="loading_spinner" />
          <p className="loading_text">
            {isAnalyzing
              ? "천기동자가 운세를 분석하고 있어요"
              : "데이터를 불러오는 중..."}
          </p>
          {isAnalyzing && (
            <p className="loading_subtext">
              약 1~2분 정도 소요될 수 있어요
            </p>
          )}
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

  return (
    <div className="new_year_wrap">
      <div className="result_wrap">
        {/* 헤더 */}
        <div className="result_header">
          <p className="result_title">2026 신년 운세</p>
          <p className="result_subtitle">{input.userName}님의 병오년 운세</p>
          <div className="result_user_info">
            <span>일간: {dayMaster.char} ({dayMaster.title})</span>
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

        {/* 분석 결과가 없는 경우 */}
        {!analysis && (
          <div className="chapter_card">
            <div className="chapter_content">
              <p>분석 결과가 아직 준비되지 않았습니다.</p>
            </div>
          </div>
        )}
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
