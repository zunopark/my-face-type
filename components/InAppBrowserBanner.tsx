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
const getInstructions = (type: InAppBrowserType, isIOS: boolean) => {
  const browser = isIOS ? "Safari" : "Chrome";

  switch (type) {
    case "instagram":
      return {
        title: "인스타그램 앱에서 접속하셨네요",
        instruction: isIOS
          ? "우측 하단 ··· → Safari로 열기"
          : "우측 상단 ⋮ → Chrome에서 열기",
      };
    case "kakaotalk":
      return {
        title: "카카오톡 앱에서 접속하셨네요",
        instruction: isIOS
          ? "우측 하단 ··· → 기본 브라우저로 열기"
          : "우측 상단 ⋮ → 다른 브라우저로 열기",
      };
    case "facebook":
      return {
        title: "페이스북 앱에서 접속하셨네요",
        instruction: `우측 하단 ··· → ${browser}로 열기`,
      };
    case "naver":
      return {
        title: "네이버 앱에서 접속하셨네요",
        instruction: `우측 상단 ⋮ → ${browser}로 열기`,
      };
    case "line":
      return {
        title: "라인 앱에서 접속하셨네요",
        instruction: `우측 하단 ··· → ${browser}로 열기`,
      };
    default:
      return {
        title: "인앱 브라우저에서 접속하셨네요",
        instruction: `메뉴에서 ${browser}로 열기를 선택해주세요`,
      };
  }
};

export default function InAppBrowserBanner() {
  const [browserInfo, setBrowserInfo] = useState<InAppBrowserInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

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

  // 인앱 브라우저가 아니거나 이미 닫았으면 표시 안 함
  if (!browserInfo?.isInApp || dismissed) {
    return null;
  }

  const { title, instruction } = getInstructions(
    browserInfo.type,
    browserInfo.isIOS
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
        <div style={styles.iconWrap}>
          <span style={styles.icon}>🔒</span>
        </div>
        <div style={styles.content}>
          <p style={styles.title}>{title}</p>
          <p style={styles.desc}>원활한 결제를 위해 기본 브라우저로 열어주세요</p>
          <div style={styles.instructionBox}>
            <span style={styles.instruction}>{instruction}</span>
          </div>
        </div>
        <button style={styles.closeBtn} onClick={handleDismiss}>
          ✕
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
    background: "rgba(0,0,0,0.5)",
  },
  banner: {
    background: "#fff",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    position: "relative",
  },
  iconWrap: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#FFF3E0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    fontSize: "20px",
  },
  content: {
    flex: 1,
  },
  title: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#333",
  },
  desc: {
    margin: "4px 0 8px",
    fontSize: "12px",
    color: "#666",
  },
  instructionBox: {
    background: "#F5F5F5",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  instruction: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#E65100",
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
