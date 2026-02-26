"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./influencer.module.css";

interface InfluencerInfo {
  id: string;
  name: string;
  slug: string;
  rs_percentage: number;
}

interface Summary {
  total_visits: number;
  total_payments: number;
  total_revenue: number;
}

interface SettlementData {
  year: number;
  month: number;
  visit_count: number;
  payment_count: number;
  total_revenue: number;
}

interface PaymentDetail {
  id: string;
  service_type: string;
  user_name: string;
  price: number;
  paid_at: string;
  is_refunded: boolean;
}

const SERVICE_LABELS: Record<string, string> = {
  face: "관상",
  couple: "커플궁합",
  saju_love: "연애사주",
  new_year: "신년사주",
};

const BASE_URL = "https://yangban.ai";

const UTM_PAGES = [
  { label: "홈", path: "/" },
  { label: "관상", path: "/face" },
  { label: "궁합", path: "/couple" },
  { label: "연애사주", path: "/saju-love" },
  { label: "신년사주", path: "/new-year" },
];

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  blog: "Blog",
};

export default function InfluencerPage() {
  // Auth
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [influencer, setInfluencer] = useState<InfluencerInfo | null>(null);

  // Summary
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Settlement
  const [settlement, setSettlement] = useState<SettlementData | null>(null);
  const [settlementYear, setSettlementYear] = useState(new Date().getFullYear());
  const [settlementMonth, setSettlementMonth] = useState(new Date().getMonth() + 1);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // Payment details
  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // UTM link state
  const [showUtm, setShowUtm] = useState(false);
  const [utmPlatform, setUtmPlatform] = useState("instagram");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Check session
  useEffect(() => {
    const saved = sessionStorage.getItem("influencer_auth");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setInfluencer(data);
        setIsAuthenticated(true);
      } catch {
        sessionStorage.removeItem("influencer_auth");
      }
    }
    setAuthChecked(true);
  }, []);

  // Login
  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/admin/influencer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, password }),
      });
      const data = await res.json();
      if (data.authenticated) {
        setInfluencer(data.influencer);
        setIsAuthenticated(true);
        sessionStorage.setItem("influencer_auth", JSON.stringify(data.influencer));
      } else {
        setAuthError(data.error || "인증 실패");
      }
    } catch {
      setAuthError("서버 연결 오류");
    }
  };

  // Logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setInfluencer(null);
    setSlug("");
    setPassword("");
    setSummary(null);
    setSettlement(null);
    setPayments([]);
    sessionStorage.removeItem("influencer_auth");
  };

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    if (!influencer) return;
    setSummaryLoading(true);
    try {
      const res = await fetch(
        `/api/admin/influencer/data?influencer_id=${influencer.id}&type=summary`
      );
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error("Summary error:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [influencer]);

  // Fetch settlement
  const fetchSettlement = useCallback(async () => {
    if (!influencer) return;
    setSettlementLoading(true);
    try {
      const res = await fetch(
        `/api/admin/influencer/data?influencer_id=${influencer.id}&type=settlement&year=${settlementYear}&month=${settlementMonth}`
      );
      const data = await res.json();
      setSettlement(data);
    } catch (err) {
      console.error("Settlement error:", err);
    } finally {
      setSettlementLoading(false);
    }
  }, [influencer, settlementYear, settlementMonth]);

  // Fetch payments (해당 월)
  const fetchPayments = useCallback(async () => {
    if (!influencer) return;
    setPaymentLoading(true);
    try {
      const res = await fetch(
        `/api/admin/influencer/data?influencer_id=${influencer.id}&type=payments&year=${settlementYear}&month=${settlementMonth}`
      );
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Payments error:", err);
    } finally {
      setPaymentLoading(false);
    }
  }, [influencer, settlementYear, settlementMonth]);

  // Month navigation
  const goMonth = (delta: number) => {
    let newMonth = settlementMonth + delta;
    let newYear = settlementYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSettlementYear(newYear);
    setSettlementMonth(newMonth);
  };

  // UTM copy
  const handleCopyUtm = async (url: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Effects
  useEffect(() => {
    if (isAuthenticated && influencer) {
      fetchSummary();
    }
  }, [isAuthenticated, influencer, fetchSummary]);

  useEffect(() => {
    if (isAuthenticated && influencer) {
      fetchSettlement();
      fetchPayments();
    }
  }, [isAuthenticated, influencer, fetchSettlement, fetchPayments]);

  // Loading check
  if (!authChecked) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.loading}>로딩 중...</div>
        </div>
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.login_container}>
            <h1 className={styles.login_title}>인플루언서 대시보드</h1>
            <p className={styles.login_subtitle}>로그인하여 정산 내역을 확인하세요</p>
            <div className={styles.login_form}>
              <input
                type="text"
                className={styles.login_input}
                placeholder="아이디 (슬러그)"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("inf-pw")?.focus()}
              />
              <input
                id="inf-pw"
                type="password"
                className={styles.login_input}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <button className={styles.login_button} onClick={handleLogin}>
                로그인
              </button>
            </div>
            {authError && <p className={styles.login_error}>{authError}</p>}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  const rsPercent = influencer?.rs_percentage || 0;
  const settlementAmount = summary
    ? Math.round(summary.total_revenue * rsPercent / 100)
    : 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {influencer?.name} <span className={styles.subtitle}>대시보드</span>
            </h1>
          </div>
          <div className={styles.header_actions}>
            <button
              className={styles.utm_toggle_button}
              onClick={() => setShowUtm(!showUtm)}
            >
              내 UTM 링크
            </button>
            <button className={styles.logout_button} onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>

        {/* UTM Links Modal */}
        {showUtm && influencer && (
          <div
            className={styles.modal_overlay}
            onClick={(e) => { if (e.target === e.currentTarget) setShowUtm(false); }}
          >
            <div className={styles.modal}>
              <div className={styles.utm_header}>
                <div>
                  <h3 className={styles.utm_title}>내 UTM 링크</h3>
                  <p className={styles.utm_desc}>하나의 링크만으로도 유저가 다른 페이지로 이동 시 결제 추적이 됩니다. (24시간)</p>
                </div>
              </div>
              <div className={styles.utm_platforms}>
                {Object.entries(PLATFORM_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    className={`${styles.utm_platform_btn} ${utmPlatform === key ? styles.utm_platform_active : ""}`}
                    onClick={() => { setUtmPlatform(key); setCopiedIdx(null); }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={styles.utm_links}>
                {UTM_PAGES.map((page, idx) => {
                  const url = `${BASE_URL}${page.path}?utm_source=${influencer.slug}&utm_medium=${utmPlatform}`;
                  return (
                    <div key={page.path} className={styles.utm_link_row}>
                      <span className={styles.utm_link_label}>{page.label}</span>
                      <span className={styles.utm_link_url}>{url}</span>
                      <button
                        className={copiedIdx === idx ? styles.btn_copied : styles.btn_copy}
                        onClick={() => handleCopyUtm(url, idx)}
                      >
                        {copiedIdx === idx ? "복사됨" : "복사"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className={styles.modal_actions}>
                <button className={styles.modal_close} onClick={() => setShowUtm(false)}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {summaryLoading ? (
          <div className={styles.loading}>불러오는 중...</div>
        ) : summary ? (
          <div className={styles.summary_cards}>
            <div className={styles.summary_card}>
              <div className={styles.summary_label}>총 방문수</div>
              <div className={styles.summary_value}>
                {summary.total_visits.toLocaleString()}
              </div>
            </div>
            <div className={styles.summary_card}>
              <div className={styles.summary_label}>총 결제</div>
              <div className={styles.summary_value}>
                {summary.total_payments.toLocaleString()}건
              </div>
            </div>
            <div className={styles.summary_card}>
              <div className={styles.summary_label}>전환율</div>
              <div className={styles.summary_value}>
                {summary.total_visits > 0
                  ? ((summary.total_payments / summary.total_visits) * 100).toFixed(1)
                  : "0.0"}%
              </div>
            </div>
            <div className={styles.summary_card}>
              <div className={styles.summary_label}>총 매출</div>
              <div className={styles.summary_value}>
                {summary.total_revenue.toLocaleString()}원
              </div>
            </div>
            <div className={styles.summary_card}>
              <div className={styles.summary_label}>총 정산액 (RS {rsPercent}%)</div>
              <div className={styles.summary_value}>
                {settlementAmount.toLocaleString()}원
              </div>
            </div>
          </div>
        ) : null}

        {/* Monthly Settlement */}
        <div className={styles.settlement_section}>
          <div className={styles.settlement_header}>
            <h3 className={styles.settlement_title}>월별 정산</h3>
            <div className={styles.month_selector}>
              <button className={styles.month_arrow} onClick={() => goMonth(-1)}>
                &larr;
              </button>
              <span className={styles.month_display}>
                {settlementYear}년 {settlementMonth}월
              </span>
              <button className={styles.month_arrow} onClick={() => goMonth(1)}>
                &rarr;
              </button>
            </div>
          </div>

          {settlementLoading ? (
            <div className={styles.loading}>불러오는 중...</div>
          ) : settlement ? (
            <div className={styles.settlement_card}>
              <div className={styles.settlement_grid}>
                <div>
                  <div className={styles.settlement_item_label}>방문수</div>
                  <div className={styles.settlement_item_value}>
                    {settlement.visit_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles.settlement_item_label}>결제건수</div>
                  <div className={styles.settlement_item_value}>
                    {settlement.payment_count.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className={styles.settlement_item_label}>전환율</div>
                  <div className={styles.settlement_item_value}>
                    {settlement.visit_count > 0
                      ? ((settlement.payment_count / settlement.visit_count) * 100).toFixed(1)
                      : "0.0"}
                    %
                  </div>
                </div>
                <div>
                  <div className={styles.settlement_item_label}>매출</div>
                  <div className={styles.settlement_item_value}>
                    {settlement.total_revenue.toLocaleString()}원
                  </div>
                </div>
                <div>
                  <div className={styles.settlement_item_label}>정산액 (RS {rsPercent}%)</div>
                  <div className={`${styles.settlement_item_value} ${styles.highlight}`}>
                    {Math.round(settlement.total_revenue * rsPercent / 100).toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>정산 데이터가 없습니다.</div>
          )}
        </div>

        {/* Payment Details - 해당 월 결제 리스트 항상 표시 */}
        <div className={styles.payment_section}>
          <h3 className={styles.payment_title}>
            결제 내역 ({settlementYear}년 {settlementMonth}월)
          </h3>

          {paymentLoading ? (
            <div className={styles.loading}>불러오는 중...</div>
          ) : payments.length === 0 ? (
            <div className={styles.empty}>해당 월의 결제 내역이 없습니다.</div>
          ) : (
            <div className={styles.table_wrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>서비스</th>
                    <th>이름</th>
                    <th className={styles.text_right}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {new Date(p.paid_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </td>
                      <td>
                        {SERVICE_LABELS[p.service_type] || p.service_type}
                        {p.is_refunded && <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 8, fontSize: 10, fontWeight: 600, background: "rgba(231, 76, 60, 0.1)", color: "#e74c3c" }}>환불</span>}
                      </td>
                      <td>{p.user_name}</td>
                      <td className={styles.text_right}>
                        {p.is_refunded ? (
                          <span style={{ textDecoration: "line-through", color: "#999" }}>{p.price.toLocaleString()}원</span>
                        ) : (
                          <>{p.price.toLocaleString()}원</>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.table_foot}>
                    <td colSpan={3}>합계 ({payments.filter(p => !p.is_refunded).length}건{payments.filter(p => p.is_refunded).length > 0 ? ` / 환불 ${payments.filter(p => p.is_refunded).length}건` : ""})</td>
                    <td className={styles.text_right}>
                      {payments
                        .filter(p => !p.is_refunded)
                        .reduce((s, p) => s + p.price, 0)
                        .toLocaleString()}
                      원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
