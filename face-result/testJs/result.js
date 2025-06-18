

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
      emoji: "🐍",
      title:
        "처음 보는 내 관상, 이렇게까지 자세히? 궁금해요? 궁금하면 500원",
      desc: "3,000+자 리포트",
      rating: 4.9,
      views: "4,500+",
      discount: 90,
      price: "500원",
      original_price: 4900,
    },
    {
      key: "marriage",
      emoji: "💍",
      title: "[매우 중요] 언제, 누구와 결혼할지 얼굴에 다 나와 있다면?",
      desc: "8,000+자 리포트",
      rating: 4.8,
      views: "2,300+",
      discount: 42,
      price: "9,900원",
      original_price: 16900,
    },
    {
      key: "wealth",
      emoji: "💸",
      title: "타고난 부: 내 관상 재물운과 평생 모을 재산은?",
      desc: "10,000+자 리포트",
      rating: 4.9,
      views: "10,000+",
      discount: 23,
      price: "16,900원",
      original_price: 21900,
    },
    {
      key: "job",
      emoji: "💼",
      title:
        "관상으로 보는 직업: 사실 난 이런 직업을 가졌어야 했다면...?",
      desc: "6,000+자 리포트",
      rating: 4.7,
      views: "1,900+",
      discount: 45,
      price: "4,900원",
      original_price: 8900,
    },
    {
      key: "love",
      emoji: "💖",
      title: "연애 관상: 나는 어떤 사람을 만나야 할까?",
      desc: "6,000+자 리포트",
      rating: 4.9,
      views: "2,800+",
      discount: 31,
      price: "6,900원",
      original_price: 9900,
    },
  ];

  const productCards = products
    .map(
      (product) => `
  <div class="product-card" onclick="location.href='/report/${
    product.key
  }/?id=${data.id}'" style="cursor: pointer;">

  <div class="product-image">
    <img src="/img/${product.key}.png" alt="${
        product.key
      }" class="square-image" />
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
  <h3 style="font-size:22px;font-weight:700;">얼굴 특징 분석이 완료됐습니다!</h3>
  <div class="ai-expect-sub" style="margin-bottom: 12px;">아래 항목에서 궁금한 분석을 선택해보세요.</div>
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
});