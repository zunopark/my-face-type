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

    mixpanel.track("GEMINI 관상 결과", {
        timestamp: new Date().toISOString(),
      });

    console.log(`\(id: ${result.id}, timestamp: ${result.timestamp})`);

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
  // 📅 오늘 날짜(한국 시간) "6월 3일" 식으로 만들기
  const today    = new Date();
  const monthStr = today.getMonth() + 1; // 1~12
  const dayStr   = today.getDate();      // 1~31
  const todayStr = `${monthStr}월 ${dayStr}일`;  // "6월 3일"

  const resultContainer = document.getElementById("label-container");

  resultContainer.innerHTML = `
    <div class="face-summary-section">
      <div class="face-summary">${marked.parse(data.summary)}</div>
    </div>
    <div class="review-section">
        <div class="review-scroll">
            <div class="review-card">
              ⭐️⭐️⭐️⭐️⭐️<br/>
              <span class="review-meta">34세 · 워킹맘 윤○○</span>
              “와… 완전 딱 맞아요! 사주보다 더 정확하다는 느낌이 들어요.”
            </div>

            <div class="review-card">
              ⭐️⭐️⭐️⭐️⭐️<br/>
              <span class="review-meta">39세 · 마케터 김○○</span>
              “관상이 궁금하기만 했는데, 이렇게 깊이 분석될 줄은 몰랐어요. 깜짝!”
            </div>

            <div class="review-card">
              ⭐️⭐️⭐️⭐️⭐️<br/>
              <span class="review-meta">32세 · 자영업 박○○</span>
              “좋은 말뿐일 줄 알았는데 장단점까지 솔직히 짚어줘서 믿음이 가네요.”
            </div>

            <div class="review-card">
              ⭐️⭐️⭐️⭐️☆<br/>
              <span class="review-meta">37세 · 교사 이○○</span>
              “세세한 조언 덕분에 현실적인 방향을 잡았어요.”
            </div>

            <div class="review-card">
              ⭐️⭐️⭐️⭐️⭐️<br/>
              <span class="review-meta">41세 · 프리랜서 최○○</span>
              “가족 사주도 봤지만, 이 리포트가 훨씬 실전 팁이 많아서 유익했어요!”
            </div>
        </div>
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
                <div class="mask-text-btn-sub">출시 기념 6월 할인 - 지금이 가장 저렴해요</div>
            </div>
            <div class="service-stats">
              <div class="stat-item">
                <div class="stat-label">구매</div>
                <div class="stat-value">721건</div>
              </div>

              <div class="stat-item">
                <div class="stat-label">만족해요</div>
                <div class="stat-value">94.8%</div>
              </div>

              <div class="stat-item">
                <div class="stat-label">글자 수</div>
                <div class="stat-value">3,000+자</div>
              </div>
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
  const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l"; // 테스트 키
  const customerKey = "customer_" + new Date().getTime();

  // 모달 열기
  document.getElementById("paymentModal").style.display = "block";

  try {
    const paymentWidget = PaymentWidget(clientKey, customerKey);
    const paymentMethodWidget = paymentWidget.renderPaymentMethods("#payment-method", { value: 2900 });
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
  

  
  // 👇 .ai 텍스트 자동 변경
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
  }, 4000); // 2초마다 교체