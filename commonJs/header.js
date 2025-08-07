const headerContent = () => {
  const headerMain = document.querySelector(`.header_chat_wrap`);

  if (headerMain.id === "main") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed">
        <div class="header_chat_title">AI 관상가 양반</div>
      </div>`;
  } else if (headerMain.id === "base") {
    headerMain.innerHTML = ` 
      <div id="header_back" class="header_chat header_fixed">
        <a href="/" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 사진</div>
        </a>
        
      </div>`;
  } else if (headerMain.id === "couple-report") {
    headerMain.innerHTML = ` 
      <div id="header_back" class="header_chat header_fixed">
        <a href="/" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 사진</div>
        </a>
        
      </div>`;
  } else if (headerMain.id === "reunion-report") {
    headerMain.innerHTML = ` 
      <div id="header_back" class="header_chat header_fixed">
        <a href="/reunion" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 사진</div>
        </a>
        
      </div>`;
  } else if (headerMain.id === "analyze-result") {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id") || ""; // 없으면 빈문자

    // ② /select-report 로 보낼 URL 구성
    const saveHref = reportId
      ? `/select-report/?id=${encodeURIComponent(reportId)}`
      : "/"; // (fallback)
    headerMain.innerHTML = `
    <div id="header_back" class="header_chat header_fixed">
        <a href="${saveHref}" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 보고서</div>
        </a>
         <a
    id="save-page-btn"
    style="cursor: pointer; margin-right: -2px"
    class="header_chat_title header_chat_right"
  >
    보고서 저장</a
  >
        
      </div>

    `;
  } else if (headerMain.id === "report-result") {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id") || ""; // 없으면 빈문자

    // ② /select-report 로 보낼 URL 구성
    const saveHref = reportId
      ? `/select-report/?id=${encodeURIComponent(reportId)}`
      : "/"; // (fallback)
    headerMain.innerHTML = `
    <div id="header_back" class="header_chat header_fixed">
        <a href="${saveHref}" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 보고서</div>
        </a>
        
      </div>

    `;
  }
};

function init() {
  headerContent();
}

init();
