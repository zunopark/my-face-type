"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { extractFaceFeatures, extractPairFeatures } from "../actions/analyze";
import {
  trackPageView,
  trackPhotoUpload,
  trackAnalysisStart,
  trackAnalysisComplete,
  trackButtonClick,
} from "@/lib/mixpanel";
import { upsertFaceAnalysisSupabase } from "@/lib/db/faceSupabaseDB";
import { uploadFaceImage, uploadCoupleImages } from "@/lib/storage/imageStorage";
import { getStoredUtmParams } from "@/components/providers/MixpanelProvider";
import Footer from "@/components/layout/Footer";
import styles from "./face.module.css";

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

function FacePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL 파라미터로 탭 초기화
  const initialTab = searchParams.get("tab") === "match" ? "match" : "face";
  const [activeTab, setActiveTab] = useState<"face" | "match" | "saju">(initialTab);
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

  // 페이지 방문 추적 + URL 파라미터 변경 시 탭 업데이트
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "match") {
      setActiveTab("match");
      trackPageView("face", { tab: "match" });
    } else {
      trackPageView("face", { tab: "face" });
    }
  }, [searchParams]);

  const handleTabClick = (tab: "face" | "match" | "saju") => {
    setActiveTab(tab);
  };

  const handleFaceImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 사진 업로드 추적
      trackPhotoUpload("face", { file_size: file.size });

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setFaceImage(base64);
        setIsAnalyzing(true);

        // 분석 시작 추적
        trackAnalysisStart("face");

        try {
          const result = await extractFaceFeatures(base64.split(",")[1]);

          if (!result.success) throw new Error(result.error);

          if (result.data.features?.trim().toLowerCase() === "again") {
            throw new Error("얼굴을 인식할 수 없습니다. 다른 사진을 올려주세요.");
          }

          const resultId = crypto.randomUUID();

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

          // 이미지 Storage 업로드
          const uploadedImage = await uploadFaceImage(resultId, base64);

          await upsertFaceAnalysisSupabase({
            id: resultId,
            service_type: "face",
            features: result.data.features,
            image_path: uploadedImage?.path,
            analysis_result: {},
            is_paid: false,
            ...(utmSource ? { utm_source: utmSource } : {}),
            ...(influencerId ? { influencer_id: influencerId } : {}),
          });

          // 분석 완료 추적
          trackAnalysisComplete("face", { result_id: resultId });

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

    // 궁합 분석 시작 추적
    trackAnalysisStart("couple", {
      relationship_type: selectedRelation,
      relationship_feeling: selectedFeeling,
    });

    try {
      const result = await extractPairFeatures(
        selfImage.split(",")[1],
        partnerImage.split(",")[1]
      );

      if (!result.success) throw new Error(result.error);
      if (result.data.error) throw new Error(result.data.error);

      const resultId = crypto.randomUUID();

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

      // 이미지 Storage 업로드
      const uploadedImages = await uploadCoupleImages(resultId, {
        image1: selfImage,
        image2: partnerImage,
      });

      await upsertFaceAnalysisSupabase({
        id: resultId,
        service_type: "couple",
        features1: result.data.features1,
        features2: result.data.features2,
        image1_path: uploadedImages.image1Path,
        image2_path: uploadedImages.image2Path,
        relationship_type: selectedRelation,
        relationship_feeling: selectedFeeling,
        is_paid: false,
        ...(utmSource ? { utm_source: utmSource } : {}),
        ...(influencerId ? { influencer_id: influencerId } : {}),
      });

      // 궁합 분석 완료 추적
      trackAnalysisComplete("couple", { result_id: resultId });

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
    <div className={styles.main_body_wrap}>
      {/* 뒤로가기 버튼 - 불투명 유리 스타일 */}
      <Link href="/" className={styles.back_btn_glass}>
        <span className="material-icons">arrow_back</span>
        <span>홈으로</span>
      </Link>

      <div className={styles.main_content_wrap} style={{ minHeight: "100vh" }}>
        {/* Title */}
        <div className={styles.main_title_wrap}>
          <div className={styles.main_title}>{currentTitle.title}</div>
          <div className={styles.main_subtitle}>{currentTitle.subtitle}</div>
        </div>

        {/* Category Buttons */}
        <div className={styles.category_wrap}>
          <button
            className={`${styles.category_btn} ${activeTab === "face" ? styles.active : ""}`}
            onClick={() => handleTabClick("face")}
          >
            정통 관상
          </button>
          <button
            className={`${styles.category_btn} ${activeTab === "match" ? styles.active : ""}`}
            onClick={() => handleTabClick("match")}
          >
            궁합 관상
          </button>
        </div>

        {/* Face Content */}
        <div
          id="content-face"
          className={`${styles.tab_content} ${activeTab === "face" ? styles.active : ""}`}
        >
          <div className={styles.border}>
            <div className={styles.frame}>
              <div className={styles.image}>
                <div className={styles.file_upload}>
                  {!faceImage ? (
                    <div className={styles.image_upload_wrap}>
                      <input
                        className={styles.file_upload_input}
                        type="file"
                        accept="image/*"
                        onChange={handleFaceImageChange}
                      />
                      <div className={styles.drag_text}>
                        <span className="material-icons">add_photo_alternate</span>
                        <h2>(정면 사진 첨부)</h2>
                        <h3>관상? 얼굴 한번 봅시다</h3>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.file_upload_content} style={{ display: "block" }}>
                      <div className={styles.image_square_frame}>
                        <Image
                          className={styles.file_upload_image}
                          src={faceImage}
                          alt="your image"
                          fill
                          style={{ objectFit: "cover" }}
                          unoptimized
                        />
                      </div>
                      <div className={styles.image_title_wrap}>
                        <div className={styles.ai}>
                          {isAnalyzing ? "관상가가 당신의 얼굴을 분석중.." : "분석 완료!"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.nostore}>*걱정마세요! 사진은 본인만 확인 가능합니다.</div>
        </div>

        {/* Match Content */}
        <div
          id="content-match"
          className={`${styles.tab_content} ${activeTab === "match" ? styles.active : ""}`}
        >
          <div className={styles.couple_container}>
            {/* Self Photo */}
            <div className={styles.couple_card}>
              <input
                className={styles.couple_input}
                type="file"
                accept="image/*"
                onChange={(e) => handleCoupleImageChange(e, "self")}
              />
              <div className={styles.couple_preview}>
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
                    <span className={`material-icons ${styles.couple_icon}`}>add_photo_alternate</span>
                    <span>내 사진 선택</span>
                  </>
                )}
              </div>
            </div>

            {/* Partner Photo */}
            <div className={styles.couple_card}>
              <input
                className={styles.couple_input}
                type="file"
                accept="image/*"
                onChange={(e) => handleCoupleImageChange(e, "partner")}
              />
              <div className={styles.couple_preview}>
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
                    <span className={`material-icons ${styles.couple_icon}`}>add_photo_alternate</span>
                    <span>상대 사진 선택</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className={styles.nostore}>*걱정마세요! 사진은 본인만 확인 가능합니다.</div>
          <div className={styles.couple_action}>
            <button
              className={styles.btn_primary}
              disabled={!selfImage || !partnerImage}
              onClick={handleOpenCoupleSheet}
            >
              관상 궁합 보기
            </button>
          </div>
        </div>

      </div>

      {/* 바텀시트 오버레이 */}
      {showBottomSheet && (
        <div className={`${styles.bottom_analyze_overlay} ${styles.active}`} onClick={handleCloseBottomSheet} />
      )}

      {/* 바텀시트 */}
      <div className={`${styles.bottom_sheet} ${showBottomSheet ? styles.active : ""}`}>
        <div className={styles.sheet_inner}>
          <h3>현재 상대방과의 관계는 어떤가요?</h3>
          <div className={styles.relationship_options}>
            {["관심", "짝사랑", "썸", "연애", "결혼"].map((relation) => (
              <div
                key={relation}
                data-type={relation}
                className={selectedRelation === relation ? styles.selected : ""}
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
            <div className={styles.sheet_followup}>
              <h4>당신의 마음은 어떤 상태인가요?</h4>
              <div className={styles.followup_options}>
                {FOLLOWUP_OPTIONS[selectedRelation]?.map((feeling, idx) => (
                  <div
                    key={idx}
                    className={selectedFeeling === feeling ? styles.selected : ""}
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
            <button className={styles.sheet_btn} onClick={handleStartCoupleAnalysis}>
              분석 시작하기
            </button>
          )}
        </div>
      </div>

      {/* Face Analyze Overlay */}
      {isAnalyzing && (
        <div className={styles.analyze_overlay} style={{ display: "flex" }}>
          <div className={styles.analyze_text}>얼굴 특징을 분석 중입니다</div>
        </div>
      )}

      {/* Couple Analyze Overlay */}
      {showCoupleAnalyzeOverlay && (
        <div className={styles.analyze_overlay} style={{ display: "flex" }}>
          <div className={styles.analyze_text}>두 사람의 얼굴 특징을 분석 중입니다</div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function FacePage() {
  return (
    <Suspense fallback={<div className={styles.main_body_wrap} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>로딩중...</div>}>
      <FacePageContent />
    </Suspense>
  );
}
