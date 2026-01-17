"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { trackPageView, trackCardClick, ServiceType } from "@/lib/mixpanel";
import Footer from "@/components/layout/Footer";
import styles from "./page.module.css";

export default function LandingPage() {
  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("landing");
  }, []);

  const handleCardClick = (type: ServiceType | string) => {
    trackCardClick(type, "landing");
  };

  return (
    <div className={styles.landing_container}>
      {/* 브랜드 로고 */}
      <div className={styles.landing_brand}>
        <span className={styles.brand_name}>양반가</span>
      </div>

      {/* 메인 히어로 이미지 */}
      <div className={styles.landing_hero}>
        <Image
          src="/img/main-bg.jpg"
          alt="양반가 - 정통 운세"
          width={500}
          height={350}
          className={styles.landing_hero_image}
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
      </div>

      {/* 서비스 카드 - 1x2 그리드 */}
      <section className={styles.landing_cards}>
        {/* 정통 관상 */}
        <Link
          href="/face"
          className={styles.card_wrapper}
          onClick={() => handleCardClick("face")}
        >
          <div className={`${styles.service_card} ${styles.card_face}`}>
            <div className={styles.card_title_wrap}>
              <span className={styles.card_subtitle}>관상가 양반</span>
              <h2 className={styles.card_title}>정통 관상</h2>
            </div>
          </div>
          <div className={styles.card_info}>
            <div className={styles.card_info_title}>관상가 양반 정통 관상</div>
            <div className={styles.card_info_desc}>대한민국 1위 AI 관상 테스트</div>
          </div>
        </Link>

        {/* 연애 사주 */}
        <Link
          href="/saju-love"
          className={styles.card_wrapper}
          onClick={() => handleCardClick("saju_love")}
        >
          <div className={`${styles.service_card} ${styles.card_saju}`}>
            <div className={styles.card_title_wrap}>
              <span className={styles.card_subtitle}>색동낭자</span>
              <h2 className={styles.card_title}>연애 사주</h2>
            </div>
          </div>
          <div className={styles.card_info}>
            <div className={styles.card_info_title}>색동낭자 연애 사주</div>
            <div className={styles.card_info_desc}>당신의 연애가 어려운 이유는?</div>
          </div>
        </Link>

        {/* 2026 신년 사주 */}
        <Link
          href="/new-year"
          className={styles.card_wrapper}
          onClick={() => handleCardClick("new_year")}
        >
          <div className={`${styles.service_card} ${styles.card_newyear}`}>
            <div className={styles.card_title_wrap}>
              <span className={styles.card_subtitle}>까치도령</span>
              <h2 className={styles.card_title}>신년 운세</h2>
            </div>
          </div>
          <div className={styles.card_info}>
            <div className={styles.card_info_title}>까치도령 2026 신년운세</div>
            <div className={styles.card_info_desc}>병오년, 당신의 한 해 운세는?</div>
          </div>
        </Link>
      </section>

      {/* 동물상 테스트 배너 */}
      <Link
        href="/animalface"
        className={styles.animal_banner}
        onClick={() => handleCardClick("animalface")}
      >
        <div className={styles.animal_banner_content}>
          <div className={styles.animal_banner_text}>
            <span className={styles.animal_banner_label}>무료 테스트</span>
            <span className={styles.animal_banner_title}>나의 동물상은?</span>
          </div>
          <span className={styles.animal_banner_arrow}>
            <span className="material-icons">arrow_forward</span>
          </span>
        </div>
      </Link>

      {/* Footer */}
      <Footer />

      {/* 하단 네비게이션 */}
      <nav className={styles.nav_wrap}>
        <Link href="/" className={`${styles.nav_content} ${styles.nav_seleted}`}>
          <span className={`material-icons ${styles.nav_icon}`}>home</span>
          <div className={styles.nav_title}>전체 보기</div>
        </Link>
        <Link href="/history/" className={styles.nav_content}>
          <span className={`material-icons ${styles.nav_icon}`}>person</span>
          <div className={styles.nav_title}>지난 보고서</div>
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
