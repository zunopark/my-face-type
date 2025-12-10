"use client";

import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = "d7d8d6afc10a92f911ea59901164605b";

let initialized = false;

export function initMixpanel() {
  if (initialized || typeof window === "undefined") return;

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
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  if (!initialized) {
    initMixpanel();
  }

  mixpanel.track(event, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
}

export { mixpanel };
