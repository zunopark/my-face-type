let db;

// 1. IndexedDB 초기화
async function initDB() {
  const request = indexedDB.open("FaceAnalysisDB", 1);

  request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("results")) {
      const store = db.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    console.log("✅ IndexedDB 초기화 완료");
  };

  request.onerror = function (event) {
    console.error("❌ IndexedDB 오류", event);
  };
}

initDB();

// 2. 저장
async function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["results"], "readwrite");
    const store = transaction.objectStore("results");
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

// 3. 전체 불러오기
async function getAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["results"], "readonly");
    const store = transaction.objectStore("results");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// 4. 결제 완료 처리
async function markPaid(id) {
  const transaction = db.transaction(["results"], "readwrite");
  const store = transaction.objectStore("results");
  const getReq = store.get(id);

  getReq.onsuccess = () => {
    const data = getReq.result;
    if (data) {
      data.paid = true;
      data.purchasedAt = new Date().toISOString();
      if (data.normalized) data.normalized.paid = true;
      store.put(data);
      renderResult(data);
    }
  };
}

const qs = new URLSearchParams(location.search);
const pageId = (qs.get("id") || "").trim(); // 사진·결과 ID
const pageType = (qs.get("type") || "base").trim(); // base | wealth …

// 5. 분석 및 저장 실행 (type: "base" 전용)
async function analyzeFaceImage(file, imageBase64, forceId = null) {
  renderLoading();

  const formData = new FormData();
  formData.append("file", file);
  const resultContainer = document.getElementById("label-container");

  try {
    const response = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) throw new Error("서버 응답 오류");
    const data = await response.json();

    const { summary, detail, features } = data;
    if (!summary || !detail) throw new Error("summary/detail 없음");

    const normalized = { isMulti: false, summary, detail };

    const result = {
      id: forceId ?? crypto.randomUUID(),
      imageBase64,
      features,
      summary,
      detail,
      type: "base",
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
      analyzed: true, // ← 새 필드
      normalized, // ← 새 필드
    };

    mixpanel.track("GEMINI 관상 결과", {
      timestamp: new Date().toISOString(),
    });

    await saveToIndexedDB(result);

    finishLoading();
    setTimeout(() => {
      renderResultNormalized(
        { ...normalized, paid: result.paid, id: result.id },
        pageType
      );
    }, 300);

    renderResult(result);
  } catch (error) {
    console.error("❌ 관상 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
    console.error("❌ 관상 분석 실패:", error);
    showError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
}

// 6. Base64 변환
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 7. 분석 결과 렌더링
function renderResult(data) {
  // safety guard
  if (!data.normalized) {
    console.error("normalized 데이터가 없습니다:", data);
    return;
  }
  // normalized 내부에도 paid·id 가 필요하면 복사
  const norm = {
    ...data.normalized,
    paid: data.paid ?? false,
    id: data.id ?? "",
  };
  renderResultNormalized(norm, data.type || "base");
}

/* ─────────── Loading UI (progress bar + 문구) ─────────── */
let fakeProgress = 0,
  progressInterval = null,
  messageInterval = null;

const loadingMessages = [
  "얼굴을 분석하는 중입니다...",
  "전통 관상 데이터를 불러오는 중...",
  "당신의 운세를 조심스레 살펴보는 중...",
  "관상학 고서를 인공지능이 참조하는 중...",
  "보고서 문장을 정리하는 중입니다...",
  "조금만 기다려 주세요, 마무리 중입니다...",
];

function renderLoading() {
  document.getElementById("label-container").innerHTML = `
    <div class="loading-box dark-mode">
      <div id="loading-message" class="loading-text">보고서를 생성 중입니다...</div>
      <div class="progress-bar-container">
        <div id="progress-bar" class="progress-bar-fill" style="width:0%"></div>
      </div>
    </div>`;
  const bar = document.getElementById("progress-bar");
  const msg = document.getElementById("loading-message");

  fakeProgress = 0;
  clearInterval(progressInterval);
  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 2.6;
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 300);

  let idx = 0;
  clearInterval(messageInterval);
  messageInterval = setInterval(() => {
    idx = (idx + 1) % loadingMessages.length;
    msg.textContent = loadingMessages[idx];
  }, 3000);
  mixpanel.track("기본 분석 보고서 시작", { id: pageId, type: pageType }); // ← 추가
}

function finishLoading() {
  clearInterval(progressInterval);
  clearInterval(messageInterval);
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = "100%";
  mixpanel.track("기본 분석 보고서 완료", { id: pageId, type: pageType }); // ← 추가
}

function showError(msg) {
  clearInterval(progressInterval);
  clearInterval(messageInterval);
  document.getElementById(
    "label-container"
  ).innerHTML = `<div style="color:red; padding:24px; white-space:pre-line;">${msg}</div>`;
  mixpanel.track("기본 분석 보고서 오류", { id: pageId, error: msg }); // ← 추가
}

// 8. 결제 유도 트리거
function trackAndStartPayment(resultId) {
  mixpanel.track("기분 관상 분석 보고서 결제 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
  });
  startTossPayment(resultId);
}

// 9. 이미지 업로드 처리
function readURL(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = async function (e) {
      const imageBase64 = e.target.result;
      document.getElementById("face-image").src = imageBase64;
      document.querySelector(".file-upload-content").style.display = "block";
      document.querySelector(".image-upload-wrap").style.display = "none";

      mixpanel.track("관상 사진 업로드", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });

      await analyzeFaceImage(input.files[0], imageBase64);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 10. 결제 처리
function goToPurchase(id) {
  markPaid(id);
}

async function startTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("paymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods(
      "#payment-method",
      { value: 2900 }
    );
    paymentWidget.renderAgreement("#agreement");

    document.getElementById("payment-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 상세 분석 서비스",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(
            resultId
          )}&type=${encodeURIComponent(pageType)}`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            resultId
          )}&type=${encodeURIComponent(pageType)}`,
        });
        mixpanel.track("기본 분석 보고서 결제 요청 시도", {
          id: resultId,
          price: 2900,
        }); // ← 추가
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closePayment() {
  document.getElementById("paymentOverlay").style.display = "none";
  document.getElementById("payment-method").innerHTML = "";
  document.getElementById("agreement").innerHTML = "";

  mixpanel.track("기본 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });

  setTimeout(() => {
    startDiscountedPayment(); // ↓ 아래에서 정의
  }, 1000); // 자연스러운 전환을 위해 약간의 지연
}

async function startDiscountedPayment() {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("discountOverlay").style.display = "block";

  mixpanel.track("할인 결제창 열림", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });

  try {
    const widget = PaymentWidget(clientKey, customerKey);
    widget.renderPaymentMethods("#discount-method", { value: 1900 });
    widget.renderAgreement("#discount-agreement");

    document.getElementById("discount-button").onclick = async () => {
      try {
        await widget.requestPayment({
          orderId: `discount_${Date.now()}`,
          orderName: "AI 관상 보고서 - 할인 특가",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(
            pageId
          )}&type=${encodeURIComponent(pageType)}`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            pageId
          )}&type=${encodeURIComponent(pageType)}`,
        });

        mixpanel.track("할인 결제 시도", {
          id: pageId,
          price: 1900,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        alert("❌ 할인 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 할인 결제 위젯 로드 실패: " + e.message);
  }
}

function closeDiscount() {
  document.getElementById("discountOverlay").style.display = "none";
  document.getElementById("discount-method").innerHTML = "";
  document.getElementById("discount-agreement").innerHTML = "";
  mixpanel.track("할인 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });
}

// IndexedDB 준비될 때까지 기다리는 Promise
function waitForDB() {
  return new Promise((resolve) => {
    if (db) return resolve();
    const timer = setInterval(() => {
      if (db) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
  });
}

function renderResultNormalized(obj, reportType = "base") {
  const wrap = document.getElementById("label-container");

  /* ── 멀티 섹션(wealth·marriage·job·love) ── */
  if (obj.isMulti) {
    const titles = titleMap[reportType] || [];
    const html = obj.details
      .map((sec, i) => {
        const h = titles[i] ? `📙 ${titles[i]}` : `📙 제${i + 1}장`;
        return `<h2 style="margin-top:24px">${h}</h2>\n${marked.parse(sec)}`;
      })
      .join("<hr/>");
    wrap.innerHTML = `<div class="result-detail">${html}</div>`;
    return;
  }

  /* ── 단일형(base) = 당신이 넣고 싶은 마스킹 UI ── */
  const paidFlag =
    obj.paid !== undefined ? obj.paid : window.currentPaid ?? false;
  const resultId = obj.id ?? ""; // 결제 버튼에서 사용

  wrap.innerHTML = `
    <div class="face-summary-section">
      <div class="face-summary">${marked.parse(obj.summary)}</div>
    </div>
    <div class="face-full-section-wrapper">
      <div class="face-full-report">${marked.parse(obj.detail)}</div>
      ${
        paidFlag
          ? ""
          : `
      <div class="result-mask">
        <div class="blur-overlay"></div>
        <div class="mask-text-wrap">
          <div class="mask-text">
            <div class="mask-text-top">관상학 기반 심층 분석</div>
            <div class="mask-text-sub">
              얼굴형, 이마, 눈 등 부위별 세부 관상 분석 + 운명과 인생 경로 + 대인 관계와 인연 + 관상학적 인생 종합 결론<br/><br/>
            </div>
            <div class="mask-text-btn-wrap">
              <div class="mask-text-btn" onclick="trackAndStartPayment('${resultId}')">
                전체 분석 결과 확인하기
              </div>
            </div>
            <div class="mask-text-btn-sub">관상가 양반 - 프리미엄 AI 관상</div>
          </div>
        </div>
      </div>`
      }
    </div>
  `;
}

function renderImage(base64) {
  document.getElementById("face-image").src = base64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

// base64 → File
async function dataURLtoFile(dataURL, filename = "face.jpg") {
  const res = await fetch(dataURL);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

async function autoAnalyzeFromUrl(delayMs = 200) {
  await waitForDB(); // ① DB 준비 대기

  /* ② URL 파라미터 추출 */
  const params = new URLSearchParams(location.search);
  const id = (params.get("id") || "").trim();
  if (!id) return; // id 없으면 종료

  /* ③ IndexedDB 조회 */
  const tx = db.transaction(["results"], "readonly");
  const getR = tx.objectStore("results").get(id);

  getR.onsuccess = async () => {
    const saved = getR.result;

    /* (a) 레코드 자체가 없으면 그냥 리턴하거나,  */
    /*     서버 재요청 등을 시도하게끔 분기             */
    if (!saved) {
      console.warn("❗ IndexedDB에 해당 id 없음:", id);
      return;
    }

    /* (b) 이미지가 있으면 즉시 UI에 표시 */
    if (saved.imageBase64) renderImage(saved.imageBase64);

    /* (c) 이미 분석 + 정규화 되어 있으면 바로 렌더 후 종료 */
    if (saved.analyzed && saved.normalized) {
      const norm = {
        // paid·id를 주입
        ...saved.normalized,
        paid: saved.paid ?? false,
        id: saved.id,
      };
      renderResultNormalized(norm, saved.type || "base");
      return; // 🛑 여기서 끝
    }

    /* (d) 아직 분석 전이라면 일정 시간 뒤 재분석 진행 */
    setTimeout(async () => {
      const file = await dataURLtoFile(saved.imageBase64, `${id}.jpg`);
      analyzeFaceImage(file, saved.imageBase64, id); // 기존 함수 재사용
    }, delayMs);
  };

  getR.onerror = (e) => {
    console.error("❌ IndexedDB get 실패:", e);
  };
}

// 페이지 진입 시 바로 실행
document.addEventListener("DOMContentLoaded", () => {
  mixpanel.track("기본 관상 결과 페이지 진입", { ts: Date.now() }); // ← 추가
  autoAnalyzeFromUrl(500); // 1.5초 후 자동 업로드
});
