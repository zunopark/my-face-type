let analysisDb = null;

// 1. IndexedDB 초기화
async function initAnalysisDB() {
  const request = indexedDB.open("FaceAnalysisDB", 1);

  request.onupgradeneeded = function (event) {
    analysisDb = event.target.result;
    if (!analysisDb.objectStoreNames.contains("results")) {
      const store = analysisDb.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = function (event) {
    analysisDb = event.target.result;
    console.log("✅ FaceAnalysisDB 초기화 완료");
  };

  request.onerror = function (event) {
    console.error("❌ FaceAnalysisDB 오류", event);
  };
}

initAnalysisDB();

// 2. 저장 함수
async function saveResultToDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = analysisDb.transaction(["results"], "readwrite");
    const store = transaction.objectStore("results");
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

// 3. 전체 불러오기
async function getAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = analysisDb.transaction(["results"], "readonly");
    const store = transaction.objectStore("results");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// 4. 얼굴 특징 분석 및 저장 (📌 reports 없이 features만)
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
    const { features } = data;
    if (!features) throw new Error("features 없음");

    const imageTitleWrap = document.querySelector(".ai");
    imageTitleWrap.classList.add("disblock");

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    // ⛔️ 얼굴 인식 실패 시 화면 하단에 메시지 출력하고 중단
    if (features.trim().toLowerCase() === "again") {
      resultContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; font-size: 16px; color: red; font-weight: bold;">
          얼굴을 인식할 수 없습니다.<br/>다른 사진을 업로드해 주세요.
        </div>
        <div style="text-align: center; margin-top: 16px;">
          <button onclick="retryUpload()" style="padding: 10px 20px; font-size: 15px; background-color: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer;">
            다른 사진 올리기
          </button>
        </div>
      `;
      mixpanel.track("얼굴 인식 실패", {
        reason: "features = again",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features,             // 얼굴 특징
      summary: "",          // 요약 리포트
      detail: "",           // 전체 리포트
      type: "base",         // 리포트 타입 (예: base, wealth 등)
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
    
      // ✅ Gemini 분석 완료 여부
      analyzed: false       // ← 이 필드만 있으면 끝!
    };

    mixpanel.track("얼굴 특징 분석 저장", {
      timestamp: result.timestamp,
    });

    await saveResultToDB(result);
    renderFeatureResult(result);

    const url = `/face-result/?id=${encodeURIComponent(result.id)}&type=base`;
    window.location.href = url;

  } catch (error) {
    console.error("❌ 얼굴 특징 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
  }
}

// 5. 분석 결과 + 리포트 상품 UI 렌더링
function renderFeatureResult(data) {
  const resultId = data.id;

  const products = [
    {
      key: "base",
      emoji: "🐍",
      title: "처음 보는 내 관상, 이렇게까지 자세히? 궁금해요? 궁금하면 500원",
      desc: "3,000+자 리포트",
      rating: 4.9,
      views: "4,500+",
      discount: 90,
      price: "500원",
      original_price: 4900
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
      original_price: 16900
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
      original_price: 21900
    },
    {
      key: "job",
      emoji: "💼",
      title: "관상으로 보는 직업: 사실 난 이런 직업을 가졌어야 했다면...?",
      desc: "6,000+자 리포트",
      rating: 4.7,
      views: "1,900+",
      discount: 45,
      price: "4,900원",
      original_price: 8900
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
      original_price: 9900
    }
  ];

  const productCards = products.map(product => `
     <a class="product-card"
       href="/report/${product.key}/?id=${resultId}&type=${product.key}"
       style="cursor:pointer;text-decoration:none;">
      <div class="product-image">
        <img src="img/${product.key}.png" alt="${product.key}" class="square-image" />
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
    </a>
  `).join("");

  const container = document.getElementById("label-container");
  container.innerHTML = `
    <div class="ai-expect-title">
      <h3 style="font-size:22px;font-weight:700;">얼굴 분석을 완료했어요!</h3>
      <div class="ai-expect-sub" style="margin-bottom: 12px;">아래 항목에서 원하는 분석 리포트를 선택해보세요.</div>
    </div>
    <div class="face-product-section">
      ${productCards}
    </div>
  `;
}

function retryUpload() {
  location.reload();
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

// 7. Base64 변환
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
