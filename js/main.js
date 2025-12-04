const TITLE_MAP = {
  face: {
    title: "인공지능이 알려주는 관상 테스트",
    subtitle: "AI 관상 | 관상가 양반",
  },
  match: {
    title: "우리 관상 궁합은 몇 점일까?",
    subtitle: "#궁합 점수 #바람기 #애정운 #속궁합",
  },
  reunion: {
    title: "관상으로 알아보는 재회 확률",
    subtitle: "#상대 분석 #시기 #방법 #고민풀이",
  },
};

document.querySelectorAll(".category_btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;

    // 연애 사주는 별도 페이지로 이동
    if (target === "saju") {
      window.location.href = "/saju-love/";
      return;
    }

    /* --- (1) 버튼 active 토글 --- */
    document
      .querySelectorAll(".category_btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    /* --- (2) 콘텐츠 영역 토글 --- */
    document
      .querySelectorAll(".tab_content")
      .forEach((c) => c.classList.remove("active"));
    const pane = document.getElementById(`content-${target}`);
    if (pane) pane.classList.add("active");

    /* --- (3) 제목·부제목 교체 --- */
    const info = TITLE_MAP[target];
    if (info) {
      document.querySelector(".main_title").textContent = info.title;
      document.querySelector(".main_subtitle").textContent = info.subtitle;
    }

    /* ⭐ (4) 마지막 탭 localStorage 저장 */
    localStorage.setItem("last_selected_tab", target);
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const lastTab = localStorage.getItem("last_selected_tab") || "face";
  const targetBtn = document.querySelector(
    `.category_btn[data-target="${lastTab}"]`
  );
  if (targetBtn) targetBtn.click();
});
