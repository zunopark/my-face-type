"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { computeSaju } from "@/app/actions/analyze";
import { saveNewYearRecord } from "@/lib/db/newYearDB";
import { trackPageView, trackFormSubmit } from "@/lib/mixpanel";
import styles from "./new-year.module.css";

// 대화 내용
const DIALOGUES = [
  {
    text: "어서오세요,\n2026년 운세를 보러 오셨군요!",
    nextBtnText: "다음",
  },
  {
    text: "신년 운세를 보기 위해\n생년월일을 알려주시겠어요?",
    nextBtnText: "좋아, 내 이름은..",
  },
];

// 추가 대화 (기본 정보 입력 후)
const ADDITIONAL_DIALOGUES = [
  {
    text: "기본 정보 감사합니다!\n조금만 더 알려주시면...",
    nextBtnText: "다음",
  },
  {
    text: "훨씬 정확한 2026년 운세를\n알려드릴 수 있어요",
    nextBtnText: "응, 어떤걸 알려줄까?",
  },
];

// 시간 옵션
const TIME_OPTIONS = [
  { value: "", label: "태어난 시간을 선택해주세요." },
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
  { value: "employee", label: "직장인" },
  { value: "student", label: "학생(초,중,고)" },
  { value: "university", label: "대학생" },
  { value: "job_seeker", label: "취업준비" },
  { value: "exam_prep", label: "고시/시험준비" },
  { value: "civil_servant", label: "공무원" },
  { value: "housewife", label: "주부" },
  { value: "business_owner", label: "사업/자영업" },
  { value: "freelancer", label: "프리랜서" },
  { value: "professional", label: "전문직" },
  { value: "other", label: "직접입력" },
];

// 연애 상태 옵션
const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "솔로" },
  { value: "some", label: "썸" },
  { value: "couple", label: "연애중" },
  { value: "married", label: "기혼" },
  { value: "divorced", label: "돌싱" },
];

export default function NewYearPage() {
  const router = useRouter();

  // UI 상태
  const [currentImage] = useState("/new-year/img/intro.png");
  const [showLanding, setShowLanding] = useState(true);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
  const [additionalStep, setAdditionalStep] = useState(1); // 1: 연애상태, 2: 직업, 3: 고민
  const [isLoading, setIsLoading] = useState(false);

  // 대화 상태
  const [currentDialogue, setCurrentDialogue] = useState(0);
  const [isAdditionalDialogue, setIsAdditionalDialogue] = useState(false);
  const [dialogueText, setDialogueText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  // 폼 상태
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [calendar, setCalendar] = useState("solar");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobCustom, setJobCustom] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null);
  const [wish2026, setWish2026] = useState("");

  // 타이핑 인터벌 ref
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 페이지 뷰 트래킹 & 이미지 프리로드
  useEffect(() => {
    trackPageView("new_year");
    const img = new window.Image();
    img.src = "/new-year/img/intro.png";
  }, []);

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

  // 타이핑 스킵
  const skipTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  // 시작하기 버튼
  const handleStart = () => {
    setShowLanding(false);
    setTimeout(() => {
      setShowDialogue(true);
      typeText(DIALOGUES[0].text, () => setShowButtons(true));
    }, 300);
  };

  // 다음 대화
  const handleNextDialogue = () => {
    if (isTyping) {
      skipTyping();
      const dialogues = isAdditionalDialogue ? ADDITIONAL_DIALOGUES : DIALOGUES;
      setDialogueText(dialogues[currentDialogue].text);
      setIsTyping(false);
      setShowButtons(true);
      return;
    }

    if (isAdditionalDialogue) {
      if (currentDialogue < ADDITIONAL_DIALOGUES.length - 1) {
        setCurrentDialogue((prev) => prev + 1);
        setShowButtons(false);
        typeText(ADDITIONAL_DIALOGUES[currentDialogue + 1].text, () =>
          setShowButtons(true)
        );
      } else {
        setShowDialogue(false);
        setAdditionalStep(1);
        setShowAdditionalForm(true);
      }
    } else {
      if (currentDialogue < DIALOGUES.length - 1) {
        setCurrentDialogue((prev) => prev + 1);
        setShowButtons(false);
        typeText(DIALOGUES[currentDialogue + 1].text, () =>
          setShowButtons(true)
        );
      } else {
        setShowDialogue(false);
        setShowInputForm(true);
      }
    }
  };

  // 이전 대화
  const handlePrevDialogue = () => {
    if (isAdditionalDialogue) {
      if (currentDialogue > 0) {
        setCurrentDialogue((prev) => prev - 1);
        setShowButtons(false);
        typeText(ADDITIONAL_DIALOGUES[currentDialogue - 1].text, () =>
          setShowButtons(true)
        );
      } else {
        setIsAdditionalDialogue(false);
        setCurrentDialogue(0);
        setShowDialogue(false);
        setShowInputForm(true);
      }
    } else {
      if (currentDialogue > 0) {
        setCurrentDialogue((prev) => prev - 1);
        setShowButtons(false);
        typeText(DIALOGUES[currentDialogue - 1].text, () =>
          setShowButtons(true)
        );
      } else {
        setShowDialogue(false);
        setShowLanding(true);
        setCurrentDialogue(0);
      }
    }
  };

  // 기본 폼 이전 버튼
  const handleInputPrev = () => {
    setShowInputForm(false);
    setShowDialogue(true);
    setCurrentDialogue(DIALOGUES.length - 1);
    typeText(DIALOGUES[DIALOGUES.length - 1].text, () => setShowButtons(true));
  };

  // 기본 폼 다음 버튼 -> 추가 대화
  const handleInputNext = () => {
    setShowInputForm(false);
    setIsAdditionalDialogue(true);
    setCurrentDialogue(0);
    setShowDialogue(true);
    typeText(ADDITIONAL_DIALOGUES[0].text, () => setShowButtons(true));
  };

  // 추가 폼 이전 버튼
  const handleAdditionalPrev = () => {
    setShowAdditionalForm(false);
    setShowDialogue(true);
    setCurrentDialogue(ADDITIONAL_DIALOGUES.length - 1);
    typeText(ADDITIONAL_DIALOGUES[ADDITIONAL_DIALOGUES.length - 1].text, () =>
      setShowButtons(true)
    );
  };

  // 생년월일 포맷팅
  const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    let formatted = "";
    if (value.length > 0) formatted = value.slice(0, 4);
    if (value.length > 4) formatted += "-" + value.slice(4, 6);
    if (value.length > 6) formatted += "-" + value.slice(6, 8);

    setBirthDate(formatted);
  };

  // 폼 유효성 검사
  const isBasicFormValid =
    userName.trim() && birthDate.replace(/\D/g, "").length === 8 && gender;

  const isAdditionalFormValid = jobStatus && relationshipStatus;

  // 제출
  const handleSubmit = async () => {
    if (!isAdditionalFormValid) return;

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

      // 폼 제출 트래킹
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

      // detail 페이지로 이동 (결제 전)
      router.push(`/new-year/detail?id=${recordId}`);
    } catch (error) {
      console.error("에러:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const getCurrentBtnText = () => {
    if (isAdditionalDialogue) {
      return ADDITIONAL_DIALOGUES[currentDialogue]?.nextBtnText || "다음";
    }
    return DIALOGUES[currentDialogue]?.nextBtnText || "다음";
  };

  return (
    <div className={`main_body_wrap ${styles.landing_page}`}>
      {/* 뒤로가기 버튼 */}
      <button className={styles.back_btn} onClick={() => router.push("/")}>
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>홈으로</span>
      </button>

      {/* 배경 이미지 */}
      <div className={styles.landing_bg}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="도령 신년운세"
          className={styles.landing_image}
        />
      </div>

      {/* 랜딩 타이틀 */}
      {showLanding && (
        <>
          <div className={styles.newyear_title_wrap}>
            <h1 className={styles.newyear_title}>
              <span className={`${styles.newyear_title_line} ${styles.newyear_title_name}`}>까치도령</span>
              <span className={`${styles.newyear_title_line} ${styles.newyear_title_saju}`}>신년운세</span>
            </h1>
            <p className={styles.landing_subtitle}>2026년 병오년 운세를 알려드립니다</p>
          </div>

          <div className={styles.landing_bottom}>
            <button className={styles.landing_start_btn} onClick={handleStart}>
              시작하기
            </button>
          </div>
        </>
      )}

      {/* 대화 UI */}
      {showDialogue && (
        <>
          <div
            className={`${styles.dialogue_overlay} ${styles.active}`}
            onClick={handleNextDialogue}
          />
          <div className={`${styles.dialogue_wrap} ${styles.active}`} onClick={handleNextDialogue}>
            <div className={styles.dialogue_box}>
              <div className={styles.dialogue_speaker}>까치도령</div>
              <div className={styles.dialogue_text}>
                {dialogueText.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < dialogueText.split("\n").length - 1 && <br />}
                  </span>
                ))}
                {isTyping && <span className={styles.typing_cursor} />}
              </div>
            </div>
            {showButtons && (
              <div className={`${styles.dialogue_buttons} ${styles.visible}`}>
                <button
                  className={styles.dialogue_prev_btn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevDialogue();
                  }}
                >
                  이전
                </button>
                <button
                  className={styles.dialogue_next_btn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextDialogue();
                  }}
                >
                  {getCurrentBtnText()}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 기본 정보 입력 폼 */}
      {showInputForm && (
        <div className={`${styles.input_overlay} ${styles.active}`}>
          <div className={styles.input_form_wrap}>
            {/* 이름 */}
            <div className={styles.input_group}>
              <label className={styles.input_label}>이름</label>
              <input
                type="text"
                className={styles.input_field}
                placeholder="이름을 입력해주세요."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            {/* 생년월일 + 양력/음력 */}
            <div className={styles.input_group}>
              <div className={styles.input_row}>
                <label className={styles.input_label}>생년월일</label>
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
              />
            </div>

            {/* 태어난 시간 */}
            <div className={styles.input_group}>
              <div className={styles.input_row}>
                <label className={styles.input_label}>태어난 시간</label>
                <button
                  className={`${styles.time_unknown_btn} ${
                    birthTime === "unknown" ? styles.active : ""
                  }`}
                  onClick={() =>
                    setBirthTime(birthTime === "unknown" ? "" : "unknown")
                  }
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
                onChange={(e) => setBirthTime(e.target.value)}
              >
                {TIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 성별 */}
            <div className={styles.input_group}>
              <label className={styles.input_label}>성별</label>
              <div className={styles.gender_options}>
                <button
                  className={`${styles.gender_btn} ${
                    gender === "female" ? styles.active : ""
                  }`}
                  onClick={() => setGender("female")}
                >
                  여성
                </button>
                <button
                  className={`${styles.gender_btn} ${gender === "male" ? styles.active : ""}`}
                  onClick={() => setGender("male")}
                >
                  남성
                </button>
              </div>
            </div>
          </div>

          <div className={styles.input_buttons}>
            <button className={styles.input_prev_btn} onClick={handleInputPrev}>
              이전
            </button>
            <button
              className={styles.input_submit_btn}
              onClick={handleInputNext}
              disabled={!isBasicFormValid}
            >
              다 입력했어!
            </button>
          </div>
        </div>
      )}

      {/* 추가 정보 입력 폼 - 단계별 */}
      {showAdditionalForm && (
        <div className={`${styles.input_overlay} ${styles.active}`}>
          <div className={styles.input_form_wrap}>
            {/* Step 1: 연애 상태 */}
            {additionalStep === 1 && (
              <div className={styles.input_group}>
                <label className={styles.input_label}>현재 연애 상태</label>
                <div className={styles.status_options}>
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.status_btn} ${
                        relationshipStatus === option.value ? styles.active : ""
                      }`}
                      onClick={() => setRelationshipStatus(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: 직업 상태 */}
            {additionalStep === 2 && (
              <div className={styles.input_group}>
                <label className={styles.input_label}>하시는 일</label>
                <div className={styles.status_options}>
                  {JOB_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`${styles.status_btn} ${
                        jobStatus === option.value ? styles.active : ""
                      }`}
                      onClick={() => setJobStatus(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {jobStatus === "other" && (
                  <input
                    type="text"
                    className={styles.input_field}
                    placeholder="직접 입력해주세요"
                    value={jobCustom}
                    onChange={(e) => setJobCustom(e.target.value)}
                    style={{ marginTop: "12px" }}
                  />
                )}
              </div>
            )}

            {/* Step 3: 고민/중요한 일 */}
            {additionalStep === 3 && (
              <div className={styles.input_group}>
                <label className={styles.input_label}>
                  2026년, 고민이나 중요한 일이 있으신가요?
                  <span className={styles.input_optional}>(선택)</span>
                </label>
                <textarea
                  className={`${styles.input_field} ${styles.textarea}`}
                  placeholder={
                    "적지 않아도 괜찮아요!\n고민이 있다면 더 맞춤형 답변을 드릴게요."
                  }
                  rows={4}
                  value={wish2026}
                  onChange={(e) => setWish2026(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className={styles.input_buttons}>
            <button
              className={styles.input_prev_btn}
              onClick={() => {
                if (additionalStep === 1) {
                  handleAdditionalPrev();
                } else {
                  setAdditionalStep(additionalStep - 1);
                }
              }}
            >
              이전
            </button>
            {additionalStep < 3 ? (
              <button
                className={styles.input_submit_btn}
                onClick={() => setAdditionalStep(additionalStep + 1)}
                disabled={
                  (additionalStep === 1 && !relationshipStatus) ||
                  (additionalStep === 2 && (!jobStatus || (jobStatus === "other" && !jobCustom.trim())))
                }
              >
                다음
              </button>
            ) : (
              <button
                className={styles.input_submit_btn}
                onClick={handleSubmit}
                disabled={!isAdditionalFormValid || isLoading}
              >
                {isLoading ? "분석 중..." : "분석 시작!"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 분석 중 로딩 */}
      {isLoading && (
        <div className={`${styles.analyze_overlay} ${styles.active}`}>
          <div className={styles.analyze_content}>
            <div className={styles.analyze_spinner} />
            <div className={styles.analyze_text}>사주 분석중</div>
            <div className={styles.analyze_subtext}>잠시만 기다려주세요...</div>
          </div>
        </div>
      )}
    </div>
  );
}
