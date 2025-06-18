const footer = document.querySelector(`.footer`)
const headerForAd = document.querySelector(`.header`)

const appVersion = '1.004'

function init() {

  footer.innerHTML = `  <div class="contact">
    <a href="mailto:dydtjq94@yonsei.ac.kr" class="contact_me">문의</a>
    <a href="/" class="contact_me">관상</a>
    <a href="/analysis" class="contact_me">해석</a>
    <a href="/fortune" class="contact_me">운세</a>
    <a href="/dream" class="contact_me">해몽</a>
    <a href="/blog" class="contact_me">블로그</a>
  </div>

  <div class="footer_text_wrap">
    <span class="footer_company">AI양반</span>
  </div>
  <span class="footer_text_wrap">
    ⓒ 2024. NMAX, All Rights Reserved. App Version: ${appVersion}
  </span>

  <div class="business_info" style="font-size: 12px; color: #aaa; line-height: 1.6; margin-top: 16px;">
    <div><strong>상호명 (대표자명)</strong> – 엔맥스 (윤용섭)</div>
    <div><strong>사업자등록번호</strong> - 418-12-65319</div>
    <div><strong>사업장 주소</strong> - 서울특별시 마포구 월드컵북로 6길 57-6, 2층 (연남동)</div>
    <div><strong>유선번호</strong> – 010-7189-9943</div>
    <div><strong>통신판매업 신고번호</strong> - 제 2023-성남분당B-0437 호</div>
  </div>

  <div style="margin-top: 20px;">
  <a href="/refund.html" target="_blank" style="font-size: 12px; color: #007bff; text-decoration: underline;">
    환불 정책 보기
  </a>
</div>
`
}
init()
