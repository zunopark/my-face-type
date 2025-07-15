let db;

/* ───────── 1. IndexedDB 초기화 ───────── */
async function initDB() {
  const req = indexedDB.open("FaceAnalysisDB", 1);

  req.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("results")) {
      const store = db.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp");
    }
  };
  req.onsuccess = (e) => {
    db = e.target.result;
    console.log("✅ DB ready");
  };
  req.onerror = (e) => console.error("❌ DB error", e);
}
initDB();

/* ───────── 2. 공통 유틸 ───────── */
const ALL_TYPES = ["base", "wealth", "love", "marriage", "career"];

/* 스켈레톤 생성 */
function makeSkeleton(normalized, paid = false) {
  const reports = {};
  for (const t of ALL_TYPES) {
    reports[t] = { paid: false, data: null };
  }
  reports.base = { paid, data: normalized }; // base 보고서만 즉시 채운다
  return reports;
}

/* DB put/get 래퍼 */
const saveToIndexedDB = (data) =>
  new Promise((res, rej) => {
    const tx = db.transaction(["results"], "readwrite");
    tx.objectStore("results").put(data).onsuccess = res;
    tx.onerror = (e) => rej(e);
  });

const getAllResults = () =>
  new Promise((res, rej) => {
    const tx = db.transaction(["results"], "readonly");
    const req = tx.objectStore("results").getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = (e) => rej(e);
  });

/* 결제 성공 → paid 토글 */
async function markPaid(id, reportType = "base") {
  const tx = db.transaction(["results"], "readwrite");
  const store = tx.objectStore("results");
  const r = store.get(id);
  r.onsuccess = () => {
    const rec = r.result;
    if (!rec) return;
    rec.reports[reportType].paid = true; // 핵심
    rec.reports[reportType].purchasedAt = new Date().toISOString();
    rec.paid = true; // 레거시 필드도 유지
    store.put(rec);
    renderResult(rec);
  };
}

/* ───────── 3. URL 파라미터 ───────── */
const qs = new URLSearchParams(location.search);
const pageId = (qs.get("id") || "").trim();
const pageType = (qs.get("type") || "base").trim(); // 기본은 base

/* ───────── 4. 얼굴 분석 + 저장 ───────── */
async function analyzeFaceImage(file, imageBase64, forceId = null) {
  renderLoading();

  const formData = new FormData();
  formData.append("file", file);

  try {
    const resp = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/",
      { method: "POST", body: formData }
    );
    if (!resp.ok) throw new Error("서버 응답 오류");
    const { summary, detail, features } = await resp.json();
    if (!summary || !detail) throw new Error("summary/detail 없음");

    /* (1) normalize */
    const normalized = { isMulti: false, summary, detail };

    /* (2) 스켈레톤 + 결과 객체 */
    const result = {
      id: forceId ?? crypto.randomUUID(),
      imageBase64,
      features,
      summary, // 레거시 필드
      detail, // 레거시 필드
      type: "base",
      paid: false, // 레거시
      purchasedAt: null,
      timestamp: new Date().toISOString(),
      reports: makeSkeleton(normalized, false), // ★ 스켈레톤 핵심
    };

    await saveToIndexedDB(result);

    finishLoading();
    setTimeout(() => {
      renderResult(result);
    }, 300);
  } catch (err) {
    console.error("❌ 분석 실패:", err);
    showError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
  }
}

/* ───────── 5. Base64 변환 유틸 ───────── */
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

/* ───────── 6. 결과 렌더러 ───────── */
function renderResult(data) {
  if (!data.reports || !data.reports.base.data) {
    console.error("normalized 없음:", data);
    return;
  }
  const norm = {
    ...data.reports.base.data,
    paid: data.reports.base.paid,
    id: data.id,
  };
  renderResultNormalized(norm, "base");
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

function trackAndStartPayment(resultId) {
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "기본",
  });
  startTossPayment(resultId);
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

function trackAndStartWealthPayment(resultId) {
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "재물",
  });
  startWealthTossPayment(resultId);
}

async function startWealthTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("wealthPaymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods(
      "#wealth-method",
      { value: 9900 }
    );
    paymentWidget.renderAgreement("#wealth-agreement");

    document.getElementById("wealth-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 재물운 상세 분석 보고서",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(resultId)}&type=wealth`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            resultId
          )}&type=wealth`,
        });
        mixpanel.track("재물운 분석 보고서 결제 요청 시도", {
          id: resultId,
          price: 9900,
        }); // ← 추가
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closeWealthPayment() {
  document.getElementById("wealthPaymentOverlay").style.display = "none";
  document.getElementById("wealth-method").innerHTML = "";
  document.getElementById("wealth-agreement").innerHTML = "";

  mixpanel.track("재물운 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });
}

function trackAndStartLovePayment(resultId) {
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "연애",
  });
  startLoveTossPayment(resultId);
}

async function startLoveTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("lovePaymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods(
      "#love-method",
      { value: 7900 }
    );
    paymentWidget.renderAgreement("#love-agreement");

    document.getElementById("love-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 연애운 상세 분석 보고서",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(resultId)}&type=love`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            resultId
          )}&type=love`,
        });
        mixpanel.track("연애운 분석 보고서 결제 요청 시도", {
          id: resultId,
          price: 7900,
        }); // ← 추가
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closeLovePayment() {
  document.getElementById("lovePaymentOverlay").style.display = "none";
  document.getElementById("love-method").innerHTML = "";
  document.getElementById("love-agreement").innerHTML = "";

  mixpanel.track("연애운 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });
}

function trackAndStartMarriagePayment(resultId) {
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "결혼",
  });
  startMarriageTossPayment(resultId);
}

async function startMarriageTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("marriagePaymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods(
      "#marriage-method",
      { value: 6900 }
    );
    paymentWidget.renderAgreement("#marriage-agreement");

    document.getElementById("marriage-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 결혼운 상세 분석 보고서",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(resultId)}&type=marriage`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            resultId
          )}&type=marriage`,
        });
        mixpanel.track("결혼운 분석 보고서 결제 요청 시도", {
          id: resultId,
          price: 6900,
        }); // ← 추가
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closeMarriagePayment() {
  document.getElementById("marriagePaymentOverlay").style.display = "none";
  document.getElementById("marriage-method").innerHTML = "";
  document.getElementById("marriage-agreement").innerHTML = "";

  mixpanel.track("결혼운 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });
}

function trackAndStartCareerPayment(resultId) {
  mixpanel.track("유료 관상 분석 보고서 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
    type: "직업",
  });
  startCareerTossPayment(resultId);
}

async function startCareerTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("careerPaymentOverlay").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods(
      "#career-method",
      { value: 6900 }
    );
    paymentWidget.renderAgreement("#career-agreement");

    document.getElementById("career-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 직업운 상세 분석 보고서",
          customerName: "고객",
          successUrl: `${
            window.location.origin
          }/success.html?id=${encodeURIComponent(resultId)}&type=career`,
          failUrl: `${window.location.origin}/fail.html?id=${encodeURIComponent(
            resultId
          )}&type=career`,
        });
        mixpanel.track("직업운 분석 보고서 결제 요청 시도", {
          id: resultId,
          price: 6900,
        }); // ← 추가
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closeCareerPayment() {
  document.getElementById("careerPaymentOverlay").style.display = "none";
  document.getElementById("career-method").innerHTML = "";
  document.getElementById("career-agreement").innerHTML = "";

  mixpanel.track("직업운 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });
}

// IndexedDB 준비될 때까지 기다리는 Promise
const waitForDB = () =>
  new Promise((r) => {
    if (db) return r();
    const t = setInterval(() => {
      if (db) {
        clearInterval(t);
        r();
      }
    }, 100);
  });

/* ───────── 11. URL로 자동 렌더 ───────── */
async function autoRenderFromDB() {
  await waitForDB();
  if (!pageId) return;

  const rec = await new Promise((res) => {
    const tx = db.transaction(["results"], "readonly");
    tx.objectStore("results").get(pageId).onsuccess = (e) =>
      res(e.target.result);
  });
  if (!rec) return;

  /* (1) 이미지 즉시 표시 */
  if (rec.imageBase64) renderImage(rec.imageBase64);

  /* (2) base 보고서가 이미 저장돼 있으면 바로 렌더 */
  if (rec.reports?.base?.data) {
    renderResult(rec);
    return;
  }

  /* (3) legacy summary/detail 만 있는 경우 → 스켈레톤 생성하여 저장 후 렌더 */
  if (rec.summary && rec.detail) {
    const normalized = {
      isMulti: false,
      summary: rec.summary,
      detail: rec.detail,
    };
    rec.reports = makeSkeleton(normalized, rec.paid ?? false);
    await saveToIndexedDB(rec);
    renderResult(rec);
    return;
  }

  /* (4) 아무것도 없다면 최초 분석 요청 */
  if (rec.imageBase64 && rec.features) {
    const file = await (await fetch(rec.imageBase64)).blob();
    analyzeFaceImage(
      new File([file], `${rec.id}.jpg`),
      rec.imageBase64,
      rec.id
    );
  }
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

  function simpleMD(src = "") {
    // 1) 코드블록 – 먼저 보존
    src = src.replace(
      /```([\s\S]*?)```/g,
      (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
    );

    // 2) 인라인 코드 보존
    src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);

    // 3) 헤딩
    src = src
      .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
      .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
      .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
      .replace(/^### (.*$)/gim, "<h3>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2>$1</h2>")
      .replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // 4) 굵게 / 이탤릭 / 취소선
    src = src
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>");

    // 5) 링크 / 이미지
    src = src
      .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
      .replace(
        /\[([^\]]+?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      );

    // 6) 가로줄
    src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");

    // 7) 블록인용
    src = src.replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>");

    // 8) 리스트 (단순 1-level)
    //    * item / - item / + item
    src = src
      .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
      .replace(/(<\/ul>\s*)<ul>/g, "") // 인접 <ul> 병합
      // 1. item
      .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
      .replace(/(<\/ol>\s*)<ol>/g, ""); // 인접 <ol> 병합

    // 9) 남은 개행을 <br>로
    // src = src
    //   .replace(/\n{2,}/g, "</p><p>")
    //   .replace(/\n/g, "<br>");

    return `<p>${src}</p>`;
  }

  /* HTML Escape for code block / inline code */
  function escapeHTML(str) {
    return str.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  wrap.innerHTML = `
    <div class="face-summary-section">
      <div class="face-summary">${simpleMD(obj.summary)}</div>
    </div>
    
    <div class="face-full-section-wrapper">
      <div class="face-full-report">${simpleMD(obj.detail)}</div>
  
      <div class="result-mask">
        <div class="blur-overlay"></div>
        <div class="mask-text-wrap">
          <div class="mask-text">
            <div class="mask-text-top">부위별 심층 관상 보고서</div>
            <div class="mask-text-top-sub">총 5,000자 이상</div>
              <div class="mask-text-sub">
                1. [코와 콧대] <span class="mask-text-span">통장이 최고점 찍을 해</span><br/>

                2. [이마와 눈썹] <span class="mask-text-span">첫 대박 터질 나이</span><br/>

                3. [눈과 눈매] <span class="mask-text-span">끌리는 이상형 본능 코드</span><br/>

                4. [입과 입술] <span class="mask-text-span">거절 못 할 설득 타율</span><br/>

                5. [턱과 광대] <span class="mask-text-span">은퇴 후 반격 모먼트</span><br/>

                6. [얼굴형] <span class="mask-text-span">인생 그래프 상승 각도</span><br/>

                7. [전체 인상·기운] <span class="mask-text-span">로또급 깜짝 행운 지수</span><br/>

                8. [운명·경로] <span class="mask-text-span">인생 반전 버튼 작동 시점</span><br/>

                9. [대인 관계·인연] <span class="mask-text-span">귀인 만날 달력 표시</span><br/>

                10. [종합 결론] <span class="mask-text-span">길·흉 총합 승부수 한줄</span><br/>
              </div>
              <div class="mask-text-btn-wrap">
                <div class="mask-text-btn" onclick="trackAndStartPayment('${resultId}')">
                  전체 분석 결과 확인하기
                </div>
              </div>
            <div class="mask-text-btn-sub">관상가 양반 - 프리미엄 AI 관상</div>
          </div>
        </div>
      </div>
      
    </div>
     <div class="mask-text-wrap-love">
          <div class="mask-text-love">
            <div class="mask-text-top-love">연애 심층 관상 보고서</div>
            <div class="mask-text-top-sub-love">총 10,000자 이상</div>
                  <div class="mask-text-sub-love">
                1. [부위별 심층 관상] <span class="mask-text-span-love">5,000자 보고서 포함</span><br/>
                2. [타고난 인연] <span class="mask-text-span-love">총 연애 횟수 & 사랑 사이클</span><br/>
                3. [운명 상대 지도] <span class="mask-text-span-love">시·구 단위 위치 예측</span><br/>
                4. [만남 오픈 타이밍] <span class="mask-text-span-love">계절·장소 & 개운 행동</span><br/>
                5. [이상적 상대] <span class="mask-text-span-love">끌어당김 전략</span><br/>
                6. [연애 성향 분석] <span class="mask-text-span-love">강·약점 & 보완법</span><br/>
                7. [지속력 업그레이드] <span class="mask-text-span-love">오래 가는 사랑 비결</span><br/>
                8. [개운 체크리스트] <span class="mask-text-span-love">연애 운 상승 실천표</span><br/>
              </div>
              <div class="mask-text-btn-wrap-love">
                <div class="mask-text-btn-love" onclick="trackAndStartLovePayment('${resultId}')">
                  나의 연애 관상 확인하기
                </div>
              </div>
            <div class="mask-text-btn-sub-love">관상가 양반 - 프리미엄 AI 관상</div>
          </div>
        </div>
    <div class="mask-text-wrap-worth">
          <div class="mask-text-worth">
            <div class="mask-text-top-worth">재물 심층 관상 보고서</div>
            <div class="mask-text-top-sub-worth">총 15,000자 이상</div>
              <div class="mask-text-sub-worth">
                1. [부위별 심층 관상] <span class="mask-text-span-worth">5,000자 보고서 포함</span><br/>
                2. [타고난 부와 평생 모을 재산] <span class="mask-text-span-worth"> 내 평생 자산 규모</span><br/>
                3. [성향과 재물운의 강·약점] <span class="mask-text-span-worth"> 돈과 만나는 지점</span><br/>
                4. [돈이 붙는 적성과 환경] <span class="mask-text-span-worth"> 부를 위한 일·사람·장소</span><br/>
                5. [자산을 키울 골든타임] <span class="mask-text-span-worth"> 시기별 기회 포착 전략</span><br/>
                6. [위기 징조와 예방책] <span class="mask-text-span-worth"> 손재·투자 리스크 대비</span><br/>
                7. [관상 개선 실천법] <span class="mask-text-span-worth"> 작은 습관으로 기운 트이기</span><br/>
                8. [관상가 양반의 인생 조언] <span class="mask-text-span-worth"> 돈 그 이상 삶의 태도</span><br/>
              </div>
              <div class="mask-text-btn-wrap-worth">
                <div class="mask-text-btn-worth" onclick="trackAndStartWealthPayment('${resultId}')">
                  나의 재물 관상 확인하기
                </div>
              </div>
            <div class="mask-text-btn-sub-worth">관상가 양반 - 프리미엄 AI 관상</div>
          </div>
        </div>
          
        <div class="mask-text-wrap-marriage">
          <div class="mask-text-marriage">
            <div class="mask-text-top-marriage">결혼 심층 관상 보고서
</div>
            <div class="mask-text-top-sub-marriage">총 12,000자 이상</div>
<div class="mask-text-sub-marriage">
  1. [부위별 심층 관상] <span class="mask-text-span-marriage">5,000자 보고서 포함</span><br/>
  2. [연애 성향·결혼관] <span class="mask-text-span-marriage">애정 표현‧가치관 분석</span><br/>
  3. [골든타임] <span class="mask-text-span-marriage">만남 시기·장소·개운법</span><br/>
  4. [이상적 배우자] <span class="mask-text-span-marriage">외모·성격·첫 대화 오프너</span><br/>
  5. [결혼 생활 시뮬] <span class="mask-text-span-marriage">경제·소통·자녀 운</span><br/>
  6. [개운 체크리스트] <span class="mask-text-span-marriage">인연 부르는 데일리 루틴</span><br/>
</div>
              <div class="mask-text-btn-wrap-marriage">
                <div class="mask-text-btn-marriage" onclick="trackAndStartMarriagePayment('${resultId}')">
                  나의 결혼 관상 확인하기
                </div>
              </div>
            <div class="mask-text-btn-sub-marriage">관상가 양반 - 프리미엄 AI 관상</div>
          </div>
        </div>
        <div class="mask-text-wrap-career">
  <div class="mask-text-career">
    <div class="mask-text-top-career">직업 심층 관상 보고서</div>
    <div class="mask-text-top-sub-career">총 12,000자 이상</div>

    <div class="mask-text-sub-career">
      1. [부위별 심층 관상] <span class="mask-text-span-career">5,000자 보고서 포함</span><br/>

      2. [적성과 장단점] <span class="mask-text-span-career">천직 찾는 DNA 분석</span><br/>

      3. [직업 운 곡선] <span class="mask-text-span-career">커리어 꽃 피는 시기</span><br/>

      4. [강점 극대화 전략] <span class="mask-text-span-career">성향별 일 잘하는 루틴</span><br/>

      5. [직장 vs 창업] <span class="mask-text-span-career">성공 확률·적합도 비교</span><br/>

      6. [행운의 업무 환경] <span class="mask-text-span-career">돈·사람·공간 기운 포인트</span><br/>

      7. [위기 대비 체크] <span class="mask-text-span-career">번아웃·리스크 예방법</span><br/>

      8. [관상 개선 실천법] <span class="mask-text-span-career">커리어 운 트이는 습관</span><br/>
    </div>

    <div class="mask-text-btn-wrap-career">
      <div class="mask-text-btn-career" onclick="trackAndStartCareerPayment('${resultId}')">
        나의 직업 관상 확인하기
      </div>
    </div>

    <div class="mask-text-btn-sub-career">관상가 양반 - 프리미엄 AI 관상</div>
  </div>
</div>
  `;
}

function renderImage(base64) {
  document.getElementById("face-image").src = base64;
  // document.querySelector(".file-upload-content").style.display = "block";
  // document.querySelector(".image-upload-wrap").style.display = "none";
}

// 페이지 진입 시 바로 실행
document.addEventListener("DOMContentLoaded", () => {
  mixpanel.track("기본 관상 결과 페이지 진입", { ts: Date.now() }); // ← 추가
  autoRenderFromDB(500); // 1.5초 후 자동 업로드
});
