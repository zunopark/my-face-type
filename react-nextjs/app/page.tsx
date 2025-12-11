"use client";

import { useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { track } from "@/lib/mixpanel";

export default function LandingPage() {
  const handleCardClick = (type: string) => {
    track("랜딩 카드 클릭", {
      type,
      timestamp: new Date().toISOString(),
    });
  };

  useEffect(() => {
    // UnicornStudio 초기화
    if (typeof window !== "undefined" && window.UnicornStudio && !window.UnicornStudio.isInitialized) {
      window.UnicornStudio.init();
      window.UnicornStudio.isInitialized = true;
    }
  }, []);

  return (
    <div className="landing-container">
      {/* UnicornStudio Script */}
      <Script
        src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
            window.UnicornStudio.init();
            window.UnicornStudio.isInitialized = true;
          }
        }}
      />

      {/* UnicornStudio 애니메이션 */}
      <div className="landing-hero">
        <div
          data-us-project="eSJnffZ78bul8Jl94Zyw"
          style={{ width: "100%", height: 300 }}
        />
      </div>

      {/* 서비스 카드 */}
      <section className="landing-cards">
        {/* 관상 카드 */}
        <Link
          href="/face"
          className="service-card card-face"
          onClick={() => handleCardClick("face")}
        >
          <div className="card-icon-wrap">
            <span className="card-icon">👤</span>
          </div>
          <h2 className="card-title">정통 관상</h2>
          <p className="card-desc">
            AI가 당신의 얼굴을 분석하여<br />
            타고난 운명을 풀이합니다
          </p>
          <div className="card-tags">
            <span className="tag">#이목구비</span>
            <span className="tag">#성격</span>
            <span className="tag">#재물운</span>
          </div>
          <div className="card-arrow">
            <span className="material-icons">arrow_forward</span>
          </div>
        </Link>

        {/* 궁합 카드 */}
        <Link
          href="/face?tab=match"
          className="service-card card-couple"
          onClick={() => handleCardClick("couple")}
        >
          <div className="card-icon-wrap">
            <span className="card-icon">💑</span>
          </div>
          <h2 className="card-title">궁합 관상</h2>
          <p className="card-desc">
            두 사람의 관상을 비교하여<br />
            인연의 깊이를 살펴봅니다
          </p>
          <div className="card-tags">
            <span className="tag">#궁합점수</span>
            <span className="tag">#애정운</span>
            <span className="tag">#속궁합</span>
          </div>
          <div className="card-arrow">
            <span className="material-icons">arrow_forward</span>
          </div>
        </Link>

        {/* 연애사주 카드 */}
        <Link
          href="/saju-love"
          className="service-card card-saju"
          onClick={() => handleCardClick("saju")}
        >
          <div className="card-badge">오늘만 100원</div>
          <div className="card-icon-wrap">
            <span className="card-icon">💫</span>
          </div>
          <h2 className="card-title">연애 사주</h2>
          <p className="card-desc">
            2025년 당신의 연애운과<br />
            운명의 상대를 알아봅니다
          </p>
          <div className="card-tags">
            <span className="tag">#운명의상대</span>
            <span className="tag">#연애시기</span>
            <span className="tag">#이상형</span>
          </div>
          <div className="card-arrow">
            <span className="material-icons">arrow_forward</span>
          </div>
        </Link>
      </section>

      {/* 신뢰 지표 */}
      <section className="landing-trust">
        <div className="trust-item">
          <span className="trust-number">50만+</span>
          <span className="trust-label">누적 분석</span>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-number">4.8</span>
          <span className="trust-label">만족도</span>
        </div>
        <div className="trust-divider" />
        <div className="trust-item">
          <span className="trust-number">AI</span>
          <span className="trust-label">딥러닝 분석</span>
        </div>
      </section>

      {/* 하단 네비게이션 */}
      <nav className="nav_wrap">
        <Link href="/" className="nav_content nav_seleted">
          <span className="material-icons nav_icon">home</span>
          <div className="nav_title">전체 보기</div>
        </Link>
        <Link href="/history/" className="nav_content">
          <span className="material-icons nav_icon">person</span>
          <div className="nav_title">지난 보고서</div>
        </Link>
      </nav>
    </div>
  );
}

// TypeScript 타입 선언
declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}
