import { supabase } from "@/lib/supabase";

// 서비스 타입
export type ServiceType = "saju_love" | "couple" | "face";

// 리뷰 타입
export interface Review {
  id?: string;
  service_type: ServiceType;
  record_id: string;
  user_name: string;
  rating: number; // 1-5
  content: string;
  metadata?: Record<string, unknown>;
  is_public?: boolean;
  is_approved?: boolean; // 관리자 승인 여부 (true인 것만 표시)
  created_at?: string;
}

// 리뷰 저장
export async function createReview(
  review: Omit<Review, "id" | "created_at">
): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .insert([{ ...review, is_public: review.is_public ?? true }])
    .select()
    .single();

  if (error) {
    console.error("리뷰 저장 실패:", error);
    return null;
  }
  return data;
}

// 서비스별 리뷰 조회 (공개만)
export async function getReviewsByService(
  serviceType: ServiceType,
  limit = 20
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("service_type", serviceType)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("리뷰 조회 실패:", error);
    return [];
  }
  return data || [];
}

// 승인된 리뷰만 조회 (외부 표시용)
export async function getApprovedReviews(
  serviceType?: ServiceType,
  limit = 20
): Promise<Review[]> {
  let query = supabase
    .from("reviews")
    .select("*")
    .eq("is_public", true)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { data, error } = await query;

  if (error) {
    console.error("승인된 리뷰 조회 실패:", error);
    return [];
  }
  return data || [];
}

// 전체 리뷰 조회 (공개만)
export async function getAllReviews(limit = 50): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("리뷰 조회 실패:", error);
    return [];
  }
  return data || [];
}

// 특정 분석 결과의 리뷰 조회
export async function getReviewByRecordId(
  serviceType: ServiceType,
  recordId: string
): Promise<Review | null> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("service_type", serviceType)
    .eq("record_id", recordId)
    .maybeSingle();

  if (error) {
    console.error("리뷰 조회 실패:", error);
    return null;
  }
  return data;
}

// 서비스별 평균 별점
export async function getAverageRating(
  serviceType?: ServiceType
): Promise<{ average: number; count: number }> {
  let query = supabase.from("reviews").select("rating").eq("is_public", true);

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = data.reduce((acc, r) => acc + r.rating, 0);
  return {
    average: Math.round((sum / data.length) * 10) / 10,
    count: data.length,
  };
}

// 서비스별 리뷰 개수
export async function getReviewCount(serviceType?: ServiceType): Promise<number> {
  let query = supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("is_public", true);

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { count, error } = await query;

  if (error) {
    console.error("리뷰 개수 조회 실패:", error);
    return 0;
  }
  return count || 0;
}
