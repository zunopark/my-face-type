"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeSaju } from "@/app/actions/analyze";
import { trackPageView, trackFormSubmit } from "@/lib/mixpanel";
import { createSajuAnalysis } from "@/lib/db/sajuAnalysisDB";
import { getStoredUtmParams } from "@/components/providers/MixpanelProvider";
import styles from "./saju.module.css";

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

type ChatMessage = {
  sender: "unhak" | "user";
  text: string;
  step?: number;
};

export default function SajuPage() {
  const router = useRouter();

  // UI 상태
  const [currentImage, setCurrentImage] = useState("/saju/img/unhak-2.jpg");
  const [prevImage, setPrevImage] = useState("/saju/img/unhak-2.jpg");
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Chat 상태
  const [chatStep, setChatStep] = useState(-1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUnhakText, setCurrentUnhakText] = useState("");
  const [unhakTypingDone, setUnhakTypingDone] = useState(false);
  const [inputFadingOut, setInputFadingOut] = useState(false);

  // 폼 상태
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [calendar, setCalendar] = useState("solar");
  const [userConcern, setUserConcern] = useState("");

  // refs
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const nameTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("saju");
    const imagesToPreload = [
      "/saju/img/unhak-1.jpg",
      "/saju/img/unhak-3.jpg",
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

  // 타이핑 효과
  const typeUnhakMessage = useCallback(
    (text: string, onComplete?: () => void) => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
      setIsTyping(true);
      setCurrentUnhakText("");
      setUnhakTypingDone(false);

      let i = 0;
      typingIntervalRef.current = setInterval(() => {
        if (i < text.length) {
          setCurrentUnhakText(text.substring(0, i + 1));
          i++;
        } else {
          if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setIsTyping(false);
          setUnhakTypingDone(true);
          onComplete?.();
        }
      }, 50);
    },
    []
  );

  // 스크롤 (fadeOut 중에는 스킵)
  useEffect(() => {
    if (!inputFadingOut) {
      scrollToBottom();
    }
  }, [chatMessages, chatStep, unhakTypingDone, inputFadingOut, scrollToBottom]);

  // 운학선인 메시지들
  const UNHAK_MESSAGES: Record<number, string> = {
    0: "어서 오세요.\n사주팔자를 풀어드리겠습니다.\n몇 가지 여쭤볼게요.",
    1: "어떻게 불러드리면 될까요?",
    2: "성별을 알려주세요.",
    3: "생년월일을 알려주세요.",
    4: "태어난 시간도 알고 계신가요?\n모르시면 '시간 모름'을 선택해주세요.",
    5: "혹시 특별히 궁금한 것이 있으신가요?\n없으시면 바로 넘어가도 됩니다.",
  };

  // 다음 스텝으로 이동
  const goToStep = useCallback(
    (step: number) => {
      setChatStep(step);
      const msg = UNHAK_MESSAGES[step];
      if (msg) {
        setTimeout(() => {
          typeUnhakMessage(msg);
        }, 400);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeUnhakMessage]
  );

  // 유저 답변 추가 + 다음 단계
  const addUserAnswer = useCallback(
    (text: string, nextStep: number) => {
      const unhakMsg = UNHAK_MESSAGES[chatStep];
      const chatEl = chatBottomRef.current?.parentElement;
      const scrollBefore = chatEl?.scrollTop ?? 0;

      setChatMessages((prev) => [
        ...prev,
        { sender: "unhak", text: unhakMsg },
        { sender: "user", text, step: chatStep },
      ]);
      setCurrentUnhakText("");
      setUnhakTypingDone(false);

      requestAnimationFrame(() => {
        if (chatEl) chatEl.scrollTop = scrollBefore;
        scrollToBottom();
      });

      goToStep(nextStep);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatStep, goToStep, scrollToBottom]
  );

  // 시작하기
  const handleStart = () => {
    setShowLanding(false);
    changeImage("/saju/img/unhak-3.jpg");
    setTimeout(() => {
      setChatStep(0);
      typeUnhakMessage(UNHAK_MESSAGES[0], () => {
        setTimeout(() => {
          setChatMessages([{ sender: "unhak", text: UNHAK_MESSAGES[0] }]);
          setCurrentUnhakText("");
          setUnhakTypingDone(false);
          goToStep(1);
        }, 200);
      });
    }, 500);
  };

  // Step 0: 시작할게요 버튼
  const handleChatBegin = () => {
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setCurrentUnhakText(UNHAK_MESSAGES[0]);
      setIsTyping(false);
      setUnhakTypingDone(true);
      return;
    }
    setChatMessages([{ sender: "unhak", text: UNHAK_MESSAGES[0] }]);
    setCurrentUnhakText("");
    setUnhakTypingDone(false);
    goToStep(1);
  };

  // Step 1: 이름
  const handleNameChange = (value: string) => {
    setUserName(value);
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    if (value.trim() && chatStep === 1) {
      nameTimerRef.current = setTimeout(() => {
        addUserAnswer(value.trim(), 2);
      }, 1000);
    }
  };

  // Step 2: 성별
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

    if (value.length === 8 && chatStep === 3) {
      const displayDate =
        value.slice(0, 4) + "." + value.slice(4, 6) + "." + value.slice(6, 8);
      const calLabel = calendar === "solar" ? "양력" : "음력";
      setTimeout(() => {
        addUserAnswer(`${displayDate} (${calLabel})`, 4);
      }, 400);
    }
  };

  // Step 4: 시간
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

  // 수정
  const handleEditAnswer = useCallback(
    (step: number) => {
      const userMsgIdx = chatMessages.findIndex(
        (msg) => msg.sender === "user" && msg.step === step
      );
      if (userMsgIdx < 0) return;

      const unhakMsgIdx = userMsgIdx - 1;
      setChatMessages((prev) => prev.slice(0, unhakMsgIdx >= 0 ? unhakMsgIdx : userMsgIdx));

      if (step <= 1) {
        setUserName("");
        setGender(null);
        setBirthDate("");
        setBirthTime("");
        setUserConcern("");
      }
      if (step === 2) {
        setGender(null);
        setBirthDate("");
        setBirthTime("");
        setUserConcern("");
      }
      if (step === 3) {
        setBirthDate("");
        setBirthTime("");
        setUserConcern("");
      }
      if (step === 4) {
        setBirthTime("");
        setUserConcern("");
      }

      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setIsTyping(false);

      setChatStep(step);
      setCurrentUnhakText(UNHAK_MESSAGES[step]);
      setUnhakTypingDone(true);
    },
    [chatMessages]
  );

  // 전체 폼 유효성 (연애상태 없이)
  const isFormValid =
    gender !== null &&
    birthDate.replace(/\D/g, "").length === 8 &&
    userName.trim() !== "";

  // 분석 시작
  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    changeImage("/saju/img/unhak-1.jpg");

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

      const userInput = {
        userName,
        gender: gender!,
        date: birthDate,
        calendar,
        time: birthTime === "unknown" ? null : birthTime || null,
        userConcern: userConcern.trim(),
      };

      // UTM 정보 조회
      let utmSource: string | null = null;
      let influencerId: string | null = null;
      try {
        const utmParams = getStoredUtmParams();
        if (utmParams.utm_source) {
          utmSource = utmParams.utm_source;
          const infRes = await fetch(`/api/admin/influencers?slug=${encodeURIComponent(utmSource)}`);
          if (infRes.ok) {
            const infData = await infRes.json();
            if (infData?.id) influencerId = infData.id;
          }
        }
      } catch {}

      await createSajuAnalysis({
        service_type: "saju",
        id: resultId,
        user_info: {
          userName: userInput.userName,
          gender: userInput.gender,
          date: userInput.date,
          calendar: userInput.calendar as "solar" | "lunar",
          time: userInput.time,
          userConcern: userInput.userConcern,
        },
        raw_saju_data: rawData,
        analysis_result: null,
        image_paths: [],
        is_paid: false,
        payment_info: null,
        ...(utmSource ? { utm_source: utmSource } : {}),
        ...(influencerId ? { influencer_id: influencerId } : {}),
      });

      trackFormSubmit("saju", {
        gender,
        calendar,
        birth_date: birthDate,
        birth_time: birthTime === "unknown" ? "모름" : birthTime,
        user_name: userName,
        user_concern: userConcern.trim(),
        day_master: rawData?.dayMaster?.char,
        day_master_element: rawData?.dayMaster?.element,
      });

      // detail 스킵, 바로 result로
      router.push(`/saju/result?id=${resultId}`);
    } catch (error) {
      console.error("분석 실패:", error);
      alert("풀이 중 오류가 생겼어요. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 완료된 스텝의 입력 UI
  const renderCompletedInput = (step: number) => {
    switch (step) {
      case 1:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.name_input_row}>
              <input type="text" className={styles.input_field} value={userName} onChange={(e) => setUserName(e.target.value)} />
            </div>
          </div>
        );
      case 2:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.gender_options}>
              <button className={`${styles.gender_btn} ${gender === "female" ? styles.active : ""}`} onClick={() => setGender("female")}>여성</button>
              <button className={`${styles.gender_btn} ${gender === "male" ? styles.active : ""}`} onClick={() => setGender("male")}>남성</button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.input_row}>
              <div className={styles.calendar_options}>
                <button className={`${styles.calendar_btn} ${calendar === "solar" ? styles.active : ""}`} onClick={() => setCalendar("solar")}>
                  {calendar === "solar" && <span className={styles.check_icon}>✓</span>} 양력
                </button>
                <button className={`${styles.calendar_btn} ${calendar === "lunar" ? styles.active : ""}`} onClick={() => setCalendar("lunar")}>
                  {calendar === "lunar" && <span className={styles.check_icon}>✓</span>} 음력
                </button>
              </div>
            </div>
            <input type="text" className={styles.input_field} inputMode="numeric" maxLength={10} value={birthDate} onChange={handleBirthDateChange} />
          </div>
        );
      case 4:
        return (
          <div className={styles.chat_input_group}>
            <select className={styles.input_field} value={birthTime} onChange={(e) => setBirthTime(e.target.value)}>
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        );
      default:
        return null;
    }
  };

  // 현재 스텝의 입력 UI
  const renderCurrentInput = () => {
    if (!unhakTypingDone) return null;

    switch (chatStep) {
      case 1:
        return (
          <div className={styles.chat_input_group}>
            <input
              type="text"
              className={styles.input_field}
              placeholder="예시) 홍길동"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              autoFocus
            />
          </div>
        );

      case 2:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.gender_options}>
              <button
                className={`${styles.gender_btn} ${gender === "female" ? styles.active : ""}`}
                onClick={() => handleGenderSelect("female")}
              >
                여성
              </button>
              <button
                className={`${styles.gender_btn} ${gender === "male" ? styles.active : ""}`}
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
                  className={`${styles.calendar_btn} ${calendar === "solar" ? styles.active : ""}`}
                  onClick={() => setCalendar("solar")}
                >
                  {calendar === "solar" && <span className={styles.check_icon}>✓</span>} 양력
                </button>
                <button
                  className={`${styles.calendar_btn} ${calendar === "lunar" ? styles.active : ""}`}
                  onClick={() => setCalendar("lunar")}
                >
                  {calendar === "lunar" && <span className={styles.check_icon}>✓</span>} 음력
                </button>
              </div>
            </div>
            <input
              type="text"
              className={styles.input_field}
              placeholder="예: 19900312"
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
          <div className={`${styles.chat_input_group} ${styles.chat_input_full}`}>
            <textarea
              className={`${styles.input_field} ${styles.textarea} ${styles.concern_textarea}`}
              placeholder={"적지 않아도 괜찮아요.\n궁금한 점을 알려주시면 더 맞춤 풀이를 해드릴게요."}
              rows={3}
              value={userConcern}
              onChange={(e) => setUserConcern(e.target.value)}
              autoFocus
            />
          </div>
        );

      default:
        return null;
    }
  };

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

      {/* 배경 이미지 */}
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
          alt="운학선인 종합 사주팔자"
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
                운학선인
              </span>
              <span className={`${styles.title_line} ${styles.title_saju}`}>
                사주팔자 풀이
              </span>
            </h1>
            <p className={styles.landing_subtitle}>사주팔자의 깊은 뜻을 풀어드립니다</p>
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
          <div className={styles.chat_messages}>
            {chatMessages.map((msg, idx) => {
              const showSpeaker =
                msg.sender === "unhak" &&
                (idx === 0 || chatMessages[idx - 1]?.sender === "user");

              if (msg.sender === "unhak") {
                return (
                  <div
                    key={idx}
                    className={`${styles.chat_row} ${styles.chat_row_nangja}`}
                  >
                    {showSpeaker && (
                      <div className={styles.chat_speaker}>운학선인</div>
                    )}
                    <div className={styles.chat_bubble_nangja}>
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={idx} className={styles.chat_inline_input}>
                  {renderCompletedInput(msg.step!)}
                </div>
              );
            })}

            {/* 현재 타이핑 중인 운학선인 메시지 */}
            {chatStep >= 0 && (currentUnhakText || isTyping) && (
              <div
                className={`${styles.chat_row} ${styles.chat_row_nangja} ${styles.chat_row_new}`}
              >
                {chatMessages.length === 0 ||
                chatMessages[chatMessages.length - 1]?.sender === "user" ? (
                  <div className={styles.chat_speaker}>운학선인</div>
                ) : null}
                <div className={styles.chat_bubble_nangja}>
                  {currentUnhakText}
                  {isTyping && <span className={styles.typing_cursor} />}
                </div>
              </div>
            )}

            {/* 입력 영역 */}
            {(unhakTypingDone || inputFadingOut) && (
              <div className={inputFadingOut ? styles.chat_inline_input_fadeout : styles.chat_inline_input}>
                {renderCurrentInput()}
              </div>
            )}

            <div className={styles.chat_bottom_spacer} />
            <div ref={chatBottomRef} />
          </div>
        </div>
      )}

      {/* 하단 고정 제출 버튼 */}
      {showChat && chatStep >= 5 && unhakTypingDone && !isLoading && (
        <div className={styles.chat_fixed_bottom}>
          <button
            className={styles.chat_submit_btn}
            onClick={handleSubmit}
            disabled={!isFormValid || isLoading}
          >
            {userConcern.trim() ? "풀이 시작!" : "건너뛰고 풀이 시작!"}
          </button>
        </div>
      )}

      {/* 분석 중 로딩 */}
      {isLoading && (
        <div className={`${styles.analyze_overlay} ${styles.active}`}>
          <div className={styles.analyze_content}>
            <div className={styles.analyze_spinner} />
            <div className={styles.analyze_text}>사주 풀이중</div>
            <div className={styles.analyze_subtext}>
              잠시만요, 팔자의 기운을 살피고 있습니다...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
