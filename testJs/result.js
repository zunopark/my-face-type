// ✅ faceFeature.js - 얼굴 특징 전용 IndexedDB + 분석/저장/렌더링 all-in-one

let featureDb = null;

// 1. IndexedDB 초기화
async function initFeatureDB() {
  const request = indexedDB.open("FaceFeatureDB", 1);

  request.onupgradeneeded = function (event) {
    featureDb = event.target.result;
    if (!featureDb.objectStoreNames.contains("features")) {
      const store = featureDb.createObjectStore("features", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = function (event) {
    featureDb = event.target.result;
    console.log("✅ FaceFeatureDB 초기화 완료");
  };

  request.onerror = function (event) {
    console.error("❌ FaceFeatureDB 오류", event);
  };
}

initFeatureDB();

// 2. 저장 함수
async function saveFeatureToDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = featureDb.transaction(["features"], "readwrite");
    const store = transaction.objectStore("features");
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

// 3. 전체 불러오기
async function getAllFeatures() {
  return new Promise((resolve, reject) => {
    const transaction = featureDb.transaction(["features"], "readonly");
    const store = transaction.objectStore("features");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// 4. 얼굴 특징 분석 및 저장
async function analyzeFaceFeatureOnly(file, imageBase64) {
  const formData = new FormData();
  formData.append("file", file);
  const resultContainer = document.getElementById("label-container");

  try {
    const response = await fetch("https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/features/", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("서버 응답 오류");
    const data = await response.json();

    const imageTitleWrap = document.querySelector(".ai");
    imageTitleWrap.classList.add("disblock");

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    const { features } = data;
    if (!features) throw new Error("features 없음");

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features,
      timestamp: new Date().toISOString()
    };

    mixpanel.track("얼굴 특징 분석 저장", {
      timestamp: result.timestamp,
    });

    await saveFeatureToDB(result);

    renderFeatureResult(result);

  } catch (error) {
    console.error("❌ 얼굴 특징 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
  }
}

// 5. 분석 결과 + 상품 UI 렌더링
function renderFeatureResult(data) {
  const products = [
    {
      emoji: "🐍",
      title: "2025년 하반기 운세 보고서",
      desc: "올해 주목할 핵심 운세를 AI가 콕 집어드립니다.",
      rating: 4.8,
      views: "3,000+",
      discount: 14,
      price: 27000,
      key: "overall"
    },
    {
      emoji: "💸",
      title: "2025년 재물운 집중 분석",
      desc: "관상 기반 재물/부의 흐름, 자산운 해설",
      rating: 4.9,
      views: "1만+",
      discount: 35,
      price: 11700,
      key: "wealth"
    },
    {
      emoji: "💖",
      title: "2025년 솔로 탈출 시기 분석",
      desc: "관상 기반 인연, 결혼/연애 성향, 만남 시기 해설",
      rating: 4.9,
      views: "3천+",
      discount: 3,
      price: 23250,
      key: "marriage"
    }
  ];

  const productCards = products.map(product => `
    <div class="product-card">
      <div class="product-emoji" style="font-size: 28px">${product.emoji}</div>
      <div class="product-info">
        <div class="product-title">${product.title}</div>
        <div class="product-desc">${product.desc}</div>
        <div class="product-meta">
          <span class="rating">⭐️${product.rating}</span>
          <span class="views">조회수 ${product.views}</span>
          <span class="discount" style="color:#ff5121">${product.discount}%</span>
        </div>
        <div class="product-price" style="font-weight:700;font-size:18px;margin:10px 0;">${product.price.toLocaleString()}원</div>
        <button class="product-btn" onclick="startPurchase('${data.id}', '${product.key}')">리포트 보기</button>
      </div>
    </div>
  `).join("");

  const container = document.getElementById("label-container");
  container.innerHTML = `
    <div class="ai-expect-title">
      <h3 style="font-size:22px;font-weight:700;">AI 관상가가 얼굴을 꼼꼼히 분석했어요!</h3>
      <div class="ai-expect-sub" style="color:#3ba1d8; margin-bottom: 12px;">아래 항목에서 원하는 분석 리포트를 선택해보세요.</div>
    </div>
    <div class="face-product-section" style="display:grid;gap:16px;">
      ${productCards}
    </div>
  `;
}

// 6. 사진 업로드 → 얼굴 특징 분석 → 저장
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

      await analyzeFaceFeatureOnly(input.files[0], imageBase64);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 7. Base64 변환(유지, 필요 시 사용)
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}