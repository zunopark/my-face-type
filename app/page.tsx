"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trackPageView, trackCardClick, ServiceType } from "@/lib/mixpanel";
import Footer from "@/components/layout/Footer";
import styles from "./page.module.css";

export default function LandingPage() {
  useEffect(() => {
    trackPageView("landing");
  }, []);

  const [showComingSoon, setShowComingSoon] = useState(false);

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
        <span className={styles.brand_name}>AI 양반가</span>
      </div>

      {/* 서비스 카드 2x2 그리드 */}
      <section className={styles.landing_cards}>
        {/* 1행: 정통 관상 + 신년 운세 */}
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
            href="/new-year"
            className={`${styles.card_wrapper} ${styles.card_wrapper_badge}`}
            onClick={() => handleCardClick("new_year")}
          >
            <div className={`${styles.service_card} ${styles.card_newyear}`}>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>까치도령</span>
                <h2 className={styles.card_title}>신년 운세</h2>
              </div>
            </div>
          </Link>
        </div>

        {/* 2행: 연애 사주 + 빈 칸 */}
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
          <div
            className={`${styles.card_wrapper}`}
            onClick={() => setShowComingSoon(true)}
            style={{ cursor: "pointer" }}
          >
            <div className={`${styles.service_card} ${styles.card_saju_general}`}>
              <span className={styles.badge_coming_soon}>섭외중</span>
              <div className={styles.card_title_wrap}>
                <span className={styles.card_character}>운학선인</span>
                <h2 className={styles.card_title}>사주팔자 풀이</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 섭외중 알럿 */}
      {showComingSoon && (
        <div className={styles.alert_overlay} onClick={() => setShowComingSoon(false)}>
          <div className={styles.alert_modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.alert_text}>
              아직 운학선인님을 섭외중이에요
            </p>
            <p className={styles.alert_subtext}>
              3월이 마지막인 까치도령의 <strong className={styles.alert_newyear}>신년 운세</strong>와<br />
              색동낭자의 <strong className={styles.alert_saju}>연애 사주</strong>가 용하다고 소문났어요
            </p>
            <button className={styles.alert_btn} onClick={() => setShowComingSoon(false)}>
              확인
            </button>
          </div>
        </div>
      )}

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
