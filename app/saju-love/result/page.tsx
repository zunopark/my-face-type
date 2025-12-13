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

// 메시지 타입 정의
type MessageItem = {
  id: string;
  type: "dialogue" | "report" | "image" | "saju-intro" | "ending";
  content: string;
  chapterIndex?: number;
  imageBase64?: string;
  bgImage?: string;
};

// 오행 색상 맵
const ELEMENT_COLORS: Record<string, string> = {
  木: "#2aa86c", wood: "#2aa86c",
  火: "#ff6a6a", fire: "#ff6a6a",
  土: "#caa46a", earth: "#caa46a",
  金: "#9a9a9a", metal: "#9a9a9a",
  水: "#6aa7ff", water: "#6aa7ff",
};

const ELEMENT_BG_COLORS: Record<string, string> = {
  木: "rgba(42, 168, 108, 0.12)", wood: "rgba(42, 168, 108, 0.12)",
  火: "rgba(255, 106, 106, 0.12)", fire: "rgba(255, 106, 106, 0.12)",
  土: "rgba(202, 164, 106, 0.12)", earth: "rgba(202, 164, 106, 0.12)",
  金: "rgba(154, 154, 154, 0.12)", metal: "rgba(154, 154, 154, 0.12)",
  水: "rgba(106, 167, 255, 0.12)", water: "rgba(106, 167, 255, 0.12)",
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

// 각 챕터별 색동낭자 대사
const CHAPTER_DIALOGUES: Record<number, { intro: string; outro: string; bgImage: string }> = {
  0: {
    intro: "먼저, 너의 사주 팔자를\n살펴볼게.",
    outro: "자, 이제 본격적으로\n너의 연애 성향을 파헤쳐볼까?",
    bgImage: "/saju-love/img/1.png",
  },
  1: {
    intro: "1장에서는 네가 가진 매력과\n연애 스타일을 알려줄게!",
    outro: "어때, 너의 매력을 알겠어?\n이제 미래의 연애 운을 살펴볼게!",
    bgImage: "/saju-love/img/2.png",
  },
  2: {
    intro: "2장에서는 앞으로 펼쳐질\n너의 연애 운세를 알려줄게.",
    outro: "운세의 흐름을 파악했으니,\n이제 운명의 상대에 대해 얘기해볼까?",
    bgImage: "/saju-love/img/3.png",
  },
  3: {
    intro: "3장에서는 네가 만나게 될\n운명의 상대에 대해 알려줄게.",
    outro: "드디어 마지막 장이야.\n네가 물어본 고민에 대해 답해줄게.",
    bgImage: "/saju-love/img/11.png",
  },
  4: {
    intro: "자, 네가 고민으로 남겨준\n이야기에 대해 답해줄게.",
    outro: "",
    bgImage: "/saju-love/img/22.png",
  },
};

function SajuLoveResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SajuLoveRecord | null>(null);

  // 대화형 UI 상태
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dialogueText, setDialogueText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [currentBgImage, setCurrentBgImage] = useState("/saju-love/img/1.png");
  const [canProceed, setCanProceed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const isFetchingRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 메시지 리스트 생성
  const buildMessageList = useCallback((record: SajuLoveRecord): MessageItem[] => {
    const result: MessageItem[] = [];
    const userName = record.loveAnalysis?.user_name || record.input?.userName || "고객";

    // 1. 인트로 대사
    result.push({
      id: "intro-dialogue",
      type: "dialogue",
      content: `${userName}님, 드디어 분석이 완료됐어!\n지금부터 너의 연애 사주를 풀어줄게.`,
      bgImage: "/saju-love/img/1.png",
    });

    // 2. 사주 원국 소개 대사
    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: CHAPTER_DIALOGUES[0].intro,
      bgImage: CHAPTER_DIALOGUES[0].bgImage,
    });

    // 3. 사주 원국 카드
    result.push({
      id: "saju-intro-card",
      type: "saju-intro",
      content: "",
      bgImage: "/saju-love/img/2.png",
    });

    // 4. 사주 원국 아웃트로
    result.push({
      id: "saju-outro-dialogue",
      type: "dialogue",
      content: CHAPTER_DIALOGUES[0].outro,
      bgImage: "/saju-love/img/2.png",
    });

    // 5. 각 챕터별 메시지
    record.loveAnalysis?.chapters.forEach((chapter, index) => {
      const chapterNum = index + 1;
      const dialogues = CHAPTER_DIALOGUES[chapterNum];

      // 챕터 인트로 대사
      if (dialogues?.intro) {
        result.push({
          id: `chapter-${chapterNum}-intro`,
          type: "dialogue",
          content: dialogues.intro,
          bgImage: dialogues.bgImage,
        });
      }

      // 챕터 리포트 카드
      result.push({
        id: `chapter-${chapterNum}-report`,
        type: "report",
        content: chapter.content,
        chapterIndex: index,
        bgImage: dialogues?.bgImage || "/saju-love/img/1.png",
      });

      // 3장인 경우 이상형 이미지 추가
      if (index === 2 && record.loveAnalysis?.ideal_partner_image?.image_base64) {
        result.push({
          id: "ideal-type-image",
          type: "image",
          content: `${userName}님의 운명의 상대`,
          imageBase64: record.loveAnalysis.ideal_partner_image.image_base64,
          bgImage: "/saju-love/img/33.png",
        });
      }

      // 챕터 아웃트로 대사
      if (dialogues?.outro) {
        result.push({
          id: `chapter-${chapterNum}-outro`,
          type: "dialogue",
          content: dialogues.outro,
          bgImage: dialogues.bgImage,
        });
      }
    });

    // 6. 마무리 메시지
    result.push({
      id: "ending",
      type: "ending",
      content: "",
      bgImage: "/saju-love/img/33.png",
    });

    return result;
  }, []);

  // 리포트 표시 시 스크롤 이벤트 리스너 등록
  useEffect(() => {
    if (showReport && reportRef.current) {
      const el = reportRef.current;

      // 스크롤 체크 함수 (클로저로 정의)
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px 여유

        if (isAtBottom) {
          setCanProceed(true);
          setShowScrollHint(false);
        }
      };

      // 초기 상태 리셋 후 체크
      setCanProceed(false);
      setShowScrollHint(true);

      // DOM이 렌더링된 후 스크롤 필요 여부 확인
      const checkTimer = setTimeout(() => {
        const needsScroll = el.scrollHeight > el.clientHeight + 50;

        if (!needsScroll) {
          // 스크롤이 필요 없으면 바로 버튼 표시
          setCanProceed(true);
          setShowScrollHint(false);
        } else {
          // 스크롤 이벤트 리스너 등록
          el.addEventListener("scroll", handleScroll);
          // 혹시 이미 스크롤되어 있을 경우 체크
          handleScroll();
        }
      }, 300);

      return () => {
        clearTimeout(checkTimer);
        el.removeEventListener("scroll", handleScroll);
      };
    }
  }, [showReport, currentIndex]);

  // 타이핑 효과
  const typeText = useCallback((text: string, onComplete: () => void) => {
    setIsTyping(true);
    setShowButtons(false);
    setDialogueText("");

    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDialogueText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onComplete();
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // 다음 메시지로 이동
  const handleNext = useCallback(() => {
    // 타이핑 중이면 스킵
    if (isTyping) {
      const currentMsg = messages[currentIndex];
      if (currentMsg?.type === "dialogue") {
        setDialogueText(currentMsg.content);
        setIsTyping(false);
        setShowButtons(true);
      }
      return;
    }

    // 리포트 보고 있으면 닫기
    if (showReport) {
      setShowReport(false);
      // 다음 메시지로
      const nextIndex = currentIndex + 1;
      if (nextIndex < messages.length) {
        setCurrentIndex(nextIndex);
        const nextMsg = messages[nextIndex];
        if (nextMsg.bgImage) setCurrentBgImage(nextMsg.bgImage);

        if (nextMsg.type === "dialogue") {
          typeText(nextMsg.content, () => setShowButtons(true));
        } else {
          setShowReport(true);
          setShowButtons(true);
        }
      }
      return;
    }

    // 다음 메시지로
    const nextIndex = currentIndex + 1;
    if (nextIndex < messages.length) {
      setCurrentIndex(nextIndex);
      const nextMsg = messages[nextIndex];
      if (nextMsg.bgImage) setCurrentBgImage(nextMsg.bgImage);

      if (nextMsg.type === "dialogue") {
        typeText(nextMsg.content, () => setShowButtons(true));
      } else {
        setShowReport(true);
        setShowButtons(true);
      }
    }
  }, [currentIndex, messages, isTyping, showReport, typeText]);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const loadingMsgs = [
      `${userName}님의 사주 팔자를 분석하고 있어요`,
      "완료하는 데 2~3분 정도 걸려요",
      "지금 페이지를 나가면 분석이 완료되지 않을 수 있어요",
      `${userName}님의 연애 성향을 파악하고 있어요`,
      "운명의 상대를 찾고 있어요",
      "곧 분석이 완료됩니다",
    ];
    let index = 0;
    setLoadingMessage(loadingMsgs[0]);

    loadingIntervalRef.current = setInterval(() => {
      index = (index + 1) % loadingMsgs.length;
      setLoadingMessage(loadingMsgs[index]);
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

        const hasImage = loveResult.ideal_partner_image?.image_base64;
        if (!hasImage && retryCount < MAX_RETRIES) {
          setLoadingMessage("이미지 생성 재시도 중...");
          return fetchLoveAnalysis(storedData, retryCount + 1);
        }

        if (!hasImage) {
          throw new Error("이미지 생성에 실패했습니다.");
        }

        const updatedData: SajuLoveRecord = {
          ...storedData,
          loveAnalysis: loveResult,
        };
        await updateSajuLoveRecord(storedData.id, { loveAnalysis: loveResult });

        stopLoadingMessages();
        setData(updatedData);

        // 메시지 리스트 생성
        const messageList = buildMessageList(updatedData);
        setMessages(messageList);
        setIsLoading(false);

        // 첫 번째 메시지 자동 시작
        setTimeout(() => {
          if (messageList[0].bgImage) setCurrentBgImage(messageList[0].bgImage);
          typeText(messageList[0].content, () => setShowButtons(true));
        }, 500);
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
    [startLoadingMessages, stopLoadingMessages, buildMessageList, typeText]
  );

  // 초기화
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

      if (record.loveAnalysis) {
        setData(record);
        const messageList = buildMessageList(record);
        setMessages(messageList);
        setIsLoading(false);
        setTimeout(() => {
          if (messageList[0].bgImage) setCurrentBgImage(messageList[0].bgImage);
          typeText(messageList[0].content, () => setShowButtons(true));
        }, 500);
        return;
      }

      fetchLoveAnalysis(record);
    };

    loadData();
  }, [resultId, fetchLoveAnalysis, buildMessageList, typeText]);

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

  const userName = data.loveAnalysis.user_name || data.input.userName || "고객";
  const currentMsg = messages[currentIndex];

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (showReport) return "확인했어";
    if (currentMsg?.type === "dialogue") return "다음";
    return "확인하기";
  };

  return (
    <div className="saju_result_page chat_mode">
      {/* 배경 이미지 */}
      <div className="result_bg">
        <img
          src={currentBgImage}
          alt=""
          className="result_bg_image"
        />
      </div>

      {/* 뒤로가기 버튼 */}
      <Link href="/saju-love" className="back_btn">
        <span className="material-icons">arrow_back</span>
        <span className="back_btn_text">처음으로</span>
      </Link>

      {/* 리포트 카드 (오버레이) */}
      {showReport && currentMsg && (
        <div className="report_overlay active">
          <div className="report_scroll" ref={reportRef}>
            {currentMsg.type === "saju-intro" && (
              <SajuIntroCard data={data} userName={userName} />
            )}
            {currentMsg.type === "report" && (
              <ReportCard
                chapter={data.loveAnalysis!.chapters[currentMsg.chapterIndex!]}
                chapterIndex={currentMsg.chapterIndex!}
                data={data}
              />
            )}
            {currentMsg.type === "image" && currentMsg.imageBase64 && (
              <IdealTypeCard
                imageBase64={currentMsg.imageBase64}
                userName={userName}
              />
            )}
            {currentMsg.type === "ending" && (
              <EndingCard />
            )}
          </div>

          {/* 스크롤 힌트 */}
          {showScrollHint && !canProceed && (
            <div className="scroll_hint">
              <span className="material-icons">keyboard_arrow_down</span>
              아래로 스크롤해주세요
            </div>
          )}

          {/* 하단 다음 버튼 */}
          <div className={`report_bottom_btn_wrap ${canProceed ? "visible" : ""}`}>
            {currentMsg.type === "ending" ? (
              <div className="end_buttons">
                <Link href="/saju-love" className="dialogue_next_btn">
                  다시 분석하기
                </Link>
                <Link href="/" className="dialogue_secondary_btn">
                  홈으로
                </Link>
              </div>
            ) : (
              <button className="report_next_btn" onClick={handleNext}>
                확인했어
              </button>
            )}
          </div>
        </div>
      )}

      {/* 대화 UI (하단 고정) */}
      <div className={`dialogue_wrap ${!showReport ? "active" : ""}`}>
        <div className="dialogue_box">
          <div className="dialogue_speaker">색동낭자</div>
          <p className="dialogue_text">
            {dialogueText}
            {isTyping && <span className="typing-cursor"></span>}
          </p>
        </div>

        <div className={`dialogue_buttons ${showButtons ? "visible" : ""}`}>
          <button className="dialogue_next_btn" onClick={handleNext}>
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}

// 사주 인트로 카드
function SajuIntroCard({ data, userName }: { data: SajuLoveRecord; userName: string }) {
  const { input, sajuData } = data;
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
    const map: Record<string, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
    return map[element.toLowerCase()] || element;
  };

  const toKoreanYinYang = (value: string | undefined) => {
    if (!value) return "—";
    const map: Record<string, string> = { yang: "양", yin: "음" };
    return map[value.toLowerCase()] || value;
  };

  const positionToHanja: Record<string, string> = { year: "年", month: "月", day: "日", hour: "時" };

  const formatPositions = (positions: string[] | undefined) => {
    if (!positions || positions.length === 0) return "";
    return positions.map((p) => positionToHanja[p] || p).join(" ");
  };

  const hasPeach = loveFacts?.peachBlossom?.hasPeach ||
    (loveFacts?.peachBlossom?.positions && loveFacts.peachBlossom.positions.length > 0);
  const peachText = hasPeach ? formatPositions(loveFacts?.peachBlossom?.positions) : "없음";

  const hasSpouse = loveFacts?.spouseStars?.positions && loveFacts.spouseStars.positions.length > 0;
  const spouseText = hasSpouse ? formatPositions(loveFacts?.spouseStars?.positions) : "없음";

  const pillarLabels: Record<string, string> = { hour: "시주", day: "일주", month: "월주", year: "년주" };

  return (
    <div className="report_card saju_intro_card">
      <div className="card_header">
        <span className="card_label">사주 원국</span>
        <h3 className="card_title">{userName}님의 사주 팔자</h3>
      </div>

      <div className="saju_info_row">
        <div className="saju_info_main">
          <span className="saju_info_name">{userName}</span>
          <span className="saju_info_birth">{birthDateText}</span>
        </div>
        <div className="saju_info_ilju">
          <span className="ilju_char">{dayMaster?.char || "—"}</span>
          <span className="ilju_title">{dayMaster?.title || "—"}</span>
        </div>
      </div>

      <div className="pillars_mini">
        {(["hour", "day", "month", "year"] as const).map((key) => {
          const p = pillars[key];
          return (
            <div key={key} className="pillar_mini_item">
              <div className="pillar_mini_label">{pillarLabels[key]}</div>
              <div className="pillar_mini_chars">
                <span
                  className="pillar_mini_stem"
                  style={{ color: getColor(p?.stem?.element), background: getBgColor(p?.stem?.element) }}
                >
                  {p?.stem?.char || "—"}
                </span>
                <span
                  className="pillar_mini_branch"
                  style={{ color: getColor(p?.branch?.element), background: getBgColor(p?.branch?.element) }}
                >
                  {p?.branch?.char || "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="love_facts_mini">
        <div className="love_fact_mini">
          <span className="fact_label">일간</span>
          <span className="fact_value">{dayMaster?.char} {dayMaster?.title}</span>
        </div>
        <div className="love_fact_mini">
          <span className="fact_label">오행/음양</span>
          <span className="fact_value">{toKoreanElement(dayMaster?.element)} / {toKoreanYinYang(dayMaster?.yinYang)}</span>
        </div>
        <div className="love_fact_mini">
          <span className="fact_label">도화살</span>
          <span className={`fact_value ${hasPeach ? "highlight" : "muted"}`}>{peachText}</span>
        </div>
        <div className="love_fact_mini">
          <span className="fact_label">배우자운</span>
          <span className={`fact_value ${hasSpouse ? "highlight" : "muted"}`}>{spouseText}</span>
        </div>
      </div>
    </div>
  );
}

// 리포트 카드
function ReportCard({
  chapter,
  chapterIndex,
  data,
}: {
  chapter: { title: string; content: string };
  chapterIndex: number;
  data: SajuLoveRecord;
}) {
  let titleText = chapter.title || `챕터 ${chapterIndex + 1}`;
  titleText = titleText
    .replace(/^#+\s*/, "")
    .replace(/\[(\d+)장\]\s*/, "")
    .replace(/^(\d+)장\s*/, "")
    .trim();

  const isQuestionChapter = chapterIndex === 3;
  const userConcern = data.input?.userConcern?.trim();

  return (
    <div className="report_card">
      <div className="card_header">
        <span className="card_label">{chapterIndex + 1}장</span>
        <h3 className="card_title">{titleText}</h3>
      </div>

      {isQuestionChapter && userConcern && (
        <div className="concern_box_mini">
          <div className="concern_label">{data.input.userName || "고객"}님이 남긴 고민</div>
          <p className="concern_text">{userConcern}</p>
        </div>
      )}

      <div
        className="card_content"
        dangerouslySetInnerHTML={{ __html: formatChapterContent(chapter.content || "") }}
      />
    </div>
  );
}

// 이상형 이미지 카드
function IdealTypeCard({ imageBase64, userName }: { imageBase64: string; userName: string }) {
  const [clickCount, setClickCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const maxClicks = 5;
  const blurLevel = Math.max(0, 30 - clickCount * 6);
  const isRevealed = clickCount >= maxClicks;

  const handleClick = () => {
    if (clickCount < maxClicks) {
      setClickCount(clickCount + 1);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="report_card ideal_type_card">
      <div className="card_header">
        <span className="card_label">운명의 상대</span>
        <h3 className="card_title">{userName}님의 이상형</h3>
      </div>
      <div
        className={`ideal_image_wrap ${isRevealed ? "revealed" : "blurred"} ${isShaking ? "shake" : ""}`}
        onClick={handleClick}
      >
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="이상형 이미지"
          className="ideal_image"
          style={{ filter: `blur(${blurLevel}px)`, transition: "filter 0.4s ease-out" }}
        />
      </div>
      {!isRevealed && (
        <p className="ideal_tap_hint">사진을 {maxClicks - clickCount}번 더 클릭해보세요!</p>
      )}
    </div>
  );
}

// 마무리 카드
function EndingCard() {
  return (
    <div className="report_card ending_card">
      <div className="ending_content">
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
    </div>
  );
}

// 마크다운 파서
function simpleMD(src: string = ""): string {
  src = src.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`);
  src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);
  src = src
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");
  src = src
    .replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___([^_]+)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    if (rows.length < 2) return match;
    let html = '<table class="md-table">';
    rows.forEach((row: string, idx: number) => {
      if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;
      const cells = row.split("|").filter((_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1);
      const tag = idx === 0 ? "th" : "td";
      html += "<tr>";
      cells.forEach((cell: string) => { html += `<${tag}>${cell.trim()}</${tag}>`; });
      html += "</tr>";
    });
    html += "</table>";
    return html;
  });
  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");
  src = src.replace(/(^>\s?.*$\n?)+/gm, (match) => {
    const content = match.split("\n").map((line) => line.replace(/^>\s?/, "").trim()).filter((line) => line).join("<br>");
    return `<blockquote>${content}</blockquote>`;
  });
  src = src.replace(/<blockquote><strong>색동낭자 콕 찍기<\/strong>/g,
    '<blockquote class="quote-pinch"><div class="quote-header"><img src="/saju-love/img/pinch.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 콕 찍기</strong></div>');
  src = src.replace(/<blockquote><strong>색동낭자 속닥속닥<\/strong>/g,
    '<blockquote class="quote-sokdak"><div class="quote-header"><img src="/saju-love/img/sokdak.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 속닥속닥</strong></div>');
  src = src.replace(/<blockquote><strong>색동낭자 토닥토닥<\/strong>/g,
    '<blockquote class="quote-todak"><div class="quote-header"><img src="/saju-love/img/todak.png" class="quote-profile" alt="색동낭자"><strong>색동낭자 토닥토닥</strong></div>');
  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, "");
  src = src
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
  src = src.replace(/~~(.+?)~~/g, "<del>$1</del>");
  src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  return `<p>${src}</p>`;
}

function escapeHTML(str: string): string {
  const escapeMap: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return str.replace(/[&<>"']/g, (m) => escapeMap[m]);
}

function formatChapterContent(content: string): string {
  if (!content) return "";
  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const hasSections = sectionPattern.test(content);
  sectionPattern.lastIndex = 0;

  if (!hasSections) return simpleMD(content);

  let formatted = "";
  const sections: { number: string; title: string; startIndex: number; endIndex: number }[] = [];
  let match;

  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({ number: match[1], title: match[2].trim(), startIndex: match.index, endIndex: sectionPattern.lastIndex });
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
    if (beforeContent) formatted = simpleMD(beforeContent) + formatted;
  }

  return formatted;
}

function formatSubsections(content: string): string {
  if (!content) return "";
  const subsectionPattern = /####\s*(.+?)(?:\n|$)/g;
  const hasSubsections = subsectionPattern.test(content);
  subsectionPattern.lastIndex = 0;

  if (!hasSubsections) return simpleMD(content);

  let formatted = "";
  const subsections: { title: string; startIndex: number; endIndex: number }[] = [];
  let match;

  while ((match = subsectionPattern.exec(content)) !== null) {
    subsections.push({ title: match[1].trim(), startIndex: match.index, endIndex: subsectionPattern.lastIndex });
  }

  if (subsections.length > 0 && subsections[0].startIndex > 0) {
    const beforeContent = content.substring(0, subsections[0].startIndex).trim();
    if (beforeContent) formatted += simpleMD(beforeContent);
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
