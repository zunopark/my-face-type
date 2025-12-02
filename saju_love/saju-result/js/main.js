// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// API 엔드포인트
const SAJU_LOVE_API =
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

// 연애 사주 분석 API 호출
async function fetchLoveAnalysis(data) {
  updateLoadingText("연애 사주를 분석하고 있습니다...");

  try {
    // 연애 고민 + 연애 상태 + 관심사 합치기
    const statusMap = {
      single: "솔로",
      dating: "연애중",
      complicated: "복잡해요",
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

    console.log("연애 사주 분석 요청:", payload);

    const res = await fetchWithTimeout(
      SAJU_LOVE_API,
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

    // DB에 저장
    data.loveAnalysis = loveResult;
    await saveData(data);

    // 렌더링
    renderResult(data);
  } catch (err) {
    console.error("분석 API 실패:", err);
    showError("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
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
  const { loveAnalysis } = data;
  const userName = loveAnalysis.user_name || "고객";

  // 트랙 생성
  chaptersTrack = document.createElement("div");
  chaptersTrack.className = "chapters_track";

  // 1. 인트로 슬라이드
  chaptersTrack.appendChild(createIntroSlide(userName, data));

  // 2. 챕터 슬라이드들
  const chapters = loveAnalysis.chapters || [];
  chapters.forEach((chapter, index) => {
    chaptersTrack.appendChild(createChapterSlide(chapter, index, data));
  });

  // 3. 이상형 이미지 슬라이드 (있을 경우)
  if (loveAnalysis.ideal_partner_image?.image_base64) {
    chaptersTrack.appendChild(
      createIdealTypeSlide(loveAnalysis.ideal_partner_image, userName)
    );
  }

  // 4. 마지막 슬라이드
  chaptersTrack.appendChild(createEndingSlide());

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

// 인트로 슬라이드 생성
function createIntroSlide(userName, data) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide intro_slide";

  const sajuData = data?.sajuData || {};
  const dayMasterCard = buildDayMasterSummary(sajuData, userName);
  const pillarTable = buildPillarTable(sajuData);
  const tocCard = buildTableOfContents();

  slide.innerHTML = `
    <div class="chapter_content_wrap intro_compact">
      <div class="intro_header">
        <span class="intro_label">연애 리포트</span>
        <h1 class="intro_title">${userName}님의 맞춤 분석</h1>
        <p class="intro_subtitle">아래 순서대로 리포트를 안내드릴게요.</p>
      </div>
      ${dayMasterCard}
      ${pillarTable}
      ${tocCard}
    </div>
  `;
  return slide;
}

function buildDayMasterSummary(sajuData, userName = "고객") {
  const dayMaster = sajuData?.dayMaster || {};
  const strength =
    sajuData?.loveFacts?.dayMasterStrength ||
    sajuData?.fiveElements?.strength ||
    "—";
  const elementKo = toKoreanElement(dayMaster.element);
  const yinYangKo = toKoreanYinYang(dayMaster.yinYang);

  return `
    <div class="daymaster_card">
      <div class="daymaster_header">
        <span class="material-icons">auto_awesome</span>
        <div>
          <div class="daymaster_label">${escapeHTML(userName)}님의 일간</div>
          <div class="daymaster_sub_label">타고난 기질 한눈에 보기</div>
        </div>
      </div>
      <div class="daymaster_main">
        <span class="daymaster_char">${escapeHTML(dayMaster.char || "—")}</span>
        <div class="daymaster_info">
          <div class="daymaster_title">${escapeHTML(
            dayMaster.title || "—"
          )}</div>
          <div class="daymaster_meta">
            <span>${escapeHTML(elementKo)} / ${escapeHTML(yinYangKo)}</span>
            <span>신강도: ${escapeHTML(strength)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildPillarTable(sajuData) {
  const pillars = sajuData?.pillars || {};
  const labels = { year: "년주", month: "월주", day: "일주", hour: "시주" };

  const rows = ["year", "month", "day", "hour"]
    .map((key) => buildPillarRow(labels[key], pillars[key]))
    .join("");

  return `
    <div class="pillar_table_wrap">
      <div class="pillar_table_title">사주 팔자 요약</div>
      <div class="pillar_table">${rows}</div>
    </div>
  `;
}

function buildPillarRow(label, pillar) {
  const stemChar = pillar?.stem?.char || "—";
  const branchChar = pillar?.branch?.char || "—";
  const stemKo = pillar?.stem?.korean || "";
  const branchKo = pillar?.branch?.korean || "";
  const tenGodStem = pillar?.tenGodStem || "—";
  const tenGodBranch = pillar?.tenGodBranchMain || "—";

  return `
    <div class="pillar_row">
      <div class="pillar_label">${label}</div>
      <div class="pillar_chars">
        <span class="pillar_char">${escapeHTML(stemChar)}</span>
        <span class="pillar_char">${escapeHTML(branchChar)}</span>
      </div>
      <div class="pillar_korean">${escapeHTML(stemKo + branchKo)}</div>
      <div class="pillar_tengod">${escapeHTML(
        `${tenGodStem} / ${tenGodBranch}`
      )}</div>
    </div>
  `;
}

function buildTableOfContents() {
  const sections = [
    {
      title: "1장. 연애 총운 개요",
      desc: "평생 연애 흐름 · 향후 3년 운세 · 이번 달 기회",
    },
    {
      title: "2장. 사주팔자와 매력",
      desc: "첫인상 · 연애 장점 · 잘 맞는 만남 방식",
    },
    {
      title: "3장. 운명의 상대",
      desc: "이상형 특징 · 만나는 시점과 장소 · 공략법",
    },
    {
      title: "4장. 사전 질문 답변",
      desc: "고민에 대한 심층 상담과 실행 조언",
    },
  ];

  return `
    <div class="toc_card">
      <div class="toc_title">이번 리포트 구성</div>
      <ul class="toc_list">
        ${sections
          .map(
            (section) => `
              <li class="toc_item">
                <div class="toc_item_title">${section.title}</div>
                <div class="toc_item_desc">${section.desc}</div>
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
          <div class="concern_box_header">
            <span class="material-icons">chat_bubble_outline</span>
            <span class="concern_box_title">${
              data.input.userName || "고객"
            }님이 남긴 고민</span>
          </div>
          <div class="concern_box_content">
            ${concernLines
              .map((line) => `<p>${escapeHTML(line.trim())}</p>`)
              .join("")}
          </div>
        </div>
      `;
    }
  }

  // 내용 처리: 소제목(###1., ###2. 등)을 구조화하여 표시
  let content = chapter.content || "";
  content = formatChapterContent(content);

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

  // 소제목 패턴: ###1., ###2., ###3. 또는 ### 1., ### 2. 등
  // 먼저 소제목이 있는지 확인
  const sectionPattern = /###\s*(\d+)\.\s*(.+?)(?:\n|$)/g;
  const hasSections = sectionPattern.test(content);

  // 패턴을 다시 사용하기 위해 리셋
  sectionPattern.lastIndex = 0;

  if (!hasSections) {
    // 소제목이 없는 경우 전체를 마크다운으로 처리
    return simpleMD(content);
  }

  // 소제목이 있는 경우 섹션으로 분리
  let formatted = "";
  let lastIndex = 0;
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
    const sectionContent = content.substring(sectionStart, sectionEnd).trim();

    // 섹션 HTML 생성
    formatted += `
      <div class="chapter_section">
        <h3 class="section_title">
          <span class="section_number">${section.number}</span>
          <span class="section_text">${escapeHTML(section.title)}</span>
        </h3>
        <div class="section_content">${simpleMD(sectionContent)}</div>
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

// 이상형 이미지 슬라이드 생성
function createIdealTypeSlide(idealPartner, userName) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide ideal_type_slide";

  slide.innerHTML = `
    <div class="chapter_content_wrap">
      <div class="chapter_header">
        <div class="chapter_number ideal_type_icon">
          <span class="material-icons">person</span>
        </div>
        <h2 class="chapter_title">${userName}님의 이상형</h2>
      </div>
      <div class="ideal_type_content">
        <div class="ideal_type_image_wrap">
          <img src="data:image/png;base64,${idealPartner.image_base64}" alt="이상형 이미지" class="ideal_type_image" />
        </div>
        <p class="ideal_type_desc">
          사주 분석을 바탕으로 AI가 그려낸<br>${userName}님에게 어울리는 이상형입니다
        </p>
      </div>
    </div>
  `;
  return slide;
}

// 마지막 슬라이드 생성
function createEndingSlide() {
  const slide = document.createElement("div");
  slide.className = "chapter_slide ending_slide";
  slide.innerHTML = `
    <div class="chapter_content_wrap">
      <div class="ending_icon">💕</div>
      <h2 class="ending_title">분석이 완료되었습니다</h2>
      <p class="ending_subtitle">당신의 연애운이<br>좋은 방향으로 흘러가길 바랍니다</p>
      <div class="ending_buttons">
        <a href="/saju_love/" class="action_btn primary">
          <span class="material-icons">refresh</span>
          다시 분석하기
        </a>
        <a href="/" class="action_btn secondary">
          <span class="material-icons">home</span>
          홈으로
        </a>
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

  // 터치 스와이프
  let touchStartX = 0;
  let touchEndX = 0;

  chaptersContainer.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
    },
    { passive: true }
  );

  chaptersContainer.addEventListener(
    "touchend",
    (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    },
    { passive: true }
  );

  function handleSwipe() {
    const diff = touchStartX - touchEndX;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentSlide < totalSlides - 1) {
        currentSlide++;
        updateSlider();
      } else if (diff < 0 && currentSlide > 0) {
        currentSlide--;
        updateSlider();
      }
    }
  }

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
