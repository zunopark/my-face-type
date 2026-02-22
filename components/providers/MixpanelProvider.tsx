"use client";

import { useEffect } from "react";
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "d7d8d6afc10a92f911ea59901164605b";

// UTM 파라미터 키 목록
const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

// crypto.randomUUID() 폴백 (구형 브라우저 지원)
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 폴백: 간단한 UUID v4 생성
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// URL에서 UTM 파라미터 추출 및 저장
function captureUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utmData: Record<string, string> = {};

  UTM_PARAMS.forEach((key) => {
    const value = params.get(key);
    if (value) {
      utmData[key] = value;
      localStorage.setItem(key, value);
    }
  });

  // UTM이 있으면 처음 방문 시간도 저장
  if (Object.keys(utmData).length > 0) {
    localStorage.setItem("utm_captured_at", new Date().toISOString());
  }

  return utmData;
}

// 저장된 UTM 파라미터 가져오기
function getStoredUtmParams(): Record<string, string> {
  const utmData: Record<string, string> = {};
  UTM_PARAMS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value) {
      utmData[key] = value;
    }
  });
  return utmData;
}

export default function MixpanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // distinct_id 관리 (기존 플로우 유지)
    let distinctId = localStorage.getItem("mixpanel_distinct_id");
    if (!distinctId) {
      distinctId = generateUUID();
      localStorage.setItem("mixpanel_distinct_id", distinctId);
    }

    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === "development",
      track_pageview: true,
      persistence: "localStorage",
    });

    mixpanel.identify(distinctId);

    // UTM 파라미터 캡처 (URL에 있으면 저장)
    const newUtm = captureUtmParams();

    // 저장된 UTM 또는 새 UTM을 슈퍼 프로퍼티로 등록
    // → 모든 이벤트에 자동으로 UTM 값이 포함됨
    const storedUtm = { ...getStoredUtmParams(), ...newUtm };
    if (Object.keys(storedUtm).length > 0) {
      mixpanel.register(storedUtm);
    }

    // UTM 방문 기록을 자체 DB에 저장 (fire-and-forget)
    if (newUtm.utm_source) {
      fetch("/api/utm/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newUtm,
          landing_page: window.location.pathname,
        }),
      }).catch(() => {});
    }

    // 전역에서 사용할 수 있도록 window에 할당
    (window as unknown as { mixpanel: typeof mixpanel }).mixpanel = mixpanel;
  }, []);

  return <>{children}</>;
}

// UTM 파라미터 가져오기 (외부에서 사용 가능)
export { getStoredUtmParams };
