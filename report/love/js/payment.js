document
  .getElementById("payment-button")
  .addEventListener("click", requestPayment);

const clientKey = "live_gck_yZqmkKeP8gBaRKPg1WwdrbQRxB9l";
const customerKey = "customer_" + new Date().getTime();

const paymentWidget = PaymentWidget(clientKey, customerKey);
paymentWidget.renderPaymentMethods("#payment-method", { value: 4900 });
paymentWidget.renderAgreement("#agreement");
let isRendered = false;

function openPayment() {
  document.getElementById("paymentOverlay").style.display = "block";

  // 항상 다시 위젯을 mount, 버튼 핸들러도 중복 방지!
  if (!isRendered) {
    paymentWidget.renderPaymentMethods("#payment-method", { value: 4900 });
    paymentWidget.renderAgreement("#agreement");
    isRendered = true;
  }
}

function closePayment() {
  document.getElementById("paymentOverlay").style.display = "none";
  // 다음 열기를 위해 다시 그릴 수 있도록 플래그 off
  isRendered = false;
}

// [수정] type, id를 주소에서 추출!
function getTypeAndIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
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
      orderName: "연애운 심층 분석 보고서",
      successUrl: `${window.location.origin}/analyze-success-payment/?id=${id}&type=${type}`,
      failUrl: `${window.location.origin}/fail.html?id=${id}&type=${type}`,
      customerName: "고객",
    });
  } catch (err) {
    alert("❌ 결제 실패: " + err.message);
  }
}

// 버튼 연결
document.querySelector(".consultBtn").addEventListener("click", () => {
  const { type, id } = getTypeAndIdFromUrl();

  openPayment();
});

// Toss 위젯 내부 버튼 사용자가 누를 수 있도록 요청 시 결제
document.getElementById("payment-method").addEventListener("click", () => {
  // 실제 버튼 대신 요청하고 싶으면 requestPayment() 직접 호출
});
