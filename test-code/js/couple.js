/* ---------- 전역 상태 ---------- */
let selfFile = null,
  partnerFile = null;

/* ---------- 미리보기 ---------- */
function readURL(input, who) {
  if (!input.files || !input.files[0]) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    document.querySelector(
      `#preview-${who}`
    ).innerHTML = `<img src="${e.target.result}" alt="${who}" />`;
  };
  reader.readAsDataURL(input.files[0]);

  if (who === "self") selfFile = input.files[0];
  else partnerFile = input.files[0];

  // 두 장 모두 선택됐을 때 버튼 활성화
  document.getElementById("analyzeBtn").disabled = !(selfFile && partnerFile);
}

/* ---------- 분석 시작 ---------- */
async function startAnalysis() {
  const resultBox = document.getElementById("result");
  resultBox.textContent = "⏳ AI가 얼굴을 분석하고 있습니다…";

  const formData = new FormData();
  formData.append("file1", selfFile);
  formData.append("file2", partnerFile);

  try {
    const res = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/pair/features/",
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("서버 오류");

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // 👉 실제 서비스 흐름에 맞게 저장·리다이렉트 등 처리
    console.log("features1:", data.features1);
    console.log("features2:", data.features2);
    resultBox.textContent = "✅ 분석 완료! 콘솔을 확인하세요.";
  } catch (e) {
    console.error(e);
    resultBox.textContent =
      "❌ 분석 중 오류가 발생했습니다. 다시 시도해 주세요.";
  }
}
