/* ───────── 1. 전역 변수 ───────── */
let selectedReportType = null; // wealth · love · marriage
let analysisDb = null; // IndexedDB 핸들

/* ───────── 2. 제품 카드 렌더링 ───────── */
// 프리미엄(유료) 카드
function renderPremiumFeatureResult() {
  const products = [
    {
      key: "base",
      emoji: "🐍",
      tag: ["🐍 정통 관상"],
      title: "내 미래가 보이는 부위별 정통 관상",
      desc: "+천기누설+",
      rating: 4.9,
      views: "4,500+",
      addDesc: "팔자 고치는 성형 및 시술 부위 추천",
      thumbnail: "/img/bgIMG.png",
    },
    {
      key: "love",
      emoji: "💖",
      tag: ["💖 연애운", "❤️‍🔥 19금 포함", "💋 색기"],
      title: "내 솔로 탈출 시기와 다음 연애",
      desc: "+천기누설+",
      rating: 4.9,
      views: "2,800+",
      addDesc: "지금 내 인연을 만날 수 있는 시・구 예측",
      thumbnail: "/img/loveBG.png",
    },
    {
      key: "wealth",
      emoji: "💸",
      tag: ["💸 재물운", "⏳ 인생 타이밍"],
      title: "10억, 100억 평생 모을 재산은?",
      desc: "+천기누설+",
      rating: 4.9,
      views: "10,000+",
      addDesc: "현금 폭탄 떨어질 인생 타이밍 & 방법",
      thumbnail: "/img/wealthBG.png",
    },

    {
      key: "marriage",
      emoji: "💍",
      tag: ["💍 결혼운", "🤝 배우자"],
      title: "얼굴에 보이는 내 결혼 나이",
      desc: "+천기누설+",
      rating: 4.8,
      views: "2,300+",
      addDesc: "결혼운이 보이는 장소 & 놓치면 안될 시기",
      thumbnail: "/img/marriageBG.png",
    },
    {
      key: "career",
      emoji: "💍",
      tag: ["💼 직업운", "💭 진로고민", "💰 천직"],
      title: "나의 직업 성형과 고점 시기",
      desc: "+천기누설+",
      rating: 4.8,
      views: "2,300+",
      addDesc: "연봉 그래프 상한가 찍을 부서・업종 안내",
      thumbnail: "/img/careerBG.png",
    },
  ];

  /* 2) 다른 스크립트(예: 결제·업로드 로직)에서도 접근할 수 있도록 전역에 보관 */
  window.premiumProducts = products;

  /* 3) 카드 HTML 생성 ― data-* 속성으로 추적용 메타데이터 심기 */
  const cardsHtml = products
    .map((p, idx) => {
      const tagsHtml = p.tag
        .map((t) => `<span class="product-tag">${t}</span>`)
        .join(" ");

      return `
    <div class="product-card"
         data-key="${p.key}"
         data-title="${p.title}"
         data-price="${p.price}"
         data-discount="${p.discount}"
         data-index="${idx + 1}"
         style="cursor:pointer;">
      <div class="product-image">
        <img src="${p.thumbnail}" alt="${p.key}" class="square-image">
      </div>
      <div class="product-info">
        <div class="product-tags">${tagsHtml}</div>
        <div class="product-title">${p.title}</div>
        <div class="product-meta">
          <div class="product-stats">${p.desc}</div>
          <div class="product-meta-addDesc">
            <div class="product-addDesc">${p.addDesc}</div>
          </div>
        </div>
      </div>
    </div>`;
    })
    .join("");

  /* 4) DOM 삽입 */
  document.querySelector(
    ".premium_face_product"
  ).innerHTML = `<div class="face-product-section">${cardsHtml}</div>`;

  /* 5) 클릭 이벤트 바인딩 + Mixpanel 트래킹 (bindPremiumCardEvents 내부) */
  bindPremiumCardEvents();
}

// 무료(base) 카드 – 기존 이동 그대로 유지
function renderFreeFeatureResult() {
  const products = [
    {
      key: "base",
      url: () => `/animalface/`,
      emoji: "🐍",
      title: "동물상 테스트 : 난 어떤 동물과 닮았을까?",
      desc: "200+ 글자",
      rating: 4.9,
      views: "4,500+",
      discount: 100,
      price: "무료",
      original_price: 0,
      thumbnail: "/img/animalface.png",
    },
  ];

  const cards = products
    .map(
      (p) => `
    <div class="product-card" onclick="location.href='${p.url()}';" style="cursor:pointer;">
      <div class="product-image"><img src="${p.thumbnail}" alt="${
        p.key
      }" class="square-image"></div>
      <div class="product-info">
        <div class="product-title">${p.title}</div>
 
      </div>
    </div>`
    )
    .join("");

  document.querySelector(
    ".free_face_product"
  ).innerHTML = `<div class="face-product-section">${cards}</div>`;
}

/* ───────── 3. 카드 클릭 시 모달 오픈 ───────── */
function bindPremiumCardEvents() {
  document
    .querySelectorAll(".premium_face_product .product-card")
    .forEach((card) => {
      card.addEventListener("click", () => {
        selectedReportType = card.dataset.key; // wealth / love / …
        /* Mixpanel 이벤트 */
        mixpanel.track(`상품 선택 ${card.dataset.key}`, {
          category: "premium",
          report_type: selectedReportType,
          title: card.dataset.title,
          price_label: card.dataset.price,
          discount_pct: Number(card.dataset.discount),
          position: [...card.parentElement.children].indexOf(card) + 1,
          timestamp: new Date().toISOString(),
        });
        openUploadModal();
      });
    });
}

function openUploadModal() {
  resetPhotoInput();
  const modal = document.getElementById("uploadModal");
  modal.classList.remove("hidden"); // display:block
  /* reflow 후에 show 추가 → transition 발동 */
  requestAnimationFrame(() => modal.classList.add("show"));
  document.getElementById("uploadBackdrop").classList.add("show");
}

function closeUploadModal() {
  document.getElementById("uploadBackdrop").classList.remove("show");
  const modal = document.getElementById("uploadModal");
  modal.classList.remove("show"); // translateY(100%)
  /* 애니메이션 끝난 뒤 display:none */
  modal.addEventListener(
    "transitionend",
    () => {
      modal.classList.add("hidden");
    },
    { once: true }
  );
}

/* 3-1. helper */
function showLoader() {
  const el = document.getElementById("loadingOverlay");
  el.classList.remove("hidden");
  requestAnimationFrame(() => el.classList.add("show"));
}
function hideLoader() {
  const el = document.getElementById("loadingOverlay");
  el.classList.remove("show");
  el.addEventListener("transitionend", () => el.classList.add("hidden"), {
    once: true,
  });
}

document
  .getElementById("modalClose")
  .addEventListener("click", closeUploadModal);

document
  .getElementById("uploadBackdrop")
  .addEventListener("click", closeUploadModal);

/* 이미 쓰시던 닫기 로직 그대로 */
document
  .getElementById("modalClose")
  .addEventListener("click", closeUploadModal);

/* input change 이벤트는 기존 analyse 로직 유지 */
document.getElementById("photoInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  /* Mixpanel 이벤트 */
  mixpanel.track("사진 업로드", {
    report_type: selectedReportType ?? "unknown",
    file_size: file.size,
    file_type: file.type,
    timestamp: new Date().toISOString(),
  });

  closeUploadModal();
  showLoader();
  const b64 = await toBase64(file);
  await analyzeFaceFeatureOnly(file, b64, selectedReportType);
});

function resetPhotoInput() {
  const input = document.getElementById("photoInput");
  if (input) input.value = ""; // ① 파일 값 비우기

  /* ② 미리보기 영역/텍스트 상태 복구 */
  const wrap = document.querySelector(".image-upload-wrap");
  const cont = document.querySelector(".file-upload-content");
  if (wrap) wrap.style.display = "block";
  if (cont) cont.style.display = "none";

  const img = document.getElementById("face-image");
  if (img) img.src = "#";

  const aiTxt = document.querySelector(".ai");
  if (aiTxt) aiTxt.classList.remove("disblock"); // ‘분석중..’ 숨김
  const noStore = document.querySelector(".nostore");
  if (noStore) noStore.classList.remove("none");
}

/* ───────── 5. IndexedDB 초기화 (기존 코드) ───────── */
async function initAnalysisDB() {
  const req = indexedDB.open("FaceAnalysisDB", 1);
  req.onupgradeneeded = (ev) => {
    analysisDb = ev.target.result;
    if (!analysisDb.objectStoreNames.contains("results")) {
      const store = analysisDb.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };
  req.onsuccess = (ev) => {
    analysisDb = ev.target.result;
  };
  req.onerror = (ev) => {
    console.error("DB 오류", ev);
  };
}
initAnalysisDB();

function saveResultToDB(data) {
  return new Promise((resolve, reject) => {
    const tx = analysisDb.transaction(["results"], "readwrite");
    tx.objectStore("results").put(data).onsuccess = resolve;
    tx.onerror = reject;
  });
}

/* ───────── 6. 얼굴 특징 분석 → 저장 → 리다이렉트 ───────── */
async function analyzeFaceFeatureOnly(file, imageBase64, reportType = "base") {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/features/",
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("서버 오류");

    const { features } = await res.json();
    if (!features || features.trim().toLowerCase() === "again") {
      hideLoader();
      alert("얼굴을 인식할 수 없습니다. 다른 사진을 올려 주세요.");
      return;
    }

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features,
      summary: "",
      detail: "",
      type: reportType,
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
      analyzed: false,
    };
    await saveResultToDB(result);

    const redirect =
      reportType === "base"
        ? `/base-report/?id=${encodeURIComponent(result.id)}&type=base`
        : `/report/${reportType}/?id=${encodeURIComponent(
            result.id
          )}&type=${reportType}`;

    window.location.href = redirect;
  } catch (e) {
    console.error("분석 실패", e);
    hideLoader();
    alert("분석 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

/* ───────── 7. File → Base64 변환 ───────── */
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ───────── 8. 초기 실행 ───────── */
(function init() {
  renderPremiumFeatureResult();
  renderFreeFeatureResult();
})();
