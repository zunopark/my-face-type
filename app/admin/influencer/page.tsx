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
}

const SERVICE_LABELS: Record<string, string> = {
  face: "관상",
  couple: "커플궁합",
  saju_love: "연애사주",
  new_year: "신년사주",
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
  const [showPayments, setShowPayments] = useState(false);
  const [paymentViewMonth, setPaymentViewMonth] = useState<{ year: number; month: number } | null>(null);

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
    setShowPayments(false);
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

  // Fetch payments
  const fetchPayments = async (year?: number, month?: number) => {
    if (!influencer) return;
    setPaymentLoading(true);
    try {
      let url = `/api/admin/influencer/data?influencer_id=${influencer.id}&type=payments`;
      if (year && month) {
        url += `&year=${year}&month=${month}`;
        setPaymentViewMonth({ year, month });
      } else {
        setPaymentViewMonth(null);
      }
      const res = await fetch(url);
      const data = await res.json();
      setPayments(Array.isArray(data) ? data : []);
      setShowPayments(true);
    } catch (err) {
      console.error("Payments error:", err);
    } finally {
      setPaymentLoading(false);
    }
  };

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

  // Effects
  useEffect(() => {
    if (isAuthenticated && influencer) {
      fetchSummary();
    }
  }, [isAuthenticated, influencer, fetchSummary]);

  useEffect(() => {
    if (isAuthenticated && influencer) {
      fetchSettlement();
    }
  }, [isAuthenticated, influencer, fetchSettlement]);

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
          <button className={styles.logout_button} onClick={handleLogout}>
            로그아웃
          </button>
        </div>

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
                    {settlement.payment_count > 0 ? (
                      <span
                        className={styles.clickable_num}
                        onClick={() => fetchPayments(settlement.year, settlement.month)}
                      >
                        {settlement.payment_count.toLocaleString()}
                      </span>
                    ) : (
                      "0"
                    )}
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

        {/* Payment Details */}
        {showPayments && (
          <div className={styles.payment_section}>
            <div className={styles.payment_header}>
              <h3 className={styles.payment_title}>
                결제 내역
                {paymentViewMonth
                  ? ` (${paymentViewMonth.year}년 ${paymentViewMonth.month}월)`
                  : " (전체)"}
              </h3>
              <button
                className={styles.payment_close}
                onClick={() => setShowPayments(false)}
              >
                닫기
              </button>
            </div>

            {paymentLoading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : payments.length === 0 ? (
              <div className={styles.empty}>결제 내역이 없습니다.</div>
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
                        <td>{SERVICE_LABELS[p.service_type] || p.service_type}</td>
                        <td>{p.user_name}</td>
                        <td className={styles.text_right}>
                          {p.price.toLocaleString()}원
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className={styles.table_foot}>
                      <td colSpan={3}>합계 ({payments.length}건)</td>
                      <td className={styles.text_right}>
                        {payments
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
        )}
      </div>
    </div>
  );
}
