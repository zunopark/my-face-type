"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { analyzeSajuLove, SajuData } from "@/app/actions/analyze";
import { getSajuLoveRecord, updateSajuLoveRecord, SajuLoveRecord } from "@/lib/db/sajuLoveDB";
import Link from "next/link";
import "./result.css";

// 연애 사주 분석 결과 타입
interface LoveAnalysisResult {
  user_name: string;
  chapters: {
    title: string;
    content: string;
  }[];
  ideal_partner_image?: {
    image_base64: string;
    prompt?: string;
  };
}

// 오행 색상 맵
const ELEMENT_COLORS: Record<string, string> = {
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

const ELEMENT_BG_COLORS: Record<string, string> = {
  木: "rgba(42, 168, 108, 0.12)",
  wood: "rgba(42, 168, 108, 0.12)",
  火: "rgba(255, 106, 106, 0.12)",
  fire: "rgba(255, 106, 106, 0.12)",
  土: "rgba(202, 164, 106, 0.12)",
  earth: "rgba(202, 164, 106, 0.12)",
  金: "rgba(154, 154, 154, 0.12)",
  metal: "rgba(154, 154, 154, 0.12)",
  水: "rgba(106, 167, 255, 0.12)",
  water: "rgba(106, 167, 255, 0.12)",
};

// 시간을 시(時) 이름으로 변환
const TIME_MAP: Record<string, string> = {
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

// 목차 데이터
const TOC_CHAPTERS = [
  {
    title: "1장. 나만의 매력과 연애 성향",
    items: [
      "풀이 1. 처음 본 순간 이성이 느끼는 나의 매력",
      "풀이 2. 내 연애 스타일 장점과 숨겨진 반전 매력",
      "풀이 3. 인만추 vs 자만추 vs 결정사, 나에게 맞는 방식은",
      "풀이 4. 내가 끌리는 사람 vs 나에게 끌리는 사람",
    ],
  },
  {
    title: "2장. 앞으로 펼쳐질 사랑의 흐름",
    items: [
      "풀이 1. 앞으로의 연애 총운 흐름",
      "풀이 2. 향후 3년간 연애운 증폭 시기",
      "풀이 3. 바로 지금, 이번 달 연애 운세",
    ],
  },
  {
    title: "3장. 결국 만나게 될 운명의 상대",
    items: [
      "풀이 1. 운명의 짝, 그 사람의 모든 것",
      "풀이 2. 언제, 어떻게 만나게 될까",
      "풀이 3. 그 사람을 끌어당길 나만의 공략법",
    ],
  },
  {
    title: "4장. 색동낭자의 일침",
    items: [],
    desc: "입력한 고민에 대한 1:1 맞춤 상담",
  },
];

function SajuLoveResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SajuLoveRecord | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideLabels, setSlideLabels] = useState<string[]>([]);

  const isFetchingRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const messages = [
      `${userName}님의 사주 팔자를 분석하고 있어요`,
      "완료하는 데 2~3분 정도 걸려요",
      "지금 페이지를 나가면 분석이 완료되지 않을 수 있어요",
      `${userName}님의 연애 성향을 파악하고 있어요`,
      "운명의 상대를 찾고 있어요",
      "곧 분석이 완료됩니다",
    ];
    let index = 0;
    setLoadingMessage(messages[0]);

    loadingIntervalRef.current = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 4000);
  }, []);

  const stopLoadingMessages = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  // 연애 사주 분석 API 호출
  const fetchLoveAnalysis = useCallback(
    async (storedData: SajuLoveRecord, retryCount = 0) => {
      const MAX_RETRIES = 2;
      const userName = storedData.input?.userName || "고객";

      if (retryCount === 0) {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        startLoadingMessages(userName);
      }

      try {
        // 연애 고민 + 연애 상태 + 관심사 합치기
        // userConcern에는 이미 status 정보가 포함되어 있음
        const combinedConcern = storedData.input?.userConcern || "";

        const result = await analyzeSajuLove({
          sajuData: storedData.sajuData as unknown as SajuData,
          userName: storedData.input?.userName || "",
          userConcern: combinedConcern.trim(),
          year: new Date().getFullYear(),
        });

        if (!result.success) {
          throw new Error(result.error || "분석에 실패했습니다.");
        }

        const loveResult = result.data as LoveAnalysisResult;

        // 이미지 생성 실패 체크 - 이미지가 없으면 재시도
        const hasImage = loveResult.ideal_partner_image?.image_base64;
        if (!hasImage && retryCount < MAX_RETRIES) {
          setLoadingMessage("이미지 생성 재시도 중...");
          return fetchLoveAnalysis(storedData, retryCount + 1);
        }

        if (!hasImage) {
          throw new Error("이미지 생성에 실패했습니다.");
        }

        // IndexedDB에 저장
        const updatedData: SajuLoveRecord = {
          ...storedData,
          loveAnalysis: loveResult,
        };
        await updateSajuLoveRecord(storedData.id, { loveAnalysis: loveResult });

        stopLoadingMessages();
        setData(updatedData);
        setIsLoading(false);
      } catch (err) {
        stopLoadingMessages();
        console.error("분석 API 실패:", err);
        if (err instanceof Error) {
          if (err.message === "TIMEOUT") {
            setError("서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
          } else if (err.message.includes("이미지 생성")) {
            setError("이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
          } else {
            setError(err.message);
          }
        } else {
          setError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
        setIsLoading(false);
      }
    },
    [startLoadingMessages, stopLoadingMessages]
  );

  // 초기화 (IndexedDB에서 로드)
  useEffect(() => {
    if (!resultId) {
      setError("결과를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      const record = await getSajuLoveRecord(resultId);
      if (!record) {
        setError("데이터를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      // loveAnalysis가 있으면 바로 렌더링
      if (record.loveAnalysis) {
        setData(record);
        setIsLoading(false);
        return;
      }

      // loveAnalysis가 없으면 API 호출
      fetchLoveAnalysis(record);
    };

    loadData();
  }, [resultId, fetchLoveAnalysis]);

  // 슬라이드 라벨 생성
  useEffect(() => {
    if (!data?.loveAnalysis) return;

    const userName = data.loveAnalysis.user_name || data.input.userName || "고객";
    const labels: string[] = [
      `${userName}님의 사주 원국`,
      "리포트 구성 안내",
    ];

    data.loveAnalysis.chapters.forEach((_, index) => {
      labels.push(`${index + 1}장`);
    });

    labels.push("색동낭자의 인사말");
    setSlideLabels(labels);
  }, [data]);

  // 총 슬라이드 수 계산
  const totalSlides = data?.loveAnalysis
    ? 2 + data.loveAnalysis.chapters.length + 1 // intro + toc + chapters + ending
    : 0;

  // 슬라이드 이동
  const goToPrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "ArrowRight") goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="saju_result_page">
        <div className="main_body_wrap">
          <div className="loading_wrap">
            <div className="loading_spinner"></div>
            <p className="loading_text">{loadingMessage || "분석 결과를 불러오는 중..."}</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 화면
  if (error) {
    return (
      <div className="saju_result_page">
        <div className="main_body_wrap">
          <div className="error_wrap">
            <div className="error_icon">!</div>
            <p className="error_text">{error}</p>
            <Link href="/saju-love" className="error_btn">
              다시 시작하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.loveAnalysis) {
    return null;
  }

  const { loveAnalysis, input, sajuData } = data;
  const userName = loveAnalysis.user_name || input.userName || "고객";

  return (
    <div className="saju_result_page">
      <div className="main_body_wrap">
        <div className="result_wrap">
          {/* 상단 고정 헤더 */}
          <div className="top_fixed_header">
            <div className="top_label">{slideLabels[currentSlide] || ""}</div>
            <div className="chapter_progress">
              <div
                className="chapter_progress_fill"
                style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
              />
            </div>
          </div>

          {/* 챕터 컨테이너 */}
          <div className="chapters_container">
            <div
              className="chapters_track"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {/* 인트로 슬라이드 */}
              <IntroSlide userName={userName} input={input} sajuData={sajuData} />

              {/* 목차 슬라이드 */}
              <TocSlide userName={userName} />

              {/* 챕터 슬라이드들 */}
              {loveAnalysis.chapters.map((chapter, index) => (
                <ChapterSlide
                  key={index}
                  chapter={chapter}
                  index={index}
                  data={data}
                />
              ))}

              {/* 마지막 슬라이드 */}
              <EndingSlide />
            </div>
          </div>

          {/* 하단 네비게이션 */}
          <div className="chapter_nav">
            <button
              className="nav_arrow"
              onClick={goToPrev}
              disabled={currentSlide === 0}
            >
              <span className="material-icons">chevron_left</span>
            </button>
            <div className="chapter_indicator">
              <span className="current_chapter">{currentSlide + 1}</span>
              <span className="separator">/</span>
              <span className="total_chapters">{totalSlides}</span>
            </div>
            <button
              className="nav_arrow"
              onClick={goToNext}
              disabled={currentSlide === totalSlides - 1}
            >
              <span className="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 인트로 슬라이드 컴포넌트
function IntroSlide({
  userName,
  input,
  sajuData,
}: {
  userName: string;
  input: SajuLoveRecord["input"];
  sajuData: SajuLoveRecord["sajuData"];
}) {
  const birthTime = input.time ? TIME_MAP[input.time] || input.time : "";
  const birthDateText = birthTime ? `${input.date} | ${birthTime}` : input.date;
  const dayMaster = sajuData.dayMaster;
  const pillars = sajuData.pillars;
  const loveFacts = sajuData.loveFacts;

  const getColor = (element: string | undefined) => {
    if (!element) return "#333";
    return ELEMENT_COLORS[element] || ELEMENT_COLORS[element.toLowerCase()] || "#333";
  };

  const getBgColor = (element: string | undefined) => {
    if (!element) return "transparent";
    return ELEMENT_BG_COLORS[element] || ELEMENT_BG_COLORS[element.toLowerCase()] || "transparent";
  };

  const toKoreanElement = (element: string | undefined) => {
    if (!element) return "—";
    const map: Record<string, string> = {
      wood: "목", fire: "화", earth: "토", metal: "금", water: "수",
    };
    return map[element.toLowerCase()] || element;
  };

  const toKoreanYinYang = (value: string | undefined) => {
    if (!value) return "—";
    const map: Record<string, string> = { yang: "양", yin: "음" };
    return map[value.toLowerCase()] || value;
  };

  const positionToHanja: Record<string, string> = {
    year: "年", month: "月", day: "日", hour: "時",
  };

  const formatPositions = (positions: string[] | undefined) => {
    if (!positions || positions.length === 0) return "";
    return positions.map((p) => positionToHanja[p] || p).join(" ");
  };

  const hasPeach = loveFacts?.peachBlossom?.hasPeach ||
    (loveFacts?.peachBlossom?.positions && loveFacts.peachBlossom.positions.length > 0);
  const peachText = hasPeach ? formatPositions(loveFacts?.peachBlossom?.positions) : "없음";

  const hasSpouse = loveFacts?.spouseStars?.positions && loveFacts.spouseStars.positions.length > 0;
  const spouseText = hasSpouse ? formatPositions(loveFacts?.spouseStars?.positions) : "없음";

  const pillarLabels: Record<string, string> = {
    hour: "시주", day: "일주", month: "월주", year: "년주",
  };

  return (
    <div className="chapter_slide intro_slide">
      <div className="chapter_content_wrap intro_compact">
        <div className="intro_header">
          <span className="intro_label">연애 리포트</span>
          <h1 className="intro_title">연애 사주 분석 보고서</h1>
          <p className="intro_subtitle">분석에 사용된 사주 정보입니다</p>
        </div>

        {/* 기본 정보 카드 */}
        <div className="info_card">
          <div className="info_main">
            <span className="info_name">{userName}</span>
            <span className="info_birth">{birthDateText}</span>
          </div>
          <div className="info_ilju">
            <span className="ilju_char">{dayMaster?.char || "—"}</span>
            <span className="ilju_title">{dayMaster?.title || "—"}</span>
          </div>
        </div>

        {/* 사주 팔자 섹션 */}
        <div className="pillars_section">
          <div className="pillars_header">
            <span className="material-icons">view_column</span>
            사주 팔자
          </div>
          <div className="pillars_wrap">
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = pillars[key];
              return (
                <div key={key} className="pillar_item">
                  <div className="pillar_label">{pillarLabels[key]}</div>
                  <div className="pillar_chars">
                    <div
                      className="pillar_char_wrap"
                      style={{ background: getBgColor(p?.stem?.element) }}
                    >
                      <span
                        className="pillar_stem"
                        style={{ color: getColor(p?.stem?.element) }}
                      >
                        {p?.stem?.char || "—"}
                      </span>
                      <span className="pillar_ten_god">{p?.tenGodStem || "—"}</span>
                    </div>
                    <div
                      className="pillar_char_wrap"
                      style={{ background: getBgColor(p?.branch?.element) }}
                    >
                      <span
                        className="pillar_branch"
                        style={{ color: getColor(p?.branch?.element) }}
                      >
                        {p?.branch?.char || "—"}
                      </span>
                      <span className="pillar_ten_god">{p?.tenGodBranchMain || "—"}</span>
                    </div>
                  </div>
                  <div className="pillar_korean">
                    {(p?.stem?.korean || "") + (p?.branch?.korean || "")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 연애 사주 핵심 카드 */}
        <div className="love_facts_card">
          <div className="love_facts_header">
            <span className="material-icons">favorite</span>
            연애 사주 핵심
          </div>
          <div className="love_facts_grid">
            <div className="love_fact_item">
              <span className="love_fact_label">일간</span>
              <span className="love_fact_value">
                {dayMaster?.char || "—"} {dayMaster?.title || ""}
              </span>
            </div>
            <div className="love_fact_item">
              <span className="love_fact_label">오행/음양</span>
              <span className="love_fact_value">
                {toKoreanElement(dayMaster?.element)} / {toKoreanYinYang(dayMaster?.yinYang)}
              </span>
            </div>
            <div className="love_fact_item">
              <span className="love_fact_label">신강/신약</span>
              <span className="love_fact_value">
                {loveFacts?.dayMasterStrength || sajuData.fiveElements?.strength || "—"}
              </span>
            </div>
            <div className="love_fact_item">
              <span className="love_fact_label">도화살</span>
              <span className={`love_fact_value ${hasPeach ? "highlight" : "muted"}`}>
                {peachText}
              </span>
            </div>
            <div className="love_fact_item">
              <span className="love_fact_label">배우자운</span>
              <span className={`love_fact_value ${hasSpouse ? "highlight" : "muted"}`}>
                {spouseText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 목차 슬라이드 컴포넌트
function TocSlide({ userName }: { userName: string }) {
  return (
    <div className="chapter_slide toc_slide">
      <div className="chapter_content_wrap intro_compact">
        <div className="intro_header">
          <span className="intro_label">리포트 안내</span>
          <h1 className="intro_title">{userName}님의 맞춤 분석</h1>
          <p className="intro_subtitle">아래 순서대로 리포트를 안내드릴게요</p>
        </div>

        <div className="toc_card">
          <div className="toc_title">이번 리포트 구성</div>
          <ul className="toc_list">
            {TOC_CHAPTERS.map((chapter, index) => (
              <li key={index} className="toc_item">
                <div className="toc_item_title">{chapter.title}</div>
                {chapter.desc ? (
                  <div className="toc_item_desc">{chapter.desc}</div>
                ) : (
                  <ul className="toc_subitems">
                    {chapter.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="toc_subitem">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// 챕터 슬라이드 컴포넌트
function ChapterSlide({
  chapter,
  index,
  data,
}: {
  chapter: { title: string; content: string };
  index: number;
  data: SajuLoveRecord;
}) {
  const [clickCount, setClickCount] = useState(0);
  const maxClicks = 5;

  // 제목 정리
  let titleText = chapter.title || `챕터 ${index + 1}`;
  titleText = titleText
    .replace(/^#+\s*/, "")
    .replace(/\[(\d+)장\]\s*/, "")
    .replace(/^(\d+)장\s*/, "")
    .trim();

  // 4장(사전 질문 답변)인지 확인
  const isQuestionChapter =
    index === 3 ||
    titleText.includes("사전 질문") ||
    titleText.includes("질문 답변") ||
    chapter.title?.includes("4장");

  // 3장(운명의 상대)인지 확인
  const isDestinyChapter = index === 2;

  // 고민 내용 (4장인 경우에만 표시)
  const userConcern = data.input?.userConcern?.trim();

  // 내용 처리
  const formatContent = () => {
    let content = chapter.content || "";

    if (isDestinyChapter && data.loveAnalysis?.ideal_partner_image?.image_base64) {
      return formatChapterContentWithIdealType(content, data, clickCount, setClickCount, maxClicks);
    }

    return formatChapterContent(content);
  };

  return (
    <div className="chapter_slide">
      <div className="chapter_content_wrap chapter_compact">
        <div className="chapter_header">
          <span className="chapter_label">{index + 1}장</span>
          <h2 className="chapter_title">{titleText}</h2>
        </div>

        {isQuestionChapter && userConcern && (
          <div className="concern_box">
            <div className="concern_box_label">
              {data.input.userName || "고객"}님이 남긴 고민
            </div>
            <div className="concern_box_content">
              <span className="concern_text">
                {userConcern.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < userConcern.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </span>
            </div>
          </div>
        )}

        <div
          className="chapter_body"
          dangerouslySetInnerHTML={{ __html: formatContent() }}
        />
      </div>
    </div>
  );
}

// 마지막 슬라이드 컴포넌트
function EndingSlide() {
  return (
    <div className="chapter_slide ending_slide">
      <div className="chapter_content_wrap">
        <div className="ending_header">
          <span className="ending_label">색동낭자의 인사말</span>
        </div>
        <div className="ending_message">
          <p>여기까지 긴 리포트를 읽어주셔서 감사합니다.</p>
          <p>
            사주는 정해진 운명이 아니라, 나를 더 잘 이해하고 더 나은 선택을 하기
            위한 도구예요.
          </p>
          <p>
            당신의 사랑이 더 깊어지고, 더 따뜻해지길 진심으로 응원합니다.
          </p>
          <p className="ending_sign">- 색동낭자 드림</p>
        </div>
        <div className="ending_buttons">
          <Link href="/saju-love" className="action_btn primary">
            다른 사주 분석하기
          </Link>
          <Link href="/" className="action_btn secondary">
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

// 마크다운 파서
function simpleMD(src: string = ""): string {
  // 1) 코드블록
  src = src.replace(
    /```([\s\S]*?)```/g,
    (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
  );

  // 2) 인라인 코드
  src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);

  // 3) 헤딩
  src = src
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // 4) 굵게 / 이탤릭
  src = src
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");

  // 5) 링크 / 이미지
  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

  // 6) 표
  src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    if (rows.length < 2) return match;

    let html = '<table class="md-table">';
    rows.forEach((row: string, idx: number) => {
      if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;

      const cells = row.split("|").filter((_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1);
      const tag = idx === 0 ? "th" : "td";
      html += "<tr>";
      cells.forEach((cell: string) => {
        html += `<${tag}>${cell.trim()}</${tag}>`;
      });
      html += "</tr>";
    });
    html += "</table>";
    return html;
  });

  // 7) 가로줄
  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");

  // 8) 블록인용
  src = src.replace(/(^>\s?.*$\n?)+/gm, (match) => {
    const content = match
      .split("\n")
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter((line) => line)
      .join("<br>");
    return `<blockquote>${content}</blockquote>`;
  });

  // 8-1) 블록인용 프로필 이미지 추가
  src = src.replace(
    /<blockquote><strong>색동낭자 콕 찍기<\/strong>/g,
    '<blockquote class="quote-pinch"><div class="quote-header"><img src="/saju-love/img/pinch.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 콕 찍기</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>색동낭자 속닥속닥<\/strong>/g,
    '<blockquote class="quote-sokdak"><div class="quote-header"><img src="/saju-love/img/sokdak.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 속닥속닥</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>색동낭자 토닥토닥<\/strong>/g,
    '<blockquote class="quote-todak"><div class="quote-header"><img src="/saju-love/img/todak.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 토닥토닥</strong></div>'
  );

  // 9) 리스트
  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, "");

  // 10) 이탤릭
  src = src
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");

  // 11) 취소선
  src = src.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // 12) 개행
  src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");

  return `<p>${src}</p>`;
}

function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (m) => escapeMap[m]);
}

// 챕터 내용 포맷팅
function formatChapterContent(content: string): string {
  if (!content) return "";

  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const hasSections = sectionPattern.test(content);
  sectionPattern.lastIndex = 0;

  if (!hasSections) {
    return simpleMD(content);
  }

  let formatted = "";
  const sections: { number: string; title: string; startIndex: number; endIndex: number }[] = [];

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({
      number: match[1],
      title: match[2].trim(),
      startIndex: match.index,
      endIndex: sectionPattern.lastIndex,
    });
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    const sectionStart = section.endIndex;
    const sectionEnd = nextSection ? nextSection.startIndex : content.length;
    let sectionContent = content.substring(sectionStart, sectionEnd).trim();
    sectionContent = formatSubsections(sectionContent);

    formatted += `
      <div class="chapter_section">
        <h3 class="section_title">
          <span class="section_number">${section.number}</span>
          <span class="section_text">${escapeHTML(section.title)}</span>
        </h3>
        <div class="section_content">${sectionContent}</div>
      </div>
    `;
  }

  if (sections.length > 0 && sections[0].startIndex > 0) {
    const beforeContent = content.substring(0, sections[0].startIndex).trim();
    if (beforeContent) {
      formatted = simpleMD(beforeContent) + formatted;
    }
  }

  return formatted;
}

// 하위 섹션 포맷팅
function formatSubsections(content: string): string {
  if (!content) return "";

  const subsectionPattern = /####\s*(.+?)(?:\n|$)/g;
  const hasSubsections = subsectionPattern.test(content);
  subsectionPattern.lastIndex = 0;

  if (!hasSubsections) {
    return simpleMD(content);
  }

  let formatted = "";
  const subsections: { title: string; startIndex: number; endIndex: number }[] = [];
  let match;

  while ((match = subsectionPattern.exec(content)) !== null) {
    subsections.push({
      title: match[1].trim(),
      startIndex: match.index,
      endIndex: subsectionPattern.lastIndex,
    });
  }

  if (subsections.length > 0 && subsections[0].startIndex > 0) {
    const beforeContent = content.substring(0, subsections[0].startIndex).trim();
    if (beforeContent) {
      formatted += simpleMD(beforeContent);
    }
  }

  for (let i = 0; i < subsections.length; i++) {
    const subsection = subsections[i];
    const nextSubsection = subsections[i + 1];

    const subsectionStart = subsection.endIndex;
    const subsectionEnd = nextSubsection ? nextSubsection.startIndex : content.length;
    const subsectionContent = content.substring(subsectionStart, subsectionEnd).trim();

    formatted += `
      <div class="subsection">
        <h4 class="subsection_title">${escapeHTML(subsection.title)}</h4>
        <div class="subsection_content">${simpleMD(subsectionContent)}</div>
      </div>
    `;
  }

  return formatted;
}

// 3장 전용 포맷팅 (이상형 이미지 포함)
function formatChapterContentWithIdealType(
  content: string,
  data: SajuLoveRecord,
  clickCount: number,
  setClickCount: (count: number) => void,
  maxClicks: number
): string {
  if (!content) return "";

  const userName = data.loveAnalysis?.user_name || "고객";
  const idealPartner = data.loveAnalysis?.ideal_partner_image;

  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const sections: { number: string; title: string; startIndex: number; endIndex: number }[] = [];

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({
      number: match[1],
      title: match[2].trim(),
      startIndex: match.index,
      endIndex: sectionPattern.lastIndex,
    });
  }

  if (sections.length === 0) {
    return simpleMD(content);
  }

  let formatted = "";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    const sectionStart = section.endIndex;
    const sectionEnd = nextSection ? nextSection.startIndex : content.length;
    let sectionContent = content.substring(sectionStart, sectionEnd).trim();
    sectionContent = formatSubsections(sectionContent);

    formatted += `
      <div class="chapter_section">
        <div class="section_title">
          <span class="section_number">${section.number}</span>
          <span class="section_text">${escapeHTML(section.title)}</span>
        </div>
        <div class="section_content">${sectionContent}</div>
      </div>
    `;

    // 풀이 1 다음에 이상형 이미지 삽입
    if (section.number === "1" && idealPartner?.image_base64) {
      const blurLevel = Math.max(0, 30 - clickCount * 6);
      const isRevealed = clickCount >= maxClicks;

      formatted += `
        <div class="ideal_type_inline">
          <div class="ideal_type_header">
            <span class="ideal_type_label">드디어 공개!</span>
            <h3 class="ideal_type_title">${userName}님의 운명의 상대</h3>
          </div>
          <div
            class="ideal_type_image_wrap ${isRevealed ? 'ideal_type_revealed' : 'ideal_type_blurred'}"
            data-click-count="${clickCount}"
            onclick="this.dataset.clickCount = Math.min(${maxClicks}, parseInt(this.dataset.clickCount || 0) + 1); if(parseInt(this.dataset.clickCount) >= ${maxClicks}) { this.classList.remove('ideal_type_blurred'); this.classList.add('ideal_type_revealed'); }"
          >
            <img
              src="data:image/png;base64,${idealPartner.image_base64}"
              alt="이상형 이미지"
              class="ideal_type_image"
              style="filter: blur(${blurLevel}px); transition: filter 0.4s ease-out;"
            />
          </div>
          ${!isRevealed ? '<p class="ideal_type_tap_hint">사진을 클릭해보세요!</p>' : ''}
        </div>
      `;
    }
  }

  return formatted;
}

// Suspense로 감싼 export default 컴포넌트
export default function SajuLoveResultPage() {
  return (
    <Suspense fallback={
      <div className="saju_result_page">
        <div className="main_body_wrap">
          <div className="loading_wrap">
            <div className="loading_spinner"></div>
            <p className="loading_text">불러오는 중...</p>
          </div>
        </div>
      </div>
    }>
      <SajuLoveResultContent />
    </Suspense>
  );
}
