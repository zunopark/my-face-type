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

// 필드 순서: 성별 → 생년월일 → 시간 → 이름 → 연애상태
// visibleFields: 현재까지 보이는 필드 수 (0 = 아직 폼 안 보임, 1 = 성별만, ...)
const TOTAL_FIELDS = 5;

export default function SajuLovePage() {
  const router = useRouter();

  // UI 상태
  const [currentImage, setCurrentImage] = useState(
    "/saju-love/img/nangja2.jpg"
  );
  const [prevImage, setPrevImage] = useState("/saju-love/img/nangja2.jpg");
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showGreeting, setShowGreeting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConcern, setShowConcern] = useState(false);
  const [concernTypingDone, setConcernTypingDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 보이는 필드 수 (1~6)
  const [visibleFields, setVisibleFields] = useState(1);

  // 인사 대화 상태
  const [dialogueText, setDialogueText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [greetingDone, setGreetingDone] = useState(false);

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
  const formBottomRef = useRef<HTMLDivElement | null>(null);

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

  // 타이핑 효과
  const typeText = useCallback((text: string, onComplete: () => void) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    setIsTyping(true);
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

  // 필드 추가 시 하단으로 스크롤
  useEffect(() => {
    if (formBottomRef.current) {
      setTimeout(() => {
        formBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [visibleFields]);

  // 다음 필드 보이기
  const revealNextField = useCallback(() => {
    setVisibleFields((prev) => Math.min(prev + 1, TOTAL_FIELDS));
  }, []);

  // 시작하기
  const handleStart = () => {
    setShowLanding(false);
    changeImage("/saju-love/img/nangja.jpg");
    setTimeout(() => {
      setShowGreeting(true);
      typeText("안녕하세요!\n사주 정보를 알려주시면\n인연을 풀어드릴게요.", () => {
        setGreetingDone(true);
      });
    }, 500);
  };

  // 인사 후 폼 시작
  const handleGreetingNext = () => {
    if (isTyping) {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
      setDialogueText("안녕하세요!\n사주 정보를 알려주시면\n인연을 풀어드릴게요.");
      setIsTyping(false);
      setGreetingDone(true);
      return;
    }
    setShowGreeting(false);
    setShowForm(true);
    setVisibleFields(1);
  };

  // 성별 선택 → 자동으로 다음 필드
  const handleGenderSelect = (value: string) => {
    setGender(value);
    if (visibleFields === 1) {
      setTimeout(() => revealNextField(), 350);
    }
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

    // 8자리 다 입력하면 자동으로 다음
    if (value.length === 8 && visibleFields === 2) {
      setTimeout(() => revealNextField(), 400);
    }
  };

  // 시간 선택 시 자동으로 다음
  const handleBirthTimeChange = (value: string) => {
    setBirthTime(value);
    if (value && visibleFields === 3) {
      setTimeout(() => revealNextField(), 350);
    }
  };

  // 연애 상태 선택 → 고민 화면으로 전환
  const handleStatusSelect = (value: string) => {
    setStatus(value);
    if (visibleFields === 5) {
      setTimeout(() => {
        setShowForm(false);
        setShowConcern(true);
        setConcernTypingDone(false);
        typeText(
          "혹시 요즘 연애 고민이 있으세요?\n없으면 바로 넘어가도 돼요!",
          () => setConcernTypingDone(true)
        );
      }, 400);
    }
  };

  // 이름 입력 후 다음 (엔터 또는 버튼)
  const handleNameNext = () => {
    if (userName.trim() && visibleFields === 4) {
      revealNextField();
    }
  };

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

  return (
    <div className={`${styles.main_body_wrap} ${styles.landing_page}`}>
      {/* 뒤로가기 버튼 */}
      <button className={styles.back_btn} onClick={() => router.push("/")}>
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

      {/* 인사 대화 */}
      {showGreeting && (
        <div className={styles.step_overlay} onClick={handleGreetingNext}>
          <div className={styles.step_spacer} />
          <div className={styles.step_dialogue}>
            <div className={styles.dialogue_speaker}>색동낭자</div>
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
          {greetingDone && (
            <button
              className={styles.step_next_btn_full}
              onClick={handleGreetingNext}
            >
              시작할게요
            </button>
          )}
        </div>
      )}

      {/* 프로그레시브 폼 */}
      {showForm && !isLoading && (
        <div className={styles.form_overlay}>
          <div className={styles.form_scroll}>
            {/* 필드 1: 성별 */}
            {visibleFields >= 1 && (
              <div className={styles.form_field} key="gender">
                <label className={styles.form_label}>성별</label>
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
            )}

            {/* 필드 2: 생년월일 */}
            {visibleFields >= 2 && (
              <div className={styles.form_field_enter} key="birthDate">
                <div className={styles.input_row}>
                  <label className={styles.form_label}>생년월일</label>
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
            )}

            {/* 필드 3: 태어난 시간 */}
            {visibleFields >= 3 && (
              <div className={styles.form_field_enter} key="birthTime">
                <div className={styles.input_row}>
                  <label className={styles.form_label}>태어난 시간</label>
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
            )}

            {/* 필드 4: 이름 */}
            {visibleFields >= 4 && (
              <div className={styles.form_field_enter} key="name">
                <label className={styles.form_label}>이름</label>
                <div className={styles.name_input_row}>
                  <input
                    type="text"
                    className={styles.input_field}
                    placeholder="이름을 알려주세요."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleNameNext();
                    }}
                    autoFocus
                  />
                  {visibleFields === 4 && (
                    <button
                      className={styles.inline_next_btn}
                      onClick={handleNameNext}
                      disabled={!userName.trim()}
                    >
                      다음
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 필드 5: 연애 상태 */}
            {visibleFields >= 5 && (
              <div className={styles.form_field_enter} key="status">
                <label className={styles.form_label}>현재 연애 상태</label>
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
            )}

            <div ref={formBottomRef} />
          </div>
        </div>
      )}

      {/* 연애 고민 화면 (말풍선 + textarea) */}
      {showConcern && !isLoading && (
        <div className={styles.step_overlay}>
          <div className={styles.step_spacer} />
          <div className={styles.step_dialogue}>
            <div className={styles.dialogue_speaker}>색동낭자</div>
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
          {concernTypingDone && (
            <div className={styles.concern_area}>
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
                className={styles.step_next_btn_full}
                onClick={handleSubmit}
                disabled={!isFormValid || isLoading}
              >
                {userConcern.trim()
                  ? "풀이 시작!"
                  : "건너뛰고 풀이 시작!"}
              </button>
            </div>
          )}
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
