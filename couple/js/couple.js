/* --------------- 전역 상태 --------------- */
let selfFile = null; // 여자 사진
let partnerFile = null; // 남자 사진

/* --------------- 미리보기 --------------- */
function readURL(input, who) {
  if (!input.files || !input.files[0]) return;

  /* 📊 Mixpanel: 사진 선택 */
  mixpanel.track("커플 - 사진 선택", {
    역할: who === "self" ? "여자" : "남자",
  });

  const reader = new FileReader();
  reader.onload = (e) => {
    document.querySelector(
      `#preview-${who}`
    ).innerHTML = `<img src="${e.target.result}" alt="${who}" />`;
  };
  reader.readAsDataURL(input.files[0]);

  if (who === "self") selfFile = input.files[0];
  else partnerFile = input.files[0];

  // 두 장 모두 선택되면 버튼 활성화
  const ready = selfFile && partnerFile;
  document.getElementById("analyzeBtn").disabled = !ready;

  /* 📊 Mixpanel: 두 사진 모두 준비 */
  if (ready) mixpanel.track("커플 - 두 사진 준비");
}

/* --------------- 분석 요청 --------------- */
async function startAnalysis() {
  const analyzeBtn = document.querySelector(`#analyzeBtn`);
  analyzeBtn.classList.add("none");
  const resultBox = document.getElementById("result");
  resultBox.innerHTML = `<span class="loading">❤️ 잠시만요, 우리 커플 케미 분석 중! ❤️</span>`;

  mixpanel.track("커플 - 분석 요청");

  // 1) 두 파일 FormData로 묶기
  const formData = new FormData();
  formData.append("file1", selfFile); // 여자
  formData.append("file2", partnerFile); // 남자

  try {
    // 2) 새 궁합 엔드포인트 호출
    const res = await fetch(
      "https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/pair/compatibility/",
      { method: "POST", body: formData }
    );
    if (!res.ok) throw new Error("서버 오류");

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // 3) Gemini가 반환한 JSON(string) 파싱 ─ 코드펜스 제거
    const clean = data.summary
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    const { line_summary, detail } = JSON.parse(clean);

    mixpanel.track("커플 - 분석 완료", {
      요약: line_summary.slice(0, 120), // 120자까지 기록
    });

    const noStore = document.querySelector(".nostore");
    noStore.classList.add("none");

    const mainBtn = document.querySelector(`.analyze_btn`);
    mainBtn.classList.add("none");

    // 4) 결과 출력
    resultBox.innerHTML = `
      <div class="summary">${line_summary}</div>

      <div class="detail">${detail.replace(/\n/g, "<br>")}</div>

      <a href="/couple/" class="retry_btn">
        다른 사진으로 또 보기
      </a>
    `;

    /* 📊 Mixpanel: 다시 보기 클릭 */
    document.getElementById("retryBtn")?.addEventListener("click", () => {
      mixpanel.track("커플 - 다시 보기 클릭");
    });
  } catch (e) {
    console.error(e);
    analyzeBtn.classList.remove("none");
    resultBox.classList.remove("none");
    resultBox.innerHTML =
      "❌ 분석 중 오류가 발생했습니다.<br>다시 시도해 주세요.";
    mixpanel.track("커플 - 분석 오류", {
      오류메시지: e.message || "unknown",
    });
  }
}
