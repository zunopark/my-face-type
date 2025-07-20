const headerContent = () => {
  const headerMain = document.querySelector(`.header_chat_wrap`);

  if (headerMain.id === "main") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">관상</div>
        </a>
            <a href="/animalface/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >동물상</div>
        </a>
       
      </div>`;
  } else if (headerMain.id === "history") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title"" >관상</div>
        </a>
            <a href="/animalface/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >동물상</div>
        </a>
       
      </div>`;
  } else if (headerMain.id === "couple") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >관상</div>
        </a>
            <a href="/animalface/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >동물상</div>
        </a>
        
      </div>`;
  } else if (headerMain.id === "base") {
    headerMain.innerHTML = ` 
      <div id="header_back" class="header_chat header_fixed">
           <a href="/" class="header_btn">
          <span class="material-icons header_chat_icon">arrow_back_ios</span>
         
          <div class="header_chat_title">다른 사진</div>
        </a>
        
      </div>`;
  }
};

function init() {
  headerContent();
}

init();
