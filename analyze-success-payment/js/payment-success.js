/* ───────── 0. 공통 유틸 ───────── */
const PRODUCT_NAMES = {
  base: "기본 관상 리포트",
  marriage: "결혼 리포트",
  wealth: "재물 리포트",
  job: "직업 리포트",
  love: "연애 리포트",
};
const qs = new URLSearchParams(location.search);
const id = decodeURIComponent((qs.get("id") || "").trim());
const type = (qs.get("type") || "").trim(); // base / marriage / …

document.getElementById("result-id").textContent = id || "(없음)";
document.getElementById("result-type").textContent = type || "(없음)";

/* ───────── 1. Mixpanel 초기화 ───────── */
let distinctId =
  localStorage.getItem("mixpanel_distinct_id") || crypto.randomUUID();
localStorage.setItem("mixpanel_distinct_id", distinctId);

mixpanel.init("d7d8d6afc10a92f911ea59901164605b", {
  autotrack: true,
  persistence: "localStorage",
});
mixpanel.identify(distinctId);
mixpanel.track("결제 콜백 페이지 진입", { id, type });

/* ───────── 2. Toss 결제 컨펌 후 + DB 업데이트 ───────── */
async function confirmTossPayment() {
  const paymentKey = qs.get("paymentKey");
  const orderId = qs.get("orderId");
  const amountStr = qs.get("amount");
  const amountNum = Number(amountStr);

  if (!paymentKey || !orderId || !amountStr) {
    alert("결제 정보가 누락되었습니다. 다시 시도해 주세요.");
    return redirectHome(3000);
  }

  try {
    const res = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/payment/confirm",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentKey, orderId, amount: amountNum }),
      }
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error("서버 응답 오류: " + msg);
    }

    await res.json(); // Toss 응답

    // ✅ DB 업데이트
    await updateFaceAnalysisDB(id, type);

    mixpanel.track("리포트 결제 성공", {
      id,
      type,
      product_key: type,
      product_name: PRODUCT_NAMES[type] || "기타 리포트",
      amount: amountNum,
      orderId,
      purchasedAt: new Date().toISOString(),
    });

    setTimeout(() => redirectResult(), 2000);
  } catch (err) {
    console.error(err);
    mixpanel.track("리포트 결제 실패", {
      id,
      type,
      product_key: type,
      product_name: PRODUCT_NAMES[type] || "기타 리포트",
      error: err.message,
      attemptedAt: new Date().toISOString(),
    });
    alert("결제 확인 실패\n" + err.message);
    redirectHome(3000);
  }
}

/* ───────── 3. IndexedDB 업데이트 함수 ───────── */
async function updateFaceAnalysisDB(id, type) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FaceAnalysisDB", 1);

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["results"], "readwrite");
      const store = tx.objectStore("results");
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const data = getReq.result;
        if (!data) {
          console.warn("❌ ID에 해당하는 데이터가 없습니다.");
          reject("데이터 없음");
          return;
        }

        data.paid = true;
        data.purchasedAt = new Date().toISOString();
        data.type = type;

        const putReq = store.put(data);
        putReq.onsuccess = () => {
          console.log("✅ DB 업데이트 완료");
          resolve();
        };
        putReq.onerror = (e) => reject(e);
      };

      getReq.onerror = (e) => reject(e);
    };

    request.onerror = (e) => reject(e);
  });
}

/* ───────── 4. 리다이렉트 헬퍼 ───────── */
function redirectResult() {
  location.href = id
    ? `/analyze-result/?id=${encodeURIComponent(id)}&type=${type}`
    : "/";
}

function redirectHome(delay = 0) {
  setTimeout(() => (location.href = "/"), delay);
}

/* ───────── 5. 실행 ───────── */
document.addEventListener("DOMContentLoaded", confirmTossPayment);
