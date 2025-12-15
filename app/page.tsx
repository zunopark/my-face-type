"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { trackPageView, trackCardClick, ServiceType } from "@/lib/mixpanel";
import Footer from "@/components/layout/Footer";

export default function LandingPage() {
  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("landing");
  }, []);

  const handleCardClick = (type: ServiceType | string) => {
    trackCardClick(type, "landing");
  };

  return (
    <div className="landing-container">
      {/* 브랜드 로고 */}
      <div className="landing-brand">
        <span className="brand-name">양반家</span>
      </div>

      {/* 메인 히어로 이미지 */}
      <div className="landing-hero">
        <Image
          src="/img/main-bg.jpg"
          alt="양반家 - 정통 운세"
          width={500}
          height={350}
          className="landing-hero-image"
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
      </div>

      {/* 서비스 카드 - 1x2 그리드 */}
      <section className="landing-cards">
        {/* 정통 관상 */}
        <Link
          href="/face"
          className="card-wrapper"
          onClick={() => handleCardClick("face")}
        >
          <div className="service-card card-face">
            <div className="card-title-wrap">
              <span className="card-subtitle">관상가 양반</span>
              <h2 className="card-title">정통 관상</h2>
            </div>
          </div>
          <div className="card-info">
            <div className="card-info-title">관상가 양반 정통 관상</div>
            <div className="card-info-desc">대한민국 1위 AI 관상 테스트</div>
          </div>
        </Link>

        {/* 연애 사주 */}
        <Link
          href="/saju-love"
          className="card-wrapper"
          onClick={() => handleCardClick("saju")}
        >
          <div className="service-card card-saju">
            <div className="card-title-wrap">
              <span className="card-subtitle">색동낭자</span>
              <h2 className="card-title">연애 사주</h2>
            </div>
          </div>
          <div className="card-info">
            <div className="card-info-title">색동낭자 연애 사주</div>
            <div className="card-info-desc">당신의 연애가 어려운 이유는?</div>
          </div>
        </Link>
      </section>

      {/* 동물상 테스트 배너 */}
      <Link
        href="/animalface"
        className="animal-banner"
        onClick={() => handleCardClick("animalface")}
      >
        <div className="animal-banner-content">
          <div className="animal-banner-text">
            <span className="animal-banner-label">무료 테스트</span>
            <span className="animal-banner-title">나의 동물상은?</span>
          </div>
          <span className="animal-banner-arrow">
            <span className="material-icons">arrow_forward</span>
          </span>
        </div>
      </Link>

      {/* Footer */}
      <Footer />

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
