// NEW 뱃지 스타일
const newBadgeStyle = `
  display: inline-block;
  background: linear-gradient(135deg, #ff6b6b, #ee5a5a);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 8px;
  margin-left: 4px;
  vertical-align: top;
  position: relative;
  top: -2px;
  letter-spacing: 0.5px;
`;

const headerContent = () => {
  const headerMain = document.querySelector(`.header_chat_wrap`);

  if (headerMain.id === "main") {
    headerMain.innerHTML = `
      <div class="header_chat header_fixed">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);">관상</div>
        </a>
            <a href="/saju-love/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);">연애 사주<span style="${newBadgeStyle}">NEW</span></div>
        </a>
            <a href="/animalface/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">동물상</div>
        </a>

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
