// ✅ result.js - IndexedDB 기반 관상 결과 저장 및 UI 렌더링

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
    console.log("2")
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
      store.put(data);
      renderResult(data);
    }
  };
}

// 5. 분석 및 저장 실행
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

    const { summary, detail } = data;
    if (!summary || !detail) throw new Error("summary/detail 없음");

    const result = {
      id: crypto.randomUUID(),
      summary,
      detail,
      imageBase64,
      paid: false,
      timestamp: new Date().toISOString(),
    };

    console.log(`\(id: ${result.id}, timestamp: ${result.timestamp})`);

    await saveToIndexedDB(result);
    console.log("3")
    renderResult(result);
    console.log("5")

  } catch (error) {
    console.error("❌ 관상 분석 실패:", error);
    resultContainer.innerHTML = `<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>`;
  }

  mixpanel.track("GEMINI 관상 결과", {
    timestamp: new Date().toISOString(),
  });
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
          <div class="mask-text">
              <div class="mask-text-top">더 자세한 내용이 궁금하신가요?</div>
              <div class="mask-text-sub">얼굴형, 이마, 눈 등 세부 관상 + 운명과 인생 경로 + 대인관계와 인연 + 종합 결론</div>
              <div class="mask-text-btn-wrap">
                  <div class="mask-text-btn" onclick="trackAndStartPayment('${data.id}')">전체 결과 보기 (3,900원)</div>
              </div>
              <div class="mask-text-btn-sub">결제 후에는 환불이 불가능합니다.</div>
          </div>
        </div>`}
      </div>
    `;
  }

  function trackAndStartPayment(resultId) {
    mixpanel.track("관상 결제 버튼 클릭", {
      resultId: resultId,
      timestamp: new Date().toISOString()
    });
  
    startTossPayment(resultId);
  }  

// 8. 이미지 업로드 처리
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

// 9. 결제 후 호출 함수
function goToPurchase(id) {
  markPaid(id);
}

async function startTossPayment(resultId) {
  const clientKey = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  // 모달 열기
  document.getElementById("paymentModal").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods("#payment-method", { value: 3900 });
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
  