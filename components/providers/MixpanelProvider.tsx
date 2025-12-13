"use client";

import { useEffect } from "react";
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "d7d8d6afc10a92f911ea59901164605b";

export default function MixpanelProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // distinct_id 관리 (기존 플로우 유지)
    let distinctId = localStorage.getItem("mixpanel_distinct_id");
    if (!distinctId) {
      distinctId = crypto.randomUUID();
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
