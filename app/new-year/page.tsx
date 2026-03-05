"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeSaju } from "@/app/actions/analyze";
import { saveNewYearRecord } from "@/lib/db/newYearDB";
import { trackPageView, trackFormSubmit } from "@/lib/mixpanel";
import styles from "./new-year.module.css";

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

// 직업 상태 옵션
const JOB_STATUS_OPTIONS = [
  { value: "회사원/직장인", label: "회사원/직장인" },
  { value: "공무원/공공기관", label: "공무원/공공기관" },
  { value: "전문직", label: "전문직" },
  { value: "사업/자영업", label: "사업/자영업" },
  { value: "프리랜서/크리에이터", label: "프리랜서/크리에이터" },
  { value: "학생", label: "학생" },
  { value: "취업/시험준비", label: "취업/시험준비" },
  { value: "육아휴직", label: "육아휴직" },
  { value: "전업주부", label: "전업주부" },
  { value: "은퇴/퇴직", label: "은퇴/퇴직" },
  { value: "무직/휴식중", label: "무직/휴식중" },
  { value: "other", label: "직접입력" },
];

// 연애 상태 옵션
const RELATIONSHIP_OPTIONS = [
  { value: "솔로", label: "솔로" },
  { value: "썸", label: "썸" },
  { value: "연애중", label: "연애중" },
  { value: "기혼", label: "기혼" },
  { value: "돌싱", label: "돌싱" },
];

type ChatMessage = {
  sender: "nangja" | "user";
  text: string;
  step?: number;
};

export default function NewYearPage() {
  const router = useRouter();

  // UI 상태
  const [showLanding, setShowLanding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Chat 상태
  const [chatStep, setChatStep] = useState(-1);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentNangjaText, setCurrentNangjaText] = useState("");
  const [nangjaTypingDone, setNangjaTypingDone] = useState(false);
  const [inputFadingOut, setInputFadingOut] = useState(false);

  // 폼 상태
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [calendar, setCalendar] = useState("solar");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobCustom, setJobCustom] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(
    null
  );
  const [wish2026, setWish2026] = useState("");

  // refs
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("new_year");
  }, []);

  // 스크롤 to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, []);

  // 타이핑 효과
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

  // chatMessages or chatStep 변경 시 스크롤 (fadeOut 중에는 스킵)
  useEffect(() => {
    if (!inputFadingOut) {
      scrollToBottom();
    }
  }, [chatMessages, chatStep, nangjaTypingDone, inputFadingOut, scrollToBottom]);

  // 도령 메시지들 정의
  const NANGJA_MESSAGES: Record<number, string> = {
    0: "안녕하세요!\n사주 정보를 알려주시면\n2026년 운세를 풀어드릴게요.",
    1: "어떻게 불러드릴까요?",
    2: "성별을 알려주세요.",
    3: "생년월일은요?",
    4: "태어난 시간도 알고 계신가요?",
    5: "현재 연애 상태는 어떠세요?",
    6: "현재 어떤 일을 하고 계신가요?",
    7: "2026년, 고민이나 중요한 일이 있으세요?\n없으면 바로 넘어가도 돼요!",
  };

  // 다음 스텝으로 이동
  const goToStep = useCallback(
    (step: number) => {
      setChatStep(step);
      const msg = NANGJA_MESSAGES[step];
      if (msg) {
        setTimeout(() => {
          typeNangjaMessage(msg);
        }, 400);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeNangjaMessage]
  );

  // 유저 답변 추가 + 다음 단계 (fadeOut → 말풍선 → 다음 질문)
  const addUserAnswer = useCallback(
    (text: string, nextStep: number) => {
      setInputFadingOut(true);

      setTimeout(() => {
        const nangjaMsg = NANGJA_MESSAGES[chatStep];
        // 메시지 추가와 동시에 입력창 제거 → 스크롤 위치 유지
        const chatEl = chatBottomRef.current?.parentElement;
        const scrollBefore = chatEl?.scrollTop ?? 0;

        setChatMessages((prev) => [
          ...prev,
          { sender: "nangja", text: nangjaMsg },
          { sender: "user", text, step: chatStep },
        ]);
        setCurrentNangjaText("");
        setNangjaTypingDone(false);
        setInputFadingOut(false);

        // 스크롤 위치 복원 후 부드럽게 이동
        requestAnimationFrame(() => {
          if (chatEl) chatEl.scrollTop = scrollBefore;
          scrollToBottom();
        });

        goToStep(nextStep);
      }, 250);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatStep, goToStep, scrollToBottom]
  );

  // 시작하기 (랜딩 -> 채팅) - 인사 타이핑 후 이름 질문
  const handleStart = () => {
    setShowLanding(false);
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
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setCurrentNangjaText(NANGJA_MESSAGES[0]);
      setIsTyping(false);
      setNangjaTypingDone(true);
      return;
    }
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
  const handleRelationshipSelect = (value: string) => {
    setRelationshipStatus(value);
    const opt = RELATIONSHIP_OPTIONS.find((r) => r.value === value);
    const label = opt ? opt.label : value;
    addUserAnswer(label, 6);
  };

  // Step 6: 직업 선택
  const handleJobSelect = (value: string) => {
    setJobStatus(value);
    if (value !== "other") {
      const opt = JOB_STATUS_OPTIONS.find((j) => j.value === value);
      const label = opt ? opt.label : value;
      addUserAnswer(label, 7);
    }
  };

  // Step 6: 직접입력 다음
  const handleJobCustomNext = () => {
    if (jobCustom.trim() && chatStep === 6) {
      addUserAnswer(jobCustom.trim(), 7);
    }
  };

  // 수정: 유저 버블 탭하여 해당 스텝의 input만 다시 보여주기
  const handleEditAnswer = useCallback(
    (step: number) => {
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
        setRelationshipStatus(null);
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
      }
      if (step === 2) {
        setGender(null);
        setBirthDate("");
        setBirthTime("");
        setRelationshipStatus(null);
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
      }
      if (step === 3) {
        setBirthDate("");
        setBirthTime("");
        setRelationshipStatus(null);
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
      }
      if (step === 4) {
        setBirthTime("");
        setRelationshipStatus(null);
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
      }
      if (step === 5) {
        setRelationshipStatus(null);
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
      }
      if (step === 6) {
        setJobStatus(null);
        setJobCustom("");
        setWish2026("");
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
    userName.trim() !== "" &&
    gender !== null &&
    birthDate.replace(/\D/g, "").length === 8 &&
    jobStatus !== null &&
    (jobStatus !== "other" || jobCustom.trim() !== "") &&
    relationshipStatus !== null;

  // 분석 시작
  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      const sajuResult = await computeSaju({
        gender: gender!,
        date: birthDate,
        time: birthTime === "unknown" ? null : birthTime || null,
        calendar,
      });

      if (!sajuResult.success || !sajuResult.data) {
        throw new Error("사주 계산 실패");
      }

      const recordId = crypto.randomUUID();

      const record = {
        id: recordId,
        createdAt: new Date().toISOString(),
        input: {
          userName,
          gender: gender!,
          date: birthDate,
          calendar: calendar as "solar" | "lunar",
          time: birthTime === "unknown" ? null : birthTime || null,
          jobStatus: jobStatus === "other" ? jobCustom : jobStatus!,
          relationshipStatus: relationshipStatus!,
          wish2026,
        },
        rawSajuData: sajuResult.data,
        sajuData: {
          dayMaster: sajuResult.data.dayMaster || { char: "", title: "" },
          pillars: sajuResult.data.pillars || {},
          fiveElements: sajuResult.data.fiveElements,
          sinsal: sajuResult.data.sinsal,
          daeun: sajuResult.data.daeun,
          zodiac: sajuResult.data.zodiac,
          yongsin: sajuResult.data.yongsin,
        },
        analysis: null,
        isAnalyzing: false,
        paid: false,
      };

      await saveNewYearRecord(record);

      trackFormSubmit("new_year", {
        user_name: userName,
        gender: gender,
        birth_date: birthDate,
        birth_time: birthTime || "unknown",
        calendar: calendar,
        job_status: jobStatus === "other" ? jobCustom : jobStatus,
        relationship_status: relationshipStatus,
        has_wish: !!wish2026,
        day_master: sajuResult.data.dayMaster?.char,
      });

      router.push(`/new-year/detail?id=${recordId}`);
    } catch (error) {
      console.error("에러:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
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
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.status_btn} ${
                    relationshipStatus === option.value ? styles.active : ""
                  }`}
                  onClick={() => handleRelationshipSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 6:
        return (
          <div className={styles.chat_input_group}>
            <div className={styles.status_options_scrollable}>
              {JOB_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.status_btn} ${
                    jobStatus === option.value ? styles.active : ""
                  }`}
                  onClick={() => handleJobSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {jobStatus === "other" && (
              <div className={styles.name_input_row}>
                <input
                  type="text"
                  className={styles.input_field}
                  placeholder="직접 입력해주세요"
                  value={jobCustom}
                  onChange={(e) => setJobCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJobCustomNext();
                  }}
                  autoFocus
                />
                <button
                  className={styles.inline_next_btn}
                  onClick={handleJobCustomNext}
                  disabled={!jobCustom.trim()}
                >
                  다음
                </button>
              </div>
            )}
          </div>
        );

      case 7:
        return (
          <div className={`${styles.chat_input_group} ${styles.chat_input_full}`}>
            <textarea
              className={`${styles.input_field} ${styles.textarea} ${styles.concern_textarea}`}
              placeholder={
                "적지 않아도 괜찮아요!\n고민을 알려주시면 더 맞춤 풀이를 해드려요."
              }
              rows={3}
              value={wish2026}
              onChange={(e) => setWish2026(e.target.value)}
              autoFocus
            />
            <button
              className={styles.chat_submit_btn}
              onClick={handleSubmit}
              disabled={!isFormValid || isLoading}
            >
              {wish2026.trim() ? "풀이 시작!" : "건너뛰고 풀이 시작!"}
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
    <div className={`main_body_wrap ${styles.landing_page}`}>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/new-year/img/intro.png"
          alt="도령 신년운세"
          className={styles.landing_image}
        />
      </div>

      {/* 랜딩 */}
      {showLanding && (
        <>
          <div className={styles.newyear_title_wrap}>
            <h1 className={styles.newyear_title}>
              <span
                className={`${styles.newyear_title_line} ${styles.newyear_title_name}`}
              >
                까치도령
              </span>
              <span
                className={`${styles.newyear_title_line} ${styles.newyear_title_saju}`}
              >
                신년운세
              </span>
            </h1>
            <p className={styles.landing_subtitle}>
              2026년 병오년 운세를 알려드립니다
            </p>
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
                    <div className={styles.chat_speaker}>까치도령</div>
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

            {/* 현재 타이핑 중인 도령 메시지 */}
            {chatStep >= 0 && (currentNangjaText || isTyping) && (
              <div
                className={`${styles.chat_row} ${styles.chat_row_nangja} ${styles.chat_row_new}`}
              >
                {chatMessages.length === 0 ||
                chatMessages[chatMessages.length - 1]?.sender === "user" ? (
                  <div className={styles.chat_speaker}>까치도령</div>
                ) : null}
                <div className={styles.chat_bubble_nangja}>
                  {currentNangjaText}
                  {isTyping && <span className={styles.typing_cursor} />}
                </div>
              </div>
            )}

            {/* 입력 영역 - 가운데 인라인 */}
            {(nangjaTypingDone || inputFadingOut) && (
              <div className={inputFadingOut ? styles.chat_inline_input_fadeout : styles.chat_inline_input}>
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
            <div className={styles.analyze_text}>사주 분석중</div>
            <div className={styles.analyze_subtext}>
              잠시만 기다려주세요...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
