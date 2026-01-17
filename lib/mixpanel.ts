"use client";

import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "d7d8d6afc10a92f911ea59901164605b";

// ============================================
// 이벤트 타입 정의
// ============================================

// 서비스 타입
export type ServiceType = "face" | "couple" | "saju_love" | "new_year" | "animalface";

// 이벤트 이름 (영문, 일관된 네이밍)
export const EVENTS = {
  // 페이지 방문
  PAGE_VIEW: "page_view",

  // 카드/버튼 클릭
  CARD_CLICK: "card_click",
  BUTTON_CLICK: "button_click",

  // 사진 업로드
  PHOTO_UPLOAD: "photo_upload",

  // 분석 관련
  ANALYSIS_START: "analysis_start",
  ANALYSIS_COMPLETE: "analysis_complete",

  // 결제 퍼널
  PAYMENT_MODAL_OPEN: "payment_modal_open",
  PAYMENT_MODAL_CLOSE: "payment_modal_close",
  PAYMENT_ATTEMPT: "payment_attempt",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAIL: "payment_fail",

  // 쿠폰
  COUPON_APPLIED: "coupon_applied",

  // 기타
  FORM_SUBMIT: "form_submit",
  SHARE: "share",
  RETRY: "retry",
} as const;

// ============================================
// 초기화
// ============================================

let initialized = false;

export function initMixpanel() {
  if (initialized || typeof window === "undefined") return;

  let distinctId = localStorage.getItem("mixpanel_distinct_id");
  if (!distinctId) {
    distinctId = crypto.randomUUID();
    localStorage.setItem("mixpanel_distinct_id", distinctId);
  }

  mixpanel.init(MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === "development",
    track_pageview: false, // 수동으로 관리
    persistence: "localStorage",
  });

  mixpanel.identify(distinctId);
  initialized = true;
}

// ============================================
// 기본 트래킹 함수
// ============================================

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (!initialized) {
    initMixpanel();
  }

  mixpanel.track(event, {
    ...properties,
    timestamp: new Date().toISOString(),
    url: window.location.pathname,
  });
}

// ============================================
// 헬퍼 함수들 (타입 안전 + 일관성)
// ============================================

/**
 * 페이지 방문 추적
 * @example trackPageView("face", { referrer: "landing" })
 */
export function trackPageView(
  page: string,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAGE_VIEW, {
    page,
    ...properties,
  });
}

/**
 * 카드 클릭 추적 (랜딩 페이지 등)
 * @example trackCardClick("face", "landing")
 */
export function trackCardClick(
  type: ServiceType | string,
  location: string,
  properties?: Record<string, unknown>
) {
  track(EVENTS.CARD_CLICK, {
    type,
    location,
    ...properties,
  });
}

/**
 * 버튼 클릭 추적
 * @example trackButtonClick("start_analysis", "face", { step: 1 })
 */
export function trackButtonClick(
  button_name: string,
  type: ServiceType | string,
  properties?: Record<string, unknown>
) {
  track(EVENTS.BUTTON_CLICK, {
    button_name,
    type,
    ...properties,
  });
}

/**
 * 사진 업로드 추적
 * @example trackPhotoUpload("face", { file_size: 1024 })
 */
export function trackPhotoUpload(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PHOTO_UPLOAD, {
    type,
    ...properties,
  });
}

/**
 * 분석 시작 추적
 * @example trackAnalysisStart("face", { gender: "male" })
 */
export function trackAnalysisStart(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.ANALYSIS_START, {
    type,
    ...properties,
  });
}

/**
 * 분석 완료 추적
 * @example trackAnalysisComplete("face", { result_id: "abc123" })
 */
export function trackAnalysisComplete(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.ANALYSIS_COMPLETE, {
    type,
    ...properties,
  });
}

/**
 * 결제 모달 열림 추적
 * @example trackPaymentModalOpen("face", { price: 3900, is_discount: true })
 */
export function trackPaymentModalOpen(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAYMENT_MODAL_OPEN, {
    type,
    ...properties,
  });
}

/**
 * 결제 모달 닫힘 추적
 * @example trackPaymentModalClose("face", { reason: "user_cancel" })
 */
export function trackPaymentModalClose(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAYMENT_MODAL_CLOSE, {
    type,
    ...properties,
  });
}

/**
 * 결제 시도 추적
 * @example trackPaymentAttempt("face", { price: 3900, method: "card" })
 */
export function trackPaymentAttempt(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAYMENT_ATTEMPT, {
    type,
    ...properties,
  });
}

/**
 * 결제 성공 추적
 * @example trackPaymentSuccess("face", { price: 3900, order_id: "abc123" })
 */
export function trackPaymentSuccess(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAYMENT_SUCCESS, {
    type,
    ...properties,
  });
}

/**
 * 결제 실패 추적
 * @example trackPaymentFail("face", { error: "card_declined" })
 */
export function trackPaymentFail(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.PAYMENT_FAIL, {
    type,
    ...properties,
  });
}

/**
 * 쿠폰 적용 추적
 * @example trackCouponApplied("face", { coupon_code: "FACE5000", discount: 5000, is_free: false })
 */
export function trackCouponApplied(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.COUPON_APPLIED, {
    type,
    ...properties,
  });
}

/**
 * 폼 제출 추적
 * @example trackFormSubmit("saju_love", { birth_year: 1990 })
 */
export function trackFormSubmit(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.FORM_SUBMIT, {
    type,
    ...properties,
  });
}

/**
 * 공유 추적
 * @example trackShare("face", { method: "kakao" })
 */
export function trackShare(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.SHARE, {
    type,
    ...properties,
  });
}

/**
 * 다시하기 추적
 * @example trackRetry("animalface")
 */
export function trackRetry(
  type: ServiceType,
  properties?: Record<string, unknown>
) {
  track(EVENTS.RETRY, {
    type,
    ...properties,
  });
}

export { mixpanel };
