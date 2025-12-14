"use client";

import { useEffect } from "react";
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "d7d8d6afc10a92f911ea59901164605b";

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

    // 전역에서 사용할 수 있도록 window에 할당
    (window as unknown as { mixpanel: typeof mixpanel }).mixpanel = mixpanel;
  }, []);

  return <>{children}</>;
}
