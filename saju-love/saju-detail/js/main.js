// API 엔드포인트
const saju_love_API =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju_love/analyze";

// ✅ 테스트용 플래그
// true : Toss 결제 단계 생략하고 바로 결과 페이지로 이동
// false: 기존 결제 플로우 유지
const SKIP_TOSS_PAYMENT = false;

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

        // Mixpanel 트래킹 (유저 정보 포함)
        if (typeof mixpanel !== "undefined") {
          const input = getReq.result.input || {};
          mixpanel.track("연애 사주 상세 페이지 방문", {
            userName: input.userName || "",
            birthDate: input.date || "",
            gender: input.gender || "",
            url: window.location.href,
            timestamp: new Date().toISOString(),
          });
        }
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
  const { input, sajuData } = data;

  // 사용자 정보 - 새 레이아웃
  document.getElementById("userNameDisplay").textContent =
    input.userName || "—";
  const birthTime = formatTimeToSi(input.time);
  const birthDateText = birthTime
    ? `${formatDate(input.date)} | ${birthTime}`
    : formatDate(input.date);
  document.getElementById("userBirthDate").textContent = birthDateText;

  // 일간 정보
  const dm = sajuData.dayMaster || {};
  document.getElementById("dayMasterChar").textContent = dm.char || "—";
  document.getElementById("dayMasterTitle").textContent = dm.title || "—";

  // 일간 한자 + 오행 한자 조합 (예: 甲木)
  const elementHanjaMap = {
    wood: "木",
    fire: "火",
    earth: "土",
    metal: "金",
    water: "水",
  };
  const elementHanja = elementHanjaMap[dm.element?.toLowerCase()] || "";
  const dayMasterHanja = (dm.char || "") + elementHanja; // 甲木, 丙火 등

  // 섹션 2에 일간 정보 복사 (갑목 | 甲木 형식)
  const dayMasterElement2 = document.getElementById("dayMasterElement2");
  const dayMasterTitle2 = document.getElementById("dayMasterTitle2");
  if (dayMasterElement2) dayMasterElement2.textContent = dm.title || "—"; // 갑목, 병화 등
  if (dayMasterTitle2) dayMasterTitle2.textContent = dayMasterHanja; // 甲木, 丙火 등

  // 일간 성향 설명 렌더링
  renderDayMasterDesc(dm.char);

  // 사주 팔자
  renderPillars(sajuData.pillars);

  // 표시
  loadingWrap.classList.add("hidden");
  resultWrap.classList.remove("hidden");
}

// 사주 팔자 렌더링
function renderPillars(pillars) {
  const wrap = document.getElementById("pillarsWrap");
  const labels = { year: "년주", month: "월주", day: "일주", hour: "시주" };

  // 오행 색상 맵 (한자 + 영어 둘 다 지원)
  const elementColors = {
    木: "#2aa86c",
    wood: "#2aa86c",
    火: "#ff6a6a",
    fire: "#ff6a6a",
    土: "#caa46a",
    earth: "#caa46a",
    金: "#9a9a9a",
    metal: "#9a9a9a",
    水: "#6aa7ff",
    water: "#6aa7ff",
  };

  // 오행 배경색 맵 (연한 버전)
  const elementBgColors = {
    木: "rgba(42, 168, 108, 0.12)",
    wood: "rgba(42, 168, 108, 0.12)",
    火: "rgba(255, 106, 106, 0.12)",
    fire: "rgba(255, 106, 106, 0.12)",
    土: "rgba(202, 164, 106, 0.12)",
    earth: "rgba(202, 164, 106, 0.12)",
    金: "rgba(154, 154, 154, 0.12)",
    metal: "rgba(154, 154, 154, 0.12)",
    水: "rgba(106, 167, 255, 0.12)",
    water: "rgba(106, 167, 255, 0.12)",
  };

  // element 값을 소문자로 변환하여 색상 찾기
  const getColor = (element) => {
    if (!element) return "#333";
    return (
      elementColors[element] || elementColors[element.toLowerCase()] || "#333"
    );
  };

  const getBgColor = (element) => {
    if (!element) return "transparent";
    return (
      elementBgColors[element] ||
      elementBgColors[element.toLowerCase()] ||
      "transparent"
    );
  };

  ["hour", "day", "month", "year"].forEach((key) => {
    const p = pillars?.[key] || {};
    const stemChar = p.stem?.char || "—";
    const branchChar = p.branch?.char || "—";
    const stemKo = p.stem?.korean || "";
    const branchKo = p.branch?.korean || "";
    const stemElement = p.stem?.element || "";
    const branchElement = p.branch?.element || "";
    const tenGodStem = p.tenGodStem || "—";
    const tenGodBranch = p.tenGodBranchMain || "—";

    const stemColor = getColor(stemElement);
    const branchColor = getColor(branchElement);
    const stemBgColor = getBgColor(stemElement);
    const branchBgColor = getBgColor(branchElement);

    const div = document.createElement("div");
    div.className = "pillar_item";
    div.innerHTML = `
      <div class="pillar_label">${labels[key]}</div>
      <div class="pillar_chars">
        <div class="pillar_char_wrap" style="background: ${stemBgColor}; border-radius: 8px;">
          <span class="pillar_stem" style="color: ${stemColor}">${stemChar}</span>
          <span class="pillar_ten_god">${tenGodStem}</span>
        </div>
        <div class="pillar_char_wrap" style="background: ${branchBgColor}; border-radius: 8px;">
          <span class="pillar_branch" style="color: ${branchColor}">${branchChar}</span>
          <span class="pillar_ten_god">${tenGodBranch}</span>
        </div>
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
  const targetBranch = Array.isArray(peach.targetBranch)
    ? peach.targetBranch.join(", ")
    : peach.targetBranch || "";
  // hasPeach: 실제 도화 지지가 사주에 있는지, positions: 어느 주에 있는지
  const hasPeach =
    peach.hasPeach || (peach.positions && peach.positions.length > 0);
  const peachText = hasPeach ? `있음 (${targetBranch})` : "없음";
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

function formatTimeToSi(timeStr) {
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
  return timeMap[timeStr] || timeStr || "";
}

function labelKo(key) {
  return { year: "년주", month: "월주", day: "일주", hour: "시주" }[key] || key;
}

// 일간별 성향 데이터
const dayMasterData = {
  甲: {
    headline: "단아함과 우아함이 돋보이는 청순 주인공 스타일",
    summary:
      "갑목일간은 기둥처럼 곧고 깨끗하고 맑은 이미지를 지녀 주변을 정화시키는 매력이 있어요. 묵묵히 뿌리를 내리고 자라는 의연함으로 상대를 지켜주는 든든한 연애 성향을 가집니다.",
    appearance: [
      "당당함과 품위 있는 태도",
      "시원하고 뚜렷한 눈매",
      "균형 잡히고 늘씬한 체형",
    ],
  },
  乙: {
    headline: "유연한 생명력, 강인함이 숨겨진 야생화 타입",
    summary:
      "을목일간은 덩굴처럼 상대를 감싸 안으며 끈질기게 관계를 이어가는 헌신적인 연애 스타일이에요. 어떤 환경이든 소화하는 뛰어난 적응력과 희망적인 에너지가 함께하는 유연한 분위기를 가졌어요.",
    appearance: [
      "어떤 환경이든 소화하는 뛰어난 적응력",
      "쉽게 꺾이지 않는 끈질긴 인내심",
      "희망적인 에너지를 전파하는 유연한 분위기",
    ],
  },
  丙: {
    headline: "타고난 스포트라이트, 빛나는 태양의 아우라",
    summary:
      "병화일간은 태양처럼 화끈하고 정열적으로 상대를 대하며, 숨김없이 솔직한 사랑을 하는 타입이에요. 주변을 압도하는 밝고 열정적인 존재감이 매력이며, 시원시원한 성격이 긍정적인 인상을 줍니다.",
    appearance: [
      "주변을 압도하는 밝고 열정적인 존재감",
      "명예와 의리를 중시하는 시원한 성격",
      "망설임 없는 적극적인 행동력",
    ],
  },
  丁: {
    headline: "은은한 섬광, 온기를 품은 촛불 감성",
    summary:
      "정화일간은 촛불처럼 은은하고 섬세하게 상대를 보살피며, 따뜻한 마음으로 오래도록 관계를 유지하는 연애 타입이에요. 조용함 속에 숨겨진 섬세한 열정이 매력으로 다가옵니다.",
    appearance: [
      "조용함 속에 숨겨진 섬세한 열정",
      "타인에게 온기를 나누는 따뜻한 분위기",
      "실용적 감각이 뛰어난 창조적인 능력",
    ],
  },
  戊: {
    headline: "고요함 속에 깊이가 있는 고급스러운 우아미",
    summary:
      "큰 산의 대지처럼 깊고 넉넉한 포용력으로 상대를 안정시키는 연애 스타일이에요. 겉으로 시선을 끌진 않지만, 시간을 두고 볼수록 진가를 알 수 있는 중후하고 깊은 매력이 흘러요.",
    appearance: [
      "정돈되고 흐트러짐 없는 깔끔한 인상",
      "매우 섬세하고 힘 있는 페이스 라인",
      "고급스러움을 발산하는 절제된 아우라",
    ],
  },
  己: {
    headline: "묵묵히 곁을 지키는 안정감 마스터",
    summary:
      "기토일간은 농사짓는 땅처럼 묵묵히 상대를 길러내고 돌보는 가장 헌신적이고 현실적인 연애 타입이에요. 요란하지 않고 조용한 분위기 속에서 디테일한 부분까지 챙기는 살뜰한 매력이 있어요.",
    appearance: [
      "차분하고 정적인 분위기의 소유자",
      "디테일한 부분까지 챙기는 살뜰한 실속파",
      "뛰어난 생활력과 알뜰한 관리 능력",
    ],
  },
  庚: {
    headline: "흔들림 없는 신뢰, 강철 로맨티스트",
    summary:
      "경금일간은 사랑하는 사람에게 흔들림 없는 신뢰와 강력한 보호를 제공하는 의리파예요. 다듬어지지 않은 원석처럼 강인한 신념과 냉철한 카리스마가 외적인 매력으로 나타나요.",
    appearance: [
      "흔들림 없는 강인한 신념과 의지",
      "냉철하고 단호한 카리스마",
      "추진력과 결단력이 뛰어난 리더 타입",
    ],
  },
  辛: {
    headline: "예리한 완벽함, 빛나는 보석 같은 귀티",
    summary:
      "신금일간은 잘 연마된 보석처럼 자신을 꾸미고, 관계에서도 예리한 감각으로 최상의 완벽함을 추구하는 이상적인 연애 타입이에요. 섬세하고 깔끔한 외모에서 뿜어져 나오는 귀티가 매력이에요.",
    appearance: [
      "예리하고 섬세한 완벽주의 성향",
      "냉철해 보이지만 의리가 강한 반전 매력",
      "깔끔하고 정제된 외모에서 풍기는 귀티",
    ],
  },
  壬: {
    headline: "깊은 지혜의 바다, 포용력 마스터",
    summary:
      "임수일간은 끝없이 넓은 바다처럼 모든 것을 담아낼 수 있는 포용력으로 상대를 이해하고 감싸주는 연애 타입이에요. 생각이 깊고 넉넉하여 신뢰감을 주는 듬직한 분위기가 매력적입니다.",
    appearance: [
      "넓고 깊은 마음으로 타인을 포용하는 지혜",
      "넉넉하고 듬직하여 신뢰감을 주는 이미지",
      "철학적인 깊이가 느껴지는 사색가적 면모",
    ],
  },
  癸: {
    headline: "촉촉한 감성의 소유자, 예술적 영감의 샘",
    summary:
      "계수일간은 비나 이슬처럼 촉촉하고 섬세한 감성으로 상대를 위로하고 감싸주며, 조용히 헌신하는 연애 타입이에요. 차분한 분위기 속에서 은은한 예술적 영감을 발산하는 매력이 있어요.",
    appearance: [
      "감성이 풍부한 예술적 영감의 소유자",
      "차분함 속에 숨겨진 섬세한 감정 기복",
      "주변에 풍요와 안정을 가져다주는 매력",
    ],
  },
};

// 일간 성향 설명 렌더링
function renderDayMasterDesc(char) {
  const data = dayMasterData[char];
  const wrap = document.getElementById("dayMasterDescWrap");

  if (!data) {
    wrap.style.display = "none";
    return;
  }

  document.getElementById("dayMasterHeadline").textContent = data.headline;
  document.getElementById("dayMasterSummary").textContent = data.summary;

  const list = document.getElementById("dayMasterAppearance");
  list.innerHTML = data.appearance.map((item) => `<li>${item}</li>`).join("");
}

// 연애 사주 분석 버튼 이벤트 - 결제 오버레이 표시
const analyzeLoveBtn = document.getElementById("analyzeLoveBtn2");
const analyzeOverlay = document.getElementById("analyzeOverlay");
const paymentOverlay = document.getElementById("paymentOverlay");
const closePaymentBtn = document.getElementById("closePaymentBtn");

// 분석 버튼 클릭 핸들러
function handleAnalyzeClick() {
  if (!currentData || !currentData.sajuData) {
    alert("사주 데이터를 찾을 수 없습니다.");
    return;
  }

  if (SKIP_TOSS_PAYMENT) {
    // 👉 테스트 편의를 위해 결제 없이 바로 결과 페이지로 이동
    location.href = `/saju-love/saju-result/?id=${encodeURIComponent(
      currentData.id
    )}`;
    return;
  }

  // 결제 페이지에 사주 요약 정보 채우기
  fillPaymentSajuSummary(currentData.sajuData);

  // 결제 오버레이 표시
  document.body.style.overflow = "hidden";
  startTossPayment(currentData.id);
}

// 버튼 이벤트 연결
if (analyzeLoveBtn) {
  analyzeLoveBtn.addEventListener("click", handleAnalyzeClick);
}

// 결제 페이지 사주 요약 채우기
function fillPaymentSajuSummary(sajuData) {
  const dm = sajuData.dayMaster || {};
  const lf = sajuData.loveFacts || {};
  const fe = sajuData.fiveElements || {};

  // 일간
  const dayMasterText = dm.title ? `${dm.char} (${dm.title})` : dm.char || "—";
  document.getElementById("paymentDayMaster").textContent = dayMasterText;

  // 신강/신약
  document.getElementById("paymentStrength").textContent = fe.strength || "—";

  // 도화살
  const peach = lf.peachBlossom || {};
  const targetBranch = Array.isArray(peach.targetBranch)
    ? peach.targetBranch.join(", ")
    : peach.targetBranch || "";
  const hasPeach =
    peach.hasPeach || (peach.positions && peach.positions.length > 0);
  const peachText = hasPeach ? `있음 (${targetBranch})` : "없음";
  document.getElementById("paymentPeach").textContent = peachText;

  // 배우자별
  const spouse = lf.spouseStars || {};
  const spouseType = lf.spouseTargetType || "";
  const spouseCount = spouse.hitCount || 0;
  const spouseText =
    spouseCount > 0 ? `${spouseType} ${spouseCount}개` : "없음";
  document.getElementById("paymentSpouse").textContent = spouseText;
}

// 토스 페이먼츠 결제 시작
async function startTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + new Date().getTime();

  paymentOverlay.style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    paymentWidget.renderPaymentMethods("#payment-method", { value: 9900 });
    paymentWidget.renderAgreement("#agreement");

    document.getElementById("payment-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `saju-love_${Date.now()}`,
          orderName: "AI 연애 사주 심층 분석",
          customerName: currentData.input?.userName || "고객",
          successUrl: `${
            window.location.origin
          }/saju-love/success.html?id=${encodeURIComponent(resultId)}`,
          failUrl: `${
            window.location.origin
          }/saju-love/fail.html?id=${encodeURIComponent(resultId)}`,
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

  // 1초 후 깜짝 할인 결제창 열기
  setTimeout(() => {
    startDiscountedPayment();
    document.body.style.overflow = "hidden";
  }, 1000);
}

closePaymentBtn.addEventListener("click", closePayment);

// 깜짝 할인 결제
async function startDiscountedPayment() {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
  const customerKey = "customer_" + Date.now();

  const discountOverlay = document.getElementById("discountOverlay");
  discountOverlay.style.display = "block";

  // 할인 모달에 사주 정보 표시
  if (currentData?.sajuData) {
    const saju = currentData.sajuData;
    document.getElementById("discountDayMaster").textContent =
      saju.dayMaster?.char + " " + saju.dayMaster?.title || "—";
    document.getElementById("discountStrength").textContent =
      saju.strength || "—";
    document.getElementById("discountPeach").textContent =
      saju.peachBlossom?.hasPeach ? "있음" : "없음";
    document.getElementById("discountSpouse").textContent =
      saju.spouseElement?.summary || "—";
  }

  try {
    const widget = PaymentWidget(clientKey, customerKey);
    widget.renderPaymentMethods("#discount-method", { value: 7900 });
    widget.renderAgreement("#discount-agreement");

    document.getElementById("discount-button").onclick = async () => {
      try {
        await widget.requestPayment({
          orderId: `discount_${Date.now()}`,
          orderName: "연애 사주 심층 분석 - 할인 특가",
          customerName: "고객",
          successUrl: `${window.location.origin}/saju-love/success.html?id=${resultId}`,
          failUrl: `${window.location.origin}/saju-love/fail.html?id=${resultId}`,
        });
      } catch (err) {
        alert("할인 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("할인 결제 위젯 로드 실패: " + e.message);
  }
}

// 깜짝 할인 창 닫기
function closeDiscount() {
  document.getElementById("discountOverlay").style.display = "none";
  document.getElementById("discount-method").innerHTML = "";
  document.getElementById("discount-agreement").innerHTML = "";
  document.body.style.overflow = "";
}

document.getElementById("closeDiscountBtn").addEventListener("click", closeDiscount);

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
