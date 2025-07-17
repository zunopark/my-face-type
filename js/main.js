const TITLE_MAP = {
  face: {
    title: "인공지능이 알려주는 내 관상",
    subtitle: "대한민국 1등 AI 관상 테스트",
  },
  match: {
    title: "AI가 알려주는 우리 궁합",
    subtitle: "두 얼굴로 보는 재회·궁합 테스트",
  },
  saju: {
    title: "AI 사주 풀이",
    subtitle: "오늘의 운세와 평생 사주 분석",
  },
};

document.querySelectorAll(".category_btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    /* --- (1) 버튼 active 토글 --- */
    document
      .querySelectorAll(".category_btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    /* --- (2) 콘텐츠 영역 토글 --- */
    const target = btn.dataset.target; // face / match / saju …
    document
      .querySelectorAll(".tab_content")
      .forEach((c) => c.classList.remove("active"));
    const pane = document.getElementById(`content-${target}`);
    if (pane) pane.classList.add("active");

    /* --- (3) 제목·부제목 교체 (⭐ 추가 부분) --- */
    const info = TITLE_MAP[target];
    if (info) {
      document.querySelector(".main_title").textContent = info.title;
      document.querySelector(".main_subtitle").textContent = info.subtitle;
    }
  });
});
