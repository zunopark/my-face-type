const headerContent = () => {
  const headerMain = document.querySelector(`.header_chat`);

  headerMain.innerHTML = ` <div class="header_chat_wrap header_fixed">
    <div class="header_chat_title">AI 관상가 양반

    </div>
  </div>`;

  const mainContentWrap = this.document.querySelector(`.main_content_wrap`);
  mainContentWrap.classList.add("main_content_wrap_top_margin");
};

function init() {
  headerContent();
}

init();
