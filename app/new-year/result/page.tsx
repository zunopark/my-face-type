"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getNewYearRecord,
  updateNewYearRecord,
  NewYearRecord,
} from "@/lib/db/newYearDB";
import { trackPageView } from "@/lib/mixpanel";
import {
  parseTemplateSections,
  getSectionValue,
  getSectionData,
  parseScore,
  ParsedSection,
} from "@/lib/parseNewYearTemplate";
import styles from "./result.module.css";

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

// HTML 이스케이프
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
    .replace(
      /^(\s*)\*\*([^*]+)\*\*$/gm,
      '$1<strong class="section-heading">$2</strong>'
    )
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>");
  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    )
    .replace(
      /^(\s*)\[([^\]]+)\]$/gm,
      '$1<strong class="section-heading">$2</strong>'
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
  // 까치도령 전용 인용구
  src = src.replace(
    /<blockquote><strong>까치도령 콕 찍기<\/strong>/g,
    '<blockquote class="quote-pinch"><div class="quote-header"><strong>까치도령 콕 찍기</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>까치도령 속닥속닥<\/strong>/g,
    '<blockquote class="quote-sokdak"><div class="quote-header"><strong>까치도령 속닥속닥</strong></div>'
  );
  src = src.replace(
    /<blockquote><strong>까치도령 토닥토닥<\/strong>/g,
    '<blockquote class="quote-todak"><div class="quote-header"><strong>까치도령 토닥토닥</strong></div>'
  );
  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "");
  src = src
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
  src = src.replace(/~~(.+?)~~/g, "<del>$1</del>");
  src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  // 블록 요소 앞뒤의 불필요한 <br> 제거
  src = src
    .replace(/<br>\s*(<h[1-6]|<ul|<ol|<table|<blockquote|<hr|<pre)/g, "$1")
    .replace(/(<\/h[1-6]>|<\/ul>|<\/ol>|<\/table>|<\/blockquote>|<hr>|<\/pre>)\s*<br>/g, "$1")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<p>\s*(<h[1-6]|<ul|<ol|<table|<blockquote|<hr|<pre)/g, "$1")
    .replace(/(<\/h[1-6]>|<\/ul>|<\/ol>|<\/table>|<\/blockquote>|<hr>|<\/pre>)\s*<\/p>/g, "$1");
  return `<p>${src}</p>`;
}

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
    intro: `자, 그럼 ${userName}님의 2026년!\n어떤 한 해가 될지 같이 살펴볼까요?`,
    outro: `어때요, 올해 느낌이 좀 오시나요?\n저는 ${userName}님의 2026년이 정말 기대돼요!\n\n그럼 이제 돈 얘기 좀 해볼까요?`,
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter2: {
    intro: `다들 제일 궁금해하는 재물운이에요!\n${userName}님 올해 돈복은 어떨까요~?`,
    outro: `돈은 들어올 때 잘 잡고,\n나갈 때는 꼭 필요한 곳에만!\n\n자, 이번엔 건강 얘기 해볼게요.\n건강해야 돈도 쓰죠, 그쵸?`,
    introBg: "/new-year/img/doryung5.jpg",
    reportBg: "/new-year/img/doryung5.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter3: {
    intro: `이번엔 건강운이에요.\n뭐니뭐니해도 건강이 최고잖아요!`,
    outro: `몸이 보내는 신호, 무시하지 마세요~\n아프면 다 소용없어요!\n\n그럼 이제 두근두근 연애운 볼까요?`,
    introBg: "/new-year/img/doryung9.jpg",
    reportBg: "/new-year/img/doryung9.jpg",
    outroBg: "/new-year/img/doryung8.jpg",
  },
  chapter4: {
    intro: `연애운 시간이에요~\n${userName}님 올해 사랑운은 어떨까요?`,
    outro: `사랑도 타이밍이더라고요.\n좋은 사람 만나면 망설이지 마세요!\n\n다음은 직장운이에요. 일도 중요하니까요!`,
    introBg: "/new-year/img/doryung8.jpg",
    reportBg: "/new-year/img/doryung8.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter5: {
    intro: `직장운과 명예운이에요.\n올해 ${userName}님 커리어는 어떨까요?`,
    outro: `열심히 하면 분명 알아봐주는 사람 있어요.\n${userName}님, 항상 응원할게요!\n\n다음은 학업이랑 계약운이에요.`,
    introBg: "/new-year/img/doryung3.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung5.jpg",
  },
  chapter6: {
    intro: `학업운, 계약운 차례예요.\n시험이나 중요한 계약 앞두고 계신가요?`,
    outro: `큰 결정은 좋은 시기에 하는 게 좋아요.\n참고해두시면 도움 될 거예요!\n\n자, 이번엔 사람 복 얘기 해볼까요?`,
    introBg: "/new-year/img/doryung5.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter7: {
    intro: `대인관계운이에요.\n올해 ${userName}님 주변엔 어떤 사람들이 있을까요?`,
    outro: `좋은 사람 곁에 있으면 운도 따라와요.\n소중한 인연 꼭 챙기세요!\n\n그럼 이제 월별로 자세히 볼까요?`,
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung8.jpg",
    outroBg: "/new-year/img/doryung7.jpg",
  },
  chapter8: {
    intro: `12개월 월별 운세예요.\n매달 어떤 일이 있을지 궁금하시죠?`,
    outro: `새 달이 시작될 때마다 한번씩 읽어보세요.\n분명 도움이 될 거예요!\n\n다음은 좀 특별한 거 준비했어요~`,
    introBg: "/new-year/img/doryung7.jpg",
    reportBg: "/new-year/img/doryung7.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter9: {
    intro: `짜잔~ 미래일기예요!\n2026년의 ${userName}님이 직접 쓴 일기라고 상상해보세요.`,
    outro: `어때요, 좀 설레지 않아요?\n이렇게 좋은 일들이 가득하길 바라요!\n\n자, 이제 올해 개운법 알려드릴게요.`,
    introBg: "/new-year/img/doryung3.jpg",
    reportBg: "/new-year/img/doryung3.jpg",
    outroBg: "/new-year/img/doryung6.jpg",
  },
  chapter10: {
    intro: `개운법이에요!\n올해 운 더 좋아지는 꿀팁들 알려드릴게요.`,
    outro: `하나씩 실천해보세요.\n작은 것부터 하면 운이 확 바뀌어요!\n\n마지막으로 제가 따로 해드릴 말씀이 있어요.`,
    introBg: "/new-year/img/doryung6.jpg",
    reportBg: "/new-year/img/doryung6.jpg",
    outroBg: "/new-year/img/doryung4.jpg",
  },
  chapter11: {
    intro: `드디어 마지막이에요.\n${userName}님께만 드리는 까치도령의 특별한 귀띔!`,
    outro: "",
    introBg: "/new-year/img/doryung4.jpg",
    reportBg: "/new-year/img/doryung.jpg",
    outroBg: "/new-year/img/doryung2.jpg",
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
  const currentBgImage = messages[currentIndex]?.bgImage || "/new-year/img/doryung.jpg";

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
    if (title.includes("11장") || title.includes("귀띔")) return "chapter11";
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
      bgImage: "/new-year/img/doryung4.jpg",
    });

    result.push({
      id: "intro-guide-dialogue",
      type: "dialogue",
      content: `${userName}님의 2026년 운세를 보기 전에,\n먼저 사주에 대해 간단히 설명해드릴게요.`,
      bgImage: "/new-year/img/doryung6.jpg",
    });

    result.push({
      id: "intro-card",
      type: "intro",
      content: "",
      bgImage: "/new-year/img/doryung.jpg",
    });

    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: `사주란 참 신기하죠?\n그럼 이제 ${userName}님의 사주 팔자를 살펴볼까요?`,
      bgImage: "/new-year/img/doryung5.jpg",
    });

    result.push({
      id: "saju-card",
      type: "saju",
      content: "",
      bgImage: "/new-year/img/doryung7.jpg",
    });

    // 결제 완료 후 분석 대기 상태
    result.push({
      id: "waiting",
      type: "waiting",
      content: "",
      bgImage: "/new-year/img/doryung7.jpg",
    });

    return result;
  }, []);

  // 메시지 리스트 생성 (전체 - 분석 완료 후)
  const buildMessageList = useCallback((record: NewYearRecord): MessageItem[] => {
    const result: MessageItem[] = [];
    const userName = record.analysis?.user_name || record.input?.userName || "고객";
    const chapters = record.analysis?.chapters || [];

    result.push({
      id: "opening-dialogue",
      type: "dialogue",
      content: `${userName}님, 안녕하세요?\n이제부터 2026년 신년 운세를 천천히 살펴볼까요?`,
      bgImage: "/new-year/img/doryung4.jpg",
    });

    result.push({
      id: "intro-guide-dialogue",
      type: "dialogue",
      content: `${userName}님의 신년 운세를 알려드리기 전에,\n먼저 사주팔자에 대해 간단하게 설명을 해드릴게요.`,
      bgImage: "/new-year/img/doryung6.jpg",
    });

    result.push({
      id: "intro-card",
      type: "intro",
      content: "",
      bgImage: "/new-year/img/doryung.jpg",
    });

    result.push({
      id: "saju-intro-dialogue",
      type: "dialogue",
      content: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`,
      bgImage: "/new-year/img/doryung5.jpg",
    });

    result.push({
      id: "saju-card",
      type: "saju",
      content: "",
      bgImage: "/new-year/img/doryung7.jpg",
    });

    // 각 챕터별 [intro 대화 → 리포트 → outro 대화]
    const chapterConfig = getChapterConfig(userName);
    chapters.forEach((chapter, index) => {
      // index를 기반으로 고유 ID 생성, 챕터 설정은 chapter.number 사용
      const chapterNum = chapter.number || index + 1;
      const chapterKey = `chapter${chapterNum}`;
      const uniqueId = index + 1; // 고유 ID용
      const config = chapterConfig[chapterKey];

      if (config?.intro) {
        result.push({
          id: `chapter-${uniqueId}-intro`,
          type: "dialogue",
          content: config.intro,
          bgImage: config.introBg || "/new-year/img/doryung.jpg",
        });
      }

      result.push({
        id: `chapter-${uniqueId}-report`,
        type: "report",
        content: chapter.content || "",
        chapterIndex: index,
        bgImage: config?.reportBg || "/new-year/img/doryung.jpg",
      });

      if (config?.outro) {
        result.push({
          id: `chapter-${uniqueId}-outro`,
          type: "dialogue",
          content: config.outro,
          bgImage: config.outroBg || "/new-year/img/doryung.jpg",
        });
      }

    });

    result.push({
      id: "ending-intro",
      type: "dialogue",
      content: `${userName}님, 여기까지 긴 여정 함께해주셔서 감사해요.\n어떠셨어요? 2026년이 기대되시나요?`,
      bgImage: "/new-year/img/doryung8.jpg",
    });

    result.push({
      id: "ending-outro",
      type: "dialogue",
      content: `2026년 병오년이 ${userName}님에게\n행운과 기쁨이 가득한 해가 되길 바랄게요.\n\n그럼, 마지막으로 정리된 보고서를 전달 드릴게요.`,
      bgImage: "/new-year/img/doryung2.jpg",
    });

    result.push({
      id: "ending",
      type: "ending",
      content: "",
      bgImage: "/new-year/img/doryung2.jpg",
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

      const nextImage = nextMsg.bgImage || "/new-year/img/doryung.jpg";

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
        const metaData = analysisResult.meta || {};

        // meta에서 user_name 가져와서 analysis에 포함
        const analysisWithMeta = {
          ...analysisData,
          user_name: metaData.user_name || storedData.input?.userName,
        };

        const updatedData: NewYearRecord = {
          ...storedData,
          analysis: analysisWithMeta,
          isAnalyzing: false,
        };
        await updateNewYearRecord(storedData.id, {
          analysis: analysisWithMeta,
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
                (m) => m.id === "chapter-1-intro"
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
      <div className={styles.newyear_result_page}>
        <div className={styles.main_body_wrap}>
          <div className={styles.loading_wrap}>
            <div className={styles.loading_progress_bar}>
              <div className={styles.loading_progress_fill}></div>
            </div>
            <p className={styles.loading_text}>
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
      <div className={styles.newyear_result_page}>
        <div className={styles.main_body_wrap}>
          <div className={styles.error_wrap}>
            <div className={styles.error_icon}>!</div>
            <p className={styles.error_text}>
              정말 죄송합니다.
              <br />
              사주 분석하는데 오류가 발생해서
              <br />
              다시 한 번만 더 시도해주세요.
            </p>
            <button className={styles.error_btn} onClick={handleRetry}>
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
    <div className={`${styles.newyear_result_page} ${styles.chat_mode}`} onClick={handleScreenClick}>
      {/* 배경 이미지 */}
      <div className={styles.result_bg}>
        <img
          src={currentBgImage}
          alt=""
          className={`${styles.result_bg_image} ${bgFadeIn ? styles.fade_in : ""}`}
        />
      </div>

      {/* 뒤로가기 버튼 */}
      <button
        className={styles.back_btn}
        onClick={(e) => {
          e.stopPropagation();
          setShowExitModal(true);
        }}
      >
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>홈으로</span>
      </button>

      {/* 홈으로 돌아가기 확인 모달 */}
      {showExitModal && (
        <div className={styles.exit_modal_overlay} onClick={() => setShowExitModal(false)}>
          <div className={styles.exit_modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.exit_modal_text}>홈으로 돌아갈까요?</p>
            <div className={styles.exit_modal_buttons}>
              <button className={styles.exit_modal_cancel} onClick={() => setShowExitModal(false)}>
                아니요
              </button>
              <button className={styles.exit_modal_confirm} onClick={() => router.push("/new-year")}>
                네, 돌아갈게요
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 목차 버튼 */}
      <button
        className={styles.toc_btn}
        onClick={(e) => {
          e.stopPropagation();
          setShowTocModal(true);
        }}
      >
        <span className={styles.toc_btn_text}>목차</span>
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
        <div className={`${styles.report_overlay} ${showReport ? styles.active : ""} ${isAnimating ? styles.animating : ""}`}>
          <div className={styles.report_scroll} ref={reportRef}>
            {currentMsg.type === "intro" && <IntroCard userName={userName} />}
            {currentMsg.type === "saju" && <SajuCard data={data} />}
            {currentMsg.type === "report" && data.analysis?.chapters?.[currentMsg.chapterIndex!] && (
              <ReportCard
                chapter={data.analysis.chapters[currentMsg.chapterIndex!]}
                chapterIndex={currentMsg.chapterIndex!}
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
                      (m) => m.id === "chapter-1-intro"
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
            <div className={styles.scroll_hint}>
              <span className="material-icons">keyboard_arrow_down</span>
              아래로 스크롤해주세요
            </div>
          )}

          {/* 하단 다음 버튼 */}
          <div
            className={`${styles.report_bottom_btn_wrap} ${
              canProceed && currentMsg.type !== "waiting"
                ? styles.visible
                : ""
            }`}
          >
            {currentMsg.type === "ending" ? (
              <div className={styles.end_buttons}>
                <button className={styles.dialogue_next_btn} onClick={() => window.location.reload()}>
                  처음부터 다시 보기
                </button>
                <button className={styles.dialogue_secondary_btn} onClick={() => setShowExitModal(true)}>
                  홈으로
                </button>
              </div>
            ) : currentMsg.type === "waiting" ? (
              <div className={styles.waiting_info}>
                <p>분석이 완료되면 자동으로 다음으로 넘어갑니다</p>
              </div>
            ) : (
              <div className={styles.report_nav_buttons}>
                {currentIndex > 0 && (
                  <button className={styles.report_prev_btn} onClick={handlePrev}>
                    이전
                  </button>
                )}
                <button className={styles.report_next_btn} onClick={handleNext}>
                  다음
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 대화 UI (하단 고정) */}
      <div className={`${styles.dialogue_wrap} ${!showReport ? styles.active : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dialogue_box} onClick={handleNext}>
          <div className={styles.dialogue_speaker}>까치도령</div>
          <p className={styles.dialogue_text}>
            {dialogueText}
            {isTyping && <span className={styles.typing_cursor}></span>}
          </p>
        </div>

        <div className={`${styles.dialogue_buttons} ${showButtons ? styles.visible : ""}`}>
          {currentIndex > 0 && (
            <button className={styles.dialogue_prev_btn} onClick={handlePrev}>
              이전
            </button>
          )}
          <button className={styles.dialogue_next_btn} onClick={handleNext}>
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
          "까치도령의 귀띔",
        ];
        return `${num}장. ${titles[num - 1] || ""}`;
      }
    }
    if (item.type === "ending") return "마무리";
    return "";
  };

  return (
    <div className={styles.toc_modal_overlay} onClick={onClose}>
      <div className={styles.toc_modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.toc_modal_header}>
          <span className={styles.toc_modal_title}>목차</span>
          <button className={styles.toc_modal_close} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.toc_modal_list}>
          {tocItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.toc_modal_item} ${item.index === currentIndex ? styles.active : ""} ${
                item.index <= currentIndex ? styles.visited : ""
              }`}
              onClick={() => onNavigate(item.index)}
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
    <div className={`${styles.report_card} ${styles.intro_card}`}>
      {/* 장면 1: 인사 */}
      <div className={`${styles.intro_section} ${styles.intro_welcome}`}>
        <p className={styles.welcome_main}>안녕하세요!</p>
        <p className={styles.welcome_sub}>2026년 신년 운세에 오신 것을 환영해요</p>
        <div className={styles.welcome_divider}>✦</div>
        <p className={styles.welcome_text}>
          저는 <strong>까치도령</strong>이에요. 새해 운세를 봐드리는 일을 하고 있죠.
        </p>
        <p className={styles.welcome_text}>
          새해를 앞두고 다가올 한 해가 궁금하시거나, 중요한 결정을 앞두고 계시거나,
          올해의 방향을 잡고 싶으셔서 찾아오셨을 거예요.
        </p>
        <p className={styles.welcome_text}>
          그렇다면 정말 잘 찾아오셨어요. {userName}님의 사주 속에는 이미
          2026년을 어떻게 보내면 좋을지에 대한 힌트가 담겨 있거든요.
        </p>
        <p className={styles.welcome_text}>
          제가 사주라는 지도를 함께 펼치고, {userName}님의 2026년을
          환하게 밝혀드릴게요.
        </p>
      </div>

      {/* 장면 2: 사주란? */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>들어가며</h3>
        <p className={styles.intro_section_subtitle}>사주란 무엇인가요?</p>

        <div className={styles.intro_section_content}>
          <p className={styles.intro_quote}>
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
          <p className={styles.intro_note}>
            사주는 단순히 미래를 맞히는 점술이 아니라,{" "}
            <strong>
              나를 이해하고, 더 나은 선택을 할 수 있게 도와주는 삶의 나침반
            </strong>
            이라고 보시면 좋아요.
          </p>
        </div>
      </div>

      {/* 장면 3: 사주팔자의 구조 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>사주팔자의 구조</h3>
        <p className={styles.intro_section_subtitle}>왜 팔자라고 부를까요?</p>

        <div className={styles.intro_section_content}>
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
        <div className={styles.intro_saju_table}>
          <div className={styles.saju_pillar_row}>
            <div className={styles.saju_pillar}>
              <span className={styles.pillar_name}>시주</span>
              <div className={styles.pillar_chars}>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.metal}`}>庚</span>
                  <span className={styles.char_meaning}>자녀</span>
                </div>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.metal}`}>申</span>
                  <span className={styles.char_meaning}>말년</span>
                </div>
              </div>
            </div>
            <div className={`${styles.saju_pillar} ${styles.highlight}`}>
              <span className={styles.pillar_name}>일주</span>
              <div className={styles.pillar_chars}>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.earth}`}>戊</span>
                  <span className={styles.char_meaning}>나</span>
                </div>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.fire}`}>午</span>
                  <span className={styles.char_meaning}>배우자</span>
                </div>
              </div>
            </div>
            <div className={styles.saju_pillar}>
              <span className={styles.pillar_name}>월주</span>
              <div className={styles.pillar_chars}>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.fire}`}>丙</span>
                  <span className={styles.char_meaning}>부모</span>
                </div>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.wood}`}>寅</span>
                  <span className={styles.char_meaning}>청년기</span>
                </div>
              </div>
            </div>
            <div className={styles.saju_pillar}>
              <span className={styles.pillar_name}>년주</span>
              <div className={styles.pillar_chars}>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.wood}`}>甲</span>
                  <span className={styles.char_meaning}>조상</span>
                </div>
                <div className={styles.char_cell}>
                  <span className={`${styles.cell_hanja} ${styles.water}`}>子</span>
                  <span className={styles.char_meaning}>유년기</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p>
            우리가 이 세상에 태어난 그 순간, 눈에 보이지 않는 운명의 설계도가
            이미 그려지는 거예요.
          </p>
          <p className={styles.intro_note}>
            그래서 사주는 예언이 아니라, 나의 성격과 기질, 그리고 앞으로 맞이할
            인생의 흐름을 미리 살펴볼 수 있는 <strong>소중한 지도</strong>
            랍니다.
          </p>
        </div>
      </div>

      {/* 장면 4: 천간(天干) */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>천간(天干)</h3>
        <p className={styles.intro_section_subtitle}>하늘에서 내려오는 열 가지 기운</p>

        <div className={styles.intro_section_content}>
          <p>
            천간은 하늘의 기운이에요. 총 <strong>10가지</strong>가 있어요.
          </p>
        </div>

        <div className={styles.intro_cheongan_table}>
          <div className={`${styles.cheongan_row} ${styles.header}`}>
            <span className={`${styles.element} ${styles.wood}`}>목(木)</span>
            <span className={`${styles.element} ${styles.fire}`}>화(火)</span>
            <span className={`${styles.element} ${styles.earth}`}>토(土)</span>
            <span className={`${styles.element} ${styles.metal}`}>금(金)</span>
            <span className={`${styles.element} ${styles.water}`}>수(水)</span>
          </div>
          <div className={`${styles.cheongan_row} ${styles.chars}`}>
            <span className={styles.wood}>
              甲 乙<br />
              <span className={styles.char_kor}>갑 을</span>
            </span>
            <span className={styles.fire}>
              丙 丁<br />
              <span className={styles.char_kor}>병 정</span>
            </span>
            <span className={styles.earth}>
              戊 己<br />
              <span className={styles.char_kor}>무 기</span>
            </span>
            <span className={styles.metal}>
              庚 辛<br />
              <span className={styles.char_kor}>경 신</span>
            </span>
            <span className={styles.water}>
              壬 癸<br />
              <span className={styles.char_kor}>임 계</span>
            </span>
          </div>
          <div className={`${styles.cheongan_row} ${styles.meaning}`}>
            <span>큰나무<br />풀·꽃</span>
            <span>태양<br />촛불</span>
            <span>산<br />논밭</span>
            <span>바위<br />보석</span>
            <span>바다<br />시냇물</span>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p>
            천간은 <strong>겉으로 드러나는 성격</strong>, 세상에 보여주는 나의
            모습을 나타내요.
          </p>
          <p className={styles.intro_note}>
            예를 들어 <strong>丙(병)</strong>은 태양처럼 밝고 열정적인 사람,{" "}
            <strong>癸(계)</strong>는 시냇물처럼 조용하고 감성적인 사람이에요.
          </p>
        </div>
      </div>

      {/* 장면 5: 지지(地支) */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>지지(地支)</h3>
        <p className={styles.intro_section_subtitle}>땅에서 올라오는 열두 가지 기운</p>

        <div className={styles.intro_section_content}>
          <p>
            지지는 땅의 기운을 뜻하는 열두 가지 글자로, 하늘의 기운을 받아들여
            더욱 구체적인 모습을 이루어 가죠.
          </p>
          <p>
            맞아요, 바로 우리가 흔히 아는 <strong>12지신(띠)</strong>이에요!
          </p>
        </div>

        <div className={styles.intro_jiji_table}>
          <div className={styles.jiji_table_row}>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.water}`}>子</span>
              <span className={styles.jiji_info}>자 · 쥐</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.earth}`}>丑</span>
              <span className={styles.jiji_info}>축 · 소</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.wood}`}>寅</span>
              <span className={styles.jiji_info}>인 · 호랑이</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.wood}`}>卯</span>
              <span className={styles.jiji_info}>묘 · 토끼</span>
            </div>
          </div>
          <div className={styles.jiji_table_row}>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.earth}`}>辰</span>
              <span className={styles.jiji_info}>진 · 용</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.fire}`}>巳</span>
              <span className={styles.jiji_info}>사 · 뱀</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.fire}`}>午</span>
              <span className={styles.jiji_info}>오 · 말</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.earth}`}>未</span>
              <span className={styles.jiji_info}>미 · 양</span>
            </div>
          </div>
          <div className={styles.jiji_table_row}>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.metal}`}>申</span>
              <span className={styles.jiji_info}>신 · 원숭이</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.metal}`}>酉</span>
              <span className={styles.jiji_info}>유 · 닭</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.earth}`}>戌</span>
              <span className={styles.jiji_info}>술 · 개</span>
            </div>
            <div className={styles.jiji_cell}>
              <span className={`${styles.jiji_hanja} ${styles.water}`}>亥</span>
              <span className={styles.jiji_info}>해 · 돼지</span>
            </div>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p>
            이 천간과 지지가 서로 만나 하나의 조화를 이루면, 하늘과 땅이
            어우러지듯 우리의 생년월일시가 정해지게 돼요.
          </p>
          <p className={styles.intro_note}>
            그리고 그 순간의 기운이 우리의 성향과 삶에 깊이 스며들어, 그 사람의
            성격부터 앞으로 펼쳐질 운명의 중요한 열쇠가 된답니다!
          </p>
        </div>
      </div>

      {/* 장면 6: 오행 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>다섯 가지 기운, 오행</h3>
        <p className={styles.intro_section_subtitle}>천간과 지지를 이해하는 열쇠</p>

        <div className={styles.intro_section_content}>
          <p>
            그런데 천간과 지지, 이렇게 많은 글자를 어떻게 이해하냐고요? 걱정
            마세요. 모든 글자는 다섯 가지 기운으로 나눌 수 있어요. 바로{" "}
            <strong>오행(五行)</strong>이에요.
          </p>
        </div>

        <div className={styles.intro_ohang_circle}>
          <div className={styles.ohang_circle_wrapper}>
            <div className={`${styles.ohang_node} ${styles.fire} ${styles.top}`}>
              <span className={styles.ohang_label}>화</span>
              <span className={styles.ohang_desc}>열정</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.wood} ${styles.left_top}`}>
              <span className={styles.ohang_label}>목</span>
              <span className={styles.ohang_desc}>성장</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.earth} ${styles.right_top}`}>
              <span className={styles.ohang_label}>토</span>
              <span className={styles.ohang_desc}>안정</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.water} ${styles.left_bottom}`}>
              <span className={styles.ohang_label}>수</span>
              <span className={styles.ohang_desc}>지혜</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.metal} ${styles.right_bottom}`}>
              <span className={styles.ohang_label}>금</span>
              <span className={styles.ohang_desc}>원칙</span>
            </div>
          </div>
          <div className={styles.ohang_relations}>
            <p className={styles.ohang_relation}>
              <span className={styles.relation_label}>생(生)</span>
              <span className={styles.el_wood}>목</span> → <span className={styles.el_fire}>화</span> → <span className={styles.el_earth}>토</span> → <span className={styles.el_metal}>금</span> → <span className={styles.el_water}>수</span> → <span className={styles.el_wood}>목</span>
            </p>
            <p className={styles.ohang_relation}>
              <span className={styles.relation_label}>극(剋)</span>
              <span className={styles.el_wood}>목</span> → <span className={styles.el_earth}>토</span> → <span className={styles.el_water}>수</span> → <span className={styles.el_fire}>화</span> → <span className={styles.el_metal}>금</span> → <span className={styles.el_wood}>목</span>
            </p>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p className={styles.intro_note}>
            이 다섯 가지 기운의 조합과 균형이 바로 {userName}님의 성격과 운세를 만들어요.
          </p>
        </div>
      </div>

      {/* 장면 7: 일주 - 신년운세의 핵심 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>신년운세의 열쇠, 일주</h3>
        <p className={styles.intro_section_subtitle}>사주에서 가장 중요한 기둥</p>

        <div className={styles.intro_section_content}>
          <p>
            자, 이제 중요한 이야기를 해볼게요. 사주의 네 기둥 중에서 신년 운세를 볼
            때 가장 중요한 기둥이 있어요. 바로 <strong>일주(日柱)</strong>예요.
          </p>
        </div>

        <div className={styles.intro_ilju_diagram}>
          <div className={styles.ilju_pillars}>
            <div className={styles.ilju_pillar}>
              <span className={styles.ilju_pillar_name}>시주</span>
              <div className={styles.ilju_pillar_chars}>
                <span>○</span>
                <span>○</span>
              </div>
            </div>
            <div className={`${styles.ilju_pillar} ${styles.highlight}`}>
              <span className={styles.ilju_pillar_name}>일주</span>
              <div className={styles.ilju_pillar_chars}>
                <span>나</span>
                <span>배우자</span>
              </div>
              <span className={styles.ilju_arrow}>↑ 이게 나!</span>
            </div>
            <div className={styles.ilju_pillar}>
              <span className={styles.ilju_pillar_name}>월주</span>
              <div className={styles.ilju_pillar_chars}>
                <span>○</span>
                <span>○</span>
              </div>
            </div>
            <div className={styles.ilju_pillar}>
              <span className={styles.ilju_pillar_name}>년주</span>
              <div className={styles.ilju_pillar_chars}>
                <span>○</span>
                <span>○</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p>일주는 태어난 &apos;날&apos;의 기둥인데요, 사주에서 &apos;나 자신&apos;을 의미해요.</p>
          <p>
            특히 일주의 윗글자, <strong>일간(日干)</strong>은 &apos;나&apos;를 대표하는 글자예요.
          </p>
          <p className={styles.intro_note}>
            2026년 병오년의 에너지가 나의 일간과 어떻게 만나느냐에 따라
            올 한 해의 운세가 달라진답니다. 그래서 일주가 가장 중요해요!
          </p>
        </div>
      </div>

      {/* 장면 8: 2026년 병오년 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>2026년 병오년(丙午年)</h3>
        <p className={styles.intro_section_subtitle}>붉은 말의 해</p>

        <div className={styles.intro_section_content}>
          <p>
            2026년은 <strong>병오년(丙午年)</strong>이에요.
            천간 병(丙)은 태양, 지지 오(午)는 말을 의미해요.
          </p>
          <p>
            병(丙)과 오(午) 모두 <strong>화(火)</strong>의 기운을 가지고 있어서,
            2026년은 불의 기운이 가득한 해예요.
          </p>
        </div>

        <div className={styles.byungo_info_card}>
          <div className={styles.byungo_header}>
            <span className={`${styles.byungo_char} ${styles.fire}`}>丙午</span>
            <span className={styles.byungo_label}>병오년</span>
          </div>
          <div className={styles.byungo_details}>
            <div className={styles.byungo_detail_item}>
              <span className={styles.detail_label}>천간</span>
              <span className={`${styles.detail_value} ${styles.fire}`}>丙(병) - 태양</span>
            </div>
            <div className={styles.byungo_detail_item}>
              <span className={styles.detail_label}>지지</span>
              <span className={`${styles.detail_value} ${styles.fire}`}>午(오) - 말</span>
            </div>
            <div className={styles.byungo_detail_item}>
              <span className={styles.detail_label}>오행</span>
              <span className={`${styles.detail_value} ${styles.fire}`}>화(火) + 화(火)</span>
            </div>
            <div className={styles.byungo_detail_item}>
              <span className={styles.detail_label}>키워드</span>
              <span className={styles.detail_value}>열정, 도전, 활력, 표현</span>
            </div>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p className={styles.intro_note}>
            태양처럼 밝고 말처럼 활기찬 2026년!
            열정적으로 도전하고, 적극적으로 표현하는 것이 좋은 해예요.
            다만 불의 기운이 강하니 과열되지 않도록 조절이 필요해요.
          </p>
        </div>
      </div>

      {/* 장면 9: 사주를 알면 무엇이 좋을까? */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>사주를 알면</h3>
        <p className={styles.intro_section_subtitle}>무엇이 좋을까요?</p>

        <div className={styles.intro_section_content}>
          <p>
            신년 운세는 단순한 예언이 아니에요. 다가올 한 해의 에너지 흐름을
            미리 파악해서 더 현명하게 대비하는 것이죠.
          </p>
          <p>
            언제 기회가 오고, 언제 조심해야 하는지 알면 중요한 결정을 더 잘 내릴 수 있어요.
          </p>
          <p className={styles.intro_note}>
            2026년이 {userName}님에게 어떤 기회와 도전을 가져다줄지,
            그리고 어떻게 하면 최선의 한 해를 보낼 수 있을지 함께 살펴볼게요.
          </p>
        </div>
      </div>

      {/* 장면 10: 까치도령의 약속 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>까치도령의 약속</h3>

        <div className={styles.intro_section_content}>
          <p>
            사주는 운명을 점치는 것이 아니라, 운명을 더 잘 살아내기 위한
            지혜예요.
          </p>
          <p>
            저는 {userName}님의 사주를 정성스럽게 바라보면서, 진심을 담아
            조언해드릴게요.
          </p>
          <p className={styles.intro_promise}>
            좋은 운은 더 크게 살리고, 어려운 시기는 지혜롭게 대비할 수 있도록,
            무엇보다 {userName}님이 2026년을 자신감 있게 맞이할 수 있도록
            도와드릴게요.
          </p>
        </div>
      </div>

      {/* 장면 11: 보고서 안내 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>보고서 안내</h3>

        <div className={styles.intro_section_content}>
          <p>
            이 보고서는 총 <strong>11개의 장</strong>으로 구성되어 있어요.
          </p>
          <div className={styles.intro_chapters_list}>
            <p><strong>1장</strong> 2026년 총운</p>
            <p><strong>2장</strong> 재물운</p>
            <p><strong>3장</strong> 건강운</p>
            <p><strong>4장</strong> 애정운</p>
            <p><strong>5장</strong> 직장·명예운</p>
            <p><strong>6장</strong> 관계운</p>
            <p><strong>7장</strong> 감정관리</p>
            <p><strong>8장</strong> 월별운세</p>
            <p><strong>9장</strong> 미래일기</p>
            <p><strong>10장</strong> 개운법 10계명</p>
            <p><strong>11장</strong> 까치도령의 귀띔</p>
          </div>
        </div>
      </div>

      {/* 장면 12: 마무리 - 전환 */}
      <div className={`${styles.intro_section} ${styles.intro_transition}`}>
        <div className={styles.intro_section_content}>
          <p className={styles.transition_text}>
            그럼 이제, 까치도령과 함께 {userName}님의 사주를 펼쳐볼까요?
          </p>
        </div>
      </div>
    </div>
  );
}

// 일간별 신년운세 특성 데이터
const dayMasterYearData: Record<string, { headline: string; summary: string; keywords: string[]; byungoRelation: string }> = {
  "甲": {
    headline: "큰 나무가 태양을 만난 해",
    summary: "갑목(甲木)인 분에게 2026년은 성장과 확장의 해예요. 병화(丙火)의 태양 에너지가 나무를 키워주니 새로운 도전과 발전에 좋아요.",
    keywords: ["성장", "확장", "도전"],
    byungoRelation: "목생화(木生火) - 나무가 불을 키우듯 에너지를 쏟아야 하는 해"
  },
  "乙": {
    headline: "꽃이 햇볕을 받아 피어나는 해",
    summary: "을목(乙木)인 분에게 2026년은 재능이 꽃피는 해예요. 태양의 따뜻함이 꽃을 피우듯 숨겨진 능력이 발현될 수 있어요.",
    keywords: ["개화", "표현", "재능발휘"],
    byungoRelation: "목생화(木生火) - 내 에너지가 빛으로 전환되는 시기"
  },
  "丙": {
    headline: "태양이 또 다른 태양을 만난 해",
    summary: "병화(丙火)인 분에게 2026년은 자기 에너지가 극대화되는 해예요. 다만 화기가 과도해질 수 있으니 조절이 중요해요.",
    keywords: ["정점", "과열주의", "자기표현"],
    byungoRelation: "비겁(比劫) - 동일한 기운이 만나 힘이 강해지지만 경쟁도 있어요"
  },
  "丁": {
    headline: "촛불이 태양 아래 자리 잡는 해",
    summary: "정화(丁火)인 분에게 2026년은 큰 무대에서 빛날 기회의 해예요. 섬세한 빛이 더 큰 빛과 함께할 때 주목받을 수 있어요.",
    keywords: ["기회", "협력", "인정"],
    byungoRelation: "비겁(比劫) - 같은 불 기운 속에서 나만의 색깔을 찾아야 해요"
  },
  "戊": {
    headline: "산이 햇볕을 받아 생명을 품는 해",
    summary: "무토(戊土)인 분에게 2026년은 내실을 다지는 해예요. 불이 토를 생하니 자신감과 자원이 쌓이는 시기예요.",
    keywords: ["축적", "안정", "내실"],
    byungoRelation: "화생토(火生土) - 에너지가 나를 키워주는 좋은 해"
  },
  "己": {
    headline: "논밭이 따뜻한 볕을 받는 해",
    summary: "기토(己土)인 분에게 2026년은 풍요의 해예요. 따뜻한 에너지가 땅을 기름지게 하듯 좋은 것들이 모여들어요.",
    keywords: ["풍요", "수확", "관계확장"],
    byungoRelation: "화생토(火生土) - 주변의 도움과 지원이 많은 해"
  },
  "庚": {
    headline: "쇠가 불에 달궈져 형태를 갖추는 해",
    summary: "경금(庚金)인 분에게 2026년은 변화와 단련의 해예요. 불이 금을 단련하듯 어려움을 통해 성장하는 시기예요.",
    keywords: ["단련", "변화", "성장통"],
    byungoRelation: "화극금(火剋金) - 도전적이지만 성장의 기회가 되는 해"
  },
  "辛": {
    headline: "보석이 불빛에 빛나는 해",
    summary: "신금(辛金)인 분에게 2026년은 주목받는 해예요. 불빛이 보석을 비추듯 나의 가치가 드러나는 시기예요.",
    keywords: ["인정", "가치상승", "주목"],
    byungoRelation: "화극금(火剋金) - 부담이 있지만 빛날 기회의 해"
  },
  "壬": {
    headline: "큰 물이 불의 기운과 균형을 이루는 해",
    summary: "임수(壬水)인 분에게 2026년은 균형을 찾는 해예요. 물과 불이 조화를 이루면 큰 성취가 가능해요.",
    keywords: ["균형", "조화", "성취"],
    byungoRelation: "수극화(水剋火) - 나의 힘으로 상황을 제어할 수 있는 해"
  },
  "癸": {
    headline: "시냇물이 따뜻한 기운을 만나는 해",
    summary: "계수(癸水)인 분에게 2026년은 활력을 얻는 해예요. 차가운 물에 따뜻함이 더해져 유연하게 흐를 수 있어요.",
    keywords: ["활력", "유연성", "순환"],
    byungoRelation: "수극화(水剋火) - 나의 지혜로 열기를 다스리는 해"
  }
};

// 사주 카드 컴포넌트
function SajuCard({ data }: { data: NewYearRecord }) {
  type PillarData = {
    stem?: { char?: string; element?: string; yinYang?: string; korean?: string };
    branch?: { char?: string; element?: string; yinYang?: string; korean?: string };
    tenGodStem?: string;
    tenGodBranchMain?: string;
    twelveUnsung?: string;
    twelveSinsal?: string;
  };
  // rawSajuData를 fallback으로 사용
  const rawSaju = data.rawSajuData as Record<string, unknown> || {};
  const pillars = (data.sajuData?.pillars || rawSaju.pillars || {}) as Record<string, PillarData>;
  const dayMaster = data.sajuData?.dayMaster || rawSaju.dayMaster as typeof data.sajuData.dayMaster;
  const userName = data.input?.userName || "고객";
  type FiveElementsData = {
    percent?: Record<string, number>;
    strengthLevel?: string;
    level?: string;
    strength?: string;
  };
  const fiveElements = (data.sajuData?.fiveElements || rawSaju.fiveElements || {}) as FiveElementsData;
  const elementPercent = fiveElements?.percent || {};
  type SinsalByPillar = Record<string, { stem?: string[]; branch?: string[] }>;
  const sinsal = (data.sajuData?.sinsal || rawSaju.sinsal || {}) as { _byPillar?: SinsalByPillar };

  // 용신 데이터도 rawSajuData에서 fallback
  type YongsinData = {
    yongsin?: { element?: string; korean?: string; hanja?: string };
    heesin?: { element?: string; korean?: string; hanja?: string };
    gisin?: { element?: string; korean?: string; hanja?: string };
    gusin?: { element?: string; korean?: string; hanja?: string };
    hansin?: { element?: string; korean?: string; hanja?: string };
    method?: string;
    reason?: string;
  };
  const yongsin = (data.sajuData?.yongsin || rawSaju.yongsin || {}) as YongsinData;

  // 귀인 정보 추출
  const getGuiinForPillar = (pillarKey: string): string[] => {
    const guiinList: string[] = [];
    const byPillar = sinsal._byPillar || {};
    const pillarData = byPillar[pillarKey];
    if (pillarData) {
      const stemGuiin = pillarData.stem?.filter((s: string) => s.includes("귀인")) || [];
      const branchGuiin = pillarData.branch?.filter((s: string) => s.includes("귀인")) || [];
      guiinList.push(...stemGuiin, ...branchGuiin);
    }
    return [...new Set(guiinList)]; // 중복 제거
  };

  // 일간별 데이터
  const dmData = dayMaster?.char ? dayMasterYearData[dayMaster.char] : null;

  // 태어난 시간을 시진으로 변환
  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    const hour = parseInt(time.replace(":", "").slice(0, 2), 10);
    if (!isNaN(hour)) {
      if (hour >= 23 || hour < 1) return "자시 (23:30~01:29)";
      if (hour >= 1 && hour < 3) return "축시 (01:30~03:29)";
      if (hour >= 3 && hour < 5) return "인시 (03:30~05:29)";
      if (hour >= 5 && hour < 7) return "묘시 (05:30~07:29)";
      if (hour >= 7 && hour < 9) return "진시 (07:30~09:29)";
      if (hour >= 9 && hour < 11) return "사시 (09:30~11:29)";
      if (hour >= 11 && hour < 13) return "오시 (11:30~13:29)";
      if (hour >= 13 && hour < 15) return "미시 (13:30~15:29)";
      if (hour >= 15 && hour < 17) return "신시 (15:30~17:29)";
      if (hour >= 17 && hour < 19) return "유시 (17:30~19:29)";
      if (hour >= 19 && hour < 21) return "술시 (19:30~21:29)";
      if (hour >= 21 && hour < 23) return "해시 (21:30~23:29)";
    }
    return null;
  };

  const birthTime = formatTimeToSi(data.input?.time);

  return (
    <div className={`${styles.report_card} ${styles.intro_card} ${styles.saju_card_full}`}>
      {/* 장면 1: 장 오프닝 */}
      <div className={`${styles.intro_section} ${styles.intro_welcome} ${styles.compact}`}>
        <p className={styles.welcome_sub}>사주 원국</p>
        <p className={styles.welcome_main}>{userName}님의 사주</p>
        <p className={styles.welcome_text}>
          {userName}님의 사주에는 어떤 글자들이 있을까요?
          <br />
          지금부터 하나씩 살펴볼게요.
        </p>
      </div>

      {/* 장면 2: 사주원국표 */}
      <div className={styles.intro_section}>
        {/* 기본 정보 */}
        <div className={styles.saju_info_header}>
          <span className={styles.saju_info_name}>{userName}님의 사주</span>
          <span className={styles.saju_info_date}>
            {data.input?.date}
            {birthTime ? ` | ${birthTime}` : ""}
          </span>
        </div>

        {/* 사주 원국표 */}
        <div className={styles.saju_table_card}>
          <table className={styles.saju_full_table}>
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
              <tr className={styles.row_sipsung_top}>
                <td className={styles.row_label}>십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      <span className={styles.sipsung_text}>
                        {p?.tenGodStem || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 천간 */}
              <tr className={styles.row_cheongan}>
                <td className={styles.row_label}>천간</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {p?.stem?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
                          {p?.stem?.korean || getStemKorean(p?.stem?.char || "")}
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
              <tr className={styles.row_jiji}>
                <td className={styles.row_label}>지지</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {p?.branch?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
                          {p?.branch?.korean || getBranchKorean(p?.branch?.char || "")}
                          {p?.branch?.element
                            ? getElementKorean(p.branch.element, p.branch.yinYang)
                            : ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
              {/* 십성 (지지) */}
              <tr className={styles.row_sipsung_bottom}>
                <td className={styles.row_label}>십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      <span className={styles.sipsung_text}>
                        {p?.tenGodBranchMain || "—"}
                      </span>
                    </td>
                  );
                })}
              </tr>
              {/* 십이운성 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>십이운성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  const twelveStage = p?.twelveUnsung;
                  const displayValue = typeof twelveStage === "string" ? twelveStage : "—";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 12신살 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>12신살</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  const twelveSinsal = p?.twelveSinsal;
                  const displayValue = typeof twelveSinsal === "string" ? twelveSinsal : "—";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 귀인 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>귀인</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const isDay = key === "day";
                  const guiinList = getGuiinForPillar(key);
                  const displayValue = guiinList.length > 0
                    ? guiinList.map(g => g.replace("귀인", "")).join(", ")
                    : "—";
                  return (
                    <td key={key} className={isDay ? styles.highlight : ""}>
                      <span className={guiinList.length > 0 ? styles.guiin_text : ""}>
                        {displayValue}
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 사주원국 설명 */}
        <div className={styles.intro_section_content} style={{ marginTop: "16px" }}>
          <p style={{ textAlign: "center" }}>
            처음 보면 무슨 말인지 잘 모르시겠죠?
            <br />
            당연해요, 괜찮아요!
          </p>
          <p style={{ textAlign: "center", marginTop: "12px" }}>
            지금부터 <strong>사주원국</strong>이 뭔지,
            <br />
            이 글자들이 어떤 의미를 담고 있는지
            <br />
            차근차근 알려드릴게요.
          </p>
        </div>

        <div className={styles.saju_explain_card}>
          <p className={styles.saju_explain_title}>사주원국이란?</p>
          <p className={styles.saju_explain_text}>
            {userName}님의 생년월일시에 해당하는 하늘과 땅의 글자를 십성,
            십이운성, 살 등과 함께 적은 표예요.
          </p>
        </div>
      </div>

      {/* 장면 3: 천간/지지 분리 설명 */}
      <div className={styles.intro_section}>
        <div className={styles.intro_section_content}>
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

        <div className={styles.saju_split_table}>
          <div className={styles.split_row}>
            <span className={styles.split_label}>
              천간
              <br />
              (天干)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = pillars[key];
              return (
                <div key={key} className={styles.split_cell}>
                  <span
                    className={styles.split_hanja}
                    style={{ color: getColor(p?.stem?.element) }}
                  >
                    {p?.stem?.char || "—"}
                  </span>
                  <span className={styles.split_korean}>{p?.stem?.korean || getStemKorean(p?.stem?.char || "")}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.split_row}>
            <span className={styles.split_label}>
              지지
              <br />
              (地支)
            </span>
            {(["hour", "day", "month", "year"] as const).map((key) => {
              const p = pillars[key];
              return (
                <div key={key} className={styles.split_cell}>
                  <span
                    className={styles.split_hanja}
                    style={{ color: getColor(p?.branch?.element) }}
                  >
                    {p?.branch?.char || "—"}
                  </span>
                  <span className={styles.split_korean}>
                    {p?.branch?.korean || getBranchKorean(p?.branch?.char || "")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 각 요소 신년운세 의미 설명 */}
        <div className={styles.saju_elements_meaning}>
          <p className={styles.elements_meaning_title}>
            각 요소가 신년운세에서 의미하는 것
          </p>
          <div className={styles.element_meaning_list}>
            <div className={styles.element_meaning_item}>
              <strong>천간(天干)</strong>
              <p>
                겉으로 드러나는 운의 흐름, 외부 환경의 변화. 2026년에 마주할 상황들이에요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>지지(地支)</strong>
              <p>
                내면의 변화와 기반. 2026년에 내 안에서 일어나는 변화와 잠재력이에요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십성(十星)</strong>
              <p>
                나와 세상의 관계 패턴. 재물, 명예, 인간관계 등 각 영역의 운세를 알 수 있어요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십이운성(十二運星)</strong>
              <p>
                운의 에너지 상태. 올해 어떤 기운이 강하고 약한지를 나타내요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>12신살</strong>
              <p>
                특별한 운의 기운. 도화살은 인기운, 역마살은 변화운을 뜻해요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 장면 4: 일간 설명 */}
      <div className={styles.intro_section}>
        {/* 까치도령 대화 - 일간 설명 전 */}
        <div className={styles.doryung_comment}>
          <p className={styles.doryung_text}>
            그리고 일주의 천간, 즉 &apos;일간&apos;은
            <br />
            {userName}님 자신을 나타내는 글자예요.
            <br />
            <br />
            2026년 병오년의 에너지가 이 일간과 어떻게 만나느냐에 따라
            올 한 해의 운세가 결정돼요.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>일간(日干)</h3>
        <p className={styles.intro_section_subtitle}>일주 천간 = 나를 대표하는 글자</p>

        <div className={styles.ilgan_simple_display}>
          <span
            className={styles.ilgan_char}
            style={{ color: getColor(dayMaster?.element) }}
          >
            {dayMaster?.char}
          </span>
          <span className={styles.ilgan_label}>{dayMaster?.title}</span>
        </div>

        <div className={styles.intro_section_content}>
          {dmData && (
            <div className={styles.ilgan_year_box}>
              <p className={styles.ilgan_headline}>{dmData.headline}</p>
              <p className={styles.ilgan_summary}>{dmData.summary}</p>
              <div className={styles.ilgan_keywords}>
                {dmData.keywords.map((kw, i) => (
                  <span key={i} className={styles.ilgan_keyword}>
                    #{kw}
                  </span>
                ))}
              </div>
              <p className={styles.ilgan_relation}>{dmData.byungoRelation}</p>
            </div>
          )}
        </div>
      </div>

      {/* 장면 5: 각 기둥별 관계 해석 */}
      <div className={styles.intro_section}>
        {/* 까치도령 대화 - 기둥별 관계 전 */}
        <div className={styles.doryung_comment}>
          <p className={styles.doryung_text}>
            그럼 이제 각 기둥이 어떤 의미를 갖는지 볼까요?
            <br />
            기둥마다 나타내는 시기와 관계가 달라요.
          </p>
        </div>

        <div className={styles.pillar_timing_cards}>
          <div className={styles.timing_card}>
            {/* 미니 사주표 - 년주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "year";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight ? getColor(p?.stem?.element) : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{
                        color: isHighlight ? getColor(p?.branch?.element) : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>년주(年柱)</span>
              <span className={styles.timing_period}>뿌리 · 조상, 사회</span>
            </div>
            <p className={styles.timing_desc}>
              나의 뿌리, 조상과 부모님, 그리고 사회적 배경을 나타내요.
            </p>
            <p className={styles.timing_year}>
              신년운세: 사회적 환경, 큰 흐름에서의 기회와 변화
            </p>
          </div>

          <div className={styles.timing_card}>
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "month";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight ? getColor(p?.stem?.element) : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{
                        color: isHighlight ? getColor(p?.branch?.element) : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>월주(月柱)</span>
              <span className={styles.timing_period}>줄기 · 직장, 사업</span>
            </div>
            <p className={styles.timing_desc}>
              나의 줄기, 부모님과 형제, 그리고 직장생활을 나타내요.
            </p>
            <p className={styles.timing_year}>
              신년운세: 직장운, 사업운, 대인관계의 변화
            </p>
          </div>

          <div className={`${styles.timing_card} ${styles.highlight}`}>
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "day";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight ? getColor(p?.stem?.element) : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{
                        color: isHighlight ? getColor(p?.branch?.element) : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>일주(日柱)</span>
              <span className={styles.timing_period}>꽃 · 나, 배우자</span>
            </div>
            <p className={styles.timing_desc}>
              나의 꽃, 나 자신과 배우자를 나타내는 가장 중요한 자리예요.
            </p>
            <p className={styles.timing_year}>
              신년운세: 가장 중요! 2026년 병오년과 나의 관계
            </p>
          </div>

          <div className={styles.timing_card}>
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "hour";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed}`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight ? getColor(p?.stem?.element) : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
                      style={{
                        color: isHighlight ? getColor(p?.branch?.element) : undefined,
                      }}
                    >
                      {p?.branch?.char || "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>시주(時柱)</span>
              <span className={styles.timing_period}>열매 · 자녀, 결실</span>
            </div>
            <p className={styles.timing_desc}>
              나의 열매, 자녀와 말년의 결실을 나타내요.
            </p>
            <p className={styles.timing_year}>
              신년운세: 2026년의 결과물, 이루어낼 성과
            </p>
          </div>
        </div>
      </div>

      {/* 장면 6: 오행 비율 */}
      <div className={styles.intro_section}>
        <div className={styles.doryung_comment}>
          <p className={styles.doryung_text}>
            기둥마다 색이 다르죠?
            <br />
            이게 목·화·토·금·수, 오행이에요.
            <br />
            <br />
            2026년 병오년은 화(火)의 해인데,
            <br />
            {userName}님의 오행 비율에 따라 올해 운이 달라져요.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>{userName}님의 오행</h3>

        {/* 오행비율 막대그래프 */}
        {Object.keys(elementPercent).length > 0 && (
          <div className={styles.ohang_chart_card}>
            <p className={styles.ohang_chart_title}>나의 오행 비율</p>
            {[
              { key: "wood", label: "목(木)", color: "#2aa86c" },
              { key: "fire", label: "화(火)", color: "#ff6a6a" },
              { key: "earth", label: "토(土)", color: "#caa46a" },
              { key: "metal", label: "금(金)", color: "#a0a0a0" },
              { key: "water", label: "수(水)", color: "#4a90d9" },
            ].map(({ key, label, color }) => {
              const pct = elementPercent[key] || 0;
              const status =
                pct >= 30 ? "과다" : pct >= 10 ? "적정" : pct > 0 ? "부족" : "결핍";
              return (
                <div key={key} className={styles.ohang_bar_row}>
                  <span className={styles.ohang_bar_label} style={{ color }}>
                    {label}
                  </span>
                  <div className={styles.ohang_bar_track}>
                    <div
                      className={styles.ohang_bar_fill}
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className={styles.ohang_pct}>{pct.toFixed(1)}%</span>
                  <span className={`${styles.ohang_status} ${styles[status]}`}>{status}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 2026년 오행 영향 - 심플하게 */}
        <div className={styles.doryung_comment} style={{ marginTop: "16px" }}>
          <p className={styles.doryung_text}>
            2026년은 <strong style={{ color: "#ff6a6a" }}>화(火)</strong>의 해예요.
            <br />
            {(elementPercent["fire"] || 0) >= 20
              ? `${userName}님은 화가 이미 많아서 조절이 필요해요.`
              : `${userName}님은 화가 적어서 올해 에너지를 잘 받을 수 있어요.`}
          </p>
        </div>
      </div>

      {/* 장면 6.5: 신강신약 (항상 표시) */}
      <div className={styles.intro_section}>
        <div className={styles.doryung_comment}>
          <p className={styles.doryung_text}>
            {userName}님의 사주가 강한지 약한지 알려드릴게요.
            <br />
            이걸 알아야 어떤 기운이 필요한지 알 수 있어요!
          </p>
        </div>

        <h3 className={styles.intro_section_title}>신강신약</h3>
        <p className={styles.intro_section_subtitle}>
          나의 사주는 강한가, 약한가?
        </p>

        {/* 신강신약 바 */}
        <div className={styles.strength_section}>
          <div className={styles.strength_bar_wrap}>
            <div className={styles.strength_bar}></div>
            <div
              className={styles.strength_marker}
              style={{
                left: (() => {
                  const level = fiveElements?.strengthLevel || fiveElements?.level;
                  const positions: Record<string, string> = {
                    "극신약": "7%",
                    "신약": "21%",
                    "중화신약": "35%",
                    "중화": "50%",
                    "중화신강": "65%",
                    "신강": "79%",
                    "극신강": "93%"
                  };
                  return positions[level || ""] || "50%";
                })()
              }}
            ></div>
          </div>
          <div className={styles.strength_labels}>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level) === "극신약" ? styles.active : ""}`}>극약</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level) === "신약" ? styles.active : ""}`}>태약</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level)?.includes("중화신약") ? styles.active : ""}`}>신약</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level) === "중화" ? styles.active : ""}`}>중화</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level)?.includes("중화신강") ? styles.active : ""}`}>신강</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level) === "신강" ? styles.active : ""}`}>태강</span>
            <span className={`${styles.strength_label} ${(fiveElements?.strengthLevel || fiveElements?.level) === "극신강" ? styles.active : ""}`}>극왕</span>
          </div>
          <div className={styles.strength_result}>
            <p className={styles.strength_result_text}>
              일간 &apos;<span className={styles.highlight}>{dayMaster?.char || "?"}</span>&apos;, &apos;<span className={styles.level}>{fiveElements?.strengthLevel || fiveElements?.level || "중화"}</span>&apos;한 사주입니다.
            </p>
          </div>
        </div>
      </div>

      {/* 장면 6.6: 용신/희신/기신 (용신 데이터 있을 때만) */}
      {yongsin.yongsin && (
        <div className={styles.intro_section}>
          <div className={styles.doryung_comment}>
            <p className={styles.doryung_text}>
              이제 가장 중요한 것을 알려드릴게요.
              <br />
              바로 {userName}님에게 <strong>도움이 되는 오행</strong>과{" "}
              <strong>피해야 할 오행</strong>이에요!
            </p>
          </div>

          <h3 className={styles.intro_section_title}>용신 · 희신 · 기신</h3>
          <p className={styles.intro_section_subtitle}>
            나에게 이로운 기운과 해로운 기운
          </p>

          {/* 용신/희신/기신 카드 */}
          <div className={styles.yongsin_cards}>
            {/* 용신 */}
            <div className={`${styles.yongsin_card} ${styles.yongsin_main}`}>
              <span className={styles.yongsin_label}>용신</span>
              <div
                className={styles.yongsin_circle}
                style={{
                  background: `${getColor(yongsin.yongsin?.element)}20`
                }}
              >
                <span
                  className={styles.yongsin_char}
                  style={{ color: getColor(yongsin.yongsin?.element) }}
                >
                  {yongsin.yongsin?.hanja || "—"}
                </span>
              </div>
              <span className={styles.yongsin_name}>
                {yongsin.yongsin?.korean
                  ? `${yongsin.yongsin.korean}(${yongsin.yongsin.hanja})`
                  : "—"}
              </span>
            </div>

            {/* 희신 */}
            <div className={`${styles.yongsin_card} ${styles.yongsin_hee}`}>
              <span className={styles.yongsin_label}>희신</span>
              <div
                className={styles.yongsin_circle}
                style={{
                  background: `${getColor(yongsin.heesin?.element)}20`
                }}
              >
                <span
                  className={styles.yongsin_char}
                  style={{ color: getColor(yongsin.heesin?.element) }}
                >
                  {yongsin.heesin?.hanja || "—"}
                </span>
              </div>
              <span className={styles.yongsin_name}>
                {yongsin.heesin?.korean
                  ? `${yongsin.heesin.korean}(${yongsin.heesin.hanja})`
                  : "—"}
              </span>
            </div>

            {/* 기신 */}
            <div className={`${styles.yongsin_card} ${styles.yongsin_gi}`}>
              <span className={styles.yongsin_label}>기신</span>
              <div
                className={styles.yongsin_circle}
                style={{
                  background: `${getColor(yongsin.gisin?.element)}20`
                }}
              >
                <span
                  className={styles.yongsin_char}
                  style={{ color: getColor(yongsin.gisin?.element) }}
                >
                  {yongsin.gisin?.hanja || "—"}
                </span>
              </div>
              <span className={styles.yongsin_name}>
                {yongsin.gisin?.korean
                  ? `${yongsin.gisin.korean}(${yongsin.gisin.hanja})`
                  : "—"}
              </span>
            </div>
          </div>
          <p className={styles.yongsin_method_note}>
            *억부용신 및 조후용신을 고려한 결과입니다.
          </p>

          {/* 용신 설명 */}
          <div className={styles.yongsin_explain}>
            <div className={styles.yongsin_explain_item}>
              <strong>용신이란?</strong>
              <p>
                사주의 균형을 맞추고 나에게 가장 이로운 기운을 주는 오행이에요.
                용신에 해당하는 색상, 방향, 직업 등을 활용하면 좋아요.
              </p>
            </div>
            <div className={styles.yongsin_explain_item}>
              <strong>희신이란?</strong>
              <p>
                용신을 도와주는 오행이에요.
                용신 다음으로 나에게 이로운 기운이에요.
              </p>
            </div>
            <div className={styles.yongsin_explain_item}>
              <strong>기신이란?</strong>
              <p>
                용신을 해치고 나에게 불리한 기운을 주는 오행이에요.
                가급적 피하는 것이 좋아요.
              </p>
            </div>
          </div>

          {/* 2026년 영향 */}
          <div className={styles.doryung_comment} style={{ marginTop: "16px" }}>
            <p className={styles.doryung_text}>
              2026년 병오년은 <strong style={{ color: "#ff6a6a" }}>화(火)</strong>의 해예요.
              <br />
              {yongsin.yongsin?.element === "fire"
                ? `${userName}님의 용신이 화(火)라서 올해 운이 아주 좋아요!`
                : yongsin.gisin?.element === "fire"
                  ? `${userName}님의 기신이 화(火)라서 조심할 부분이 있어요.`
                  : `2026년의 화(火) 기운이 ${userName}님께 어떤 영향을 미치는지 자세히 알려드릴게요.`}
            </p>
          </div>
        </div>
      )}

      {/* 장면 7: 마무리 */}
      <div className={styles.intro_section}>
        <div className={styles.doryung_comment}>
          <p className={styles.doryung_text}>
            여기까지가 {userName}님의 사주 원국이에요.
            <br /><br />
            그럼 본격적으로 2026년 운세를 알아볼까요?
          </p>
        </div>
      </div>
    </div>
  );
}

// 리포트 카드 컴포넌트
function ReportCard({
  chapter,
  chapterIndex,
}: {
  chapter: { number?: number; title?: string; content?: string };
  chapterIndex: number;
}) {
  const chapterTitles: Record<number, string> = {
    1: "2026년 병오년 총운",
    2: "재물운",
    3: "건강운",
    4: "애정운",
    5: "직업운/명예운",
    6: "관계운",
    7: "감정/마음 관리",
    8: "월별 운세",
    9: "미래 일기",
    10: "개운법 10계명",
    11: "까치도령의 귀띔",
  };

  // 타이틀 기반으로 챕터 번호 보정 (백엔드 파싱 오류 대응)
  const detectChapterNum = (): number => {
    const title = chapter.title || "";
    // 미래일기를 먼저 체크 (보너스 풀이 타이틀에 미래일기가 포함될 수 있음)
    if (title.includes("미래") || title.includes("일기")) return 9;
    if (title.includes("까치도령") || title.includes("보너스") || title.includes("귀띔")) return 11;
    if (title.includes("개운법") || title.includes("Do")) return 10;
    if (title.includes("월별")) return 8;
    if (title.includes("대인관계")) return 7;
    if (title.includes("학업") || title.includes("계약")) return 6;
    if (title.includes("직장") || title.includes("명예")) return 5;
    if (title.includes("연애") || title.includes("결혼")) return 4;
    if (title.includes("건강")) return 3;
    if (title.includes("재물")) return 2;
    if (title.includes("총운")) return 1;
    return chapter.number || chapterIndex + 1;
  };
  const chapterNum = detectChapterNum();
  const rawTitle = chapter.title || chapterTitles[chapterNum] || `${chapterNum}장`;
  const chapterTitle = rawTitle
    .replace(/^#+\s*/, "")
    .replace(/^\[\d+장\]\s*/, "")
    .trim();

  // 템플릿 형식 파싱
  const sections = parseTemplateSections(chapter.content || "");
  const hasSections = Object.keys(sections).length > 0;

  // 챕터별 구조화된 렌더링
  const renderStructuredContent = () => {
    switch (chapterNum) {
      case 1:
        return <Chapter1Content sections={sections} />;
      case 2:
        return <Chapter2Content sections={sections} />;
      case 3:
        return <Chapter3Content sections={sections} />;
      case 4:
        return <Chapter4Content sections={sections} />;
      case 5:
        return <Chapter5Content sections={sections} />;
      case 6:
        return <Chapter6Content sections={sections} />;
      case 7:
        return <Chapter7Content sections={sections} />;
      case 8:
        return <Chapter8Content sections={sections} />;
      case 9:
        return <Chapter9Content sections={sections} />;
      case 10:
        return <Chapter10Content sections={sections} />;
      case 11:
        return <Chapter11Content sections={sections} />;
      default:
        return (
          <div
            className={styles.card_content}
            dangerouslySetInnerHTML={{ __html: simpleMD(chapter.content || "") }}
          />
        );
    }
  };

  return (
    <div className={styles.report_card}>
      <div className={styles.card_header}>
        <span className={styles.card_label}>{chapterNum}장</span>
        <h2 className={styles.card_title}>{chapterTitle}</h2>
      </div>
      {hasSections ? renderStructuredContent() : (
        <div
          className={styles.card_content}
          dangerouslySetInnerHTML={{ __html: simpleMD(chapter.content || "") }}
        />
      )}
    </div>
  );
}

// 1장: 총운 콘텐츠
function Chapter1Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const preview = sections["총운_미리보기"]?.content || "";
  const gradeData = getSectionData(sections, "길흉_등급");
  const congratsData = getSectionData(sections, "축하_메시지");
  const scoresData = getSectionData(sections, "영역별_점수");
  const keywordsData = getSectionData(sections, "키워드");
  const mainData = getSectionData(sections, "나의_2026년_총운");
  const quarterlyData = getSectionData(sections, "분기별_흐름");
  const crisisData = getSectionData(sections, "위기");
  const opportunityData = getSectionData(sections, "기회");

  const scores = {
    재물운: parseScore(scoresData["재물운"], 3),
    연애운: parseScore(scoresData["연애운"], 3),
    직장명예운: parseScore(scoresData["직장명예운"], 3),
    학업계약운: parseScore(scoresData["학업계약운"], 3),
    건강운: parseScore(scoresData["건강운"], 3),
  };

  const keywords = [
    keywordsData["키워드1"],
    keywordsData["키워드2"],
    keywordsData["키워드3"],
  ].filter(Boolean);

  // 등급별 색상
  const gradeColors: Record<string, { bg: string; text: string }> = {
    "大吉": { bg: "#fff1f0", text: "#cf1322" },
    "대길": { bg: "#fff1f0", text: "#cf1322" },
    "吉": { bg: "#fff7e6", text: "#d46b08" },
    "길": { bg: "#fff7e6", text: "#d46b08" },
    "中吉": { bg: "#f6ffed", text: "#389e0d" },
    "중길": { bg: "#f6ffed", text: "#389e0d" },
    "小吉": { bg: "#e6f7ff", text: "#096dd9" },
    "소길": { bg: "#e6f7ff", text: "#096dd9" },
  };

  const gradeStyle = gradeColors[gradeData["등급"]] || gradeColors[gradeData["등급_한글"]] || { bg: "#f5f5f5", text: "#333" };

  return (
    <div className={styles.chapter_structured}>
      {/* 등급 카드 */}
      {gradeData["등급"] && (
        <div className={styles.grade_card} style={{ backgroundColor: gradeStyle.bg }}>
          <div className={styles.grade_center}>
            <span className={styles.grade_hanja} style={{ color: gradeStyle.text }}>{gradeData["등급"]}</span>
            <span className={styles.grade_divider} style={{ backgroundColor: gradeStyle.text }} />
            <span className={styles.grade_korean}>{gradeData["등급_한글"]}</span>
          </div>
        </div>
      )}

      {/* 축하 메시지 */}
      {(congratsData["제목"] || congratsData["부제"]) && (
        <div className={styles.congrats_box}>
          {congratsData["제목"] && <p className={styles.congrats_title}>&ldquo;{congratsData["제목"]}&rdquo;</p>}
          {congratsData["부제"] && <p className={styles.congrats_subtitle}>{congratsData["부제"]}</p>}
        </div>
      )}

      {congratsData["설명"] && (
        <div className={styles.text_block}>
          <p>{congratsData["설명"]}</p>
        </div>
      )}

      {preview && (
        <div className={styles.text_block}>
          <p>{preview}</p>
        </div>
      )}

      {Object.values(scores).some(s => s > 0) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>영역별 운세</h4>
          <div className={styles.score_table}>
            {Object.entries(scores).map(([label, score]) => (
              <div key={label} className={styles.score_row}>
                <span className={styles.score_label}>{label}</span>
                <span className={styles.score_bar}>
                  <span className={styles.score_fill} style={{ width: `${score * 20}%` }} />
                </span>
                <span className={styles.score_num}>{score}/5</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {keywords.length > 0 && (
        <div className={styles.info_row}>
          <span className={styles.info_label}>키워드</span>
          <span className={styles.info_value}>{keywords.join(", ")}</span>
        </div>
      )}

      {(mainData["주요_특징"] || mainData["전반적_흐름"]) && (
        <div className={styles.text_block}>
          {mainData["주요_특징"] && <p><strong>주요 특징:</strong> {mainData["주요_특징"]}</p>}
          {mainData["전반적_흐름"] && <p>{mainData["전반적_흐름"]}</p>}
        </div>
      )}

      {(quarterlyData["상반기"] || quarterlyData["중반기"] || quarterlyData["하반기"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>분기별 흐름</h4>
          {quarterlyData["상반기"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>상반기</span>
              <span className={styles.info_value}>{quarterlyData["상반기"]}</span>
            </div>
          )}
          {quarterlyData["중반기"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>중반기</span>
              <span className={styles.info_value}>{quarterlyData["중반기"]}</span>
            </div>
          )}
          {quarterlyData["하반기"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>하반기</span>
              <span className={styles.info_value}>{quarterlyData["하반기"]}</span>
            </div>
          )}
        </div>
      )}

      {crisisData["위기1_제목"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>주의할 시기</h4>
          {[1, 2, 3].map(i => {
            const title = crisisData[`위기${i}_제목`];
            if (!title) return null;
            return (
              <div key={i} className={styles.list_item}>
                <div className={styles.list_header}>
                  <strong>{title}</strong>
                  {crisisData[`위기${i}_시기`] && <span className={styles.list_meta}>{crisisData[`위기${i}_시기`]}</span>}
                </div>
                {crisisData[`위기${i}_내용`] && <p>{crisisData[`위기${i}_내용`]}</p>}
                {crisisData[`위기${i}_대처법`] && <p className={styles.list_sub}>대처법: {crisisData[`위기${i}_대처법`]}</p>}
              </div>
            );
          })}
        </div>
      )}

      {opportunityData["기회1_제목"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>기회의 시기</h4>
          {[1, 2, 3].map(i => {
            const title = opportunityData[`기회${i}_제목`];
            if (!title) return null;
            return (
              <div key={i} className={styles.list_item}>
                <div className={styles.list_header}>
                  <strong>{title}</strong>
                  {opportunityData[`기회${i}_시기`] && <span className={styles.list_meta}>{opportunityData[`기회${i}_시기`]}</span>}
                </div>
                {opportunityData[`기회${i}_내용`] && <p>{opportunityData[`기회${i}_내용`]}</p>}
                {opportunityData[`기회${i}_극대화`] && <p className={styles.list_sub}>극대화: {opportunityData[`기회${i}_극대화`]}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 2장: 재물운 콘텐츠
function Chapter2Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["재물운_한줄요약"]?.content || "";
  const flow = sections["재물운_흐름"]?.content || "";
  const eventData = getSectionData(sections, "재물_사건");
  const methodData = getSectionData(sections, "돈버는_방식");
  const monthlyData = getSectionData(sections, "월별_재물운");
  const benefactorData = getSectionData(sections, "재물_귀인");
  const villainData = getSectionData(sections, "재물_악인");
  const adviceData = getSectionData(sections, "재물운_조언");

  const events = [1, 2, 3].map(i => ({
    keyword: eventData[`사건${i}_키워드`],
    content: eventData[`사건${i}_내용`],
  })).filter(e => e.keyword);

  const methods = [
    { label: "직장", rating: methodData["직장_적합도"], advice: methodData["직장_조언"] },
    { label: "투자", rating: methodData["투자_적합도"], advice: methodData["투자_조언"] },
    { label: "부업", rating: methodData["부업_적합도"], advice: methodData["부업_조언"] },
    { label: "사업", rating: methodData["사업_적합도"], advice: methodData["사업_조언"] },
  ].filter(m => m.rating);

  return (
    <div className={styles.chapter_structured}>
      {summary && <div className={styles.text_block}><p>{summary}</p></div>}
      {flow && <div className={styles.text_block}><p>{flow}</p></div>}

      {events.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>올해의 재물 사건</h4>
          {events.map((e, i) => (
            <div key={i} className={styles.list_item}>
              <strong>{e.keyword}</strong>
              <p>{e.content}</p>
            </div>
          ))}
        </div>
      )}

      {methods.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>돈 버는 방식</h4>
          {methodData["추천_방식"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>추천</span>
              <span className={styles.info_value}>{methodData["추천_방식"]}</span>
            </div>
          )}
          {methods.map((m, i) => {
            const ratingClass = m.rating === "상" ? styles.rating_high
              : m.rating === "중" ? styles.rating_mid
              : styles.rating_low;
            return (
              <div key={i} className={styles.info_row}>
                <span className={styles.info_label}>{m.label}</span>
                <span className={styles.info_value}>
                  <span className={`${styles.rating_badge} ${ratingClass}`}>{m.rating}</span>
                  <span className={styles.rating_text}>{m.advice}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(monthlyData["상승기_월"] || monthlyData["주의기_월"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>월별 재물운</h4>
          {monthlyData["상승기_월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>상승기</span>
              <span className={styles.info_value}>{monthlyData["상승기_월"]} - {monthlyData["상승기_조언"]}</span>
            </div>
          )}
          {monthlyData["주의기_월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>주의기</span>
              <span className={styles.info_value}>{monthlyData["주의기_월"]} - {monthlyData["주의기_조언"]}</span>
            </div>
          )}
        </div>
      )}

      {(benefactorData["외모_특징"] || benefactorData["직업_특징"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>재물 귀인</h4>
          {benefactorData["외모_특징"] && <div className={styles.info_row}><span className={styles.info_label}>외모</span><span className={styles.info_value}>{benefactorData["외모_특징"]}</span></div>}
          {benefactorData["직업_특징"] && <div className={styles.info_row}><span className={styles.info_label}>직업</span><span className={styles.info_value}>{benefactorData["직업_특징"]}</span></div>}
          {benefactorData["만나는_장소"] && <div className={styles.info_row}><span className={styles.info_label}>장소</span><span className={styles.info_value}>{benefactorData["만나는_장소"]}</span></div>}
        </div>
      )}

      {(villainData["외모_특징"] || villainData["특징"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>조심할 사람</h4>
          {villainData["외모_특징"] && <div className={styles.info_row}><span className={styles.info_label}>외모</span><span className={styles.info_value}>{villainData["외모_특징"]}</span></div>}
          {villainData["특징"] && <div className={styles.info_row}><span className={styles.info_label}>특징</span><span className={styles.info_value}>{villainData["특징"]}</span></div>}
          {villainData["상황"] && <div className={styles.info_row}><span className={styles.info_label}>상황</span><span className={styles.info_value}>{villainData["상황"]}</span></div>}
        </div>
      )}

      {(adviceData["수입_흐름"] || adviceData["지출_새는이유"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>재물 조언</h4>
          {adviceData["수입_흐름"] && <div className={styles.info_row}><span className={styles.info_label}>수입 흐름</span><span className={styles.info_value}>{adviceData["수입_흐름"]}</span></div>}
          {adviceData["수입_늘리는법"] && <div className={styles.info_row}><span className={styles.info_label}>수입 늘리기</span><span className={styles.info_value}>{adviceData["수입_늘리는법"]}</span></div>}
          {adviceData["지출_새는이유"] && <div className={styles.info_row}><span className={styles.info_label}>지출 주의</span><span className={styles.info_value}>{adviceData["지출_새는이유"]}</span></div>}
          {adviceData["지출_막는법"] && <div className={styles.info_row}><span className={styles.info_label}>지출 막기</span><span className={styles.info_value}>{adviceData["지출_막는법"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 3장: 건강운 콘텐츠
function Chapter3Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["건강운_한줄요약"]?.content || "";
  const constitutionData = getSectionData(sections, "체질_분석");
  const issueData = getSectionData(sections, "주의_건강이슈");
  const exerciseData = getSectionData(sections, "추천_운동");
  const avoidData = getSectionData(sections, "피해야할_운동");
  const habitData = getSectionData(sections, "생활습관_추천");
  const dietData = getSectionData(sections, "식습관_추천");

  const issues = [1, 2, 3].map(i => ({
    issue: issueData[`이슈${i}`],
    desc: issueData[`이슈${i}_설명`],
  })).filter(i => i.issue);

  const exercises = [1, 2, 3].map(i => ({
    name: exerciseData[`운동${i}`],
    reason: exerciseData[`운동${i}_이유`],
  })).filter(e => e.name);

  const habits = [habitData["습관1"], habitData["습관2"], habitData["습관3"]].filter(Boolean);

  return (
    <div className={styles.chapter_structured}>
      {summary && <div className={styles.text_block}><p>{summary}</p></div>}

      {(constitutionData["타고난_체질"] || constitutionData["체질_장점"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>체질 분석</h4>
          {constitutionData["타고난_체질"] && <div className={styles.text_block}><p>{constitutionData["타고난_체질"]}</p></div>}
          {constitutionData["체질_장점"] && <div className={styles.info_row}><span className={styles.info_label}>장점</span><span className={styles.info_value}>{constitutionData["체질_장점"]}</span></div>}
          {constitutionData["체질_단점"] && <div className={styles.info_row}><span className={styles.info_label}>단점</span><span className={styles.info_value}>{constitutionData["체질_단점"]}</span></div>}
        </div>
      )}

      {issues.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>주의할 건강 이슈</h4>
          {issues.map((item, i) => (
            <div key={i} className={styles.list_item}>
              <strong>{item.issue}</strong>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      )}

      {exercises.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>추천 운동</h4>
          {exercises.map((e, i) => (
            <div key={i} className={styles.info_row}>
              <span className={styles.info_label}>{e.name}</span>
              <span className={styles.info_value}>{e.reason}</span>
            </div>
          ))}
          {avoidData["운동"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>피할 운동</span>
              <span className={styles.info_value}>{avoidData["운동"]} {avoidData["이유"] && `- ${avoidData["이유"]}`}</span>
            </div>
          )}
        </div>
      )}

      {habits.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>추천 생활습관</h4>
          <ul className={styles.simple_list}>
            {habits.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        </div>
      )}

      {(dietData["추천_음식"] || dietData["피해야할_음식"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>식습관</h4>
          {dietData["추천_음식"] && <div className={styles.info_row}><span className={styles.info_label}>추천 음식</span><span className={styles.info_value}>{dietData["추천_음식"]}</span></div>}
          {dietData["피해야할_음식"] && <div className={styles.info_row}><span className={styles.info_label}>피할 음식</span><span className={styles.info_value}>{dietData["피해야할_음식"]}</span></div>}
          {dietData["추천_영양제"] && <div className={styles.info_row}><span className={styles.info_label}>영양제</span><span className={styles.info_value}>{dietData["추천_영양제"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 4장: 애정운 콘텐츠
function Chapter4Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["애정운_한줄요약"]?.content || "";
  const summaryData = getSectionData(sections, "애정운_한줄요약");
  const mainText = sections["애정운_총운"]?.content || "";
  const risingData = getSectionData(sections, "애정운_상승시기");
  const placeData = getSectionData(sections, "인연_만날장소");
  const charmData = getSectionData(sections, "나의_매력포인트");
  const luckData = getSectionData(sections, "개운법") || getSectionData(sections, "애정운_개운법");
  const itemData = getSectionData(sections, "행운_아이템");

  const places = [placeData["장소1"], placeData["장소2"], placeData["장소3"]].filter(Boolean);
  const charms = [charmData["매력1"], charmData["매력2"], charmData["매력3"]].filter(Boolean);

  return (
    <div className={styles.chapter_structured}>
      {summaryData["연애_장르"] && (
        <div className={styles.info_row}>
          <span className={styles.info_label}>연애 장르</span>
          <span className={styles.info_value}>{summaryData["연애_장르"]}</span>
        </div>
      )}
      {(summary || summaryData["요약"]) && <div className={styles.text_block}><p>{summary || summaryData["요약"]}</p></div>}
      {mainText && <div className={styles.text_block}><p>{mainText}</p></div>}

      {(risingData["상승_월"] || risingData["상승_이유"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>애정운 상승 시기</h4>
          {risingData["상승_월"] && <div className={styles.info_row}><span className={styles.info_label}>시기</span><span className={styles.info_value}>{risingData["상승_월"]}</span></div>}
          {risingData["상승_이유"] && <div className={styles.text_block}><p>{risingData["상승_이유"]}</p></div>}
        </div>
      )}

      {places.length > 0 && (
        <div className={styles.info_row}>
          <span className={styles.info_label}>인연 만날 장소</span>
          <span className={styles.info_value}>{places.join(", ")}</span>
        </div>
      )}

      {charms.length > 0 && (
        <div className={styles.info_row}>
          <span className={styles.info_label}>매력 포인트</span>
          <span className={styles.info_value}>{charms.join(", ")}</span>
        </div>
      )}

      {luckData["개운법"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>애정운 개운법</h4>
          <div className={styles.text_block}><p>{luckData["개운법"]}</p></div>
        </div>
      )}

      {(itemData["행운_색상"] || itemData["행운_액세서리"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>행운 아이템</h4>
          {itemData["행운_색상"] && <div className={styles.info_row}><span className={styles.info_label}>색상</span><span className={styles.info_value}>{itemData["행운_색상"]}</span></div>}
          {itemData["행운_액세서리"] && <div className={styles.info_row}><span className={styles.info_label}>액세서리</span><span className={styles.info_value}>{itemData["행운_액세서리"]}</span></div>}
          {itemData["행운_향기"] && <div className={styles.info_row}><span className={styles.info_label}>향기</span><span className={styles.info_value}>{itemData["행운_향기"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 5장: 직업운 콘텐츠
function Chapter5Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["직업운_한줄요약"]?.content || "";
  const socialText = sections["사회적_위치"]?.content || "";
  const jobData = getSectionData(sections, "이직퇴사_분석");
  const abilityData = getSectionData(sections, "일잘러_능력");
  const timingData = getSectionData(sections, "커리어_타이밍");
  const salaryData = getSectionData(sections, "연봉승진_예측");
  const benefactorData = getSectionData(sections, "직장_귀인");
  const villainData = getSectionData(sections, "직장_악인");

  const abilities = [1, 2, 3].map(i => ({
    name: abilityData[`능력${i}`],
    desc: abilityData[`능력${i}_설명`],
  })).filter(a => a.name);

  return (
    <div className={styles.chapter_structured}>
      {summary && <div className={styles.text_block}><p>{summary}</p></div>}
      {socialText && <div className={styles.text_block}><p>{socialText}</p></div>}

      {(jobData["이직_적합도"] || jobData["퇴사_적합도"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>이직/퇴사 분석</h4>
          {jobData["현재_상태"] && <div className={styles.info_row}><span className={styles.info_label}>현재 상태</span><span className={styles.info_value}>{jobData["현재_상태"]}</span></div>}
          {jobData["이직_적합도"] && <div className={styles.info_row}><span className={styles.info_label}>이직 적합도</span><span className={styles.info_value}>{jobData["이직_적합도"]}</span></div>}
          {jobData["퇴사_적합도"] && <div className={styles.info_row}><span className={styles.info_label}>퇴사 적합도</span><span className={styles.info_value}>{jobData["퇴사_적합도"]}</span></div>}
          {jobData["직무전환_적합도"] && <div className={styles.info_row}><span className={styles.info_label}>직무전환 적합도</span><span className={styles.info_value}>{jobData["직무전환_적합도"]}</span></div>}
          {jobData["조언"] && <div className={styles.text_block}><p>{jobData["조언"]}</p></div>}
          {jobData["이직_적기"] && <div className={styles.info_row}><span className={styles.info_label}>이직 적기</span><span className={styles.info_value}>{jobData["이직_적기"]}</span></div>}
        </div>
      )}

      {abilities.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>일잘러 능력</h4>
          {abilities.map((a, i) => (
            <div key={i} className={styles.list_item}>
              <strong>{a.name}</strong>
              <p>{a.desc}</p>
            </div>
          ))}
        </div>
      )}

      {(timingData["상승기_월"] || timingData["주의기_월"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>커리어 타이밍</h4>
          {timingData["상승기_월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>상승기</span>
              <span className={styles.info_value}>{timingData["상승기_월"]} - {timingData["상승기_내용"]}</span>
            </div>
          )}
          {timingData["주의기_월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>주의기</span>
              <span className={styles.info_value}>{timingData["주의기_월"]} - {timingData["주의기_내용"]}</span>
            </div>
          )}
        </div>
      )}

      {(salaryData["승진_가능성"] || salaryData["연봉협상_적기"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>연봉/승진</h4>
          {salaryData["취업_시기"] && <div className={styles.info_row}><span className={styles.info_label}>취업 시기</span><span className={styles.info_value}>{salaryData["취업_시기"]}</span></div>}
          {salaryData["이직_시기"] && <div className={styles.info_row}><span className={styles.info_label}>이직 시기</span><span className={styles.info_value}>{salaryData["이직_시기"]}</span></div>}
          {salaryData["승진_가능성"] && <div className={styles.info_row}><span className={styles.info_label}>승진 가능성</span><span className={styles.info_value}>{salaryData["승진_가능성"]}</span></div>}
          {salaryData["연봉협상_적기"] && <div className={styles.info_row}><span className={styles.info_label}>연봉협상 적기</span><span className={styles.info_value}>{salaryData["연봉협상_적기"]}</span></div>}
          {salaryData["성과급_예측"] && <div className={styles.info_row}><span className={styles.info_label}>성과급</span><span className={styles.info_value}>{salaryData["성과급_예측"]}</span></div>}
        </div>
      )}

      {(benefactorData["외모_특징"] || benefactorData["직급_특징"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>직장 귀인</h4>
          {benefactorData["외모_특징"] && <div className={styles.info_row}><span className={styles.info_label}>외모</span><span className={styles.info_value}>{benefactorData["외모_특징"]}</span></div>}
          {benefactorData["직급_특징"] && <div className={styles.info_row}><span className={styles.info_label}>직급</span><span className={styles.info_value}>{benefactorData["직급_특징"]}</span></div>}
          {benefactorData["만나는_상황"] && <div className={styles.info_row}><span className={styles.info_label}>상황</span><span className={styles.info_value}>{benefactorData["만나는_상황"]}</span></div>}
        </div>
      )}

      {(villainData["특징"] || villainData["상황"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>조심할 사람</h4>
          {villainData["특징"] && <div className={styles.info_row}><span className={styles.info_label}>특징</span><span className={styles.info_value}>{villainData["특징"]}</span></div>}
          {villainData["상황"] && <div className={styles.info_row}><span className={styles.info_label}>상황</span><span className={styles.info_value}>{villainData["상황"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 6장: 관계운 콘텐츠
function Chapter6Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["관계운_한줄요약"]?.content || "";
  const flowData = getSectionData(sections, "인연_흐름");
  const parentData = getSectionData(sections, "부모_관계");
  const siblingData = getSectionData(sections, "형제_관계");
  const friendData = getSectionData(sections, "친구_관계");
  const workData = getSectionData(sections, "직장_관계");
  const benefactorData = getSectionData(sections, "올해_귀인");
  const avoidData = getSectionData(sections, "멀어져야할_사람");

  const relationships = [
    { label: "부모", data: parentData },
    { label: "형제", data: siblingData },
    { label: "친구", data: friendData },
    { label: "직장", data: workData },
  ].filter(r => r.data["흐름"]);

  return (
    <div className={styles.chapter_structured}>
      {summary && <div className={styles.text_block}><p>{summary}</p></div>}

      {(flowData["가까워질_사람"] || flowData["멀어질_사람"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>인연의 흐름</h4>
          {flowData["가까워질_사람"] && <div className={styles.info_row}><span className={styles.info_label}>가까워질 사람</span><span className={styles.info_value}>{flowData["가까워질_사람"]}</span></div>}
          {flowData["멀어질_사람"] && <div className={styles.info_row}><span className={styles.info_label}>멀어질 사람</span><span className={styles.info_value}>{flowData["멀어질_사람"]}</span></div>}
        </div>
      )}

      {relationships.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>관계별 운세</h4>
          {relationships.map((r, i) => (
            <div key={i} className={styles.list_item}>
              <strong>{r.label} 관계</strong>
              <p>{r.data["흐름"]}</p>
              {r.data["위기"] && <p className={styles.list_sub}>주의: {r.data["위기"]}</p>}
              {r.data["조언"] && <p className={styles.list_sub}>조언: {r.data["조언"]}</p>}
            </div>
          ))}
        </div>
      )}

      {(benefactorData["외모_특징"] || benefactorData["직업"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>올해의 귀인</h4>
          {benefactorData["외모_특징"] && <div className={styles.info_row}><span className={styles.info_label}>외모</span><span className={styles.info_value}>{benefactorData["외모_특징"]}</span></div>}
          {benefactorData["직업"] && <div className={styles.info_row}><span className={styles.info_label}>직업</span><span className={styles.info_value}>{benefactorData["직업"]}</span></div>}
          {benefactorData["만나는_장소"] && <div className={styles.info_row}><span className={styles.info_label}>장소</span><span className={styles.info_value}>{benefactorData["만나는_장소"]}</span></div>}
          {benefactorData["만나는_시기"] && <div className={styles.info_row}><span className={styles.info_label}>시기</span><span className={styles.info_value}>{benefactorData["만나는_시기"]}</span></div>}
        </div>
      )}

      {(avoidData["감정쓰레기통"] || avoidData["악인_특징"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>멀리해야 할 사람</h4>
          {avoidData["감정쓰레기통"] && <div className={styles.info_row}><span className={styles.info_label}>감정 쓰레기통</span><span className={styles.info_value}>{avoidData["감정쓰레기통"]}</span></div>}
          {avoidData["일방적_관계"] && <div className={styles.info_row}><span className={styles.info_label}>일방적 관계</span><span className={styles.info_value}>{avoidData["일방적_관계"]}</span></div>}
          {avoidData["악인_특징"] && <div className={styles.info_row}><span className={styles.info_label}>특징</span><span className={styles.info_value}>{avoidData["악인_특징"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 7장: 감정/마음 관리 콘텐츠
function Chapter7Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const summary = sections["마음관리_한줄요약"]?.content || "";
  const flowText = sections["감정_흐름"]?.content || "";
  const weakData = getSectionData(sections, "약해지는_시기");
  const routineData = getSectionData(sections, "마음_루틴");
  const prescriptionData = getSectionData(sections, "마음_처방전");

  return (
    <div className={styles.chapter_structured}>
      {summary && <div className={styles.text_block}><p>{summary}</p></div>}
      {flowText && <div className={styles.text_block}><p>{flowText}</p></div>}

      {(weakData["시기"] || weakData["감정_패턴"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>약해지는 시기</h4>
          {weakData["시기"] && <div className={styles.info_row}><span className={styles.info_label}>시기</span><span className={styles.info_value}>{weakData["시기"]}</span></div>}
          {weakData["감정_패턴"] && <div className={styles.info_row}><span className={styles.info_label}>패턴</span><span className={styles.info_value}>{weakData["감정_패턴"]}</span></div>}
          {weakData["주의사항"] && <div className={styles.info_row}><span className={styles.info_label}>주의사항</span><span className={styles.info_value}>{weakData["주의사항"]}</span></div>}
        </div>
      )}

      {(routineData["하루_루틴"] || routineData["주간_루틴"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>마음 루틴</h4>
          {routineData["하루_루틴"] && <div className={styles.info_row}><span className={styles.info_label}>매일</span><span className={styles.info_value}>{routineData["하루_루틴"]}</span></div>}
          {routineData["주간_루틴"] && <div className={styles.info_row}><span className={styles.info_label}>매주</span><span className={styles.info_value}>{routineData["주간_루틴"]}</span></div>}
          {routineData["월간_루틴"] && <div className={styles.info_row}><span className={styles.info_label}>매월</span><span className={styles.info_value}>{routineData["월간_루틴"]}</span></div>}
        </div>
      )}

      {(prescriptionData["개운_색상"] || prescriptionData["개운_활동"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>마음 처방전</h4>
          {prescriptionData["개운_색상"] && <div className={styles.info_row}><span className={styles.info_label}>색상</span><span className={styles.info_value}>{prescriptionData["개운_색상"]}</span></div>}
          {prescriptionData["개운_장소"] && <div className={styles.info_row}><span className={styles.info_label}>장소</span><span className={styles.info_value}>{prescriptionData["개운_장소"]}</span></div>}
          {prescriptionData["개운_활동"] && <div className={styles.info_row}><span className={styles.info_label}>활동</span><span className={styles.info_value}>{prescriptionData["개운_활동"]}</span></div>}
          {prescriptionData["추천_음악"] && <div className={styles.info_row}><span className={styles.info_label}>음악</span><span className={styles.info_value}>{prescriptionData["추천_음악"]}</span></div>}
          {prescriptionData["추천_향기"] && <div className={styles.info_row}><span className={styles.info_label}>향기</span><span className={styles.info_value}>{prescriptionData["추천_향기"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 8장: 월별 운세 콘텐츠
function Chapter8Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const bestData = getSectionData(sections, "최고의_달");
  const cautionData = getSectionData(sections, "조심할_달");
  const monthlyData = getSectionData(sections, "월별_운세");
  const chanceData = getSectionData(sections, "월별_기회위기");
  const forbiddenData = getSectionData(sections, "금기일");

  const months = Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
    month: m,
    keyword: monthlyData[`${m}월_키워드`] || "",
    sentence: monthlyData[`${m}월_한문장`] || "",
    opportunity: chanceData[`${m}월_기회`] || "",
    crisis: chanceData[`${m}월_위기`] || "",
  }));

  const forbiddenDays = [1, 2, 3].map(i => forbiddenData[`금기일${i}`]).filter(Boolean);

  return (
    <div className={styles.chapter_structured}>
      {(bestData["월"] || cautionData["월"]) && (
        <div className={styles.section_block}>
          {bestData["월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>최고의 달</span>
              <span className={styles.info_value}>{bestData["월"]} - {bestData["이유"]}</span>
            </div>
          )}
          {cautionData["월"] && (
            <div className={styles.info_row}>
              <span className={styles.info_label}>조심할 달</span>
              <span className={styles.info_value}>{cautionData["월"]} - {cautionData["이유"]}</span>
            </div>
          )}
        </div>
      )}

      <div className={styles.section_block}>
        <h4 className={styles.section_title}>월별 운세</h4>
        <div className={styles.month_table}>
          {months.map(m => (
            <div key={m.month} className={styles.month_row}>
              <span className={styles.month_num}>{m.month}월</span>
              <div className={styles.month_content}>
                {m.keyword && <span className={styles.month_kw}>{m.keyword}</span>}
                {m.sentence && <span className={styles.month_desc}>{m.sentence}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {forbiddenDays.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>금기일</h4>
          <ul className={styles.simple_list}>
            {forbiddenDays.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// 9장: 미래 일기 콘텐츠
function Chapter9Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const letterText = sections["연말_편지"]?.content || "";
  const hardData = getSectionData(sections, "힘들었던_순간");
  const achieveData = getSectionData(sections, "가장큰_성취");
  const actionData = getSectionData(sections, "오늘의_행동");

  // 미래일기 전체 내용 (섹션이 없을 때 fallback용)
  const diaryContent = sections["미래일기"]?.content || sections["미래_일기"]?.content || "";

  const hasStructuredContent = letterText || hardData["시기"] || hardData["상황"] || achieveData["성취"] || actionData["action_item"];

  // 구조화된 데이터가 없으면 전체 내용 또는 모든 섹션 내용 표시
  if (!hasStructuredContent) {
    const allContent = diaryContent || Object.values(sections).map(s => s.content).filter(Boolean).join("\n\n");
    if (allContent) {
      return (
        <div className={styles.chapter_structured}>
          <div className={styles.text_block}>
            {allContent.split("\n").map((line, i) => (
              <p key={i}>{line || <br />}</p>
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className={styles.chapter_structured}>
      {letterText && (
        <div className={styles.text_block}>
          <p className={styles.letter_text}>{letterText}</p>
        </div>
      )}

      {(hardData["시기"] || hardData["상황"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>힘들었던 순간</h4>
          {hardData["시기"] && <div className={styles.info_row}><span className={styles.info_label}>시기</span><span className={styles.info_value}>{hardData["시기"]}</span></div>}
          {hardData["상황"] && <div className={styles.info_row}><span className={styles.info_label}>상황</span><span className={styles.info_value}>{hardData["상황"]}</span></div>}
          {hardData["선택"] && <div className={styles.info_row}><span className={styles.info_label}>선택</span><span className={styles.info_value}>{hardData["선택"]}</span></div>}
          {hardData["결과"] && <div className={styles.info_row}><span className={styles.info_label}>결과</span><span className={styles.info_value}>{hardData["결과"]}</span></div>}
        </div>
      )}

      {(achieveData["성취"] || achieveData["의미"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>가장 큰 성취</h4>
          {achieveData["성취"] && <div className={styles.text_block}><p><strong>{achieveData["성취"]}</strong></p></div>}
          {achieveData["의미"] && <div className={styles.text_block}><p>{achieveData["의미"]}</p></div>}
        </div>
      )}

      {actionData["action_item"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>오늘 당장 시작하기</h4>
          <div className={styles.text_block}><p>{actionData["action_item"]}</p></div>
        </div>
      )}
    </div>
  );
}

// 10장: 개운법 콘텐츠
function Chapter10Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const doData = getSectionData(sections, "Do_리스트");
  const dontData = getSectionData(sections, "Dont_리스트");
  const luckyData = getSectionData(sections, "행운_아이템");

  const doList = [1, 2, 3, 4, 5].map(i => doData[`do${i}`]).filter(Boolean);
  const dontList = [1, 2, 3, 4, 5].map(i => dontData[`dont${i}`]).filter(Boolean);

  return (
    <div className={styles.chapter_structured}>
      {doList.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>Do</h4>
          <ul className={styles.simple_list}>
            {doList.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {dontList.length > 0 && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>Don&apos;t</h4>
          <ul className={styles.simple_list}>
            {dontList.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      )}

      {(luckyData["행운_색상"] || luckyData["행운_숫자"]) && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>행운 아이템</h4>
          {luckyData["행운_색상"] && <div className={styles.info_row}><span className={styles.info_label}>색상</span><span className={styles.info_value}>{luckyData["행운_색상"]}</span></div>}
          {luckyData["행운_숫자"] && <div className={styles.info_row}><span className={styles.info_label}>숫자</span><span className={styles.info_value}>{luckyData["행운_숫자"]}</span></div>}
          {luckyData["행운_방위"] && <div className={styles.info_row}><span className={styles.info_label}>방위</span><span className={styles.info_value}>{luckyData["행운_방위"]}</span></div>}
          {luckyData["행운_음식"] && <div className={styles.info_row}><span className={styles.info_label}>음식</span><span className={styles.info_value}>{luckyData["행운_음식"]}</span></div>}
        </div>
      )}
    </div>
  );
}

// 11장: 까치도령 귀띔 콘텐츠
function Chapter11Content({ sections }: { sections: Record<string, ParsedSection> }) {
  const data = getSectionData(sections, "까치도령_귀띔");

  return (
    <div className={styles.chapter_structured}>
      {data["고민_주제"] && (
        <div className={styles.info_row}>
          <span className={styles.info_label}>고민 주제</span>
          <span className={styles.info_value}>{data["고민_주제"]}</span>
        </div>
      )}

      {data["맞춤_조언"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>맞춤 조언</h4>
          <div className={styles.text_block}><p>{data["맞춤_조언"]}</p></div>
        </div>
      )}

      {data["특별_메시지"] && (
        <div className={styles.section_block}>
          <h4 className={styles.section_title}>특별 메시지</h4>
          <div className={styles.text_block}><p>{data["특별_메시지"]}</p></div>
        </div>
      )}
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 분석 시작 시간
  const startTimeRef = useRef<number>(
    analysisStartedAt ? new Date(analysisStartedAt).getTime() : Date.now()
  );

  // 4분(240초) 동안 0-99% 불균일하게 진행
  useEffect(() => {
    const totalDuration = 240000; // 4분
    const maxProgress = 99;

    // 이미 경과한 시간 계산
    const initialElapsed = Date.now() - startTimeRef.current;
    const initialRatio = Math.min(initialElapsed / totalDuration, 1);
    const initialEased = 1 - Math.pow(1 - initialRatio, 4);
    const targetInitialProgress = Math.floor(initialEased * maxProgress);

    // 초기 진행률이 0보다 크면 스르르 채우는 애니메이션
    if (targetInitialProgress > 0) {
      const animationDuration = 800;
      const animationStart = Date.now();

      const animateInitial = () => {
        const animElapsed = Date.now() - animationStart;
        const animRatio = Math.min(animElapsed / animationDuration, 1);
        const animEased = 1 - Math.pow(1 - animRatio, 3);
        const currentProgress = Math.floor(animEased * targetInitialProgress);
        setProgress(currentProgress);

        if (animRatio < 1) {
          requestAnimationFrame(animateInitial);
        } else {
          startNormalProgress();
        }
      };

      requestAnimationFrame(animateInitial);
    } else {
      startNormalProgress();
    }

    function startNormalProgress() {
      const updateProgress = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const ratio = Math.min(elapsed / totalDuration, 1);
        const eased = 1 - Math.pow(1 - ratio, 4);
        const newProgress = Math.floor(eased * maxProgress);
        setProgress((prev) => Math.max(prev, newProgress));
      };

      progressIntervalRef.current = setInterval(updateProgress, 500);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // API 완료 시 100%로 채우고 1초 뒤 전환
  useEffect(() => {
    if (isComplete && !isTransitioning) {
      setIsTransitioning(true);

      const duration = 500;
      const startProgress = progress;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(elapsed / duration, 1);
        const newProgress = Math.floor(startProgress + (100 - startProgress) * ratio);
        setProgress(newProgress);

        if (ratio < 1) {
          requestAnimationFrame(animate);
        } else {
          setTimeout(() => {
            onTransition();
          }, 1000);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isComplete, isTransitioning, progress, onTransition]);

  return (
    <div className={`${styles.report_card} ${styles.waiting_card}`}>
      <div className={styles.waiting_content}>
        <div className={styles.waiting_progress_wrap}>
          <div className={styles.waiting_progress_bar}>
            <div className={styles.waiting_progress_fill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.waiting_progress_text}>{progress}%</span>
        </div>
        <h2 className={styles.waiting_title}>보고서 작성 중...</h2>
        <p className={styles.waiting_text}>
          까치도령이 {userName}님의
          <br />
          2026년 운세를 열심히 분석하고 있어요.
        </p>
        <p className={styles.waiting_subtext}>
          잠시만 기다려주세요,
          <br />
          페이지를 나가면 처음부터 다시 시작해야 할 수 있어요!
        </p>
      </div>
    </div>
  );
}

// 엔딩 카드 컴포넌트
function EndingCard({ data }: { data: NewYearRecord }) {
  const userName = data.analysis?.user_name || data.input?.userName || "고객";

  return (
    <div className={`${styles.report_card} ${styles.ending_card}`}>
      <div className={styles.ending_greeting}>
        <p className={styles.greeting_main}>
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
        <p className={styles.ending_sign}>- 까치도령 드림 🐴</p>
      </div>

      <div className={styles.ending_summary}>
        <h3 className={styles.summary_title}>2026년 신년 운세 요약</h3>

        {data.analysis?.chapters?.map((chapter, index) => {
          const title = chapter.title || "";
          let num = chapter.number || index + 1;
          // 미래일기를 먼저 체크
          if (title.includes("미래") || title.includes("일기")) num = 9;
          else if (title.includes("까치도령") || title.includes("보너스") || title.includes("귀띔")) num = 11;
          else if (title.includes("개운법")) num = 10;
          else if (title.includes("월별")) num = 8;
          else if (title.includes("대인관계")) num = 7;
          else if (title.includes("학업") || title.includes("계약")) num = 6;
          else if (title.includes("직장") || title.includes("명예")) num = 5;
          else if (title.includes("연애") || title.includes("결혼")) num = 4;
          else if (title.includes("건강")) num = 3;
          else if (title.includes("재물")) num = 2;
          else if (title.includes("총운")) num = 1;
          return (
            <div key={index} className={styles.summary_report_card}>
              <div className={styles.card_header}>
                <span className={styles.card_label}>{num}장</span>
                <span className={styles.card_title}>{title}</span>
              </div>
              <div className={styles.card_content}>
                {(chapter.content || "").slice(0, 200)}...
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NewYearResultPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.newyear_result_page}>
          <div className={styles.main_body_wrap}>
            <div className={styles.loading_wrap}>
              <div className={styles.loading_progress_bar}>
                <div className={styles.loading_progress_fill}></div>
              </div>
              <p className={styles.loading_text}>로딩 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <NewYearResultContent />
    </Suspense>
  );
}
