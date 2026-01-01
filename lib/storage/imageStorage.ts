import { supabase } from "@/lib/supabase";
import type { SajuServiceType } from "@/lib/db/sajuAnalysisDB";

// 버킷 이름
const BUCKET_NAME = "saju-image";

// 이미지 타입
export type ImageType = "ideal_partner" | "avoid_type" | "chart" | "main" | "custom";

/**
 * Base64 문자열을 Blob으로 변환
 */
function base64ToBlob(base64: string, mimeType = "image/webp"): Blob {
  // data:image/png;base64, 접두사 제거
  const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;

  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Blob을 WebP로 압축 (브라우저 Canvas API 사용)
 */
async function compressToWebP(
  blob: Blob,
  quality = 0.8,
  maxWidth = 1024
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // 비율 유지하며 리사이즈
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob);
          } else {
            reject(new Error("WebP conversion failed"));
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Storage 경로 생성
 */
function getStoragePath(
  serviceType: SajuServiceType,
  shareId: string,
  imageType: ImageType,
  extension = "webp"
): string {
  return `${serviceType}/${shareId}/${imageType}.${extension}`;
}

/**
 * Base64 이미지를 Storage에 업로드
 */
export async function uploadBase64Image(
  serviceType: SajuServiceType,
  shareId: string,
  imageType: ImageType,
  base64Data: string,
  options?: {
    compress?: boolean;
    quality?: number;
    maxWidth?: number;
  }
): Promise<{ path: string; url: string } | null> {
  try {
    // Base64를 Blob으로 변환
    let blob = base64ToBlob(base64Data);

    // 압축 옵션이 있으면 압축
    if (options?.compress !== false && typeof window !== "undefined") {
      try {
        blob = await compressToWebP(
          blob,
          options?.quality ?? 0.8,
          options?.maxWidth ?? 1024
        );
      } catch (err) {
        console.warn("WebP 압축 실패, 원본 사용:", err);
      }
    }

    const path = getStoragePath(serviceType, shareId, imageType);

    // 기존 파일 삭제 (덮어쓰기 위해)
    await supabase.storage.from(BUCKET_NAME).remove([path]);

    // 업로드
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      console.error("이미지 업로드 실패:", error);
      return null;
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      path,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error("이미지 업로드 예외:", err);
    return null;
  }
}

/**
 * File 객체를 Storage에 업로드
 */
export async function uploadFile(
  serviceType: SajuServiceType,
  shareId: string,
  imageType: ImageType,
  file: File,
  options?: {
    compress?: boolean;
    quality?: number;
    maxWidth?: number;
  }
): Promise<{ path: string; url: string } | null> {
  try {
    let blob: Blob = file;

    // 압축 옵션이 있으면 압축
    if (options?.compress !== false && typeof window !== "undefined") {
      try {
        blob = await compressToWebP(
          file,
          options?.quality ?? 0.8,
          options?.maxWidth ?? 1024
        );
      } catch (err) {
        console.warn("WebP 압축 실패, 원본 사용:", err);
      }
    }

    const path = getStoragePath(serviceType, shareId, imageType);

    // 기존 파일 삭제
    await supabase.storage.from(BUCKET_NAME).remove([path]);

    // 업로드
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });

    if (error) {
      console.error("파일 업로드 실패:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return {
      path,
      url: urlData.publicUrl,
    };
  } catch (err) {
    console.error("파일 업로드 예외:", err);
    return null;
  }
}

/**
 * Storage에서 이미지 URL 가져오기
 */
export function getImageUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Storage 경로로 이미지 삭제
 */
export async function deleteImage(path: string): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("이미지 삭제 실패:", error);
    return false;
  }
  return true;
}

/**
 * 특정 분석의 모든 이미지 삭제
 */
export async function deleteAllImages(
  serviceType: SajuServiceType,
  shareId: string
): Promise<boolean> {
  const folder = `${serviceType}/${shareId}`;

  // 폴더 내 파일 목록 가져오기
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(folder);

  if (listError) {
    console.error("파일 목록 조회 실패:", listError);
    return false;
  }

  if (!files || files.length === 0) {
    return true; // 삭제할 파일 없음
  }

  // 파일 삭제
  const paths = files.map((f) => `${folder}/${f.name}`);
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths);

  if (deleteError) {
    console.error("파일 삭제 실패:", deleteError);
    return false;
  }

  return true;
}

/**
 * 연애 사주 이미지 일괄 업로드 (편의 함수)
 */
export async function uploadSajuLoveImages(
  shareId: string,
  images: {
    idealPartner?: string;  // base64
    avoidType?: string;     // base64
  }
): Promise<{
  idealPartner?: { path: string; url: string };
  avoidType?: { path: string; url: string };
}> {
  const results: {
    idealPartner?: { path: string; url: string };
    avoidType?: { path: string; url: string };
  } = {};

  if (images.idealPartner) {
    const result = await uploadBase64Image(
      "saju_love",
      shareId,
      "ideal_partner",
      images.idealPartner
    );
    if (result) {
      results.idealPartner = result;
    }
  }

  if (images.avoidType) {
    const result = await uploadBase64Image(
      "saju_love",
      shareId,
      "avoid_type",
      images.avoidType
    );
    if (result) {
      results.avoidType = result;
    }
  }

  return results;
}
