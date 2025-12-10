"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { extractFaceFeatures } from "./actions/analyze";
import Footer from "@/components/layout/Footer";

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
          // 1단계: 얼굴 특징만 추출 (기존 플로우)
          const result = await extractFaceFeatures(base64.split(",")[1]);

          if (!result.success) throw new Error(result.error);

          // "again" 응답이면 얼굴 인식 실패
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
            // 보고서 스켈레톤 (기존 구조 유지)
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
            <button className="btn-primary" disabled={!selfImage || !partnerImage}>
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

      {/* Analyze Overlay */}
      {isAnalyzing && (
        <div className="analyze-overlay" style={{ display: "flex" }}>
          <div className="analyze-text">얼굴 특징을 분석 중입니다</div>
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
