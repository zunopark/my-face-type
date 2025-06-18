// ✅ faceFeature.js - 얼굴 특징 전용 IndexedDB + 분석/저장/렌더링 all-in-one

let featureDb = null;

// 1. IndexedDB 초기화
function initFeatureDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FaceFeatureDB", 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("features")) {
        const store = db.createObjectStore("features", { keyPath: "id" });
        store.createIndex("timestamp", "timestamp");
      }
    };

    request.onsuccess = (e) => {
      featureDb = e.target.result;
      console.log("✅ FaceFeatureDB 초기화 완료");
      resolve();                               // ⭐️ 준비 완료 신호
    };

    request.onerror = (e) => {
      console.error("❌ FaceFeatureDB 오류", e);
      reject(e);
    };
  });
}

const dbReady = initFeatureDB();    

// 2. 저장 함수
async function saveFeatureToDB(data) {
  return new Promise((resolve, reject) => {
    const tx    = featureDb.transaction(["features"], "readwrite");
    const store = tx.objectStore("features");
    store.put(data);

    tx.oncomplete = () => resolve();           // ✅ 진짜로 디스크에 flush 끝
    tx.onerror    = (e) => reject(e);
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
    const { features } = await response.json();
    if (!features)      throw new Error("features 없음");

    const imageTitleWrap = document.querySelector(".ai");
    imageTitleWrap.classList.add("disblock");

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features,
      timestamp: new Date().toISOString(),
      reports: {
        base:     { paid: false, detail: null, purchasedAt: null },   // 기본 관상 풀이
        marriage: { paid: false, detail: null, purchasedAt: null },   // 결혼운
        wealth:   { paid: false, detail: null, purchasedAt: null },   // 금전운
        job:      { paid: false, detail: null, purchasedAt: null },   // 직업운
        love:     { paid: false, detail: null, purchasedAt: null }    // 연애운
      }
    };

    mixpanel.track("얼굴 특징 분석 저장", {
      timestamp: result.timestamp,
    });

    await dbReady;                 // 🟢 DB가 완전히 열린 뒤
    await saveFeatureToDB(result); // 🟢 트랜잭션 완료까지 대기

    location.href = `/face-result/?id=${result.id}`; // 이제야 이동

  } catch (err) {
    console.error("❌ 얼굴 특징 분석 실패:", err);
    resultContainer.innerHTML =
      "<p style='color:red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>";
  }
}



// 5. 분석 결과 + 상품 UI 렌더링
function renderFeatureResult(data) {
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
    <div class="product-card" onclick="location.href='/report/${product.key}'" style="cursor: pointer;">
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
    </div>
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