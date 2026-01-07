"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeSaju } from "@/app/actions/analyze";
import { saveNewYearRecord } from "@/lib/db/newYearDB";
import "./new-year.css";

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
  { value: "job_seeker", label: "취준생" },
  { value: "student", label: "학생" },
  { value: "freelancer", label: "프리랜서" },
  { value: "business_owner", label: "사업가" },
  { value: "unemployed", label: "무직" },
];

// 연애 상태 옵션
const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "솔로" },
  { value: "some", label: "썸" },
  { value: "couple", label: "연애중" },
  { value: "married", label: "기혼" },
];

export default function NewYearPage() {
  const router = useRouter();

  // UI 상태
  const [showLanding, setShowLanding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 기본 사주 입력
  const [userName, setUserName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [calendar, setCalendar] = useState("solar");

  // 신년 사주 추가 입력
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(
    null
  );
  const [wish2026, setWish2026] = useState("");

  // 폼 유효성 검사
  const isFormValid =
    userName.trim() &&
    birthDate &&
    birthTime &&
    gender &&
    jobStatus &&
    relationshipStatus;

  // 시작하기
  const handleStart = () => {
    setShowLanding(false);
  };

  // 제출
  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsLoading(true);

    try {
      // 사주 계산
      const sajuResult = await computeSaju({
        gender: gender!,
        date: birthDate,
        time: birthTime === "unknown" ? null : birthTime,
        calendar,
      });

      if (!sajuResult.success || !sajuResult.data) {
        throw new Error("사주 계산 실패");
      }

      // 레코드 생성
      const recordId = `newyear_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      const record = {
        id: recordId,
        createdAt: new Date().toISOString(),
        input: {
          userName,
          gender: gender!,
          date: birthDate,
          calendar: calendar as "solar" | "lunar",
          time: birthTime === "unknown" ? null : birthTime,
          jobStatus: jobStatus!,
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
        },
        analysis: null,
        isAnalyzing: false,
      };

      // IndexedDB 저장
      await saveNewYearRecord(record);

      // 결과 페이지로 이동
      router.push(`/new-year/result?id=${recordId}`);
    } catch (error) {
      console.error("에러:", error);
      alert("오류가 발생했습니다. 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  // 랜딩 화면
  if (showLanding) {
    return (
      <div className="new_year_wrap">
        <div className="landing_screen">
          <p className="landing_title">천기동자의</p>
          <p className="landing_subtitle">
            새해 운세를 미리 엿보고
            <br />
            한 해를 준비하세요
          </p>
          <p className="landing_year">2026</p>
          <p className="landing_year_label">병오년 신년 운세</p>
          <button className="landing_start_btn" onClick={handleStart}>
            신년 운세 보기
          </button>
        </div>
      </div>
    );
  }

  // 입력 폼 화면
  return (
    <div className="new_year_wrap">
      <div className="input_screen">
        <div className="input_header">
          <p className="input_header_title">2026 신년 사주</p>
          <p className="input_header_subtitle">
            정확한 분석을 위해 정보를 입력해주세요
          </p>
        </div>

        {/* 섹션 1: 기본 정보 */}
        <div className="input_section">
          <p className="section_title">
            <span className="section_number">1</span>
            기본 정보
          </p>

          <div className="input_group">
            <label className="input_label">이름</label>
            <input
              type="text"
              className="input_field"
              placeholder="이름을 입력해주세요"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="input_group">
            <label className="input_label">성별</label>
            <div className="radio_group">
              <button
                className={`radio_btn ${gender === "male" ? "active" : ""}`}
                onClick={() => setGender("male")}
              >
                남성
              </button>
              <button
                className={`radio_btn ${gender === "female" ? "active" : ""}`}
                onClick={() => setGender("female")}
              >
                여성
              </button>
            </div>
          </div>

          <div className="input_group">
            <label className="input_label">생년월일</label>
            <input
              type="date"
              className="input_field"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <div className="input_group">
            <label className="input_label">역법</label>
            <div className="radio_group">
              <button
                className={`radio_btn ${calendar === "solar" ? "active" : ""}`}
                onClick={() => setCalendar("solar")}
              >
                양력
              </button>
              <button
                className={`radio_btn ${calendar === "lunar" ? "active" : ""}`}
                onClick={() => setCalendar("lunar")}
              >
                음력
              </button>
            </div>
          </div>

          <div className="input_group">
            <label className="input_label">태어난 시간</label>
            <select
              className="input_field"
              value={birthTime}
              onChange={(e) => setBirthTime(e.target.value)}
            >
              {TIME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 섹션 2: 현재 상황 */}
        <div className="input_section">
          <p className="section_title">
            <span className="section_number">2</span>
            현재 상황
          </p>

          <div className="input_group">
            <label className="input_label">현재 직업 상태</label>
            <div className="option_group">
              {JOB_STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`option_btn ${
                    jobStatus === option.value ? "active" : ""
                  }`}
                  onClick={() => setJobStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="input_group">
            <label className="input_label">현재 연애 상태</label>
            <div className="option_group">
              {RELATIONSHIP_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`option_btn ${
                    relationshipStatus === option.value ? "active" : ""
                  }`}
                  onClick={() => setRelationshipStatus(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 섹션 3: 2026년 소원/고민 */}
        <div className="input_section">
          <p className="section_title">
            <span className="section_number">3</span>
            2026년 소원
          </p>

          <div className="input_group">
            <label className="input_label">
              2026년에 이루고 싶은 것, 고민이 있다면?
            </label>
            <textarea
              className="input_field"
              placeholder="올해 꼭 이루고 싶은 목표나 고민을 자유롭게 적어주세요. (선택)"
              value={wish2026}
              onChange={(e) => setWish2026(e.target.value)}
              maxLength={200}
            />
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          className="submit_btn"
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? "사주 계산 중..." : "2026 신년 운세 보기"}
        </button>
      </div>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="loading_overlay">
          <div className="loading_spinner" />
          <p className="loading_text">사주를 계산하고 있어요</p>
          <p className="loading_subtext">잠시만 기다려주세요...</p>
        </div>
      )}
    </div>
  );
}
