"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
// 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
const SAJU_API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;
import { getSajuLoveRecord, updateSajuLoveRecord, SajuLoveRecord } from "@/lib/db/sajuLoveDB";
import Link from "next/link";
import "./result.css";

// 연애 사주 분석 결과 타입
interface LoveAnalysisResult {
  user_name: string;
  chapters: {
    number: number;  // 0=들어가며, 1~6=각 장
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
  type: "dialogue" | "report" | "image" | "ending" | "saju" | "intro";
  content: string;
  chapterIndex?: number;
  imageBase64?: string;
  bgImage?: string;
};

// 오행 색상
const elementColors: Record<string, string> = {
  "木": "#2aa86c", wood: "#2aa86c", Wood: "#2aa86c",
  "火": "#ff6a6a", fire: "#ff6a6a", Fire: "#ff6a6a",
  "土": "#caa46a", earth: "#caa46a", Earth: "#caa46a",
  "金": "#9a9a9a", metal: "#9a9a9a", Metal: "#9a9a9a",
  "水": "#6aa7ff", water: "#6aa7ff", Water: "#6aa7ff",
};

const getColor = (element?: string): string => {
  if (!element) return "#333";
  return elementColors[element] || "#333";
};

// 오행 한글 변환 함수 (음양 포함)
const getElementKorean = (element: string | undefined, yinYang?: string): string => {
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

// 각 챕터별 대사와 배경 이미지
// API 응답: [1장, 2장, 3장, 4장, 5장, 6장] - 총 6개 챕터
const getChapterConfig = (userName: string): Record<string, { intro: string; outro: string; bgImage: string }> => ({
  chapter1: {
    // 1장: 나만의 매력과 연애 성향
    intro: `1장에서는 ${userName}님이 가진 매력과\n연애 스타일을 알려드릴게요!`,
    outro: `어떠세요, ${userName}님의 매력이 보이시나요?\n이제 미래의 연애 운을 살펴볼게요!`,
    bgImage: "/saju-love/img/2.png",
  },
  chapter2: {
    // 2장: 앞으로 펼쳐질 사랑의 흐름
    intro: `2장에서는 앞으로 펼쳐질\n${userName}님의 연애 운세를 알려드릴게요.`,
    outro: "운세의 흐름을 파악했으니,\n이제 운명의 상대에 대해 얘기해볼까요?",
    bgImage: "/saju-love/img/3.png",
  },
  chapter3: {
    // 3장: 결국 만나게 될 운명의 상대
    intro: `3장에서는 ${userName}님이 만나게 될\n운명의 상대에 대해 알려드릴게요.`,
    outro: "이제 조심해야 할 가짜 인연에\n대해 이야기해드릴게요.",
    bgImage: "/saju-love/img/11.png",
  },
  chapter4: {
    // 4장: 운명이라 착각하는 가짜 인연
    intro: "4장에서는 운명이라 착각할 수 있는\n가짜 인연에 대해 알려드릴게요.",
    outro: "자, 이제 조금 민감한 주제로\n넘어가볼까요?",
    bgImage: "/saju-love/img/22.png",
  },
  chapter5: {
    // 5장: 누구에게도 말 못할, 그 사람과의 스킨십
    intro: "5장에서는 누구에게도 말 못할,\n스킨십에 대해 이야기해드릴게요.",
    outro: `마지막으로 제가 ${userName}님께\n전해드릴 귀띔이 있어요.`,
    bgImage: "/saju-love/img/33.png",
  },
  chapter6: {
    // 6장: 색동낭자의 귀띔 (고민 답변)
    intro: `자, 이제 마지막 장이에요.\n${userName}님의 고민에 대한 답을 드릴게요.`,
    outro: "",
    bgImage: "/saju-love/img/33.png",
  },
});

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
  const [canProceed, setCanProceed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showTocModal, setShowTocModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const isFetchingRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 챕터에서 키 추출 (number 또는 title 기반)
  const getChapterKey = (chapter: { number?: number; title?: string }): string => {
    // number가 있으면 사용 (1~6장)
    if (typeof chapter.number === "number" && chapter.number >= 1 && chapter.number <= 6) {
      return `chapter${chapter.number}`;
    }
    // number가 없으면 title에서 추출 (기존 데이터 호환)
    const title = chapter.title || "";
    if (title.includes("1장")) return "chapter1";
    if (title.includes("2장")) return "chapter2";
    if (title.includes("3장")) return "chapter3";
    if (title.includes("4장")) return "chapter4";
    if (title.includes("5장")) return "chapter5";
    if (title.includes("6장")) return "chapter6";
    return "chapter1"; // 기본값
  };

  // 메시지 리스트 생성
  // 흐름: 첫 인사 → [1장] → [2장] → [3장] → 이상형 이미지 → [4장] → [5장] → [6장] → 엔딩
  const buildMessageList = useCallback((record: SajuLoveRecord): MessageItem[] => {
    const result: MessageItem[] = [];
    const userName = record.loveAnalysis?.user_name || record.input?.userName || "고객";
    const chapters = record.loveAnalysis?.chapters || [];
    const hasIdealImage = !!record.loveAnalysis?.ideal_partner_image?.image_base64;

    // 1. 첫 인사 대화
    result.push({
      id: "opening-dialogue",
      type: "dialogue",
      content: `안녕하세요, ${userName}님!\n드디어 분석이 완료됐어요. 천천히 살펴볼까요?`,
      bgImage: "/saju-love/img/nangja.png",
    });

    // 2. 들어가며 안내 대화
    result.push({
      id: "intro-guide-dialogue",
      type: "dialogue",
      content: `${userName}님의 사주를 알려드리기 전에,\n먼저 연애 사주에 대해 간단히 설명해드릴게요.`,
      bgImage: "/saju-love/img/nangja.png",
    });

    // 3. 들어가며 인트로 카드
    result.push({
      id: "intro-card",
      type: "intro",
      content: "",
      bgImage: "/saju-love/img/nangja.png",
    });

    // 4. 사주 원국 소개 대화
    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`,
      bgImage: "/saju-love/img/nangja.png",
    });

    // 5. 사주 원국 카드
    result.push({
      id: "saju-card",
      type: "saju",
      content: "",
      bgImage: "/saju-love/img/nangja.png",
    });

    // 6. 각 챕터별 [intro 대화 → 리포트 → outro 대화]
    // 3장 이후에 이상형 이미지 삽입
    const chapterConfig = getChapterConfig(userName);
    chapters.forEach((chapter, index) => {
      const chapterKey = getChapterKey(chapter);
      const config = chapterConfig[chapterKey];
      const chapterNum = parseInt(chapterKey.replace("chapter", ""));

      // 챕터 intro 대화 (있는 경우에만)
      if (config?.intro) {
        result.push({
          id: `chapter-${chapterKey}-intro`,
          type: "dialogue",
          content: config.intro,
          bgImage: config.bgImage || "/saju-love/img/1.png",
        });
      }

      // 챕터 리포트 카드
      result.push({
        id: `chapter-${chapterKey}-report`,
        type: "report",
        content: chapter.content,
        chapterIndex: index,
        bgImage: config?.bgImage || "/saju-love/img/1.png",
      });

      // 챕터 outro 대화 (있는 경우에만)
      if (config?.outro) {
        result.push({
          id: `chapter-${chapterKey}-outro`,
          type: "dialogue",
          content: config.outro,
          bgImage: config.bgImage || "/saju-love/img/1.png",
        });
      }

      // 3장 이후에 이상형 이미지 삽입
      if (chapterNum === 3 && hasIdealImage) {
        result.push({
          id: "ideal-type-dialogue",
          type: "dialogue",
          content: `잠깐, 여기서 특별히 보여드릴게 있어요.\n${userName}님의 운명의 상대가 어떻게 생겼는지 궁금하지 않으세요?`,
          bgImage: "/saju-love/img/11.png",
        });
        result.push({
          id: "ideal-type-image",
          type: "image",
          content: `${userName}님의 운명의 상대`,
          imageBase64: record.loveAnalysis!.ideal_partner_image!.image_base64,
          bgImage: "/saju-love/img/11.png",
        });
        result.push({
          id: "ideal-type-outro",
          type: "dialogue",
          content: `어떠세요, 설레지 않으세요?\n자, 이제 계속해서 ${userName}님의 연애 운을 살펴볼게요!`,
          bgImage: "/saju-love/img/11.png",
        });
      }
    });

    // 3. 마무리 메시지
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

        // 스크롤이 조금이라도 발생하면 힌트 숨김
        if (scrollTop > 10) {
          setShowScrollHint(false);
        }

        if (isAtBottom) {
          setCanProceed(true);
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
    // 기존 인터벌 클리어
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }

    setIsTyping(true);
    setShowButtons(false);
    setDialogueText("");

    let i = 0;
    typingIntervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDialogueText(text.substring(0, i + 1));
        i++;
      } else {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setIsTyping(false);
        onComplete();
      }
    }, 50);
  }, []);

  // 이전 메시지로 이동
  const handlePrev = useCallback(() => {
    // 타이핑 중이면 무시
    if (isTyping) return;

    // 첫 번째 메시지면 무시
    if (currentIndex <= 0) return;

    // 리포트 보고 있으면 닫기
    if (showReport) {
      setShowReport(false);
    }

    // 이전 메시지로
    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevMsg = messages[prevIndex];

    if (prevMsg.type === "dialogue") {
      // 이전 대화는 타이핑 효과 없이 바로 보여주기
      setDialogueText(prevMsg.content);
      setShowButtons(true);
    } else {
      setShowReport(true);
      setShowButtons(true);
    }
  }, [currentIndex, messages, isTyping, showReport]);

  // 다음 메시지로 이동
  const handleNext = useCallback(() => {
    // 타이핑 중이면 스킵 (인터벌 클리어하고 텍스트 완성)
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
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

        // 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
        const response = await fetch(`${SAJU_API_URL}/saju_love/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saju_data: {
              ...storedData.sajuData,
              input: storedData.input,  // 성별 정보 포함
            },
            user_name: storedData.input?.userName || "",
            user_concern: combinedConcern.trim(),
            year: new Date().getFullYear(),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "분석에 실패했습니다.");
        }

        const loveResult = await response.json() as LoveAnalysisResult;

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
            <button
              className="error_btn"
              onClick={() => window.location.reload()}
            >
              다시 시작하기
            </button>
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
          src="/saju-love/img/nangja.png"
          alt=""
          className="result_bg_image"
        />
      </div>

      {/* 뒤로가기 버튼 */}
      <button className="back_btn" onClick={() => setShowExitModal(true)}>
        <span className="material-icons">arrow_back</span>
        <span className="back_btn_text">홈으로</span>
      </button>

      {/* 홈으로 돌아가기 확인 모달 */}
      {showExitModal && (
        <div className="exit_modal_overlay" onClick={() => setShowExitModal(false)}>
          <div className="exit_modal" onClick={(e) => e.stopPropagation()}>
            <p className="exit_modal_text">홈으로 돌아갈까요?</p>
            <div className="exit_modal_buttons">
              <button className="exit_modal_cancel" onClick={() => setShowExitModal(false)}>
                아니요
              </button>
              <button className="exit_modal_confirm" onClick={() => router.push("/saju-love")}>
                네, 돌아갈게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목차 버튼 */}
      <button className="toc_btn" onClick={() => setShowTocModal(true)}>
        <span className="toc_btn_text">목차</span>
      </button>

      {/* 목차 모달 */}
      {showTocModal && (
        <TocModal
          messages={messages}
          currentIndex={currentIndex}
          onClose={() => setShowTocModal(false)}
          onNavigate={(index) => {
            setCurrentIndex(index);
            const targetMsg = messages[index];
            if (targetMsg.type === "dialogue") {
              setShowReport(false);
              setDialogueText(targetMsg.content);
              setShowButtons(true);
            } else {
              setShowReport(true);
              setShowButtons(true);
            }
            setShowTocModal(false);
          }}
        />
      )}

      {/* 리포트 카드 (오버레이) */}
      {showReport && currentMsg && (
        <div className="report_overlay active">
          <div className="report_scroll" ref={reportRef}>
            {currentMsg.type === "intro" && (
              <IntroCard userName={userName} />
            )}
            {currentMsg.type === "saju" && (
              <SajuCard data={data} />
            )}
            {currentMsg.type === "report" && (
              <ReportCard
                chapter={data.loveAnalysis!.chapters[currentMsg.chapterIndex!]}
                chapterIndex={currentMsg.chapterIndex!}
              />
            )}
            {currentMsg.type === "image" && currentMsg.imageBase64 && (
              <IdealTypeCard
                imageBase64={currentMsg.imageBase64}
                userName={userName}
              />
            )}
            {currentMsg.type === "ending" && (
              <EndingCard data={data} />
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
              <div className="report_nav_buttons">
                {currentIndex > 0 && (
                  <button className="report_prev_btn" onClick={handlePrev}>
                    이전
                  </button>
                )}
                <button className="report_next_btn" onClick={handleNext}>
                  확인했어
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 대화 UI (하단 고정) */}
      <div className={`dialogue_wrap ${!showReport ? "active" : ""}`}>
        <div className="dialogue_box" onClick={handleNext}>
          <div className="dialogue_speaker">색동낭자</div>
          <p className="dialogue_text">
            {dialogueText}
            {isTyping && <span className="typing-cursor"></span>}
          </p>
        </div>

        <div className={`dialogue_buttons ${showButtons ? "visible" : ""}`}>
          {currentIndex > 0 && (
            <button className="dialogue_prev_btn" onClick={handlePrev}>
              이전
            </button>
          )}
          <button className="dialogue_next_btn" onClick={handleNext}>
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}

// 리포트 카드
function ReportCard({
  chapter,
  chapterIndex,
}: {
  chapter: { title: string; content: string };
  chapterIndex: number;
}) {
  const rawTitle = chapter.title || "";

  // 챕터 번호 추출 (1장, 2장 등)
  const chapterMatch = rawTitle.match(/(\d+)장/);
  const chapterNum = chapterMatch ? parseInt(chapterMatch[1]) : chapterIndex + 1;

  // 라벨 텍스트 결정
  const labelText = `${chapterNum}장`;

  // 타이틀 텍스트 정리
  let titleText = rawTitle
    .replace(/^#+\s*/, "")
    .replace(/\[(\d+)장\]\s*/, "")
    .replace(/^(\d+)장\s*/, "")
    .trim();

  return (
    <div className="report_card">
      <div className="card_header">
        <span className="card_label">{labelText}</span>
        <h3 className="card_title">{titleText}</h3>
      </div>

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

  // 클릭 횟수에 따른 힌트 문구
  const hintMessages = [
    "사진을 클릭해보세요!",
    "조금씩 보이기 시작해요...",
    "점점 선명해지고 있어요!",
    "거의 다 왔어요!",
    "마지막 한 번만 더!",
  ];

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
        <p className="ideal_tap_hint">{hintMessages[clickCount]}</p>
      )}
      {isRevealed && (
        <div className="ideal_revealed_message">
          <p>어떠세요, {userName}님?<br />혹시 어디선가 스쳐 지나간 적 있는 얼굴인가요?</p>
        </div>
      )}
    </div>
  );
}

// 사주 원국 카드
function SajuCard({ data }: { data: SajuLoveRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const sajuData = data.sajuData;
  const dayMaster = data.sajuData?.dayMaster;
  const input = data.input;

  // 태어난 시간을 시진으로 변환
  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const timeMap: Record<string, string> = {
      "0030": "자시",
      "0230": "축시",
      "0430": "인시",
      "0630": "묘시",
      "0830": "진시",
      "1030": "사시",
      "1230": "오시",
      "1430": "미시",
      "1630": "신시",
      "1830": "유시",
      "2030": "술시",
      "2230": "해시",
    };
    return timeMap[time] || null;
  };

  const birthTime = formatTimeToSi(input?.time);

  const pillarOrder = ["hour", "day", "month", "year"] as const;

  return (
    <div className="report_card saju_card">
      <div className="card_header">
        <span className="card_label">사주 원국</span>
        <h3 className="card_title">{userName}님의 타고난 운명</h3>
      </div>

      {/* 기본 정보 카드 */}
      <div className="info_card">
        <div className="info_main">
          <span className="info_name">{input?.userName}</span>
          <span className="info_birth">
            {input?.date}{birthTime ? ` | ${birthTime}` : ""}
          </span>
        </div>
        {dayMaster && (
          <div className="info_ilju">
            <span className="ilju_char" style={{ color: getColor(dayMaster.element) }}>{dayMaster.char}</span>
            <span className="ilju_title">{dayMaster.title}</span>
          </div>
        )}
      </div>

      {/* 사주 팔자 테이블 */}
      <div className="pillars_section">
        <div className="pillars_header">
          <span className="material-icons">view_column</span>
          사주 팔자
        </div>
        <div className="saju_table_wrap">
          <table className="saju_table">
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
              <tr className="row_cheongan">
                <td className="row_label">천간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  if (!p?.stem?.char) return <td key={key} className="cell_empty">—</td>;
                  return (
                    <td key={key}>
                      <span className="char_main" style={{ color: getColor(p.stem.element) }}>
                        {p.stem.char}{p.stem.korean}
                      </span>
                      <span className="char_element" style={{ color: getColor(p.stem.element) }}>
                        {getElementKorean(p.stem.element, p.stem.yinYang)}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (천간) */}
              <tr className="row_sipsung">
                <td className="row_label">십성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key} className="cell_sipsung" style={{ color: getColor(p?.stem?.element) }}>
                      {p?.tenGodStem || "—"}
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr className="row_jiji">
                <td className="row_label">지지</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  if (!p?.branch?.char) return <td key={key} className="cell_empty">—</td>;
                  return (
                    <td key={key}>
                      <span className="char_main" style={{ color: getColor(p.branch.element) }}>
                        {p.branch.char}{p.branch.korean}
                      </span>
                      <span className="char_element" style={{ color: getColor(p.branch.element) }}>
                        {getElementKorean(p.branch.element, p.branch.yinYang)}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (지지) */}
              <tr className="row_sipsung">
                <td className="row_label">십성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key} className="cell_sipsung" style={{ color: getColor(p?.branch?.element) }}>
                      {p?.tenGodBranchMain || "—"}
                    </td>
                  );
                })}
              </tr>
              {/* 지장간 */}
              <tr className="row_extra">
                <td className="row_label">지장간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const jijanggan = p?.jijanggan;
                  let displayValue = "—";
                  if (typeof jijanggan === 'string') {
                    displayValue = jijanggan;
                  } else if (jijanggan && typeof jijanggan === 'object') {
                    const obj = jijanggan as { display?: string; displayKorean?: string };
                    if (obj.display && obj.displayKorean) {
                      displayValue = `${obj.display}(${obj.displayKorean})`;
                    } else {
                      displayValue = obj.displayKorean || obj.display || "—";
                    }
                  }
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
              {/* 12운성 */}
              <tr className="row_extra">
                <td className="row_label">12운성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const twelveStage = (p as unknown as { twelveStage?: string })?.twelveStage || p?.twelveUnsung;
                  const displayValue = typeof twelveStage === 'string'
                    ? twelveStage
                    : (twelveStage as unknown as { display?: string })?.display || "—";
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
              {/* 12신살 */}
              <tr className="row_extra">
                <td className="row_label">12신살</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const twelveSinsal = p?.twelveSinsal;
                  const displayValue = typeof twelveSinsal === 'string'
                    ? twelveSinsal
                    : (twelveSinsal as unknown as { display?: string })?.display || "—";
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 신살과 길성 */}
      <div className="sinsal_section">
        <div className="sinsal_header">
          <span className="material-icons">auto_awesome</span>
          신살과 길성
        </div>
        <p className="sinsal_tags">
          {sajuData?.sinsal?._active && sajuData.sinsal._active.length > 0 ? (
            sajuData.sinsal._active.map((name, i, arr) => {
              const isLoveSinsal = name === "도화살" || name === "홍염살" || name === "화개살";
              return (
                <span key={i} className={isLoveSinsal ? "love" : "normal"}>
                  {name}{i < arr.length - 1 ? ", " : ""}
                </span>
              );
            })
          ) : (
            <span className="sinsal_empty">특이 신살 없음</span>
          )}
        </p>

        {/* 신살과 길성 테이블 */}
        <div className="sinsal_table_wrap">
          <table className="sinsal_table">
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
              <tr>
                <td className="row_label">천간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key}>
                      <span className="char_hanja" style={{ color: getColor(p?.stem?.element) }}>
                        {p?.stem?.char || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 천간 신살/길성 */}
              <tr>
                <td className="row_label">신살</td>
                {pillarOrder.map((key) => {
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  return (
                    <td key={key} className="cell_gilsung">
                      {stemSinsal.length > 0 ? stemSinsal.join(", ") : "×"}
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr>
                <td className="row_label">지지</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key}>
                      <span className="char_hanja" style={{ color: getColor(p?.branch?.element) }}>
                        {p?.branch?.char || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 지지 신살/길성 */}
              <tr>
                <td className="row_label">신살</td>
                {pillarOrder.map((key) => {
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  return (
                    <td key={key} className="cell_gilsung">
                      {branchSinsal.length > 0 ? branchSinsal.join(", ") : "×"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// 들어가며 인트로 카드
function IntroCard({ userName }: { userName: string }) {
  return (
    <div className="report_card intro_card">
      {/* 장면 1: 인사 */}
      <div className="intro_section intro_welcome">
        <p className="welcome_main">어서 오세요</p>
        <p className="welcome_sub">양반家에 오신 것을 환영해요</p>
        <div className="welcome_divider">❀</div>
        <p className="welcome_text">
          저는 이곳에서 연애 사주를 봐드리는 <strong>색동낭자</strong>예요.
        </p>
        <p className="welcome_text">
          미래가 궁금해서, 마음속 고민이 쉽게 풀리지 않아서, 혹은 인생의 중요한 갈림길 앞에서 방향을 찾고 싶어서... 이런 여러 가지 이유로 양반家에 오셨겠죠?
        </p>
        <p className="welcome_text">
          그렇다면 정말 잘 찾아오셨어요. {userName}님의 사주 속에는 이미 수많은 힌트와 가능성들이 담겨 있어요.
        </p>
        <p className="welcome_text">
          제가 사주라는 지도를 함께 펼치고, {userName}님이 걸어갈 인생의 길을 환하게 밝혀드릴게요.
        </p>
      </div>

      {/* 장면 2: 사주란? */}
      <div className="intro_section">
        <h3 className="intro_section_title">들어가며</h3>
        <p className="intro_section_subtitle">사주란 무엇인가요?</p>

        <div className="intro_section_content">
          <p className="intro_quote">
            "사주(四柱)"는 '네 개의 기둥'이라는 뜻이에요.
          </p>
          <p>
            사주는 사람이 태어난 <strong>연(年)</strong>, <strong>월(月)</strong>, <strong>일(日)</strong>, <strong>시(時)</strong> 이 네 가지 기둥으로 이루어진 팔자예요.
          </p>
          <p>
            이 네 가지 요소를 통해 한 사람이 지닌 성격, 타고난 기질, 흐르는 운의 방향까지 자세히 살펴볼 수 있답니다.
          </p>
          <p className="intro_note">
            사주는 단순히 '미래를 맞히는 점술'이 아니라, <strong>'나를 이해하고, 더 나은 선택을 할 수 있게 도와주는 삶의 지도'</strong>라고 보시면 좋아요.
          </p>
          <p>
            나도 몰랐던 내 안의 가능성과 흐름을 발견하게 되니까요.
          </p>
        </div>
      </div>

      {/* 장면 3: 사주팔자의 구조 */}
      <div className="intro_section">
        <h3 className="intro_section_title">사주팔자의 구조</h3>
        <p className="intro_section_subtitle">왜 '팔자'라고 부를까요?</p>

        <div className="intro_section_content">
          <p>
            사주는 흔히 <strong>'사주팔자(四柱八字)'</strong>라고도 불리는데요, 여기서 '팔자'는 태어난 순간의 하늘과 땅의 기운이 담긴 여덟 글자를 말해요.
          </p>
          <p>
            각 기둥은 두 글자로 이루어져 있어요.<br/>
            위쪽 글자는 <strong>천간(天干)</strong> — 하늘의 기운<br/>
            아래 글자는 <strong>지지(地支)</strong> — 땅의 기운
          </p>
          <p>
            4개의 기둥 × 2글자 = <strong>8글자</strong>, 그래서 '사주팔자'라고 불러요.
          </p>
        </div>

        {/* 예시 사주명식 테이블 */}
        <div className="intro_saju_table">
          <div className="saju_pillar_row">
            <div className="saju_pillar">
              <span className="pillar_name">시주</span>
              <div className="pillar_chars">
                <div className="char_cell">
                  <span className="cell_hanja metal">庚</span>
                  <span className="char_meaning">자녀</span>
                </div>
                <div className="char_cell">
                  <span className="cell_hanja metal">申</span>
                  <span className="char_meaning">말년</span>
                </div>
              </div>
            </div>
            <div className="saju_pillar highlight">
              <span className="pillar_name">일주</span>
              <div className="pillar_chars">
                <div className="char_cell">
                  <span className="cell_hanja earth">戊</span>
                  <span className="char_meaning">나</span>
                </div>
                <div className="char_cell">
                  <span className="cell_hanja fire">午</span>
                  <span className="char_meaning">배우자</span>
                </div>
              </div>
            </div>
            <div className="saju_pillar">
              <span className="pillar_name">월주</span>
              <div className="pillar_chars">
                <div className="char_cell">
                  <span className="cell_hanja fire">丙</span>
                  <span className="char_meaning">부모</span>
                </div>
                <div className="char_cell">
                  <span className="cell_hanja wood">寅</span>
                  <span className="char_meaning">청년기</span>
                </div>
              </div>
            </div>
            <div className="saju_pillar">
              <span className="pillar_name">년주</span>
              <div className="pillar_chars">
                <div className="char_cell">
                  <span className="cell_hanja wood">甲</span>
                  <span className="char_meaning">조상</span>
                </div>
                <div className="char_cell">
                  <span className="cell_hanja water">子</span>
                  <span className="char_meaning">유년기</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="intro_section_content">
          <p>
            우리가 이 세상에 태어난 그 순간, 눈에 보이지 않는 운명의 설계도가 이미 그려지는 거예요.
          </p>
          <p className="intro_note">
            그래서 사주는 예언이 아니라, 나의 성격과 기질, 그리고 앞으로 맞이할 인생의 흐름을 미리 살펴볼 수 있는 <strong>소중한 지도</strong>랍니다.
          </p>
        </div>
      </div>

      {/* 장면 4: 천간(天干) */}
      <div className="intro_section">
        <h3 className="intro_section_title">천간(天干)</h3>
        <p className="intro_section_subtitle">하늘에서 내려오는 열 가지 기운</p>

        <div className="intro_section_content">
          <p>
            천간은 하늘의 기운이에요. 총 <strong>10가지</strong>가 있어요.
          </p>
        </div>

        <div className="intro_cheongan_table">
          <div className="cheongan_row header">
            <span className="element wood">목(木)</span>
            <span className="element fire">화(火)</span>
            <span className="element earth">토(土)</span>
            <span className="element metal">금(金)</span>
            <span className="element water">수(水)</span>
          </div>
          <div className="cheongan_row chars">
            <span className="wood">甲 乙<br/><span className="char_kor">갑 을</span></span>
            <span className="fire">丙 丁<br/><span className="char_kor">병 정</span></span>
            <span className="earth">戊 己<br/><span className="char_kor">무 기</span></span>
            <span className="metal">庚 辛<br/><span className="char_kor">경 신</span></span>
            <span className="water">壬 癸<br/><span className="char_kor">임 계</span></span>
          </div>
          <div className="cheongan_row meaning">
            <span>큰나무<br/>풀·꽃</span>
            <span>태양<br/>촛불</span>
            <span>산<br/>논밭</span>
            <span>바위<br/>보석</span>
            <span>바다<br/>시냇물</span>
          </div>
        </div>

        <div className="intro_section_content">
          <p>
            천간은 <strong>겉으로 드러나는 성격</strong>, 세상에 보여주는 나의 모습을 나타내요.
          </p>
          <p className="intro_note">
            예를 들어 <strong>丙(병)</strong>은 태양처럼 밝고 열정적인 사람, <strong>癸(계)</strong>는 시냇물처럼 조용하고 감성적인 사람이에요.
          </p>
        </div>
      </div>

      {/* 장면 5: 지지(地支) */}
      <div className="intro_section">
        <h3 className="intro_section_title">지지(地支)</h3>
        <p className="intro_section_subtitle">땅에서 올라오는 열두 가지 기운</p>

        <div className="intro_section_content">
          <p>
            지지는 땅의 기운을 뜻하는 열두 가지 글자로, 하늘의 기운을 받아들여 더욱 구체적인 모습을 이루어 가죠.
          </p>
          <p>
            맞아요, 바로 우리가 흔히 아는 <strong>12지신(띠)</strong>이에요!
          </p>
        </div>

        <div className="intro_jiji_table">
          <div className="jiji_table_row">
            <div className="jiji_cell">
              <span className="jiji_hanja water">子</span>
              <span className="jiji_info">자 · 쥐</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja earth">丑</span>
              <span className="jiji_info">축 · 소</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja wood">寅</span>
              <span className="jiji_info">인 · 호랑이</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja wood">卯</span>
              <span className="jiji_info">묘 · 토끼</span>
            </div>
          </div>
          <div className="jiji_table_row">
            <div className="jiji_cell">
              <span className="jiji_hanja earth">辰</span>
              <span className="jiji_info">진 · 용</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja fire">巳</span>
              <span className="jiji_info">사 · 뱀</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja fire">午</span>
              <span className="jiji_info">오 · 말</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja earth">未</span>
              <span className="jiji_info">미 · 양</span>
            </div>
          </div>
          <div className="jiji_table_row">
            <div className="jiji_cell">
              <span className="jiji_hanja metal">申</span>
              <span className="jiji_info">신 · 원숭이</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja metal">酉</span>
              <span className="jiji_info">유 · 닭</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja earth">戌</span>
              <span className="jiji_info">술 · 개</span>
            </div>
            <div className="jiji_cell">
              <span className="jiji_hanja water">亥</span>
              <span className="jiji_info">해 · 돼지</span>
            </div>
          </div>
        </div>

        <div className="intro_section_content">
          <p>
            이 천간과 지지가 서로 만나 하나의 조화를 이루면, 하늘과 땅이 어우러지듯 우리의 생년월일시가 정해지게 돼요.
          </p>
          <p className="intro_note">
            그리고 그 순간의 기운이 우리의 성향과 삶에 깊이 스며들어, 그 사람의 성격부터 앞으로 펼쳐질 운명의 중요한 열쇠가 된답니다!
          </p>
        </div>
      </div>

      {/* 장면 6: 오행 */}
      <div className="intro_section">
        <h3 className="intro_section_title">다섯 가지 기운, 오행</h3>
        <p className="intro_section_subtitle">천간과 지지를 이해하는 열쇠</p>

        <div className="intro_section_content">
          <p>
            그런데 천간과 지지, 이렇게 많은 글자를 어떻게 이해하냐고요? 걱정 마세요. 모든 글자는 다섯 가지 기운으로 나눌 수 있어요. 바로 <strong>오행(五行)</strong>이에요.
          </p>
        </div>

        <div className="intro_ohang_circle">
          <div className="ohang_circle_wrapper">
            <div className="ohang_node fire top">
              <span className="ohang_label">화(火)</span>
              <span className="ohang_desc">열정</span>
            </div>
            <div className="ohang_node wood left-top">
              <span className="ohang_label">목(木)</span>
              <span className="ohang_desc">성장</span>
            </div>
            <div className="ohang_node earth right-top">
              <span className="ohang_label">토(土)</span>
              <span className="ohang_desc">안정</span>
            </div>
            <div className="ohang_node water left-bottom">
              <span className="ohang_label">수(水)</span>
              <span className="ohang_desc">지혜</span>
            </div>
            <div className="ohang_node metal right-bottom">
              <span className="ohang_label">금(金)</span>
              <span className="ohang_desc">원칙</span>
            </div>
          </div>
          <div className="ohang_relations">
            <p className="ohang_relation saeng">
              <span className="relation_label">생(生)</span>
              목 → 화 → 토 → 금 → 수 → 목
            </p>
            <p className="ohang_relation geuk">
              <span className="relation_label">극(剋)</span>
              목 → 토 → 수 → 화 → 금 → 목
            </p>
          </div>
        </div>

        <div className="intro_section_content">
          <p className="intro_note">
            이 다섯 가지 기운의 조합과 균형이 바로 {userName}님의 성격과 연애 스타일을 만들어요.
          </p>
        </div>
      </div>

      {/* 장면 7: 일주 */}
      <div className="intro_section">
        <h3 className="intro_section_title">연애의 열쇠, 일주</h3>
        <p className="intro_section_subtitle">사주에서 가장 중요한 기둥</p>

        <div className="intro_section_content">
          <p>
            자, 이제 중요한 이야기를 해볼게요. 사주의 네 기둥 중에서 연애를 볼 때 가장 중요한 기둥이 있어요. 바로 <strong>일주(日柱)</strong>예요.
          </p>
        </div>

        <div className="intro_ilju_diagram">
          <div className="ilju_pillars">
            <div className="ilju_pillar">
              <span className="ilju_pillar_name">시주</span>
              <div className="ilju_pillar_chars">
                <span>○</span>
                <span>○</span>
              </div>
            </div>
            <div className="ilju_pillar highlight">
              <span className="ilju_pillar_name">일주</span>
              <div className="ilju_pillar_chars">
                <span>나</span>
                <span>배우자</span>
              </div>
              <span className="ilju_arrow">↑ 이게 나!</span>
            </div>
            <div className="ilju_pillar">
              <span className="ilju_pillar_name">월주</span>
              <div className="ilju_pillar_chars">
                <span>○</span>
                <span>○</span>
              </div>
            </div>
            <div className="ilju_pillar">
              <span className="ilju_pillar_name">년주</span>
              <div className="ilju_pillar_chars">
                <span>○</span>
                <span>○</span>
              </div>
            </div>
          </div>
        </div>

        <div className="intro_section_content">
          <p>
            일주는 태어난 '날'의 기둥인데요, 사주에서 '나 자신'을 의미해요.
          </p>
          <p>
            특히 일주의 아랫글자, <strong>일지(日支)</strong>는 '배우자 자리'라고도 불러요.
          </p>
          <p className="intro_note">
            내 마음 깊은 곳에서 원하는 이상형, 무의식적으로 끌리는 사람의 유형, 연애할 때 나도 모르게 나오는 습관... 이런 것들이 모두 일주에 담겨 있답니다.
          </p>
        </div>
      </div>

      {/* 장면 8: 사주를 알면 무엇이 좋을까? */}
      <div className="intro_section">
        <h3 className="intro_section_title">사주를 알면</h3>
        <p className="intro_section_subtitle">무엇이 좋을까요?</p>

        <div className="intro_section_content">
          <p>
            사주를 알면 내가 어떤 사람인지, 진짜 내 모습이 무엇인지 더 깊이 이해할 수 있어요.
          </p>
          <p>
            성격이나 재능, 적성은 물론이고, 인간관계에서의 특징이나 연애 스타일까지도 구체적으로 파악할 수 있답니다.
          </p>
          <p>
            또 언제 좋은 기회가 들어오고, 언제 조심해야 하는지도 미리 살펴볼 수 있어서 삶의 중요한 순간들을 보다 현명하게 준비할 수 있죠.
          </p>
          <p className="intro_note">
            특히 인생에서 중요한 시기를 맞이했을 때, 내가 가진 사주를 바탕으로 흐름을 읽고 대비한다면 훨씬 안정적이고 후회 없는 결정을 내릴 수 있어요. 사주는 그렇게, 지금의 나와 앞으로의 나를 잇는 다리 역할을 해준답니다.
          </p>
        </div>
      </div>

      {/* 장면 7: 색동낭자의 약속 */}
      <div className="intro_section">
        <h3 className="intro_section_title">색동낭자의 약속</h3>

        <div className="intro_section_content">
          <p>
            사주는 운명을 점치는 것이 아니라, 운명을 더 잘 살아내기 위한 지혜예요.
          </p>
          <p>
            저는 {userName}님의 사주를 정성스럽게 바라보면서, 진심을 담아 조언해드릴게요.
          </p>
          <p className="intro_promise">
            좋은 운은 더 크게 살리고, 어려운 운은 지혜롭게 피할 수 있도록, 무엇보다 {userName}님이 스스로를 더 사랑하고 이해할 수 있도록 도와드릴게요.
          </p>
        </div>
      </div>

      {/* 장면 8: 보고서 안내 */}
      <div className="intro_section">
        <h3 className="intro_section_title">보고서 안내</h3>

        <div className="intro_section_content">
          <p>
            이 보고서는 총 <strong>6개의 장</strong>으로 구성되어 있어요.
          </p>
          <div className="intro_chapters_list">
            <p><strong>1장</strong> 나만의 매력과 연애 성향</p>
            <p><strong>2장</strong> 앞으로 펼쳐질 사랑의 흐름</p>
            <p><strong>3장</strong> 결국 만나게 될 운명의 상대</p>
            <p><strong>4장</strong> 운명이라 착각하는 가짜 인연</p>
            <p><strong>5장</strong> 누구에게도 말 못할, 그 사람과의 스킨십</p>
            <p><strong>6장</strong> 색동낭자의 귀띔</p>
          </div>
        </div>
      </div>

      {/* 장면 9: 마무리 - 전환 */}
      <div className="intro_section intro_transition">
        <div className="intro_section_content">
          <p className="transition_text">
            그럼 이제, 색동낭자와 함께 {userName}님의 사주를 펼쳐볼까요?
          </p>
        </div>
      </div>
    </div>
  );
}

// 목차 모달
function TocModal({
  messages,
  currentIndex,
  onClose,
  onNavigate,
}: {
  messages: MessageItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  // 목차 항목 정의
  const tocItems = [
    { label: "들어가며", targetId: "intro-card" },
    { label: "사주 원국", targetId: "saju-card" },
    { label: "1장: 나만의 매력과 연애 성향", targetId: "chapter-chapter1-report" },
    { label: "2장: 앞으로 펼쳐질 사랑의 흐름", targetId: "chapter-chapter2-report" },
    { label: "3장: 결국 만나게 될 운명의 상대", targetId: "chapter-chapter3-report" },
    { label: "보너스: 이상형 이미지", targetId: "ideal-type-image" },
    { label: "4장: 운명이라 착각하는 가짜 인연", targetId: "chapter-chapter4-report" },
    { label: "5장: 누구에게도 말 못할, 그 사람과의 스킨십", targetId: "chapter-chapter5-report" },
    { label: "6장: 색동낭자의 귀띔", targetId: "chapter-chapter6-report" },
    { label: "마무리", targetId: "ending" },
  ];

  // 메시지 ID로 인덱스 찾기
  const findIndexById = (targetId: string) => {
    return messages.findIndex((msg) => msg.id === targetId);
  };

  return (
    <div className="toc_modal_overlay" onClick={onClose}>
      <div className="toc_modal" onClick={(e) => e.stopPropagation()}>
        <div className="toc_modal_header">
          <h3 className="toc_modal_title">목차</h3>
          <button className="toc_modal_close" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <ul className="toc_modal_list">
          {tocItems.map((item, i) => {
            const targetIndex = findIndexById(item.targetId);
            const isAvailable = targetIndex !== -1 && targetIndex <= messages.length - 1;
            const isCurrent = targetIndex !== -1 && targetIndex === currentIndex;

            return (
              <li
                key={i}
                className={`toc_modal_item ${isCurrent ? "current" : ""} ${!isAvailable ? "disabled" : ""}`}
                onClick={() => {
                  if (isAvailable) {
                    onNavigate(targetIndex);
                  }
                }}
              >
                <span className="toc_item_label">{item.label}</span>
                {isCurrent && <span className="toc_item_current">현재</span>}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// 마무리 카드
function EndingCard({ data }: { data: SajuLoveRecord | null }) {
  const userName = data?.loveAnalysis?.user_name || data?.input?.userName || "고객";
  const chapters = data?.loveAnalysis?.chapters || [];
  const idealPartnerImage = data?.loveAnalysis?.ideal_partner_image?.image_base64;

  return (
    <div className="report_card ending_card">
      <div className="ending_content">
        {/* 인사말 */}
        <div className="ending_greeting">
          <p className="greeting_main">{userName}님, 여기까지 긴 리포트를 읽어주셔서 감사합니다.</p>
          <p>
            사주는 정해진 운명이 아니라, 나를 더 잘 이해하고 더 나은 선택을 하기
            위한 도구예요.
          </p>
          <p>
            당신의 사랑이 더 깊어지고, 더 따뜻해지길 진심으로 응원합니다.
          </p>
          <p className="ending_sign">- 색동낭자 드림</p>
        </div>

        {/* 보고서 전체 */}
        <div className="ending_summary">
          <h3 className="summary_title">나의 연애 사주 리포트 전체</h3>

          {/* 들어가며 */}
          <div className="report_card summary_report_card">
            <div className="card_header">
              <span className="card_label">들어가며</span>
              <h3 className="card_title">색동낭자의 인사</h3>
            </div>
            <div className="card_content intro_summary_content">
              <p>{userName}님, 안녕하세요.</p>
              <p>저는 색동낭자예요. 사주로 인연의 실타래를 풀어드리죠.</p>
              <p>{userName}님의 생년월일시를 바탕으로 타고난 연애 성향, 운명적 인연, 그리고 앞으로의 사랑 운을 살펴봤어요.</p>
            </div>
          </div>

          {/* 사주 원국 */}
          {data && <SummmarySajuCard data={data} />}

          {/* 각 챕터 */}
          {chapters.map((chapter, index) => {
              // 챕터 번호 추출
              const chapterMatch = chapter.title.match(/(\d+)장/);
              const chapterNum = chapterMatch ? parseInt(chapterMatch[1]) : index + 1;
              const isChapter3 = chapterNum === 3;

              // 타이틀 정리
              const titleText = chapter.title
                .replace(/^#+\s*/, "")
                .replace(/\[(\d+)장\]\s*/, "")
                .replace(/^(\d+)장\s*/, "")
                .trim();

              return (
                <div key={index}>
                  <div className="report_card summary_report_card">
                    <div className="card_header">
                      <span className="card_label">{chapterNum}장</span>
                      <h3 className="card_title">{titleText}</h3>
                    </div>
                    <div
                      className="card_content"
                      dangerouslySetInnerHTML={{ __html: formatChapterContent(chapter.content) }}
                    />
                  </div>
                  {/* 3장 뒤에 이상형 이미지 표시 */}
                  {isChapter3 && idealPartnerImage && (
                    <div className="report_card summary_ideal_card">
                      <div className="card_header">
                        <span className="card_label">보너스</span>
                        <h3 className="card_title">{userName}님의 이상형</h3>
                      </div>
                      <div className="summary_ideal_image">
                        <img
                          src={`data:image/png;base64,${idealPartnerImage}`}
                          alt="이상형 이미지"
                          className="ideal_image_full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// 마무리 카드용 사주 원국 (전체 버전)
function SummmarySajuCard({ data }: { data: SajuLoveRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const sajuData = data.sajuData;
  const dayMaster = data.sajuData?.dayMaster;
  const input = data.input;

  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const timeMap: Record<string, string> = {
      "0030": "자시", "0230": "축시", "0430": "인시", "0630": "묘시",
      "0830": "진시", "1030": "사시", "1230": "오시", "1430": "미시",
      "1630": "신시", "1830": "유시", "2030": "술시", "2230": "해시",
    };
    return timeMap[time] || null;
  };

  const birthTime = formatTimeToSi(input?.time);
  const pillarOrder = ["hour", "day", "month", "year"] as const;

  return (
    <div className="report_card summary_report_card summary_saju_card">
      <div className="card_header">
        <span className="card_label">사주 원국</span>
        <h3 className="card_title">{userName}님의 타고난 운명</h3>
      </div>

      <div className="info_card">
        <div className="info_main">
          <span className="info_name">{input?.userName}</span>
          <span className="info_birth">
            {input?.date}{birthTime ? ` | ${birthTime}` : ""}
          </span>
        </div>
        {dayMaster && (
          <div className="info_ilju">
            <span className="ilju_char" style={{ color: getColor(dayMaster.element) }}>{dayMaster.char}</span>
            <span className="ilju_title">{dayMaster.title}</span>
          </div>
        )}
      </div>

      {/* 사주 팔자 테이블 */}
      <div className="pillars_section">
        <div className="pillars_header">
          <span className="material-icons">view_column</span>
          사주 팔자
        </div>
        <div className="saju_table_wrap">
          <table className="saju_table">
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
              <tr className="row_cheongan">
                <td className="row_label">천간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  if (!p?.stem?.char) return <td key={key} className="cell_empty">—</td>;
                  return (
                    <td key={key}>
                      <span className="char_main" style={{ color: getColor(p.stem.element) }}>
                        {p.stem.char}{p.stem.korean}
                      </span>
                      <span className="char_element" style={{ color: getColor(p.stem.element) }}>
                        {getElementKorean(p.stem.element, p.stem.yinYang)}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (천간) */}
              <tr className="row_sipsung">
                <td className="row_label">십성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key} className="cell_sipsung" style={{ color: getColor(p?.stem?.element) }}>
                      {p?.tenGodStem || "—"}
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr className="row_jiji">
                <td className="row_label">지지</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  if (!p?.branch?.char) return <td key={key} className="cell_empty">—</td>;
                  return (
                    <td key={key}>
                      <span className="char_main" style={{ color: getColor(p.branch.element) }}>
                        {p.branch.char}{p.branch.korean}
                      </span>
                      <span className="char_element" style={{ color: getColor(p.branch.element) }}>
                        {getElementKorean(p.branch.element, p.branch.yinYang)}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (지지) */}
              <tr className="row_sipsung">
                <td className="row_label">십성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key} className="cell_sipsung" style={{ color: getColor(p?.branch?.element) }}>
                      {p?.tenGodBranchMain || "—"}
                    </td>
                  );
                })}
              </tr>
              {/* 지장간 */}
              <tr className="row_extra">
                <td className="row_label">지장간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const jijanggan = p?.jijanggan;
                  let displayValue = "—";
                  if (typeof jijanggan === 'string') {
                    displayValue = jijanggan;
                  } else if (jijanggan && typeof jijanggan === 'object') {
                    const obj = jijanggan as { display?: string; displayKorean?: string };
                    if (obj.display && obj.displayKorean) {
                      displayValue = `${obj.display}(${obj.displayKorean})`;
                    } else {
                      displayValue = obj.displayKorean || obj.display || "—";
                    }
                  }
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
              {/* 12운성 */}
              <tr className="row_extra">
                <td className="row_label">12운성</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const twelveStage = (p as unknown as { twelveStage?: string })?.twelveStage || p?.twelveUnsung;
                  const displayValue = typeof twelveStage === 'string'
                    ? twelveStage
                    : (twelveStage as unknown as { display?: string })?.display || "—";
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
              {/* 12신살 */}
              <tr className="row_extra">
                <td className="row_label">12신살</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  const twelveSinsal = p?.twelveSinsal;
                  const displayValue = typeof twelveSinsal === 'string'
                    ? twelveSinsal
                    : (twelveSinsal as unknown as { display?: string })?.display || "—";
                  return <td key={key} className="cell_extra">{displayValue}</td>;
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 신살과 길성 */}
      <div className="sinsal_section">
        <div className="sinsal_header">
          <span className="material-icons">auto_awesome</span>
          신살과 길성
        </div>
        <p className="sinsal_tags">
          {sajuData?.sinsal?._active && sajuData.sinsal._active.length > 0 ? (
            sajuData.sinsal._active.map((name, i, arr) => {
              const isLoveSinsal = name === "도화살" || name === "홍염살" || name === "화개살";
              return (
                <span key={i} className={isLoveSinsal ? "love" : "normal"}>
                  {name}{i < arr.length - 1 ? ", " : ""}
                </span>
              );
            })
          ) : (
            <span className="sinsal_empty">특이 신살 없음</span>
          )}
        </p>

        {/* 신살과 길성 테이블 */}
        <div className="sinsal_table_wrap">
          <table className="sinsal_table">
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
              <tr>
                <td className="row_label">천간</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key}>
                      <span className="char_hanja" style={{ color: getColor(p?.stem?.element) }}>
                        {p?.stem?.char || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 천간 신살/길성 */}
              <tr>
                <td className="row_label">신살</td>
                {pillarOrder.map((key) => {
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  return (
                    <td key={key} className="cell_gilsung">
                      {stemSinsal.length > 0 ? stemSinsal.join(", ") : "×"}
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr>
                <td className="row_label">지지</td>
                {pillarOrder.map((key) => {
                  const p = pillars[key];
                  return (
                    <td key={key}>
                      <span className="char_hanja" style={{ color: getColor(p?.branch?.element) }}>
                        {p?.branch?.char || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 지지 신살/길성 */}
              <tr>
                <td className="row_label">신살</td>
                {pillarOrder.map((key) => {
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  return (
                    <td key={key} className="cell_gilsung">
                      {branchSinsal.length > 0 ? branchSinsal.join(", ") : "×"}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
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
        <h3 class="section_title">${escapeHTML(section.title)}</h3>
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
