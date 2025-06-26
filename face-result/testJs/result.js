let analysisDb = null;

function initAnalysisDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("FaceAnalysisDB", 1);
    req.onsuccess = () => {
      analysisDb = req.result;
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

function getResultById(id) {
  return new Promise((resolve, reject) => {
    const tx = analysisDb.transaction(["results"], "readonly");
    const store = tx.objectStore("results");
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

async function getResultByIdWithRetry(id, max = 10, delay = 300) {
  for (let i = 0; i < max; i++) {
    const res = await getResultById(id);
    if (res) return res;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

// 재시도 포함된 get
async function getFeatureByIdWithRetry(id, maxRetries = 10, delay = 300) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`🔄 Attempt ${i + 1} to get ID: ${id}`);
      const res = await getFeatureById(id);
      if (res) return res;
    } catch (e) {
      console.warn("🟡 get attempt failed:", e);
    }
    await sleep(delay);
  }
  return null;
}

// UI에 메시지 출력
function showMessage(msg, color = "red") {
  const container = document.getElementById("label-container");
  container.innerHTML = `<p style="color:${color}; white-space: pre-line;">${msg}</p>`;
}

function renderImage(imageBase64) {
  document.querySelector(".file-upload-image").src = imageBase64;
  document.querySelector(".file-upload-content").style.display = "block";
  document.querySelector(".image-upload-wrap").style.display = "none";
}

// 🔵 상품 카드 렌더링
function renderFeatureResult(data) {
  const products = [
    {
      key: "base",
      url: (id) => `/base-free.html?id=${encodeURIComponent(id)}&type=base`,
      emoji: "🐍",
      title: "[1,500만명 돌파] 처음 보는 내 관상: 생각 이상으로 자세하네?",
      desc: "3,000+ 글자",
      rating: 4.9,
      views: "4,500+",
      discount: 86,
      price: "990원",
      original_price: 6900,
      thumbnail: "/img/base.png",
    },
    {
      key: "wealth",
      url: (id) => `/report/wealth/?id=${encodeURIComponent(id)}&type=wealth`,
      emoji: "💸",
      title: "[지금 인기] 타고난 부: 10억, 100억 내가 평생 모을 재산은?",
      desc: "10,000+ 글자",
      rating: 4.9,
      views: "10,000+",
      discount: 98,
      price: "990원",
      original_price: 34900,
      thumbnail: "/img/wealth.png",
    },
    {
      key: "marriage",
      url: (id) =>
        `/report/marriage/?id=${encodeURIComponent(id)}&type=marriage`,
      emoji: "💍",
      title: "결혼운: 언제, 누구와 결혼할지 얼굴에 다 나와 있다면?",
      desc: "8,000+ 글자",
      rating: 4.8,
      views: "2,300+",
      discount: 95,
      price: "990원",
      original_price: 16900,
      thumbnail: "/img/marriage.png",
    },
    {
      key: "love",
      url: (id) => `/report/love/?id=${encodeURIComponent(id)}&type=love`,
      emoji: "💖",
      title: "연애 관상: 총 연애 횟수, 내 운명은 어디에?",
      desc: "6,000+ 글자",
      rating: 4.9,
      views: "2,800+",
      discount: 94,
      price: "990원",
      original_price: 14900,
      thumbnail: "/img/love.png",
    },
  ];

  const productCards = products
    .map(
      (product) => `
 <div class="product-card" onclick="
        mixpanel.track('보고서 상품 클릭', {
          id: '${data.id}',
          product_key: '${product.key}',
          product_title: '${product.title}'
        });
        location.href='${product.url(data.id)}';
  " style="cursor: pointer;">

  <div class="product-image">
    <img src="${product.thumbnail}" alt="${product.key}" class="square-image" />
  </div>
  <div class="product-info">
    <div class="product-title">${product.title}</div>
        <div class="product-meta">
        <div class="product-stats">총 ${product.desc}</div>
          <div class="product-meta-price">
            <div class="product-original-price">${product.original_price.toLocaleString()}원</div>
            <div class="discount">${product.discount}%</div>
            <div class="product-price">${product.price}</div>
          </div>
        </div>
  </div>
</div>
`
    )
    .join("");

  document.getElementById("label-container").innerHTML = `
<div class="ai-expect-title">
  <h3 style="font-size:22px;font-weight:700;">얼굴 특징 분석이 완료됐어요!</h3>
  <div class="ai-expect-sub" style="margin-bottom: 20px;"><관상 테스트 1,500만명 돌파 기념 이벤트><br/>프리미엄 관상 분석 보고서 - 990원<br/><br/>서두르세요. 다음주까지만!</div>
</div>
<div class="face-product-section">${productCards}</div>
`;
}

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// 시작
document.addEventListener("DOMContentLoaded", async () => {
  const id = getIdFromUrl();
  if (!id) {
    showMessage("❌ id가 URL에 없습니다.");
    return;
  }

  await initAnalysisDB();
  const result = await getResultByIdWithRetry(id);
  if (!result) {
    showMessage("❌ 해당 ID로 결과를 찾을 수 없습니다.");
    return;
  }

  renderImage(result.imageBase64);
  renderFeatureResult(result);

  // ✅ Mixpanel: 결과 로드 성공
  mixpanel.track("얼굴 분석 결과 로드 성공", {
    id: result.id,
    timestamp: new Date().toISOString(),
  });
});
