"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeSaju } from "@/app/actions/analyze";
import { trackPageView, trackFormSubmit } from "@/lib/mixpanel";
import { saveSajuLoveRecord } from "@/lib/db/sajuLoveDB";
import { createSajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import styles from "./saju-love.module.css";

// 시간 옵션
const TIME_OPTIONS = [
  { value: "", label: "태어난 시간을 골라주세요." },
  { value: "unknown", label: "시간 모름" },
  { value: "00:30", label: "자시 (23:30~01:29)" },
  { value: "02:30", label: "축시 (01:30~03:29)" },
  { value: "04:30", label: "인시 (03:30~05:29)" },
  { value: "06:30", label: "묘시 (05:30~07:29)" },
  { value: "08:30", label: "진시 (07:30~09:29)" },
  { value: "10:30", label: "사시 (09:30~11:29)" },
  { value: "12:30", label: "오시 (11:30~13:29)" },
  { value: "14:30", label: "미시 (13:30~15:29)" },
  { value: "16:30", label: "신시 (15:30~17:29)" },
  { value: "18:30", label: "유시 (17:30~19:29)" },
  { value: "20:30", label: "술시 (19:30~21:29)" },
  { value: "22:30", label: "해시 (21:30~23:29)" },
];

// 연애상태 라벨 매핑
const STATUS_LABELS: Record<string, string> = {
  single: "솔로",
  some: "썸 타는 중",
  dating: "연애 중",
  breakup: "이별 앓이 중",
};

type ChatMessage = {
  sender: "nangja" | "user";
  text: string;
  step?: number;
};

export default function SajuLovePage() {
  const router = useRouter();

  // UI 상태
  const [currentImage, setCurrentImage] = useState(
    "/saju-love/img/nangja2.jpg"
  );
  const [prevImage, setPrevImage] = useState("/saju-love/img/nangja2.jpg");
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Chat 상태
  const [chatStep, setChatStep] = useState(-1); // -1 = not started
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentNangjaText, setCurrentNangjaText] = useState("");
  const [nangjaTypingDone, setNangjaTypingDone] = useState(false);

  // 폼 상태
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [calendar, setCalendar] = useState("solar");
  const [status, setStatus] = useState<string | null>(null);
  const [userConcern, setUserConcern] = useState("");

  // refs
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 이미지 전환
  const changeImage = useCallback(
    (newImage: string) => {
      if (newImage === currentImage) return;
      setPrevImage(currentImage);
      setCurrentImage(newImage);
      setIsImageTransitioning(true);
      setTimeout(() => setIsImageTransitioning(false), 500);
    },
    [currentImage]
  );

  // 페이지 방문 추적 + 이미지 프리로드
  useEffect(() => {
    trackPageView("saju_love");
    const imagesToPreload = [
      "/saju-love/img/nangja.jpg",
      "/saju-love/img/nangja-1.jpg",
    ];
    imagesToPreload.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, []);

  // 스크롤 to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // 타이핑 효과 for nangja bubble
  const typeNangjaMessage = useCallback(
    (text: string, onComplete?: () => void) => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      setIsTyping(true);
      setCurrentNangjaText("");
      setNangjaTypingDone(false);

      let i = 0;
      typingIntervalRef.current = setInterval(() => {
        if (i < text.length) {
          setCurrentNangjaText(text.substring(0, i + 1));
          i++;
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setIsTyping(false);
          setNangjaTypingDone(true);
          onComplete?.();
        }
      }, 50);
    },
    []
  );

  // chatMessages or chatStep 변경 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, chatStep, nangjaTypingDone, scrollToBottom]);

  // 낭자 메시지들 정의
  const NANGJA_MESSAGES: Record<number, string> = {
    0: "안녕하세요!\n사주 정보를 알려주시면\n인연을 풀어드릴게요.",
    1: "어떻게 불러드릴까요?",
    2: "성별을 알려주세요.",
    3: "생년월일은요?",
    4: "태어난 시간도 알고 계신가요?",
    5: "현재 연애 상태는 어떠세요?",
    6: "혹시 요즘 연애 고민이 있으세요?\n없으면 바로 넘어가도 돼요!",
  };

  // 다음 스텝으로 이동 (낭자 메시지 타이핑)
  const goToStep = useCallback(
    (step: number) => {
      setChatStep(step);
      const msg = NANGJA_MESSAGES[step];
      if (msg) {
        // 짧은 딜레이 후 타이핑 시작 (자연스러운 느낌)
        setTimeout(() => {
          typeNangjaMessage(msg);
        }, 400);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeNangjaMessage]
  );

  // 유저 답변 추가 + 다음 단계
  const addUserAnswer = useCallback(
    (text: string, nextStep: number) => {
      // 현재 낭자 메시지를 chatMessages에 확정
      const nangjaMsg = NANGJA_MESSAGES[chatStep];
      setChatMessages((prev) => [
        ...prev,
        { sender: "nangja", text: nangjaMsg },
        { sender: "user", text, step: chatStep },
      ]);
      setCurrentNangjaText("");
      setNangjaTypingDone(false);

      goToStep(nextStep);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatStep, goToStep]
  );

  // 시작하기 (랜딩 → 채팅) - 인사 타이핑 후 이름 질문
  const handleStart = () => {
    setShowLanding(false);
    changeImage("/saju-love/img/nangja.jpg");
    setTimeout(() => {
      // 인사 메시지를 타이핑하고, 끝나면 이름 질문으로
      setChatStep(0);
      typeNangjaMessage(NANGJA_MESSAGES[0], () => {
        setTimeout(() => {
          setChatMessages([{ sender: "nangja", text: NANGJA_MESSAGES[0] }]);
          setCurrentNangjaText("");
          setNangjaTypingDone(false);
          goToStep(1);
        }, 200);
      });
    }, 500);
  };

  // Step 0: 시작할게요 버튼
  const handleChatBegin = () => {
    if (isTyping) {
      // 타이핑 중이면 즉시 완료
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setCurrentNangjaText(NANGJA_MESSAGES[0]);
      setIsTyping(false);
      setNangjaTypingDone(true);
      return;
    }
    // 인사 메시지를 저장하고 step 1로
    setChatMessages([{ sender: "nangja", text: NANGJA_MESSAGES[0] }]);
    setCurrentNangjaText("");
    setNangjaTypingDone(false);
    goToStep(1);
  };

  // Step 1: 이름 다음
  const handleNameNext = () => {
    if (userName.trim() && chatStep === 1) {
      addUserAnswer(userName.trim(), 2);
    }
  };

  // Step 2: 성별 선택
  const handleGenderSelect = (value: string) => {
    setGender(value);
    const label = value === "female" ? "여성" : "남성";
    addUserAnswer(label, 3);
  };

  // Step 3: 생년월일
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    let formatted = "";
    if (value.length > 0) formatted = value.slice(0, 4);
    if (value.length > 4) formatted += "-" + value.slice(4, 6);
    if (value.length > 6) formatted += "-" + value.slice(6, 8);

    setBirthDate(formatted);

    // 8자리 다 입력하면 자동으로 다음
    if (value.length === 8 && chatStep === 3) {
      const displayDate =
        value.slice(0, 4) +
        "." +
        value.slice(4, 6) +
        "." +
        value.slice(6, 8);
      const calLabel = calendar === "solar" ? "양력" : "음력";
      setTimeout(() => {
        addUserAnswer(`${displayDate} (${calLabel})`, 4);
      }, 400);
    }
  };

  // Step 4: 시간 선택
  const handleBirthTimeChange = (value: string) => {
    setBirthTime(value);
    if (value && chatStep === 4) {
      const opt = TIME_OPTIONS.find((t) => t.value === value);
      const label = opt ? opt.label : value;
      setTimeout(() => {
        addUserAnswer(label, 5);
      }, 350);
    }
  };

  // Step 5: 연애 상태 선택
  const handleStatusSelect = (value: string) => {
    setStatus(value);
    const label = STATUS_LABELS[value] || value;
    addUserAnswer(label, 6);
  };

  // 수정: 유저 버블 탭하여 해당 스텝의 input만 다시 보여주기
  const handleEditAnswer = useCallback(
    (step: number) => {
      // 해당 step의 user answer 찾기
      const userMsgIdx = chatMessages.findIndex(
        (msg) => msg.sender === "user" && msg.step === step
      );
      if (userMsgIdx < 0) return;

      // 해당 낭자 질문 + user answer부터 이후 메시지 모두 제거
      const nangjaMsgIdx = userMsgIdx - 1;
      setChatMessages((prev) => prev.slice(0, nangjaMsgIdx >= 0 ? nangjaMsgIdx : userMsgIdx));

      // 해당 스텝 이후의 폼 값 리셋
      if (step <= 1) {
        setUserName("");
        setGender(null);
        setBirthDate("");
        setBirthTime("");
        setStatus(null);
        setUserConcern("");
      }
      if (step === 2) {
        setGender(null);
        setBirthDate("");
        setBirthTime("");
        setStatus(null);
        setUserConcern("");
      }
      if (step === 3) {
        setBirthDate("");
        setBirthTime("");
        setStatus(null);
        setUserConcern("");
      }
      if (step === 4) {
        setBirthTime("");
        setStatus(null);
        setUserConcern("");
      }
      if (step === 5) {
        setStatus(null);
        setUserConcern("");
      }

      // 타이핑 중이면 정리
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setCurrentNangjaText("");
      setIsTyping(false);

      // 낭자 질문을 currentNangjaText로 바로 표시하고 input도 바로 표시
      setChatStep(step);
      setCurrentNangjaText(NANGJA_MESSAGES[step]);
      setNangjaTypingDone(true);
    },
    [chatMessages]
  );

  // 전체 폼 유효성
  const isFormValid =
    gender !== null &&
    birthDate.replace(/\D/g, "").length === 8 &&
    userName.trim() !== "" &&
    status !== null;

  // 분석 시작
  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    changeImage("/saju-love/img/nangja-1.jpg");

    try {
      const result = await computeSaju({
        gender: gender!,
        date: birthDate,
        time: birthTime === "unknown" ? null : birthTime || null,
        calendar,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      const resultId = crypto.randomUUID();

      const rawData = result.data;
      const {
        dayMaster,
        pillars,
        fiveElements,
        loveFacts,
        sinsal,
        daeun,
        zodiac,
        gong,
        luckCycles,
        currentSaeun,
        jieQi,
        tianShen,
        jiShen,
        xiongSha,
        nobleDirection,
        jiuXing,
        xiu28,
        jianZhi,
        chong,
        pengZu,
      } = rawData;

      const nayin: Record<string, string> = {};
      if (pillars) {
        for (const key of ["year", "month", "day", "hour"]) {
          if (pillars[key]?.naYinKor) {
            nayin[key] = pillars[key].naYinKor;
          }
        }
      }

      const fullSajuData = {
        dayMaster,
        pillars,
        fiveElements: fiveElements
          ? {
              strength: fiveElements.strength,
              strengthLevel: fiveElements.strengthLevel,
              percent: fiveElements.percent,
            }
          : null,
        loveFacts: loveFacts
          ? {
              peachBlossom: loveFacts.peachBlossom,
              spouseStars: loveFacts.spouseStars,
              spouseTargetType: loveFacts.spouseTargetType,
              dayMasterStrength: loveFacts.dayMasterStrength,
              fiveElementsHanjaPercent: loveFacts.fiveElementsHanjaPercent,
            }
          : null,
        sinsal: sinsal || null,
        daeun: daeun || null,
        zodiac: zodiac || null,
        taiYuan: gong?.taiYuan || null,
        mingGong: gong?.mingGong || null,
        shenGong: gong?.shenGong || null,
        nayin: Object.keys(nayin).length > 0 ? nayin : undefined,
        luckCycles: luckCycles || null,
        currentSaeun: currentSaeun || null,
        jieQi: jieQi || null,
        tianShen: tianShen || null,
        jiShen: jiShen || null,
        xiongSha: xiongSha || null,
        nobleDirection: nobleDirection || null,
        jiuXing: jiuXing || null,
        xiu28: xiu28 || null,
        jianZhi: jianZhi || null,
        chong: chong || null,
        pengZu: pengZu || null,
      };

      const userInput = {
        userName,
        gender: gender!,
        date: birthDate,
        calendar,
        time: birthTime === "unknown" ? null : birthTime || null,
        userConcern: userConcern.trim(),
        status: status!,
      };

      await saveSajuLoveRecord({
        id: resultId,
        createdAt: new Date().toISOString(),
        paid: false,
        input: userInput,
        rawSajuData: rawData,
        sajuData: fullSajuData,
        loveAnalysis: null,
      });

      try {
        await createSajuAnalysis({
          service_type: "saju_love",
          id: resultId,
          user_info: {
            userName: userInput.userName,
            gender: userInput.gender,
            date: userInput.date,
            calendar: userInput.calendar as "solar" | "lunar",
            time: userInput.time,
            userConcern: userInput.userConcern,
            status: userInput.status,
          },
          raw_saju_data: rawData,
          analysis_result: null,
          image_paths: [],
          is_paid: false,
          payment_info: null,
        });
      } catch (supabaseErr) {
        console.error("Supabase 저장 실패 (계속 진행):", supabaseErr);
      }

      trackFormSubmit("saju_love", {
        gender,
        calendar,
        status,
        birth_date: birthDate,
        birth_time: birthTime === "unknown" ? "모름" : birthTime,
        user_name: userName,
        user_concern: userConcern.trim(),
        day_master: fullSajuData.dayMaster?.char,
        day_master_title: fullSajuData.dayMaster?.title,
        day_master_element: fullSajuData.dayMaster?.element,
        day_master_yinyang: fullSajuData.dayMaster?.yinYang,
      });

      router.push(`/saju-love/detail?id=${resultId}`);
    } catch (error) {
      console.error("분석 실패:", error);
      alert("풀이 중 오류가 생겼어요. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 현재 스텝의 입력 UI 렌더링
  const renderCurrentInput = () => {
    if (!nangjaTypingDone) return null;

    switch (chatStep) {
      case 1:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.name_input_row}>
              <input
                type="text"
                className={styles.input_field}
                placeholder="예시) 김민지"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameNext();
                }}
                autoFocus
              />
              <button
                className={styles.inline_next_btn}
                onClick={handleNameNext}
                disabled={!userName.trim()}
              >
                다음
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.gender_options}>
              <button
                className={`${styles.gender_btn} ${
                  gender === "female" ? styles.active : ""
                }`}
                onClick={() => handleGenderSelect("female")}
              >
                여성
              </button>
              <button
                className={`${styles.gender_btn} ${
                  gender === "male" ? styles.active : ""
                }`}
                onClick={() => handleGenderSelect("male")}
              >
                남성
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.input_row}>
              <div className={styles.calendar_options}>
                <button
                  className={`${styles.calendar_btn} ${
                    calendar === "solar" ? styles.active : ""
                  }`}
                  onClick={() => setCalendar("solar")}
                >
                  {calendar === "solar" && (
                    <span className={styles.check_icon}>✓</span>
                  )}{" "}
                  양력
                </button>
                <button
                  className={`${styles.calendar_btn} ${
                    calendar === "lunar" ? styles.active : ""
                  }`}
                  onClick={() => setCalendar("lunar")}
                >
                  {calendar === "lunar" && (
                    <span className={styles.check_icon}>✓</span>
                  )}{" "}
                  음력
                </button>
              </div>
            </div>
            <input
              type="text"
              className={styles.input_field}
              placeholder="예: 20040312"
              inputMode="numeric"
              maxLength={10}
              value={birthDate}
              onChange={handleBirthDateChange}
              autoFocus
            />
          </div>
        );

      case 4:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.input_row}>
              <button
                className={`${styles.time_unknown_btn} ${
                  birthTime === "unknown" ? styles.active : ""
                }`}
                onClick={() => {
                  const val = birthTime === "unknown" ? "" : "unknown";
                  handleBirthTimeChange(val);
                }}
              >
                {birthTime === "unknown" && (
                  <span className={styles.check_icon}>✓</span>
                )}{" "}
                시간 모름
              </button>
            </div>
            <select
              className={styles.input_field}
              value={birthTime}
              onChange={(e) => handleBirthTimeChange(e.target.value)}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 5:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.status_options}>
              <button
                className={`${styles.status_btn} ${
                  status === "single" ? styles.active : ""
                }`}
                onClick={() => handleStatusSelect("single")}
              >
                솔로
              </button>
              <button
                className={`${styles.status_btn} ${
                  status === "some" ? styles.active : ""
                }`}
                onClick={() => handleStatusSelect("some")}
              >
                썸 타는 중
              </button>
              <button
                className={`${styles.status_btn} ${
                  status === "dating" ? styles.active : ""
                }`}
                onClick={() => handleStatusSelect("dating")}
              >
                연애 중
              </button>
              <button
                className={`${styles.status_btn} ${
                  status === "breakup" ? styles.active : ""
                }`}
                onClick={() => handleStatusSelect("breakup")}
              >
                이별 앓이 중
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className={styles.chat_input_group}>
            <textarea
              className={`${styles.input_field} ${styles.textarea} ${styles.concern_textarea}`}
              placeholder={
                "적지 않아도 괜찮아요!\n고민을 알려주시면 더 맞춤 풀이를 해드려요."
              }
              rows={3}
              value={userConcern}
              onChange={(e) => setUserConcern(e.target.value)}
              autoFocus
            />
            <button
              className={styles.chat_submit_btn}
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
            >
              {userConcern.trim() ? "풀이 시작!" : "건너뛰고 풀이 시작!"}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Chat 화면 표시 여부
  const showChat = !showLanding && chatStep >= 0;

  return (
    <div className={`${styles.main_body_wrap} ${styles.landing_page}`}>
      {/* 뒤로가기 버튼 */}
      <button
        className={`${styles.back_btn} ${showChat ? styles.back_btn_dark : ""}`}
        onClick={() => router.push("/")}
      >
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>홈으로</span>
      </button>

      {/* 배경 이미지 - crossfade */}
      <div className={styles.landing_bg}>
        {isImageTransitioning && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prevImage}
            alt=""
            className={`${styles.landing_image} ${styles.landing_image_prev}`}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="색동낭자 연애사주"
          className={`${styles.landing_image} ${
            isImageTransitioning ? styles.landing_image_fade_in : ""
          }`}
        />
      </div>

      {/* 랜딩 */}
      {showLanding && (
        <>
          <div className={styles.landing_title_wrap}>
            <h1 className={styles.landing_title}>
              <span className={`${styles.title_line} ${styles.title_name}`}>
                색동낭자
              </span>
              <span className={`${styles.title_line} ${styles.title_saju}`}>
                연애사주
              </span>
            </h1>
            <p className={styles.landing_subtitle}>당신의 인연을 풀어드려요</p>
          </div>
          <div className={styles.landing_bottom}>
            <button className={styles.landing_start_btn} onClick={handleStart}>
              시작하기
            </button>
          </div>
        </>
      )}

      {/* 채팅 화면 */}
      {showChat && !isLoading && (
        <div className={styles.chat_overlay}>
          {/* 메시지 영역 */}
          <div className={styles.chat_messages}>
            {/* 완료된 메시지들 */}
            {chatMessages.map((msg, idx) => {
              // 낭자 메시지 위에 speaker label 표시 (첫번째이거나 이전이 user일 때)
              const showSpeaker =
                msg.sender === "nangja" &&
                (idx === 0 || chatMessages[idx - 1]?.sender === "user");

              return (
                <div
                  key={idx}
                  className={`${styles.chat_row} ${
                    msg.sender === "nangja"
                      ? styles.chat_row_nangja
                      : styles.chat_row_user
                  }`}
                >
                  {showSpeaker && (
                    <div className={styles.chat_speaker}>색동낭자</div>
                  )}
                  <div
                    className={`${
                      msg.sender === "nangja"
                        ? styles.chat_bubble_nangja
                        : styles.chat_bubble_user
                    }${msg.sender === "user" ? ` ${styles.chat_bubble_user_editable}` : ""}`}
                    onClick={
                      msg.sender === "user" && msg.step !== undefined
                        ? () => handleEditAnswer(msg.step!)
                        : undefined
                    }
                  >
                    {msg.text}
                    {msg.sender === "user" && (
                      <span className={styles.edit_hint}>탭하여 수정</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 현재 타이핑 중인 낭자 메시지 */}
            {chatStep >= 0 && (currentNangjaText || isTyping) && (
              <div
                className={`${styles.chat_row} ${styles.chat_row_nangja} ${styles.chat_row_new}`}
              >
                {chatMessages.length === 0 ||
                chatMessages[chatMessages.length - 1]?.sender === "user" ? (
                  <div className={styles.chat_speaker}>색동낭자</div>
                ) : null}
                <div className={styles.chat_bubble_nangja}>
                  {currentNangjaText}
                  {isTyping && <span className={styles.typing_cursor} />}
                </div>
              </div>
            )}

            {/* 입력 영역 - inline in chat flow */}
            {nangjaTypingDone && (
              <div className={styles.chat_inline_input}>
                {renderCurrentInput()}
              </div>
            )}

            <div className={styles.chat_bottom_spacer} />
            <div ref={chatBottomRef} />
          </div>
        </div>
      )}

      {/* 분석 중 로딩 */}
      {isLoading && (
        <div className={`${styles.analyze_overlay} ${styles.active}`}>
          <div className={styles.analyze_content}>
            <div className={styles.analyze_spinner} />
            <div className={styles.analyze_text}>사주 풀이중</div>
            <div className={styles.analyze_subtext}>
              잠시만요, 운명의 실을 풀고 있어요...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
