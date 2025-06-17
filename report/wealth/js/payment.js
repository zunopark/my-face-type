document.getElementById("payment-button").addEventListener("click", requestPayment);

const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
const customerKey = "customer_" + new Date().getTime();

const paymentWidget = PaymentWidget(clientKey, customerKey);
paymentWidget.renderPaymentMethods("#payment-method", { value: 10 });
paymentWidget.renderAgreement("#agreement");

function openPayment() {
  const overlay = document.getElementById("paymentOverlay");
  overlay.style.display = "block";
}

function closePayment() {
  document.getElementById("paymentOverlay").style.display = "none";
}

// [수정] type, id를 주소에서 추출!
function getTypeAndIdFromUrl() {
  // /report/{type}/?id=xxx
  const pathSegments = window.location.pathname.split("/");
  const type = pathSegments[2]; // wealth, base, marriage, ...
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return { type, id };
}

// [수정] 결제 시작
async function requestPayment() {
  const { type, id } = getTypeAndIdFromUrl();
  if (!type || !id) {
    alert("잘못된 접근입니다 (type 또는 id 누락)");
    return;
  }
  try {
    await paymentWidget.requestPayment({
      orderId: `${type}_${id}_${Date.now()}`,
      orderName: "프리미엄 관상 분석",
      successUrl: `${window.location.origin}/analyze-success-payment/?id=${id}&type=${type}`,
      failUrl: `${window.location.origin}/fail.html`,
      customerName: "고객",
    });
  } catch (err) {
    alert("❌ 결제 실패: " + err.message);
  }
}

// 버튼 연결
document.querySelector(".consultBtn").addEventListener("click", () => {
  mixpanel.track("상담 시작 클릭");
  openPayment();
});

// Toss 위젯 내부 버튼 사용자가 누를 수 있도록 요청 시 결제
document.getElementById("payment-method").addEventListener("click", () => {
  // 실제 버튼 대신 요청하고 싶으면 requestPayment() 직접 호출
});
