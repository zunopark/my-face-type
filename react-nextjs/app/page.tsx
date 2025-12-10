"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { extractFaceFeatures, extractPairFeatures } from "./actions/analyze";
import Footer from "@/components/layout/Footer";
import { track } from "@/lib/mixpanel";

const TITLE_MAP = {
  face: {
    title: "인공지능이 알려주는 관상 테스트",
    subtitle: "AI 관상 | 관상가 양반",
  },
  match: {
    title: "우리 관상 궁합은 몇 점일까?",
    subtitle: "#궁합 점수 #바람기 #애정운 #속궁합",
  },
  saju: {
    title: "2025 연애 사주",
    subtitle: "#운명의 상대 #연애 시기 #이상형 이미지",
  },
};

// 관계 선택 후속 감정 목록
const FOLLOWUP_OPTIONS: Record<string, string[]> = {
  연애: [
    "💓 손만 잡아도 세상이 환해져요",
    "💎 더 깊은 관계로 나아가고 싶어요",
    "😮‍💨 지쳐요... 이별을 고민 중이에요",
  ],
  짝사랑: [
    "👻 상대는 내 존재를 알까요...? (투명인간 탈출 희망!)",
    "⏳ 고백 타이밍을 조심스레 살피고 있어요",
    "💔 포기해야 할까요... 너무 힘들어요",
  ],
  썸: [
    "🧠 상대의 속마음이 너무 궁금해요!",
    "🔥 썸이 너무 느려요... 이젠 확신이 필요해요!",
    "🎯 언제 고백하면 좋을까요? 타이밍을 잡고 있어요",
  ],
  결혼: [
    "💍 꿀 떨어지는 결혼 생활 중이에요!",
    "💬 변화가 필요한 시점인 것 같아요",
    "😔 이혼까지 고민할 정도로 마음이 무거워요...",
  ],
  관심: [
    "🤔 상대도 날 생각하고 있을까요?",
    "🤗 살짝 더 다가가 보고 싶어요",
    "💘 눈만 마주쳐도 심장이 두근두근해요!",
  ],
};

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"face" | "match" | "saju">("face");
  const currentTitle = TITLE_MAP[activeTab];

  // Face upload state
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Couple upload state
  const [selfImage, setSelfImage] = useState<string | null>(null);
  const [partnerImage, setPartnerImage] = useState<string | null>(null);

  // 바텀시트 상태
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState<string | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);

  // 분석 오버레이 상태
  const [showCoupleAnalyzeOverlay, setShowCoupleAnalyzeOverlay] = useState(false);

  const handleTabClick = (tab: "face" | "match" | "saju") => {
    setActiveTab(tab);
  };

  const handleFaceImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setFaceImage(base64);
        setIsAnalyzing(true);

        try {
          const result = await extractFaceFeatures(base64.split(",")[1]);

          if (!result.success) throw new Error(result.error);

          if (result.data.features?.trim().toLowerCase() === "again") {
            throw new Error("얼굴을 인식할 수 없습니다. 다른 사진을 올려주세요.");
          }

          const resultId = crypto.randomUUID();
          const resultData = {
            id: resultId,
            imageBase64: base64,
            features: result.data.features,
            paid: false,
            timestamp: new Date().toISOString(),
            reports: {
              base: { paid: false, data: null },
              wealth: { paid: false, data: null },
              love: { paid: false, data: null },
              marriage: { paid: false, data: null },
              career: { paid: false, data: null },
            },
          };

          localStorage.setItem(`face_result_${resultId}`, JSON.stringify(resultData));
          router.push(`/face/result?id=${resultId}`);
        } catch (error) {
          console.error("분석 오류:", error);
          alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
          setIsAnalyzing(false);
          setFaceImage(null);
        }
      };
      reader.readAsDataURL(file);
    },
    [router]
  );

  const handleCoupleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "self" | "partner"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (type === "self") setSelfImage(base64);
      else setPartnerImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // 궁합 보기 버튼 클릭 → 바텀시트 열기
  const handleOpenCoupleSheet = () => {
    setShowBottomSheet(true);
  };

  // 관계 선택
  const handleRelationSelect = (relation: string) => {
    setSelectedRelation(relation);
    setSelectedFeeling(null);
  };

  // 감정 선택
  const handleFeelingSelect = (feeling: string) => {
    setSelectedFeeling(feeling);
  };

  // 분석 시작
  const handleStartCoupleAnalysis = async () => {
    if (!selfImage || !partnerImage || !selectedRelation || !selectedFeeling) return;

    setShowBottomSheet(false);
    setShowCoupleAnalyzeOverlay(true);

    track("궁합 분석 시작", {
      type: "couple",
      relationshipType: selectedRelation,
      relationshipFeeling: selectedFeeling,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await extractPairFeatures(
        selfImage.split(",")[1],
        partnerImage.split(",")[1]
      );

      if (!result.success) throw new Error(result.error);
      if (result.data.error) throw new Error(result.data.error);

      const resultId = crypto.randomUUID();
      const resultData = {
        id: resultId,
        features1: result.data.features1,
        features2: result.data.features2,
        image1Base64: selfImage,
        image2Base64: partnerImage,
        relationshipType: selectedRelation,
        relationshipFeeling: selectedFeeling,
        createdAt: new Date().toISOString(),
        reports: {
          couple: { paid: false, data: null },
        },
      };

      localStorage.setItem(`couple_result_${resultId}`, JSON.stringify(resultData));
      router.push(`/couple/result?id=${resultId}`);
    } catch (error) {
      console.error("궁합 분석 오류:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
      setShowCoupleAnalyzeOverlay(false);
    }
  };

  // 바텀시트 닫기
  const handleCloseBottomSheet = () => {
    setShowBottomSheet(false);
    setSelectedRelation(null);
    setSelectedFeeling(null);
  };

  return (
    <div className="main_body_wrap">
      {/* Header */}
      <header id="main" className="header_chat_wrap">
        <div className="header_chat header_fixed">
          <Link href="/" style={{ marginRight: "12px", textDecoration: "none" }}>
            <div className="header_chat_title">관상</div>
          </Link>
          <Link href="/saju-love/" style={{ marginRight: "12px", textDecoration: "none", position: "relative" }}>
            <div className="header_chat_title" style={{ color: "rgb(130, 130, 130)" }}>
              연애 사주
              <span className="new_badge">NEW</span>
            </div>
          </Link>
          <Link href="/animalface/" style={{ marginRight: "12px", textDecoration: "none" }}>
            <div className="header_chat_title" style={{ color: "rgb(130, 130, 130)" }}>
              동물상
            </div>
          </Link>
        </div>
      </header>

      <div className="main_content_wrap">
        {/* Title */}
        <div className="main_title_wrap">
          <div className="main_title">{currentTitle.title}</div>
          <div className="main_subtitle">{currentTitle.subtitle}</div>
        </div>

        {/* Category Buttons */}
        <div className="category_wrap">
          <button
            className={`category_btn ${activeTab === "face" ? "active" : ""}`}
            onClick={() => handleTabClick("face")}
          >
            정통 관상
          </button>
          <button
            className={`category_btn ${activeTab === "match" ? "active" : ""}`}
            onClick={() => handleTabClick("match")}
          >
            궁합 관상
          </button>
          <button
            className={`category_btn category_btn_new ${activeTab === "saju" ? "active" : ""}`}
            onClick={() => handleTabClick("saju")}
          >
            연애 사주
            <span className="free_badge">오늘만 100원</span>
          </button>
        </div>

        {/* Face Content */}
        <div
          id="content-face"
          className={`tab_content ${activeTab === "face" ? "active" : ""}`}
        >
          <div className="border">
            <div className="frame">
              <div className="image">
                <div className="file-upload">
                  {!faceImage ? (
                    <div className="image-upload-wrap">
                      <input
                        className="file-upload-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFaceImageChange}
                      />
                      <div className="drag-text">
                        <span className="material-icons">add_photo_alternate</span>
                        <h2>(정면 사진 첨부)</h2>
                        <h3>관상? 얼굴 한번 봅시다</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="file-upload-content" style={{ display: "block" }}>
                      <div className="image-square-frame">
                        <Image
                          className="file-upload-image"
                          src={faceImage}
                          alt="your image"
                          fill
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                      <div className="image-title-wrap">
                        <div className="ai">
                          {isAnalyzing ? "관상가가 당신의 얼굴을 분석중.." : "분석 완료!"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="nostore">*걱정마세요! 사진은 절대로 저장되지 않습니다.</div>
        </div>

        {/* Match Content */}
        <div
          id="content-match"
          className={`tab_content ${activeTab === "match" ? "active" : ""}`}
        >
          <div className="couple-container">
            {/* Self Photo */}
            <div className="couple-card">
              <input
                className="couple-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleCoupleImageChange(e, "self")}
              />
              <div className="couple-preview">
                {selfImage ? (
                  <Image
                    src={selfImage}
                    alt="내 사진"
                    width={152}
                    height={152}
                    style={{ objectFit: "cover", borderRadius: "12px" }}
                    unoptimized
                  />
                ) : (
                  <>
                    <span className="material-icons couple-icon">add_photo_alternate</span>
                    <span>내 사진 선택</span>
                  </>
                )}
              </div>
            </div>

            {/* Partner Photo */}
            <div className="couple-card">
              <input
                className="couple-input"
                type="file"
                accept="image/*"
                onChange={(e) => handleCoupleImageChange(e, "partner")}
              />
              <div className="couple-preview">
                {partnerImage ? (
                  <Image
                    src={partnerImage}
                    alt="상대 사진"
                    width={152}
                    height={152}
                    style={{ objectFit: "cover", borderRadius: "12px" }}
                    unoptimized
                  />
                ) : (
                  <>
                    <span className="material-icons couple-icon">add_photo_alternate</span>
                    <span>상대 사진 선택</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="nostore">*걱정마세요! 사진은 절대로 저장되지 않습니다.</div>
          <div className="couple-action">
            <button
              className="btn-primary"
              disabled={!selfImage || !partnerImage}
              onClick={handleOpenCoupleSheet}
            >
              관상 궁합 보기
            </button>
          </div>
        </div>

        {/* Saju Content */}
        <div
          id="content-saju"
          className={`tab_content ${activeTab === "saju" ? "active" : ""}`}
        >
          <div className="reunion-sheet-inner">
            <div className="reunion-relationship-options">
              <div data-type="interest">썸이 깨졌어요</div>
              <div data-type="crush">고백에 실패했어요</div>
              <div data-type="fling">성격 차이/잦은 다툼</div>
              <div data-type="dating">집착 및 이성 문제</div>
              <div data-type="ghosting">잠수이별 및 통보</div>
              <div data-type="affair">바람 및 외도</div>
            </div>
          </div>
        </div>
      </div>

      {/* 바텀시트 오버레이 */}
      {showBottomSheet && (
        <div className="bottom-analyze-overlay active" onClick={handleCloseBottomSheet} />
      )}

      {/* 바텀시트 */}
      <div className={`bottom-sheet ${showBottomSheet ? "active" : ""}`}>
        <div className="sheet-inner">
          <h3>현재 상대방과의 관계는 어떤가요?</h3>
          <div className="relationship-options">
            {["관심", "짝사랑", "썸", "연애", "결혼"].map((relation) => (
              <div
                key={relation}
                data-type={relation}
                className={selectedRelation === relation ? "selected" : ""}
                onClick={() => handleRelationSelect(relation)}
              >
                {relation === "관심" && "👀 관심이 있어요"}
                {relation === "짝사랑" && "🥺 짝사랑하고 있어요"}
                {relation === "썸" && "💋 썸타는 중이에요"}
                {relation === "연애" && "💌 연애중이에요"}
                {relation === "결혼" && "💍 결혼생활 중이에요"}
              </div>
            ))}
          </div>

          {/* 후속 감정 선택 */}
          {selectedRelation && (
            <div className="sheet-followup">
              <h4>당신의 마음은 어떤 상태인가요?</h4>
              <div className="followup-options">
                {FOLLOWUP_OPTIONS[selectedRelation]?.map((feeling, idx) => (
                  <div
                    key={idx}
                    className={selectedFeeling === feeling ? "selected" : ""}
                    onClick={() => handleFeelingSelect(feeling)}
                  >
                    {feeling}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 분석 시작 버튼 */}
          {selectedFeeling && (
            <button className="sheet-btn" onClick={handleStartCoupleAnalysis}>
              분석 시작하기
            </button>
          )}
        </div>
      </div>

      {/* Face Analyze Overlay */}
      {isAnalyzing && (
        <div className="analyze-overlay" style={{ display: "flex" }}>
          <div className="analyze-text">얼굴 특징을 분석 중입니다</div>
        </div>
      )}

      {/* Couple Analyze Overlay */}
      {showCoupleAnalyzeOverlay && (
        <div className="analyze-overlay" style={{ display: "flex" }}>
          <div className="analyze-text">두 사람의 얼굴 특징을 분석 중입니다</div>
        </div>
      )}

      {/* Navigation */}
      <div className="nav_wrap">
        <Link href="/" className="nav_content nav_seleted">
          <span className="material-icons nav_icon">home</span>
          <div className="nav_title">전체 보기</div>
        </Link>
        <Link href="/history/" className="nav_content">
          <span className="material-icons nav_icon">person</span>
          <div className="nav_title">지난 보고서</div>
        </Link>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
