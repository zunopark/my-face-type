// API 엔드포인트
const SAJU_LOVE_API =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju_love/analyze";

// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// 현재 데이터 저장용
let currentData = null;

// DOM 요소
const loadingWrap = document.getElementById("loadingWrap");
const errorWrap = document.getElementById("errorWrap");
const resultWrap = document.getElementById("resultWrap");

// URL에서 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
const resultId = urlParams.get("id");

if (!resultId) {
  showError();
} else {
  loadResult(resultId);
}

// IndexedDB에서 결과 불러오기
function loadResult(id) {
  const req = indexedDB.open(DB_NAME, DB_VERSION);

  req.onerror = () => showError();

  req.onsuccess = (e) => {
    const db = e.target.result;
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        currentData = getReq.result;
        renderResult(getReq.result);
      } else {
        showError();
      }
    };

    getReq.onerror = () => showError();
  };
}

// 에러 표시
function showError() {
  loadingWrap.classList.add("hidden");
  errorWrap.classList.remove("hidden");
}

// 결과 렌더링
function renderResult(data) {
  const { input, sajuData, timestamp } = data;

  // 날짜 포맷
  document.getElementById("resultDate").textContent =
    new Date(timestamp).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }) + " 분석";

  // 사용자 정보
  document.getElementById("userNameDisplay").textContent =
    input.userName || "—";
  document.getElementById("userGender").textContent =
    input.gender === "male" ? "남성" : "여성";
  document.getElementById("userBirthDate").textContent =
    formatDate(input.date) +
    ` (${input.calendar === "solar" ? "양력" : "음력"})`;

  if (input.time) {
    document.getElementById("userBirthTime").textContent = formatTime(
      input.time
    );
  } else {
    document.getElementById("birthTimeRow").classList.add("hidden");
  }

  // 일간 정보
  const dm = sajuData.dayMaster || {};
  document.getElementById("dayMasterChar").textContent = dm.char || "—";
  document.getElementById("dayMasterTitle").textContent = dm.title || "—";
  document.getElementById("dayMasterElement").textContent = dm.element || "—";
  document.getElementById("dayMasterYinYang").textContent = dm.yinYang || "—";

  // 사주 팔자
  renderPillars(sajuData.pillars);

  // 오행 분포
  renderFiveElements(sajuData.loveFacts?.fiveElementsHanjaPercent || {});
  document.getElementById("strengthValue").textContent =
    sajuData.fiveElements?.strength || "—";

  // 연애 요소
  renderLoveFacts(sajuData.loveFacts);

  // 고민
  if (input.userConcern) {
    document.getElementById("userConcern").textContent = input.userConcern;
    document.getElementById("concernSection").classList.remove("hidden");
  }

  // 표시
  loadingWrap.classList.add("hidden");
  resultWrap.classList.remove("hidden");
}

// 사주 팔자 렌더링
function renderPillars(pillars) {
  const wrap = document.getElementById("pillarsWrap");
  const labels = { year: "년주", month: "월주", day: "일주", hour: "시주" };

  ["year", "month", "day", "hour"].forEach((key) => {
    const p = pillars?.[key] || {};
    const stemChar = p.stem?.char || "—";
    const branchChar = p.branch?.char || "—";
    const stemKo = p.stem?.korean || "";
    const branchKo = p.branch?.korean || "";

    const div = document.createElement("div");
    div.className = "pillar_item";
    div.innerHTML = `
      <div class="pillar_label">${labels[key]}</div>
      <div class="pillar_chars">
        <span class="pillar_stem">${stemChar}</span>
        <span class="pillar_branch">${branchChar}</span>
      </div>
      <div class="pillar_korean">${stemKo}${branchKo}</div>
    `;
    wrap.appendChild(div);
  });
}

// 오행 분포 렌더링
function renderFiveElements(percent) {
  const wrap = document.getElementById("fiveElementsWrap");
  const elements = [
    { key: "木", name: "목", color: "#2aa86c" },
    { key: "火", name: "화", color: "#ff6a6a" },
    { key: "土", name: "토", color: "#caa46a" },
    { key: "金", name: "금", color: "#b8bec6" },
    { key: "水", name: "수", color: "#6aa7ff" },
  ];

  elements.forEach(({ key, name, color }) => {
    const value = percent[key] || 0;
    const div = document.createElement("div");
    div.className = "element_item";
    div.innerHTML = `
      <div class="element_bar_wrap">
        <div class="element_bar" style="height: ${Math.max(
          10,
          value * 2
        )}px; background: ${color}"></div>
      </div>
      <div class="element_label">${key}</div>
      <div class="element_percent">${value}%</div>
    `;
    wrap.appendChild(div);
  });
}

// 연애 요소 렌더링
function renderLoveFacts(loveFacts) {
  if (!loveFacts) return;

  // 도화살
  const peach = loveFacts.peachBlossom || {};
  const peachText = peach.hasPeach
    ? `있음 (${peach.targetBranch || ""})`
    : "없음";
  document.getElementById("peachBlossom").textContent = peachText;

  // 배우자 별
  const spouse = loveFacts.spouseStars || {};
  const spouseType = loveFacts.spouseTargetType || "";
  const spouseCount = spouse.hitCount || 0;
  const spousePos = spouse.positions?.map((p) => labelKo(p)).join(", ") || "";

  let spouseText = `${spouseType} ${spouseCount}개`;
  if (spousePos) spouseText += ` (${spousePos})`;
  document.getElementById("spouseStars").textContent = spouseText;
}

// 헬퍼 함수
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
}

function formatTime(timeStr) {
  const timeMap = {
    "23:30": "자시 (23:30~01:30)",
    "01:30": "축시 (01:30~03:30)",
    "03:30": "인시 (03:30~05:30)",
    "05:30": "묘시 (05:30~07:30)",
    "07:30": "진시 (07:30~09:30)",
    "09:30": "사시 (09:30~11:30)",
    "11:30": "오시 (11:30~13:30)",
    "13:30": "미시 (13:30~15:30)",
    "15:30": "신시 (15:30~17:30)",
    "17:30": "유시 (17:30~19:30)",
    "19:30": "술시 (19:30~21:30)",
    "21:30": "해시 (21:30~23:30)",
  };
  return timeMap[timeStr] || timeStr;
}

function labelKo(key) {
  return { year: "년주", month: "월주", day: "일주", hour: "시주" }[key] || key;
}

// 연애 사주 분석 버튼 이벤트 - 결제 오버레이 표시
const analyzeLoveBtn = document.getElementById("analyzeLoveBtn");
const analyzeOverlay = document.getElementById("analyzeOverlay");
const paymentOverlay = document.getElementById("paymentOverlay");
const closePaymentBtn = document.getElementById("closePaymentBtn");

analyzeLoveBtn.addEventListener("click", function () {
  if (!currentData || !currentData.sajuData) {
    alert("사주 데이터를 찾을 수 없습니다.");
    return;
  }

  // 결제 오버레이 표시
  document.body.style.overflow = "hidden";
  startTossPayment(currentData.id);
});

// 토스 페이먼츠 결제 시작
async function startTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + new Date().getTime();

  paymentOverlay.style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    // ##수정해야함
    paymentWidget.renderPaymentMethods("#payment-method", { value: 1 });
    paymentWidget.renderAgreement("#agreement");

    document.getElementById("payment-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `saju_love_${Date.now()}`,
          orderName: "AI 연애 사주 심층 분석",
          customerName: currentData.input?.userName || "고객",
          successUrl: `${
            window.location.origin
          }/saju_love/success.html?id=${encodeURIComponent(resultId)}`,
          failUrl: `${
            window.location.origin
          }/saju_love/fail.html?id=${encodeURIComponent(resultId)}`,
        });
      } catch (err) {
        alert("결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("결제 위젯 로드 실패: " + e.message);
  }
}

// 결제 창 닫기
function closePayment() {
  paymentOverlay.style.display = "none";
  document.getElementById("payment-method").innerHTML = "";
  document.getElementById("agreement").innerHTML = "";
  document.body.style.overflow = "";
}

closePaymentBtn.addEventListener("click", closePayment);

// IndexedDB 업데이트 함수
function updateLoveAnalysis(id, loveResult) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onsuccess = (e) => {
      const db = e.target.result;
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const data = getReq.result;
        if (data) {
          data.loveAnalysis = loveResult;
          const putReq = store.put(data);
          putReq.onsuccess = () => resolve(data);
          putReq.onerror = () => reject(putReq.error);
        } else {
          reject(new Error("데이터를 찾을 수 없습니다."));
        }
      };

      getReq.onerror = () => reject(getReq.error);
    };

    req.onerror = () => reject(req.error);
  });
}
