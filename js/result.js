let db;

// 1. IndexedDB 초기화
async function initDB() {
  const request = indexedDB.open("FaceAnalysisDB", 1);

  request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("results")) {
      const store = db.createObjectStore("results", { keyPath: "id" });
      store.createIndex("timestamp", "timestamp", { unique: false });
    }
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    console.log("✅ IndexedDB 초기화 완료");
  };

  request.onerror = function (event) {
    console.error("❌ IndexedDB 오류", event);
  };
}

initDB();

// 2. 저장
async function saveToIndexedDB(data) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["results"], "readwrite");
    const store = transaction.objectStore("results");
    const request = store.put(data);

    request.onsuccess = () => resolve();
    request.onerror = (e) => reject(e);
  });
}

// 3. 전체 불러오기
async function getAllResults() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["results"], "readonly");
    const store = transaction.objectStore("results");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e);
  });
}

// 4. 결제 완료 처리
async function markPaid(id) {
  const transaction = db.transaction(["results"], "readwrite");
  const store = transaction.objectStore("results");
  const getReq = store.get(id);

  getReq.onsuccess = () => {
    const data = getReq.result;
    if (data) {
      data.paid = true;
      data.purchasedAt = new Date().toISOString();
      store.put(data);
      renderResult(data);
    }
  };
}

// 5. 분석 및 저장 실행 (type: "base" 전용)
async function analyzeFaceImage(file, imageBase64) {
  const formData = new FormData();
  formData.append("file", file);
  const resultContainer = document.getElementById("label-container");

  try {
    const response = await fetch("https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/", {
      method: "POST",
      body: formData,
    });

    const imageTitleWrap = document.querySelector(".ai");
    imageTitleWrap.classList.add("disblock");

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    if (!response.ok) throw new Error("서버 응답 오류");
    const data = await response.json();

    const { summary, detail, features } = data;
    if (!summary || !detail) throw new Error("summary/detail 없음");

    const result = {
      id: crypto.randomUUID(),
      imageBase64,
      features,
      summary,
      detail,
      type: "base",
      paid: false,
      purchasedAt: null,
      timestamp: new Date().toISOString(),
    };

    mixpanel.track("GEMINI 관상 결과", {
      timestamp: new Date().toISOString(),
    });

    await saveToIndexedDB(result);
    renderResult(result);

  } catch (error) {
    console.error("❌ 관상 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
  }
}

// 6. Base64 변환
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 7. 분석 결과 렌더링
function renderResult(data) {
  const today = new Date();
  const todayStr = `${today.getMonth() + 1}월 ${today.getDate()}일`;

  const resultContainer = document.getElementById("label-container");

  resultContainer.innerHTML = `
    <div class="face-summary-section">
      <div class="face-summary">${marked.parse(data.summary)}</div>
    </div>
    <div class="face-full-section-wrapper">
      <div class="face-full-report">${marked.parse(data.detail)}</div>
      ${data.paid ? "" : `
      <div class="result-mask">
        <div class="blur-overlay"></div>
        <div class="mask-text-wrap">
          <div class="mask-text">
              <div class="mask-text-top">관상학 기반 심층 분석</div>
              <div class="mask-text-sub">얼굴형, 이마, 눈 등 부위별 세부 관상 분석 + 운명과 인생 경로 + 대인 관계와 인연 + 관상학적 인생 종합 결론<br/><br/></div>
              <div class="mask-text-btn-wrap">
                  <div class="mask-text-btn" onclick="trackAndStartPayment('${data.id}')">전체 분석 결과 확인하기</div>
              </div>
              <div class="mask-text-btn-sub">출시 기념 6월 할인 이벤트</div>
          </div>
          <div class="review-section">
            <div class="review-scroll">
              <div class="review-card">⭐️⭐️⭐️⭐️⭐️<br/><span class="review-meta">윤○○</span>와… 진짜 이거 보고 소름. 저보다 저를 더 잘 아는 느낌?</div>
              <div class="review-card">⭐️⭐️⭐️⭐️⭐️<br/><span class="review-meta">김○○</span>그냥 궁금해서 해봤는데, 생각보다 훨씬 깊고 정확했어요.</div>
              <div class="review-card">⭐️⭐️⭐️⭐️⭐️<br/><span class="review-meta">박○○</span>좋은 말만 하는 줄 알았는데, 날카롭게 짚어줘서 신뢰감 생겼어요.</div>
              <div class="review-card">⭐️⭐️⭐️⭐️☆<br/><span class="review-meta">이○○</span>요즘 고민 많았는데 방향 잡는 데 진짜 도움 됐어요.</div>
              <div class="review-card">⭐️⭐️⭐️⭐️⭐️<br/><span class="review-meta">최○○</span>사주도 봤는데… 이게 더 실전적이에요. 구체적으로 뭐 해야 할지 알겠어요.</div>
              <div class="review-card">⭐️⭐️⭐️⭐️⭐️<br/><span class="review-meta">장○○</span>솔직히 기대 안 했는데… 위로받았어요. 그냥 고마워요.</div>
            </div>
          </div>
        </div>
      </div>`}
    </div>
  `;
}

// 8. 결제 유도 트리거
function trackAndStartPayment(resultId) {
  mixpanel.track("관상 결제 버튼 클릭", {
    resultId: resultId,
    timestamp: new Date().toISOString(),
  });
  startTossPayment(resultId);
}

// 9. 이미지 업로드 처리
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

      await analyzeFaceImage(input.files[0], imageBase64);
    };
    reader.readAsDataURL(input.files[0]);
  }
}

// 10. 결제 처리
function goToPurchase(id) {
  markPaid(id);
}

async function startTossPayment(resultId) {
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  document.getElementById("paymentModal").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods("#payment-method", { value: 1900 });
    paymentWidget.renderAgreement("#agreement");

    document.getElementById("payment-button").onclick = async () => {
      try {
        await paymentWidget.requestPayment({
          orderId: `order_${Date.now()}`,
          orderName: "관상 상세 분석 서비스",
          customerName: "고객",
          successUrl: `${window.location.origin}/success.html?id=${resultId}`,
          failUrl: `${window.location.origin}/fail.html`,
        });
      } catch (err) {
        alert("❌ 결제 실패: " + err.message);
      }
    };
  } catch (e) {
    alert("❌ 위젯 로드 실패: " + e.message);
  }
}

function closePaymentModal() {
  document.getElementById("paymentModal").style.display = "none";
  document.getElementById("payment-method").innerHTML = "";
  document.getElementById("agreement").innerHTML = "";
}

// 11. 분석 진행 텍스트 애니메이션
const aiTexts = [
  "관상가가 당신의 관상을 분석중..",
  "당신의 관상을 풀어내는 중입니다..",
  "조금만 기다려주세요..",
  "지금 관상 보는 사람이 많아요..",
  "관상 분석이 진행중이에요.."
];

let aiIndex = 0;
setInterval(() => {
  const aiEl = document.querySelector(".ai");
  if (!aiEl) return;
  aiEl.textContent = aiTexts[aiIndex % aiTexts.length];
  aiIndex++;
}, 4000);
