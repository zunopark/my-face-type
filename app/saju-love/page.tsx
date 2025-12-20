"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeSaju } from "@/app/actions/analyze";
import { trackPageView, trackFormSubmit } from "@/lib/mixpanel";
import { saveSajuLoveRecord } from "@/lib/db/sajuLoveDB";
import "./saju-love.css";

// 대화 내용
const DIALOGUES = [
  {
    text: "어서오세요,\n인연을 찾아 이 곳에 오셨군요!",
    nextBtnText: "다음",
  },
  {
    text: "먼저 성함과 생년월일을\n알려주시겠어요?",
    nextBtnText: "좋아, 내 이름은..",
  },
];

// 추가 대화 (기본 정보 입력 후)
const ADDITIONAL_DIALOGUES = [
  {
    text: "이대로 연애비책을\n드릴 수도 있지만,",
    nextBtnText: "다음",
  },
  {
    text: "조금만 더 알려주시면\n훨씬 자세한 풀이가 가능하답니다",
    nextBtnText: "응, 어떤걸 알려줄까?",
  },
];

// 시간 옵션
const TIME_OPTIONS = [
  { value: "", label: "태어난 시간을 선택해주세요." },
  { value: "unknown", label: "시간 모름" },
  { value: "00:30", label: "자시 (23:30~01:30)" },
  { value: "02:30", label: "축시 (01:30~03:30)" },
  { value: "04:30", label: "인시 (03:30~05:30)" },
  { value: "06:30", label: "묘시 (05:30~07:30)" },
  { value: "08:30", label: "진시 (07:30~09:30)" },
  { value: "10:30", label: "사시 (09:30~11:30)" },
  { value: "12:30", label: "오시 (11:30~13:30)" },
  { value: "14:30", label: "미시 (13:30~15:30)" },
  { value: "16:30", label: "신시 (15:30~17:30)" },
  { value: "18:30", label: "유시 (17:30~19:30)" },
  { value: "20:30", label: "술시 (19:30~21:30)" },
  { value: "22:30", label: "해시 (21:30~23:30)" },
];

export default function SajuLovePage() {
  const router = useRouter();

  // UI 상태
  const [currentImage, setCurrentImage] = useState("/saju-love/img/nangja2.jpg");
  const [showLanding, setShowLanding] = useState(true);
  const [showDialogue, setShowDialogue] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [showAdditionalForm, setShowAdditionalForm] = useState(false);
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
  const [status, setStatus] = useState<string | null>(null);
  const [userConcern, setUserConcern] = useState("");

  // 타이핑 인터벌 ref
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("saju_love");
  }, []);

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

  // 타이핑 스킵 (클릭 시 즉시 완성)
  const skipTyping = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }, []);

  // 시작하기 버튼
  const handleStart = () => {
    setShowLanding(false);
    setCurrentImage("/saju-love/img/nangja.jpg");

    setTimeout(() => {
      setShowDialogue(true);
      typeText(DIALOGUES[0].text, () => setShowButtons(true));
    }, 500);
  };

  // 다음 대화
  const handleNextDialogue = () => {
    if (isTyping) {
      // 타이핑 중이면 즉시 완성
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
        setCurrentImage("/saju-love/img/nangja.jpg");
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
        setCurrentImage("/saju-love/img/nangja.jpg");
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
    setCurrentImage("/saju-love/img/nangja.jpg");
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

  const isAdditionalFormValid = status;

  // 분석 시작
  const handleSubmit = async () => {
    if (!isAdditionalFormValid) return;

    setIsLoading(true);

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

      // 필요한 데이터만 추출하여 저장 (용량 절약)
      const { dayMaster, pillars, fiveElements, loveFacts, sinsal } = result.data;
      const minimalSajuData = {
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
      };

      // IndexedDB에 저장
      await saveSajuLoveRecord({
        id: resultId,
        createdAt: new Date().toISOString(),
        paid: false,
        input: {
          userName,
          gender: gender!,
          date: birthDate,
          calendar,
          time: birthTime === "unknown" ? null : birthTime || null,
          userConcern: userConcern.trim(),
          status: status!,
        },
        sajuData: minimalSajuData,
        loveAnalysis: null,
      });

      trackFormSubmit("saju_love", {
        gender,
        calendar,
        status,
        birth_date: birthDate,
        birth_time: birthTime === "unknown" ? "모름" : birthTime,
        user_name: name,
        user_concern: userConcern.trim(),
        day_master: minimalSajuData.dayMaster?.char,
        day_master_title: minimalSajuData.dayMaster?.title,
      });

      router.push(`/saju-love/detail?id=${resultId}`);
    } catch (error) {
      console.error("분석 실패:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
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
    <div className="main_body_wrap landing_page">
      {/* 뒤로가기 버튼 */}
      <Link href="/" className="back_btn">
        <span className="material-icons">arrow_back</span>
        <span className="back_btn_text">홈으로</span>
      </Link>

      {/* 배경 이미지 */}
      <div className="landing_bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt="색동낭자 연애사주"
          className="landing_image"
        />
      </div>

      {/* 랜딩 타이틀 */}
      {showLanding && (
        <>
          <div className="landing_title_wrap">
            <h1 className="landing_title">
              <span className="title_line title_name">색동낭자</span>
              <span className="title_line title_saju">연애사주</span>
            </h1>
            <p className="landing_subtitle">당신의 인연을 찾아드립니다</p>
          </div>

          <div className="landing_bottom">
            <button className="landing_start_btn" onClick={handleStart}>
              시작하기
            </button>
          </div>
        </>
      )}

      {/* 대화 UI */}
      {showDialogue && (
        <>
          <div className="dialogue_overlay active" onClick={handleNextDialogue} />
          <div className="dialogue_wrap active" onClick={handleNextDialogue}>
            <div className="dialogue_box">
              <div className="dialogue_speaker">색동낭자</div>
              <div className="dialogue_text">
                {dialogueText.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < dialogueText.split("\n").length - 1 && <br />}
                  </span>
                ))}
                {isTyping && <span className="typing-cursor" />}
              </div>
            </div>
            {showButtons && (
              <div className="dialogue_buttons visible">
                <button
                  className="dialogue_prev_btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevDialogue();
                  }}
                >
                  이전
                </button>
                <button
                  className="dialogue_next_btn"
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
        <div className="input_overlay active">
          <div className="input_form_wrap">
            {/* 이름 */}
            <div className="input_group">
              <label className="input_label">이름</label>
              <input
                type="text"
                className="input_field"
                placeholder="이름을 입력해주세요."
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            {/* 생년월일 + 양력/음력 */}
            <div className="input_group">
              <div className="input_row">
                <label className="input_label">생년월일</label>
                <div className="calendar_options">
                  <button
                    className={`calendar_btn ${
                      calendar === "solar" ? "active" : ""
                    }`}
                    onClick={() => setCalendar("solar")}
                  >
                    {calendar === "solar" && (
                      <span className="check_icon">✓</span>
                    )}{" "}
                    양력
                  </button>
                  <button
                    className={`calendar_btn ${
                      calendar === "lunar" ? "active" : ""
                    }`}
                    onClick={() => setCalendar("lunar")}
                  >
                    {calendar === "lunar" && (
                      <span className="check_icon">✓</span>
                    )}{" "}
                    음력
                  </button>
                </div>
              </div>
              <input
                type="text"
                className="input_field"
                placeholder="예: 20040312"
                inputMode="numeric"
                maxLength={10}
                value={birthDate}
                onChange={handleBirthDateChange}
              />
            </div>

            {/* 태어난 시간 */}
            <div className="input_group">
              <div className="input_row">
                <label className="input_label">태어난 시간</label>
                <button
                  className={`time_unknown_btn ${
                    birthTime === "unknown" ? "active" : ""
                  }`}
                  onClick={() =>
                    setBirthTime(birthTime === "unknown" ? "" : "unknown")
                  }
                >
                  {birthTime === "unknown" && (
                    <span className="check_icon">✓</span>
                  )}{" "}
                  시간 모름
                </button>
              </div>
              <select
                className="input_field"
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
            <div className="input_group">
              <label className="input_label">성별</label>
              <div className="gender_options">
                <button
                  className={`gender_btn ${
                    gender === "female" ? "active" : ""
                  }`}
                  onClick={() => setGender("female")}
                >
                  여성
                </button>
                <button
                  className={`gender_btn ${gender === "male" ? "active" : ""}`}
                  onClick={() => setGender("male")}
                >
                  남성
                </button>
              </div>
            </div>
          </div>

          <div className="input_buttons">
            <button className="input_prev_btn" onClick={handleInputPrev}>
              이전
            </button>
            <button
              className="input_submit_btn"
              onClick={handleInputNext}
              disabled={!isBasicFormValid}
            >
              다 입력했어!
            </button>
          </div>
        </div>
      )}

      {/* 추가 정보 입력 폼 */}
      {showAdditionalForm && (
        <div className="input_overlay active">
          <div className="input_form_wrap">
            {/* 연애 상태 */}
            <div className="input_group">
              <label className="input_label">현재 연애 상태</label>
              <div className="status_options">
                <button
                  className={`status_btn ${
                    status === "single" ? "active" : ""
                  }`}
                  onClick={() => setStatus("single")}
                >
                  솔로
                </button>
                <button
                  className={`status_btn ${status === "some" ? "active" : ""}`}
                  onClick={() => setStatus("some")}
                >
                  썸 타는 중
                </button>
                <button
                  className={`status_btn ${
                    status === "dating" ? "active" : ""
                  }`}
                  onClick={() => setStatus("dating")}
                >
                  연애중
                </button>
                <button
                  className={`status_btn ${
                    status === "breakup" ? "active" : ""
                  }`}
                  onClick={() => setStatus("breakup")}
                >
                  이별 정리중
                </button>
              </div>
            </div>

            {/* 연애 고민 */}
            <div className="input_group">
              <label className="input_label">
                요즘 연애 고민이 있나요?
                <span className="input_optional">(선택)</span>
              </label>
              <textarea
                className="input_field textarea"
                placeholder={
                  "적지 않아도 괜찮아요!\n고민이 있다면 더 맞춤형 답변을 드릴게요."
                }
                rows={4}
                value={userConcern}
                onChange={(e) => setUserConcern(e.target.value)}
              />
            </div>
          </div>

          <div className="input_buttons">
            <button className="input_prev_btn" onClick={handleAdditionalPrev}>
              이전
            </button>
            <button
              className="input_submit_btn"
              onClick={handleSubmit}
              disabled={!isAdditionalFormValid || isLoading}
            >
              {isLoading ? "분석 중..." : "분석 시작!"}
            </button>
          </div>
        </div>
      )}

      {/* 분석 중 로딩 */}
      {isLoading && (
        <div className="analyze_overlay active">
          <div className="analyze_content">
            <div className="analyze_spinner" />
            <div className="analyze_text">사주 분석중</div>
            <div className="analyze_subtext">잠시만 기다려주세요...</div>
          </div>
        </div>
      )}
    </div>
  );
}
