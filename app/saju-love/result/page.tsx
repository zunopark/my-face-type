"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
// 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
const SAJU_API_URL = process.env.NEXT_PUBLIC_SAJU_API_URL;
import {
  SajuLoveRecord,
} from "@/lib/db/sajuLoveDB";
import { trackPageView } from "@/lib/mixpanel";
import { createReview, getReviewByRecordId, Review } from "@/lib/db/reviewDB";
import { getSajuAnalysisByShareId, updateSajuAnalysis, SajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import { uploadSajuLoveImages, getImageUrl } from "@/lib/storage/imageStorage";
import {
  getColor,
  getStemElement,
  getBranchElement,
  getBranchKorean,
  getStemKorean,
  getElementKorean,
  escapeHTML,
  simpleMD as simpleMDBase,
} from "@/lib/saju-utils";
import { ScenePlayer, Scene, CardScene, WaitingScene, ActionScene } from "@/components/scene-player";
import { getChapterConfig, CHAPTER_TITLES, sajuLovePlayerConfig } from "./config";
import styles from "./result.module.css";

// Supabase → SajuLoveRecord 변환 헬퍼
function supabaseToRecord(r: SajuAnalysis, seenIntro = false): SajuLoveRecord {
  const raw = r.raw_saju_data as Record<string, unknown> | null;
  const gong = raw?.gong as Record<string, unknown> | undefined;
  const result = r.analysis_result as {
    user_name?: string;
    chapters?: Array<{ number: number; title: string; content: string }>;
    ideal_partner_image?: { prompt?: string; storage_path?: string };
    avoid_type_image?: { prompt?: string; storage_path?: string };
  } | null;

  return {
    id: r.id,
    createdAt: r.created_at || new Date().toISOString(),
    paid: r.is_paid || false,
    paidAt: r.paid_at || undefined,
    seenIntro,
    input: {
      userName: r.user_info?.userName || "",
      gender: r.user_info?.gender || "",
      date: r.user_info?.date || "",
      calendar: r.user_info?.calendar || "solar",
      time: r.user_info?.time || null,
      userConcern: r.user_info?.userConcern || "",
      status: r.user_info?.status || "",
    },
    rawSajuData: r.raw_saju_data as SajuLoveRecord["rawSajuData"],
    sajuData: {
      dayMaster: raw?.dayMaster as SajuLoveRecord["sajuData"]["dayMaster"] || { char: "", title: "" },
      pillars: raw?.pillars as SajuLoveRecord["sajuData"]["pillars"] || {},
      fiveElements: raw?.fiveElements as SajuLoveRecord["sajuData"]["fiveElements"],
      loveFacts: raw?.loveFacts as SajuLoveRecord["sajuData"]["loveFacts"],
      sinsal: raw?.sinsal as SajuLoveRecord["sajuData"]["sinsal"],
      daeun: raw?.daeun as SajuLoveRecord["sajuData"]["daeun"],
      zodiac: raw?.zodiac as SajuLoveRecord["sajuData"]["zodiac"],
      luckCycles: raw?.luckCycles as SajuLoveRecord["sajuData"]["luckCycles"],
      taiYuan: gong?.taiYuan as SajuLoveRecord["sajuData"]["taiYuan"],
      mingGong: gong?.mingGong as SajuLoveRecord["sajuData"]["mingGong"],
      shenGong: gong?.shenGong as SajuLoveRecord["sajuData"]["shenGong"],
    },
    loveAnalysis: result ? {
      user_name: result.user_name || "",
      chapters: result.chapters || [],
      ideal_partner_image: result.ideal_partner_image?.storage_path ? {
        image_base64: "",
        image_url: getImageUrl(result.ideal_partner_image.storage_path),
        prompt: result.ideal_partner_image.prompt,
      } : undefined,
      avoid_type_image: result.avoid_type_image?.storage_path ? {
        image_base64: "",
        image_url: getImageUrl(result.avoid_type_image.storage_path),
        prompt: result.avoid_type_image.prompt,
      } : undefined,
    } : null,
    paymentInfo: r.payment_info ? {
      method: r.payment_info.method,
      price: r.payment_info.price,
      couponCode: r.payment_info.couponCode,
      isDiscount: r.payment_info.isDiscount,
    } : undefined,
  };
}

// 색동낭자 전용 마크다운 파서
const simpleMD = (src: string = "") =>
  simpleMDBase(src, {
    name: "색동낭자",
    pinchImg: "/saju-love/img/pinch.jpg",
    sokdakImg: "/saju-love/img/sokdak.jpg",
    todakImg: "/saju-love/img/todak.jpg",
  });

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
    image_url?: string;  // Storage URL (Supabase에서 가져온 경우)
    prompt?: string;
  };
  avoid_type_image?: {
    image_base64: string;
    image_url?: string;
    prompt?: string;
  };
}


function SajuLoveResultContent() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("id");

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SajuLoveRecord | null>(null);
  const MAX_AUTO_RETRY = 2; // 자동 재시도 최대 횟수

  // 씬 상태
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [jumpIndex, setJumpIndex] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);
  const [allTocUnlocked, setAllTocUnlocked] = useState(false);

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const pendingDataRef = useRef<SajuLoveRecord | null>(null);

  // 리뷰 관련 상태
  // 기존 리뷰 존재 여부 (미리 확인해서 review_prompt 카드 생성 여부 결정)
  const [hasExistingReview, setHasExistingReview] = useState(false);

  const isFetchingRef = useRef(false);
  const partialStartedRef = useRef(false);
  const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // handleNext에서 사용하기 위한 함수 ref (선언 순서 문제 해결)
  const startLoadingMessagesRef = useRef<(userName: string) => void>(() => { });
  const fetchLoveAnalysisRef = useRef<(record: SajuLoveRecord) => void>(
    () => { }
  );

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

  // 부분 씬 리스트 생성 (들어가며 + 사주원국 + 대기)
  const buildPartialScenes = useCallback((record: SajuLoveRecord): Scene[] => {
    const userName = record.input?.userName || "고객";
    return [
      { kind: "dialogue", id: "opening-dialogue", text: `안녕하세요, ${userName}님\n저는 색동낭자예요. 반가워요!`, bgImage: "/saju-love/img/nangja-1.jpg" },
      { kind: "dialogue", id: "intro-guide-dialogue", text: `${userName}님의 연애운을 보기 전에,\n먼저 사주에 대해 간단히 설명해드릴게요.`, bgImage: "/saju-love/img/nangja-2.jpg" },
      { kind: "card", id: "intro-card", bgImage: "/saju-love/img/nangja-3.jpg", tocLabel: "들어가며" },
      { kind: "dialogue", id: "saju-intro-dialogue", text: `사주란 참 신기하죠?\n그럼 이제 ${userName}님의 사주 팔자를 살펴볼까요?`, bgImage: "/saju-love/img/nangja-3.jpg" },
      { kind: "card", id: "saju-card", bgImage: "/saju-love/img/nangja-5.jpg", tocLabel: "사주 원국" },
      { kind: "waiting", id: "waiting", bgImage: "/saju-love/img/nangja-1.jpg" },
    ];
  }, []);

  // 전체 씬 리스트 생성 (분석 완료 후)
  // 흐름: 첫 인사 → [1장] → [2장] → [3장] → 운명의 상대 이미지 → [4장] → 피해야 할 인연 이미지 → [5장] → [6장] → 엔딩
  const buildFullScenes = useCallback(
    (record: SajuLoveRecord, skipReviewPrompt = false): Scene[] => {
      const result: Scene[] = [];
      const userName =
        record.loveAnalysis?.user_name || record.input?.userName || "고객";
      const chapters = record.loveAnalysis?.chapters || [];
      const hasIdealImage =
        !!(record.loveAnalysis?.ideal_partner_image?.image_base64 ||
          record.loveAnalysis?.ideal_partner_image?.image_url);
      const hasAvoidImage =
        !!(record.loveAnalysis?.avoid_type_image?.image_base64 ||
          record.loveAnalysis?.avoid_type_image?.image_url);

      result.push({ kind: "dialogue", id: "opening-dialogue", text: `${userName}님, 안녕하세요?\n이제부터 연애 사주를 천천히 살펴볼까요?`, bgImage: "/saju-love/img/nangja-1.jpg" });
      result.push({ kind: "dialogue", id: "intro-guide-dialogue", text: `${userName}님의 연애 사주를 알려드리기 전에,\n먼저 사주팔자에 대해 간단하게 설명을 해드릴게요.`, bgImage: "/saju-love/img/nangja-2.jpg" });
      result.push({ kind: "card", id: "intro-card", bgImage: "/saju-love/img/nangja-3.jpg", tocLabel: "들어가며" });
      result.push({ kind: "dialogue", id: "saju-intro-dialogue", text: `이제 ${userName}님의 사주 원국을 보여드릴게요.\n이게 바로 ${userName}님의 타고난 운명이에요!`, bgImage: "/saju-love/img/nangja-3.jpg" });
      result.push({ kind: "card", id: "saju-card", bgImage: "/saju-love/img/nangja-5.jpg", tocLabel: "사주 원국" });

      // 각 챕터별 [intro 대화 → 리포트 → outro 대화]
      const chapterConfig = getChapterConfig(userName);
      chapters.forEach((chapter, index) => {
        const chapterKey = getChapterKey(chapter);
        const config = chapterConfig[chapterKey];
        const chapterNum = parseInt(chapterKey.replace("chapter", ""));

        if (config?.intro) {
          result.push({ kind: "dialogue", id: `chapter-${chapterKey}-intro`, text: config.intro, bgImage: config.introBg || "/saju-love/img/nangja-1.jpg" });
        }

        result.push({ kind: "card", id: `chapter-${chapterKey}-report`, bgImage: config?.reportBg || "/saju-love/img/nangja-1.jpg", chapterIndex: index, tocLabel: `${chapterNum}장. ${CHAPTER_TITLES[chapterNum - 1] || ""}` });

        // 5장인 경우 outro 전에 추가 대화 삽입
        if (chapterNum === 5) {
          result.push({ kind: "dialogue", id: "chapter5-extra", text: `어때요? 이런 부분도 미리 생각하면서\n더 깊은 관계를 만들어 보세요!`, bgImage: "/saju-love/img/nangja-20.jpg" });
        }

        if (config?.outro) {
          result.push({ kind: "dialogue", id: `chapter-${chapterKey}-outro`, text: config.outro, bgImage: config.outroBg || "/saju-love/img/nangja-1.jpg" });
        }

        // 5장 끝난 후 리뷰 유도 (이미 리뷰가 있으면 스킵)
        if (chapterNum === 5 && !skipReviewPrompt) {
          result.push({ kind: "action", id: "review-prompt", bgImage: "/saju-love/img/nangja-20.jpg" });
        }

        // 3장 이후에 운명의 상대 이미지 삽입
        if (chapterNum === 3 && hasIdealImage) {
          result.push({ kind: "dialogue", id: "ideal-type-dialogue", text: `잠깐, 여기서 특별히 보여드릴게 있어요.\n${userName}님의 운명의 상대가 어떻게 생겼는지 궁금하지 않으세요?`, bgImage: "/saju-love/img/nangja-15.jpg" });
          result.push({ kind: "card", id: "ideal-type-image", bgImage: "/saju-love/img/nangja-16.jpg" });
          result.push({ kind: "dialogue", id: "ideal-type-outro", text: `어떠세요, 설레지 않으세요?\n자, 이제 계속해서 ${userName}님의 연애 운을 살펴볼게요!`, bgImage: "/saju-love/img/nangja-17.jpg" });
        }

        // 4장 이후에 피해야 할 인연 이미지 삽입
        if (chapterNum === 4 && hasAvoidImage) {
          result.push({ kind: "dialogue", id: "avoid-type-dialogue", text: `실제로 이렇게 생겼을거에요.`, bgImage: "/saju-love/img/nangja-19.jpg" });
          result.push({ kind: "card", id: "avoid-type-image", bgImage: "/saju-love/img/nangja-19.jpg" });
          result.push({ kind: "dialogue", id: "avoid-type-outro", text: `연인이 되시지 말고 지인으로만 지내세요!\n이제 속으로 궁금했던,, 부끄러운 주제로 넘어가볼까요?`, bgImage: "/saju-love/img/nangja-19.jpg" });
        }
      });

      result.push({ kind: "dialogue", id: "ending-intro", text: `${userName}님, 정말 마지막이었어요. 여기까지 긴 여정 함께해주셔서 감사해요.\n어떠셨어요? 연애 사주를 보니 조금 나에 대해 더 아셨나요?`, bgImage: "/saju-love/img/nangja-1.jpg" });
      result.push({ kind: "dialogue", id: "ending-outro", text: `앞으로의 인연 길에\n늘 좋은 일만 가득하시길 바랄게요.\n\n그럼, 마지막으로 정리된 보고서를 전달 드릴게요.`, bgImage: "/saju-love/img/nangja-1.jpg" });
      result.push({ kind: "card", id: "ending", bgImage: "/saju-love/img/nangja-1.jpg", tocLabel: "마무리" });

      return result;
    },
    []
  );


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

        // 분석 시작 상태는 로컬에서만 관리
      }

      try {
        // 클라이언트에서 직접 FastAPI 호출 (Netlify 타임아웃 우회)
        const response = await fetch(`${SAJU_API_URL}/saju_love/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            saju_data: {
              ...storedData.sajuData,
              input: storedData.input, // 성별, 상태 정보 포함
            },
            user_name: storedData.input?.userName || "",
            user_concern: storedData.input?.userConcern?.trim() || "",
            user_status: storedData.input?.status || "",
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
          isAnalyzing: false,
        };

        // Supabase에 분석 결과 업데이트
        try {
          // 이미지 Storage에 업로드
          const imagePaths: string[] = [];
          if (loveResult.ideal_partner_image?.image_base64 ||
            loveResult.avoid_type_image?.image_base64) {
            try {
              const uploadedImages = await uploadSajuLoveImages(storedData.id, {
                idealPartner: loveResult.ideal_partner_image?.image_base64,
                avoidType: loveResult.avoid_type_image?.image_base64,
              });
              if (uploadedImages.idealPartner) imagePaths.push(uploadedImages.idealPartner.path);
              if (uploadedImages.avoidType) imagePaths.push(uploadedImages.avoidType.path);
            } catch (imgErr) {
              console.error("이미지 업로드 실패:", imgErr);
            }
          }

          await updateSajuAnalysis(storedData.id, {
            analysis_result: {
              user_name: loveResult.user_name,
              chapters: loveResult.chapters,
              ideal_partner_image: loveResult.ideal_partner_image ? {
                prompt: loveResult.ideal_partner_image.prompt,
                storage_path: imagePaths[0],
              } : undefined,
              avoid_type_image: loveResult.avoid_type_image ? {
                prompt: loveResult.avoid_type_image.prompt,
                storage_path: imagePaths[1],
              } : undefined,
            },
            image_paths: imagePaths.length > 0 ? imagePaths : undefined,
          });
        } catch (dbErr) {
          console.error("Supabase 업데이트 실패:", dbErr);
        }

        stopLoadingMessages();
        setIsAnalyzing(false);

        // 성공 시 재시도 카운트 리셋
        sessionStorage.removeItem(`saju_retry_${storedData.id}`);

        // WaitingCard가 있으면 100% 애니메이션 후 전환 (pendingData에 저장)
        if (partialStartedRef.current) {
          pendingDataRef.current = updatedData;
          setAnalysisComplete(true);
          // WaitingCard의 onTransition 콜백에서 실제 전환 처리
        } else {
          // 아직 partial 시작 전이면 → 바로 전환
          setData(updatedData);
          setScenes(buildFullScenes(updatedData, hasExistingReview));
          setIsLoading(false);
        }
      } catch (err) {
        stopLoadingMessages();
        setIsAnalyzing(false);

        // 에러 시 분석 상태 해제 (재시도 허용 - 로컬에서만 관리)

        console.error("분석 API 실패:", err);

        // 자동 재시도 로직 (sessionStorage로 횟수 관리)
        const retryKey = `saju_retry_${storedData.id}`;
        const currentRetry = parseInt(
          sessionStorage.getItem(retryKey) || "0",
          10
        );

        if (currentRetry < MAX_AUTO_RETRY) {
          console.log(`자동 재시도 ${currentRetry + 1}/${MAX_AUTO_RETRY}...`);
          sessionStorage.setItem(retryKey, String(currentRetry + 1));
          // 2초 후 자동 재시도
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }

        // 최대 재시도 횟수 초과 시 에러 표시 & 카운트 리셋
        sessionStorage.removeItem(retryKey);

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
    [
      startLoadingMessages,
      stopLoadingMessages,
      buildFullScenes,
      MAX_AUTO_RETRY,
    ]
  );

  // ref에 함수 할당 (handleNext에서 사용)
  useEffect(() => {
    startLoadingMessagesRef.current = startLoadingMessages;
    fetchLoveAnalysisRef.current = fetchLoveAnalysis;
  }, [startLoadingMessages, fetchLoveAnalysis]);

  // 초기화
  useEffect(() => {
    if (!resultId) {
      setError("결과를 찾을 수 없습니다.");
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        const supabaseRecord = await getSajuAnalysisByShareId(resultId);
        // seenIntro는 sessionStorage로 관리 (DB 불필요)
        const seenIntroKey = `seenIntro_${resultId}`;
        const seenIntro = sessionStorage.getItem(seenIntroKey) === "true";
        const record = supabaseRecord ? supabaseToRecord(supabaseRecord, seenIntro) : null;

        if (!record) {
          setError("데이터를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }

        // 기존 리뷰 존재 여부 미리 확인 (review_prompt 카드 표시 여부 결정)
        const existingReview = await getReviewByRecordId("saju_love", record.id);
        const hasReview = !!existingReview;
        if (hasReview) {
          setHasExistingReview(true);
        }

        // 결과 페이지 방문 추적
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
          paid: record.paid || false,
          // 결제 정보
          payment_method: record.paymentInfo?.method,
          payment_price: record.paymentInfo?.price,
          coupon_code: record.paymentInfo?.couponCode,
          is_discount: record.paymentInfo?.isDiscount,
        });

        // 미결제 상태: 들어가며 + 사주 원국까지만 보여주고 결제 유도
        if (!record.paid) {
          setData(record);
          const userName = record.input?.userName || "고객";

          // 이미 인트로를 본 적 있으면 가라 로딩 스킵
          if (record.seenIntro) {
            setScenes(buildPartialScenes(record));
            setIsLoading(false);
            return;
          }

          // 첫 방문: 10초 가라 로딩 후 partial 씬 시작
          startLoadingMessages(userName);
          setTimeout(async () => {
            stopLoadingMessages();
            sessionStorage.setItem(seenIntroKey, "true");
            setScenes(buildPartialScenes(record));
            setIsLoading(false);
          }, 10000);

          return;
        }

        // 결제 완료 & 분석 완료: 전체 씬 보여주기 (재방문)
        if (record.loveAnalysis) {
          setData(record);
          setScenes(buildFullScenes(record, hasReview));
          setAllTocUnlocked(true);
          setIsLoading(false);
          return;
        }

        // detail 페이지에서 결제 후 진입 (paid=true 쿼리 파라미터)
        const paidFromDetail = searchParams.get("paid") === "true";
        const userName = record.input?.userName || "고객";

        if (paidFromDetail && !record.seenIntro) {
          setData(record);
          setIsAnalyzing(true);

          // 백그라운드에서 분석 시작
          partialStartedRef.current = true;
          fetchLoveAnalysis(record);

          // 10초 가라 로딩 후 partial 씬 시작
          startLoadingMessages(userName);
          setTimeout(async () => {
            stopLoadingMessages();
            sessionStorage.setItem(seenIntroKey, "true");
            setScenes(buildPartialScenes(record));
            setIsLoading(false);
          }, 10000);

          return;
        }

        // 결제 완료 & 분석 필요 (이미 인트로를 본 경우)
        setData(record);
        setIsAnalyzing(true);
        setScenes(buildPartialScenes(record));
        setIsLoading(false);

        // 분석 결과가 아직 없는 경우 → 분석 시작
        const isStillAnalyzing = false; // Supabase에서는 분석 상태를 별도로 관리하지 않음

        if (isStillAnalyzing) {
          partialStartedRef.current = true;
          let checkCount = 0;
          const MAX_CHECKS = 10;

          const checkInterval = setInterval(async () => {
            checkCount++;
            const updatedSupabase = await getSajuAnalysisByShareId(record.id);
            const updated = updatedSupabase ? supabaseToRecord(updatedSupabase, true) : null;

            if (updated?.loveAnalysis) {
              clearInterval(checkInterval);
              setData(updated);
              setIsAnalyzing(false);

              const fullScenes = buildFullScenes(updated, hasReview);
              const chapter1IntroIndex = fullScenes.findIndex(
                (s) => s.id === "chapter-chapter1-intro"
              );
              setScenes(fullScenes);
              setJumpIndex(chapter1IntroIndex >= 0 ? chapter1IntroIndex : 0);
              setSceneKey((k) => k + 1);
              return;
            }

            if (checkCount >= MAX_CHECKS) {
              clearInterval(checkInterval);
              console.log("분석 응답 없음, API 재호출");
              fetchLoveAnalysis(record);
            }
          }, 3000);
          return;
        }

        // 분석 시작
        partialStartedRef.current = true;
        fetchLoveAnalysis(record);
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
    fetchLoveAnalysis,
    buildFullScenes,
    buildPartialScenes,
    startLoadingMessages,
    stopLoadingMessages,
  ]);

  // 분석 완료 시 씬 전환
  const handleAnalysisTransition = useCallback(() => {
    if (pendingDataRef.current) {
      const updatedData = pendingDataRef.current;
      setData(updatedData);
      const fullScenes = buildFullScenes(updatedData, hasExistingReview);
      const chapter1IntroIndex = fullScenes.findIndex((s) => s.id === "chapter-chapter1-intro");
      setScenes(fullScenes);
      setJumpIndex(chapter1IntroIndex >= 0 ? chapter1IntroIndex : 0);
      setSceneKey((k) => k + 1);
      pendingDataRef.current = null;
      setAnalysisComplete(false);
    }
  }, [buildFullScenes, hasExistingReview]);

  // 로딩 화면
  if (isLoading) {
    return (
      <div className={styles.saju_result_page}>
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
      <div className={styles.saju_result_page}>
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

  if (!data || scenes.length === 0) {
    return null;
  }

  const userName =
    data.loveAnalysis?.user_name || data.input?.userName || "고객";

  const renderCard = (scene: CardScene) => {
    if (scene.id === "intro-card") return <IntroCard userName={userName} />;
    if (scene.id === "saju-card") return <SajuCard data={data} />;
    if (scene.id === "ideal-type-image") {
      return (
        <IdealTypeCard
          imageBase64={data.loveAnalysis?.ideal_partner_image?.image_base64}
          imageUrl={data.loveAnalysis?.ideal_partner_image?.image_url}
          userName={userName}
          variant="ideal"
          title={`${userName}님의 운명의 상대`}
        />
      );
    }
    if (scene.id === "avoid-type-image") {
      return (
        <IdealTypeCard
          imageBase64={data.loveAnalysis?.avoid_type_image?.image_base64}
          imageUrl={data.loveAnalysis?.avoid_type_image?.image_url}
          userName={userName}
          variant="avoid"
          title={`${userName}님의 가짜 인연`}
        />
      );
    }
    if (scene.id === "ending") {
      return <EndingCard data={data} />;
    }
    if (scene.chapterIndex != null && data.loveAnalysis?.chapters?.[scene.chapterIndex]) {
      return (
        <ReportCard
          chapter={data.loveAnalysis.chapters[scene.chapterIndex]}
          chapterIndex={scene.chapterIndex}
        />
      );
    }
    return null;
  };

  const renderWaiting = (
    _scene: WaitingScene,
    props: { isComplete: boolean; onTransition: () => void }
  ) => (
    <WaitingCard
      userName={userName}
      isComplete={props.isComplete}
      analysisStartedAt={data?.analysisStartedAt}
      onTransition={props.onTransition}
    />
  );

  const renderAction = (scene: ActionScene, onComplete: () => void) => {
    if (scene.id === "review-prompt" && data?.id) {
      return (
        <ReviewInlineCard
          recordId={data.id}
          userName={userName}
          onDone={onComplete}
        />
      );
    }
    return null;
  };

  return (
    <ScenePlayer
      key={sceneKey}
      config={sajuLovePlayerConfig}
      scenes={scenes}
      initialIndex={jumpIndex}
      styles={styles}
      renderCard={renderCard}
      renderWaiting={renderWaiting}
      renderAction={renderAction}
      analysisComplete={analysisComplete}
      onAnalysisTransition={handleAnalysisTransition}
      allTocUnlocked={allTocUnlocked}
    />
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
    <div className={styles.report_card}>
      <div className={styles.card_header}>
        <span className={styles.card_label}>{labelText}</span>
        <h3 className={styles.card_title}>{titleText}</h3>
      </div>

      <div
        className={styles.card_content}
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
  imageUrl,
  userName,
  variant = "ideal",
  title,
}: {
  imageBase64?: string;
  imageUrl?: string;  // Storage URL (Supabase에서 가져온 경우)
  userName: string;
  variant?: "ideal" | "avoid";
  title?: string;
}) {
  // 이미지 소스 결정: base64 우선 (로컬 캐시에서 빠르게 로드), 없으면 URL 사용
  const imageSrc = imageBase64
    ? (imageBase64.startsWith('data:') ? imageBase64 : `data:image/png;base64,${imageBase64}`)
    : imageUrl || "";
  const [clickCount, setClickCount] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const maxClicks = 5;
  const blurLevel = Math.max(0, 30 - clickCount * 6);
  const isRevealed = clickCount >= maxClicks;

  const isAvoid = variant === "avoid";

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

  const cardTitle =
    title ||
    (isAvoid ? `${userName}님의 가짜 인연` : `${userName}님의 운명의 상대`);

  // 피해야 할 인연은 바로 보여주기
  if (isAvoid) {
    return (
      <div className={`${styles.report_card} ${styles.ideal_type_card} ${styles.avoid_variant}`}>
        <div className={styles.card_header}>
          <h3 className={styles.card_title}>{cardTitle}</h3>
        </div>
        <div className={`${styles.ideal_image_wrap} ${styles.revealed}`}>
          <img
            src={imageSrc}
            alt="가짜 인연 이미지"
            className={styles.ideal_image}
          />
        </div>
        <div className={styles.ideal_revealed_message}>
          <p>
            아무리 매력적으로 느껴져도,
            <br />
            이런 느낌의 사람은 조심하세요!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.report_card} ${styles.ideal_type_card}`}>
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{cardTitle}</h3>
      </div>
      <div
        className={`${styles.ideal_image_wrap} ${isRevealed ? styles.revealed : styles.blurred} ${isShaking ? styles.shake : ""
          }`}
        onClick={handleClick}
      >
        <img
          src={imageSrc}
          alt="운명의 상대 이미지"
          className={styles.ideal_image}
          style={{
            filter: `blur(${blurLevel}px)`,
            transition: "filter 0.4s ease-out",
          }}
        />
      </div>
      {!isRevealed && (
        <p className={styles.ideal_tap_hint}>{hintMessages[clickCount]}</p>
      )}
      {isRevealed && (
        <div className={styles.ideal_revealed_message}>
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
  태강: {
    title: "강하게 주도하는 스타일",
    mainRatio: "주도권 85~90%",
    traits: ["자기 확신이 강함", "결정이 빠름", "추진력 있음"],
    pattern: ["내가 결정할게", "이게 맞아, 따라와", "걱정 마, 내가 다 할게"],
    goodPoints: [
      "결단력과 추진력",
      "상대에게 안정감을 줌",
      "흔들림 없는 리더십",
    ],
    warning: ["상대 의견을 놓칠 수 있음", "융통성이 부족할 수 있음"],
    idealType: "나를 믿고 따라와 주는 사람",
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
  태약: {
    title: "상대에게 많이 맞추는 스타일",
    mainRatio: "주도권 10~15%",
    traits: ["배려심이 매우 깊음", "맞춰주는 게 편함", "갈등 회피"],
    pattern: [
      "네가 원하는 대로 할게",
      "난 괜찮아, 넌 어때?",
      "네가 행복하면 돼",
    ],
    goodPoints: ["헌신적", "상대를 편하게 해줌", "부드러운 성격"],
    warning: [
      "자기 의견 표현이 어려움",
      "참다가 폭발할 수 있음",
      "상대가 답답해할 수도",
    ],
    idealType: "나를 이해하고 리드해주는 사람",
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

// 사주 원국 카드 (기획서 기반 - IntroCard 스타일)
function SajuCard({ data }: { data: SajuLoveRecord }) {
  const userName = data.input?.userName || "고객";
  const pillars = data.sajuData?.pillars || {};
  const sajuData = data.sajuData;
  const dayMaster = data.sajuData?.dayMaster;
  const fiveElements = data.sajuData?.fiveElements;
  const loveFacts = data.sajuData?.loveFacts;
  const input = data.input;

  // 대운/연운/월운 스크롤 ref
  const daeunScrollRef = useRef<HTMLDivElement>(null);
  const yeonunScrollRef = useRef<HTMLDivElement>(null);
  const wolunScrollRef = useRef<HTMLDivElement>(null);

  // 태어난 시간을 시진으로 변환 (시간 범위 포함)
  const formatTimeToSi = (time: string | null | undefined): string | null => {
    if (!time) return null;
    // 다양한 형식 지원
    const timeMap: Record<string, string> = {
      "0030": "자시 (23:30~01:29)",
      "0230": "축시 (01:30~03:29)",
      "0430": "인시 (03:30~05:29)",
      "0630": "묘시 (05:30~07:29)",
      "0830": "진시 (07:30~09:29)",
      "1030": "사시 (09:30~11:29)",
      "1230": "오시 (11:30~13:29)",
      "1430": "미시 (13:30~15:29)",
      "1630": "신시 (15:30~17:29)",
      "1830": "유시 (17:30~19:29)",
      "2030": "술시 (19:30~21:29)",
      "2230": "해시 (21:30~23:29)",
      // HH:MM 형식도 지원
      "00:30": "자시 (23:30~01:29)",
      "02:30": "축시 (01:30~03:29)",
      "04:30": "인시 (03:30~05:29)",
      "06:30": "묘시 (05:30~07:29)",
      "08:30": "진시 (07:30~09:29)",
      "10:30": "사시 (09:30~11:29)",
      "12:30": "오시 (11:30~13:29)",
      "14:30": "미시 (13:30~15:29)",
      "16:30": "신시 (15:30~17:29)",
      "18:30": "유시 (17:30~19:29)",
      "20:30": "술시 (19:30~21:29)",
      "22:30": "해시 (21:30~23:29)",
    };
    if (timeMap[time]) return timeMap[time];
    // 시간대로 변환 시도
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

  const birthTime = formatTimeToSi(input?.time);

  // 일간 데이터
  const dmData = dayMaster?.char ? dayMasterLoveData[dayMaster.char] : null;

  // 신강/신약 레벨
  const strengthLevel =
    fiveElements?.strengthLevel || fiveElements?.strength || "중화";
  const strengthData =
    strengthLoveInterpretation[strengthLevel] ||
    strengthLoveInterpretation["중화"];

  // 오행 퍼센트 (렌더링에서 영문 키 wood/fire/earth/metal/water 사용)
  const hanjaPercent = loveFacts?.fiveElementsHanjaPercent;
  const elementPercent: Record<string, number> = hanjaPercent
    ? { wood: hanjaPercent["木"] || 0, fire: hanjaPercent["火"] || 0, earth: hanjaPercent["土"] || 0, metal: hanjaPercent["金"] || 0, water: hanjaPercent["水"] || 0 }
    : fiveElements?.percent || {};

  // 대운/연운/월운 스크롤 위치 설정 (현재 항목이 보이도록)
  useEffect(() => {
    const daeunData = (sajuData as Record<string, unknown>)?.daeun as Record<
      string,
      unknown
    >;
    const luckCyclesData = (sajuData as Record<string, unknown>)
      ?.luckCycles as Record<string, unknown>;
    const daeunFromLuckCycles = luckCyclesData?.daeun as Record<
      string,
      unknown
    >;
    const direction =
      daeunData?.direction || daeunFromLuckCycles?.direction || "";
    const isReverse = direction === "역행";

    const birthYear = data?.input?.date
      ? parseInt(data.input.date.split("-")[0])
      : 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentAge = birthYear ? currentYear - birthYear + 1 : 0;

    const daeunList = (daeunData?.list ||
      daeunFromLuckCycles?.list ||
      []) as Array<{
        startAge: number;
        endAge: number;
        ganZhi?: string;
      }>;
    const filteredDaeunList = daeunList.filter((d) => d.ganZhi);
    const displayList = isReverse
      ? [...filteredDaeunList].reverse()
      : filteredDaeunList;

    // 대운: 현재 대운이 보이도록
    if (daeunScrollRef.current) {
      const currentIdx = displayList.findIndex(
        (d) => currentAge >= d.startAge && currentAge <= d.endAge
      );
      if (currentIdx !== -1) {
        const cardWidth = 68;
        const containerWidth = daeunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(
          0,
          currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2
        );
        daeunScrollRef.current.scrollLeft = scrollPosition;
      }
    }

    // 연운: 현재 년도가 보이도록
    if (yeonunScrollRef.current) {
      const yeonunList =
        (luckCyclesData?.yeonun as Array<Record<string, unknown>>) || [];
      const displayYeonun = isReverse ? [...yeonunList].reverse() : yeonunList;
      const currentIdx = displayYeonun.findIndex(
        (yn) => (yn.year as number) === currentYear
      );
      if (currentIdx !== -1) {
        const cardWidth = 68;
        const containerWidth = yeonunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(
          0,
          currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2
        );
        yeonunScrollRef.current.scrollLeft = scrollPosition;
      }
    }

    // 월운: 현재 월이 보이도록
    if (wolunScrollRef.current) {
      const wolunList =
        (luckCyclesData?.wolun as Array<Record<string, unknown>>) || [];
      const displayWolun = isReverse ? [...wolunList].reverse() : wolunList;
      const currentIdx = displayWolun.findIndex(
        (wn) => (wn.month as number) === currentMonth
      );
      if (currentIdx !== -1) {
        const cardWidth = 50; // 월운 카드는 더 작음
        const containerWidth = wolunScrollRef.current.clientWidth;
        const scrollPosition = Math.max(
          0,
          currentIdx * cardWidth - containerWidth / 2 + cardWidth / 2
        );
        wolunScrollRef.current.scrollLeft = scrollPosition;
      }
    }
  }, [data, sajuData]);

  return (
    <div className={`${styles.report_card} ${styles.intro_card} ${styles.saju_card_simple}`}>
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
            {input?.date}
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
                    <td key={key} className={isDay ? "highlight" : ""}>
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
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p?.stem?.element) }}
                        >
                          {p?.stem?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
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
              <tr className={styles.row_jiji}>
                <td className={styles.row_label}>지지</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
                      <div className={styles.char_box}>
                        <span
                          className={styles.char_hanja}
                          style={{ color: getColor(p?.branch?.element) }}
                        >
                          {p?.branch?.char || "—"}
                        </span>
                        <span className={styles.char_korean}>
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
              <tr className={styles.row_sipsung_bottom}>
                <td className={styles.row_label}>십성</td>
                {(["hour", "day", "month", "year"] as const).map((key) => {
                  const p = pillars[key];
                  const isDay = key === "day";
                  return (
                    <td key={key} className={isDay ? "highlight" : ""}>
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
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>12신살</td>
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
                      className={`${isDay ? styles.highlight : ""} ${isSinsalHighlight ? styles.cell_sinsal_highlight : ""
                        }`}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
              {/* 신살 */}
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>신살</td>
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
                      className={`${styles.cell_sinsal} ${isDay ? styles.highlight : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className={styles.sinsal_vertical}>
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
              <tr className={styles.row_extra}>
                <td className={styles.row_label}>귀인</td>
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
                      className={`${styles.cell_gilsung} ${isDay ? styles.highlight : ""}`}
                    >
                      {allSinsal.length > 0 ? (
                        <div className={styles.gilsung_vertical}>
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
                  <span className={styles.split_korean}>{p?.stem?.korean || ""}</span>
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
                    {p?.branch?.korean || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 각 요소 연애 의미 설명 */}
        <div className={styles.saju_elements_meaning}>
          <p className={styles.elements_meaning_title}>
            각 요소가 연애에서 의미하는 것
          </p>
          <div className={styles.element_meaning_list}>
            <div className={styles.element_meaning_item}>
              <strong>천간(天干)</strong>
              <p>
                겉으로 드러나는 연애 스타일, 표현 방식. 상대에게 보여지는 나의
                모습이에요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>지지(地支)</strong>
              <p>
                내면의 욕구와 본능. 무의식적으로 끌리는 이상형, 진짜 원하는
                연애가 담겨 있어요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십성(十星)</strong>
              <p>
                나와 상대의 관계 패턴. 어떤 사람에게 끌리고, 어떤 연애를 하는지
                알 수 있어요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>십이운성(十二運星)</strong>
              <p>
                연애 에너지의 상태. 적극적인지 소극적인지, 연애운의 강약을
                나타내요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>12신살</strong>
              <p>
                연애에 영향을 주는 특별한 기운. 도화살은 이성에게 인기, 매력을
                뜻해요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
              <strong>신살(神殺)</strong>
              <p>
                특별한 사건이나 기운을 나타내요. 홍염살, 화개살 등 연애에 영향을
                주는 살이 있어요.
              </p>
            </div>
            <div className={styles.element_meaning_item}>
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
      <div className={styles.intro_section}>
        {/* 색동낭자 대화 - 연애 신살 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            참, 신살 중에는 연애와 관련된 것들도 있어요.
            <br />
            대표적인 3가지를 알려드릴게요.
          </p>
        </div>

        <div className={styles.love_sinsal_cards}>
          <div className={styles.love_sinsal_card}>
            <div className={styles.sinsal_card_header}>
              <strong>도화살(桃花殺)</strong>
            </div>
            <p className={styles.sinsal_meaning}>
              복숭아꽃 살. 이성을 끌어당기는 매력, 분위기, 인기를 뜻해요.
            </p>
            <div className={styles.sinsal_love_effect}>
              <span className={styles.effect_good}>
                이성에게 인기 많음, 연애 기회 많음
              </span>
              <span className={styles.effect_bad}>
                유혹에 약함, 복잡한 이성관계 주의
              </span>
            </div>
          </div>

          <div className={styles.love_sinsal_card}>
            <div className={styles.sinsal_card_header}>
              <strong>홍염살(紅艶殺)</strong>
            </div>
            <p className={styles.sinsal_meaning}>
              붉은 요염함. 도화살보다 더 강렬한 성적 매력, 관능미예요.
            </p>
            <div className={styles.sinsal_love_effect}>
              <span className={styles.effect_good}>
                강렬한 첫인상, 잊히지 않는 매력
              </span>
              <span className={styles.effect_bad}>
                애정 문제 복잡, 집착/질투 유발 가능
              </span>
            </div>
          </div>

          <div className={styles.love_sinsal_card}>
            <div className={styles.sinsal_card_header}>
              <strong>화개살(華蓋殺)</strong>
            </div>
            <p className={styles.sinsal_meaning}>
              꽃 덮개. 예술성, 감수성, 혼자만의 세계를 뜻해요.
            </p>
            <div className={styles.sinsal_love_effect}>
              <span className={styles.effect_good}>
                깊이 있는 사랑, 정신적 교감 중시
              </span>
              <span className={styles.effect_bad}>외로움을 잘 탐, 이상이 높음</span>
            </div>
          </div>
        </div>

        {/* 내가 가진 연애 신살 텍스트 표시 */}
        {(() => {
          const allSinsal: string[] = [];
          (["hour", "day", "month", "year"] as const).forEach((key) => {
            const byPillar = sajuData?.sinsal?._byPillar;
            const stemSinsal = byPillar?.[key]?.stem || [];
            const branchSinsal = byPillar?.[key]?.branch || [];
            allSinsal.push(...stemSinsal, ...branchSinsal);
            const twelveSinsal = pillars[key]?.twelveSinsal;
            if (typeof twelveSinsal === "string" && twelveSinsal === "도화살") {
              allSinsal.push("도화살");
            }
          });
          const hasDohwa = allSinsal.some((s) => s.includes("도화"));
          const hasHongyeom = allSinsal.some((s) => s.includes("홍염"));
          const hasHwagae = allSinsal.some((s) => s.includes("화개"));

          const mySinsalList: string[] = [];
          if (hasDohwa) mySinsalList.push("도화살");
          if (hasHongyeom) mySinsalList.push("홍염살");
          if (hasHwagae) mySinsalList.push("화개살");

          return (
            <div className={styles.nangja_comment} style={{ marginTop: "16px" }}>
              <p className={styles.nangja_text}>
                {mySinsalList.length > 0
                  ? `${userName}님은 ${mySinsalList.join(", ")}이 보이네요.`
                  : `${userName}님은 연애 신살이 없어요. 다른 요소들이 연애 스타일을 만들어줘요.`}
              </p>
            </div>
          );
        })()}
      </div>

      {/* 장면 5: 일간 강조 */}
      <div className={styles.intro_section}>
        {/* 색동낭자 대화 - 일간 설명 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            그리고 일주의 천간, 즉 &apos;일간&apos;은
            <br />
            {userName}님 자신을 나타내는 글자예요.
            <br />
            <br />
            사주를 해석할 때 가장 중심이 되는 부분이에요.
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
            <div className={styles.ilgan_love_box}>
              <p className={styles.ilgan_headline}>{dmData.headline}</p>
              <p className={styles.ilgan_summary}>{dmData.summary}</p>
              <div className={styles.ilgan_keywords}>
                {dmData.keywords.map((kw, i) => (
                  <span key={i} className={styles.ilgan_keyword}>
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 장면 7: 각 기둥별 관계 해석 */}
      <div className={styles.intro_section}>
        {/* 색동낭자 대화 - 기둥별 관계 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            그럼 이제 각 기둥이 어떤 의미를 갖는지 볼까요?
            <br />
            기둥마다 나타내는 관계가 달라요.
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
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed
                      }`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
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
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>년주(年柱)</span>
              <span className={styles.timing_period}>뿌리 · 조상, 부모</span>
            </div>
            <p className={styles.timing_desc}>
              나의 뿌리, 조상과 부모님, 그리고 사회적 배경을 나타내요.
            </p>
            <p className={styles.timing_love}>
              연애에서는: 가정환경이 연애관에 미친 영향
            </p>
          </div>

          <div className={styles.timing_card}>
            {/* 미니 사주표 - 월주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "month";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed
                      }`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
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
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>월주(月柱)</span>
              <span className={styles.timing_period}>줄기 · 형제, 사회</span>
            </div>
            <p className={styles.timing_desc}>
              나의 줄기, 부모님과 형제, 그리고 사회생활을 나타내요.
            </p>
            <p className={styles.timing_love}>
              연애에서는: 사회에서의 연애 (직장연애, 소개팅 등)
            </p>
          </div>

          <div className={`${styles.timing_card} ${styles.highlight}`}>
            {/* 미니 사주표 - 일주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "day";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed
                      }`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
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
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>일주(日柱)</span>
              <span className={styles.timing_period}>꽃 · 나, 배우자</span>
            </div>
            <p className={styles.timing_desc}>
              나의 꽃, 나 자신과 배우자를 나타내는 가장 중요한 자리예요.
            </p>
            <p className={styles.timing_love}>
              연애에서는: 가장 중요! 나의 연애 본질, 배우자 자리. 무의식적으로
              끌리는 이상형이 여기에!
            </p>
          </div>

          <div className={styles.timing_card}>
            {/* 미니 사주표 - 시주 강조 */}
            <div className={styles.mini_saju_table}>
              {(["hour", "day", "month", "year"] as const).map((key) => {
                const p = pillars[key];
                const isHighlight = key === "hour";
                return (
                  <div
                    key={key}
                    className={`${styles.mini_pillar} ${isHighlight ? styles.highlight : styles.dimmed
                      }`}
                  >
                    <span
                      className={styles.mini_stem}
                      style={{
                        color: isHighlight
                          ? getColor(p?.stem?.element)
                          : undefined,
                      }}
                    >
                      {p?.stem?.char || "—"}
                    </span>
                    <span
                      className={styles.mini_branch}
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
            <div className={styles.timing_header}>
              <span className={styles.timing_pillar}>시주(時柱)</span>
              <span className={styles.timing_period}>열매 · 자녀, 결실</span>
            </div>
            <p className={styles.timing_desc}>
              나의 열매, 자녀와 말년의 결실을 나타내요.
            </p>
            <p className={styles.timing_love}>
              연애에서는: 연애의 결과, 가정을 꾸린 후의 모습
            </p>
          </div>
        </div>
      </div>

      {/* 장면 8: 오행 */}
      <div className={styles.intro_section}>
        {/* 색동낭자 대화 - 오행 설명 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            기둥마다 색이 다르죠?
            <br />
            이게 목·화·토·금·수, 오행이에요.
            <br />
            <br />
            궁합에서 아주 중요해요.
            <br />
            상생하면 조화, 상극하면 갈등이거든요.
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
                pct >= 30
                  ? "과다"
                  : pct >= 10
                    ? "적정"
                    : pct > 0
                      ? "부족"
                      : "결핍";
              return (
                <div key={key} className={styles.ohang_bar_row}>
                  <span className={styles.ohang_label} style={{ color }}>
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

        {/* 나의 오행 분석 - 특징 + 과다/부족 통합 */}
        <div className={styles.ohang_analysis_section}>
          <p className={styles.ohang_section_title}>{userName}님의 오행 분석</p>
          {[
            {
              key: "wood",
              label: "목(木)",
              color: "#2aa86c",
              keyword: "성장 · 자유 · 솔직",
              baseDesc:
                "함께 성장하는 사랑을 원해요. 솔직하고 직진형이지만 구속을 싫어해요.",
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
              key: "fire",
              label: "화(火)",
              color: "#ff6a6a",
              keyword: "열정 · 표현 · 로맨틱",
              baseDesc:
                "뜨겁고 열정적인 사랑. 확실하게 표현하고 이벤트를 좋아해요.",
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
              key: "earth",
              label: "토(土)",
              color: "#caa46a",
              keyword: "안정 · 포용 · 믿음",
              baseDesc:
                "느리지만 확실한 사랑. 한번 마음 주면 변치 않고 묵묵히 지켜요.",
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
              key: "metal",
              label: "금(金)",
              color: "#a0a0a0",
              keyword: "원칙 · 깔끔 · 의리",
              baseDesc: "명확하고 깔끔한 관계. 쿨하고 약속을 중시해요.",
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
              key: "water",
              label: "수(水)",
              color: "#4a90d9",
              keyword: "감성 · 공감 · 배려",
              baseDesc:
                "감성적이고 깊은 사랑. 상대에게 맞춰주고 공감을 잘해요.",
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
              keyword,
              baseDesc,
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
              const isOver = status === "과다";
              const isNormal = status === "적정";
              return (
                <div key={key} className={styles.ohang_analysis_card}>
                  <div className={styles.ohang_analysis_header}>
                    <span className={styles.ohang_element} style={{ color }}>
                      {label}
                    </span>
                    <span className={styles.ohang_keyword}>{keyword}</span>
                  </div>
                  <p className={styles.ohang_base_desc}>{baseDesc}</p>
                  {!isNormal && (
                    <>
                      <p className={styles.ohang_analysis_title}>
                        <span className={`${styles.ohang_status_badge} ${styles[status]}`}>
                          {isOver
                            ? "과다"
                            : status === "결핍"
                              ? "결핍"
                              : "부족"}
                        </span>
                        → {isOver ? overTitle : lackTitle}
                      </p>
                      <p className={styles.ohang_analysis_desc}>
                        {isOver ? overDesc : lackDesc}
                      </p>
                      <p className={styles.ohang_analysis_advice}>
                        💡 {isOver ? overAdvice : lackAdvice}
                      </p>
                    </>
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* 오행 궁합 설명 */}
        <div className={styles.nangja_comment} style={{ marginTop: "16px" }}>
          <p className={styles.nangja_text}>
            내가 부족한 오행을 상대가 채워주면 좋은 궁합,
            <br />
            같은 게 과다하면 부딪힐 수 있어요.
          </p>
        </div>

        {/* 오행 궁합 - 상생/상극 */}
        <div className={styles.ohang_compatibility_section}>
          <p className={styles.ohang_section_title}>오행 궁합표</p>
          <div className={styles.ohang_compat_cards}>
            <div className={`${styles.ohang_compat_card} ${styles.good}`}>
              <p className={styles.compat_card_title}>잘 맞는 궁합 (상생)</p>
              <p className={styles.compat_card_subtitle}>서로를 도와주는 관계</p>
              <div className={styles.compat_list}>
                <div className={styles.compat_item}>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className={styles.compat_arrow}>→</span>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className={styles.compat_desc}>지지하고 키워주는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className={styles.compat_arrow}>→</span>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className={styles.compat_desc}>열정에 불을 지펴주는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className={styles.compat_arrow}>→</span>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className={styles.compat_desc}>따뜻하게 안정시키는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className={styles.compat_arrow}>→</span>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className={styles.compat_desc}>든든히 받쳐주는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className={styles.compat_arrow}>→</span>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className={styles.compat_desc}>방향을 잡아주는 관계</span>
                </div>
              </div>
            </div>
            <div className={`${styles.ohang_compat_card} ${styles.bad}`}>
              <p className={styles.compat_card_title}>주의할 궁합 (상극)</p>
              <p className={styles.compat_card_subtitle}>부딪히기 쉬운 관계</p>
              <div className={styles.compat_list}>
                <div className={styles.compat_item}>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className={`${styles.compat_arrow} ${styles.bad}`}>⚡</span>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className={styles.compat_desc}>비판하고 깎아내리는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#2aa86c" }}>목</span>
                  <span className={`${styles.compat_arrow} ${styles.bad}`}>⚡</span>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className={styles.compat_desc}>안정을 흔드는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#caa46a" }}>토</span>
                  <span className={`${styles.compat_arrow} ${styles.bad}`}>⚡</span>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className={styles.compat_desc}>감정 흐름을 막는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#4a90d9" }}>수</span>
                  <span className={`${styles.compat_arrow} ${styles.bad}`}>⚡</span>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className={styles.compat_desc}>열정을 꺼뜨리는 관계</span>
                </div>
                <div className={styles.compat_item}>
                  <span style={{ color: "#ff6a6a" }}>화</span>
                  <span className={`${styles.compat_arrow} ${styles.bad}`}>⚡</span>
                  <span style={{ color: "#a0a0a0" }}>금</span>
                  <span className={styles.compat_desc}>원칙을 무너뜨리는 관계</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 장면 9: 신강신약 */}
      <div className={styles.intro_section}>
        {/* 색동낭자 대화 - 신강신약 전 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            마지막으로, {userName}님의 에너지가
            <br />
            강한지 약한지도 살펴볼게요.
          </p>
        </div>

        <h3 className={styles.intro_section_title}>신강신약</h3>
        <p className={styles.intro_section_subtitle}>연애 주도권의 척도</p>

        <div className={styles.intro_section_content}>
          <p>
            신강/신약은 일간의 힘이 얼마나 강한지를 나타내요. 연애에서는{" "}
            <strong>주도권</strong>과 관련이 깊어요.
          </p>
        </div>

        <div className={styles.strength_gauge_card}>
          <div className={styles.gauge_labels}>
            {["극신약", "태약", "신약", "중화", "신강", "태강", "극신강"].map(
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
          <div className={styles.gauge_track}>
            {["극신약", "태약", "신약", "중화", "신강", "태강", "극신강"].map(
              (level) => (
                <div
                  key={level}
                  className={`${styles.gauge_dot} ${level === strengthLevel ? styles.active : ""
                    }`}
                />
              )
            )}
          </div>
          <p className={styles.strength_result_text}>
            일간{" "}
            <strong style={{ color: getColor(dayMaster?.element) }}>
              {dayMaster?.char}
            </strong>
            , <strong>{strengthLevel}</strong>
          </p>
        </div>

        {/* 상세 해석 카드 */}
        <div className={styles.strength_detail_card}>
          <p className={styles.strength_detail_title}>{strengthData.title}</p>
          <p className={styles.strength_detail_ratio}>{strengthData.mainRatio}</p>

          {/* 표 형태로 정리 */}
          <table className={styles.strength_detail_table}>
            <tbody>
              <tr>
                <th>연애 특징</th>
                <td>{strengthData.traits.join(", ")}</td>
              </tr>
              <tr>
                <th>자주 하는 말</th>
                <td>
                  {strengthData.pattern.map((p, i) => (
                    <span key={i} className={styles.pattern_quote}>
                      {p}
                    </span>
                  ))}
                </td>
              </tr>
              {strengthData.goodPoints.length > 0 && (
                <tr className={styles.good_row}>
                  <th>장점</th>
                  <td>{strengthData.goodPoints.join(", ")}</td>
                </tr>
              )}
              {strengthData.warning.length > 0 && (
                <tr className={styles.warning_row}>
                  <th>주의할 점</th>
                  <td>{strengthData.warning.join(", ")}</td>
                </tr>
              )}
              <tr className={styles.ideal_row}>
                <th>잘 맞는 상대</th>
                <td>{strengthData.idealType}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 장면 10: 마무리 전환 */}
      <div className={`${styles.intro_section} ${styles.saju_outro_section}`}>
        {/* 사주 원국 마무리 */}
        <div className={styles.nangja_comment}>
          <p className={styles.nangja_text}>
            여기까지가 {userName}님의 기본 사주 원국이에요.
            <br />
            <br />
            하지만 제대로 된 분석을 위해선
            <br />더 많은 요소들을 함께 봐야 해요.
          </p>
        </div>

        {/* 대운/연운/월운 상세 표시 */}
        <div className={styles.luck_cycles_wrap}>
          {/* 대운수 헤더 */}
          {(() => {
            const daeunData = (sajuData as Record<string, unknown>)
              ?.daeun as Record<string, unknown>;
            const luckCyclesData = (sajuData as Record<string, unknown>)
              ?.luckCycles as Record<string, unknown>;
            const daeunFromLuckCycles = luckCyclesData?.daeun as Record<
              string,
              unknown
            >;
            const direction =
              daeunData?.direction || daeunFromLuckCycles?.direction || "";
            const isReverse = direction === "역행";

            // 현재 나이 계산
            const birthYear = data?.input?.date
              ? parseInt(data.input.date.split("-")[0])
              : 0;
            const currentYear = new Date().getFullYear();
            const currentAge = birthYear ? currentYear - birthYear + 1 : 0;

            // 현재 대운 찾기
            const daeunList = (daeunData?.list ||
              daeunFromLuckCycles?.list ||
              []) as Array<{
                index?: number;
                startAge: number;
                endAge: number;
                ganZhi?: string;
                ganZhiKor?: string;
              }>;
            const currentDaeun = daeunList.find(
              (d) => currentAge >= d.startAge && currentAge <= d.endAge
            );

            return (
              <>
                {/* 대운 */}
                <div className={styles.luck_section}>
                  <h5 className={styles.luck_section_title}>대운</h5>
                  <div className={styles.luck_scroll_wrap} ref={daeunScrollRef}>
                    <div
                      className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}
                    >
                      {(isReverse ? [...daeunList].reverse() : daeunList)
                        .filter((dy) => dy.ganZhi)
                        .map((dy, idx) => {
                          const ganZhi = dy.ganZhi || "";
                          const stem = ganZhi[0] || "";
                          const branch = ganZhi[1] || "";
                          const stemElement = getStemElement(stem);
                          const branchElement = getBranchElement(branch);
                          const daeunItem = (
                            daeunFromLuckCycles?.list as Array<
                              Record<string, unknown>
                            >
                          )?.[isReverse ? daeunList.length - 1 - idx : idx];
                          const tenGodStem =
                            (daeunItem?.tenGodStem as string) || "";
                          const twelveStage =
                            (daeunItem?.twelveStage as string) || "";
                          const isCurrentDaeun = dy === currentDaeun;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card} ${isCurrentDaeun ? styles.current : ""
                                }`}
                            >
                              <div className={styles.luck_card_top}>
                                <span className={styles.luck_card_age}>
                                  {dy.startAge}
                                </span>
                                <span className={styles.luck_card_tengod}>
                                  {tenGodStem || "-"}
                                </span>
                              </div>
                              <div
                                className={`${styles.luck_card_stem} ${styles["elem_" + stemElement]}`}
                              >
                                <span className={styles.char_hanja}>{stem}</span>
                                <span className={styles.char_korean}>
                                  {getStemKorean(stem)}
                                </span>
                              </div>
                              <div
                                className={`${styles.luck_card_branch} ${styles["elem_" + branchElement]}`}
                              >
                                <span className={styles.char_hanja}>{branch}</span>
                                <span className={styles.char_korean}>
                                  {getBranchKorean(branch)}
                                </span>
                              </div>
                              <div className={styles.luck_card_bottom}>
                                <span className={styles.luck_card_tengod_branch}>
                                  {(daeunItem?.tenGodBranch as string) || "-"}
                                </span>
                                <span className={styles.luck_card_stage}>
                                  {twelveStage || "-"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* 연운 */}
                {luckCyclesData?.yeonun && (
                  <div className={styles.luck_section}>
                    <h5 className={styles.luck_section_title}>연운</h5>
                    <div className={styles.luck_scroll_wrap} ref={yeonunScrollRef}>
                      <div
                        className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}
                      >
                        {(isReverse
                          ? [
                            ...(luckCyclesData.yeonun as Array<
                              Record<string, unknown>
                            >),
                          ].reverse()
                          : (luckCyclesData.yeonun as Array<
                            Record<string, unknown>
                          >)
                        ).map((yn, idx) => {
                          const ganZhi = (yn.ganZhi as string) || "";
                          const stem = ganZhi[0] || "";
                          const branch = ganZhi[1] || "";
                          const stemElement = getStemElement(stem);
                          const branchElement = getBranchElement(branch);
                          const isCurrentYear = yn.year === currentYear;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card} ${isCurrentYear ? styles.current : ""
                                }`}
                            >
                              <div className={styles.luck_card_top}>
                                <span className={styles.luck_card_year}>
                                  {String(yn.year)}
                                </span>
                                <span className={styles.luck_card_tengod}>
                                  {(yn.tenGodStem as string) || "-"}
                                </span>
                              </div>
                              <div
                                className={`${styles.luck_card_stem} ${styles["elem_" + stemElement]}`}
                              >
                                <span className={styles.char_hanja}>{stem}</span>
                                <span className={styles.char_korean}>
                                  {getStemKorean(stem)}
                                </span>
                              </div>
                              <div
                                className={`${styles.luck_card_branch} ${styles["elem_" + branchElement]}`}
                              >
                                <span className={styles.char_hanja}>{branch}</span>
                                <span className={styles.char_korean}>
                                  {getBranchKorean(branch)}
                                </span>
                              </div>
                              <div className={styles.luck_card_bottom}>
                                <span className={styles.luck_card_tengod_branch}>
                                  {(yn.tenGodBranch as string) || "-"}
                                </span>
                                <span className={styles.luck_card_stage}>
                                  {(yn.twelveStage as string) || "-"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 월운 */}
                {luckCyclesData?.wolun && (
                  <div className={styles.luck_section}>
                    <h5 className={styles.luck_section_title}>월운</h5>
                    <div className={styles.luck_scroll_wrap} ref={wolunScrollRef}>
                      <div
                        className={`${styles.luck_scroll} ${isReverse ? styles.reverse : ""}`}
                      >
                        {(isReverse
                          ? [
                            ...(luckCyclesData.wolun as Array<
                              Record<string, unknown>
                            >),
                          ].reverse()
                          : (luckCyclesData.wolun as Array<
                            Record<string, unknown>
                          >)
                        ).map((wn, idx) => {
                          const currentMonth = new Date().getMonth() + 1;
                          const isCurrentMonth = wn.month === currentMonth;

                          return (
                            <div
                              key={idx}
                              className={`${styles.luck_card_mini} ${isCurrentMonth ? styles.current : ""
                                }`}
                            >
                              <span className={styles.luck_mini_month}>
                                {String(wn.month)}월
                              </span>
                              <span className={styles.luck_mini_tengod}>
                                {(wn.tenGodStem as string) || "-"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* 추가 정보 미니 섹션 - 위에서 안 보여주는 것들만 */}
                <div className={styles.extra_info_mini}>
                  {/* 태원/명궁/신궁 */}
                  <div className={styles.extra_info_row}>
                    <span className={styles.extra_label}>태원/명궁/신궁</span>
                    <div className={styles.extra_values}>
                      <span className={styles.extra_ganzi}>
                        {String(
                          (
                            (sajuData as Record<string, unknown>)
                              ?.taiYuan as Record<string, unknown>
                          )?.ganZhi || "-"
                        )}
                      </span>
                      <span className={styles.extra_ganzi}>
                        {String(
                          (
                            (sajuData as Record<string, unknown>)
                              ?.mingGong as Record<string, unknown>
                          )?.ganZhi || "-"
                        )}
                      </span>
                      <span className={styles.extra_ganzi}>
                        {String(
                          (
                            (sajuData as Record<string, unknown>)
                              ?.shenGong as Record<string, unknown>
                          )?.ganZhi || "-"
                        )}
                      </span>
                    </div>
                    <span className={styles.extra_usage}>선천기질·운명</span>
                  </div>
                  {/* 득력 */}
                  <div className={styles.extra_info_row}>
                    <span className={styles.extra_label}>득력</span>
                    <div className={styles.extra_values}>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukryung
                            ? styles.on
                            : ""
                          }`}
                      >
                        령
                      </span>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukji
                            ? styles.on
                            : ""
                          }`}
                      >
                        지
                      </span>
                      <span
                        className={`${styles.extra_indicator} ${styles.small} ${(fiveElements as Record<string, unknown>)?.deukse
                            ? styles.on
                            : ""
                          }`}
                      >
                        세
                      </span>
                    </div>
                    <span className={styles.extra_usage}>연애주도권</span>
                  </div>
                  {/* 납음(일주) */}
                  {(() => {
                    const nayinData = (sajuData as Record<string, unknown>)
                      ?.nayin as Record<string, string> | undefined;
                    const dayNayin = nayinData?.day;
                    return dayNayin ? (
                      <div className={styles.extra_info_row}>
                        <span className={styles.extra_label}>납음(일주)</span>
                        <div className={styles.extra_values}>
                          <span className={styles.extra_text}>{dayNayin}</span>
                        </div>
                        <span className={styles.extra_usage}>배우자 심층</span>
                      </div>
                    ) : null;
                  })()}
                  {/* 배우자성 - 남:재성(정재/편재), 여:관성(정관/편관) */}
                  {(() => {
                    const loveFactsData = (sajuData as Record<string, unknown>)
                      ?.loveFacts as Record<string, unknown> | undefined;
                    const spouseStars = loveFactsData?.spouseStars as
                      | Record<string, unknown>
                      | undefined;
                    const hitCount = spouseStars?.hitCount as
                      | number
                      | undefined;
                    const positions = spouseStars?.positions as
                      | string[]
                      | undefined;
                    const targetStars = spouseStars?.targetStars as
                      | string[]
                      | undefined;

                    // 영어 → 한글 변환 및 시→일→월→년 순서 정렬
                    const positionMap: Record<string, string> = {
                      hour: "시",
                      day: "일",
                      month: "월",
                      year: "년",
                    };
                    const positionOrder = ["hour", "day", "month", "year"];
                    const sortedPositions = positions
                      ? positionOrder
                        .filter((p) => positions.includes(p))
                        .map((p) => positionMap[p])
                      : [];

                    return (
                      <div className={styles.extra_info_row}>
                        <span className={styles.extra_label}>배우자성</span>
                        <div className={styles.extra_values}>
                          {targetStars && targetStars.length > 0 && (
                            <span className={styles.extra_text}>
                              {targetStars.join("/")}
                            </span>
                          )}
                          <span className={styles.extra_count}>
                            {hitCount !== undefined ? `${hitCount}개` : "-"}
                          </span>
                          {sortedPositions.length > 0 && (
                            <span className={styles.extra_positions}>
                              ({sortedPositions.join("/")})
                            </span>
                          )}
                        </div>
                        <span className={styles.extra_usage}>연애기회·관심</span>
                      </div>
                    );
                  })()}
                </div>
              </>
            );
          })()}
        </div>

        {/* 분석 기반 설명 - 마지막 강조 멘트 */}
        <div className={`${styles.nangja_comment} ${styles.nangja_final}`}>
          <p className={styles.nangja_text}>
            <span className={styles.nangja_question}>
              점점 사주가 어려워지지 않나요?
            </span>
          </p>
          <p className={`${styles.nangja_text} ${styles.nangja_reassure}`}>
            걱정 마세요.
            <br />
            사주 전문가들과 함께 만들고 검증한
            <br />
            색동낭자가 이 모든 걸 종합해서
            <br />
            <strong>{userName}님만의 연애 보고서</strong>를 만들어 드릴게요.
          </p>
        </div>

        {/* 보고서 목차 */}
        <div className={styles.report_toc_card}>
          {/* 1장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>1장</span>
              <h3 className={styles.toc_chapter_title}>
                나만의 매력과
                <br />
                연애 성향
              </h3>
            </div>
            <ul className={styles.toc_list}>
              <li>
                풀이 1&nbsp;&nbsp;처음 본 순간 이성이 느끼는 나의 매력
                <br />
                <span className={styles.toc_sub}>
                  - 겉으로 보이는 모습과 내면의 반전
                </span>
              </li>
              <li>
                풀이 2&nbsp;&nbsp;내 연애 스타일 장점과 숨겨진 반전 매력
                <br />
                <span className={styles.toc_sub}>
                  - 오래 만날수록 빠지게 되는 포인트
                </span>
              </li>
              <li>
                풀이 3&nbsp;&nbsp;인만추 vs 자만추 vs 결정사, 나에게 맞는 방식은
                <br />
                <span className={styles.toc_sub}>
                  - 성공 확률 높은 만남 방식과 실전 팁
                </span>
              </li>
              <li>
                풀이 4&nbsp;&nbsp;내가 끌리는 사람 vs 나에게 끌리는 사람
                <br />
                <span className={styles.toc_sub}>
                  - 어떤 사람을 만나야 행복하게 연애할 수 있을까?
                </span>
              </li>
            </ul>
          </div>

          {/* 2장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>2장</span>
              <h3 className={styles.toc_chapter_title}>
                앞으로 펼쳐질
                <br />
                사랑의 흐름
              </h3>
            </div>
            <ul className={styles.toc_list}>
              <li>
                풀이 1&nbsp;&nbsp;올해의 연애 총운 흐름
                <br />
                <span className={styles.toc_sub}>- 연애 활발기 vs 조용기 구분</span>
              </li>
              <li>
                풀이 2&nbsp;&nbsp;앞으로 3년간 연애 기회가 오는 시기
                <br />
                <span className={styles.toc_sub}>
                  - 인연이 집중되는 달과 상대의 특징
                </span>
              </li>
              <li>
                풀이 3&nbsp;&nbsp;이번 달 주차별 연애 운세
                <br />
                <span className={styles.toc_sub}>- 이성 기운이 들어오는 타이밍</span>
              </li>
            </ul>
          </div>

          {/* 3장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>3장</span>
              <h3 className={styles.toc_chapter_title}>
                결국 만나게 될<br />
                운명의 상대
              </h3>
            </div>
            <ul className={styles.toc_list}>
              <li>
                풀이 1&nbsp;&nbsp;운명의 상대, 그 사람의 외모와 성격
                <br />
                <span className={styles.toc_sub}>- 길에서 마주친 것처럼 생생하게</span>
              </li>
              <li>
                풀이 2&nbsp;&nbsp;그 사람을 만나는 시기와 장소
                <br />
                <span className={styles.toc_sub}>- 영화의 한 장면처럼 묘사</span>
              </li>
              <li>
                풀이 3&nbsp;&nbsp;그 사람 마음 사로잡는 공략법
                <br />
                <span className={styles.toc_sub}>
                  - 나만의 무기를 활용한 맞춤 전략
                </span>
              </li>
              <li>
                풀이 4&nbsp;&nbsp;이별 위기 극복법
                <br />
                <span className={styles.toc_sub}>- 위험 패턴과 회복 필살기</span>
              </li>
            </ul>
          </div>

          {/* 보너스 */}
          <div className={`${styles.toc_chapter} ${styles.bonus}`}>
            <div className={styles.toc_chapter_header}>
              <span className={`${styles.toc_chapter_num} ${styles.bonus}`}>보너스</span>
              <h3 className={styles.toc_chapter_title}>운명의 상대 이미지</h3>
            </div>
          </div>

          {/* 4장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>4장</span>
              <h3 className={styles.toc_chapter_title}>
                운명으로 착각하는
                <br />
                가짜 인연
              </h3>
            </div>
            <ul className={styles.toc_list}>
              <li>
                풀이 1&nbsp;&nbsp;내가 약해지는 위험 유형 2가지
                <br />
                <span className={styles.toc_sub}>
                  - 왜 유독 그런 타입에게 끌리는지
                </span>
              </li>
              <li>
                풀이 2&nbsp;&nbsp;운명이라 착각하는 이유
                <br />
                <span className={styles.toc_sub}>
                  - 첫 만남의 끌림, 그 정체를 폭로
                </span>
              </li>
              <li>
                풀이 3&nbsp;&nbsp;진짜 vs 가짜 구별법
                <br />
                <span className={styles.toc_sub}>- 구체적인 필터링 체크 포인트</span>
              </li>
            </ul>
          </div>

          {/* 보너스: 피해야 할 인연 */}
          <div className={`${styles.toc_chapter} ${styles.bonus}`}>
            <div className={styles.toc_chapter_header}>
              <span className={`${styles.toc_chapter_num} ${styles.bonus}`}>보너스</span>
              <h3 className={styles.toc_chapter_title}>피해야 할 인연 이미지</h3>
            </div>
          </div>

          {/* 5장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>5장</span>
              <h3 className={styles.toc_chapter_title}>
                누구에게도 말 못할,
                <br />
                19금 사주 풀이
              </h3>
            </div>
            <ul className={styles.toc_list}>
              <li>
                풀이 1&nbsp;&nbsp;낮과 밤이 다른 성적 매력
                <br />
                <span className={styles.toc_sub}>- 낮저밤이? 낮이밤저? 나의 갭</span>
              </li>
              <li>
                풀이 2&nbsp;&nbsp;은밀한 성감대
                <br />
                <span className={styles.toc_sub}>- 본인도 몰랐던 민감 포인트</span>
              </li>
              <li>
                풀이 3&nbsp;&nbsp;나를 만족시킬 상대 조건
                <br />
                <span className={styles.toc_sub}>
                  - 리드/팔로우, 템포, 킬링 포인트
                </span>
              </li>
            </ul>
          </div>

          {/* 6장 */}
          <div className={styles.toc_chapter}>
            <div className={styles.toc_chapter_header}>
              <span className={styles.toc_chapter_num}>6장</span>
              <h3 className={styles.toc_chapter_title}>색동낭자의 귀띔</h3>
            </div>
            <ul className={styles.toc_list}>
              <li>{userName}님의 고민에 대한 사주 기반 맞춤 조언</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 분석 대기 카드
function WaitingCard({
  userName,
  isComplete,
  onTransition,
  analysisStartedAt,
}: {
  userName: string;
  isComplete?: boolean;
  onTransition?: () => void;
  analysisStartedAt?: string; // ISO 시간 문자열
}) {
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isInitialAnimating, setIsInitialAnimating] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 분석 시작 시간 계산 (전달받은 시간 또는 현재 시간)
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
      setIsInitialAnimating(true);
      const animationDuration = 800; // 0.8초 동안 초기값까지 채우기
      const animationStart = Date.now();

      const animateInitial = () => {
        const animElapsed = Date.now() - animationStart;
        const animRatio = Math.min(animElapsed / animationDuration, 1);
        // easeOutCubic
        const animEased = 1 - Math.pow(1 - animRatio, 3);
        const currentProgress = Math.floor(animEased * targetInitialProgress);
        setProgress(currentProgress);

        if (animRatio < 1) {
          requestAnimationFrame(animateInitial);
        } else {
          setIsInitialAnimating(false);
          // 초기 애니메이션 완료 후 정상 업데이트 시작
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

        // 이징 함수: 처음엔 빠르고 점점 느려짐 (easeOutQuart)
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

      // 현재 진행률에서 100%까지 빠르게 채우기
      const animateTo100 = () => {
        const duration = 500; // 0.5초 동안 100%까지
        const startProgress = progress;
        const startTime = Date.now();

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const ratio = Math.min(elapsed / duration, 1);
          const newProgress = Math.floor(
            startProgress + (100 - startProgress) * ratio
          );
          setProgress(newProgress);

          if (ratio < 1) {
            requestAnimationFrame(animate);
          } else {
            // 100% 도달 후 1초 뒤 전환
            setTimeout(() => {
              onTransition?.();
            }, 1000);
          }
        };

        requestAnimationFrame(animate);
      };

      animateTo100();
    }
  }, [isComplete, isTransitioning, progress, onTransition]);

  return (
    <div className={`${styles.report_card} ${styles.waiting_card}`}>
      <div className={styles.waiting_content}>
        <div className={styles.waiting_progress_wrap}>
          <div className={styles.waiting_progress_bar}>
            <div
              className={styles.waiting_progress_fill}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={styles.waiting_progress_text}>{progress}%</span>
        </div>
        <h2 className={styles.waiting_title}>보고서 작성 중...</h2>
        <p className={styles.waiting_text}>
          색동낭자가 {userName}님의
          <br />
          연애 사주를 열심히 분석하고 있어요.
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

// 들어가며 인트로 카드
function IntroCard({ userName }: { userName: string }) {
  return (
    <div className={`${styles.report_card} ${styles.intro_card}`}>
      {/* 장면 1: 인사 */}
      <div className={`${styles.intro_section} ${styles.intro_welcome}`}>
        <p className={styles.welcome_main}>어서 오세요</p>
        <p className={styles.welcome_sub}>양반가에 오신 것을 환영해요</p>
        <div className={styles.welcome_divider}>❀</div>
        <p className={styles.welcome_text}>
          저는 이곳에서 연애 사주를 봐드리는 <strong>색동낭자</strong>예요.
        </p>
        <p className={styles.welcome_text}>
          미래가 궁금해서, 마음속 고민이 쉽게 풀리지 않아서, 혹은 인생의 중요한
          갈림길 앞에서 방향을 찾고 싶어서... 이런 여러 가지 이유로 양반가에
          오셨겠죠?
        </p>
        <p className={styles.welcome_text}>
          그렇다면 정말 잘 찾아오셨어요. {userName}님의 사주 속에는 이미 수많은
          힌트와 가능성들이 담겨 있어요.
        </p>
        <p className={styles.welcome_text}>
          제가 사주라는 지도를 함께 펼치고, {userName}님이 걸어갈 인생의 길을
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
              나를 이해하고, 더 나은 선택을 할 수 있게 도와주는 삶의 지도
            </strong>
            라고 보시면 좋아요.
          </p>
          <p>나도 몰랐던 내 안의 가능성과 흐름을 발견하게 되니까요.</p>
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
            <div className={`${styles.ohang_node} ${styles.wood} ${styles["left-top"]}`}>
              <span className={styles.ohang_label}>목</span>
              <span className={styles.ohang_desc}>성장</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.earth} ${styles["right-top"]}`}>
              <span className={styles.ohang_label}>토</span>
              <span className={styles.ohang_desc}>안정</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.water} ${styles["left-bottom"]}`}>
              <span className={styles.ohang_label}>수</span>
              <span className={styles.ohang_desc}>지혜</span>
            </div>
            <div className={`${styles.ohang_node} ${styles.metal} ${styles["right-bottom"]}`}>
              <span className={styles.ohang_label}>금</span>
              <span className={styles.ohang_desc}>원칙</span>
            </div>
          </div>
          <div className={styles.ohang_relations}>
            <p className={`${styles.ohang_relation} ${styles.saeng}`}>
              <span className={styles.relation_label}>생(生)</span>목 → 화 → 토 → 금 →
              수 → 목
            </p>
            <p className={`${styles.ohang_relation} ${styles.geuk}`}>
              <span className={styles.relation_label}>극(剋)</span>목 → 토 → 수 → 화 →
              금 → 목
            </p>
          </div>
        </div>

        <div className={styles.intro_section_content}>
          <p className={styles.intro_note}>
            이 다섯 가지 기운의 조합과 균형이 바로 {userName}님의 성격과 연애
            스타일을 만들어요.
          </p>
        </div>
      </div>

      {/* 장면 7: 일주 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>연애의 열쇠, 일주</h3>
        <p className={styles.intro_section_subtitle}>사주에서 가장 중요한 기둥</p>

        <div className={styles.intro_section_content}>
          <p>
            자, 이제 중요한 이야기를 해볼게요. 사주의 네 기둥 중에서 연애를 볼
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
          <p>일주는 태어난 '날'의 기둥인데요, 사주에서 '나 자신'을 의미해요.</p>
          <p>
            특히 일주의 아랫글자, <strong>일지(日支)</strong>는 '배우자
            자리'라고도 불러요.
          </p>
          <p className={styles.intro_note}>
            내 마음 깊은 곳에서 원하는 이상형, 무의식적으로 끌리는 사람의 유형,
            연애할 때 나도 모르게 나오는 습관... 이런 것들이 모두 일주에 담겨
            있답니다.
          </p>
        </div>
      </div>

      {/* 장면 8: 사주를 알면 무엇이 좋을까? */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>사주를 알면</h3>
        <p className={styles.intro_section_subtitle}>무엇이 좋을까요?</p>

        <div className={styles.intro_section_content}>
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
          <p className={styles.intro_note}>
            특히 인생에서 중요한 시기를 맞이했을 때, 내가 가진 사주를 바탕으로
            흐름을 읽고 대비한다면 훨씬 안정적이고 후회 없는 결정을 내릴 수
            있어요. 사주는 그렇게, 지금의 나와 앞으로의 나를 잇는 다리 역할을
            해준답니다.
          </p>
        </div>
      </div>

      {/* 장면 7: 색동낭자의 약속 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>색동낭자의 약속</h3>

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
            좋은 운은 더 크게 살리고, 어려운 운은 지혜롭게 피할 수 있도록,
            무엇보다 {userName}님이 스스로를 더 사랑하고 이해할 수 있도록
            도와드릴게요.
          </p>
        </div>
      </div>

      {/* 장면 8: 보고서 안내 */}
      <div className={styles.intro_section}>
        <h3 className={styles.intro_section_title}>보고서 안내</h3>

        <div className={styles.intro_section_content}>
          <p>
            이 보고서는 총 <strong>6개의 장</strong>으로 구성되어 있어요.
          </p>
          <div className={styles.intro_chapters_list}>
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
      <div className={`${styles.intro_section} ${styles.intro_transition}`}>
        <div className={styles.intro_section_content}>
          <p className={styles.transition_text}>
            그럼 이제, 색동낭자와 함께 {userName}님의 사주를 펼쳐볼까요?
          </p>
        </div>
      </div>
    </div>
  );
}

// 리뷰 섹션 컴포넌트
function ReviewSection({
  recordId,
  userName,
}: {
  recordId: string;
  userName: string;
}) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  // 이미 리뷰를 남겼는지 확인
  useEffect(() => {
    const checkExistingReview = async () => {
      const review = await getReviewByRecordId("saju_love", recordId);
      if (review) {
        setExistingReview(review);
        setSubmitted(true);
      }
    };
    checkExistingReview();
  }, [recordId]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    const review = await createReview({
      service_type: "saju_love",
      record_id: recordId,
      user_name: displayName || "익명",
      rating,
      content: content.trim(),
      is_public: true,
    });

    if (review) {
      setExistingReview(review);
      setSubmitted(true);
    }
    setIsSubmitting(false);
  };

  // 이미 리뷰를 남긴 경우
  if (submitted && existingReview) {
    return (
      <div className={`${styles.review_section} ${styles.review_submitted}`}>
        <div className={styles.review_thank_you}>
          <span className={styles.review_check_icon}>✓</span>
          <p className={styles.review_thank_text}>소중한 후기 감사합니다!</p>
          <div className={styles.review_submitted_content}>
            <div className={styles.review_stars_display}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`${styles.star} ${star <= existingReview.rating ? styles.filled : ""
                    }`}
                >
                  ★
                </span>
              ))}
            </div>
            <p className={styles.review_text_display}>{existingReview.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.review_section}>
      <div className={styles.review_header}>
        <h4 className={styles.review_title}>색동낭자에게 후기를 남겨주세요</h4>
        <p className={styles.review_subtitle}>
          {userName}님의 소중한 의견이 더 나은 서비스를 만듭니다
        </p>
      </div>

      {/* 별점 */}
      <div className={styles.review_rating}>
        <p className={styles.rating_label}>만족도</p>
        <div className={styles.rating_stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`${styles.star_btn} ${star <= rating ? styles.active : ""}`}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 리뷰 내용 */}
      <div className={styles.review_content_input}>
        <textarea
          className={styles.review_textarea}
          placeholder="연애 사주 리포트는 어떠셨나요? 솔직한 후기를 남겨주세요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
        />
        <span className={styles.review_char_count}>{content.length}/500</span>
      </div>

      {/* 닉네임 */}
      <div className={styles.review_name_input}>
        <input
          type="text"
          className={styles.review_name_field}
          placeholder="닉네임 (선택)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={20}
        />
      </div>

      {/* 제출 버튼 */}
      <button
        className={styles.review_submit_btn}
        onClick={handleSubmit}
        disabled={isSubmitting || !content.trim()}
      >
        {isSubmitting ? "등록 중..." : "후기 남기기"}
      </button>
    </div>
  );
}

// 리뷰 모달 컴포넌트
function ReviewModal({
  recordId,
  userName,
  onClose,
}: {
  recordId: string;
  userName: string;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [displayName, setDisplayName] = useState(userName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    const review = await createReview({
      service_type: "saju_love",
      record_id: recordId,
      user_name: displayName || "익명",
      rating,
      content: content.trim(),
      is_public: true,
    });

    if (review) {
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <div className={styles.review_modal_overlay} onClick={onClose}>
      <div className={styles.review_modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.review_modal_close} onClick={onClose}>
          ✕
        </button>

        <div className={styles.review_modal_header}>
          <h3 className={styles.review_modal_title}>색동낭자에게 후기 남기기</h3>
          <p className={styles.review_modal_subtitle}>
            {userName}님의 소중한 의견을 들려주세요
          </p>
        </div>

        {/* 별점 */}
        <div className={styles.review_rating}>
          <p className={styles.rating_label}>만족도</p>
          <div className={styles.rating_stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`${styles.star_btn} ${star <= rating ? styles.active : ""}`}
                onClick={() => setRating(star)}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* 리뷰 내용 */}
        <div className={styles.review_content_input}>
          <textarea
            className={styles.review_textarea}
            placeholder="연애 사주 리포트는 어떠셨나요?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
          />
          <span className={styles.review_char_count}>{content.length}/500</span>
        </div>

        {/* 닉네임 */}
        <div className={styles.review_name_input}>
          <input
            type="text"
            className={styles.review_name_field}
            placeholder="닉네임 (선택)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* 버튼들 */}
        <div className={styles.review_modal_buttons}>
          <button className={styles.review_skip_btn} onClick={onClose}>
            다음에 할게요
          </button>
          <button
            className={styles.review_submit_btn}
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? "등록 중..." : "후기 남기기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// 리뷰 입력 카드 (5장 후, saju-love 입력 스타일 그대로)
function ReviewInlineCard({
  recordId,
  userName,
  onDone,
}: {
  recordId: string;
  userName: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(4);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 상위에서 이미 리뷰 존재 여부를 확인하고 review_prompt 카드를 생성하지 않으므로
  // 여기까지 도달하면 리뷰가 없는 상태임

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    await createReview({
      service_type: "saju_love",
      record_id: recordId,
      user_name: userName,
      rating,
      content: content.trim(),
      is_public: true,
    });
    setSubmitted(true);
    setIsSubmitting(false);
    setTimeout(onDone, 1200);
  };

  if (submitted) {
    return (
      <div className={`${styles.review_overlay} ${styles.active}`}>
        <div className={styles.review_form_wrap}>
          <div className={styles.review_thanks_wrap}>
            <p className={styles.review_thanks_text}>고마워요! 💕</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.review_overlay} ${styles.active}`}>
      <div className={styles.review_form_wrap}>
        {/* 만족도 */}
        <div className={styles.input_group}>
          <label className={styles.input_label}>
            {userName}님, 풀이는 어떠셨나요?
          </label>
          <div className={styles.review_rating_options}>
            {[
              { value: 1, label: "아쉬워요" },
              { value: 2, label: "보통" },
              { value: 3, label: "좋았어요" },
              { value: 4, label: "고마워요" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.review_rating_btn} ${rating === option.value ? styles.active : ""
                  }`}
                onClick={() => setRating(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 후기 입력 */}
        <div className={styles.input_group}>
          <label className={styles.input_label}>의견을 알려주세요</label>
          <textarea
            className={`${styles.input_field} ${styles.textarea}`}
            placeholder={
              "색동낭자의 풀이에 대해 솔직한 의견을 남겨주세요.\n의견을 참고하여 계속해서 공부할게요!"
            }
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      {/* 버튼들 */}
      <div className={styles.input_buttons}>
        <button className={styles.input_prev_btn} onClick={onDone}>
          건너뛰기
        </button>
        <button
          className={styles.input_submit_btn}
          onClick={handleSubmit}
          disabled={isSubmitting || !content.trim()}
        >
          {isSubmitting ? "등록 중..." : "후기 남기기"}
        </button>
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
    data?.loveAnalysis?.ideal_partner_image?.image_url ||
    data?.loveAnalysis?.ideal_partner_image?.image_base64;
  const avoidTypeImage =
    data?.loveAnalysis?.avoid_type_image?.image_url ||
    data?.loveAnalysis?.avoid_type_image?.image_base64;

  return (
    <div className={`${styles.report_card} ${styles.ending_card}`}>
      <div className={styles.ending_content}>
        {/* 인사말 */}
        <div className={styles.ending_greeting}>
          <p className={styles.greeting_main}>
            {userName}님, 여기까지 긴 리포트를 읽어주셔서 감사합니다.
          </p>
          <p>
            사주는 정해진 운명이 아니라, 나를 더 잘 이해하고 더 나은 선택을 하기
            위한 도구예요.
          </p>
          <p>당신의 사랑이 더 깊어지고, 더 따뜻해지길 진심으로 응원합니다.</p>
          <p className={styles.ending_sign}>- 색동낭자 드림</p>
        </div>

        {/* 리뷰 섹션 */}
        {data?.id && <ReviewSection recordId={data.id} userName={userName} />}

        {/* 보고서 전체 */}
        <div className={styles.ending_summary}>
          <h3 className={styles.summary_title}>나의 연애 사주 리포트 전체</h3>

          {/* 들어가며 */}
          <div className={`${styles.report_card} ${styles.summary_report_card}`}>
            <div className={styles.card_header}>
              <h3 className={styles.card_title}>색동낭자의 인사</h3>
            </div>
            <div className={`${styles.card_content} ${styles.intro_summary_content}`}>
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
            const isChapter4 = chapterNum === 4;

            // 타이틀 정리
            const titleText = chapter.title
              .replace(/^#+\s*/, "")
              .replace(/\[(\d+)장\]\s*/, "")
              .replace(/^(\d+)장\s*/, "")
              .trim();

            return (
              <div key={index}>
                <div className={`${styles.report_card} ${styles.summary_report_card}`}>
                  <div className={styles.card_header}>
                    <h3 className={styles.card_title}>
                      {chapterNum}장 {titleText}
                    </h3>
                  </div>
                  <div
                    className={styles.card_content}
                    dangerouslySetInnerHTML={{
                      __html: formatChapterContent(chapter.content),
                    }}
                  />
                </div>
                {/* 3장 뒤에 운명의 상대 이미지 표시 */}
                {isChapter3 && idealPartnerImage && (
                  <div className={`${styles.report_card} ${styles.summary_ideal_card}`}>
                    <div className={styles.card_header}>
                      <h3 className={styles.card_title}>{userName}님의 운명의 상대</h3>
                    </div>
                    <div className={styles.summary_ideal_image}>
                      <img
                        src={`data:image/png;base64,${idealPartnerImage}`}
                        alt="운명의 상대 이미지"
                        className={styles.ideal_image_full}
                      />
                    </div>
                  </div>
                )}
                {/* 4장 뒤에 피해야 할 인연 이미지 표시 */}
                {isChapter4 && avoidTypeImage && (
                  <div className={`${styles.report_card} ${styles.summary_ideal_card} ${styles.summary_avoid_card}`}>
                    <div className={styles.card_header}>
                      <h3 className={styles.card_title}>{userName}님의 가짜 인연</h3>
                    </div>
                    <div className={styles.summary_ideal_image}>
                      <img
                        src={`data:image/png;base64,${avoidTypeImage}`}
                        alt="가짜 인연 이미지"
                        className={styles.ideal_image_full}
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
      "0030": "자시 (23:30~01:29)",
      "0230": "축시 (01:30~03:29)",
      "0430": "인시 (03:30~05:29)",
      "0630": "묘시 (05:30~07:29)",
      "0830": "진시 (07:30~09:29)",
      "1030": "사시 (09:30~11:29)",
      "1230": "오시 (11:30~13:29)",
      "1430": "미시 (13:30~15:29)",
      "1630": "신시 (15:30~17:29)",
      "1830": "유시 (17:30~19:29)",
      "2030": "술시 (19:30~21:29)",
      "2230": "해시 (21:30~23:29)",
      // HH:MM 형식도 지원
      "00:30": "자시 (23:30~01:29)",
      "02:30": "축시 (01:30~03:29)",
      "04:30": "인시 (03:30~05:29)",
      "06:30": "묘시 (05:30~07:29)",
      "08:30": "진시 (07:30~09:29)",
      "10:30": "사시 (09:30~11:29)",
      "12:30": "오시 (11:30~13:29)",
      "14:30": "미시 (13:30~15:29)",
      "16:30": "신시 (15:30~17:29)",
      "18:30": "유시 (17:30~19:29)",
      "20:30": "술시 (19:30~21:29)",
      "22:30": "해시 (21:30~23:29)",
    };
    return timeMap[time] || null;
  };

  const birthTime = formatTimeToSi(input?.time);
  const pillarOrder = ["hour", "day", "month", "year"] as const;
  const pillarLabels = ["시주", "일주", "월주", "년주"];

  return (
    <div className={`${styles.report_card} ${styles.summary_report_card} ${styles.summary_saju_card}`}>
      <div className={styles.card_header}>
        <h3 className={styles.card_title}>{userName}님의 사주 원국</h3>
      </div>

      {/* 기본 정보 */}
      <div className={styles.summary_saju_info}>
        <p className={styles.summary_saju_birth}>
          {input?.userName} · {input?.date}
          {birthTime ? ` · ${birthTime}` : ""}
        </p>
        {dayMaster && (
          <p className={styles.summary_saju_daymaster}>
            <span
              className={styles.daymaster_char}
              style={{ color: getColor(dayMaster.element) }}
            >
              {dayMaster.char}
            </span>
            <span className={styles.daymaster_title}>{dayMaster.title}</span>
          </p>
        )}
      </div>

      {/* 간소화된 사주 팔자 */}
      <div className={styles.summary_pillars}>
        {pillarOrder.map((key, idx) => {
          const p = pillars[key];
          return (
            <div key={key} className={styles.summary_pillar}>
              <span className={styles.pillar_label}>{pillarLabels[idx]}</span>
              <div className={styles.pillar_chars}>
                <span
                  className={styles.pillar_stem}
                  style={{ color: getColor(p?.stem?.element) }}
                >
                  {p?.stem?.char || "—"}
                </span>
                <span
                  className={styles.pillar_branch}
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
        <div className={styles.saju_result_page}>
          <div className={styles.main_body_wrap}>
            <div className={styles.loading_wrap}>
              <div className={styles.loading_spinner}></div>
              <p className={styles.loading_text}>불러오는 중...</p>
            </div>
          </div>
        </div>
      }
    >
      <SajuLoveResultContent />
    </Suspense>
  );
}
