"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getNewYearRecord,
  updateNewYearRecord,
  NewYearRecord,
} from "@/lib/db/newYearDB";
import { trackPageView } from "@/lib/mixpanel";
import "./result.css";

// 클라이언트에서 직접 FastAPI 호출
const SAJU_API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;

// 메시지 타입 정의
type MessageItem = {
  id: string;
  type:
    | "dialogue"
    | "report"
    | "image"
    | "ending"
    | "saju"
    | "intro"
    | "waiting";
  content: string;
  chapterIndex?: number;
  imageBase64?: string;
  bgImage?: string;
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

const getColor = (element?: string): string => {
  if (!element) return "#333";
  return elementColors[element] || elementColors[element.toLowerCase()] || "#333";
};

// 천간 -> 오행 매핑
const STEM_ELEMENT: Record<string, string> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth",
  己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};

// 지지 -> 오행 매핑
const BRANCH_ELEMENT: Record<string, string> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

// 지지 -> 한글 매핑
const BRANCH_KOREAN: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

// 천간 -> 한글 매핑
const STEM_KOREAN: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};

const getStemElement = (stem: string): string => STEM_ELEMENT[stem] || "";
const getBranchElement = (branch: string): string => BRANCH_ELEMENT[branch] || "";
const getBranchKorean = (branch: string): string => BRANCH_KOREAN[branch] || branch;
const getStemKorean = (stem: string): string => STEM_KOREAN[stem] || stem;

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
const getChapterConfig = (
  userName: string
): Record<string, { intro: string; outro: string; introBg: string; reportBg: string; outroBg: string }> => ({
  chapter1: {
    intro: `1장에서는 ${userName}님의 2026년 전체 운세 흐름을 알려드릴게요!`,
    outro: `어떠세요? 2026년의 큰 그림이 보이시나요?\n이제 재물운을 살펴볼게요!`,
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter2: {
    intro: `2장에서는 ${userName}님의 2026년 재물운을 알려드릴게요.`,
    outro: "재물운을 파악했으니,\n이제 건강운에 대해 얘기해볼까요?",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter3: {
    intro: `3장에서는 ${userName}님의 2026년 건강운을 알려드릴게요.\n건강이 제일 중요하니까요!`,
    outro: "건강운을 살펴봤으니,\n연애운도 궁금하시죠?",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter4: {
    intro: "4장에서는 2026년 연애운을 알려드릴게요.",
    outro: "연애운도 살펴봤으니,\n직장운과 명예운도 확인해볼까요?",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter5: {
    intro: `5장에서는 ${userName}님의 직장운과 명예운을 알려드릴게요.`,
    outro: "직장운을 파악했으니,\n대인관계운도 살펴볼게요!",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter6: {
    intro: `6장에서는 ${userName}님의 관계운을 알려드릴게요.`,
    outro: "관계운을 살펴봤으니,\n감정관리에 대해서도 얘기해볼게요.",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter7: {
    intro: `7장에서는 2026년 감정과 마음 관리 방법을 알려드릴게요.`,
    outro: "감정관리법을 알아봤으니,\n월별 운세 흐름도 확인해볼까요?",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter8: {
    intro: `8장에서는 ${userName}님의 2026년 월별 운세를 알려드릴게요.`,
    outro: "월별 운세를 살펴봤어요.\n이제 미래일기를 보여드릴게요!",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter9: {
    intro: `9장에서는 ${userName}님의 2026년 미래일기를 펼쳐볼게요.\n미래의 ${userName}님이 쓴 일기예요!`,
    outro: "미래일기 재밌으셨나요?\n이제 개운법을 알려드릴게요!",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter10: {
    intro: `10장에서는 ${userName}님을 위한 개운법 10계명을 알려드릴게요.`,
    outro: "개운법을 잘 기억해주세요!\n마지막으로 부적에 대해 설명드릴게요.",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
  chapter11: {
    intro: `마지막 11장이에요. ${userName}님을 위한 부적에 대해 설명드릴게요.`,
    outro: "",
    introBg: "/new-year/img/doryung.png",
    reportBg: "/new-year/img/doryung.png",
    outroBg: "/new-year/img/doryung.png",
  },
});

function NewYearResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<NewYearRecord | null>(null);
  const MAX_AUTO_RETRY = 2;

  // 대화형 UI 상태
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dialogueText, setDialogueText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showTocModal, setShowTocModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [bgFadeIn, setBgFadeIn] = useState(false);
  const pendingDataRef = useRef<NewYearRecord | null>(null);

  // 현재 메시지의 배경 이미지
  const currentBgImage = messages[currentIndex]?.bgImage || "/new-year/img/doryung.png";

  const isFetchingRef = useRef(false);
  const partialStartedRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 챕터에서 키 추출
  const getChapterKey = (chapter: { number?: number; title?: string }): string => {
    if (typeof chapter.number === "number" && chapter.number >= 1 && chapter.number <= 11) {
      return `chapter${chapter.number}`;
    }
    const title = chapter.title || "";
    if (title.includes("1장") || title.includes("총운")) return "chapter1";
    if (title.includes("2장") || title.includes("재물운")) return "chapter2";
    if (title.includes("3장") || title.includes("건강운")) return "chapter3";
    if (title.includes("4장") || title.includes("애정운") || title.includes("연애운")) return "chapter4";
    if (title.includes("5장") || title.includes("직장운") || title.includes("명예운")) return "chapter5";
    if (title.includes("6장") || title.includes("관계운")) return "chapter6";
    if (title.includes("7장") || title.includes("감정") || title.includes("마음")) return "chapter7";
    if (title.includes("8장") || title.includes("월별")) return "chapter8";
    if (title.includes("9장") || title.includes("미래일기")) return "chapter9";
    if (title.includes("10장") || title.includes("개운법")) return "chapter10";
    if (title.includes("11장") || title.includes("부적")) return "chapter11";
    return "chapter1";
  };

  // 부분 메시지 리스트 생성 (들어가며 + 사주원국만)
  const buildPartialMessageList = useCallback((record: NewYearRecord): MessageItem[] => {
    const result: MessageItem[] = [];
    const userName = record.input?.userName || "고객";

    result.push({
      id: "opening-dialogue",
      type: "dialogue",
      content: `안녕하세요, ${userName}님\n저는 까치도령이에요. 반가워요!`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "intro-guide-dialogue",
      type: "dialogue",
      content: `${userName}님의 2026년 운세를 보기 전에,\n먼저 사주에 대해 간단히 설명해드릴게요.`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "intro-card",
      type: "intro",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: `사주란 참 신기하죠?\n그럼 이제 ${userName}님의 사주 팔자를 살펴볼까요?`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "saju-card",
      type: "saju",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    // 결제 완료 후 분석 대기 상태
    result.push({
      id: "waiting",
      type: "waiting",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    return result;
  }, []);

  // 메시지 리스트 생성 (전체 - 분석 완료 후)
  const buildMessageList = useCallback((record: NewYearRecord): MessageItem[] => {
    const result: MessageItem[] = [];
    const userName = record.analysis?.user_name || record.input?.userName || "고객";
    const chapters = record.analysis?.chapters || [];
    const hasTalisman = !!(record.talismanImage?.success && record.talismanImage.image_base64);

    result.push({
      id: "opening-dialogue",
      type: "dialogue",
      content: `${userName}님, 안녕하세요?\n이제부터 2026년 신년 운세를 천천히 살펴볼까요?`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "intro-guide-dialogue",
      type: "dialogue",
      content: `${userName}님의 신년 운세를 알려드리기 전에,\n먼저 사주팔자에 대해 간단하게 설명을 해드릴게요.`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "intro-card",
      type: "intro",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "saju-card",
      type: "saju",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    // 각 챕터별 [intro 대화 → 리포트 → outro 대화]
    const chapterConfig = getChapterConfig(userName);
    chapters.forEach((chapter, index) => {
      // 챕터 번호가 있으면 사용, 없으면 index + 1 사용
      const chapterNum = chapter.number || index + 1;
      const chapterKey = `chapter${chapterNum}`;
      const config = chapterConfig[chapterKey];

      if (config?.intro) {
        result.push({
          id: `chapter-${chapterNum}-intro`,
          type: "dialogue",
          content: config.intro,
          bgImage: config.introBg || "/new-year/img/doryung.png",
        });
      }

      result.push({
        id: `chapter-${chapterNum}-report`,
        type: "report",
        content: chapter.content,
        chapterIndex: index,
        bgImage: config?.reportBg || "/new-year/img/doryung.png",
      });

      if (config?.outro) {
        result.push({
          id: `chapter-${chapterNum}-outro`,
          type: "dialogue",
          content: config.outro,
          bgImage: config.outroBg || "/new-year/img/doryung.png",
        });
      }

      // 마지막 챕터 후 부적 이미지 삽입
      if (chapterNum === chapters.length && hasTalisman) {
        result.push({
          id: "talisman-dialogue",
          type: "dialogue",
          content: `잠깐, 특별히 준비한 게 있어요.\n${userName}님을 위한 2026년 수호 부적이에요!`,
          bgImage: "/new-year/img/doryung.png",
        });
        result.push({
          id: "talisman-image",
          type: "image",
          content: `${userName}님의 2026년 수호 부적`,
          imageBase64: record.talismanImage!.image_base64,
          bgImage: "/new-year/img/doryung.png",
        });
      }
    });

    result.push({
      id: "ending-intro",
      type: "dialogue",
      content: `${userName}님, 여기까지 긴 여정 함께해주셔서 감사해요.\n어떠셨어요? 2026년이 기대되시나요?`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "ending-outro",
      type: "dialogue",
      content: `2026년 병오년이 ${userName}님에게\n행운과 기쁨이 가득한 해가 되길 바랄게요.\n\n그럼, 마지막으로 정리된 보고서를 전달 드릴게요.`,
      bgImage: "/new-year/img/doryung.png",
    });

    result.push({
      id: "ending",
      type: "ending",
      content: "",
      bgImage: "/new-year/img/doryung.png",
    });

    return result;
  }, []);

  // 리포트 표시 시 스크롤 이벤트 리스너 등록
  useEffect(() => {
    if (showReport && reportRef.current) {
      const el = reportRef.current;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;

        if (scrollTop > 10) {
          setShowScrollHint(false);
        }

        if (isAtBottom) {
          setCanProceed(true);
        }
      };

      setCanProceed(false);
      setShowScrollHint(true);

      const checkTimer = setTimeout(() => {
        const needsScroll = el.scrollHeight > el.clientHeight + 50;

        if (!needsScroll) {
          setCanProceed(true);
          setShowScrollHint(false);
        } else {
          el.addEventListener("scroll", handleScroll);
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
    if (isTyping) return;
    if (currentIndex <= 0) return;

    if (showReport) {
      setShowReport(false);
    }

    const prevIndex = currentIndex - 1;
    setCurrentIndex(prevIndex);
    const prevMsg = messages[prevIndex];

    if (prevMsg.type === "dialogue") {
      setDialogueText(prevMsg.content);
      setShowButtons(true);
    } else {
      setShowReport(true);
      setShowButtons(true);
    }
  }, [currentIndex, messages, isTyping, showReport]);

  // 다음 메시지로 이동
  const handleNext = useCallback(() => {
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

    const ensureImageLoaded = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        if (img.complete) {
          resolve();
          return;
        }
        img.src = url;
      });
    };

    const goToNextMessage = async (nextIndex: number) => {
      const nextMsg = messages[nextIndex];

      const nextImage = nextMsg.bgImage || "/new-year/img/doryung.png";

      await Promise.race([
        ensureImageLoaded(nextImage),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      setCurrentIndex(nextIndex);

      if (nextMsg.type === "dialogue") {
        typeText(nextMsg.content, () => setShowButtons(true));
      } else {
        setIsAnimating(true);
        setShowReport(true);
        setShowButtons(true);
        setTimeout(() => setIsAnimating(false), 550);
      }
    };

    if (showReport) {
      const currentMsg = messages[currentIndex];
      const nextIndex = currentIndex + 1;

      if (currentMsg.type === "waiting") {
        return;
      }

      if (nextIndex < messages.length) {
        setDialogueText("");
        setShowButtons(false);
        setShowReport(false);
        setBgFadeIn(true);
        setTimeout(() => {
          goToNextMessage(nextIndex);
          setTimeout(() => setBgFadeIn(false), 300);
        }, 250);
      }
      return;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < messages.length) {
      goToNextMessage(nextIndex);
    }
  }, [currentIndex, messages, isTyping, showReport, typeText]);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const loadingMsgs = [
      `${userName}님의 사주 팔자를 분석하고 있어요`,
      "지금 페이지를 나가면 분석이 완료되지 않을 수 있어요",
      `${userName}님의 2026년 총운을 파악하고 있어요`,
      "재물운과 건강운을 분석하고 있어요",
      "연애운과 직장운을 살펴보고 있어요",
      "월별 운세를 정리하고 있어요",
      `${userName}님의 미래일기를 작성하고 있어요`,
      "개운법 10계명을 준비하고 있어요",
      "수호 부적을 그리고 있어요",
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

  // 신년 사주 분석 API 호출
  const fetchNewYearAnalysis = useCallback(
    async (storedData: NewYearRecord, retryCount = 0) => {
      const MAX_RETRIES = 2;
      const userName = storedData.input?.userName || "고객";

      if (retryCount === 0) {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        startLoadingMessages(userName);

        await updateNewYearRecord(storedData.id, {
          isAnalyzing: true,
          analysisStartedAt: new Date().toISOString(),
        });
      }

      try {
        const response = await fetch(`${SAJU_API_URL}/saju_new_year/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saju_data: storedData.rawSajuData || {},
            user_name: storedData.input?.userName || "",
            user_job_status: storedData.input?.jobStatus || "",
            user_relationship_status: storedData.input?.relationshipStatus || "",
            user_wish_2026: storedData.input?.wish2026?.trim() || "",
            year: 2026,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "분석에 실패했습니다.");
        }

        const analysisResult = await response.json();
        const analysisData = analysisResult.analysis || analysisResult;
        const talismanData = analysisResult.talisman_image || null;

        const updatedData: NewYearRecord = {
          ...storedData,
          analysis: analysisData,
          talismanImage: talismanData,
          isAnalyzing: false,
        };
        await updateNewYearRecord(storedData.id, {
          analysis: analysisData,
          talismanImage: talismanData,
          isAnalyzing: false,
        });

        stopLoadingMessages();
        setIsAnalyzing(false);

        sessionStorage.removeItem(`newyear_retry_${storedData.id}`);

        if (partialStartedRef.current) {
          pendingDataRef.current = updatedData;
          setAnalysisComplete(true);
        } else {
          setData(updatedData);
          const messageList = buildMessageList(updatedData);
          setMessages(messageList);
          setIsLoading(false);
          setTimeout(() => {
            typeText(messageList[0].content, () => setShowButtons(true));
          }, 500);
        }
      } catch (err) {
        stopLoadingMessages();
        setIsAnalyzing(false);

        await updateNewYearRecord(storedData.id, { isAnalyzing: false });

        console.error("분석 API 실패:", err);

        const retryKey = `newyear_retry_${storedData.id}`;
        const currentRetry = parseInt(sessionStorage.getItem(retryKey) || "0", 10);

        if (currentRetry < MAX_AUTO_RETRY) {
          console.log(`자동 재시도 ${currentRetry + 1}/${MAX_AUTO_RETRY}...`);
          sessionStorage.setItem(retryKey, String(currentRetry + 1));
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        sessionStorage.removeItem(retryKey);

        if (err instanceof Error) {
          if (err.message === "TIMEOUT") {
            setError("서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
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
      try {
        const record = await getNewYearRecord(resultId);

        if (!record) {
          setError("데이터를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        trackPageView("new_year_result", {
          id: record.id,
          user_name: record.input.userName,
          gender: record.input.gender,
          birth_date: record.input.date,
          day_master: record.sajuData.dayMaster?.char,
          paid: record.paid || false,
        });

        // 미결제 상태
        if (!record.paid) {
          setData(record);
          const userName = record.input?.userName || "고객";

          if (record.seenIntro) {
            const partialMessages = buildPartialMessageList(record);
            setMessages(partialMessages);
            setIsLoading(false);
            setTimeout(() => {
              typeText(partialMessages[0].content, () => setShowButtons(true));
            }, 500);
            return;
          }

          startLoadingMessages(userName);
          setTimeout(async () => {
            stopLoadingMessages();
            await updateNewYearRecord(record.id, { seenIntro: true });
            const partialMessages = buildPartialMessageList(record);
            setMessages(partialMessages);
            setIsLoading(false);
            setTimeout(() => {
              typeText(partialMessages[0].content, () => setShowButtons(true));
            }, 500);
          }, 10000);

          return;
        }

        // 결제 완료 & 분석 완료
        if (record.analysis) {
          setData(record);
          const messageList = buildMessageList(record);
          setMessages(messageList);
          setIsLoading(false);
          setTimeout(() => {
            typeText(messageList[0].content, () => setShowButtons(true));
          }, 500);
          return;
        }

        // detail 페이지에서 결제 후 진입
        const paidFromDetail = searchParams.get("paid") === "true";
        const userName = record.input?.userName || "고객";

        if (paidFromDetail && !record.seenIntro) {
          setData(record);
          setIsAnalyzing(true);

          partialStartedRef.current = true;
          fetchNewYearAnalysis(record);

          startLoadingMessages(userName);
          setTimeout(async () => {
            stopLoadingMessages();
            await updateNewYearRecord(record.id, { seenIntro: true });
            const partialMessages = buildPartialMessageList(record);
            setMessages(partialMessages);
            setIsLoading(false);
            setTimeout(() => {
              typeText(partialMessages[0].content, () => setShowButtons(true));
            }, 500);
          }, 10000);

          return;
        }

        // 결제 완료 & 분석 필요
        setData(record);
        setIsAnalyzing(true);
        const partialMessages = buildPartialMessageList(record);
        setMessages(partialMessages);
        setIsLoading(false);
        setTimeout(() => {
          typeText(partialMessages[0].content, () => setShowButtons(true));
        }, 500);

        const ANALYSIS_TIMEOUT = 5 * 60 * 1000;
        const isStillAnalyzing =
          record.isAnalyzing &&
          record.analysisStartedAt &&
          Date.now() - new Date(record.analysisStartedAt).getTime() < ANALYSIS_TIMEOUT;

        if (isStillAnalyzing) {
          partialStartedRef.current = true;
          let checkCount = 0;
          const MAX_CHECKS = 10;

          const checkInterval = setInterval(async () => {
            checkCount++;
            const updated = await getNewYearRecord(record.id);

            if (updated?.analysis) {
              clearInterval(checkInterval);
              setData(updated);
              setIsAnalyzing(false);
              const messageList = buildMessageList(updated);

              const chapter1IntroIndex = messageList.findIndex(
                (m) => m.id === "chapter-chapter1-intro"
              );
              if (chapter1IntroIndex >= 0) {
                const nextMsg = messageList[chapter1IntroIndex];
                setMessages(messageList);
                setCurrentIndex(chapter1IntroIndex);
                setShowReport(false);
                setTimeout(() => {
                  typeText(
                    `오래 기다리셨죠? 분석이 완료됐어요!\n\n${nextMsg.content}`,
                    () => setShowButtons(true)
                  );
                }, 100);
              } else {
                setMessages(messageList);
              }
              return;
            }

            if (checkCount >= MAX_CHECKS) {
              clearInterval(checkInterval);
              console.log("분석 응답 없음, API 재호출");
              fetchNewYearAnalysis(record);
            }
          }, 3000);
          return;
        }

        partialStartedRef.current = true;
        fetchNewYearAnalysis(record);
      } catch (err) {
        console.error("loadData 에러:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    loadData();
  }, [
    resultId,
    searchParams,
    fetchNewYearAnalysis,
    buildMessageList,
    buildPartialMessageList,
    typeText,
    startLoadingMessages,
    stopLoadingMessages,
  ]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="newyear_result_page">
        <div className="main_body_wrap">
          <div className="loading_wrap">
            <div className="loading_progress_bar">
              <div className="loading_progress_fill"></div>
            </div>
            <p className="loading_text">
              {loadingMessage || "분석 결과를 불러오는 중..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleRetry = () => {
    window.location.reload();
  };

  // 에러 화면
  if (error) {
    return (
      <div className="newyear_result_page">
        <div className="main_body_wrap">
          <div className="error_wrap">
            <div className="error_icon">!</div>
            <p className="error_text">
              정말 죄송합니다.
              <br />
              사주 분석하는데 오류가 발생해서
              <br />
              다시 한 번만 더 시도해주세요.
            </p>
            <button className="error_btn" onClick={handleRetry}>
              다시 시도하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data || messages.length === 0) {
    return null;
  }

  const userName = data.analysis?.user_name || data.input?.userName || "고객";
  const currentMsg = messages[currentIndex];

  const getButtonText = () => {
    if (showReport) return "다음";
    if (currentMsg?.type === "dialogue") return "다음";
    return "확인하기";
  };

  const handleScreenClick = () => {
    if (!showReport && currentMsg?.type === "dialogue") {
      handleNext();
    }
  };

  return (
    <div className="newyear_result_page chat_mode" onClick={handleScreenClick}>
      {/* 배경 이미지 */}
      <div className="result_bg">
        <img
          src={currentBgImage}
          alt=""
          className={`result_bg_image ${bgFadeIn ? "fade_in" : ""}`}
        />
      </div>

      {/* 뒤로가기 버튼 */}
      <button
        className="back_btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowExitModal(true);
        }}
      >
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
              <button className="exit_modal_confirm" onClick={() => router.push("/new-year")}>
                네, 돌아갈게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목차 버튼 */}
      <button
        className="toc_btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowTocModal(true);
        }}
      >
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
      {currentMsg && (
        <div className={`report_overlay ${showReport ? "active" : ""} ${isAnimating ? "animating" : ""}`}>
          <div className="report_scroll" ref={reportRef}>
            {currentMsg.type === "intro" && <IntroCard userName={userName} />}
            {currentMsg.type === "saju" && <SajuCard data={data} />}
            {currentMsg.type === "report" && data.analysis && (
              <ReportCard
                chapter={data.analysis.chapters[currentMsg.chapterIndex!]}
                chapterIndex={currentMsg.chapterIndex!}
              />
            )}
            {currentMsg.type === "image" && currentMsg.imageBase64 && (
              <TalismanCard
                imageBase64={currentMsg.imageBase64}
                userName={userName}
                title={currentMsg.content}
              />
            )}
            {currentMsg.type === "waiting" && (
              <WaitingCard
                userName={userName}
                isComplete={analysisComplete}
                analysisStartedAt={data?.analysisStartedAt}
                onTransition={() => {
                  if (pendingDataRef.current) {
                    const updatedData = pendingDataRef.current;
                    setData(updatedData);
                    const messageList = buildMessageList(updatedData);
                    const chapter1IntroIndex = messageList.findIndex(
                      (m) => m.id === "chapter-chapter1-intro"
                    );
                    if (chapter1IntroIndex >= 0) {
                      const nextMsg = messageList[chapter1IntroIndex];
                      setMessages(messageList);
                      setCurrentIndex(chapter1IntroIndex);
                      setShowReport(false);
                      setIsLoading(false);
                      setTimeout(() => {
                        typeText(
                          `오래 기다리셨죠? 분석이 완료됐어요!\n\n${nextMsg.content}`,
                          () => setShowButtons(true)
                        );
                      }, 100);
                    } else {
                      setMessages(messageList);
                      setIsLoading(false);
                    }
                    pendingDataRef.current = null;
                    setAnalysisComplete(false);
                  }
                }}
              />
            )}
            {currentMsg.type === "ending" && <EndingCard data={data} />}
          </div>

          {/* 스크롤 힌트 */}
          {showScrollHint && !canProceed && (
            <div className="scroll_hint">
              <span className="material-icons">keyboard_arrow_down</span>
              아래로 스크롤해주세요
            </div>
          )}

          {/* 하단 다음 버튼 */}
          <div
            className={`report_bottom_btn_wrap ${
              canProceed && currentMsg.type !== "waiting"
                ? "visible"
                : ""
            }`}
          >
            {currentMsg.type === "ending" ? (
              <div className="end_buttons">
                <button className="dialogue_next_btn" onClick={() => window.location.reload()}>
                  처음부터 다시 보기
                </button>
                <button className="dialogue_secondary_btn" onClick={() => setShowExitModal(true)}>
                  홈으로
                </button>
              </div>
            ) : currentMsg.type === "waiting" ? (
              <div className="waiting_info">
                <p>분석이 완료되면 자동으로 다음으로 넘어갑니다</p>
              </div>
            ) : (
              <div className="report_nav_buttons">
                {currentIndex > 0 && (
                  <button className="report_prev_btn" onClick={handlePrev}>
                    이전
                  </button>
                )}
                <button className="report_next_btn" onClick={handleNext}>
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 대화 UI (하단 고정) */}
      <div className={`dialogue_wrap ${!showReport ? "active" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialogue_box" onClick={handleNext}>
          <div className="dialogue_speaker">까치도령</div>
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

// 목차 모달 컴포넌트
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
  const tocItems = messages
    .map((m, i) => ({ ...m, index: i }))
    .filter(
      (m) =>
        m.type === "intro" ||
        m.type === "saju" ||
        (m.type === "report" && m.id.includes("-report")) ||
        m.type === "image" ||
        m.type === "ending"
    );

  const getTocTitle = (item: MessageItem & { index: number }) => {
    if (item.type === "intro") return "들어가며";
    if (item.type === "saju") return "사주 원국";
    if (item.type === "report") {
      const match = item.id.match(/chapter-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        const titles = [
          "2026년 총운",
          "재물운",
          "건강운",
          "애정운",
          "직장·명예운",
          "관계운",
          "감정관리",
          "월별운세",
          "미래일기",
          "개운법 10계명",
          "부적",
        ];
        return `${num}장. ${titles[num - 1] || ""}`;
      }
    }
    if (item.type === "image") return "수호 부적";
    if (item.type === "ending") return "마무리";
    return "";
  };

  return (
    <div className="toc_modal_overlay" onClick={onClose}>
      <div className="toc_modal" onClick={(e) => e.stopPropagation()}>
        <div className="toc_modal_header">
          <span className="toc_modal_title">목차</span>
          <button className="toc_modal_close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="toc_modal_list">
          {tocItems.map((item) => (
            <button
              key={item.id}
              className={`toc_modal_item ${item.index === currentIndex ? "active" : ""} ${
                item.index <= currentIndex ? "visited" : ""
              }`}
              onClick={() => item.index <= currentIndex && onNavigate(item.index)}
              disabled={item.index > currentIndex}
            >
              {getTocTitle(item)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 인트로 카드 컴포넌트
function IntroCard({ userName }: { userName: string }) {
  return (
    <div className="report_card intro_card">
      <div className="card_header">
        <span className="card_label">INTRO</span>
        <h2 className="card_title">
          {userName}님의 2026년
          <br />
          신년 운세를 알려드릴게요
        </h2>
      </div>
      <div className="card_content intro_content">
        <div className="intro_section">
          <h3 className="intro_section_title">사주(四柱)란?</h3>
          <p className="intro_section_content">
            사주는 태어난 해(年), 월(月), 일(日), 시(時)를 나타내는 네 개의 기둥이에요.
            각 기둥은 천간과 지지로 이루어져 있어 총 8글자, 이것이 바로 &apos;사주팔자&apos;예요.
          </p>
        </div>
        <div className="intro_section">
          <h3 className="intro_section_title">일간(日干)이란?</h3>
          <p className="intro_section_content">
            일간은 태어난 날의 천간으로, 나 자신을 의미해요.
            일간을 통해 성격, 재능, 그리고 운의 흐름을 알 수 있어요.
          </p>
        </div>
        <div className="intro_section">
          <h3 className="intro_section_title">2026년 병오년(丙午年)</h3>
          <p className="intro_section_content">
            2026년은 붉은 말의 해, 병오년이에요. 강한 불의 기운이 가득한 해로,
            열정과 도전의 에너지가 넘치는 한 해가 될 거예요.
          </p>
        </div>
      </div>
    </div>
  );
}

// 사주 카드 컴포넌트
function SajuCard({ data }: { data: NewYearRecord }) {
  type PillarData = {
    stem?: { char?: string; element?: string; yinYang?: string };
    branch?: { char?: string; element?: string; yinYang?: string };
  };
  const pillars = (data.sajuData?.pillars || {}) as Record<string, PillarData>;
  const dayMaster = data.sajuData?.dayMaster;

  return (
    <div className="report_card saju_card">
      <div className="card_header">
        <span className="card_label">사주 원국</span>
        <h2 className="card_title">
          {data.input?.userName}님의 사주 팔자
        </h2>
      </div>

      <div className="saju_info_row">
        <div className="saju_info_main">
          <span className="saju_info_name">{data.input?.userName}</span>
          <span className="saju_info_birth">
            {data.input?.date} ({data.input?.calendar === "lunar" ? "음력" : "양력"})
          </span>
        </div>
        <div className="saju_info_ilju">
          <span className="ilju_char" style={{ color: getColor(dayMaster?.element) }}>
            {dayMaster?.char}
          </span>
          <span className="ilju_title">{dayMaster?.title}</span>
        </div>
      </div>

      <div className="pillars_mini">
        {(["hour", "day", "month", "year"] as const).map((key) => {
          const p = pillars[key];
          const labels = { hour: "시주", day: "일주", month: "월주", year: "년주" };
          return (
            <div key={key} className="pillar_mini_item">
              <div className="pillar_mini_label">{labels[key]}</div>
              <div className="pillar_mini_chars">
                <span
                  className="pillar_mini_stem"
                  style={{
                    color: p?.stem?.char ? getColor(getStemElement(p.stem.char)) : "#ccc",
                  }}
                >
                  {p?.stem?.char || "—"}
                </span>
                <span
                  className="pillar_mini_branch"
                  style={{
                    color: p?.branch?.char ? getColor(getBranchElement(p.branch.char)) : "#ccc",
                  }}
                >
                  {p?.branch?.char || "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 리포트 카드 컴포넌트
function ReportCard({
  chapter,
  chapterIndex,
}: {
  chapter: { number: number; title: string; content: string };
  chapterIndex: number;
}) {
  const formatContent = (content: string) => {
    if (!content) return "";

    let html = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>")
      .replace(/^-\s+(.+)$/gm, "<li>$1</li>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br>");

    html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");
    html = html.replace(
      /(<blockquote>.*?<\/blockquote>)+/g,
      (match) => "<blockquote>" + match.replace(/<\/?blockquote>/g, "") + "</blockquote>"
    );

    return `<p>${html}</p>`;
  };

  return (
    <div className="report_card">
      <div className="card_header">
        <span className="card_label">{chapter.number || chapterIndex + 1}장</span>
        <h2 className="card_title">{chapter.title}</h2>
      </div>
      <div
        className="card_content"
        dangerouslySetInnerHTML={{ __html: formatContent(chapter.content) }}
      />
    </div>
  );
}

// 부적 카드 컴포넌트
function TalismanCard({
  imageBase64,
  userName,
  title,
}: {
  imageBase64: string;
  userName: string;
  title: string;
}) {
  return (
    <div className="report_card talisman_card">
      <div className="card_header">
        <span className="card_label">수호 부적</span>
        <h2 className="card_title">{title}</h2>
      </div>
      <div className="talisman_image_wrap">
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="2026년 수호 부적"
          className="talisman_image"
        />
      </div>
      <p className="talisman_tip">이미지를 길게 눌러 저장하거나, 배경으로 설정해보세요</p>
    </div>
  );
}

// 대기 카드 컴포넌트
function WaitingCard({
  userName,
  isComplete,
  analysisStartedAt,
  onTransition,
}: {
  userName: string;
  isComplete: boolean;
  analysisStartedAt?: string;
  onTransition: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      setTimeout(() => {
        onTransition();
      }, 1000);
      return;
    }

    const startTime = analysisStartedAt ? new Date(analysisStartedAt).getTime() : Date.now();
    const estimatedDuration = 180000; // 3분

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
      setProgress(newProgress);
    };

    updateProgress();
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [isComplete, analysisStartedAt, onTransition]);

  return (
    <div className="report_card waiting_card">
      <div className="card_header">
        <span className="card_label">분석 중</span>
        <h2 className="card_title">
          {userName}님의 2026년 운세를
          <br />
          분석하고 있어요
        </h2>
      </div>
      <div className="waiting_content">
        <div className="waiting_progress_wrap">
          <div className="waiting_progress_bar">
            <div className="waiting_progress_fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="waiting_progress_text">{Math.floor(progress)}%</span>
        </div>
        <div className="waiting_steps">
          <div className={`waiting_step ${progress > 5 ? "active" : ""}`}>
            <span className="waiting_step_icon">🔮</span>
            <span className="waiting_step_text">사주 팔자 분석</span>
          </div>
          <div className={`waiting_step ${progress > 15 ? "active" : ""}`}>
            <span className="waiting_step_icon">📊</span>
            <span className="waiting_step_text">2026년 총운·재물운 분석</span>
          </div>
          <div className={`waiting_step ${progress > 30 ? "active" : ""}`}>
            <span className="waiting_step_icon">💪</span>
            <span className="waiting_step_text">건강운·애정운 분석</span>
          </div>
          <div className={`waiting_step ${progress > 45 ? "active" : ""}`}>
            <span className="waiting_step_icon">💼</span>
            <span className="waiting_step_text">직장운·관계운 분석</span>
          </div>
          <div className={`waiting_step ${progress > 55 ? "active" : ""}`}>
            <span className="waiting_step_icon">🧘</span>
            <span className="waiting_step_text">감정관리·월별운세 분석</span>
          </div>
          <div className={`waiting_step ${progress > 70 ? "active" : ""}`}>
            <span className="waiting_step_icon">📔</span>
            <span className="waiting_step_text">미래일기 작성</span>
          </div>
          <div className={`waiting_step ${progress > 85 ? "active" : ""}`}>
            <span className="waiting_step_icon">✨</span>
            <span className="waiting_step_text">개운법·부적 생성</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 엔딩 카드 컴포넌트
function EndingCard({ data }: { data: NewYearRecord }) {
  const userName = data.analysis?.user_name || data.input?.userName || "고객";

  return (
    <div className="report_card ending_card">
      <div className="ending_greeting">
        <p className="greeting_main">
          {userName}님, 여기까지 함께해주셔서
          <br />
          정말 감사해요!
        </p>
        <p>
          2026년 병오년이
          <br />
          {userName}님에게 행운과 기쁨이
          <br />
          가득한 해가 되길 바랄게요.
        </p>
        <p className="ending_sign">- 까치도령 드림 🐴</p>
      </div>

      <div className="ending_summary">
        <h3 className="summary_title">2026년 신년 운세 요약</h3>

        {data.analysis?.chapters?.map((chapter, index) => (
          <div key={index} className="summary_report_card">
            <div className="card_header">
              <span className="card_label">{chapter.number || index + 1}장</span>
              <span className="card_title">{chapter.title}</span>
            </div>
            <div className="card_content">
              {chapter.content.slice(0, 200)}...
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NewYearResultPage() {
  return (
    <Suspense
      fallback={
        <div className="newyear_result_page">
          <div className="main_body_wrap">
            <div className="loading_wrap">
              <div className="loading_progress_bar">
                <div className="loading_progress_fill"></div>
              </div>
              <p className="loading_text">로딩 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewYearResultContent />
    </Suspense>
  );
}
