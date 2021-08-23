const habitownBannerWrap = document.querySelector(`.habitown__banner__wrap`)

if (habitownBannerWrap) {
  setTimeout(function () {
    habitownBannerWrap.classList.add('appear')
  }, 1500)
}

const never = localStorage.getItem('never')
console.log(never)

if (!never) {
  habitownBannerWrap.innerHTML = `<div class="habitown__banner">
<div class="habitown__upper__title">
  <div class="habitown__upper__comment">
    관상가양반 X Habitown
  </div>

  <div class="habitown__lower__comment">
    관상테스트 개발자가 직접 만든 어플리케이션
  </div>
</div>
<div class="habitown__btn">
  <div class="habitown__left">
    <div class="left__icon">
      <img src="https://ifh.cc/g/P1cL1P.png" alt="" />
    </div>
    <div class="left__description">
      <div class="left__title">Habitown - 습관 형성 앱</div>
      <div class="left__sub">게임처럼 즐기는 습관 만들기</div>
      <div class="left__star">
        <i class="fas fa-star" style="user-select: auto;"></i>
        <i class="fas fa-star" style="user-select: auto;"></i>
        <i class="fas fa-star" style="user-select: auto;"></i>
        <i class="fas fa-star" style="user-select: auto;"></i>
        <i class="fas fa-star" style="user-select: auto;"></i>
        <span>43</span>
      </div>
    </div>
  </div>
  <div class="habitown__app__download">
    <div class="app__download__btn">열기</div>
  </div>
</div>

<div class="habitown__under__img__wrap">
  <div class="habitown__img under__img1">
    <img src="https://ifh.cc/g/skXO5p.jpg" alt="" />
  </div>
  <div class="habitown__img under__img2">
    <img src="https://ifh.cc/g/8HMj7x.jpg" alt="" />
  </div>
  <div class="habitown__img under__img3">
    <img src="https://ifh.cc/g/f6CrML.jpg" alt="" />
  </div>
</div>
<div class="habitown__download__btn__bottom">
  더 알아보기
</div>
<div class="habitown__cancel__btn__bottom">
  <div class="cancel__btn__left">
    다시 보지 않기
  </div>
  <div class="cancel__btn__right">
    닫기
  </div>
</div>
</div>

<div class="black__board"></div>`

  const habitownBanner = document.querySelector(`.habitown__banner`)
  const downloadBtn = document.querySelector(`.app__download__btn`)
  const downloadBottonBtn = document.querySelector(
    `.habitown__download__btn__bottom`,
  )

  const cancelNeverBtn = document.querySelector(`.cancel__btn__left`)

  const cancelBtn = document.querySelector(`.cancel__btn__right`)
  const blackBoard = document.querySelector(`.black__board`)

  function handleGoAppDownload() {
    location.href = 'http://onelink.to/habitown'
    habitownBanner.classList.add('disblock')
    blackBoard.classList.add('disblock')
  }

  function handleCancelBanner() {
    habitownBanner.classList.add('disblock')
    blackBoard.classList.add('disblock')
  }

  function handleCancelNeverBanner() {
    localStorage.setItem('never', 'ok')
    habitownBanner.classList.add('disblock')
    blackBoard.classList.add('disblock')
  }

  function habitownInit() {
    downloadBtn.addEventListener('click', handleGoAppDownload)
    downloadBottonBtn.addEventListener('click', handleGoAppDownload)
    cancelBtn.addEventListener('click', handleCancelBanner)
    blackBoard.addEventListener('click', handleCancelBanner)
    cancelNeverBtn.addEventListener('click', handleCancelNeverBanner)
  }

  habitownInit()
}
