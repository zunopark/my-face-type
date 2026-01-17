import { supabase } from "@/lib/supabase";
import type { PaymentInfo } from "@/lib/db/sajuAnalysisDB";

// Face 서비스 타입
export type FaceServiceType = "face" | "couple";

// Supabase 저장용 Face 분석 레코드 타입
export interface FaceAnalysisSupabase {
  id: string;
  service_type: FaceServiceType;

  // Face 전용 필드
  features?: string;
  image_path?: string;
  analysis_result?: Record<string, unknown>;

  // Couple 전용 필드
  features1?: string;
  features2?: string;
  image1_path?: string;
  image2_path?: string;
  relationship_type?: string;
  relationship_feeling?: string;
  couple_report?: Record<string, unknown>;

  // 공통 필드
  is_paid: boolean;
  paid_at?: string | null;
  payment_info?: PaymentInfo | null;
  created_at?: string;
}

/**
 * Face 분석 결과 저장 (새로 생성)
 */
export async function createFaceAnalysisSupabase(
  analysis: Omit<FaceAnalysisSupabase, "created_at">
): Promise<FaceAnalysisSupabase | null> {
  const { data, error } = await supabase
    .from("face_analyses")
    .insert([analysis])
    .select()
    .single();

  if (error) {
    console.error("Face 분석 저장 실패:", error);
    return null;
  }
  return data;
}

/**
 * id로 Face 분석 결과 조회
 */
export async function getFaceAnalysisSupabase(
  id: string
): Promise<FaceAnalysisSupabase | null> {
  const { data, error } = await supabase
    .from("face_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // 결과 없음
    console.error("Face 분석 조회 실패:", error);
    return null;
  }
  return data;
}

/**
 * Face 분석 결과 업데이트
 */
export async function updateFaceAnalysisSupabase(
  id: string,
  updates: Partial<Omit<FaceAnalysisSupabase, "id" | "created_at">>
): Promise<FaceAnalysisSupabase | null> {
  const { data, error } = await supabase
    .from("face_analyses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Face 분석 업데이트 실패:", error);
    return null;
  }
  return data;
}

/**
 * Face 분석 결과 upsert (있으면 업데이트, 없으면 생성)
 */
export async function upsertFaceAnalysisSupabase(
  analysis: Omit<FaceAnalysisSupabase, "created_at">
): Promise<FaceAnalysisSupabase | null> {
  const { data, error } = await supabase
    .from("face_analyses")
    .upsert([analysis], { onConflict: "id" })
    .select()
    .single();

  if (error) {
    console.error("Face 분석 upsert 실패:", error);
    return null;
  }
  return data;
}

/**
 * Face 결제 완료 처리
 */
export async function markFaceAnalysisPaidSupabase(
  id: string,
  paymentInfo?: PaymentInfo
): Promise<FaceAnalysisSupabase | null> {
  return updateFaceAnalysisSupabase(id, {
    is_paid: true,
    paid_at: new Date().toISOString(),
    payment_info: paymentInfo || null,
  });
}

/**
 * 서비스별 Face 분석 결과 목록 조회
 */
export async function getFaceAnalysesByService(
  serviceType: FaceServiceType,
  limit = 20
): Promise<FaceAnalysisSupabase[]> {
  const { data, error } = await supabase
    .from("face_analyses")
    .select("*")
    .eq("service_type", serviceType)
    .eq("is_paid", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Face 분석 목록 조회 실패:", error);
    return [];
  }
  return data || [];
}

/**
 * Face 분석 결과 존재 여부 확인
 */
export async function checkFaceAnalysisExists(id: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("face_analyses")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  if (error) {
    console.error("Face 분석 존재 확인 실패:", error);
    return false;
  }
  return (count || 0) > 0;
}
