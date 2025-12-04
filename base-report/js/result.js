let db;
let currentResultId = null; // 전역 보관 용
let baseReportRendered = false;

/* ───────── 12. 사주 정보 분석 및 렌더링 ───────── */
const SAJU_API_COMPUTE =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju/compute";

async function analyzeAndRenderSaju(id) {
  await waitForDB();
  const rec = await new Promise((res) => {
    const tx = db.transaction(["results"], "readonly");
    tx.objectStore("results").get(id).onsuccess = (e) => res(e.target.result);
  });

  if (!rec || !rec.sajuInput || !rec.sajuInput.date) return;

  try {
    const res = await fetch(SAJU_API_COMPUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rec.sajuInput),
    });
    if (!res.ok) throw new Error("사주 API 요청 실패");
    const data = await res.json();
    renderSajuResult(data);
  } catch (err) {
    console.warn("⚠️ 사주 분석 실패:", err);
  }
}

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
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/face-teller2/",
      { method: "POST", body: formData }
    );
    if (!resp.ok) throw new Error("서버 응답 오류");
    const { summary, detail, sections, features } = await resp.json();
    if (!summary || !detail) throw new Error("summary/detail 없음");

    /* (1) normalize - sections 포함 */
    const normalized = { isMulti: false, summary, detail, sections };

    /* (2) 스켈레톤 + 결과 객체 */
    const result = {
      id: forceId ?? crypto.randomUUID(),
      imageBase64,
      features,
      summary,
      detail,
      sections,
      type: "base",
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
      reports: makeSkeleton(normalized, false),
    };

    // 🛠 기존 레코드 병합
    await waitForDB();
    const existing = await new Promise((res) => {
      const tx = db.transaction(["results"], "readonly");
      tx.objectStore("results").get(result.id).onsuccess = (e) =>
        res(e.target.result);
    });

    if (existing?.sajuInput) {
      result.sajuInput = existing.sajuInput; // 🔥 중요: 보존
    }

    // 🔥 기존 paid 상태 보존
    if (existing?.reports?.base?.paid) {
      result.reports.base.paid = true;
      result.reports.base.purchasedAt = existing.reports.base.purchasedAt;
      result.paid = true;
    }

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
  baseReportRendered = true;
  if (data.id) analyzeAndRenderSaju(data.id);

  renderResultNormalized(norm, "base");

  // ✅ base 렌더링 끝났으므로 사주 분석도 바로 실행
}

/* ================= 결과 버튼 로딩 컨트롤 ================ */
function startResultBtnLoading() {
  const wrap = document.querySelector(".result_btn_wrap");
  const bar = document.querySelector(".result_btn_loading");
  const status = document.querySelector(".result_btn_status");
  const btn = document.querySelector(".result_btn");

  if (!wrap) return;

  wrap.dataset.state = "loading"; // 회색 + 미니바 노출
  status.textContent = "관상 심층 보고서를 최종 정리 중입니다...";
  btn.disabled = true;

  // 0 → 100 % : 10 초
  bar.style.width = "0%";
  let p = 0;
  const tid = setInterval(() => {
    p += Math.random() * 6.2;
    bar.style.width = Math.min(p, 100) + "%";
    if (p >= 100) {
      clearInterval(tid);
      finishResultBtnLoading(); // 10 초 뒤 자동 완료
    }
  }, 320);
}

function finishResultBtnLoading() {
  const wrap = document.querySelector(".result_btn_wrap");
  const status = document.querySelector(".result_btn_status");
  const btn = document.querySelector(".result_btn");

  if (!wrap) return;

  wrap.dataset.state = "ready"; // 초록 버튼
  status.textContent = "20,000자 관상 심층 보고서 준비 완료!";
  btn.disabled = false;
}

function finishResultBtnLoading() {
  const wrap = document.querySelector(".result_btn_wrap");
  const bar = document.querySelector(".result_btn_loading");
  const status = document.querySelector(".result_btn_status");
  const btn = document.querySelector(".result_btn");

  if (!wrap) return;

  bar.style.width = "100%";
  wrap.dataset.state = "ready";
  status.textContent = "관상 심층 보고서가 준비되었습니다!";
  btn.disabled = false;
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
  // 결제 후 실제 분석 로딩 - 느리게 (약 15~20초)
  progressInterval = setInterval(() => {
    if (fakeProgress < 94) {
      fakeProgress += Math.random() * 1.5;
      bar.style.width = `${Math.min(fakeProgress, 94)}%`;
    }
  }, 400);

  let idx = 0;
  clearInterval(messageInterval);
  messageInterval = setInterval(() => {
    idx = (idx + 1) % loadingMessages.length;
    msg.textContent = loadingMessages[idx];
  }, 3500);
  mixpanel.track("기본 분석 보고서 시작", { id: pageId, type: pageType }); // ← 추가
}

function finishLoading() {
  clearInterval(progressInterval);
  clearInterval(messageInterval);
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = "100%";
  mixpanel.track("기본 분석 보고서 완료", { id: pageId, type: pageType }); // ← 추가
  startResultBtnLoading(); // ★ 버튼 로딩 시작
  document.querySelector(".result_btn_wrap").style.display = "flex";
}

function showError(msg) {
  clearInterval(progressInterval);
  clearInterval(messageInterval);
  document.getElementById(
    "label-container"
  ).innerHTML = `<div style="color:red; padding:24px; white-space:pre-line;">${msg}</div>`;
  mixpanel.track("기본 분석 보고서 오류", { id: pageId, error: msg }); // ← 추가
  const status = document.querySelector(".result_btn_status");
  if (status) status.textContent = "보고서 생성에 실패했습니다.";
}

// 9. 이미지 업로드 처리 (API 호출 없이 이미지만 저장)
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

      // 이미지만 저장하고 결제 유도 페이지로 이동
      await saveImageOnly(imageBase64);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 이미지만 저장 (API 호출 없이)
async function saveImageOnly(imageBase64) {
  await waitForDB();

  const resultId = crypto.randomUUID();
  const result = {
    id: resultId,
    imageBase64,
    type: "base",
    paid: false,
    purchasedAt: null,
    timestamp: new Date().toISOString(),
    reports: {
      base: { paid: false, data: null },
      wealth: { paid: false, data: null },
      love: { paid: false, data: null },
      marriage: { paid: false, data: null },
      career: { paid: false, data: null },
    },
  };

  await saveToIndexedDB(result);
  currentResultId = resultId;

  // URL에 id 추가
  const newUrl = `${location.pathname}?id=${resultId}`;
  history.replaceState(null, "", newUrl);

  // 결제 유도 페이지 표시
  renderPaymentInducePage();
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
  document.body.style.overflow = "hidden";
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
      { value: 9900 }
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

function closePayment() {
  document.getElementById("paymentOverlay").style.display = "none";
  document.getElementById("payment-method").innerHTML = "";
  document.getElementById("agreement").innerHTML = "";

  mixpanel.track("기본 결제창 닫힘", {
    id: pageId,
    type: pageType,
    timestamp: new Date().toISOString(),
  });

  document.body.style.overflow = "";

  setTimeout(() => {
    startDiscountedPayment(); // ↓ 아래에서 정의
    document.body.style.overflow = "hidden";
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
    widget.renderPaymentMethods("#discount-method", { value: 7900 });
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
          price: 7900,
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
  document.body.style.overflow = "";
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

// === 색상 매핑 (오행 기본 팔레트) ===
const SAJU_COLORS = {
  wood: "#2aa86c",
  fire: "#ff6a6a",
  earth: "#caa46a",
  metal: "#b8bec6",
  water: "#6aa7ff",
};

// 안전한 텍스트 컬러(타일 배경 위 가독성)
function pickTextColor(bg) {
  // 단순 YIQ 기준
  const c = (bg || "#000").replace("#", "");
  const r = parseInt(c.substr(0, 2), 16),
    g = parseInt(c.substr(2, 2), 16),
    b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#0d0f14" : "#ffffff";
}

// 오행/색 추론 → 태그 HTML
function makeSajuTag(item) {
  if (!item) return "—";
  const color =
    item.color ||
    SAJU_COLORS[item.element?.toLowerCase?.()] ||
    SAJU_COLORS[item.fiveElement?.toLowerCase?.()] ||
    "#213055";
  const fg = pickTextColor(color);
  const han = item.char || "—";
  const ko = item.korean || item.name || "";
  return `
    <div class="tag" style="background:${color};color:${fg}">
      <div class="han">${han}</div>
      ${ko ? `<span class="ko">${ko}</span>` : ""}
    </div>`;
}

// 상단 어딘가(함수 바깥 or renderSajuResult 맨 위)에 유틸 추가
function formatDateYYYYMMDD(raw) {
  if (!raw) return "";
  const m = String(raw).match(/(\d{4})\D?(\d{1,2})\D?(\d{1,2})/);
  if (!m) return String(raw);
  const [, y, mo, da] = m;
  return `${y}년 ${mo.padStart(2, "0")}월 ${da.padStart(2, "0")}일`;
}
function makeHourLabel(pillarsHour, input) {
  if (pillarsHour?.branch?.char) return `${pillarsHour.branch.char}시`; // 지지 표기
  if (input?.time) return input.time; // 사용자가 넣은 HH:MM
  return ""; // 시간 모름
}

function renderSajuResult(data) {
  const p = data.pillars || {};
  const fe = data.fiveElements;
  const luck = data.luck;
  const dateLabel = formatDateYYYYMMDD(data.input?.date);
  const hourLabel = makeHourLabel(p.hour, data.input);

  const container = document.createElement("div");
  container.className = "saju-section";

  container.innerHTML = `
    <div class="card card-head">
      <div class="title">${data.input?.name || "사용자"} 님의 사주</div>
      <div class="subtitle">${[dateLabel, hourLabel]
        .filter(Boolean)
        .join(" ")}</div>
    </div>  

    <div class="card table-wrap">
      <div class="table grid">
        <div class="cell head stub"></div>
        <div class="cell head">생시</div>
        <div class="cell head">생일</div>
        <div class="cell head">생월</div>
        <div class="cell head">생년</div>

        <div class="cell rowhead">십성</div>
        <div class="cell">${p.hour?.tenGodStem || "—"}</div>
        <div class="cell">${p.day?.tenGodStem || "—"}</div>
        <div class="cell">${p.month?.tenGodStem || "—"}</div>
        <div class="cell">${p.year?.tenGodStem || "—"}</div>

        <div class="cell rowhead">천간</div>
        <div class="cell big">${makeSajuTag(p.hour?.stem)}</div>
        <div class="cell big">${makeSajuTag(p.day?.stem)}</div>
        <div class="cell big">${makeSajuTag(p.month?.stem)}</div>
        <div class="cell big">${makeSajuTag(p.year?.stem)}</div>

        <div class="cell rowhead">지지</div>
        <div class="cell big">${makeSajuTag(p.hour?.branch)}</div>
        <div class="cell big">${makeSajuTag(p.day?.branch)}</div>
        <div class="cell big">${makeSajuTag(p.month?.branch)}</div>
        <div class="cell big">${makeSajuTag(p.year?.branch)}</div>

        <div class="cell rowhead">십성</div>
        <div class="cell">${p.hour?.tenGodBranchMain || "—"}</div>
        <div class="cell">${p.day?.tenGodBranchMain || "—"}</div>
        <div class="cell">${p.month?.tenGodBranchMain || "—"}</div>
        <div class="cell">${p.year?.tenGodBranchMain || "—"}</div>
      </div>
    </div>


<div class="card">
  <div class="bars">
    ${["wood", "fire", "earth", "metal", "water"]
      .map((k) => {
        const v = fe?.percent?.[k] ?? 0;

        // 영어 → 한자 매핑
        const hanjaMap = {
          wood: "木",
          fire: "火",
          earth: "土",
          metal: "金",
          water: "水",
        };

        return `
          <div class="bar" data-el="${k}">
            <div style="height:${v}%"></div>
            <div class="label">${hanjaMap[k]} ${v}%</div>
          </div>`;
      })
      .join("")}
  </div>
</div>
  `;

  const labelWrap = document.getElementById("label-container");
  const summarySection = labelWrap.querySelector(".face-summary-section");

  if (labelWrap && summarySection) {
    labelWrap.insertBefore(container, summarySection.nextSibling); // ✅ 요기!
  }
}

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

  /* (4) 결제 완료 상태면 API 호출하여 분석 */
  if (rec.reports?.base?.paid && rec.imageBase64) {
    currentResultId = rec.id;
    const file = await (await fetch(rec.imageBase64)).blob();
    await analyzeFaceImage(
      new File([file], `${rec.id}.jpg`),
      rec.imageBase64,
      rec.id
    );
    return;
  }

  /* (5) 미결제 상태면 결제 유도 페이지만 보여줌 */
  if (rec.imageBase64) {
    currentResultId = rec.id;
    renderPaymentInducePage();
  }
}

/* ───────── 결제 유도 페이지 렌더 (API 호출 없이) ───────── */
const LOADING_DONE_KEY = "base_report_loading_done";

function renderPaymentInducePage() {
  const wrap = document.getElementById("label-container");

  // 요약 섹션 없이 faceteller.png 상세 페이지만 표시
  wrap.innerHTML = `
    <div class="face_teller_wrap">
      <img src="../img/faceteller.png" alt="" class="face_teller_img" />
    </div>
  `;

  // 버튼 영역 표시
  const btnWrap = document.querySelector(".result_btn_wrap");
  if (btnWrap) {
    btnWrap.style.display = "flex";
  }

  // 이미 로딩 완료한 적 있으면 바로 활성화
  const loadingDoneId = sessionStorage.getItem(LOADING_DONE_KEY);
  if (loadingDoneId === currentResultId) {
    activateButton();
  } else {
    startFakeLoading();
  }

  mixpanel.track("결제 유도 페이지 진입", { id: currentResultId });
}

/* 가짜 로딩 시작 */
function startFakeLoading() {
  const btnWrap = document.querySelector(".result_btn_wrap");
  const bar = document.querySelector(".result_btn_loading");
  const status = document.querySelector(".result_btn_status");
  const btn = document.querySelector(".result_btn");

  if (btnWrap) btnWrap.dataset.state = "loading";
  if (status) status.textContent = "관상을 분석하는 중입니다...";
  if (btn) btn.disabled = true;
  if (bar) bar.style.width = "0%";

  const loadingMessages = [
    "관상을 분석하는 중입니다...",
    "얼굴 특징을 읽는 중...",
    "전통 관상학 데이터 참조 중...",
    "보고서를 정리하는 중...",
  ];

  let progress = 0;
  let msgIdx = 0;

  // 빠르게 완료 (약 3~4초)
  const progressInterval = setInterval(() => {
    progress += Math.random() * 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      finishFakeLoading();
    }
    if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
  }, 200);

  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    if (status) status.textContent = loadingMessages[msgIdx];
  }, 2500);
}

/* 로딩 완료 */
function finishFakeLoading() {
  sessionStorage.setItem(LOADING_DONE_KEY, currentResultId);
  activateButton();
}

/* 버튼 활성화 */
function activateButton() {
  const btnWrap = document.querySelector(".result_btn_wrap");
  const status = document.querySelector(".result_btn_status");
  const btn = document.querySelector(".result_btn");

  if (btnWrap) btnWrap.dataset.state = "ready";
  if (status) status.textContent = "관상 분석을 완료했습니다.";
  if (btn) btn.disabled = false;
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
  const resultId = obj.id ?? "";
  currentResultId = resultId; // ★ 여기 한 줄만 추가

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

    // 6) 마크다운 표(table) 처리
    src = src.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableBlock) => {
      const rows = tableBlock.trim().split("\n");
      if (rows.length < 2) return match;

      let html = '<table class="md-table">';
      rows.forEach((row, idx) => {
        // 구분선 (|---|---|---| 등) 건너뛰기
        if (/^\|[\s\-:|]+\|$/.test(row.trim()) && row.includes("-")) return;

        const cells = row
          .split("|")
          .filter((_, i, arr) => i > 0 && i < arr.length - 1);
        const tag = idx === 0 ? "th" : "td";
        html += "<tr>";
        cells.forEach((cell) => {
          html += `<${tag}>${cell.trim()}</${tag}>`;
        });
        html += "</tr>";
      });
      html += "</table>";
      return html;
    });

    // 7) 가로줄
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
    src = src.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");

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

  // 섹션 정보
  const sectionConfig = [
    { key: "face_reading", title: "부위별 관상 심층 풀이" },
    { key: "love", title: "연애운 심층 풀이" },
    { key: "career", title: "직업운 심층 풀이" },
    { key: "wealth", title: "재물운 심층 풀이" },
    { key: "health", title: "건강운 심층 풀이" },
  ];

  // sections가 있으면 카드 UI로, 없으면 기존 방식
  if (obj.sections && Object.keys(obj.sections).some((k) => obj.sections[k])) {
    const sectionsHTML = sectionConfig
      .filter((sec) => obj.sections[sec.key])
      .map(
        (sec) => `
        <div class="report-card">
          <div class="report-card-header">
            <h3 class="report-card-title">${sec.title}</h3>
          </div>
          <div class="report-card-content">
            ${simpleMD(obj.sections[sec.key])}
          </div>
        </div>
      `
      )
      .join("");

    wrap.innerHTML = `
      <div class="face-summary-section">
        <div class="face-summary">${simpleMD(obj.summary)}</div>
      </div>
      <div class="report-cards-container">
        ${sectionsHTML}
      </div>
    `;
  } else {
    // 기존 방식 (sections 없을 때 fallback)
    wrap.innerHTML = `
      <div class="face-summary-section">
        <div class="face-summary">${simpleMD(obj.summary)}</div>
      </div>
      <div class="face-detail-section">
        <div class="face-detail">${simpleMD(obj.detail)}</div>
      </div>
    `;
  }

  // 결과 페이지에서는 버튼 숨김
  const btnWrap = document.querySelector(".result_btn_wrap");
  if (btnWrap) btnWrap.style.display = "none";
}

function renderImage(base64) {
  document.getElementById("face-image").src = base64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
  const btn = document.querySelector(".result_btn");

  btn.addEventListener("click", () => {
    if (currentResultId) {
      trackAndStartPayment(currentResultId);
      return;
    }
    const id = btn.dataset.resultId;
    if (id) trackAndStartPayment(id);
  });

  mixpanel.track("기본 관상 결과 페이지 진입", { ts: Date.now() });

  await autoRenderFromDB();
});
