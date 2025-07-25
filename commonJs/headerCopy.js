const headerContent = () => {
  const headerMain = document.querySelector(`.header_chat_wrap`);

  if (headerMain.id === "main") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">관상</div>
        </a>
        <a href="/couple/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >궁합</div>
        </a>
        <a href="/reunion/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >재회</div>
        </a>
       
       
      </div>`;
  } else if (headerMain.id === "history") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">관상</div>
        </a>
         <a href="/couple/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >궁합</div>
        </a>
        <a href="/reunion/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >재회</div>
        </a>
       
       
      </div>`;
  } else if (headerMain.id === "couple") {
    headerMain.innerHTML = ` 
      <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >관상</div>
        </a>
         <a href="/couple/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">궁합</div>
        </a>
        <a href="/reunion/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >재회</div>
        </a>
       
        
      </div>`;
  } else if (headerMain.id === "reunion") {
    headerMain.innerHTML = ` 
     <div class="header_chat header_fixed" style ="">

            <a href="/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >관상</div>
        </a>
         <a href="/couple/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title" style="color: rgb(130, 130, 130);" >궁합</div>
        </a>
        <a href="/reunion/" style="margin-right: 12px; text-decoration: none;">
          <div class="header_chat_title">재회</div>
        </a>
       
        
      </div>`;
  }
};

function init() {
  headerContent();
}

init();
