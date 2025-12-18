"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
// 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
const SAJU_API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;
import {
  getSajuLoveRecord,
  updateSajuLoveRecord,
  SajuLoveRecord,
} from "@/lib/db/sajuLoveDB";
import { trackPageView } from "@/lib/mixpanel";
import "./result.css";

// 연애 사주 분석 결과 타입
interface LoveAnalysisResult {
  user_name: string;
  chapters: {
    number: number; // 0=들어가며, 1~6=각 장
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
  Wood: "#2aa86c",
  火: "#ff6a6a",
  fire: "#ff6a6a",
  Fire: "#ff6a6a",
  土: "#caa46a",
  earth: "#caa46a",
  Earth: "#caa46a",
  金: "#9a9a9a",
  metal: "#9a9a9a",
  Metal: "#9a9a9a",
  水: "#6aa7ff",
  water: "#6aa7ff",
  Water: "#6aa7ff",
};

const getColor = (element?: string): string => {
  if (!element) return "#333";
  return elementColors[element] || "#333";
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

// 각 챕터별 대사와 배경 이미지
// API 응답: [1장, 2장, 3장, 4장, 5장, 6장] - 총 6개 챕터
const getChapterConfig = (
  userName: string
): Record<
  string,
  {
    intro: string;
    outro: string;
    introBg: string;
    reportBg: string;
    outroBg: string;
  }
> => ({
  chapter1: {
    // 1장: 나만의 매력과 연애 성향
    intro: `1장에서는 ${userName}님이 가진 매력과\n연애 스타일을 알려드릴게요!`,
    outro: `어떠세요, ${userName}님의 매력이 보이시나요?\n이제 미래의 연애 운을 살펴볼게요!`,
    introBg: "/saju-love/img/nangja-6.jpg",
    reportBg: "/saju-love/img/nangja-7.jpg",
    outroBg: "/saju-love/img/nangja-8.jpg",
  },
  chapter2: {
    // 2장: 앞으로 펼쳐질 사랑의 흐름
    intro: `2장에서는 앞으로 펼쳐질\n${userName}님의 연애 운세를 알려드릴게요.`,
    outro: "운세의 흐름을 파악했으니,\n이제 운명의 상대에 대해 얘기해볼까요?",
    introBg: "/saju-love/img/nangja-9.jpg",
    reportBg: "/saju-love/img/nangja-10.jpg",
    outroBg: "/saju-love/img/nangja-11.jpg",
  },
  chapter3: {
    // 3장: 결국 만나게 될 운명의 상대
    intro: `3장에서는 ${userName}님이 만나게 될\n운명의 상대에 대해 알려드릴게요.`,
    outro: "이제 조심해야 할 가짜 인연에\n대해 이야기해드릴게요.",
    introBg: "/saju-love/img/nangja-12.jpg",
    reportBg: "/saju-love/img/nangja-13.jpg",
    outroBg: "/saju-love/img/nangja-14.jpg",
  },
  chapter4: {
    // 4장: 운명이라 착각하는 가짜 인연
    intro: "4장에서는 운명이라 착각할 수 있는\n가짜 인연에 대해 알려드릴게요.",
    outro: "자, 이제 조금 민감한 주제로\n넘어가볼까요?",
    introBg: "/saju-love/img/nangja-18.jpg",
    reportBg: "/saju-love/img/nangja-19.jpg",
    outroBg: "/saju-love/img/nangja-20.jpg",
  },
  chapter5: {
    // 5장: 누구에게도 말 못할, 19금 사주 풀이
    intro: "5장에서는 누구에게도 말 못할,\n스킨십에 대해 이야기해드릴게요.",
    outro: `마지막으로 제가 ${userName}님께\n전해드릴 귀띔이 있어요.`,
    introBg: "/saju-love/img/nangja-21.jpg",
    reportBg: "/saju-love/img/nangja-22.jpg",
    outroBg: "/saju-love/img/nangja-23.jpg",
  },
  chapter6: {
    // 6장: 색동낭자의 귀띔 (고민 답변)
    intro: `${userName}님의 고민에 제가 답변드릴게요.`,
    outro: "",
    introBg: "/saju-love/img/nangja-24.jpg",
    reportBg: "/saju-love/img/nangja-25.jpg",
    outroBg: "/saju-love/img/nangja-25.jpg",
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const [showTocModal, setShowTocModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [currentBgImage, setCurrentBgImage] = useState(
    "/saju-love/img/nangja-1.jpg"
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isFetchingRef = useRef(false);
  const partialStartedRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // 이미지 프리로드 (페이지 로드 시)
  useEffect(() => {
    const imageUrls = Array.from(
      { length: 26 },
      (_, i) => `/saju-love/img/nangja-${i + 1}.jpg`
    );

    // 이미지를 순차적으로 로드 (3개씩 병렬)
    const preloadImages = async () => {
      const batchSize = 3;
      for (let i = 0; i < imageUrls.length; i += batchSize) {
        const batch = imageUrls.slice(i, i + batchSize);
        await Promise.all(
          batch.map(
            (url) =>
              new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // 에러 시에도 진행
                img.src = url;
              })
          )
        );
      }
    };

    preloadImages();
  }, []);

  // 챕터에서 키 추출 (number 또는 title 기반)
  const getChapterKey = (chapter: {
    number?: number;
    title?: string;
  }): string => {
    // number가 있으면 사용 (1~6장)
    if (
      typeof chapter.number === "number" &&
      chapter.number >= 1 &&
      chapter.number <= 6
    ) {
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

  // 부분 메시지 리스트 생성 (들어가며 + 사주원국만 - 분석 중일 때 사용)
  const buildPartialMessageList = useCallback(
    (record: SajuLoveRecord): MessageItem[] => {
      const result: MessageItem[] = [];
      const userName = record.input?.userName || "고객";

      // 1. 첫 인사 대화 (분석 중이므로 메시지 수정)
      result.push({
        id: "opening-dialogue",
        type: "dialogue",
        content: `안녕하세요, ${userName}님!\n보고서를 준비하는 동안 먼저 사주에 대해 알려드릴게요.`,
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      // 2. 들어가며 안내 대화
      result.push({
        id: "intro-guide-dialogue",
        type: "dialogue",
        content: `${userName}님의 사주를 알려드리기 전에,\n먼저 연애 사주에 대해 간단히 설명해드릴게요.`,
        bgImage: "/saju-love/img/nangja-2.jpg",
      });

      // 3. 들어가며 인트로 카드
      result.push({
        id: "intro-card",
        type: "intro",
        content: "",
        bgImage: "/saju-love/img/nangja-3.jpg",
      });

      // 4. 사주 원국 소개 대화
      result.push({
        id: "saju-intro-dialogue",
        type: "dialogue",
        content: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`,
        bgImage: "/saju-love/img/nangja-4.jpg",
      });

      // 5. 사주 원국 카드
      result.push({
        id: "saju-card",
        type: "saju",
        content: "",
        bgImage: "/saju-love/img/nangja-5.jpg",
      });

      // 6. 대기 메시지 (분석 완료 대기)
      result.push({
        id: "waiting",
        type: "waiting",
        content: "",
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      return result;
    },
    []
  );

  // 메시지 리스트 생성 (전체 - 분석 완료 후)
  // 흐름: 첫 인사 → [1장] → [2장] → [3장] → 운명의 상대 이미지 → [4장] → [5장] → [6장] → 엔딩
  const buildMessageList = useCallback(
    (record: SajuLoveRecord): MessageItem[] => {
      const result: MessageItem[] = [];
      const userName =
        record.loveAnalysis?.user_name || record.input?.userName || "고객";
      const chapters = record.loveAnalysis?.chapters || [];
      const hasIdealImage =
        !!record.loveAnalysis?.ideal_partner_image?.image_base64;

      // 1. 첫 인사 대화
      result.push({
        id: "opening-dialogue",
        type: "dialogue",
        content: `안녕하세요, ${userName}님!\n드디어 분석이 완료됐어요. 천천히 살펴볼까요?`,
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      // 2. 들어가며 안내 대화
      result.push({
        id: "intro-guide-dialogue",
        type: "dialogue",
        content: `${userName}님의 사주를 알려드리기 전에,\n먼저 연애 사주에 대해 간단히 설명해드릴게요.`,
        bgImage: "/saju-love/img/nangja-2.jpg",
      });

      // 3. 들어가며 인트로 카드
      result.push({
        id: "intro-card",
        type: "intro",
        content: "",
        bgImage: "/saju-love/img/nangja-3.jpg",
      });

      // 4. 사주 원국 소개 대화
      result.push({
        id: "saju-intro-dialogue",
        type: "dialogue",
        content: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`,
        bgImage: "/saju-love/img/nangja-4.jpg",
      });

      // 5. 사주 원국 카드
      result.push({
        id: "saju-card",
        type: "saju",
        content: "",
        bgImage: "/saju-love/img/nangja-5.jpg",
      });

      // 6. 각 챕터별 [intro 대화 → 리포트 → outro 대화]
      // 3장 이후에 운명의 상대 이미지 삽입
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
            bgImage: config.introBg || "/saju-love/img/nangja-1.jpg",
          });
        }

        // 챕터 리포트 카드
        result.push({
          id: `chapter-${chapterKey}-report`,
          type: "report",
          content: chapter.content,
          chapterIndex: index,
          bgImage: config?.reportBg || "/saju-love/img/nangja-1.jpg",
        });

        // 챕터 outro 대화 (있는 경우에만)
        if (config?.outro) {
          result.push({
            id: `chapter-${chapterKey}-outro`,
            type: "dialogue",
            content: config.outro,
            bgImage: config.outroBg || "/saju-love/img/nangja-1.jpg",
          });
        }

        // 3장 이후에 운명의 상대 이미지 삽입
        if (chapterNum === 3 && hasIdealImage) {
          result.push({
            id: "ideal-type-dialogue",
            type: "dialogue",
            content: `잠깐, 여기서 특별히 보여드릴게 있어요.\n${userName}님의 운명의 상대가 어떻게 생겼는지 궁금하지 않으세요?`,
            bgImage: "/saju-love/img/nangja-15.jpg",
          });
          result.push({
            id: "ideal-type-image",
            type: "image",
            content: `${userName}님의 운명의 상대`,
            imageBase64: record.loveAnalysis!.ideal_partner_image!.image_base64,
            bgImage: "/saju-love/img/nangja-16.jpg",
          });
          result.push({
            id: "ideal-type-outro",
            type: "dialogue",
            content: `어떠세요, 설레지 않으세요?\n자, 이제 계속해서 ${userName}님의 연애 운을 살펴볼게요!`,
            bgImage: "/saju-love/img/nangja-17.jpg",
          });
        }
      });

      // 26. 마무리 전 대화
      result.push({
        id: "ending-intro",
        type: "dialogue",
        content: `${userName}님, 여기까지 긴 여정 함께해주셔서 감사해요.\n어떠셨어요? 연애 사주를 보니 조금은 마음이 풀리셨나요?`,
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      // 27. 마무리 인사
      result.push({
        id: "ending-outro",
        type: "dialogue",
        content: `앞으로의 인연 길에\n늘 좋은 일만 가득하시길 바랄게요.\n\n그럼, 마지막 인사를 담아드릴게요.`,
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      // 28. 마무리 메시지
      result.push({
        id: "ending",
        type: "ending",
        content: "",
        bgImage: "/saju-love/img/nangja-1.jpg",
      });

      return result;
    },
    []
  );

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

    // 이미지 업데이트
    const prevImage = prevMsg.bgImage || "/saju-love/img/nangja-1.jpg";
    setCurrentBgImage(prevImage);

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

    // 이미지 프리로드 헬퍼
    const ensureImageLoaded = (url: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        // 이미 캐시되어 있으면 즉시 resolve
        if (img.complete) {
          resolve();
          return;
        }
        img.src = url;
      });
    };

    // 다음 메시지로 이동하는 함수
    const goToNextMessage = async (nextIndex: number) => {
      const nextMsg = messages[nextIndex];
      const nextImage = nextMsg.bgImage || "/saju-love/img/nangja-1.jpg";

      // 이미지 로드 대기 (최대 100ms)
      await Promise.race([
        ensureImageLoaded(nextImage),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      setCurrentIndex(nextIndex);
      setCurrentBgImage(nextImage);

      if (nextMsg.type === "dialogue") {
        typeText(nextMsg.content, () => setShowButtons(true));
      } else {
        setIsAnimating(true);
        setShowReport(true);
        setShowButtons(true);
        // 애니메이션 완료 후 상호작용 허용 (0.5s transition)
        setTimeout(() => setIsAnimating(false), 550);
      }
    };

    // 리포트 보고 있으면 닫기
    if (showReport) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < messages.length) {
        const nextMsg = messages[nextIndex];
        const nextImage = nextMsg.bgImage || "/saju-love/img/nangja-1.jpg";

        // 이미지가 다르면: 이미지 먼저 바꾸고 딜레이 후 전환
        if (nextImage !== currentBgImage) {
          setCurrentBgImage(nextImage);
          setTimeout(() => {
            setShowReport(false);
            goToNextMessage(nextIndex);
          }, 100);
        } else {
          setShowReport(false);
          goToNextMessage(nextIndex);
        }
      }
      return;
    }

    // 다음 메시지로
    const nextIndex = currentIndex + 1;
    if (nextIndex < messages.length) {
      goToNextMessage(nextIndex);
    }
  }, [currentIndex, messages, isTyping, showReport, typeText, currentBgImage]);

  // 로딩 메시지 순환
  const startLoadingMessages = useCallback((userName: string) => {
    const loadingMsgs = [
      `${userName}님의 사주 팔자를 분석하고 있어요`,
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
              input: storedData.input, // 성별 정보 포함
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

        const loveResult = (await response.json()) as LoveAnalysisResult;

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
        setIsAnalyzing(false);
        setData(updatedData);

        // 메시지 리스트 생성
        const messageList = buildMessageList(updatedData);
        setMessages(messageList);
        setIsLoading(false);

        // 이미 partial로 시작했다면 → 1장으로 이동하며 "기다리셨죠" 메시지
        if (partialStartedRef.current) {
          setTimeout(() => {
            const chapter1IntroIndex = messageList.findIndex(
              (m) => m.id === "chapter-chapter1-intro"
            );
            if (chapter1IntroIndex >= 0) {
              setCurrentIndex(chapter1IntroIndex);
              const nextMsg = messageList[chapter1IntroIndex];
              setCurrentBgImage(nextMsg.bgImage || "/saju-love/img/nangja-1.jpg");
              setShowReport(false);
              typeText(`오래 기다리셨죠? 분석이 완료됐어요!\n\n${nextMsg.content}`, () => setShowButtons(true));
            }
          }, 300);
        } else {
          // 아직 partial 시작 전이면 → 첫 번째 메시지 자동 시작
          setTimeout(() => {
            typeText(messageList[0].content, () => setShowButtons(true));
          }, 500);
        }
      } catch (err) {
        stopLoadingMessages();
        setIsAnalyzing(false);
        console.error("분석 API 실패:", err);
        if (err instanceof Error) {
          if (err.message === "TIMEOUT") {
            setError(
              "서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요."
            );
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

      // 결제 여부 체크 - 미결제 시 detail 페이지로 리다이렉트
      if (!record.paid) {
        router.push(`/saju-love/detail?id=${resultId}`);
        return;
      }

      // 결과 페이지 방문 추적 (결제 완료된 사용자)
      trackPageView("saju_love_result", {
        id: record.id,
        user_name: record.input.userName,
        gender: record.input.gender,
        birth_date: record.input.date,
        birth_time: record.input.time || "모름",
        status: record.input.status,
        user_concern: record.input.userConcern,
        day_master: record.sajuData.dayMaster?.char,
        day_master_title: record.sajuData.dayMaster?.title,
        paid: true,
        // 결제 정보
        payment_method: record.paymentInfo?.method,
        payment_price: record.paymentInfo?.price,
        coupon_code: record.paymentInfo?.couponCode,
        is_discount: record.paymentInfo?.isDiscount,
      });

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

      // 분석 필요 - 데이터 설정 후 분석 시작
      setData(record);
      setIsAnalyzing(true);
      fetchLoveAnalysis(record);

      // 10초 후 partial 메시지로 먼저 시작
      setTimeout(() => {
        // 아직 분석 중이고, partial 시작 전이면
        if (!partialStartedRef.current && isFetchingRef.current) {
          partialStartedRef.current = true;
          const partialMessages = buildPartialMessageList(record);
          setMessages(partialMessages);
          setIsLoading(false);
          setTimeout(() => {
            typeText(partialMessages[0].content, () => setShowButtons(true));
          }, 500);
        }
      }, 10000); // 10초
    };

    loadData();
  }, [
    resultId,
    fetchLoveAnalysis,
    buildMessageList,
    buildPartialMessageList,
    typeText,
    router,
  ]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className="saju_result_page">
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

  // 데이터나 메시지가 없으면 null
  if (!data || messages.length === 0) {
    return null;
  }

  const userName =
    data.loveAnalysis?.user_name || data.input?.userName || "고객";
  const currentMsg = messages[currentIndex];

  // 버튼 텍스트 결정
  const getButtonText = () => {
    if (showReport) return "확인했어";
    if (currentMsg?.type === "dialogue") return "다음";
    return "확인하기";
  };

  // 화면 전체 클릭 핸들러 (대화 중일 때만 스킵)
  const handleScreenClick = () => {
    if (!showReport && currentMsg?.type === "dialogue") {
      handleNext();
    }
  };

  return (
    <div className="saju_result_page chat_mode" onClick={handleScreenClick}>
      {/* 배경 이미지 */}
      <div className="result_bg">
        <img
          src={currentBgImage}
          alt=""
          className="result_bg_image"
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
        <div
          className="exit_modal_overlay"
          onClick={() => setShowExitModal(false)}
        >
          <div className="exit_modal" onClick={(e) => e.stopPropagation()}>
            <p className="exit_modal_text">홈으로 돌아갈까요?</p>
            <div className="exit_modal_buttons">
              <button
                className="exit_modal_cancel"
                onClick={() => setShowExitModal(false)}
              >
                아니요
              </button>
              <button
                className="exit_modal_confirm"
                onClick={() => router.push("/saju-love")}
              >
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
            // 이미지 업데이트
            const targetImage =
              targetMsg.bgImage || "/saju-love/img/nangja-1.jpg";
            setCurrentBgImage(targetImage);
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
        <div
          className={`report_overlay active ${isAnimating ? "animating" : ""}`}
        >
          <div className="report_scroll" ref={reportRef}>
            {currentMsg.type === "intro" && <IntroCard userName={userName} />}
            {currentMsg.type === "saju" && <SajuCard data={data} />}
            {currentMsg.type === "report" && data.loveAnalysis && (
              <ReportCard
                chapter={data.loveAnalysis.chapters[currentMsg.chapterIndex!]}
                chapterIndex={currentMsg.chapterIndex!}
              />
            )}
            {currentMsg.type === "image" && currentMsg.imageBase64 && (
              <IdealTypeCard
                imageBase64={currentMsg.imageBase64}
                userName={userName}
              />
            )}
            {currentMsg.type === "waiting" && (
              <WaitingCard userName={userName} />
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
              canProceed && currentMsg.type !== "waiting" ? "visible" : ""
            }`}
          >
            {currentMsg.type === "ending" ? (
              <div className="end_buttons">
                <button
                  className="dialogue_next_btn"
                  onClick={() => window.location.reload()}
                >
                  처음부터 다시 보기
                </button>
                <button
                  className="dialogue_secondary_btn"
                  onClick={() => setShowExitModal(true)}
                >
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
                  확인했어
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 대화 UI (하단 고정) */}
      <div
        className={`dialogue_wrap ${!showReport ? "active" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
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
  const chapterNum = chapterMatch
    ? parseInt(chapterMatch[1])
    : chapterIndex + 1;

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
        dangerouslySetInnerHTML={{
          __html: formatChapterContent(chapter.content || ""),
        }}
      />
    </div>
  );
}

// 운명의 상대 이미지 카드
function IdealTypeCard({
  imageBase64,
  userName,
}: {
  imageBase64: string;
  userName: string;
}) {
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
        <h3 className="card_title">{userName}님의 운명의 상대</h3>
      </div>
      <div
        className={`ideal_image_wrap ${isRevealed ? "revealed" : "blurred"} ${
          isShaking ? "shake" : ""
        }`}
        onClick={handleClick}
      >
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt="운명의 상대 이미지"
          className="ideal_image"
          style={{
            filter: `blur(${blurLevel}px)`,
            transition: "filter 0.4s ease-out",
          }}
        />
      </div>
      {!isRevealed && (
        <p className="ideal_tap_hint">{hintMessages[clickCount]}</p>
      )}
      {isRevealed && (
        <div className="ideal_revealed_message">
          <p>
            어떠세요, {userName}님?
            <br />
            혹시 어디선가 스쳐 지나간 적 있는 얼굴인가요?
          </p>
        </div>
      )}
    </div>
  );
}

// 일간별 연애 성향 데이터
const dayMasterLoveData: Record<
  string,
  { headline: string; summary: string; keywords: string[] }
> = {
  甲: {
    headline: "곧고 당당한, 큰 나무 같은 사랑",
    summary:
      "갑목일간은 기둥처럼 곧고 당당해요. 연애에서도 솔직하고 의연하게, 상대를 든든히 지켜주는 스타일이에요.",
    keywords: ["솔직함", "의리", "리더십"],
  },
  乙: {
    headline: "유연하게 감싸 안는, 덩굴 같은 사랑",
    summary:
      "을목일간은 덩굴처럼 상대를 감싸며 끈질기게 관계를 이어가요. 어떤 환경에도 적응하는 헌신적인 연애 스타일이에요.",
    keywords: ["적응력", "헌신", "인내심"],
  },
  丙: {
    headline: "뜨겁게 밝히는, 태양 같은 사랑",
    summary:
      "병화일간은 태양처럼 화끈하고 열정적이에요. 숨김없이 솔직하게, 온 마음을 다해 사랑하는 타입이에요.",
    keywords: ["열정", "적극성", "밝은 에너지"],
  },
  丁: {
    headline: "은은하게 비추는, 촛불 같은 사랑",
    summary:
      "정화일간은 촛불처럼 은은하고 섬세해요. 따뜻한 마음으로 상대를 보살피며 오래도록 관계를 유지해요.",
    keywords: ["섬세함", "따뜻함", "지속성"],
  },
  戊: {
    headline: "넉넉하게 품어주는, 큰 산 같은 사랑",
    summary:
      "무토일간은 큰 산처럼 깊고 넉넉한 포용력을 가졌어요. 상대를 안정시키고 듬직하게 지켜주는 연애 스타일이에요.",
    keywords: ["포용력", "안정감", "듬직함"],
  },
  己: {
    headline: "묵묵히 곁을 지키는, 대지 같은 사랑",
    summary:
      "기토일간은 농사짓는 땅처럼 상대를 돌보고 길러내요. 가장 헌신적이고 현실적인 연애 타입이에요.",
    keywords: ["헌신", "실속", "살뜰함"],
  },
  庚: {
    headline: "흔들림 없는, 강철 같은 사랑",
    summary:
      "경금일간은 사랑하는 사람에게 흔들림 없는 신뢰와 보호를 제공해요. 의리 있고 단호한 연애 스타일이에요.",
    keywords: ["의리", "결단력", "보호본능"],
  },
  辛: {
    headline: "빛나고 예리한, 보석 같은 사랑",
    summary:
      "신금일간은 보석처럼 자신을 가꾸고, 관계에서도 완벽함을 추구해요. 깔끔하고 섬세한 연애 스타일이에요.",
    keywords: ["완벽주의", "섬세함", "귀티"],
  },
  壬: {
    headline: "모든 것을 담아내는, 바다 같은 사랑",
    summary:
      "임수일간은 바다처럼 넓은 포용력으로 상대를 이해하고 감싸줘요. 깊은 지혜를 가진 연애 타입이에요.",
    keywords: ["포용력", "지혜", "깊이"],
  },
  癸: {
    headline: "촉촉하게 스며드는, 이슬 같은 사랑",
    summary:
      "계수일간은 비나 이슬처럼 촉촉하고 섬세해요. 상대를 위로하며 조용히 헌신하는 연애 스타일이에요.",
    keywords: ["감성", "섬세함", "헌신"],
  },
};

// 신강/신약 연애 해석 (상세)
const strengthLoveInterpretation: Record<
  string,
  {
    title: string;
    mainRatio: string;
    traits: string[];
    pattern: string[];
    goodPoints: string[];
    warning: string[];
    idealType: string;
  }
> = {
  극신강: {
    title: "100% 내가 주도하는 스타일",
    mainRatio: "주도권 100%",
    traits: ["독단적이고 지배적", "내 방식대로 하려 함", "통제욕이 강함"],
    pattern: ["내가 하라는 대로 해", "왜 말 안 들어?", "내가 다 맞아"],
    goodPoints: ["결단력 있음", "흔들림 없는 중심"],
    warning: [
      "상대를 지배하려 함",
      "갈등 시 절대 안 꺾임",
      "관계가 일방적이 됨",
    ],
    idealType: "내 리드를 잘 따라오는 사람",
  },
  신강: {
    title: "대부분 내가 주도하는 스타일",
    mainRatio: "주도권 70~80%",
    traits: ["자기 스타일 고집", "독립적", "확실하고 직접적"],
    pattern: ["내가 다 알아서 할게", "이렇게 하는 게 맞아", "난 이게 좋아"],
    goodPoints: ["결단력 있음", "상대를 이끌어줌", "흔들리지 않는 중심"],
    warning: [
      "상대 의견 무시할 수 있음",
      "내 맘대로 되기 쉬움",
      "상대가 숨막혀할 수 있음",
    ],
    idealType: "내 방식을 따라와 줄 사람",
  },
  중화신강: {
    title: "약간 내가 더 주도하는 스타일",
    mainRatio: "주도권 6:4",
    traits: ["자기 의견 확실하되 상대도 존중", "주도적이지만 독단적이지 않음"],
    pattern: [
      "내 생각엔 이게 좋을 것 같아. 어때?",
      "내가 할게~ 근데 네 의견도 말해줘",
    ],
    goodPoints: [
      "리더십 있으면서 배려도 함",
      "상대에게 안정감을 줌",
      "결정력 + 유연함",
    ],
    warning: [],
    idealType: "내 리드를 따라오면서도 자기 의견 있는 사람",
  },
  중화: {
    title: "완벽한 균형의 스타일",
    mainRatio: "주도권 5:5",
    traits: ["상황에 따라 리드도, 서포트도", "자연스럽고 균형 잡힘"],
    pattern: ["오늘은 내가 정할게~ 다음엔 네가 해", "우리 같이 정하자"],
    goodPoints: [
      "어떤 상대든 맞출 수 있음",
      "관계의 균형을 잘 잡음",
      "건강한 관계 유지",
    ],
    warning: [],
    idealType: "동등한 파트너",
  },
  중화신약: {
    title: "약간 상대에게 맞추는 스타일",
    mainRatio: "주도권 4:6",
    traits: ["부드럽게 맞춰주되 자기 의견도 있음", "조율형"],
    pattern: ["난 이게 좋은데, 너는 어때?", "네 의견 존중해, 근데 나는..."],
    goodPoints: ["균형 잡힌 배려", "갈등 조율 능력", "부드러운 리더십 가능"],
    warning: [],
    idealType: "나를 존중하면서 이끌어주는 사람",
  },
  신약: {
    title: "상대에게 맞추는 스타일",
    mainRatio: "주도권 20~30%",
    traits: ["배려심 깊음", "맞춰줌", "헌신적"],
    pattern: [
      "뭐 먹을래? 난 아무거나~",
      "내가 맞출게",
      "네가 행복하면 나도 행복해",
    ],
    goodPoints: ["상대를 편하게 해줌", "배려심이 깊음", "갈등을 피하려 함"],
    warning: [
      "너무 맞추다 지칠 수 있음",
      "자기 욕구를 억누름",
      "상대가 답답해할 수도 있음",
    ],
    idealType: "든든하고 리드해주는 사람",
  },
  극신약: {
    title: "완전히 상대 중심의 스타일",
    mainRatio: "주도권 거의 없음",
    traits: ["자존감 낮음", "의존 심함", "버림받을 불안"],
    pattern: [
      "네가 좋다면 난 다 좋아...",
      "내가 뭘 잘못했어?",
      "떠나지만 마...",
    ],
    goodPoints: ["헌신적", "상대를 최우선으로 생각"],
    warning: [
      "나쁜 관계도 못 끊음",
      "이용당할 수 있음",
      "자기 자신을 잃어버림",
    ],
    idealType: "나를 이끌어주는 강한 사람",
  },
};

// 신강/신약 궁합 데이터
const strengthCompatibility = [
  { pair: "중화 + 중화", rating: "⭐⭐⭐", desc: "완벽한 균형, 동등한 파트너" },
  { pair: "신강 + 신약", rating: "⭐⭐⭐", desc: "리드/서포트 역할 분담 명확" },
  {
    pair: "중화신강 + 중화신약",
    rating: "⭐⭐⭐",
    desc: "약간의 주도권 차이, 안정적",
  },
  { pair: "신강 + 신강", rating: "⚠️", desc: "주도권 싸움, 충돌 가능" },
  { pair: "신약 + 신약", rating: "⚠️", desc: "둘 다 눈치, 진전 없음" },
  { pair: "극신강 + 극신약", rating: "🚨", desc: "지배/종속 관계, 불건강" },
];

// 사주 원국 카드 (기획서 기반 - IntroCard 스타일)
function SajuCard({ data }: { data: SajuLoveRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const sajuData = data.sajuData;
  const dayMaster = data.sajuData?.dayMaster;
  const fiveElements = data.sajuData?.fiveElements;
  const loveFacts = data.sajuData?.loveFacts;
  const input = data.input;

  // 태어난 시간을 시진으로 변환
  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    // 다양한 형식 지원
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
      // HH:MM 형식도 지원
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
    if (timeMap[time]) return timeMap[time];
    // 시간대로 변환 시도
    const hour = parseInt(time.replace(":", "").slice(0, 2), 10);
    if (!isNaN(hour)) {
      if (hour >= 23 || hour < 1) return "자시";
      if (hour >= 1 && hour < 3) return "축시";
      if (hour >= 3 && hour < 5) return "인시";
      if (hour >= 5 && hour < 7) return "묘시";
      if (hour >= 7 && hour < 9) return "진시";
      if (hour >= 9 && hour < 11) return "사시";
      if (hour >= 11 && hour < 13) return "오시";
      if (hour >= 13 && hour < 15) return "미시";
      if (hour >= 15 && hour < 17) return "신시";
      if (hour >= 17 && hour < 19) return "유시";
      if (hour >= 19 && hour < 21) return "술시";
      if (hour >= 21 && hour < 23) return "해시";
    }
    return null;
  };

  const birthTime = formatTimeToSi(input?.time);

  // 일간 데이터
  const dmData = dayMaster?.char ? dayMasterLoveData[dayMaster.char] : null;

  // 신강/신약 레벨
  const strengthLevel =
    fiveElements?.strengthLevel || fiveElements?.strength || "중화";
  const strengthData =
    strengthLoveInterpretation[strengthLevel] ||
    strengthLoveInterpretation["중화신강"];

  // 오행 퍼센트
  const elementPercent =
    loveFacts?.fiveElementsHanjaPercent || fiveElements?.percent || {};

  return (
    <div className="report_card intro_card saju_card_simple">
      {/* 장면 1: 장 오프닝 */}
      <div className="intro_section intro_welcome compact">
        <p className="welcome_sub">사주 원국</p>
        <p className="welcome_main">{userName}님의 사주</p>
        <p className="welcome_text">
          {userName}님의 사주에는 어떤 글자들이 있을까요?
          <br />
          지금부터 하나씩 살펴볼게요.
        </p>
      </div>

      {/* 장면 2: 사주원국표 */}
      <div className="intro_section">
        {/* 기본 정보 */}
        <div className="saju_info_header">
          <span className="saju_info_name">{userName}님의 사주</span>
          <span className="saju_info_date">
            {input?.date}
            {birthTime ? ` | ${birthTime}` : ""}
          </span>
        </div>

        {/* 사주 원국표 */}
        <div className="saju_table_card">
          <table className="saju_full_table">
            <thead>
              <tr>
                <th></th>
                <th>時</th>
                <th>日</th>
                <th>月</th>
                <th>年</th>
              </tr>
            </thead>
            <tbody>
              {/* 십성 (천간) */}
              <tr className="row_sipsung_top">
                <td className="row_label">십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <span className="sipsung_text">
                        {p?.tenGodStem || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 천간 */}
              <tr className="row_cheongan">
                <td className="row_label">천간</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className="char_box">
                        <span
                          className="char_hanja"
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {p?.stem?.char || "—"}
                        </span>
                        <span className="char_korean">
                          {p?.stem?.korean || ""}
                          {p?.stem?.element
                            ? getElementKorean(p.stem.element, p.stem.yinYang)
                            : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* 지지 */}
              <tr className="row_jiji">
                <td className="row_label">지지</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className="char_box">
                        <span
                          className="char_hanja"
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {p?.branch?.char || "—"}
                        </span>
                        <span className="char_korean">
                          {p?.branch?.korean || ""}
                          {p?.branch?.element
                            ? getElementKorean(
                                p.branch.element,
                                p.branch.yinYang
                              )
                            : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (지지) */}
              <tr className="row_sipsung_bottom">
                <td className="row_label">십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <span className="sipsung_text">
                        {p?.tenGodBranchMain || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십이운성 */}
              <tr className="row_extra">
                <td className="row_label">십이운성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  const twelveStage =
                    (p as unknown as { twelveStage?: string })?.twelveStage ||
                    p?.twelveUnsung;
                  const displayValue =
                    typeof twelveStage === "string"
                      ? twelveStage
                      : (twelveStage as unknown as { display?: string })
                          ?.display || "—";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 12신살 */}
              <tr className="row_extra">
                <td className="row_label">12신살</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  const twelveSinsal = p?.twelveSinsal;
                  const displayValue =
                    typeof twelveSinsal === "string"
                      ? twelveSinsal
                      : (twelveSinsal as unknown as { display?: string })
                          ?.display || "—";
                  // 도화살 강조
                  const isSinsalHighlight = displayValue === "도화살";
                  return (
                    <td
                      key={key}
                      className={`${isDay ? "highlight" : ""} ${
                        isSinsalHighlight ? "cell_sinsal_highlight" : ""
                      }`}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 신살 */}
              <tr className="row_extra">
                <td className="row_label">신살</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const isDay = key === "day";
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  // 귀인 제외한 신살만 표시
                  const allSinsal = [...stemSinsal, ...branchSinsal].filter(
                    (s) => !s.includes("귀인")
                  );
                  // 특별 강조할 신살
                  const highlightSinsal = ["홍염살", "화개살", "도화살"];
                  return (
                    <td
                      key={key}
                      className={`cell_sinsal ${isDay ? "highlight" : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className="sinsal_vertical">
                          {allSinsal.map((s, i) => (
                            <span
                              key={i}
                              className={
                                highlightSinsal.some((hs) => s.includes(hs))
                                  ? "sinsal_highlight"
                                  : ""
                              }
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
              {/* 귀인 */}
              <tr className="row_extra">
                <td className="row_label">귀인</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const isDay = key === "day";
                  const byPillar = sajuData?.sinsal?._byPillar;
                  const stemSinsal = byPillar?.[key]?.stem || [];
                  const branchSinsal = byPillar?.[key]?.branch || [];
                  const allSinsal = [...stemSinsal, ...branchSinsal].filter(
                    (s) => s.includes("귀인")
                  );
                  return (
                    <td
                      key={key}
                      className={`cell_gilsung ${isDay ? "highlight" : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className="gilsung_vertical">
                          {allSinsal.map((s, i) => (
                            <span key={i}>{s}</span>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 사주원국 설명 */}
        <div className="intro_section_content" style={{ marginTop: "16px" }}>
          <p style={{ textAlign: "center" }}>
            그럼, <strong>사주원국</strong>이란 게 뭔지 간단히 짚고 넘어갈게요.
          </p>
        </div>

        <div className="saju_explain_card">
          <p className="saju_explain_title">사주원국이란?</p>
          <p className="saju_explain_text">
            {userName}님의 생년월일시에 해당하는 하늘과 땅의 글자를 십성,
            십이운성, 살 등과 함께 적은 표예요.
          </p>
        </div>
      </div>

      {/* 장면 3: 천간/지지 분리 설명 */}
      <div className="intro_section">
        <div className="intro_section_content">
          <p>
            생년월일시를 가지고 역학달력에 따라 <strong>사주(四柱)</strong>를
            적어요.
          </p>
          <p>
            각각의 기둥을 위 아래로 나누면, 하늘의 기운을 담은{" "}
            <strong>천간</strong>과 땅의 기운을 담은 <strong>지지</strong>가
            되는거죠.
          </p>
        </div>

        <div className="saju_split_table">
          <div className="split_row">
            <span className="split_label">
              천간
              <br />
              (天干)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = pillars[key];
              return (
                <div key={key} className="split_cell">
                  <span
                    className="split_hanja"
                    style={{ color: getColor(p?.stem?.element) }}
                  >
                    {p?.stem?.char || "—"}
                  </span>
                  <span className="split_korean">{p?.stem?.korean || ""}</span>
                </div>
              );
            })}
          </div>
          <div className="split_row">
            <span className="split_label">
              지지
              <br />
              (地支)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = pillars[key];
              return (
                <div key={key} className="split_cell">
                  <span
                    className="split_hanja"
                    style={{ color: getColor(p?.branch?.element) }}
                  >
                    {p?.branch?.char || "—"}
                  </span>
                  <span className="split_korean">
                    {p?.branch?.korean || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 각 요소 연애 의미 설명 */}
        <div className="saju_elements_meaning">
          <p className="elements_meaning_title">
            각 요소가 연애에서 의미하는 것
          </p>
          <div className="element_meaning_list">
            <div className="element_meaning_item">
              <strong>천간(天干)</strong>
              <p>
                겉으로 드러나는 연애 스타일, 표현 방식. 상대에게 보여지는 나의
                모습이에요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>지지(地支)</strong>
              <p>
                내면의 욕구와 본능. 무의식적으로 끌리는 이상형, 진짜 원하는
                연애가 담겨 있어요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>십성(十星)</strong>
              <p>
                나와 상대의 관계 패턴. 어떤 사람에게 끌리고, 어떤 연애를 하는지
                알 수 있어요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>십이운성(十二運星)</strong>
              <p>
                연애 에너지의 상태. 적극적인지 소극적인지, 연애운의 강약을
                나타내요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>12신살</strong>
              <p>
                연애에 영향을 주는 특별한 기운. 도화살은 이성에게 인기, 매력을
                뜻해요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>신살(神殺)</strong>
              <p>
                특별한 사건이나 기운을 나타내요. 홍염살, 화개살 등 연애에 영향을
                주는 살이 있어요.
              </p>
            </div>
            <div className="element_meaning_item">
              <strong>귀인(貴人)</strong>
              <p>
                나를 도와주는 좋은 기운. 연애에서 좋은 인연을 만나게 해주는
                역할을 해요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 연애 신살 설명 */}
      <div className="intro_section">
        {/* 색동낭자 대화 - 연애 신살 전 */}
        <div className="nangja_comment">
          <p className="nangja_text">
            잠깐, 여기 중요해요. 연애할 때 꼭 봐야 할 신살이에요.
          </p>
        </div>

        {/* 내가 가진 연애 신살 표시 */}
        {(() => {
          const allSinsal: string[] = [];
          (["hour", "day", "month", "year"] as const).forEach((key) => {
            const byPillar = sajuData?.sinsal?._byPillar;
            const stemSinsal = byPillar?.[key]?.stem || [];
            const branchSinsal = byPillar?.[key]?.branch || [];
            allSinsal.push(...stemSinsal, ...branchSinsal);
            // 12신살에서 도화살 체크
            const twelveSinsal = pillars[key]?.twelveSinsal;
            if (typeof twelveSinsal === "string" && twelveSinsal === "도화살") {
              allSinsal.push("도화살");
            }
          });
          const hasDohwa = allSinsal.some((s) => s.includes("도화"));
          const hasHongyeom = allSinsal.some((s) => s.includes("홍염"));
          const hasHwagae = allSinsal.some((s) => s.includes("화개"));
          const hasAny = hasDohwa || hasHongyeom || hasHwagae;

          return (
            <div className="my_love_sinsal">
              <p className="my_sinsal_label">{userName}님이 가진 연애 신살</p>
              <div className="my_sinsal_tags">
                <span
                  className={`sinsal_tag dohwa ${hasDohwa ? "active" : ""}`}
                >
                  도화살 {hasDohwa ? "✓" : "✗"}
                </span>
                <span
                  className={`sinsal_tag hongyeom ${
                    hasHongyeom ? "active" : ""
                  }`}
                >
                  홍염살 {hasHongyeom ? "✓" : "✗"}
                </span>
                <span
                  className={`sinsal_tag hwagae ${hasHwagae ? "active" : ""}`}
                >
                  화개살 {hasHwagae ? "✓" : "✗"}
                </span>
              </div>
              {!hasAny && (
                <p className="no_sinsal_text">
                  연애 신살이 없어도 괜찮아요. 다른 요소들이 연애 스타일을
                  만들어줘요.
                </p>
              )}
            </div>
          );
        })()}

        <div className="love_sinsal_cards">
          <div className="love_sinsal_card">
            <div className="sinsal_card_header">
              <strong>도화살(桃花殺)</strong>
            </div>
            <p className="sinsal_meaning">
              복숭아꽃 살. 이성을 끌어당기는 매력, 분위기, 인기를 뜻해요.
            </p>
            <div className="sinsal_love_effect">
              <span className="effect_good">
                이성에게 인기 많음, 연애 기회 많음
              </span>
              <span className="effect_bad">
                유혹에 약함, 복잡한 이성관계 주의
              </span>
            </div>
          </div>

          <div className="love_sinsal_card">
            <div className="sinsal_card_header">
              <strong>홍염살(紅艶殺)</strong>
            </div>
            <p className="sinsal_meaning">
              붉은 요염함. 도화살보다 더 강렬한 성적 매력, 관능미예요.
            </p>
            <div className="sinsal_love_effect">
              <span className="effect_good">
                강렬한 첫인상, 잊히지 않는 매력
              </span>
              <span className="effect_bad">
                애정 문제 복잡, 집착/질투 유발 가능
              </span>
            </div>
          </div>

          <div className="love_sinsal_card">
            <div className="sinsal_card_header">
              <strong>화개살(華蓋殺)</strong>
            </div>
            <p className="sinsal_meaning">
              꽃 덮개. 예술성, 감수성, 혼자만의 세계를 뜻해요.
            </p>
            <div className="sinsal_love_effect">
              <span className="effect_good">
                깊이 있는 사랑, 정신적 교감 중시
              </span>
              <span className="effect_bad">외로움을 잘 탐, 이상이 높음</span>
            </div>
          </div>
        </div>
      </div>

      {/* 장면 5: 일간 강조 */}
      <div className="intro_section">
        {/* 색동낭자 대화 - 일간 설명 전 */}
        <div className="nangja_comment">
          <p className="nangja_text">
            {userName}님을 나타내는 글자, 일간이에요. 여기가 핵심이에요.
          </p>
        </div>

        <h3 className="intro_section_title">일간(日干)</h3>
        <p className="intro_section_subtitle">나를 대표하는 글자</p>

        <div className="ilgan_simple_display">
          <span
            className="ilgan_char"
            style={{ color: getColor(dayMaster?.element) }}
          >
            {dayMaster?.char}
          </span>
          <span className="ilgan_label">{dayMaster?.title}</span>
        </div>

        <div className="intro_section_content">
          <p>
            이 글자가 바로 <strong>나 자신</strong>을 의미하기 때문에, 사주를
            해석할 때 가장 중심이 되는 부분이에요.
          </p>

          {dmData && (
            <div className="ilgan_love_box">
              <p className="ilgan_headline">{dmData.headline}</p>
              <p className="ilgan_summary">{dmData.summary}</p>
              <div className="ilgan_keywords">
                {dmData.keywords.map((kw, i) => (
                  <span key={i} className="ilgan_keyword">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 장면 7: 각 기둥별 관계 해석 */}
      <div className="intro_section">
        {/* 색동낭자 대화 - 기둥별 관계 전 */}
        <div className="nangja_comment">
          <p className="nangja_text">
            각 기둥마다 다른 의미가 있어요. 어떤 관계를 뜻하는지 볼까요?
          </p>
        </div>

        <div className="pillar_timing_cards">
          <div className="timing_card">
            {/* 미니 사주표 - 년주 강조 */}
            <div className="mini_saju_table">
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "year";
                return (
                  <div
                    key={key}
                    className={`mini_pillar ${
                      isHighlight ? "highlight" : "dimmed"
                    }`}
                  >
                    <span
                      className="mini_stem"
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className="mini_branch"
                      style={{
                        color: isHighlight
                          ? getColor(p?.branch?.element)
                          : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="timing_header">
              <span className="timing_pillar">년주(年柱)</span>
              <span className="timing_period">뿌리 · 조상, 부모</span>
            </div>
            <p className="timing_desc">
              나의 뿌리, 조상과 부모님, 그리고 사회적 배경을 나타내요.
            </p>
            <p className="timing_love">
              연애에서는: 가정환경이 연애관에 미친 영향
            </p>
          </div>

          <div className="timing_card">
            {/* 미니 사주표 - 월주 강조 */}
            <div className="mini_saju_table">
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "month";
                return (
                  <div
                    key={key}
                    className={`mini_pillar ${
                      isHighlight ? "highlight" : "dimmed"
                    }`}
                  >
                    <span
                      className="mini_stem"
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className="mini_branch"
                      style={{
                        color: isHighlight
                          ? getColor(p?.branch?.element)
                          : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="timing_header">
              <span className="timing_pillar">월주(月柱)</span>
              <span className="timing_period">줄기 · 형제, 사회</span>
            </div>
            <p className="timing_desc">
              나의 줄기, 부모님과 형제, 그리고 사회생활을 나타내요.
            </p>
            <p className="timing_love">
              연애에서는: 사회에서의 연애 (직장연애, 소개팅 등)
            </p>
          </div>

          <div className="timing_card highlight">
            {/* 미니 사주표 - 일주 강조 */}
            <div className="mini_saju_table">
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "day";
                return (
                  <div
                    key={key}
                    className={`mini_pillar ${
                      isHighlight ? "highlight" : "dimmed"
                    }`}
                  >
                    <span
                      className="mini_stem"
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className="mini_branch"
                      style={{
                        color: isHighlight
                          ? getColor(p?.branch?.element)
                          : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="timing_header">
              <span className="timing_pillar">일주(日柱)</span>
              <span className="timing_period">꽃 · 나, 배우자</span>
            </div>
            <p className="timing_desc">
              나의 꽃, 나 자신과 배우자를 나타내는 가장 중요한 자리예요.
            </p>
            <p className="timing_love">
              연애에서는: 가장 중요! 나의 연애 본질, 배우자 자리. 무의식적으로
              끌리는 이상형이 여기에!
            </p>
          </div>

          <div className="timing_card">
            {/* 미니 사주표 - 시주 강조 */}
            <div className="mini_saju_table">
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "hour";
                return (
                  <div
                    key={key}
                    className={`mini_pillar ${
                      isHighlight ? "highlight" : "dimmed"
                    }`}
                  >
                    <span
                      className="mini_stem"
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className="mini_branch"
                      style={{
                        color: isHighlight
                          ? getColor(p?.branch?.element)
                          : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="timing_header">
              <span className="timing_pillar">시주(時柱)</span>
              <span className="timing_period">열매 · 자녀, 결실</span>
            </div>
            <p className="timing_desc">
              나의 열매, 자녀와 말년의 결실을 나타내요.
            </p>
            <p className="timing_love">
              연애에서는: 연애의 결과, 가정을 꾸린 후의 모습
            </p>
          </div>
        </div>
      </div>

      {/* 장면 8: 오행 */}
      <div className="intro_section">
        {/* 색동낭자 대화 - 오행 설명 전 */}
        <div className="nangja_comment">
          <p className="nangja_text">
            오행은 궁합 볼 때 중요해요. {userName}님은 어떤 기운이 많을까요?
          </p>
        </div>

        <h3 className="intro_section_title">{userName}님의 오행</h3>

        {/* 오행비율 막대그래프 */}
        {Object.keys(elementPercent).length > 0 && (
          <div className="ohang_chart_card">
            <p className="ohang_chart_title">나의 오행 비율</p>
            {[
              { key: "木", label: "목(木)", color: "#2aa86c" },
              { key: "火", label: "화(火)", color: "#ff6a6a" },
              { key: "土", label: "토(土)", color: "#caa46a" },
              { key: "金", label: "금(金)", color: "#a0a0a0" },
              { key: "水", label: "수(水)", color: "#4a90d9" },
            ].map(({ key, label, color }) => {
              const pct = elementPercent[key] || 0;
              const status =
                pct >= 30
                  ? "과다"
                  : pct >= 10
                  ? "적정"
                  : pct > 0
                  ? "부족"
                  : "결핍";
              return (
                <div key={key} className="ohang_bar_row">
                  <span className="ohang_label" style={{ color }}>
                    {label}
                  </span>
                  <div className="ohang_bar_track">
                    <div
                      className="ohang_bar_fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="ohang_pct">{pct.toFixed(1)}%</span>
                  <span className={`ohang_status ${status}`}>{status}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 오행별 기본 특징 */}
        <div className="ohang_traits_section">
          <p className="ohang_section_title">오행별 연애 특징</p>
          <div className="ohang_traits_list">
            {[
              {
                key: "木",
                label: "목",
                color: "#2aa86c",
                keyword: "성장 · 자유 · 솔직",
                desc: "함께 성장하는 사랑을 원해요. 솔직하고 직진형이지만 구속을 싫어해요.",
              },
              {
                key: "火",
                label: "화",
                color: "#ff6a6a",
                keyword: "열정 · 표현 · 로맨틱",
                desc: "뜨겁고 열정적인 사랑. 확실하게 표현하고 이벤트를 좋아해요.",
              },
              {
                key: "土",
                label: "토",
                color: "#caa46a",
                keyword: "안정 · 포용 · 믿음",
                desc: "느리지만 확실한 사랑. 한번 마음 주면 변치 않고 묵묵히 지켜요.",
              },
              {
                key: "金",
                label: "금",
                color: "#a0a0a0",
                keyword: "원칙 · 깔끔 · 의리",
                desc: "명확하고 깔끔한 관계. 쿨하고 약속을 중시해요.",
              },
              {
                key: "水",
                label: "수",
                color: "#4a90d9",
                keyword: "감성 · 공감 · 배려",
                desc: "감성적이고 깊은 사랑. 상대에게 맞춰주고 공감을 잘해요.",
              },
            ].map(({ key, label, color, keyword, desc }) => (
              <div key={key} className="ohang_trait_item">
                <span
                  className="ohang_trait_label"
                  style={{ backgroundColor: color }}
                >
                  {label}
                </span>
                <div className="ohang_trait_content">
                  <span className="ohang_trait_keyword">{keyword}</span>
                  <p className="ohang_trait_desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 오행 궁합 - 상생/상극 */}
        <div className="ohang_compatibility_section">
          <p className="ohang_section_title">오행 궁합</p>
          <div className="ohang_compat_cards">
            <div className="ohang_compat_card good">
              <p className="compat_card_title">잘 맞는 궁합 (상생)</p>
              <div className="compat_list">
                <div className="compat_item">
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className="compat_arrow">→</span>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className="compat_desc">지지하고 키워주는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className="compat_arrow">→</span>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className="compat_desc">열정에 불을 지펴주는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className="compat_arrow">→</span>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className="compat_desc">따뜻하게 안정시키는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className="compat_arrow">→</span>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className="compat_desc">든든히 받쳐주는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className="compat_arrow">→</span>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className="compat_desc">방향을 잡아주는 관계</span>
                </div>
              </div>
            </div>
            <div className="ohang_compat_card bad">
              <p className="compat_card_title">주의할 궁합 (상극)</p>
              <div className="compat_list">
                <div className="compat_item">
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className="compat_arrow bad">⚡</span>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className="compat_desc">비판하고 깎아내리는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className="compat_arrow bad">⚡</span>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className="compat_desc">안정을 흔드는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className="compat_arrow bad">⚡</span>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className="compat_desc">감정 흐름을 막는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className="compat_arrow bad">⚡</span>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className="compat_desc">열정을 꺼뜨리는 관계</span>
                </div>
                <div className="compat_item">
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className="compat_arrow bad">⚡</span>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className="compat_desc">원칙을 무너뜨리는 관계</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 나의 오행 분석 - 과다/부족 해석 */}
        <div className="ohang_analysis_section">
          <p className="ohang_section_title">{userName}님의 오행 분석</p>
          {[
            {
              key: "木",
              label: "목(木)",
              color: "#2aa86c",
              overTitle: "자유로운 연애 스타일",
              overDesc:
                "새로운 시작을 좋아하고 발전하는 관계를 추구해요. 구속을 싫어하고 상대에게도 성장을 요구하는 편이에요.",
              overAdvice:
                "한 곳에 집중하는 연습이 필요해요. 원칙적이고 깔끔한 금(金) 성향의 사람을 만나면 균형이 맞아요.",
              lackTitle: "소극적인 연애 스타일",
              lackDesc:
                "새로운 시작이 두렵고 고백을 잘 못해요. 변화보다 현재 상태를 유지하려 해요.",
              lackAdvice:
                "용기를 내서 먼저 다가가보세요. 적극적이고 밝은 목(木) 성향의 사람에게 자극받으면 성장할 수 있어요.",
            },
            {
              key: "火",
              label: "화(火)",
              color: "#ff6a6a",
              overTitle: "열정적인 연애 스타일",
              overDesc:
                "사랑하면 올인하고 확실하게 표현해요. 다만 감정 기복이 있고 질투가 강할 수 있어요.",
              overAdvice:
                "감정 조절이 필요해요. 차분하고 감성적인 수(水) 성향의 사람이 열기를 식혀줄 수 있어요.",
              lackTitle: "표현이 서툰 연애 스타일",
              lackDesc:
                "열정이 부족하고 무덤덤해 보여요. 상대가 내 마음을 확인하고 싶어할 수 있어요.",
              lackAdvice:
                "작은 것부터 표현해보세요. 밝고 열정적인 화(火) 성향의 사람을 만나면 불이 붙을 수 있어요.",
            },
            {
              key: "土",
              label: "토(土)",
              color: "#caa46a",
              overTitle: "안정 추구 연애 스타일",
              overDesc:
                "한번 마음 주면 변치 않고 묵묵히 챙겨줘요. 하지만 고집이 세고 변화를 싫어할 수 있어요.",
              overAdvice:
                "유연함이 필요해요. 자유롭고 활발한 목(木) 성향의 사람이 답답함을 뚫어줄 수 있어요.",
              lackTitle: "불안정한 연애 스타일",
              lackDesc:
                "중심이 없고 한 사람에게 정착하기 어려워요. 약속을 지키는 것도 힘들 수 있어요.",
              lackAdvice:
                "책임감을 키워보세요. 믿음직하고 든든한 토(土) 성향의 사람이 중심을 잡아줄 수 있어요.",
            },
            {
              key: "金",
              label: "금(金)",
              color: "#a0a0a0",
              overTitle: "원칙적인 연애 스타일",
              overDesc:
                "명확하고 깔끔한 관계를 원해요. 약속을 잘 지키지만 차갑고 비판적으로 보일 수 있어요.",
              overAdvice:
                "따뜻함이 필요해요. 열정적이고 따뜻한 화(火) 성향의 사람이 얼음을 녹여줄 수 있어요.",
              lackTitle: "우유부단한 연애 스타일",
              lackDesc:
                "결단력이 부족하고 관계 정리를 못해요. 이 사람 저 사람 눈치를 보게 돼요.",
              lackAdvice:
                "명확하게 표현하는 연습이 필요해요. 결단력 있는 금(金) 성향의 사람이 정리를 도와줄 수 있어요.",
            },
            {
              key: "水",
              label: "수(水)",
              color: "#4a90d9",
              overTitle: "감성적인 연애 스타일",
              overDesc:
                "상대 감정에 민감하고 깊이 공감해요. 하지만 너무 맞춰주다 자기를 잃을 수 있어요.",
              overAdvice:
                "중심을 잡는 게 필요해요. 든든하고 안정적인 토(土) 성향의 사람이 중심을 잡아줄 수 있어요.",
              lackTitle: "공감이 부족한 연애 스타일",
              lackDesc:
                "상대 감정을 잘 못 읽고 눈치가 부족해요. 정서적 교감이 어려울 수 있어요.",
              lackAdvice:
                "상대 감정을 살피는 연습이 필요해요. 감성적이고 섬세한 수(水) 성향의 사람에게 배울 수 있어요.",
            },
          ].map(
            ({
              key,
              label,
              color,
              overTitle,
              overDesc,
              overAdvice,
              lackTitle,
              lackDesc,
              lackAdvice,
            }) => {
              const pct = elementPercent[key] || 0;
              const status =
                pct >= 30
                  ? "과다"
                  : pct >= 10
                  ? "적정"
                  : pct > 0
                  ? "부족"
                  : "결핍";
              if (status === "적정") return null;
              const isOver = status === "과다";
              return (
                <div key={key} className="ohang_analysis_card">
                  <div className="ohang_analysis_header">
                    <span className="ohang_element" style={{ color }}>
                      {label}
                    </span>
                    <span className={`ohang_status_badge ${status}`}>
                      {status}
                    </span>
                  </div>
                  <p className="ohang_analysis_title">
                    {isOver ? overTitle : lackTitle}
                  </p>
                  <p className="ohang_analysis_desc">
                    {isOver ? overDesc : lackDesc}
                  </p>
                  <p className="ohang_analysis_advice">
                    {isOver ? overAdvice : lackAdvice}
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* 장면 9: 신강신약 */}
      <div className="intro_section">
        {/* 색동낭자 대화 - 신강신약 전 */}
        <div className="nangja_comment">
          <p className="nangja_text">
            {userName}님의 에너지가 강한지 약한지도 연애에 영향을 줘요.
          </p>
        </div>

        <h3 className="intro_section_title">신강신약</h3>
        <p className="intro_section_subtitle">연애 주도권의 척도</p>

        <div className="intro_section_content">
          <p>
            신강/신약은 일간의 힘이 얼마나 강한지를 나타내요. 연애에서는{" "}
            <strong>주도권</strong>과 관련이 깊어요.
          </p>
        </div>

        <div className="strength_gauge_card">
          <div className="gauge_labels">
            {["극신약", "신약", "중화신약", "중화신강", "신강", "극신강"].map(
              (level) => (
                <span
                  key={level}
                  className={level === strengthLevel ? "active" : ""}
                >
                  {level}
                </span>
              )
            )}
          </div>
          <div className="gauge_track">
            {["극신약", "신약", "중화신약", "중화신강", "신강", "극신강"].map(
              (level) => (
                <div
                  key={level}
                  className={`gauge_dot ${
                    level === strengthLevel ? "active" : ""
                  }`}
                />
              )
            )}
          </div>
          <p className="strength_result_text">
            일간{" "}
            <strong style={{ color: getColor(dayMaster?.element) }}>
              {dayMaster?.char}
            </strong>
            , <strong>{strengthLevel}</strong>
          </p>
        </div>

        {/* 상세 해석 카드 */}
        <div className="strength_detail_card">
          <p className="strength_detail_title">{strengthData.title}</p>
          <p className="strength_detail_ratio">{strengthData.mainRatio}</p>

          {/* 표 형태로 정리 */}
          <table className="strength_detail_table">
            <tbody>
              <tr>
                <th>연애 특징</th>
                <td>{strengthData.traits.join(", ")}</td>
              </tr>
              <tr>
                <th>자주 하는 말</th>
                <td>
                  {strengthData.pattern.map((p, i) => (
                    <span key={i} className="pattern_quote">
                      {p}
                    </span>
                  ))}
                </td>
              </tr>
              {strengthData.goodPoints.length > 0 && (
                <tr className="good_row">
                  <th>장점</th>
                  <td>{strengthData.goodPoints.join(", ")}</td>
                </tr>
              )}
              {strengthData.warning.length > 0 && (
                <tr className="warning_row">
                  <th>주의할 점</th>
                  <td>{strengthData.warning.join(", ")}</td>
                </tr>
              )}
              <tr className="ideal_row">
                <th>잘 맞는 상대</th>
                <td>{strengthData.idealType}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 궁합 참고 */}
        <div className="strength_compat_section">
          <p className="strength_compat_title">신강/신약 궁합 참고</p>
          <div className="strength_compat_list">
            {strengthCompatibility.map((item, i) => (
              <div key={i} className="strength_compat_item">
                <span className="compat_pair">{item.pair}</span>
                <span className="compat_rating">{item.rating}</span>
                <span className="compat_desc">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="strength_note">
          <p>
            이건 신강/신약만 본 대략적인 경향이에요. 실제 연애 스타일은 사주팔자
            전체와 대운, 세운까지 종합해서 봐야 정확해요.
          </p>
        </div>
      </div>

      {/* 장면 10: 마무리 전환 */}
      <div className="intro_section saju_outro_section">
        <div className="saju_outro_box">
          <p className="saju_outro_title">
            여기까지가 {userName}님의 사주 원국이에요
          </p>
          <p className="saju_outro_text">
            타고난 글자들, 오행의 균형, 신강/신약까지...
            <br />
            이제 {userName}님이 어떤 사람인지 조금은 보이시나요?
          </p>
          <p className="saju_outro_text">
            다음부터는 이 사주를 바탕으로
            <br />
            <strong>{userName}님의 연애 이야기</strong>를 본격적으로
            풀어드릴게요.
          </p>
          <div className="saju_outro_chapters">
            <span>1장 나의 매력</span>
            <span>2장 연애 운세</span>
            <span>3장 운명의 상대</span>
            <span>4장 가짜 인연</span>
            <span>5장 19금</span>
            <span>6장 고민 답변</span>
          </div>
          <p className="saju_outro_cta">
            준비되셨으면, 다음으로 넘어가 주세요!
          </p>
        </div>
      </div>
    </div>
  );
}

// 분석 대기 카드
function WaitingCard({ userName }: { userName: string }) {
  return (
    <div className="report_card waiting_card">
      <div className="waiting_content">
        <div className="waiting_spinner"></div>
        <h2 className="waiting_title">보고서 작성 중...</h2>
        <p className="waiting_text">
          색동낭자가 {userName}님의
          <br />
          연애 사주를 열심히 분석하고 있어요.
        </p>
        <p className="waiting_subtext">
          조금만 기다려주세요!
          <br />
          완료되면 바로 알려드릴게요.
        </p>
        <div className="waiting_dots">
          <span></span>
          <span></span>
          <span></span>
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
          미래가 궁금해서, 마음속 고민이 쉽게 풀리지 않아서, 혹은 인생의 중요한
          갈림길 앞에서 방향을 찾고 싶어서... 이런 여러 가지 이유로 양반家에
          오셨겠죠?
        </p>
        <p className="welcome_text">
          그렇다면 정말 잘 찾아오셨어요. {userName}님의 사주 속에는 이미 수많은
          힌트와 가능성들이 담겨 있어요.
        </p>
        <p className="welcome_text">
          제가 사주라는 지도를 함께 펼치고, {userName}님이 걸어갈 인생의 길을
          환하게 밝혀드릴게요.
        </p>
      </div>

      {/* 장면 2: 사주란? */}
      <div className="intro_section">
        <h3 className="intro_section_title">들어가며</h3>
        <p className="intro_section_subtitle">사주란 무엇인가요?</p>

        <div className="intro_section_content">
          <p className="intro_quote">
            사주(四柱)는 네 개의 기둥이라는 뜻이에요.
          </p>
          <p>
            사주는 사람이 태어난 <strong>연(年)</strong>,{" "}
            <strong>월(月)</strong>, <strong>일(日)</strong>,{" "}
            <strong>시(時)</strong> 이 네 가지 기둥으로 이루어진 팔자예요.
          </p>
          <p>
            이 네 가지 요소를 통해 한 사람이 지닌 성격, 타고난 기질, 흐르는 운의
            방향까지 자세히 살펴볼 수 있답니다.
          </p>
          <p className="intro_note">
            사주는 단순히 미래를 맞히는 점술이 아니라,{" "}
            <strong>
              나를 이해하고, 더 나은 선택을 할 수 있게 도와주는 삶의 지도
            </strong>
            라고 보시면 좋아요.
          </p>
          <p>나도 몰랐던 내 안의 가능성과 흐름을 발견하게 되니까요.</p>
        </div>
      </div>

      {/* 장면 3: 사주팔자의 구조 */}
      <div className="intro_section">
        <h3 className="intro_section_title">사주팔자의 구조</h3>
        <p className="intro_section_subtitle">왜 팔자라고 부를까요?</p>

        <div className="intro_section_content">
          <p>
            사주는 흔히 <strong>사주팔자(四柱八字)</strong>라고도 불리는데요,
            여기서 팔자는 태어난 순간의 하늘과 땅의 기운이 담긴 여덟 글자를
            말해요.
          </p>
          <p>
            각 기둥은 두 글자로 이루어져 있어요.
            <br />
            위쪽 글자는 <strong>천간(天干)</strong> — 하늘의 기운
            <br />
            아래 글자는 <strong>지지(地支)</strong> — 땅의 기운
          </p>
          <p>
            4개의 기둥 × 2글자 = <strong>8글자</strong>, 그래서 사주팔자라고
            불러요.
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
            우리가 이 세상에 태어난 그 순간, 눈에 보이지 않는 운명의 설계도가
            이미 그려지는 거예요.
          </p>
          <p className="intro_note">
            그래서 사주는 예언이 아니라, 나의 성격과 기질, 그리고 앞으로 맞이할
            인생의 흐름을 미리 살펴볼 수 있는 <strong>소중한 지도</strong>
            랍니다.
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
            <span className="wood">
              甲 乙<br />
              <span className="char_kor">갑 을</span>
            </span>
            <span className="fire">
              丙 丁<br />
              <span className="char_kor">병 정</span>
            </span>
            <span className="earth">
              戊 己<br />
              <span className="char_kor">무 기</span>
            </span>
            <span className="metal">
              庚 辛<br />
              <span className="char_kor">경 신</span>
            </span>
            <span className="water">
              壬 癸<br />
              <span className="char_kor">임 계</span>
            </span>
          </div>
          <div className="cheongan_row meaning">
            <span>
              큰나무
              <br />
              풀·꽃
            </span>
            <span>
              태양
              <br />
              촛불
            </span>
            <span>
              산<br />
              논밭
            </span>
            <span>
              바위
              <br />
              보석
            </span>
            <span>
              바다
              <br />
              시냇물
            </span>
          </div>
        </div>

        <div className="intro_section_content">
          <p>
            천간은 <strong>겉으로 드러나는 성격</strong>, 세상에 보여주는 나의
            모습을 나타내요.
          </p>
          <p className="intro_note">
            예를 들어 <strong>丙(병)</strong>은 태양처럼 밝고 열정적인 사람,{" "}
            <strong>癸(계)</strong>는 시냇물처럼 조용하고 감성적인 사람이에요.
          </p>
        </div>
      </div>

      {/* 장면 5: 지지(地支) */}
      <div className="intro_section">
        <h3 className="intro_section_title">지지(地支)</h3>
        <p className="intro_section_subtitle">땅에서 올라오는 열두 가지 기운</p>

        <div className="intro_section_content">
          <p>
            지지는 땅의 기운을 뜻하는 열두 가지 글자로, 하늘의 기운을 받아들여
            더욱 구체적인 모습을 이루어 가죠.
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
            이 천간과 지지가 서로 만나 하나의 조화를 이루면, 하늘과 땅이
            어우러지듯 우리의 생년월일시가 정해지게 돼요.
          </p>
          <p className="intro_note">
            그리고 그 순간의 기운이 우리의 성향과 삶에 깊이 스며들어, 그 사람의
            성격부터 앞으로 펼쳐질 운명의 중요한 열쇠가 된답니다!
          </p>
        </div>
      </div>

      {/* 장면 6: 오행 */}
      <div className="intro_section">
        <h3 className="intro_section_title">다섯 가지 기운, 오행</h3>
        <p className="intro_section_subtitle">천간과 지지를 이해하는 열쇠</p>

        <div className="intro_section_content">
          <p>
            그런데 천간과 지지, 이렇게 많은 글자를 어떻게 이해하냐고요? 걱정
            마세요. 모든 글자는 다섯 가지 기운으로 나눌 수 있어요. 바로{" "}
            <strong>오행(五行)</strong>이에요.
          </p>
        </div>

        <div className="intro_ohang_circle">
          <div className="ohang_circle_wrapper">
            <div className="ohang_node fire top">
              <span className="ohang_label">화</span>
              <span className="ohang_desc">열정</span>
            </div>
            <div className="ohang_node wood left-top">
              <span className="ohang_label">목</span>
              <span className="ohang_desc">성장</span>
            </div>
            <div className="ohang_node earth right-top">
              <span className="ohang_label">토</span>
              <span className="ohang_desc">안정</span>
            </div>
            <div className="ohang_node water left-bottom">
              <span className="ohang_label">수</span>
              <span className="ohang_desc">지혜</span>
            </div>
            <div className="ohang_node metal right-bottom">
              <span className="ohang_label">금</span>
              <span className="ohang_desc">원칙</span>
            </div>
          </div>
          <div className="ohang_relations">
            <p className="ohang_relation saeng">
              <span className="relation_label">생(生)</span>목 → 화 → 토 → 금 →
              수 → 목
            </p>
            <p className="ohang_relation geuk">
              <span className="relation_label">극(剋)</span>목 → 토 → 수 → 화 →
              금 → 목
            </p>
          </div>
        </div>

        <div className="intro_section_content">
          <p className="intro_note">
            이 다섯 가지 기운의 조합과 균형이 바로 {userName}님의 성격과 연애
            스타일을 만들어요.
          </p>
        </div>
      </div>

      {/* 장면 7: 일주 */}
      <div className="intro_section">
        <h3 className="intro_section_title">연애의 열쇠, 일주</h3>
        <p className="intro_section_subtitle">사주에서 가장 중요한 기둥</p>

        <div className="intro_section_content">
          <p>
            자, 이제 중요한 이야기를 해볼게요. 사주의 네 기둥 중에서 연애를 볼
            때 가장 중요한 기둥이 있어요. 바로 <strong>일주(日柱)</strong>예요.
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
          <p>일주는 태어난 '날'의 기둥인데요, 사주에서 '나 자신'을 의미해요.</p>
          <p>
            특히 일주의 아랫글자, <strong>일지(日支)</strong>는 '배우자
            자리'라고도 불러요.
          </p>
          <p className="intro_note">
            내 마음 깊은 곳에서 원하는 이상형, 무의식적으로 끌리는 사람의 유형,
            연애할 때 나도 모르게 나오는 습관... 이런 것들이 모두 일주에 담겨
            있답니다.
          </p>
        </div>
      </div>

      {/* 장면 8: 사주를 알면 무엇이 좋을까? */}
      <div className="intro_section">
        <h3 className="intro_section_title">사주를 알면</h3>
        <p className="intro_section_subtitle">무엇이 좋을까요?</p>

        <div className="intro_section_content">
          <p>
            사주를 알면 내가 어떤 사람인지, 진짜 내 모습이 무엇인지 더 깊이
            이해할 수 있어요.
          </p>
          <p>
            성격이나 재능, 적성은 물론이고, 인간관계에서의 특징이나 연애
            스타일까지도 구체적으로 파악할 수 있답니다.
          </p>
          <p>
            또 언제 좋은 기회가 들어오고, 언제 조심해야 하는지도 미리 살펴볼 수
            있어서 삶의 중요한 순간들을 보다 현명하게 준비할 수 있죠.
          </p>
          <p className="intro_note">
            특히 인생에서 중요한 시기를 맞이했을 때, 내가 가진 사주를 바탕으로
            흐름을 읽고 대비한다면 훨씬 안정적이고 후회 없는 결정을 내릴 수
            있어요. 사주는 그렇게, 지금의 나와 앞으로의 나를 잇는 다리 역할을
            해준답니다.
          </p>
        </div>
      </div>

      {/* 장면 7: 색동낭자의 약속 */}
      <div className="intro_section">
        <h3 className="intro_section_title">색동낭자의 약속</h3>

        <div className="intro_section_content">
          <p>
            사주는 운명을 점치는 것이 아니라, 운명을 더 잘 살아내기 위한
            지혜예요.
          </p>
          <p>
            저는 {userName}님의 사주를 정성스럽게 바라보면서, 진심을 담아
            조언해드릴게요.
          </p>
          <p className="intro_promise">
            좋은 운은 더 크게 살리고, 어려운 운은 지혜롭게 피할 수 있도록,
            무엇보다 {userName}님이 스스로를 더 사랑하고 이해할 수 있도록
            도와드릴게요.
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
            <p>
              <strong>1장</strong> 나만의 매력과 연애 성향
            </p>
            <p>
              <strong>2장</strong> 앞으로 펼쳐질 사랑의 흐름
            </p>
            <p>
              <strong>3장</strong> 결국 만나게 될 운명의 상대
            </p>
            <p>
              <strong>4장</strong> 운명이라 착각하는 가짜 인연
            </p>
            <p>
              <strong>5장</strong> 누구에게도 말 못할, 19금 사주 풀이
            </p>
            <p>
              <strong>6장</strong> 색동낭자의 귀띔
            </p>
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
    {
      label: "1장: 나만의 매력과 연애 성향",
      targetId: "chapter-chapter1-report",
    },
    {
      label: "2장: 앞으로 펼쳐질 사랑의 흐름",
      targetId: "chapter-chapter2-report",
    },
    {
      label: "3장: 결국 만나게 될 운명의 상대",
      targetId: "chapter-chapter3-report",
    },
    { label: "보너스: 운명의 상대 이미지", targetId: "ideal-type-image" },
    {
      label: "4장: 운명이라 착각하는 가짜 인연",
      targetId: "chapter-chapter4-report",
    },
    {
      label: "5장: 누구에게도 말 못할, 19금 사주 풀이",
      targetId: "chapter-chapter5-report",
    },
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
            const isAvailable =
              targetIndex !== -1 && targetIndex <= messages.length - 1;
            const isCurrent =
              targetIndex !== -1 && targetIndex === currentIndex;

            return (
              <li
                key={i}
                className={`toc_modal_item ${isCurrent ? "current" : ""} ${
                  !isAvailable ? "disabled" : ""
                }`}
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
  const userName =
    data?.loveAnalysis?.user_name || data?.input?.userName || "고객";
  const chapters = data?.loveAnalysis?.chapters || [];
  const idealPartnerImage =
    data?.loveAnalysis?.ideal_partner_image?.image_base64;

  return (
    <div className="report_card ending_card">
      <div className="ending_content">
        {/* 인사말 */}
        <div className="ending_greeting">
          <p className="greeting_main">
            {userName}님, 여기까지 긴 리포트를 읽어주셔서 감사합니다.
          </p>
          <p>
            사주는 정해진 운명이 아니라, 나를 더 잘 이해하고 더 나은 선택을 하기
            위한 도구예요.
          </p>
          <p>당신의 사랑이 더 깊어지고, 더 따뜻해지길 진심으로 응원합니다.</p>
          <p className="ending_sign">- 색동낭자 드림</p>
        </div>

        {/* 보고서 전체 */}
        <div className="ending_summary">
          <h3 className="summary_title">나의 연애 사주 리포트 전체</h3>

          {/* 들어가며 */}
          <div className="report_card summary_report_card">
            <div className="card_header">
              <h3 className="card_title">색동낭자의 인사</h3>
            </div>
            <div className="card_content intro_summary_content">
              <p>{userName}님, 안녕하세요.</p>
              <p>저는 색동낭자예요. 사주로 인연의 실타래를 풀어드리죠.</p>
              <p>
                {userName}님의 생년월일시를 바탕으로 타고난 연애 성향, 운명적
                인연, 그리고 앞으로의 사랑 운을 살펴봤어요.
              </p>
            </div>
          </div>

          {/* 사주 원국 */}
          {data && <SummmarySajuCard data={data} />}

          {/* 각 챕터 */}
          {chapters.map((chapter, index) => {
            // 챕터 번호 추출
            const chapterMatch = chapter.title.match(/(\d+)장/);
            const chapterNum = chapterMatch
              ? parseInt(chapterMatch[1])
              : index + 1;
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
                    <h3 className="card_title">
                      {chapterNum}장 {titleText}
                    </h3>
                  </div>
                  <div
                    className="card_content"
                    dangerouslySetInnerHTML={{
                      __html: formatChapterContent(chapter.content),
                    }}
                  />
                </div>
                {/* 3장 뒤에 운명의 상대 이미지 표시 */}
                {isChapter3 && idealPartnerImage && (
                  <div className="report_card summary_ideal_card">
                    <div className="card_header">
                      <h3 className="card_title">{userName}님의 운명의 상대</h3>
                    </div>
                    <div className="summary_ideal_image">
                      <img
                        src={`data:image/png;base64,${idealPartnerImage}`}
                        alt="운명의 상대 이미지"
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

// 마무리 카드용 사주 원국 (간소화 버전)
function SummmarySajuCard({ data }: { data: SajuLoveRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const dayMaster = data.sajuData?.dayMaster;
  const input = data.input;

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
  const pillarLabels = ["시주", "일주", "월주", "년주"];

  return (
    <div className="report_card summary_report_card summary_saju_card">
      <div className="card_header">
        <h3 className="card_title">{userName}님의 사주 원국</h3>
      </div>

      {/* 기본 정보 */}
      <div className="summary_saju_info">
        <p className="summary_saju_birth">
          {input?.userName} · {input?.date}
          {birthTime ? ` · ${birthTime}` : ""}
        </p>
        {dayMaster && (
          <p className="summary_saju_daymaster">
            <span
              className="daymaster_char"
              style={{ color: getColor(dayMaster.element) }}
            >
              {dayMaster.char}
            </span>
            <span className="daymaster_title">{dayMaster.title}</span>
          </p>
        )}
      </div>

      {/* 간소화된 사주 팔자 */}
      <div className="summary_pillars">
        {pillarOrder.map((key, idx) => {
          const p = pillars[key];
          return (
            <div key={key} className="summary_pillar">
              <span className="pillar_label">{pillarLabels[idx]}</span>
              <div className="pillar_chars">
                <span
                  className="pillar_stem"
                  style={{ color: getColor(p?.stem?.element) }}
                >
                  {p?.stem?.char || "—"}
                </span>
                <span
                  className="pillar_branch"
                  style={{ color: getColor(p?.branch?.element) }}
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

// 마크다운 파서
function simpleMD(src: string = ""): string {
  src = src.replace(
    /```([\s\S]*?)```/g,
    (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
  );
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
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
  src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
    const rows = tableBlock.trim().split("\n");
    if (rows.length < 2) return match;
    let html = '<table class="md-table">';
    rows.forEach((row: string, idx: number) => {
      if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;
      const cells = row
        .split("|")
        .filter(
          (_: string, i: number, arr: string[]) => i > 0 && i < arr.length - 1
        );
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
  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");
  src = src.replace(/(^>\s?.*$\n?)+/gm, (match) => {
    const content = match
      .split("\n")
      .map((line) => line.replace(/^>\s?/, "").trim())
      .filter((line) => line)
      .join("<br>");
    return `<blockquote>${content}</blockquote>`;
  });
  src = src.replace(
    /<blockquote><strong>색동낭자 콕 찍기<\/strong>/g,
    '<blockquote class="quote-pinch"><div class="quote-header"><img src="/saju-love/img/pinch.jpg" class="quote-profile" alt="색동낭자"><strong>색동낭자 콕 찍기</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>색동낭자 속닥속닥<\/strong>/g,
    '<blockquote class="quote-sokdak"><div class="quote-header"><img src="/saju-love/img/sokdak.jpg" class="quote-profile" alt="색동낭자"><strong>색동낭자 속닥속닥</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>색동낭자 토닥토닥<\/strong>/g,
    '<blockquote class="quote-todak"><div class="quote-header"><img src="/saju-love/img/todak.jpg" class="quote-profile" alt="색동낭자"><strong>색동낭자 토닥토닥</strong></div>'
  );
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
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (m) => escapeMap[m]);
}

function formatChapterContent(content: string): string {
  if (!content) return "";
  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const hasSections = sectionPattern.test(content);
  sectionPattern.lastIndex = 0;

  if (!hasSections) return simpleMD(content);

  let formatted = "";
  const sections: {
    number: string;
    title: string;
    startIndex: number;
    endIndex: number;
  }[] = [];
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
  const subsections: { title: string; startIndex: number; endIndex: number }[] =
    [];
  let match;

  while ((match = subsectionPattern.exec(content)) !== null) {
    subsections.push({
      title: match[1].trim(),
      startIndex: match.index,
      endIndex: subsectionPattern.lastIndex,
    });
  }

  if (subsections.length > 0 && subsections[0].startIndex > 0) {
    const beforeContent = content
      .substring(0, subsections[0].startIndex)
      .trim();
    if (beforeContent) formatted += simpleMD(beforeContent);
  }

  for (let i = 0; i < subsections.length; i++) {
    const subsection = subsections[i];
    const nextSubsection = subsections[i + 1];
    const subsectionStart = subsection.endIndex;
    const subsectionEnd = nextSubsection
      ? nextSubsection.startIndex
      : content.length;
    const subsectionContent = content
      .substring(subsectionStart, subsectionEnd)
      .trim();

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
    <Suspense
      fallback={
        <div className="saju_result_page">
          <div className="main_body_wrap">
            <div className="loading_wrap">
              <div className="loading_spinner"></div>
              <p className="loading_text">불러오는 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <SajuLoveResultContent />
    </Suspense>
  );
}
