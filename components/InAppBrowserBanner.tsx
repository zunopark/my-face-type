"use client";

import { useState, useEffect } from "react";

type InAppBrowserType =
  | "instagram"
  | "kakaotalk"
  | "facebook"
  | "naver"
  | "line"
  | "unknown";

interface InAppBrowserInfo {
  isInApp: boolean;
  type: InAppBrowserType;
  isIOS: boolean;
}

// 인앱 브라우저 감지
function detectInAppBrowser(): InAppBrowserInfo {
  if (typeof window === "undefined") {
    return { isInApp: false, type: "unknown", isIOS: false };
  }

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);

  // 인앱 브라우저 패턴
  if (ua.includes("instagram")) {
    return { isInApp: true, type: "instagram", isIOS };
  }
  if (ua.includes("kakaotalk")) {
    return { isInApp: true, type: "kakaotalk", isIOS };
  }
  if (ua.includes("fban") || ua.includes("fbav")) {
    return { isInApp: true, type: "facebook", isIOS };
  }
  if (ua.includes("naver")) {
    return { isInApp: true, type: "naver", isIOS };
  }
  if (ua.includes("line")) {
    return { isInApp: true, type: "line", isIOS };
  }

  return { isInApp: false, type: "unknown", isIOS };
}

// 앱별 안내 메시지
const getHintMessage = (type: InAppBrowserType, isIOS: boolean) => {
  if (type === "instagram") {
    return "또는 우측 상단 ··· → 외부 브라우저로 열기";
  }
  if (type === "kakaotalk") {
    return isIOS
      ? "또는 우측 하단 ··· → 기본 브라우저로 열기"
      : "또는 우측 상단 ⋮ → 다른 브라우저로 열기";
  }
  return isIOS
    ? "또는 우측 하단 ··· → Safari로 열기"
    : "또는 우측 상단 ⋮ → 외부 브라우저로 열기";
};

export default function InAppBrowserBanner() {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const info = detectInAppBrowser();
    setBrowserInfo(info);

    // 이미 닫은 적 있으면 다시 안 보여줌 (세션 단위)
    const wasDismissed = sessionStorage.getItem("inapp_banner_dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("inapp_banner_dismissed", "true");
  };

  // 외부 브라우저로 열기
  const openExternalBrowser = () => {
    const currentUrl = window.location.href;

    if (!browserInfo?.isIOS) {
      // Android: intent:// 스킴으로 Chrome 열기
      const intentUrl = `intent://${currentUrl.replace(
        /^https?:\/\//,
        ""
      )}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } else {
      // iOS: 클립보드에 복사
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  // 인앱 브라우저가 아니거나 이미 닫았으면 표시 안 함
  if (!browserInfo?.isInApp || dismissed) {
    return null;
  }

  const isIOS = browserInfo.isIOS;
  const hintMessage = getHintMessage(browserInfo.type, isIOS);

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <button style={styles.closeBtn} onClick={handleDismiss}>
          ✕
        </button>
        <p style={styles.title}>원활한 사주 풀이를 위해</p>
        <p style={styles.title}>기본 브라우저에서 열어주세요</p>
        <div style={styles.instructionBox}>
          <p style={styles.instruction}>{hintMessage}</p>
        </div>
        <button style={styles.copyBtn} onClick={openExternalBrowser}>
          {isIOS ? (copied ? "복사 완료!" : "링크 복사") : "Chrome으로 열기"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    padding: "12px",
  },
  banner: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px 16px 14px",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
  },
  title: {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    color: "#333",
    lineHeight: 1.4,
  },
  instructionBox: {
    margin: "14px 0",
    padding: "12px 16px",
    background: "#FFF8E1",
    borderRadius: "8px",
    border: "1px solid #FFE082",
  },
  instruction: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 600,
    color: "#E65100",
    lineHeight: 1.4,
  },
  copyBtn: {
    background: "none",
    border: "none",
    fontSize: "12px",
    color: "#999",
    cursor: "pointer",
    textDecoration: "underline",
    padding: "4px",
  },
  closeBtn: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#999",
    cursor: "pointer",
    padding: "4px",
  },
};
