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
        <a href="/">
          <i class="fa-solid fa-arrow-left header_chat_icon" id="back-button"></i>
        </a>
        <a href="/">
          <div class="header_chat_title">전체 보기</div>
        </a>
        
      </div>`;
  }
};

function init() {
  headerContent();
}

init();
