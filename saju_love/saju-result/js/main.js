// IndexedDB 설정
const DB_NAME = "SajuLoveDB";
const DB_VERSION = 2;
const STORE_NAME = "results";

// DOM 요소
const loadingWrap = document.getElementById("loadingWrap");
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
      if (getReq.result && getReq.result.loveAnalysis) {
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
    .replace(/^#### (.*$)/gim, "<h3>$1</h3>")
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
