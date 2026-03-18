"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Link2, Ticket, Pencil, Trash2, ExternalLink, Star } from "lucide-react";
import * as XLSX from "xlsx";
import styles from "./superadmin.module.css";
import { supabase } from "@/lib/supabase";

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
  admin_id?: string | null;
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
  total_settled?: number;
  password?: string;
  admin_id?: string | null;
}

interface InfluencerDiscount {
  id: string;
  influencer_id: string;
  service_type: string;
  discount_code: string;
  discount_start_at: string | null;
  discount_end_at: string | null;
}

interface AdminAccount {
  id: string;
  name: string;
  rs_percentage: number;
  filtered_revenue: number;
  rs_start_date: string | null;
  total_paid?: number;
}

interface PaymentDetail {
  id: string;
  service_type: string;
  user_name: string;
  price: number;
  paid_at: string;
  is_refunded: boolean;
}

interface AllPayment {
  id: string;
  service_type: string;
  user_name: string;
  wish: string | null;
  price: number;
  coupon_code: string | null;
  influencer: string | null;
  paid_at: string;
  has_review: boolean;
  review_rating: number | null;
  review_content: string | null;
  is_refunded: boolean;
  refunded_at: string | null;
  table: "saju_analyses" | "face_analyses";
}

const SERVICE_RESULT_PATHS: Record<string, string> = {
  face: "/face/result",
  couple: "/couple/result",
  saju_love: "/saju-love/result",
  new_year: "/new-year/result",
};

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

interface SettlementStatus {
  influencer_id: string;
  year: number;
  month: number;
  amount: number;
  is_paid?: boolean;
  paid_at?: string | null;
  memo?: string;
}

interface MarketerSettlementStatus {
  marketer_id: string;
  year: number;
  month: number;
  amount: number;
  is_paid?: boolean;
  paid_at?: string | null;
  memo?: string;
}

interface SettlementRecord {
  id: string;
  target_type: "influencer" | "marketer";
  target_id: string;
  amount: number;
  memo: string | null;
  settled_at: string;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  face: "관상",
  couple: "커플궁합",
  saju_love: "연애사주",
  new_year: "신년사주",
};

const SERVICE_PRICES: Record<string, number> = {
  face: 9900,
  couple: 9900,
  saju_love: 23900,
  new_year: 26900,
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
  service_type: "face",
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
  password: "",
};

const BASE_URL = "https://yangban.ai";

const UTM_PAGES = [
  { label: "홈", path: "/" },
  { label: "관상", path: "/face" },
  { label: "궁합", path: "/couple" },
  { label: "연애사주", path: "/saju-love" },
  { label: "신년사주", path: "/new-year" },
];

export default function SuperAdminPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("superadmin_auth") === "true") {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<"influencers" | "coupons" | "usage" | "payments" | "marketers" | "settlement">("payments");

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
  const [discountInfluencer, setDiscountInfluencer] = useState<Influencer | null>(null);
  const [discountList, setDiscountList] = useState<InfluencerDiscount[]>([]);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [discountForm, setDiscountForm] = useState({ service_type: "face", discount_code: "", discount_start_at: "", discount_end_at: "" });
  const [discountFormError, setDiscountFormError] = useState("");

  // Admin (marketer) accounts
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [marketerMonthly, setMarketerMonthly] = useState<AdminAccount[]>([]);

  // UTM modal state
  const [utmInfluencer, setUtmInfluencer] = useState<Influencer | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [utmPlatform, setUtmPlatform] = useState("instagram");

  // Payment detail modal state
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetail[]>([]);
  const [paymentInfluencer, setPaymentInfluencer] = useState<Influencer | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Settlement state
  const [settlement, setSettlement] = useState<SettlementRow[]>([]);
  const [settlementYear, setSettlementYear] = useState(new Date().getFullYear());
  const [settlementMonth, setSettlementMonth] = useState(new Date().getMonth() + 1);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementStatuses, setSettlementStatuses] = useState<Map<string, SettlementStatus>>(new Map());
  const [settlementView, setSettlementView] = useState<"all" | "done">("all");
  const [marketerSettlementStatuses, setMarketerSettlementStatuses] = useState<Map<string, MarketerSettlementStatus>>(new Map());
  const [settlementRecords, setSettlementRecords] = useState<SettlementRecord[]>([]);
  const [settlementRecordsLoading, setSettlementRecordsLoading] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState<{ type: "influencer" | "marketer"; id: string; name: string } | null>(null);
  const [recordFormData, setRecordFormData] = useState({ amount: "", memo: "", settled_at: new Date().toISOString().slice(0, 10) });

  // All payments state
  const [allPayments, setAllPayments] = useState<AllPayment[]>([]);
  const [allPaymentsLoading, setAllPaymentsLoading] = useState(false);
  const [paymentServiceFilter, setPaymentServiceFilter] = useState("");
  const [paymentYear, setPaymentYear] = useState(new Date().getFullYear());
  const [paymentMonth, setPaymentMonth] = useState(new Date().getMonth() + 1);

  // ─── 인증 ────────────────────────────────────

  const handleLogin = async () => {
    setAuthError("");
    try {
      const res = await fetch("/api/superadmin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem("superadmin_auth", "true");
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
      setInfluencers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("인플루언서 목록 조회 오류:", err);
    } finally {
      setInfLoading(false);
    }
  }, []);

  const fetchAdminAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/superadmin/marketers");
      const data = await res.json();
      setAdminAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("마케터 목록 조회 오류:", err);
    }
  }, []);

  const fetchMarketerMonthly = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/superadmin/marketers?year=${settlementYear}&month=${settlementMonth}`
      );
      const data = await res.json();
      setMarketerMonthly(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("마케터 월별 조회 오류:", err);
    }
  }, [settlementYear, settlementMonth]);

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

  const handleSaveTotalSettled = async (id: string, amount: number) => {
    try {
      await fetch("/api/admin/influencers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, total_settled: amount }),
      });
      setInfluencers((prev) =>
        prev.map((inf) => (inf.id === id ? { ...inf, total_settled: amount } : inf))
      );
    } catch (err) {
      console.error("정산 완료 금액 저장 오류:", err);
    }
  };

  const handleSaveMarketerTotalPaid = async (id: string, amount: number) => {
    try {
      await fetch("/api/superadmin/marketers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, total_paid: amount }),
      });
      setAdminAccounts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, total_paid: amount } : a))
      );
    } catch (err) {
      console.error("마케터 정산 완료 금액 저장 오류:", err);
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
      password: inf.password || "",
    });
    setInfFormError("");
  };

  const fetchDiscounts = useCallback(async (influencerId: string) => {
    setDiscountLoading(true);
    try {
      const res = await fetch(`/api/admin/influencer-discounts?influencer_id=${influencerId}`);
      const data = await res.json();
      setDiscountList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("할인 목록 조회 오류:", err);
    } finally {
      setDiscountLoading(false);
    }
  }, []);

  const openDiscountModal = (inf: Influencer) => {
    setDiscountInfluencer(inf);
    setDiscountForm({ service_type: "face", discount_code: "", discount_start_at: "", discount_end_at: "" });
    setDiscountFormError("");
    fetchDiscounts(inf.id);
  };

  const handleSaveDiscount = async () => {
    if (!discountInfluencer || !discountForm.discount_code.trim()) {
      setDiscountFormError("쿠폰 코드는 필수입니다.");
      return;
    }
    setDiscountFormError("");
    try {
      const res = await fetch("/api/admin/influencer-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencer_id: discountInfluencer.id,
          service_type: discountForm.service_type,
          discount_code: discountForm.discount_code.trim(),
          discount_start_at: discountForm.discount_start_at ? `${discountForm.discount_start_at}:00+09:00` : null,
          discount_end_at: discountForm.discount_end_at ? `${discountForm.discount_end_at}:00+09:00` : null,
        }),
      });
      const data = await res.json();
      if (data.error) { setDiscountFormError(data.error); return; }
      setDiscountForm({ service_type: "face", discount_code: "", discount_start_at: "", discount_end_at: "" });
      fetchDiscounts(discountInfluencer.id);
    } catch { setDiscountFormError("저장 실패"); }
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!discountInfluencer) return;
    try {
      await fetch(`/api/admin/influencer-discounts?id=${discountId}`, { method: "DELETE" });
      fetchDiscounts(discountInfluencer.id);
    } catch (err) { console.error("할인 삭제 오류:", err); }
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

  // ─── 결제 내역 조회 ──────────────────────────────

  const handleShowPayments = async (inf: Influencer) => {
    setPaymentInfluencer(inf);
    setPaymentLoading(true);
    try {
      const res = await fetch(`/api/admin/influencers?payments=${inf.id}`);
      const data = await res.json();
      setPaymentDetails(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("결제 내역 조회 오류:", err);
      setPaymentDetails([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ─── 결제 내역 엑셀 다운로드 ──────────────────────────────

  const handleExportPayments = () => {
    if (!paymentInfluencer || paymentDetails.length === 0) return;

    const rsRate = paymentInfluencer.rs_percentage / 100;

    const rows = paymentDetails.map((p) => ({
      날짜: new Date(p.paid_at).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
      서비스: SERVICE_LABELS[p.service_type] || p.service_type,
      이름: p.user_name,
      금액: p.price,
      정산금액: p.is_refunded ? 0 : Math.round(p.price * rsRate),
      환불여부: p.is_refunded ? "환불" : "",
    }));

    // 서비스별 요약 (환불 제외)
    const active = paymentDetails.filter((p) => !p.is_refunded);
    const summaryMap: Record<string, { count: number; revenue: number }> = {};
    for (const p of active) {
      const label = SERVICE_LABELS[p.service_type] || p.service_type;
      if (!summaryMap[label]) summaryMap[label] = { count: 0, revenue: 0 };
      summaryMap[label].count += 1;
      summaryMap[label].revenue += p.price;
    }

    const summaryHeader = [["서비스", "건수", "매출", "정산금액"]];
    const summaryRows = Object.entries(summaryMap).map(([label, s]) => [
      label,
      s.count,
      s.revenue,
      Math.round(s.revenue * rsRate),
    ]);
    const summaryTotal = [
      "합계",
      active.length,
      active.reduce((s, p) => s + p.price, 0),
      Math.round(active.reduce((s, p) => s + p.price, 0) * rsRate),
    ];

    const ws = XLSX.utils.json_to_sheet(rows);

    XLSX.utils.sheet_add_aoa(ws, summaryHeader, { origin: "H1" });
    XLSX.utils.sheet_add_aoa(ws, summaryRows, { origin: "H2" });
    XLSX.utils.sheet_add_aoa(ws, [summaryTotal], { origin: `H${2 + summaryRows.length}` });

    ws["!cols"] = [
      { wch: 22 }, // 날짜
      { wch: 12 }, // 서비스
      { wch: 10 }, // 이름
      { wch: 10 }, // 금액
      { wch: 12 }, // 정산금액
      { wch: 8 },  // 환불여부
      { wch: 2 },  // G (빈 구분)
      { wch: 12 }, // 서비스
      { wch: 8 },  // 건수
      { wch: 12 }, // 매출
      { wch: 12 }, // 정산금액
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "결제내역");
    XLSX.writeFile(wb, `${paymentInfluencer.name}_결제내역.xlsx`);
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
      const [settleRes, statusRes] = await Promise.all([
        fetch(`/api/admin/settlement?year=${settlementYear}&month=${settlementMonth}`),
        fetch(`/api/admin/settlements?year=${settlementYear}&month=${settlementMonth}`),
      ]);
      const settleData = await settleRes.json();
      const statusData = await statusRes.json();
      setSettlement(Array.isArray(settleData) ? settleData : []);
      const map = new Map<string, SettlementStatus>();
      if (Array.isArray(statusData)) {
        for (const s of statusData) map.set(s.influencer_id, s);
      }
      setSettlementStatuses(map);
    } catch (err) {
      console.error("정산 데이터 조회 오류:", err);
    } finally {
      setSettlementLoading(false);
    }
  }, [settlementYear, settlementMonth]);

  const handleSaveSettlementAmount = async (influencerId: string, amount: number) => {
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencer_id: influencerId,
          year: settlementYear,
          month: settlementMonth,
          amount,
        }),
      });
      const data = await res.json();
      if (data.influencer_id) {
        setSettlementStatuses((prev) => {
          const next = new Map(prev);
          next.set(influencerId, data);
          return next;
        });
      }
    } catch (err) {
      console.error("정산 금액 저장 오류:", err);
    }
  };

  const handleTogglePaid = async (influencerId: string, currentlyPaid: boolean) => {
    try {
      const res = await fetch("/api/admin/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          influencer_id: influencerId,
          year: settlementYear,
          month: settlementMonth,
          is_paid: !currentlyPaid,
        }),
      });
      const data = await res.json();
      if (data.influencer_id) {
        setSettlementStatuses((prev) => {
          const next = new Map(prev);
          next.set(influencerId, data);
          return next;
        });
      }
    } catch (err) {
      console.error("정산 상태 변경 오류:", err);
    }
  };

  // ─── 마케터 정산 상태 ──────────────────────────────

  const fetchMarketerSettlements = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/marketer-settlements?year=${settlementYear}&month=${settlementMonth}`
      );
      const data = await res.json();
      const map = new Map<string, MarketerSettlementStatus>();
      if (Array.isArray(data)) {
        for (const s of data) map.set(s.marketer_id, s);
      }
      setMarketerSettlementStatuses(map);
    } catch (err) {
      console.error("마케터 정산 상태 조회 오류:", err);
    }
  }, [settlementYear, settlementMonth]);

  const handleSaveMarketerSettlementAmount = async (marketerId: string, amount: number) => {
    try {
      const res = await fetch("/api/admin/marketer-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketer_id: marketerId,
          year: settlementYear,
          month: settlementMonth,
          amount,
        }),
      });
      const data = await res.json();
      if (data.marketer_id) {
        setMarketerSettlementStatuses((prev) => {
          const next = new Map(prev);
          next.set(marketerId, data);
          return next;
        });
      }
    } catch (err) {
      console.error("마케터 정산 금액 저장 오류:", err);
    }
  };

  const handleToggleMarketerPaid = async (marketerId: string, currentlyPaid: boolean) => {
    try {
      const res = await fetch("/api/admin/marketer-settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketer_id: marketerId,
          year: settlementYear,
          month: settlementMonth,
          is_paid: !currentlyPaid,
        }),
      });
      const data = await res.json();
      if (data.marketer_id) {
        setMarketerSettlementStatuses((prev) => {
          const next = new Map(prev);
          next.set(marketerId, data);
          return next;
        });
      }
    } catch (err) {
      console.error("마케터 정산 상태 변경 오류:", err);
    }
  };

  // ─── 정산 기록 (Records) ──────────────────────────────

  const fetchSettlementRecords = useCallback(async () => {
    setSettlementRecordsLoading(true);
    try {
      const res = await fetch("/api/admin/settlement-records");
      const data = await res.json();
      setSettlementRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("정산 기록 조회 오류:", err);
    } finally {
      setSettlementRecordsLoading(false);
    }
  }, []);

  const handleAddSettlementRecord = async () => {
    if (!showRecordForm) return;
    const amount = Number(recordFormData.amount);
    if (!amount) return;

    try {
      const res = await fetch("/api/admin/settlement-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: showRecordForm.type,
          target_id: showRecordForm.id,
          amount,
          memo: recordFormData.memo || null,
          settled_at: recordFormData.settled_at ? new Date(recordFormData.settled_at).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSettlementRecords((prev) => [data, ...prev]);
        setShowRecordForm(null);
        setRecordFormData({ amount: "", memo: "", settled_at: new Date().toISOString().slice(0, 10) });
      }
    } catch (err) {
      console.error("정산 기록 추가 오류:", err);
    }
  };

  const handleDeleteSettlementRecord = async (id: string) => {
    if (!confirm("이 정산 기록을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/admin/settlement-records?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSettlementRecords((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("정산 기록 삭제 오류:", err);
    }
  };

  const [editRecord, setEditRecord] = useState<SettlementRecord | null>(null);
  const [editRecordData, setEditRecordData] = useState({ amount: "", memo: "", settled_at: "" });

  const openEditRecord = (rec: SettlementRecord) => {
    setEditRecord(rec);
    setEditRecordData({
      amount: String(rec.amount),
      memo: rec.memo || "",
      settled_at: new Date(rec.settled_at).toISOString().slice(0, 10),
    });
  };

  const handleUpdateSettlementRecord = async () => {
    if (!editRecord) return;
    const amount = Number(editRecordData.amount);
    if (!amount) return;

    try {
      const res = await fetch("/api/admin/settlement-records", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editRecord.id,
          amount,
          memo: editRecordData.memo || null,
          settled_at: editRecordData.settled_at ? new Date(editRecordData.settled_at).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (data.id) {
        setSettlementRecords((prev) => prev.map((r) => (r.id === data.id ? data : r)));
        setEditRecord(null);
      }
    } catch (err) {
      console.error("정산 기록 수정 오류:", err);
    }
  };

  // ─── 전체 결제 내역 ──────────────────────────────

  const fetchAllPayments = useCallback(async () => {
    setAllPaymentsLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/payments?year=${paymentYear}&month=${paymentMonth}`
      );
      const data = await res.json();
      setAllPayments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("전체 결제 내역 조회 오류:", err);
    } finally {
      setAllPaymentsLoading(false);
    }
  }, [paymentYear, paymentMonth]);

  const goPaymentMonth = (delta: number) => {
    let newMonth = paymentMonth + delta;
    let newYear = paymentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setPaymentYear(newYear);
    setPaymentMonth(newMonth);
  };

  const getResultUrl = (serviceType: string, id: string) => {
    const path = SERVICE_RESULT_PATHS[serviceType];
    if (!path) return null;
    return `${BASE_URL}${path}?id=${id}`;
  };

  const handleRefund = async (payment: AllPayment) => {
    if (!confirm(`이 결제 건을 환불 처리하시겠습니까?\n서비스: ${SERVICE_LABELS[payment.service_type] || payment.service_type}\n금액: ${payment.price.toLocaleString()}원`)) return;

    try {
      const res = await fetch("/api/superadmin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payment.id, table: payment.table }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllPayments();
      } else {
        alert("환불 처리 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("환불 처리 중 오류가 발생했습니다.");
    }
  };

  const handleCancelRefund = async (payment: AllPayment) => {
    if (!confirm(`환불을 취소하시겠습니까?\n서비스: ${SERVICE_LABELS[payment.service_type] || payment.service_type}\n금액: ${payment.price.toLocaleString()}원`)) return;

    try {
      const res = await fetch("/api/superadmin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payment.id, table: payment.table, action: "cancel_refund" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAllPayments();
      } else {
        alert("환불 취소 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("환불 취소 중 오류가 발생했습니다.");
    }
  };

  const filteredPayments = paymentServiceFilter
    ? allPayments.filter((p) => p.service_type === paymentServiceFilter)
    : allPayments;

  // ─── Effects ──────────────────────────────

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoupons();
      fetchInfluencers();
      fetchAdminAccounts();
    }
  }, [isAuthenticated, fetchCoupons, fetchInfluencers, fetchAdminAccounts]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "usage") {
      fetchUsageLogs();
    }
  }, [isAuthenticated, activeTab, fetchUsageLogs]);

  useEffect(() => {
    if (isAuthenticated && (activeTab === "influencers" || activeTab === "settlement")) {
      fetchSettlement();
    }
  }, [isAuthenticated, activeTab, fetchSettlement]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "settlement") {
      fetchMarketerMonthly();
      fetchMarketerSettlements();
    }
  }, [isAuthenticated, activeTab, fetchMarketerMonthly, fetchMarketerSettlements]);

  useEffect(() => {
    if (isAuthenticated && (activeTab === "settlement" || activeTab === "influencers")) {
      fetchSettlementRecords();
    }
  }, [isAuthenticated, activeTab, fetchSettlementRecords]);

  useEffect(() => {
    if (isAuthenticated && activeTab === "payments") {
      fetchAllPayments();
    }
  }, [isAuthenticated, activeTab, fetchAllPayments]);

  // Supabase Realtime subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('superadmin-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'saju_analyses' }, () => {
        fetchInfluencers();
        fetchSettlement();
        fetchAllPayments();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'face_analyses' }, () => {
        fetchInfluencers();
        fetchSettlement();
        fetchAllPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, fetchInfluencers, fetchSettlement, fetchAllPayments]);

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
            <h1 className={styles.login_title}>Super Admin</h1>
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
          <h1 className={styles.title}>Super Admin 대시보드</h1>
          <button
            className={styles.logout_button}
            onClick={() => {
              setIsAuthenticated(false);
              setPassword("");
              sessionStorage.removeItem("superadmin_auth");
            }}
          >
            로그아웃
          </button>
        </div>

        {/* 탭 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "payments" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("payments")}
          >
            결제 내역
          </button>
          <button
            className={`${styles.tab} ${activeTab === "settlement" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("settlement")}
          >
            정산
          </button>
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
          <button
            className={`${styles.tab} ${activeTab === "marketers" ? styles.tab_active : ""}`}
            onClick={() => setActiveTab("marketers")}
          >
            마케터
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
                    <label className={styles.form_label}>비밀번호</label>
                    <input
                      className={styles.form_input}
                      type="password"
                      placeholder="인플루언서 로그인용 비밀번호"
                      value={infFormData.password}
                      onChange={(e) =>
                        setInfFormData({ ...infFormData, password: e.target.value })
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
                      <th>담당</th>
                      <th>슬러그</th>
                      <th>할인</th>
                      <th className={styles.text_right}>RS%</th>
                      <th className={styles.text_right}>방문수</th>
                      <th className={styles.text_right}>결제(전환율)</th>
                      <th className={styles.text_right}>매출</th>
                      <th className={styles.text_right}>정산액</th>
                      <th className={styles.text_right}>기 정산</th>
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
                        <td style={{ fontSize: "0.85em", color: "#888" }}>
                          {inf.admin_id ? adminAccounts.find(a => a.id === inf.admin_id)?.name || "-" : "-"}
                        </td>
                        <td className={styles.code_cell}>{inf.slug}</td>
                        <td>
                          <button
                            className={styles.btn_icon}
                            onClick={() => openDiscountModal(inf)}
                            title="할인 설정"
                          >
                            <Ticket size={14} />
                          </button>
                        </td>
                        <td className={styles.text_right}>{rs}%</td>
                        <td className={styles.text_right}>{(inf.total_visits || 0).toLocaleString()}</td>
                        <td className={styles.text_right}>
                          {(inf.total_payments || 0) > 0 ? (
                            <span
                              className={styles.clickable_num}
                              onClick={() => handleShowPayments(inf)}
                            >
                              {(inf.total_payments || 0).toLocaleString()}
                            </span>
                          ) : (
                            "0"
                          )}
                          {" "}
                          <span style={{ color: "#888", fontSize: "0.85em" }}>
                            ({(inf.total_visits || 0) > 0
                              ? ((inf.total_payments || 0) / (inf.total_visits || 1) * 100).toFixed(1)
                              : "0.0"}%)
                          </span>
                        </td>
                        <td className={styles.text_right}>{revenue.toLocaleString()}원</td>
                        <td className={styles.text_right}>{settlementAmt.toLocaleString()}원</td>
                        <td className={styles.text_right} style={{ color: "#27ae60" }}>
                          {settlementRecords
                            .filter((r) => r.target_type === "influencer" && r.target_id === inf.id)
                            .reduce((s, r) => s + r.amount, 0)
                            .toLocaleString()}원
                        </td>
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
          </>
        )}

        {/* ── 정산 탭 ──────────────── */}
        {activeTab === "settlement" && (
          <>
            {/* 서브 탭: 전체 / 월 단위 */}
            <div className={styles.settlement_section}>
              <div className={styles.settlement_header}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    className={`${styles.sub_tab} ${settlementView === "all" ? styles.sub_tab_active : ""}`}
                    onClick={() => setSettlementView("all")}
                  >
                    전체
                  </button>
                  <button
                    className={`${styles.sub_tab} ${settlementView === "done" ? styles.sub_tab_active : ""}`}
                    onClick={() => setSettlementView("done")}
                  >
                    완료
                  </button>
                </div>
              </div>
            </div>


            {/* 정산 기록 추가 폼 모달 */}
            {showRecordForm && (
              <div className={styles.modal_overlay} onClick={() => setShowRecordForm(null)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <h3 className={styles.modal_title}>
                    {showRecordForm.name} 정산 추가
                  </h3>
                  <div className={styles.form_grid}>
                    <div className={styles.form_field}>
                      <label className={styles.form_label}>정산 금액</label>
                      <input
                        type="number"
                        className={styles.form_input}
                        placeholder="금액 입력"
                        value={recordFormData.amount}
                        onChange={(e) => setRecordFormData({ ...recordFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className={styles.form_field}>
                      <label className={styles.form_label}>정산 날짜</label>
                      <input
                        type="date"
                        className={styles.form_input}
                        value={recordFormData.settled_at}
                        onChange={(e) => setRecordFormData({ ...recordFormData, settled_at: e.target.value })}
                      />
                    </div>
                    <div className={styles.form_field_full}>
                      <label className={styles.form_label}>메모 (선택)</label>
                      <input
                        className={styles.form_input}
                        placeholder="메모"
                        value={recordFormData.memo}
                        onChange={(e) => setRecordFormData({ ...recordFormData, memo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={styles.form_actions}>
                    <button className={styles.form_cancel} onClick={() => setShowRecordForm(null)}>
                      취소
                    </button>
                    <button className={styles.form_submit} onClick={handleAddSettlementRecord}>
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 정산 기록 수정 모달 */}
            {editRecord && (
              <div className={styles.modal_overlay} onClick={() => setEditRecord(null)}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <h3 className={styles.modal_title}>정산 기록 수정</h3>
                  <div className={styles.form_grid}>
                    <div className={styles.form_field}>
                      <label className={styles.form_label}>정산 금액</label>
                      <input
                        type="number"
                        className={styles.form_input}
                        value={editRecordData.amount}
                        onChange={(e) => setEditRecordData({ ...editRecordData, amount: e.target.value })}
                      />
                    </div>
                    <div className={styles.form_field}>
                      <label className={styles.form_label}>정산 날짜</label>
                      <input
                        type="date"
                        className={styles.form_input}
                        value={editRecordData.settled_at}
                        onChange={(e) => setEditRecordData({ ...editRecordData, settled_at: e.target.value })}
                      />
                    </div>
                    <div className={styles.form_field_full}>
                      <label className={styles.form_label}>메모 (선택)</label>
                      <input
                        className={styles.form_input}
                        placeholder="메모"
                        value={editRecordData.memo}
                        onChange={(e) => setEditRecordData({ ...editRecordData, memo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className={styles.form_actions}>
                    <button className={styles.form_cancel} onClick={() => setEditRecord(null)}>
                      취소
                    </button>
                    <button className={styles.form_submit} onClick={handleUpdateSettlementRecord}>
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── 전체 뷰 ── */}
            {settlementView === "all" && (
              <>
                {(settlementRecordsLoading || infLoading) ? (
                  <div className={styles.loading}>불러오는 중...</div>
                ) : (
                  <>
                    {/* 인플루언서 전체 정산 */}
                    <div className={styles.settlement_section}>
                      <h3 className={styles.settlement_title}>인플루언서 전체 정산</h3>
                      {(() => {
                        const infRows = influencers
                          .map((inf) => {
                            const revenue = inf.total_revenue || 0;
                            const settlementAmt = Math.round(revenue * inf.rs_percentage / 100);
                            const records = settlementRecords.filter(
                              (r) => r.target_type === "influencer" && r.target_id === inf.id
                            );
                            const paid = records.reduce((s, r) => s + r.amount, 0);
                            const remaining = settlementAmt - paid;
                            return { inf, revenue, settlementAmt, records, paid, remaining };
                          })
                          .filter((row) => row.settlementAmt > 0 && row.remaining > 0);

                        if (infRows.length === 0) {
                          return <div className={styles.empty}>남은 정산이 없습니다.</div>;
                        }
                        return (
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>인플루언서</th>
                                  <th className={styles.text_right}>총 매출</th>
                                  <th className={styles.text_right}>RS%</th>
                                  <th className={styles.text_right}>총 정산액</th>
                                  <th className={styles.text_right}>정산 완료</th>
                                  <th className={styles.text_right}>남은 금액</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {infRows.map(({ inf, revenue, settlementAmt, records, paid, remaining }) => (
                                  <React.Fragment key={inf.id}>
                                    <tr>
                                      <td>{inf.name}</td>
                                      <td className={styles.text_right}>{revenue.toLocaleString()}원</td>
                                      <td className={styles.text_right}>{inf.rs_percentage}%</td>
                                      <td className={styles.text_right}>{settlementAmt.toLocaleString()}원</td>
                                      <td className={styles.text_right} style={{ color: "#27ae60", fontWeight: 600 }}>
                                        {paid.toLocaleString()}원
                                      </td>
                                      <td className={styles.text_right} style={{ color: "#e74c3c", fontWeight: 600 }}>
                                        {remaining.toLocaleString()}원
                                      </td>
                                      <td className={styles.text_right}>
                                        <button
                                          className={styles.btn_edit}
                                          onClick={() => {
                                            setShowRecordForm({ type: "influencer", id: inf.id, name: inf.name });
                                            setRecordFormData({ amount: "", memo: "", settled_at: new Date().toISOString().slice(0, 10) });
                                          }}
                                        >
                                          + 정산
                                        </button>
                                      </td>
                                    </tr>
                                    {records.length > 0 && records.map((rec) => (
                                      <tr key={rec.id} style={{ background: "#faf8f4" }}>
                                        <td style={{ paddingInlineStart: 24, fontSize: 12, color: "#888" }}>
                                          {new Date(rec.settled_at).toLocaleDateString("ko-KR")}
                                        </td>
                                        <td colSpan={3} style={{ fontSize: 12, color: "#888" }}>
                                          {rec.memo || ""}
                                        </td>
                                        <td className={styles.text_right} style={{ fontSize: 12 }}>
                                          {rec.amount.toLocaleString()}원
                                        </td>
                                        <td></td>
                                        <td className={styles.text_right}>
                                          <button
                                            className={styles.btn_edit}
                                            style={{ fontSize: 11, padding: "2px 6px" }}
                                            onClick={() => openEditRecord(rec)}
                                          >
                                            수정
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className={styles.table_foot}>
                                  <td>합계</td>
                                  <td className={styles.text_right}>
                                    {infRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}원
                                  </td>
                                  <td></td>
                                  <td className={styles.text_right}>
                                    {infRows.reduce((s, r) => s + r.settlementAmt, 0).toLocaleString()}원
                                  </td>
                                  <td className={styles.text_right} style={{ color: "#27ae60", fontWeight: 600 }}>
                                    {infRows.reduce((s, r) => s + r.paid, 0).toLocaleString()}원
                                  </td>
                                  <td className={styles.text_right} style={{ color: "#e74c3c", fontWeight: 600 }}>
                                    {infRows.reduce((s, r) => s + r.remaining, 0).toLocaleString()}원
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })()}
                    </div>

                    {/* 마케터 전체 정산 */}
                    <div className={styles.settlement_section}>
                      <h3 className={styles.settlement_title}>마케터 전체 정산</h3>
                      {(() => {
                        const mktRows = adminAccounts
                          .map((admin) => {
                            const revenue = admin.filtered_revenue || 0;
                            const settlementAmt = Math.round(revenue * admin.rs_percentage / 100);
                            const records = settlementRecords.filter(
                              (r) => r.target_type === "marketer" && r.target_id === admin.id
                            );
                            const paid = records.reduce((s, r) => s + r.amount, 0);
                            const remaining = settlementAmt - paid;
                            return { admin, revenue, settlementAmt, records, paid, remaining };
                          })
                          .filter((row) => row.settlementAmt > 0 && row.remaining > 0);

                        if (mktRows.length === 0) {
                          return <div className={styles.empty}>남은 정산이 없습니다.</div>;
                        }
                        return (
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>마케터</th>
                                  <th className={styles.text_right}>총 매출</th>
                                  <th className={styles.text_right}>RS%</th>
                                  <th className={styles.text_right}>총 정산액</th>
                                  <th className={styles.text_right}>정산 완료</th>
                                  <th className={styles.text_right}>남은 금액</th>
                                  <th></th>
                                </tr>
                              </thead>
                              <tbody>
                                {mktRows.map(({ admin, revenue, settlementAmt, records, paid, remaining }) => (
                                  <React.Fragment key={admin.id}>
                                    <tr>
                                      <td>{admin.name}</td>
                                      <td className={styles.text_right}>{revenue.toLocaleString()}원</td>
                                      <td className={styles.text_right}>{admin.rs_percentage}%</td>
                                      <td className={styles.text_right} style={{ color: "#c4965a", fontWeight: 700 }}>
                                        {settlementAmt.toLocaleString()}원
                                      </td>
                                      <td className={styles.text_right} style={{ color: "#27ae60", fontWeight: 600 }}>
                                        {paid.toLocaleString()}원
                                      </td>
                                      <td className={styles.text_right} style={{ color: "#e74c3c", fontWeight: 600 }}>
                                        {remaining.toLocaleString()}원
                                      </td>
                                      <td className={styles.text_right}>
                                        <button
                                          className={styles.btn_edit}
                                          onClick={() => {
                                            setShowRecordForm({ type: "marketer", id: admin.id, name: admin.name });
                                            setRecordFormData({ amount: "", memo: "", settled_at: new Date().toISOString().slice(0, 10) });
                                          }}
                                        >
                                          + 정산
                                        </button>
                                      </td>
                                    </tr>
                                    {records.length > 0 && records.map((rec) => (
                                      <tr key={rec.id} style={{ background: "#faf8f4" }}>
                                        <td style={{ paddingInlineStart: 24, fontSize: 12, color: "#888" }}>
                                          {new Date(rec.settled_at).toLocaleDateString("ko-KR")}
                                        </td>
                                        <td colSpan={3} style={{ fontSize: 12, color: "#888" }}>
                                          {rec.memo || ""}
                                        </td>
                                        <td className={styles.text_right} style={{ fontSize: 12 }}>
                                          {rec.amount.toLocaleString()}원
                                        </td>
                                        <td></td>
                                        <td className={styles.text_right}>
                                          <button
                                            className={styles.btn_edit}
                                            style={{ fontSize: 11, padding: "2px 6px" }}
                                            onClick={() => openEditRecord(rec)}
                                          >
                                            수정
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className={styles.table_foot}>
                                  <td>합계</td>
                                  <td className={styles.text_right}>
                                    {mktRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}원
                                  </td>
                                  <td></td>
                                  <td className={styles.text_right} style={{ color: "#c4965a", fontWeight: 700 }}>
                                    {mktRows.reduce((s, r) => s + r.settlementAmt, 0).toLocaleString()}원
                                  </td>
                                  <td className={styles.text_right} style={{ color: "#27ae60", fontWeight: 600 }}>
                                    {mktRows.reduce((s, r) => s + r.paid, 0).toLocaleString()}원
                                  </td>
                                  <td className={styles.text_right} style={{ color: "#e74c3c", fontWeight: 600 }}>
                                    {mktRows.reduce((s, r) => s + r.remaining, 0).toLocaleString()}원
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── 완료 뷰 ── */}
            {settlementView === "done" && (
              <>
                {(settlementRecordsLoading || infLoading) ? (
                  <div className={styles.loading}>불러오는 중...</div>
                ) : settlementRecords.length === 0 ? (
                  <div className={styles.empty}>정산 기록이 없습니다.</div>
                ) : (
                  <div className={styles.settlement_section}>
                    {(() => {
                      // 인플루언서 + 마케터 통합 그룹핑
                      const grouped = new Map<string, { name: string; type: string; records: SettlementRecord[]; total: number }>();
                      for (const rec of settlementRecords) {
                        const key = `${rec.target_type}-${rec.target_id}`;
                        let name = rec.target_id;
                        if (rec.target_type === "influencer") {
                          name = influencers.find((i) => i.id === rec.target_id)?.name || rec.target_id;
                        } else {
                          name = adminAccounts.find((a) => a.id === rec.target_id)?.name || rec.target_id;
                        }
                        const existing = grouped.get(key) || { name, type: rec.target_type === "influencer" ? "인플루언서" : "마케터", records: [], total: 0 };
                        existing.records.push(rec);
                        existing.total += rec.amount;
                        grouped.set(key, existing);
                      }

                      return Array.from(grouped.entries()).map(([key, { name, type, records, total }]) => (
                        <div key={key} className={styles.done_group}>
                          <div className={styles.done_header}>
                            <span className={styles.done_name}>
                              {name}
                              <span className={styles.done_type}>{type}</span>
                            </span>
                            <span className={styles.done_total}>{total.toLocaleString()}원</span>
                          </div>
                          <div className={styles.done_list}>
                            {records
                              .sort((a, b) => new Date(b.settled_at).getTime() - new Date(a.settled_at).getTime())
                              .map((rec) => (
                                <div key={rec.id} className={styles.done_row}>
                                  <span className={styles.done_date}>
                                    {new Date(rec.settled_at).toLocaleDateString("ko-KR")}
                                  </span>
                                  <span className={styles.done_memo}>{rec.memo || ""}</span>
                                  <span className={styles.done_amount}>{rec.amount.toLocaleString()}원</span>
                                  <span className={styles.done_actions}>
                                    <button
                                      className={styles.done_btn}
                                      onClick={() => openEditRecord(rec)}
                                    >
                                      수정
                                    </button>
                                    <button
                                      className={styles.done_btn}
                                      onClick={() => handleDeleteSettlementRecord(rec.id)}
                                    >
                                      삭제
                                    </button>
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </>
            )}
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
                    {SERVICE_PRICES[formData.service_type] && (
                      <span className={styles.price_hint}>
                        원가: {SERVICE_PRICES[formData.service_type].toLocaleString()}원
                      </span>
                    )}
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
                      <th>담당</th>
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
                        <td style={{ fontSize: "0.85em", color: "#888" }}>
                          {coupon.admin_id ? adminAccounts.find(a => a.id === coupon.admin_id)?.name || "-" : "-"}
                        </td>
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

        {/* ── 결제 내역 탭 ──────────────── */}
        {activeTab === "payments" && (
          <>
            <div className={styles.filter_bar} style={{ justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={styles.filter_label}>서비스:</span>
                <select
                  className={styles.filter_select}
                  value={paymentServiceFilter}
                  onChange={(e) => setPaymentServiceFilter(e.target.value)}
                >
                  <option value="">전체</option>
                  {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className={styles.filter_label} style={{ marginLeft: 4 }}>
                  {filteredPayments.filter(p => !p.is_refunded).length}건 / {filteredPayments.filter(p => !p.is_refunded).reduce((s, p) => s + p.price, 0).toLocaleString()}원
                </span>
              </div>
              <div className={styles.month_selector}>
                <button
                  className={styles.month_arrow}
                  onClick={() => goPaymentMonth(-1)}
                >
                  &larr;
                </button>
                <span className={styles.month_display}>
                  {paymentYear}년 {paymentMonth}월
                </span>
                <button
                  className={styles.month_arrow}
                  onClick={() => goPaymentMonth(1)}
                >
                  &rarr;
                </button>
              </div>
            </div>

            {allPaymentsLoading ? (
              <div className={styles.loading}>불러오는 중...</div>
            ) : filteredPayments.length === 0 ? (
              <div className={styles.empty}>결제 내역이 없습니다.</div>
            ) : (
              <div className={styles.table_wrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th style={{ minWidth: 100 }}>서비스</th>
                      <th style={{ minWidth: 80 }}>이름</th>
                      <th>인플루언서</th>
                      <th>쿠폰</th>
                      <th className={styles.text_right}>금액</th>
                      <th>결과</th>
                      <th>고민</th>
                      <th>리뷰</th>
                      <th style={{ minWidth: 80 }}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => {
                      const resultUrl = getResultUrl(p.service_type, p.id);
                      return (
                        <tr key={p.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {(() => {
                              const d = new Date(p.paid_at);
                              const date = d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
                              const time = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
                              return <>{date}<br />{time}</>;
                            })()}
                          </td>
                          <td>{SERVICE_LABELS[p.service_type] || p.service_type}</td>
                          <td>{p.user_name}</td>
                          <td>{p.influencer || "-"}</td>
                          <td>{p.coupon_code ? (
                            <span className={`${styles.badge} ${styles.badge_free}`}>{p.coupon_code}</span>
                          ) : "-"}</td>
                          <td className={styles.text_right}>
                            {p.is_refunded ? (
                              <span style={{ textDecoration: "line-through", color: "#999" }}>{p.price.toLocaleString()}원</span>
                            ) : (
                              <>{p.price.toLocaleString()}원</>
                            )}
                          </td>
                          <td>
                            {resultUrl ? (
                              <a
                                href={resultUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.btn_icon}
                                title="결과 페이지 보기"
                              >
                                <ExternalLink size={14} />
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            {p.wish ? (
                              <div className={styles.wish_cell}>
                                <span className={styles.wish_badge}>있음</span>
                                <div className={styles.wish_tooltip}>{p.wish}</div>
                              </div>
                            ) : "-"}
                          </td>
                          <td>
                            {p.has_review ? (
                              <div className={styles.review_cell}>
                                <span className={styles.review_badge}>
                                  <Star size={12} fill="#c4965a" stroke="#c4965a" />
                                  {p.review_rating}
                                </span>
                                {p.review_content && <span className={styles.review_has_text}>리뷰</span>}
                                {p.review_content && <div className={styles.review_tooltip}>{p.review_content}</div>}
                              </div>
                            ) : (
                              <span className={styles.review_none}>-</span>
                            )}
                          </td>
                          <td>
                            {p.is_refunded ? (
                              <button
                                className={styles.btn_cancel_refund}
                                onClick={() => handleCancelRefund(p)}
                              >
                                환불 취소
                              </button>
                            ) : (
                              <button
                                className={styles.btn_refund}
                                onClick={() => handleRefund(p)}
                              >
                                환불
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.table_foot}>
                      <td colSpan={5}>합계 ({filteredPayments.filter(p => !p.is_refunded).length}건{filteredPayments.filter(p => p.is_refunded).length > 0 ? ` / 환불 ${filteredPayments.filter(p => p.is_refunded).length}건` : ""})</td>
                      <td className={styles.text_right}>
                        {filteredPayments.filter(p => !p.is_refunded).reduce((s, p) => s + p.price, 0).toLocaleString()}원
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
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

        {/* ── 마케터 탭 ──────────────── */}
        {activeTab === "marketers" && (
          <>
            {adminAccounts.length === 0 ? (
              <div className={styles.empty}>등록된 마케터가 없습니다.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {adminAccounts.map((admin) => {
                  const adminInfluencers = influencers.filter(
                    (inf) => inf.admin_id === admin.id
                  );
                  const adminCoupons = coupons.filter(
                    (c) => c.admin_id === admin.id
                  );
                  const totalRevenue = adminInfluencers.reduce(
                    (sum, inf) => sum + (inf.total_revenue || 0), 0
                  );
                  const filteredRevenue = admin.filtered_revenue || 0;
                  const rsRevenue = admin.rs_start_date ? filteredRevenue : totalRevenue;
                  const settlementAmount = Math.round(rsRevenue * admin.rs_percentage / 100);
                  return (
                    <div key={admin.id} className={styles.form_container}>
                      <h3 className={styles.form_title}>{admin.name}</h3>

                      <div style={{
                        display: "flex", gap: 24, marginBottom: 16, padding: "12px 16px",
                        background: "#f8f8f8", borderRadius: 8, flexWrap: "wrap",
                      }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>전체 매출</span>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{totalRevenue.toLocaleString()}원</span>
                        </div>
                        {admin.rs_start_date && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>
                            {new Date(admin.rs_start_date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} 이후 매출
                          </span>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{filteredRevenue.toLocaleString()}원</span>
                        </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>RS 비율</span>
                          <span style={{ fontSize: 16, fontWeight: 700 }}>{admin.rs_percentage}%</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>정산 금액</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: "#c4965a" }}>{settlementAmount.toLocaleString()}원</span>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#666" }}>
                          인플루언서 ({adminInfluencers.length})
                        </h4>
                        {adminInfluencers.length === 0 ? (
                          <div style={{ fontSize: 13, color: "#999" }}>없음</div>
                        ) : (
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>이름</th>
                                  <th>슬러그</th>
                                  <th className={styles.text_right}>RS%</th>
                                  <th className={styles.text_right}>방문</th>
                                  <th className={styles.text_right}>결제</th>
                                  <th className={styles.text_right}>매출</th>
                                  <th>상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {adminInfluencers.map((inf) => (
                                  <tr key={inf.id}>
                                    <td>{inf.name}</td>
                                    <td className={styles.code_cell}>{inf.slug}</td>
                                    <td className={styles.text_right}>{inf.rs_percentage}%</td>
                                    <td className={styles.text_right}>{(inf.total_visits || 0).toLocaleString()}</td>
                                    <td className={styles.text_right}>{(inf.total_payments || 0).toLocaleString()}</td>
                                    <td className={styles.text_right}>{(inf.total_revenue || 0).toLocaleString()}원</td>
                                    <td>
                                      <span className={`${styles.badge} ${inf.is_active ? styles.badge_active : styles.badge_inactive}`}>
                                        {inf.is_active ? "활성" : "비활성"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#666" }}>
                          쿠폰 ({adminCoupons.length})
                        </h4>
                        {adminCoupons.length === 0 ? (
                          <div style={{ fontSize: 13, color: "#999" }}>없음</div>
                        ) : (
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>코드</th>
                                  <th>이름</th>
                                  <th>서비스</th>
                                  <th>유형</th>
                                  <th>수량</th>
                                  <th>상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {adminCoupons.map((c) => (
                                  <tr key={c.id}>
                                    <td className={styles.code_cell}>{c.code}</td>
                                    <td>{c.name}</td>
                                    <td>{SERVICE_LABELS[c.service_type] || c.service_type}</td>
                                    <td>
                                      <span className={`${styles.badge} ${c.discount_type === "free" ? styles.badge_free : styles.badge_fixed}`}>
                                        {DISCOUNT_LABELS[c.discount_type] || c.discount_type}
                                      </span>
                                    </td>
                                    <td className={styles.quantity_cell}>{c.remaining_quantity} / {c.total_quantity}</td>
                                    <td>
                                      <span className={`${styles.badge} ${c.is_active ? styles.badge_active : styles.badge_inactive}`}>
                                        {c.is_active ? "활성" : "비활성"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 미배정 인플루언서/쿠폰 */}
                {(() => {
                  const unassignedInf = influencers.filter((inf) => !inf.admin_id);
                  const unassignedCoupons = coupons.filter((c) => !c.admin_id);
                  if (unassignedInf.length === 0 && unassignedCoupons.length === 0) return null;
                  return (
                    <div className={styles.form_container} style={{ borderLeft: "3px solid #999" }}>
                      <h3 className={styles.form_title} style={{ color: "#999" }}>미배정</h3>

                      {unassignedInf.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#666" }}>
                            인플루언서 ({unassignedInf.length})
                          </h4>
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>이름</th>
                                  <th>슬러그</th>
                                  <th className={styles.text_right}>RS%</th>
                                  <th className={styles.text_right}>방문</th>
                                  <th className={styles.text_right}>결제</th>
                                  <th className={styles.text_right}>매출</th>
                                  <th>상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unassignedInf.map((inf) => (
                                  <tr key={inf.id}>
                                    <td>{inf.name}</td>
                                    <td className={styles.code_cell}>{inf.slug}</td>
                                    <td className={styles.text_right}>{inf.rs_percentage}%</td>
                                    <td className={styles.text_right}>{(inf.total_visits || 0).toLocaleString()}</td>
                                    <td className={styles.text_right}>{(inf.total_payments || 0).toLocaleString()}</td>
                                    <td className={styles.text_right}>{(inf.total_revenue || 0).toLocaleString()}원</td>
                                    <td>
                                      <span className={`${styles.badge} ${inf.is_active ? styles.badge_active : styles.badge_inactive}`}>
                                        {inf.is_active ? "활성" : "비활성"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {unassignedCoupons.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#666" }}>
                            쿠폰 ({unassignedCoupons.length})
                          </h4>
                          <div className={styles.table_wrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th>코드</th>
                                  <th>이름</th>
                                  <th>서비스</th>
                                  <th>유형</th>
                                  <th>수량</th>
                                  <th>상태</th>
                                </tr>
                              </thead>
                              <tbody>
                                {unassignedCoupons.map((c) => (
                                  <tr key={c.id}>
                                    <td className={styles.code_cell}>{c.code}</td>
                                    <td>{c.name}</td>
                                    <td>{SERVICE_LABELS[c.service_type] || c.service_type}</td>
                                    <td>
                                      <span className={`${styles.badge} ${c.discount_type === "free" ? styles.badge_free : styles.badge_fixed}`}>
                                        {DISCOUNT_LABELS[c.discount_type] || c.discount_type}
                                      </span>
                                    </td>
                                    <td className={styles.quantity_cell}>{c.remaining_quantity} / {c.total_quantity}</td>
                                    <td>
                                      <span className={`${styles.badge} ${c.is_active ? styles.badge_active : styles.badge_inactive}`}>
                                        {c.is_active ? "활성" : "비활성"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  <label className={styles.form_label}>비밀번호</label>
                  <input
                    className={styles.form_input}
                    type="text"
                    placeholder="비밀번호 (비워두면 유지)"
                    value={(editInfData.password as string) || ""}
                    onChange={(e) =>
                      setEditInfData({ ...editInfData, password: e.target.value })
                    }
                  />
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

        {/* ── 할인 설정 모달 ──────────────── */}
        {discountInfluencer && (
          <div className={styles.modal_overlay} onClick={(e) => { if (e.target === e.currentTarget) setDiscountInfluencer(null); }}>
            <div className={styles.modal_wide}>
              <h3 className={styles.modal_title}>{discountInfluencer.name} - 서비스별 할인 설정</h3>
              {discountLoading ? (
                <div className={styles.loading}>불러오는 중...</div>
              ) : discountList.length === 0 ? (
                <div className={styles.empty} style={{ margin: "12px 0" }}>설정된 할인이 없습니다.</div>
              ) : (
                <div className={styles.table_wrap} style={{ marginBottom: 16 }}>
                  <table className={styles.table}>
                    <thead><tr><th>서비스</th><th>쿠폰 코드</th><th>시작일</th><th>종료일</th><th>삭제</th></tr></thead>
                    <tbody>
                      {discountList.map((d) => (
                        <tr key={d.id}>
                          <td>{SERVICE_LABELS[d.service_type] || d.service_type}</td>
                          <td className={styles.code_cell}>{d.discount_code}</td>
                          <td style={{ fontSize: "0.85em" }}>{d.discount_start_at ? new Date(d.discount_start_at).toLocaleString("ko-KR") : "-"}</td>
                          <td style={{ fontSize: "0.85em" }}>{d.discount_end_at ? new Date(d.discount_end_at).toLocaleString("ko-KR") : "-"}</td>
                          <td><button className={styles.btn_icon} onClick={() => handleDeleteDiscount(d.id)} title="삭제"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className={styles.form_grid}>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>서비스</label>
                  <select className={styles.form_select} value={discountForm.service_type} onChange={(e) => setDiscountForm({ ...discountForm, service_type: e.target.value })}>
                    <option value="face">관상</option>
                    <option value="couple">커플궁합</option>
                    <option value="saju_love">연애사주</option>
                    <option value="new_year">신년사주</option>
                  </select>
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>쿠폰 선택</label>
                  <select className={styles.form_select} value={discountForm.discount_code} onChange={(e) => setDiscountForm({ ...discountForm, discount_code: e.target.value })}>
                    <option value="">쿠폰을 선택하세요</option>
                    {coupons
                      .filter((c) => c.is_active && (c.service_type === "all" || c.service_type === discountForm.service_type))
                      .map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code} - {c.name} ({c.discount_type === "free" ? "무료" : `${c.discount_amount.toLocaleString()}원 할인`})
                        </option>
                      ))}
                  </select>
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>시작일</label>
                  <input className={styles.form_input} type="datetime-local" value={discountForm.discount_start_at} onChange={(e) => setDiscountForm({ ...discountForm, discount_start_at: e.target.value })} />
                </div>
                <div className={styles.form_field}>
                  <label className={styles.form_label}>종료일</label>
                  <input className={styles.form_input} type="datetime-local" value={discountForm.discount_end_at} onChange={(e) => setDiscountForm({ ...discountForm, discount_end_at: e.target.value })} />
                </div>
              </div>
              {discountFormError && <p className={styles.error_msg}>{discountFormError}</p>}
              <div className={styles.form_actions}>
                <button className={styles.form_cancel} onClick={() => setDiscountInfluencer(null)}>닫기</button>
                <button className={styles.form_submit} onClick={handleSaveDiscount}>추가 / 수정</button>
              </div>
            </div>
          </div>
        )}

        {/* ── 결제 내역 모달 ──────────────── */}
        {paymentInfluencer && (
          <div
            className={styles.modal_overlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setPaymentInfluencer(null);
              }
            }}
          >
            <div className={styles.modal}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 className={styles.modal_title} style={{ margin: 0 }}>{paymentInfluencer.name} 결제 내역</h3>
                {paymentDetails.length > 0 && (
                  <button
                    className={styles.form_submit}
                    onClick={handleExportPayments}
                    style={{ padding: "6px 14px", fontSize: 13 }}
                  >
                    엑셀 다운로드
                  </button>
                )}
              </div>
              {paymentLoading ? (
                <div className={styles.loading}>불러오는 중...</div>
              ) : paymentDetails.length === 0 ? (
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
                      {paymentDetails.map((p) => (
                        <tr key={p.id}>
                          <td>
                            {new Date(p.paid_at).toLocaleString("ko-KR", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: false,
                            })}
                          </td>
                          <td>{SERVICE_LABELS[p.service_type] || p.service_type}</td>
                          <td>{p.user_name}</td>
                          <td className={styles.text_right}>{p.price.toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className={styles.table_foot}>
                        <td colSpan={3}>합계 ({paymentDetails.length}건)</td>
                        <td className={styles.text_right}>{paymentDetails.reduce((s, p) => s + p.price, 0).toLocaleString()}원</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <div className={styles.form_actions}>
                <button
                  className={styles.form_cancel}
                  onClick={() => setPaymentInfluencer(null)}
                >
                  닫기
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
