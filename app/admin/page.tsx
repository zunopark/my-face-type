"use client";

import { useState, useEffect, useCallback } from "react";
import { Link2, Ticket, Pencil, Trash2 } from "lucide-react";
import styles from "./admin.module.css";

interface Coupon {
  id: string;
  code: string;
  name: string;
  service_type: string;
  discount_type: string;
  discount_amount: number;
  total_quantity: number;
  remaining_quantity: number;
  is_active: boolean;
  created_at: string;
}

interface UsageLog {
  id: string;
  coupon_id: string | null;
  coupon_code: string;
  service_type: string;
  used_at: string;
}

interface Influencer {
  id: string;
  name: string;
  slug: string;
  platform: string;
  contact: string | null;
  memo: string | null;
  rs_percentage: number;
  is_active: boolean;
  created_at: string;
  total_visits?: number;
  total_payments?: number;
  total_revenue?: number;
}

interface SettlementRow {
  influencer_id: string;
  influencer_name: string;
  slug: string;
  platform: string;
  visit_count: number;
  payment_count: number;
  total_revenue: number;
  rs_percentage: number;
  settlement_amount: number;
}

const SERVICE_LABELS: Record<string, string> = {
  all: "전체",
  face: "관상",
  couple: "커플궁합",
  saju_love: "연애사주",
  new_year: "신년사주",
};

const DISCOUNT_LABELS: Record<string, string> = {
  free: "무료",
  fixed: "금액할인",
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  blog: "Blog",
};

const EMPTY_FORM = {
  code: "",
  name: "",
  service_type: "all",
  discount_type: "fixed",
  discount_amount: "" as string | number,
  total_quantity: "" as string | number,
};

const EMPTY_INF_FORM = {
  name: "",
  slug: "",
  contact: "",
  memo: "",
  rs_percentage: 40,
};

const BASE_URL = "https://yangban.ai";

const UTM_PAGES = [
  { label: "홈", path: "/" },
  { label: "관상", path: "/face" },
  { label: "궁합", path: "/couple" },
  { label: "연애사주", path: "/saju-love" },
  { label: "신년사주", path: "/new-year" },
];

export default function AdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("admin_auth") === "true") {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<"influencers" | "coupons" | "usage">("influencers");

  // Coupon state
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Edit state
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [editData, setEditData] = useState<Record<string, unknown>>({});

  // Usage log state
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [usageFilter, setUsageFilter] = useState("");
  const [usageLoading, setUsageLoading] = useState(false);

  // Influencer state
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [infLoading, setInfLoading] = useState(false);
  const [showInfForm, setShowInfForm] = useState(false);
  const [infFormData, setInfFormData] = useState(EMPTY_INF_FORM);
  const [infFormError, setInfFormError] = useState("");
  const [editInfluencer, setEditInfluencer] = useState<Influencer | null>(null);
  const [editInfData, setEditInfData] = useState<Record<string, unknown>>({});

  // UTM modal state
  const [utmInfluencer, setUtmInfluencer] = useState<Influencer | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [utmPlatform, setUtmPlatform] = useState("instagram");

  // Settlement state
  const [settlement, setSettlement] = useState<SettlementRow[]>([]);
  const [settlementYear, setSettlementYear] = useState(new Date().getFullYear());
  const [settlementMonth, setSettlementMonth] = useState(new Date().getMonth() + 1);
  const [settlementLoading, setSettlementLoading] = useState(false);

  // ─── 인증 ────────────────────────────────────

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem("admin_auth", "true");
      } else {
        setAuthError(data.error || "인증 실패");
      }
    } catch {
      setAuthError("서버 연결 오류");
    }
  };

  // ─── 쿠폰 CRUD ──────────────────────────────

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      console.error("쿠폰 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreate = async () => {
    setFormError("");
    if (!formData.code || !formData.name) {
      setFormError("쿠폰 코드와 이름을 입력해주세요.");
      return;
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          discount_amount: Number(formData.discount_amount) || 0,
          total_quantity: Number(formData.total_quantity) || 0,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
        return;
      }
      setShowForm(false);
      setFormData(EMPTY_FORM);
      fetchCoupons();
    } catch {
      setFormError("생성 실패");
    }
  };

  const handleUpdate = async () => {
    if (!editCoupon) return;
    setFormError("");

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editCoupon.id, ...editData }),
      });
      const data = await res.json();
      if (data.error) {
        setFormError(data.error);
        return;
      }
      setEditCoupon(null);
      setEditData({});
      fetchCoupons();
    } catch {
      setFormError("수정 실패");
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`"${code}" 쿠폰을 삭제하시겠습니까?`)) return;

    try {
      await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      fetchCoupons();
    } catch (err) {
      console.error("삭제 오류:", err);
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action: "toggle",
          is_active: !currentActive,
        }),
      });
      fetchCoupons();
    } catch (err) {
      console.error("상태 변경 오류:", err);
    }
  };

  const openEdit = (coupon: Coupon) => {
    setEditCoupon(coupon);
    setEditData({
      code: coupon.code,
      name: coupon.name,
      service_type: coupon.service_type,
      discount_type: coupon.discount_type,
      discount_amount: coupon.discount_amount,
      total_quantity: coupon.total_quantity,
      remaining_quantity: coupon.remaining_quantity,
    });
    setFormError("");
  };

  // ─── 사용 내역 ──────────────────────────────

  const fetchUsageLogs = useCallback(async () => {
    setUsageLoading(true);
    try {
      const params = new URLSearchParams({ action: "usage_logs" });
      if (usageFilter) params.set("coupon_code", usageFilter);
      const res = await fetch(`/api/admin/coupons?${params}`);
      const data = await res.json();
      setUsageLogs(data);
    } catch (err) {
      console.error("사용 내역 조회 오류:", err);
    } finally {
      setUsageLoading(false);
    }
  }, [usageFilter]);

  // ─── 인플루언서 CRUD ──────────────────────────

  const fetchInfluencers = useCallback(async () => {
    setInfLoading(true);
    try {
      const res = await fetch("/api/admin/influencers");
      const data = await res.json();
      setInfluencers(data);
    } catch (err) {
      console.error("인플루언서 목록 조회 오류:", err);
    } finally {
      setInfLoading(false);
    }
  }, []);

  const handleCreateInfluencer = async () => {
    setInfFormError("");
    if (!infFormData.name || !infFormData.slug) {
      setInfFormError("이름과 슬러그는 필수입니다.");
      return;
    }

    try {
      const res = await fetch("/api/admin/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...infFormData,
          rs_percentage: Number(infFormData.rs_percentage) || 40,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setInfFormError(data.error);
        return;
      }
      setShowInfForm(false);
      setInfFormData(EMPTY_INF_FORM);
      fetchInfluencers();
    } catch {
      setInfFormError("생성 실패");
    }
  };

  const handleUpdateInfluencer = async () => {
    if (!editInfluencer) return;
    setInfFormError("");

    try {
      const res = await fetch("/api/admin/influencers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editInfluencer.id, ...editInfData }),
      });
      const data = await res.json();
      if (data.error) {
        setInfFormError(data.error);
        return;
      }
      setEditInfluencer(null);
      setEditInfData({});
      fetchInfluencers();
    } catch {
      setInfFormError("수정 실패");
    }
  };

  const handleDeleteInfluencer = async (id: string, name: string) => {
    if (!confirm(`"${name}" 인플루언서를 삭제하시겠습니까?`)) return;

    try {
      await fetch("/api/admin/influencers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_active: false }),
      });
      fetchInfluencers();
    } catch (err) {
      console.error("삭제 오류:", err);
    }
  };

  const openInfEdit = (inf: Influencer) => {
    setEditInfluencer(inf);
    setEditInfData({
      name: inf.name,
      slug: inf.slug,
      contact: inf.contact || "",
      memo: inf.memo || "",
      rs_percentage: inf.rs_percentage,
      is_active: inf.is_active,
    });
    setInfFormError("");
  };

  // ─── UTM 링크 ──────────────────────────────

  const getUtmUrl = (inf: Influencer, path: string) => {
    return `${BASE_URL}${path}?utm_source=${inf.slug}&utm_medium=${utmPlatform}`;
  };

  const handleCopyUtm = async (url: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // fallback
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  // ─── 쿠폰 만들기 (인플루언서용) ──────────────

  const handleCreateCouponForInfluencer = (inf: Influencer) => {
    setActiveTab("coupons");
    setShowForm(true);
    setFormData({
      ...EMPTY_FORM,
      code: inf.slug.toUpperCase(),
      name: `${inf.name} 전용 쿠폰`,
    });
  };

  // ─── 정산 월 이동 ──────────────────────────────

  const goSettlementMonth = (delta: number) => {
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

  // ─── 정산 데이터 ──────────────────────────────

  const fetchSettlement = useCallback(async () => {
    setSettlementLoading(true);
    try {
      const res = await fetch(
        `/api/admin/settlement?year=${settlementYear}&month=${settlementMonth}`
      );
      const data = await res.json();
      setSettlement(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("정산 데이터 조회 오류:", err);
    } finally {
      setSettlementLoading(false);
    }
  }, [settlementYear, settlementMonth]);

  // ─── Effects ──────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoupons();
      fetchInfluencers();
    }
  }, [isAuthenticated, fetchCoupons, fetchInfluencers]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "usage") {
      fetchUsageLogs();
    }
  }, [isAuthenticated, activeTab, fetchUsageLogs]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "influencers") {
      fetchSettlement();
    }
  }, [isAuthenticated, activeTab, fetchSettlement]);

  // ─── 로그인 화면 ──────────────────────────

  if (!authChecked) {
    return (
      <div className={styles.admin_wrapper}>
        <div className={styles.admin_container}>
          <div className={styles.loading}>로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.admin_wrapper}>
        <div className={styles.admin_container}>
          <div className={styles.login_container}>
            <h1 className={styles.login_title}>Admin</h1>
            <div className={styles.login_form}>
              <input
                type="password"
                className={styles.login_input}
                placeholder="비밀번호 입력"
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

  // ─── 메인 대시보드 ──────────────────────

  return (
    <div className={styles.admin_wrapper}>
      <div className={styles.admin_container}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h1 className={styles.title}>마케팅 대시보드</h1>
          <button
            className={styles.logout_button}
            onClick={() => {
              setIsAuthenticated(false);
              setPassword("");
              sessionStorage.removeItem("admin_auth");
            }}
          >
            로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "influencers" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("influencers")}
          >
            인플루언서 관리
          </button>
          <button
            className={`${styles.tab} ${activeTab === "coupons" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("coupons")}
          >
            쿠폰 관리
          </button>
          <button
            className={`${styles.tab} ${activeTab === "usage" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("usage")}
          >
            사용 내역
          </button>
        </div>

        {/* ── 인플루언서 관리 탭 ──────────────── */}
        {activeTab === "influencers" && (
          <>
            <div className={styles.action_bar}>
              <button
                className={styles.create_button}
                onClick={() => {
                  setShowInfForm(!showInfForm);
                  setInfFormData(EMPTY_INF_FORM);
                  setInfFormError("");
                }}
              >
                {showInfForm ? "취소" : "+ 새 인플루언서"}
              </button>
            </div>

            {/* 생성 폼 */}
            {showInfForm && (
              <div className={styles.form_container}>
                <h3 className={styles.form_title}>새 인플루언서 등록</h3>
                <div className={styles.form_grid}>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>이름</label>
                    <input
                      className={styles.form_input}
                      placeholder="예: 김태희"
                      value={infFormData.name}
                      onChange={(e) =>
                        setInfFormData({ ...infFormData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>슬러그 (UTM source)</label>
                    <input
                      className={styles.form_input}
                      placeholder="예: kimtaehee"
                      value={infFormData.slug}
                      onChange={(e) =>
                        setInfFormData({
                          ...infFormData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                        })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>RS 비율 (%)</label>
                    <input
                      className={styles.form_input}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={infFormData.rs_percentage}
                      onChange={(e) =>
                        setInfFormData({
                          ...infFormData,
                          rs_percentage: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>연락처</label>
                    <input
                      className={styles.form_input}
                      placeholder="이메일 또는 전화번호"
                      value={infFormData.contact}
                      onChange={(e) =>
                        setInfFormData({ ...infFormData, contact: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>메모</label>
                    <input
                      className={styles.form_input}
                      placeholder="내부 메모"
                      value={infFormData.memo}
                      onChange={(e) =>
                        setInfFormData({ ...infFormData, memo: e.target.value })
                      }
                    />
                  </div>
                </div>
                {infFormError && <p className={styles.error_msg}>{infFormError}</p>}
                <div className={styles.form_actions}>
                  <button
                    className={styles.form_cancel}
                    onClick={() => setShowInfForm(false)}
                  >
                    취소
                  </button>
                  <button className={styles.form_submit} onClick={handleCreateInfluencer}>
                    등록
                  </button>
                </div>
              </div>
            )}

            {/* 인플루언서 목록 */}
            {infLoading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : influencers.length === 0 ? (
              <div className={styles.empty}>등록된 인플루언서가 없습니다.</div>
            ) : (
              <div className={styles.table_wrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>슬러그</th>
                      <th className={styles.text_right}>RS%</th>
                      <th className={styles.text_right}>방문수</th>
                      <th className={styles.text_right}>결제</th>
                      <th className={styles.text_right}>매출</th>
                      <th className={styles.text_right}>정산액</th>
                      <th className={styles.text_right}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {influencers.map((inf) => {
                      const revenue = inf.total_revenue || 0;
                      const rs = Number(inf.rs_percentage);
                      const settlementAmt = Math.round(revenue * rs / 100);
                      return (
                      <tr key={inf.id}>
                        <td>{inf.name}</td>
                        <td className={styles.code_cell}>{inf.slug}</td>
                        <td className={styles.text_right}>{rs}%</td>
                        <td className={styles.text_right}>{(inf.total_visits || 0).toLocaleString()}</td>
                        <td className={styles.text_right}>{(inf.total_payments || 0).toLocaleString()}</td>
                        <td className={styles.text_right}>{revenue.toLocaleString()}원</td>
                        <td className={styles.text_right}>{settlementAmt.toLocaleString()}원</td>
                        <td className={styles.text_right}>
                          <div className={styles.action_buttons}>
                            <button
                              className={styles.btn_icon}
                              onClick={() => {
                                setUtmInfluencer(inf);
                                setCopiedIdx(null);
                              }}
                              title="UTM 링크"
                            >
                              <Link2 size={14} />
                            </button>
                            <button
                              className={styles.btn_icon}
                              onClick={() => handleCreateCouponForInfluencer(inf)}
                              title="쿠폰 만들기"
                            >
                              <Ticket size={14} />
                            </button>
                            <button
                              className={styles.btn_icon}
                              onClick={() => openInfEdit(inf)}
                              title="수정"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={styles.btn_icon}
                              onClick={() => handleDeleteInfluencer(inf.id, inf.name)}
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 월별 정산 */}
            <div className={styles.settlement_section}>
              <div className={styles.settlement_header}>
                <h3 className={styles.settlement_title}>월별 정산</h3>
                <div className={styles.month_selector}>
                  <button
                    className={styles.month_arrow}
                    onClick={() => goSettlementMonth(-1)}
                  >
                    &larr;
                  </button>
                  <span className={styles.month_display}>
                    {settlementYear}년 {settlementMonth}월
                  </span>
                  <button
                    className={styles.month_arrow}
                    onClick={() => goSettlementMonth(1)}
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              {settlementLoading ? (
                <div className={styles.loading}>불러오는 중...</div>
              ) : settlement.length === 0 ? (
                <div className={styles.empty}>해당 월의 정산 데이터가 없습니다.</div>
              ) : (
                <div className={styles.table_wrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>인플루언서</th>
                        <th className={styles.text_right}>방문수</th>
                        <th className={styles.text_right}>결제건수</th>
                        <th className={styles.text_right}>전환율</th>
                        <th className={styles.text_right}>총 매출</th>
                        <th className={styles.text_right}>RS%</th>
                        <th className={styles.text_right}>정산액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlement.map((row) => (
                        <tr key={row.influencer_id}>
                          <td>{row.influencer_name}</td>
                          <td className={styles.text_right}>
                            {row.visit_count.toLocaleString()}
                          </td>
                          <td className={styles.text_right}>
                            {row.payment_count.toLocaleString()}
                          </td>
                          <td className={styles.text_right}>{row.visit_count > 0 ? ((row.payment_count / row.visit_count) * 100).toFixed(1) : "0.0"}%</td>
                          <td className={styles.text_right}>{row.total_revenue.toLocaleString()}원</td>
                          <td className={styles.text_right}>{row.rs_percentage}%</td>
                          <td className={styles.text_right}>{row.settlement_amount.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.table_foot}>
                        <td>합계</td>
                        <td className={styles.text_right}>{settlement.reduce((s, r) => s + r.visit_count, 0).toLocaleString()}</td>
                        <td className={styles.text_right}>{settlement.reduce((s, r) => s + r.payment_count, 0).toLocaleString()}</td>
                        <td className={styles.text_right}>{(() => { const v = settlement.reduce((s, r) => s + r.visit_count, 0); const p = settlement.reduce((s, r) => s + r.payment_count, 0); return v > 0 ? ((p / v) * 100).toFixed(1) : "0.0"; })()}%</td>
                        <td className={styles.text_right}>{settlement.reduce((s, r) => s + r.total_revenue, 0).toLocaleString()}원</td>
                        <td className={styles.text_right}></td>
                        <td className={styles.text_right}>{settlement.reduce((s, r) => s + r.settlement_amount, 0).toLocaleString()}원</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 쿠폰 관리 탭 ──────────────── */}
        {activeTab === "coupons" && (
          <>
            <div className={styles.action_bar}>
              <button
                className={styles.create_button}
                onClick={() => {
                  setShowForm(!showForm);
                  setFormData(EMPTY_FORM);
                  setFormError("");
                }}
              >
                {showForm ? "취소" : "+ 새 쿠폰"}
              </button>
            </div>

            {/* 생성 폼 */}
            {showForm && (
              <div className={styles.form_container}>
                <h3 className={styles.form_title}>새 쿠폰 만들기</h3>
                <div className={styles.form_grid}>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>쿠폰 코드</label>
                    <input
                      className={styles.form_input}
                      placeholder="예: WELCOME2026"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>쿠폰 이름</label>
                    <input
                      className={styles.form_input}
                      placeholder="예: 신규 가입 쿠폰"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>서비스</label>
                    <select
                      className={styles.form_select}
                      value={formData.service_type}
                      onChange={(e) =>
                        setFormData({ ...formData, service_type: e.target.value })
                      }
                    >
                      {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>할인 유형</label>
                    <select
                      className={styles.form_select}
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value,
                          discount_amount:
                            e.target.value === "free"
                              ? 0
                              : formData.discount_amount,
                        })
                      }
                    >
                      {Object.entries(DISCOUNT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.discount_type === "fixed" && (
                    <div className={styles.form_field}>
                      <label className={styles.form_label}>할인 금액 (원)</label>
                      <input
                        className={styles.form_input}
                        type="number"
                        value={formData.discount_amount}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_amount: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  )}
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>발행 수량</label>
                    <input
                      className={styles.form_input}
                      type="number"
                      value={formData.total_quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          total_quantity: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                {formError && <p className={styles.error_msg}>{formError}</p>}
                <div className={styles.form_actions}>
                  <button
                    className={styles.form_cancel}
                    onClick={() => setShowForm(false)}
                  >
                    취소
                  </button>
                  <button className={styles.form_submit} onClick={handleCreate}>
                    생성
                  </button>
                </div>
              </div>
            )}

            {/* 쿠폰 목록 */}
            {loading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : coupons.length === 0 ? (
              <div className={styles.empty}>등록된 쿠폰이 없습니다.</div>
            ) : (
              <div className={styles.table_wrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>코드</th>
                      <th>이름</th>
                      <th>서비스</th>
                      <th>유형</th>
                      <th>할인</th>
                      <th>수량</th>
                      <th>상태</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className={styles.code_cell}>{coupon.code}</td>
                        <td>{coupon.name}</td>
                        <td>
                          {SERVICE_LABELS[coupon.service_type] ||
                            coupon.service_type}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${coupon.discount_type === "free"
                                ? styles.badge_free
                                : styles.badge_fixed
                              }`}
                          >
                            {DISCOUNT_LABELS[coupon.discount_type] ||
                              coupon.discount_type}
                          </span>
                        </td>
                        <td>
                          {coupon.discount_type === "free"
                            ? "-"
                            : `${coupon.discount_amount.toLocaleString()}원`}
                        </td>
                        <td className={styles.quantity_cell}>
                          {coupon.remaining_quantity} / {coupon.total_quantity}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${coupon.is_active
                                ? styles.badge_active
                                : styles.badge_inactive
                              }`}
                          >
                            {coupon.is_active ? "활성" : "비활성"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.action_buttons}>
                            <button
                              className={styles.btn_toggle}
                              onClick={() =>
                                handleToggle(coupon.id, coupon.is_active)
                              }
                            >
                              {coupon.is_active ? "비활성" : "활성"}
                            </button>
                            <button
                              className={styles.btn_edit}
                              onClick={() => openEdit(coupon)}
                            >
                              수정
                            </button>
                            <button
                              className={styles.btn_delete}
                              onClick={() =>
                                handleDelete(coupon.id, coupon.code)
                              }
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── 사용 내역 탭 ──────────────── */}
        {activeTab === "usage" && (
          <>
            <div className={styles.filter_bar}>
              <span className={styles.filter_label}>쿠폰 필터:</span>
              <select
                className={styles.filter_select}
                value={usageFilter}
                onChange={(e) => setUsageFilter(e.target.value)}
              >
                <option value="">전체</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            {usageLoading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : usageLogs.length === 0 ? (
              <div className={styles.empty}>사용 내역이 없습니다.</div>
            ) : (
              <div className={styles.table_wrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>쿠폰 코드</th>
                      <th>서비스</th>
                      <th>사용 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageLogs.map((log) => (
                      <tr key={log.id}>
                        <td className={styles.code_cell}>{log.coupon_code}</td>
                        <td>
                          {SERVICE_LABELS[log.service_type] || log.service_type}
                        </td>
                        <td>
                          {new Date(log.used_at).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── 쿠폰 수정 모달 ──────────────── */}
        {editCoupon && (
          <div
            className={styles.modal_overlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditCoupon(null);
                setFormError("");
              }
            }}
          >
            <div className={styles.modal}>
              <h3 className={styles.modal_title}>쿠폰 수정</h3>
              <div className={styles.form_grid}>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>쿠폰 코드</label>
                  <input
                    className={styles.form_input}
                    value={(editData.code as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, code: e.target.value })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>쿠폰 이름</label>
                  <input
                    className={styles.form_input}
                    value={(editData.name as string) || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>서비스</label>
                  <select
                    className={styles.form_select}
                    value={(editData.service_type as string) || "all"}
                    onChange={(e) =>
                      setEditData({ ...editData, service_type: e.target.value })
                    }
                  >
                    {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>할인 유형</label>
                  <select
                    className={styles.form_select}
                    value={(editData.discount_type as string) || "free"}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        discount_type: e.target.value,
                        discount_amount:
                          e.target.value === "free"
                            ? 0
                            : (editData.discount_amount as number),
                      })
                    }
                  >
                    {Object.entries(DISCOUNT_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                {editData.discount_type === "fixed" && (
                  <div className={styles.form_field}>
                    <label className={styles.form_label}>할인 금액 (원)</label>
                    <input
                      className={styles.form_input}
                      type="number"
                      value={(editData.discount_amount as string | number) ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          discount_amount: e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
                <div className={styles.form_field}>
                  <label className={styles.form_label}>총 발행 수량</label>
                  <input
                    className={styles.form_input}
                    type="number"
                    value={(editData.total_quantity as string | number) ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        total_quantity: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>잔여 수량</label>
                  <input
                    className={styles.form_input}
                    type="number"
                    value={(editData.remaining_quantity as string | number) ?? ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        remaining_quantity: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              {formError && <p className={styles.error_msg}>{formError}</p>}
              <div className={styles.form_actions}>
                <button
                  className={styles.form_cancel}
                  onClick={() => {
                    setEditCoupon(null);
                    setFormError("");
                  }}
                >
                  취소
                </button>
                <button className={styles.form_submit} onClick={handleUpdate}>
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 인플루언서 수정 모달 ──────────────── */}
        {editInfluencer && (
          <div
            className={styles.modal_overlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditInfluencer(null);
                setInfFormError("");
              }
            }}
          >
            <div className={styles.modal}>
              <h3 className={styles.modal_title}>인플루언서 수정</h3>
              <div className={styles.form_grid}>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>이름</label>
                  <input
                    className={styles.form_input}
                    value={(editInfData.name as string) || ""}
                    onChange={(e) =>
                      setEditInfData({ ...editInfData, name: e.target.value })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>슬러그</label>
                  <input
                    className={styles.form_input}
                    value={(editInfData.slug as string) || ""}
                    onChange={(e) =>
                      setEditInfData({
                        ...editInfData,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                      })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>RS 비율 (%)</label>
                  <input
                    className={styles.form_input}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={(editInfData.rs_percentage as number) ?? 40}
                    onChange={(e) =>
                      setEditInfData({
                        ...editInfData,
                        rs_percentage: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>연락처</label>
                  <input
                    className={styles.form_input}
                    value={(editInfData.contact as string) || ""}
                    onChange={(e) =>
                      setEditInfData({ ...editInfData, contact: e.target.value })
                    }
                  />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>상태</label>
                  <select
                    className={styles.form_select}
                    value={editInfData.is_active ? "true" : "false"}
                    onChange={(e) =>
                      setEditInfData({
                        ...editInfData,
                        is_active: e.target.value === "true",
                      })
                    }
                  >
                    <option value="true">활성</option>
                    <option value="false">비활성</option>
                  </select>
                </div>
                <div className={styles.form_field_full}>
                  <label className={styles.form_label}>메모</label>
                  <textarea
                    className={styles.form_textarea}
                    value={(editInfData.memo as string) || ""}
                    onChange={(e) =>
                      setEditInfData({ ...editInfData, memo: e.target.value })
                    }
                  />
                </div>
              </div>
              {infFormError && <p className={styles.error_msg}>{infFormError}</p>}
              <div className={styles.form_actions}>
                <button
                  className={styles.form_cancel}
                  onClick={() => {
                    setEditInfluencer(null);
                    setInfFormError("");
                  }}
                >
                  취소
                </button>
                <button className={styles.form_submit} onClick={handleUpdateInfluencer}>
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── UTM 링크 모달 ──────────────── */}
        {utmInfluencer && (
          <div
            className={styles.modal_overlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setUtmInfluencer(null);
              }
            }}
          >
            <div className={styles.modal}>
              <h3 className={styles.modal_title}>{utmInfluencer.name} UTM 링크</h3>
              <div className={styles.utm_platform_bar}>
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
                  const url = getUtmUrl(utmInfluencer, page.path);
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
              <div className={styles.form_actions}>
                <button
                  className={styles.form_cancel}
                  onClick={() => setUtmInfluencer(null)}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
