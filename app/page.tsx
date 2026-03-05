"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackPageView, trackCardClick, ServiceType } from "@/lib/mixpanel";
import Footer from "@/components/layout/Footer";
import styles from "./page.module.css";

export default function LandingPage() {
  useEffect(() => {
    trackPageView("landing");
  }, []);

  const handleCardClick = (type: ServiceType | string) => {
    trackCardClick(type, "landing");
  };

  return (
    <div className={styles.landing_container}>
      {/* 메인 배경 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/main-bg.jpg" alt="" className={styles.main_bg} />

      {/* 브랜드 로고 */}
      <div className={styles.landing_brand}>
        <span className={styles.brand_name}>양반가</span>
      </div>

      {/* 서비스 카드 2x2 그리드 */}
      <section className={styles.landing_cards}>
        {/* 1행: 관상 */}
        <div className={styles.card_row}>
          <Link
            href="/face"
            className={`${styles.card_wrapper}`}
            onClick={() => handleCardClick("face")}
          >
            <div className={`${styles.service_card} ${styles.card_face}`}>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>관상가 양반</span>
                <h2 className={styles.card_title}>정통 관상</h2>
              </div>
            </div>
          </Link>

          <Link
            href="/face?tab=match"
            className={`${styles.card_wrapper}`}
            onClick={() => handleCardClick("face_compatibility")}
          >
            <div className={`${styles.service_card} ${styles.card_match}`}>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>관상가 양반</span>
                <h2 className={styles.card_title}>궁합 관상</h2>
              </div>
            </div>
          </Link>
        </div>

        {/* 2행: 사주 */}
        <div className={styles.card_row}>
          <Link
            href="/saju-love"
            className={`${styles.card_wrapper}`}
            onClick={() => handleCardClick("saju_love")}
          >
            <div className={`${styles.service_card} ${styles.card_saju}`}>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>색동낭자</span>
                <h2 className={styles.card_title}>연애 사주</h2>
              </div>
            </div>
          </Link>

          <Link
            href="/new-year"
            className={`${styles.card_wrapper} ${styles.card_wrapper_badge}`}
            onClick={() => handleCardClick("new_year")}
          >
            <div className={`${styles.service_card} ${styles.card_newyear}`}>
              <span className={styles.badge_limited}>3월 이후 종료</span>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>까치도령</span>
                <h2 className={styles.card_title}>신년 운세</h2>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <Footer />

    </div>
  );
}

declare global {
  interface Window {
    UnicornStudio?: {
      isInitialized: boolean;
      init: () => void;
    };
  }
}
