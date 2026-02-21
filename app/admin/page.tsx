"use client";

import { useState, useEffect, useCallback } from "react";
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
  expires_at: string | null;
  created_at: string;
}

const SERVICE_LABELS: Record<string, string> = {
  all: "전체",
  face: "관상",
  couple: "커플궁합",
  saju_love: "연애사주",
  new_year: "신년사주",
};

const DISCOUNT_TYPE_LABELS: Record<string, string> = {
  free: "무료",
  fixed: "정액할인",
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  // 생성 폼 상태
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    service_type: "all",
    discount_type: "free",
    discount_amount: 0,
    total_quantity: 100,
    expires_at: "",
  });
  const [createError, setCreateError] = useState("");

  // 수정 모달 상태
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [editFormData, setEditFormData] = useState({
    code: "",
    name: "",
    service_type: "all",
    discount_type: "free",
    discount_amount: 0,
    total_quantity: 100,
    remaining_quantity: 100,
    expires_at: "",
  });

  // 비밀번호 인증
  const handleLogin = () => {
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    if (password === adminPassword) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("비밀번호가 올바르지 않습니다");
    }
  };

  // 쿠폰 목록 조회
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch (error) {
      console.error("쿠폰 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoupons();
    }
  }, [isAuthenticated, fetchCoupons]);

  // 쿠폰 생성
  const handleCreate = async () => {
    setCreateError("");

    if (!formData.code.trim() || !formData.name.trim()) {
      setCreateError("쿠폰 코드와 이름을 입력해주세요");
      return;
    }

    if (formData.discount_type === "fixed" && formData.discount_amount <= 0) {
      setCreateError("할인 금액을 입력해주세요");
      return;
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expires_at: formData.expires_at || null,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setCreateError(data.error || "쿠폰 생성 실패");
        return;
      }

      // 폼 초기화
      setFormData({
        code: "",
        name: "",
        service_type: "all",
        discount_type: "free",
        discount_amount: 0,
        total_quantity: 100,
        expires_at: "",
      });
      setShowCreateForm(false);
      fetchCoupons();
    } catch (error) {
      console.error("쿠폰 생성 오류:", error);
      setCreateError("서버 오류가 발생했습니다");
    }
  };

  // 쿠폰 활성/비활성 토글
  const handleToggle = async (coupon: Coupon) => {
    try {
      await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: coupon.id,
          action: "toggle",
          is_active: !coupon.is_active,
        }),
      });
      fetchCoupons();
    } catch (error) {
      console.error("토글 오류:", error);
    }
  };

  // 쿠폰 삭제
  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
      fetchCoupons();
    } catch (error) {
      console.error("삭제 오류:", error);
    }
  };

  // 수정 모달 열기
  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setEditFormData({
      code: coupon.code,
      name: coupon.name,
      service_type: coupon.service_type,
      discount_type: coupon.discount_type,
      discount_amount: coupon.discount_amount,
      total_quantity: coupon.total_quantity,
      remaining_quantity: coupon.remaining_quantity,
      expires_at: coupon.expires_at
        ? new Date(coupon.expires_at).toISOString().slice(0, 16)
        : "",
    });
  };

  // 수정 저장
  const handleEditSave = async () => {
    if (!editingCoupon) return;

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCoupon.id,
          code: editFormData.code,
          name: editFormData.name,
          service_type: editFormData.service_type,
          discount_type: editFormData.discount_type,
          discount_amount: editFormData.discount_amount,
          total_quantity: editFormData.total_quantity,
          remaining_quantity: editFormData.remaining_quantity,
          expires_at: editFormData.expires_at || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingCoupon(null);
        fetchCoupons();
      }
    } catch (error) {
      console.error("수정 오류:", error);
    }
  };

  // 비밀번호 입력 화면
  if (!isAuthenticated) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1 className={styles.loginTitle}>관리자 대시보드</h1>
          <p className={styles.loginSubtitle}>비밀번호를 입력하세요</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            placeholder="비밀번호"
            className={styles.loginInput}
            autoFocus
          />
          {authError && <p className={styles.errorText}>{authError}</p>}
          <button onClick={handleLogin} className={styles.loginButton}>
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>쿠폰 관리</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={styles.createButton}
        >
          {showCreateForm ? "취소" : "+ 새 쿠폰"}
        </button>
      </div>

      {/* 쿠폰 생성 폼 */}
      {showCreateForm && (
        <div className={styles.createForm}>
          <h2 className={styles.formTitle}>새 쿠폰 생성</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>쿠폰 코드</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder="예: SPRING2026"
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label>관리용 이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="예: 2월 프로모션 무료쿠폰"
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label>적용 서비스</label>
              <select
                value={formData.service_type}
                onChange={(e) =>
                  setFormData({ ...formData, service_type: e.target.value })
                }
                className={styles.select}
              >
                <option value="all">전체</option>
                <option value="face">관상</option>
                <option value="couple">커플궁합</option>
                <option value="saju_love">연애사주</option>
                <option value="new_year">신년사주</option>
              </select>
            </div>
            <div className={styles.formField}>
              <label>할인 유형</label>
              <select
                value={formData.discount_type}
                onChange={(e) =>
                  setFormData({ ...formData, discount_type: e.target.value })
                }
                className={styles.select}
              >
                <option value="free">무료</option>
                <option value="fixed">정액할인</option>
              </select>
            </div>
            {formData.discount_type === "fixed" && (
              <div className={styles.formField}>
                <label>할인 금액 (원)</label>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discount_amount: Number(e.target.value),
                    })
                  }
                  placeholder="10000"
                  className={styles.input}
                />
              </div>
            )}
            <div className={styles.formField}>
              <label>발행 수량</label>
              <input
                type="number"
                value={formData.total_quantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    total_quantity: Number(e.target.value),
                  })
                }
                className={styles.input}
              />
            </div>
            <div className={styles.formField}>
              <label>만료일 (선택)</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) =>
                  setFormData({ ...formData, expires_at: e.target.value })
                }
                className={styles.input}
              />
            </div>
          </div>
          {createError && <p className={styles.errorText}>{createError}</p>}
          <button onClick={handleCreate} className={styles.submitButton}>
            쿠폰 생성
          </button>
        </div>
      )}

      {/* 쿠폰 목록 */}
      {loading ? (
        <p className={styles.loadingText}>로딩 중...</p>
      ) : coupons.length === 0 ? (
        <p className={styles.emptyText}>등록된 쿠폰이 없습니다</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>코드</th>
                <th>이름</th>
                <th>서비스</th>
                <th>유형</th>
                <th>할인금액</th>
                <th>잔여/총수량</th>
                <th>상태</th>
                <th>만료일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className={!coupon.is_active ? styles.inactive : ""}>
                  <td className={styles.codeCell}>{coupon.code}</td>
                  <td>{coupon.name}</td>
                  <td>{SERVICE_LABELS[coupon.service_type] || coupon.service_type}</td>
                  <td>{DISCOUNT_TYPE_LABELS[coupon.discount_type] || coupon.discount_type}</td>
                  <td>
                    {coupon.discount_type === "free"
                      ? "-"
                      : `${coupon.discount_amount.toLocaleString()}원`}
                  </td>
                  <td>
                    <span
                      className={
                        coupon.remaining_quantity === 0
                          ? styles.quantityDepleted
                          : coupon.remaining_quantity <= 5
                          ? styles.quantityLow
                          : ""
                      }
                    >
                      {coupon.remaining_quantity}
                    </span>
                    {" / "}
                    {coupon.total_quantity}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggle(coupon)}
                      className={`${styles.toggleButton} ${
                        coupon.is_active ? styles.active : styles.inactive
                      }`}
                    >
                      {coupon.is_active ? "활성" : "비활성"}
                    </button>
                  </td>
                  <td>
                    {coupon.expires_at
                      ? new Date(coupon.expires_at).toLocaleDateString("ko-KR")
                      : "무기한"}
                  </td>
                  <td className={styles.actionCell}>
                    <button
                      onClick={() => openEditModal(coupon)}
                      className={styles.editButton}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className={styles.deleteButton}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 수정 모달 */}
      {editingCoupon && (
        <div className={styles.modalOverlay} onClick={() => setEditingCoupon(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.formTitle}>쿠폰 수정</h2>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>쿠폰 코드</label>
                <input
                  type="text"
                  value={editFormData.code}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, code: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>관리용 이름</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>적용 서비스</label>
                <select
                  value={editFormData.service_type}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, service_type: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="all">전체</option>
                  <option value="face">관상</option>
                  <option value="couple">커플궁합</option>
                  <option value="saju_love">연애사주</option>
                  <option value="new_year">신년사주</option>
                </select>
              </div>
              <div className={styles.formField}>
                <label>할인 유형</label>
                <select
                  value={editFormData.discount_type}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, discount_type: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="free">무료</option>
                  <option value="fixed">정액할인</option>
                </select>
              </div>
              {editFormData.discount_type === "fixed" && (
                <div className={styles.formField}>
                  <label>할인 금액 (원)</label>
                  <input
                    type="number"
                    value={editFormData.discount_amount}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        discount_amount: Number(e.target.value),
                      })
                    }
                    className={styles.input}
                  />
                </div>
              )}
              <div className={styles.formField}>
                <label>총 수량</label>
                <input
                  type="number"
                  value={editFormData.total_quantity}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      total_quantity: Number(e.target.value),
                    })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>잔여 수량</label>
                <input
                  type="number"
                  value={editFormData.remaining_quantity}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      remaining_quantity: Number(e.target.value),
                    })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>만료일 (선택)</label>
                <input
                  type="datetime-local"
                  value={editFormData.expires_at}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, expires_at: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={() => setEditingCoupon(null)}
                className={styles.cancelButton}
              >
                취소
              </button>
              <button onClick={handleEditSave} className={styles.submitButton}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
