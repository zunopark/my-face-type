window.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("startAnalyzeBtn");

  btn?.addEventListener("click", () => {
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return alert("ID가 없습니다.");

    // 1) 루트 기준 절대 경로 (가장 간단)
    location.href = `/base-report/?id=${encodeURIComponent(id)}`;

    // 또는 2) origin 기반 절대 URL
    // location.href = `${location.origin}/base-report/?id=${encodeURIComponent(id)}`;

    // 또는 3) URL 생성자 사용
    // location.href = new URL(`/base-report/?id=${encodeURIComponent(id)}`, location.origin).toString();
  });
});
