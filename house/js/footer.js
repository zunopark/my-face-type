const footer = document.querySelector(`.footer`);

function init() {
  footer.innerHTML = ` <div class="contact">
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">개발자 문의</a>
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">광고 문의</a>
  </div>
  <div class="footer__icon">
    <i class="fas fa-portrait"></i>
  </div>
  <span class="footer__text"> Your.Face 2021 &copy;</span>`;
}
init();
