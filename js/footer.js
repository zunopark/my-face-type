const footer = document.querySelector(`.footer`)
const bottomBtn = document.querySelector(`.bottom_ad_btn`)

function init() {
  footer.innerHTML = ` <div class="contact">
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">개발자 문의</a>
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">광고 문의</a>
  </div>
  <div class="footer__icon">
    <i class="fas fa-portrait"></i>
  </div>
  <span class="footer__text"> Your.Face 2021 &copy;</span>`

  bottomBtn.addEventListener('click', () => {
    location.href = 'http://pf.kakao.com/_Qfuvxj/chat'
  })
}
init()
