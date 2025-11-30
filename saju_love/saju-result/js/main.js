// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// API 엔드포인트
const SAJU_LOVE_API = "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/saju_love/analyze";

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

    // 결제 안 했으면 에러
    if (!data.paid) {
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
    new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), ms))
  ]);
}

// 연애 사주 분석 API 호출
async function fetchLoveAnalysis(data) {
  updateLoadingText("연애 사주를 분석하고 있습니다...");

  try {
    // 연애 고민 + 연애 상태 + 관심사 합치기
    const statusMap = { single: "솔로", dating: "연애중", complicated: "복잡해요" };
    const interestMap = { timing: "연애 시기", type: "이상형", compatibility: "궁합", marriage: "결혼운" };

    let combinedConcern = data.input?.userConcern || "";
    if (data.input?.status) {
      combinedConcern += `\n현재 연애 상태: ${statusMap[data.input.status] || data.input.status}`;
    }
    if (data.input?.interests?.length > 0) {
      const interestNames = data.input.interests.map(i => interestMap[i] || i).join(", ");
      combinedConcern += `\n특히 궁금한 것: ${interestNames}`;
    }

    const payload = {
      saju_data: data.sajuData,
      user_name: data.input?.userName || "",
      user_concern: combinedConcern.trim(),
      year: new Date().getFullYear()
    };

    console.log("연애 사주 분석 요청:", payload);

    const res = await fetchWithTimeout(SAJU_LOVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, 120000);

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
  chaptersTrack.appendChild(createIntroSlide(userName));

  // 2. 챕터 슬라이드들
  const chapters = loveAnalysis.chapters || [];
  chapters.forEach((chapter, index) => {
    chaptersTrack.appendChild(createChapterSlide(chapter, index));
  });

  // 3. 마지막 슬라이드
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
function createIntroSlide(userName) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide intro_slide";
  slide.innerHTML = `
    <div class="chapter_content_wrap">
      <div class="intro_icon">
        <span class="material-symbols-outlined">favorite</span>
      </div>
      <h1 class="intro_title">연애 사주 분석 결과</h1>
      <p class="intro_subtitle">${userName}님의 연애 사주</p>
      <div class="intro_guide">
        <span class="material-icons">swipe</span>
        <span>옆으로 넘겨서 확인하세요</span>
      </div>
    </div>
  `;
  return slide;
}

// 챕터 슬라이드 생성
function createChapterSlide(chapter, index) {
  const slide = document.createElement("div");
  slide.className = "chapter_slide";

  let titleText = chapter.title || `챕터 ${index + 1}`;
  titleText = titleText.replace(/^#+\s*/, "").trim();

  let content = chapter.content || "";
  content = simpleMD(content);

  slide.innerHTML = `
    <div class="chapter_content_wrap">
      <div class="chapter_header">
        <div class="chapter_number">${index + 1}</div>
        <h2 class="chapter_title">${titleText}</h2>
      </div>
      <div class="chapter_body">${content}</div>
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
