import { supabase } from "@/lib/supabase";

// 서비스 타입
export type SajuServiceType =
  | "saju_love"      // 연애 사주
  | "saju_career"    // 직업/적성
  | "saju_wealth"    // 재물운
  | "saju_health"    // 건강운
  | "saju_year"      // 신년운세 (legacy)
  | "new_year"       // 2026 신년운세
  | "saju_couple";   // 궁합

// 사용자 정보 타입
export interface UserInfo {
  userName: string;
  gender: string;
  date: string;
  calendar: "solar" | "lunar";
  time: string | null;
  userConcern?: string;
  status?: string;
  // 신년사주 전용 필드
  jobStatus?: string;
  relationshipStatus?: string;
  wish2026?: string;
}

// 결제 정보 타입
export interface PaymentInfo {
  method: "toss" | "coupon";
  price: number;
  couponCode?: string;
  isDiscount?: boolean;
}

// 분석 결과 타입 (서비스별로 다를 수 있음)
export interface AnalysisResult {
  user_name?: string;
  chapters?: Array<{
    number: number;
    title: string;
    content: string;
  }>;
  ideal_partner_image?: {
    image_base64?: string;
    prompt?: string;
    storage_path?: string;  // Storage에 저장된 경우
  };
  avoid_type_image?: {
    image_base64?: string;
    prompt?: string;
    storage_path?: string;
  };
  summary?: string;
  [key: string]: unknown;
}

// Supabase 저장용 분석 레코드 타입
// id = IndexedDB의 id와 동일 (TEXT PRIMARY KEY)
export interface SajuAnalysis {
  id: string;  // IndexedDB id와 동일!
  service_type: SajuServiceType;
  user_info: UserInfo;
  partner_info?: UserInfo | null;
  raw_saju_data?: unknown | null;
  analysis_result?: AnalysisResult | null;
  image_paths?: string[];
  is_paid?: boolean;
  paid_at?: string | null;
  payment_info?: PaymentInfo | null;
  created_at?: string;
  expires_at?: string;
  user_name?: string;  // generated column
}

/**
 * 분석 결과 저장 (새로 생성)
 */
export async function createSajuAnalysis(
  analysis: Omit<SajuAnalysis, "created_at" | "expires_at" | "user_name">
): Promise<SajuAnalysis | null> {
  const { data, error } = await supabase
    .from("saju_analyses")
    .insert([analysis])
    .select()
    .single();

  if (error) {
    console.error("분석 저장 실패:", error);
    return null;
  }
  return data;
}

/**
 * id로 분석 결과 조회
 * (기존 getSajuAnalysisByShareId와 동일 - 호환성 유지)
 */
export async function getSajuAnalysisById(
  id: string
): Promise<SajuAnalysis | null> {
  const { data, error } = await supabase
    .from("saju_analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // 결과 없음
    console.error("분석 조회 실패:", error);
    return null;
  }
  return data;
}

// 호환성을 위한 별칭
export const getSajuAnalysisByShareId = getSajuAnalysisById;

/**
 * 분석 결과 업데이트
 */
export async function updateSajuAnalysis(
  id: string,
  updates: Partial<Omit<SajuAnalysis, "id" | "created_at">>
): Promise<SajuAnalysis | null> {
  const { data, error } = await supabase
    .from("saju_analyses")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("분석 업데이트 실패:", error);
    return null;
  }
  return data;
}

/**
 * 결제 완료 처리
 */
export async function markSajuAnalysisPaid(
  id: string,
  paymentInfo?: PaymentInfo
): Promise<SajuAnalysis | null> {
  return updateSajuAnalysis(id, {
    is_paid: true,
    paid_at: new Date().toISOString(),
    payment_info: paymentInfo || null,
  });
}

/**
 * 이미지 경로 추가
 */
export async function addImagePath(
  id: string,
  imagePath: string
): Promise<boolean> {
  const analysis = await getSajuAnalysisById(id);
  if (!analysis) return false;

  const currentPaths = analysis.image_paths || [];
  if (currentPaths.includes(imagePath)) return true;

  const { error } = await supabase
    .from("saju_analyses")
    .update({ image_paths: [...currentPaths, imagePath] })
    .eq("id", id);

  if (error) {
    console.error("이미지 경로 추가 실패:", error);
    return false;
  }
  return true;
}

/**
 * 서비스별 분석 결과 목록 조회
 */
export async function getSajuAnalysesByService(
  serviceType: SajuServiceType,
  limit = 20
): Promise<SajuAnalysis[]> {
  const { data, error } = await supabase
    .from("saju_analyses")
    .select("*")
    .eq("service_type", serviceType)
    .eq("is_paid", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("분석 목록 조회 실패:", error);
    return [];
  }
  return data || [];
}

/**
 * 사용자 이름으로 분석 결과 검색
 */
export async function searchSajuAnalysesByUserName(
  userName: string,
  serviceType?: SajuServiceType,
  limit = 10
): Promise<SajuAnalysis[]> {
  let query = supabase
    .from("saju_analyses")
    .select("*")
    .ilike("user_name", `%${userName}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("분석 검색 실패:", error);
    return [];
  }
  return data || [];
}

/**
 * 분석 결과 존재 여부 확인
 */
export async function checkSajuAnalysisExists(id: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("saju_analyses")
    .select("id", { count: "exact", head: true })
    .eq("id", id);

  if (error) {
    console.error("분석 존재 확인 실패:", error);
    return false;
  }
  return (count || 0) > 0;
}

/**
 * 만료된 분석 결과 개수 (관리용)
 */
export async function getExpiredAnalysesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("saju_analyses")
    .select("id", { count: "exact", head: true })
    .lt("expires_at", new Date().toISOString());

  if (error) {
    console.error("만료 분석 개수 조회 실패:", error);
    return 0;
  }
  return count || 0;
}
