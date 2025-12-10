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
