const footer = document.querySelector(`.footer`)
const headerForAd = document.querySelector(`.header`)

const appVersion = '0.504'

function init() {
  footer.innerHTML = ` <div class="contact">
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">
      문의
    </a>
    <a href="/analysis" class="contact_me">
      관상 해석
    </a>
    <a href="/blog" class="contact_me">
      개발 블로그
    </a>
  </div>
  <div class="footer_text_wrap">
    <span class="footer_company">AI양반 | NMAX (엔맥스)</span>
  </div>
  <div class="footer_text_wrap">
    <span class="footer_ceo">대표자 : 윤용섭</span>
    <span class="footer_business_num">사업자등록번호 : 418-12-65319</span>
  </div>
  <div class="footer_text_wrap">
    <span class="footer_sales_num">
      통신판매업신고번호 : 2023-성남분당B-0437
    </span>
  </div>
  <div class="footer_text_wrap">
    <span class="footer_address">
      주소 : 경기도 성남시 분당구 판교로 421, 3층
    </span>
  </div>
  <span class="footer_text_wrap">
    ⓒ 2023. NMAX, All Rights Reserved. App Version: ${appVersion}
  </span>`

  // if (bottomAd) {
  //   if (headerForAd.id === 'face') {
  //     bottomAd.innerHTML = ` <div class="bottom_ad_top">무료 관상은 어떠셨나요?</div>
  // <div class="bottom_ad_bottom">
  //   <div class="bottom_ad_ment">
  //     복채로 응원해주세요 (5,000원)
  //   </div>
  //   <div class="bottom_ad_btn">
  //     <i class="fas fa-comment"></i>
  //     응원하기
  //   </div>
  // </div>`
  //   } else if (headerForAd.id === 'fortune') {
  //     bottomAd.innerHTML = ` <div class="bottom_ad_top">운세 결과가 마음에 드시나요?</div>
  //   <div class="bottom_ad_bottom">
  //     <div class="bottom_ad_ment">
  //       복채로 응원해주세요 (5,000원)
  //     </div>
  //     <div class="bottom_ad_btn">
  //       <i class="fas fa-comment"></i>
  //       응원하기
  //     </div>
  //   </div>`
  //   } else {
  //     bottomAd.innerHTML = ` <div class="bottom_ad_top">연대생이 만드는 AI양반 기대해주세요!</div>
  //   <div class="bottom_ad_bottom">
  //     <div class="bottom_ad_ment">
  //       커피 한 잔, 응원해주세요 (5,000원)
  //     </div>
  //     <div class="bottom_ad_btn">
  //       <i class="fas fa-comment"></i>
  //       응원하기
  //     </div>
  //   </div>`
  //   }
  // }
  // const bottomBtn = document.querySelector(`.bottom_ad_btn`)
  // if (bottomBtn) {
  //   bottomBtn.addEventListener('click', () => {
  //     location.href = 'https://qr.kakaopay.com/Ej9MgSCp09c405780'
  //   })
  // }
}
init()
