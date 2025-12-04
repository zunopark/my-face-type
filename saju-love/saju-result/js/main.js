// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// API 엔드포인트
const saju_love_API =
  "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju_love/analyze";

// ✅ 테스트용 결제 생략 플래그
// true  : Toss 결제 완료 여부 검사 없이 결과 렌더링
// false : 기존 결제 검사 유지
const SKIP_TOSS_PAYMENT_GUARD = true;

// DOM 요소
const loadingWrap = document.getElementById("loadingWrap");
const loadingText = document.getElementById("loadingText");
const errorWrap = document.getElementById("errorWrap");
const resultWrap = document.getElementById("resultWrap");
const chaptersContainer = document.getElementById("chaptersContainer");
const prevBtn = document.getElementById("prevChapter");
const nextBtn = document.getElementById("nextChapter");
const currentChapterEl = document.getElementById("currentChapter");
const totalChaptersEl = document.getElementById("totalChapters");
const progressFill = document.getElementById("progressFill");

let currentSlide = 0;
let totalSlides = 0;
let chaptersTrack = null;
let db = null;
let isInitialized = false; // 중복 호출 방지 플래그
let isFetchingAnalysis = false; // API 호출 중복 방지 플래그

// URL에서 ID 가져오기
const urlParams = new URLSearchParams(window.location.search);
const resultId = urlParams.get("id");

if (!resultId) {
  showError("결과를 찾을 수 없습니다.");
} else {
  initApp();
}

// 앱 초기화
async function initApp() {
  // 중복 호출 방지
  if (isInitialized) {
    console.log("initApp 이미 실행됨 - 중복 호출 무시");
    return;
  }
  isInitialized = true;

  try {
    db = await openDB();
    const data = await getData(resultId);

    if (!data) {
      showError("데이터를 찾을 수 없습니다.");
      return;
    }

    // 결제 완료 여부 (테스트 시에는 건너뜀)
    if (!SKIP_TOSS_PAYMENT_GUARD && !data.paid) {
      showError("결제가 완료되지 않았습니다.");
      return;
    }

    // loveAnalysis가 있으면 바로 렌더링
    if (data.loveAnalysis) {
      renderResult(data);
      return;
    }

    // loveAnalysis가 없으면 API 호출
    await fetchLoveAnalysis(data);
  } catch (err) {
    console.error("초기화 실패:", err);
    showError(err.message || "오류가 발생했습니다.");
  }
}

// IndexedDB 열기
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = (e) => resolve(e.target.result);
  });
}

// 데이터 가져오기
function getData(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 데이터 저장
function saveData(data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(data);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// fetch with timeout
function fetchWithTimeout(url, opts = {}, ms = 120000) {
  return Promise.race([
    fetch(url, opts),
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms)),
  ]);
}

// 로딩 메시지 순환
let loadingMessageInterval = null;
function startLoadingMessages(userName) {
  const messages = [
    `${userName}님의 사주 팔자를 분석하고 있어요`,
    "완료하는 데 2~3분 정도 걸려요",
    "지금 페이지를 나가면 분석이 완료되지 않을 수 있어요",
    `${userName}님의 연애 성향을 파악하고 있어요`,
    "운명의 상대를 찾고 있어요",
    "곧 분석이 완료됩니다",
  ];
  let index = 0;

  // 첫 번째 메시지 즉시 표시
  updateLoadingText(messages[0]);

  // 4초마다 메시지 변경
  loadingMessageInterval = setInterval(() => {
    index = (index + 1) % messages.length;
    updateLoadingText(messages[index]);
  }, 4000);
}

function stopLoadingMessages() {
  if (loadingMessageInterval) {
    clearInterval(loadingMessageInterval);
    loadingMessageInterval = null;
  }
}

// 연애 사주 분석 API 호출
async function fetchLoveAnalysis(data, retryCount = 0) {
  const MAX_RETRIES = 2; // 최대 2번 재시도 (총 3번 시도)
  const userName = data.input?.userName || "고객";

  // 중복 호출 방지 (재시도가 아닌 첫 호출일 때만 체크)
  if (retryCount === 0) {
    if (isFetchingAnalysis) {
      console.log("fetchLoveAnalysis 이미 실행 중 - 중복 호출 무시");
      return;
    }
    isFetchingAnalysis = true;
    startLoadingMessages(userName);
  }

  try {
    // 연애 고민 + 연애 상태 + 관심사 합치기
    const statusMap = {
      single: "솔로",
      some: "썸 타는 중",
      breakup: "이별 고민중",
    };
    const interestMap = {
      timing: "연애 시기",
      type: "이상형",
      compatibility: "궁합",
      marriage: "결혼운",
    };

    let combinedConcern = data.input?.userConcern || "";
    if (data.input?.status) {
      combinedConcern += `\n현재 연애 상태: ${
        statusMap[data.input.status] || data.input.status
      }`;
    }
    if (data.input?.interests?.length > 0) {
      const interestNames = data.input.interests
        .map((i) => interestMap[i] || i)
        .join(", ");
      combinedConcern += `\n특히 궁금한 것: ${interestNames}`;
    }

    const payload = {
      saju_data: data.sajuData,
      user_name: data.input?.userName || "",
      user_concern: combinedConcern.trim(),
      year: new Date().getFullYear(),
    };

    console.log(
      `연애 사주 분석 요청 (시도 ${retryCount + 1}/${MAX_RETRIES + 1}):`,
      payload
    );

    const res = await fetchWithTimeout(
      saju_love_API,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      120000
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`분석 실패: ${errText}`);
    }

    const loveResult = await res.json();
    console.log("연애 사주 분석 결과:", loveResult);

    // 이미지 생성 실패 체크 - 이미지가 없으면 재시도
    const hasImage = loveResult.ideal_partner_image?.image_base64;
    if (!hasImage && retryCount < MAX_RETRIES) {
      console.log(
        `이미지 생성 실패, 재시도 중... (${retryCount + 1}/${MAX_RETRIES})`
      );
      updateLoadingText("이미지 생성 재시도 중...");
      return fetchLoveAnalysis(data, retryCount + 1);
    }

    if (!hasImage) {
      console.warn("이미지 생성 최종 실패 - 이미지 없이 결과 표시 불가");
      throw new Error("이미지 생성에 실패했습니다.");
    }

    // DB에 저장
    data.loveAnalysis = loveResult;
    await saveData(data);

    // 로딩 메시지 중지
    stopLoadingMessages();

    // 렌더링
    renderResult(data);
  } catch (err) {
    // 로딩 메시지 중지
    stopLoadingMessages();

    console.error("분석 API 실패:", err);
    if (err.message === "TIMEOUT") {
      showError("서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
    } else if (
      err.message?.includes("Failed to fetch") ||
      err.message?.includes("503")
    ) {
      showError(
        "서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요."
      );
    } else if (err.message?.includes("이미지 생성")) {
      showError(
        "이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } else {
      showError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }
}

// 로딩 텍스트 업데이트
function updateLoadingText(text) {
  if (loadingText) {
    loadingText.textContent = text;
  }
}

// 에러 표시
function showError(message) {
  loadingWrap.classList.add("hidden");
  errorWrap.classList.remove("hidden");
  const errorText = errorWrap.querySelector(".error_text");
  if (errorText && message) {
    errorText.textContent = message;
  }
}

// 결과 렌더링
function renderResult(data) {
  const { loveAnalysis, input } = data;
  const userName = loveAnalysis.user_name || "고객";

  // Mixpanel 트래킹 (유저 정보 포함)
  if (typeof mixpanel !== "undefined") {
    mixpanel.track("연애 사주 결과 페이지 방문", {
      userName: input?.userName || userName,
      birthDate: input?.date || "",
      gender: input?.gender || "",
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });
  }

  // 트랙 생성
  chaptersTrack = document.createElement("div");
  chaptersTrack.className = "chapters_track";

  // 슬라이드 라벨 초기화
  slideLabels = [];

  // 1. 인트로 슬라이드 (사주 정보)
  chaptersTrack.appendChild(createIntroSlide(userName, data));
  slideLabels.push(`${userName}님의 사주 원국`);

  // 2. 목차 슬라이드
  chaptersTrack.appendChild(createTocSlide(userName));
  slideLabels.push("리포트 구성 안내");

  // 3. 챕터 슬라이드들
  const chapters = loveAnalysis.chapters || [];
  chapters.forEach((chapter, index) => {
    chaptersTrack.appendChild(createChapterSlide(chapter, index, data));
    slideLabels.push(`${index + 1}장`);
  });

  // 4. 마지막 슬라이드
  chaptersTrack.appendChild(createEndingSlide());
  slideLabels.push("색동낭자의 인사말");

  chaptersContainer.appendChild(chaptersTrack);

  // 슬라이드 초기화
  totalSlides = chaptersTrack.children.length;
  totalChaptersEl.textContent = totalSlides;
  updateSlider();
  setupEvents();

  // 표시
  loadingWrap.classList.add("hidden");
  resultWrap.classList.remove("hidden");
}

// 인트로 슬라이드 생성 (사주 정보만)
function createIntroSlide(userName, data) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide intro_slide";

  const sajuData = data?.sajuData || {};
  const input = data?.input || {};
  const infoCard = buildInfoCard(userName, input, sajuData);
  const pillarsGrid = buildPillarsGrid(sajuData);
  const loveFactsCard = buildLoveFactsCard(sajuData);

  slide.innerHTML = `
    <div class="chapter_content_wrap intro_compact">
      <div class="intro_header">
        <span class="intro_label">연애 리포트</span>
        <h1 class="intro_title">연애 사주 분석 보고서</h1>
        <p class="intro_subtitle">분석에 사용된 사주 정보입니다</p>
      </div>
      ${infoCard}
      ${pillarsGrid}
      ${loveFactsCard}
    </div>
  `;
  return slide;
}

// 목차 슬라이드 생성
function createTocSlide(userName) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide toc_slide";

  const tocCard = buildTableOfContents();

  slide.innerHTML = `
    <div class="chapter_content_wrap intro_compact">
      <div class="intro_header">
        <span class="intro_label">리포트 안내</span>
        <h1 class="intro_title">${userName}님의 맞춤 분석</h1>
        <p class="intro_subtitle">아래 순서대로 리포트를 안내드릴게요</p>
      </div>
      ${tocCard}
    </div>
  `;
  return slide;
}

// 시간을 시(時) 이름으로 변환
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

// 기본 정보 카드 (이름, 생년월일, 시, 일간)
function buildInfoCard(userName, input, sajuData) {
  const dayMaster = sajuData?.dayMaster || {};
  const birthDate = input?.date || "";
  const birthTime = formatTimeToSi(input?.time);
  const birthDateText = birthTime ? `${birthDate} | ${birthTime}` : birthDate;

  return `
    <div class="info_card">
      <div class="info_main">
        <span class="info_name">${escapeHTML(userName)}</span>
        <span class="info_birth">${escapeHTML(birthDateText)}</span>
      </div>
      <div class="info_ilju">
        <span class="ilju_char">${escapeHTML(dayMaster.char || "—")}</span>
        <span class="ilju_title">${escapeHTML(dayMaster.title || "—")}</span>
      </div>
    </div>
  `;
}

// 사주 팔자 그리드 (saju-detail 스타일)
function buildPillarsGrid(sajuData) {
  const pillars = sajuData?.pillars || {};
  const labels = { hour: "시주", day: "일주", month: "월주", year: "년주" };

  // 오행 색상 맵
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

  const pillarItems = ["hour", "day", "month", "year"]
    .map((key) => {
      const p = pillars[key] || {};
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

      return `
      <div class="pillar_item">
        <div class="pillar_label">${labels[key]}</div>
        <div class="pillar_chars">
          <div class="pillar_char_wrap" style="background: ${stemBgColor}">
            <span class="pillar_stem" style="color: ${stemColor}">${escapeHTML(
        stemChar
      )}</span>
            <span class="pillar_ten_god">${escapeHTML(tenGodStem)}</span>
          </div>
          <div class="pillar_char_wrap" style="background: ${branchBgColor}">
            <span class="pillar_branch" style="color: ${branchColor}">${escapeHTML(
        branchChar
      )}</span>
            <span class="pillar_ten_god">${escapeHTML(tenGodBranch)}</span>
          </div>
        </div>
        <div class="pillar_korean">${escapeHTML(stemKo + branchKo)}</div>
      </div>
    `;
    })
    .join("");

  return `
    <div class="pillars_section">
      <div class="pillars_header">
        <span class="material-icons">view_column</span>
        사주 팔자
      </div>
      <div class="pillars_wrap">${pillarItems}</div>
    </div>
  `;
}

// 연애 사주 핵심 정보 카드
function buildLoveFactsCard(sajuData) {
  const loveFacts = sajuData?.loveFacts || {};
  const fiveElements = sajuData?.fiveElements || {};
  const dayMaster = sajuData?.dayMaster || {};

  const strength = loveFacts.dayMasterStrength || fiveElements.strength || "—";
  const peach = loveFacts.peachBlossom || {};
  const spouse = loveFacts.spouseStars || {};
  const elementKo = toKoreanElement(dayMaster.element);
  const yinYangKo = toKoreanYinYang(dayMaster.yinYang);

  // 위치를 한자로 변환
  const positionToHanja = {
    year: "年",
    month: "月",
    day: "日",
    hour: "時",
  };
  const formatPositions = (positions) => {
    if (!positions || positions.length === 0) return "";
    return positions.map((p) => positionToHanja[p] || p).join(" ");
  };

  // 도화살 표시 (API에서 hasPeach로 반환)
  const hasPeach =
    peach.hasPeach || (peach.positions && peach.positions.length > 0);
  const peachText = hasPeach ? formatPositions(peach.positions) : "없음";

  // 배우자별 표시 (API에서 positions 배열로 반환)
  const hasSpouse = spouse.positions && spouse.positions.length > 0;
  const spouseText = hasSpouse ? formatPositions(spouse.positions) : "없음";

  return `
    <div class="love_facts_card">
      <div class="love_facts_header">
        <span class="material-icons">favorite</span>
        연애 사주 핵심
      </div>
      <div class="love_facts_grid">
        <div class="love_fact_item">
          <span class="love_fact_label">일간</span>
          <span class="love_fact_value">${escapeHTML(
            dayMaster.char || "—"
          )} ${escapeHTML(dayMaster.title || "")}</span>
        </div>
        <div class="love_fact_item">
          <span class="love_fact_label">오행/음양</span>
          <span class="love_fact_value">${escapeHTML(elementKo)} / ${escapeHTML(
    yinYangKo
  )}</span>
        </div>
        <div class="love_fact_item">
          <span class="love_fact_label">신강/신약</span>
          <span class="love_fact_value">${escapeHTML(strength)}</span>
        </div>
        <div class="love_fact_item">
          <span class="love_fact_label">도화살</span>
          <span class="love_fact_value ${
            hasPeach ? "highlight" : "muted"
          }">${escapeHTML(peachText)}</span>
        </div>
        <div class="love_fact_item">
          <span class="love_fact_label">배우자운</span>
          <span class="love_fact_value ${
            hasSpouse ? "highlight" : "muted"
          }">${escapeHTML(spouseText)}</span>
        </div>
      </div>
    </div>
  `;
}

function buildTableOfContents() {
  const chapters = [
    {
      title: "1장. 나만의 매력과 연애 성향",
      items: [
        "풀이 1. 처음 본 순간 이성이 느끼는 나의 매력",
        "풀이 2. 내 연애 스타일 장점과 숨겨진 반전 매력",
        "풀이 3. 인만추 vs 자만추 vs 결정사, 나에게 맞는 방식은",
        "풀이 4. 내가 끌리는 사람 vs 나에게 끌리는 사람",
      ],
    },
    {
      title: "2장. 앞으로 펼쳐질 사랑의 흐름",
      items: [
        "풀이 1. 앞으로의 연애 총운 흐름",
        "풀이 2. 향후 3년간 연애운 증폭 시기",
        "풀이 3. 바로 지금, 이번 달 연애 운세",
      ],
    },
    {
      title: "3장. 결국 만나게 될 운명의 상대",
      items: [
        "풀이 1. 운명의 짝, 그 사람의 모든 것",
        "풀이 2. 언제, 어떻게 만나게 될까",
        "풀이 3. 그 사람을 끌어당길 나만의 공략법",
      ],
    },
    {
      title: "4장. 색동낭자의 일침",
      items: [],
      desc: "입력한 고민에 대한 1:1 맞춤 상담",
    },
  ];

  return `
    <div class="toc_card">
      <div class="toc_title">이번 리포트 구성</div>
      <ul class="toc_list">
        ${chapters
          .map(
            (chapter) => `
              <li class="toc_item">
                <div class="toc_item_title">${chapter.title}</div>
                ${
                  chapter.desc
                    ? `<div class="toc_item_desc">${chapter.desc}</div>`
                    : `<ul class="toc_subitems">
                      ${chapter.items
                        .map((item) => `<li class="toc_subitem">${item}</li>`)
                        .join("")}
                    </ul>`
                }
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function toKoreanElement(element) {
  if (!element) return "—";
  const map = {
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
  };
  const key = typeof element === "string" ? element.toLowerCase() : element;
  return map[key] || element;
}

function toKoreanYinYang(value) {
  if (!value) return "—";
  const map = {
    yang: "양",
    yin: "음",
  };
  const key = typeof value === "string" ? value.toLowerCase() : value;
  return map[key] || value;
}

// 챕터 슬라이드 생성
function createChapterSlide(chapter, index, data) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide";

  // 제목 정리: [1장], [2장] 등의 마커 제거 및 정리
  let titleText = chapter.title || `챕터 ${index + 1}`;
  titleText = titleText
    .replace(/^#+\s*/, "") // 마크다운 헤더 제거
    .replace(/\[(\d+)장\]\s*/, "") // [1장] 형식 제거
    .replace(/^(\d+)장\s*/, "") // 1장 형식 제거
    .trim();

  // 4장(사전 질문 답변)인지 확인
  const isQuestionChapter =
    index === 3 ||
    titleText.includes("사전 질문") ||
    titleText.includes("질문 답변") ||
    chapter.title?.includes("4장");

  // 3장(운명의 상대)인지 확인
  const isDestinyChapter = index === 2;

  // 고민 내용 추출 (4장인 경우에만 표시)
  let concernBox = "";
  if (isQuestionChapter && data?.input?.userConcern) {
    const userConcern = data.input.userConcern.trim();
    if (userConcern) {
      // 여러 줄로 나뉘어진 고민을 처리
      const concernLines = userConcern
        .split("\n")
        .filter((line) => line.trim());
      concernBox = `
        <div class="concern_box">
          <div class="concern_box_label">${
            data.input.userName || "고객"
          }님이 남긴 고민</div>
          <div class="concern_box_content">
            <span class="concern_text">${concernLines
              .map((line) => escapeHTML(line.trim()))
              .join("<br>")}</span>
          </div>
        </div>
      `;
    }
  }

  // 내용 처리: 소제목(###1., ###2. 등)을 구조화하여 표시
  let content = chapter.content || "";

  // 3장인 경우 이상형 이미지를 풀이 1과 풀이 2 사이에 삽입
  if (
    isDestinyChapter &&
    data?.loveAnalysis?.ideal_partner_image?.image_base64
  ) {
    content = formatChapterContentWithIdealType(content, data);
  } else {
    content = formatChapterContent(content);
  }

  slide.innerHTML = `
    <div class="chapter_content_wrap chapter_compact">
      <div class="chapter_header">
        <span class="chapter_label">${index + 1}장</span>
        <h2 class="chapter_title">${titleText}</h2>
      </div>
      ${concernBox}
      <div class="chapter_body">${content}</div>
    </div>
  `;
  return slide;
}

// 챕터 내용 포맷팅: 소제목을 구조화하여 표시
function formatChapterContent(content) {
  if (!content) return "";

  // 풀이 패턴: ###풀이 1., ###풀이 2. 등 또는 기존 ###1., ###2. 형식
  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const hasSections = sectionPattern.test(content);

  // 패턴을 다시 사용하기 위해 리셋
  sectionPattern.lastIndex = 0;

  if (!hasSections) {
    // 소제목이 없는 경우 전체를 마크다운으로 처리
    return simpleMD(content);
  }

  // 소제목이 있는 경우 섹션으로 분리
  let formatted = "";
  const sections = [];

  // 모든 섹션 찾기
  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({
      number: match[1],
      title: match[2].trim(),
      startIndex: match.index,
      endIndex: sectionPattern.lastIndex,
    });
  }

  // 섹션별로 내용 추출 및 포맷팅
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    // 현재 섹션의 내용 추출
    const sectionStart = section.endIndex;
    const sectionEnd = nextSection ? nextSection.startIndex : content.length;
    let sectionContent = content.substring(sectionStart, sectionEnd).trim();

    // 하위 섹션(####) 처리
    sectionContent = formatSubsections(sectionContent);

    // 섹션 HTML 생성
    formatted += `
      <div class="chapter_section">
        <h3 class="section_title">
          <span class="section_number">${section.number}</span>
          <span class="section_text">${escapeHTML(section.title)}</span>
        </h3>
        <div class="section_content">${sectionContent}</div>
      </div>
    `;
  }

  // 첫 번째 섹션 이전의 내용이 있으면 추가
  if (sections.length > 0 && sections[0].startIndex > 0) {
    const beforeContent = content.substring(0, sections[0].startIndex).trim();
    if (beforeContent) {
      formatted = simpleMD(beforeContent) + formatted;
    }
  }

  return formatted;
}

// 하위 섹션(####) 포맷팅
function formatSubsections(content) {
  if (!content) return "";

  // #### 패턴 확인
  const subsectionPattern = /####\s*(.+?)(?:\n|$)/g;
  const hasSubsections = subsectionPattern.test(content);
  subsectionPattern.lastIndex = 0;

  if (!hasSubsections) {
    return simpleMD(content);
  }

  let formatted = "";
  const subsections = [];
  let match;

  while ((match = subsectionPattern.exec(content)) !== null) {
    subsections.push({
      title: match[1].trim(),
      startIndex: match.index,
      endIndex: subsectionPattern.lastIndex,
    });
  }

  // 첫 번째 하위 섹션 이전의 내용
  if (subsections.length > 0 && subsections[0].startIndex > 0) {
    const beforeContent = content
      .substring(0, subsections[0].startIndex)
      .trim();
    if (beforeContent) {
      formatted += simpleMD(beforeContent);
    }
  }

  // 하위 섹션별로 내용 추출 및 포맷팅
  for (let i = 0; i < subsections.length; i++) {
    const subsection = subsections[i];
    const nextSubsection = subsections[i + 1];

    const subsectionStart = subsection.endIndex;
    const subsectionEnd = nextSubsection
      ? nextSubsection.startIndex
      : content.length;
    const subsectionContent = content
      .substring(subsectionStart, subsectionEnd)
      .trim();

    formatted += `
      <div class="subsection">
        <h4 class="subsection_title">${escapeHTML(subsection.title)}</h4>
        <div class="subsection_content">${simpleMD(subsectionContent)}</div>
      </div>
    `;
  }

  return formatted;
}

// 3장 전용: 이상형 이미지를 풀이 1과 풀이 2 사이에 삽입하는 포맷팅
function formatChapterContentWithIdealType(content, data) {
  if (!content) return "";

  const userName = data?.loveAnalysis?.user_name || "고객";
  const idealPartner = data?.loveAnalysis?.ideal_partner_image;

  // 풀이 패턴으로 섹션 분리
  const sectionPattern = /###\s*(?:풀이\s*)?(\d+)\.\s*(.+?)(?:\n|$)/g;
  const sections = [];

  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    sections.push({
      number: match[1],
      title: match[2].trim(),
      startIndex: match.index,
      endIndex: sectionPattern.lastIndex,
    });
  }

  if (sections.length === 0) {
    return simpleMD(content);
  }

  let formatted = "";

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const nextSection = sections[i + 1];

    const sectionStart = section.endIndex;
    const sectionEnd = nextSection ? nextSection.startIndex : content.length;
    let sectionContent = content.substring(sectionStart, sectionEnd).trim();
    sectionContent = formatSubsections(sectionContent);

    formatted += `
      <div class="chapter_section">
        <div class="section_title">
          <span class="section_number">${section.number}</span>
          <span class="section_text">${escapeHTML(section.title)}</span>
        </div>
        <div class="section_content">${sectionContent}</div>
      </div>
    `;

    // 풀이 1 다음에 이상형 이미지 삽입
    if (section.number === "1" && idealPartner?.image_base64) {
      formatted += `
        <div class="ideal_type_inline">
          <div class="ideal_type_header">
            <span class="ideal_type_label">드디어 공개!</span>
            <h3 class="ideal_type_title">${userName}님의 운명의 상대</h3>
          </div>
          <div class="ideal_type_image_wrap ideal_type_blurred" data-click-count="0">
            <img src="data:image/png;base64,${idealPartner.image_base64}" alt="이상형 이미지" class="ideal_type_image" />
          </div>
          <p class="ideal_type_tap_hint">사진을 클릭해보세요!</p>
        </div>
      `;
    }
  }

  return formatted;
}

// 마지막 슬라이드 생성
function createEndingSlide() {
  const slide = document.createElement("div");
  slide.className = "chapter_slide ending_slide";
  slide.innerHTML = `
    <div class="chapter_content_wrap">
      <div class="ending_header">
        <span class="ending_label">색동낭자의 인사말</span>
      </div>
      <div class="ending_message">
        <p>여기까지 긴 리포트를 읽어주셔서 감사합니다.</p>
        <p>사주는 정해진 운명이 아니라, 나를 더 잘 이해하고 더 나은 선택을 하기 위한 도구예요.</p>
        <p>당신의 사랑이 더 깊어지고, 더 따뜻해지길 진심으로 응원합니다.</p>
        <p class="ending_sign">- 색동낭자 드림</p>
      </div>
      <div class="ending_buttons">
        <a href="/saju-love/" class="action_btn primary">다른 사주 분석하기</a>
        <a href="/" class="action_btn secondary">홈으로</a>
      </div>
    </div>
  `;
  return slide;
}

// 슬라이더 업데이트
function updateSlider() {
  chaptersTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
  currentChapterEl.textContent = currentSlide + 1;

  prevBtn.disabled = currentSlide === 0;
  nextBtn.disabled = currentSlide === totalSlides - 1;

  const progress = ((currentSlide + 1) / totalSlides) * 100;
  progressFill.style.width = `${progress}%`;

  // 상단 라벨 업데이트
  if (topLabel && slideLabels[currentSlide]) {
    topLabel.textContent = slideLabels[currentSlide];
  }

  // 슬라이드 변경 시 스크롤 맨 위로
  const currentSlideEl = chaptersTrack.children[currentSlide];
  if (currentSlideEl) {
    currentSlideEl.scrollTop = 0;
  }
}

// 이벤트 설정
function setupEvents() {
  prevBtn.addEventListener("click", () => {
    if (currentSlide > 0) {
      currentSlide--;
      updateSlider();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentSlide < totalSlides - 1) {
      currentSlide++;
      updateSlider();
    }
  });

  // 이상형 이미지 블러 공개 인터랙션
  setupIdealTypeReveal();

  // 키보드
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && currentSlide > 0) {
      currentSlide--;
      updateSlider();
    } else if (e.key === "ArrowRight" && currentSlide < totalSlides - 1) {
      currentSlide++;
      updateSlider();
    }
  });
}

// 마크다운 파서
function simpleMD(src = "") {
  src = src.replace(
    /```([\s\S]*?)```/g,
    (_, c) => `<pre><code>${escapeHTML(c)}</code></pre>`
  );
  src = src.replace(/`([^`]+?)`/g, (_, c) => `<code>${escapeHTML(c)}</code>`);

  src = src
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>");

  src = src
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/___(.+?)___/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/_(.+?)_/g, "<em>$1</em>")
    .replace(/~~(.+?)~~/g, "<del>$1</del>");

  src = src
    .replace(/!\[([^\]]*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">')
    .replace(
      /\[([^\]]+?)\]\((.*?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );

  src = src.replace(/^\s*(\*\s*\*\s*\*|-{3,}|_{3,})\s*$/gm, "<hr>");
  src = src.replace(/^>\s+(.*)$/gm, "<blockquote>$1</blockquote>");

  src = src
    .replace(/^\s*[*+-]\s+(.+)$/gm, "<ul><li>$1</li></ul>")
    .replace(/(<\/ul>\s*)<ul>/g, "")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<ol><li>$1</li></ol>")
    .replace(/(<\/ol>\s*)<ol>/g, "");

  // 연속된 빈 줄 정리 후 줄바꿈 처리
  src = src.replace(/\n{2,}/g, "\n");
  src = src.replace(/\n(?!<)/g, "<br>\n");
  src = src.replace(/(<br>\s*){2,}/g, "<br>");

  return src;
}

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

// 이상형 이미지 블러 공개 인터랙션
function setupIdealTypeReveal() {
  const imageWrap = document.querySelector(".ideal_type_blurred");
  if (!imageWrap) return;

  const countEl = imageWrap.querySelector(".ideal_type_tap_count");
  const maxClicks = 5;

  imageWrap.addEventListener("click", () => {
    // 이미 공개된 경우 무시
    if (imageWrap.classList.contains("ideal_type_revealed")) return;

    let currentCount = parseInt(imageWrap.dataset.clickCount) || 0;
    currentCount++;
    imageWrap.dataset.clickCount = currentCount;

    const remaining = maxClicks - currentCount;

    if (remaining > 0) {
      if (countEl) countEl.textContent = `${remaining}번 남음`;
    } else {
      // 완전 공개
      imageWrap.classList.remove("ideal_type_blurred");
      imageWrap.classList.add("ideal_type_revealed");
    }
  });
}
