"use server";

// 서버 전용 환경변수 (클라이언트에 노출되지 않음)
const API_URL = process.env.API_URL;

// Base64를 Blob으로 변환하는 유틸 함수
function base64ToBlob(base64: string, mimeType: string = "image/jpeg"): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * 1단계: 얼굴 특징만 추출 (메인 페이지에서 사용)
 * - /analyze/features/ 엔드포인트 호출
 * - features 문자열만 반환
 */
export async function extractFaceFeatures(imageBase64: string) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const blob = base64ToBlob(imageBase64);
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const response = await fetch(`${API_URL}/analyze/features/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Feature extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 2단계: 전체 관상 분석 (결제 후 결과 페이지에서 사용)
 * - /face-teller2/ 엔드포인트 호출
 * - summary, detail, sections, features 반환
 */
export async function analyzeFaceFeatures(imageBase64: string) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const blob = base64ToBlob(imageBase64);
    const formData = new FormData();
    formData.append("file", blob, "image.jpg");

    const response = await fetch(`${API_URL}/face-teller2/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Face analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 결제 확인 (TossPayments)
 */
export async function confirmPayment(paymentKey: string, orderId: string, amount: number) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const response = await fetch(`${API_URL}/payment/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "결제 확인에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "결제 확인 중 오류가 발생했습니다.",
    };
  }
}

export async function analyzeBase(features: string) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const response = await fetch(`${API_URL}/analyze/base`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ feature: features }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Base analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 궁합 분석: 두 사람의 얼굴 특징 추출
 * - /analyze/pair/features/ 엔드포인트 호출
 */
export async function extractPairFeatures(image1Base64: string, image2Base64: string) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const blob1 = base64ToBlob(image1Base64);
    const blob2 = base64ToBlob(image2Base64);
    const formData = new FormData();
    formData.append("file1", blob1, "self.jpg");
    formData.append("file2", blob2, "partner.jpg");

    const response = await fetch(`${API_URL}/analyze/pair/features/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Pair feature extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 궁합 리포트 생성
 * - /analyze/couple/report 엔드포인트 호출
 */
export async function analyzeCoupleReport(
  features1: string,
  features2: string,
  relationshipType: string,
  relationshipFeeling: string
) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const response = await fetch(`${API_URL}/analyze/couple/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        features1,
        features2,
        relationshipType,
        relationshipFeeling,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Couple report error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

/**
 * 궁합 점수 계산
 * - /analyze/couple/score 엔드포인트 호출
 */
export async function analyzeCoupleScore(detail1: string) {
  try {
    if (!API_URL) {
      throw new Error("API_URL 환경변수가 설정되지 않았습니다.");
    }

    const response = await fetch(`${API_URL}/analyze/couple/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ detail1 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "점수 계산에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Couple score error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

// ==========================================
// 연애 사주 관련 Server Actions
// ==========================================

// 사주 API 엔드포인트
const SAJU_API_URL = "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app";

// 사주 입력 데이터 타입
interface SajuInput {
  gender: string;
  date: string;
  time: string | null;
  timezone?: string;
  calendar: string;
}

// 사주 계산 결과 타입
export interface SajuData {
  dayMaster: {
    char: string;
    title: string;
    element: string;
    yinYang: string;
  };
  pillars: {
    year: PillarData;
    month: PillarData;
    day: PillarData;
    hour: PillarData;
  };
  fiveElements: {
    strength: string;
    percent: Record<string, number>;
  };
  loveFacts: {
    dayMasterStrength: string;
    peachBlossom: {
      hasPeach: boolean;
      targetBranch: string[];
      positions: string[];
    };
    spouseStars: {
      hitCount: number;
      positions: string[];
    };
    spouseTargetType: string;
  };
}

interface PillarData {
  stem: {
    char: string;
    korean: string;
    element: string;
  };
  branch: {
    char: string;
    korean: string;
    element: string;
  };
  tenGodStem: string;
  tenGodBranchMain: string;
}

/**
 * 사주 계산 (기본 정보로 사주팔자 계산)
 * - /saju/compute 엔드포인트 호출
 */
export async function computeSaju(input: SajuInput) {
  try {
    const payload = {
      gender: input.gender,
      date: input.date,
      time: input.time,
      timezone: input.timezone || "Asia/Seoul",
      calendar: input.calendar,
    };

    const response = await fetch(`${SAJU_API_URL}/saju/compute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "사주 계산에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Saju compute error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}

// 연애 사주 분석 입력 타입
interface SajuLoveAnalyzeInput {
  sajuData: SajuData;
  userName: string;
  userConcern: string;
  year: number;
}

/**
 * 연애 사주 분석 (결제 후 상세 분석)
 * - /saju_love/analyze 엔드포인트 호출
 */
export async function analyzeSajuLove(input: SajuLoveAnalyzeInput) {
  try {
    const payload = {
      saju_data: input.sajuData,
      user_name: input.userName,
      user_concern: input.userConcern,
      year: input.year,
    };

    const response = await fetch(`${SAJU_API_URL}/saju_love/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "연애 사주 분석에 실패했습니다.");
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Saju love analysis error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "서버 오류가 발생했습니다.",
    };
  }
}
