const headerContent = () => {
  const headerMain = document.querySelector(`.header`)

  if (headerMain.id === 'face') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content header_nav_select">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>

</div>`
  } else if (headerMain.id === 'fortune') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content header_nav_select">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>
</div>`
  } else if (headerMain.id === 'destiny') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content header_nav_select">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>
</div>`
  } else if (headerMain.id === 'compatibility') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content header_nav_select">궁합</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>
</div>`
  } else if (headerMain.id === 'constellation') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/constellation" class="header_nav_content header_nav_select">별자리</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>
</div>`
  } else if (headerMain.id === 'tarot') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/tarot" class="header_nav_content header_nav_select">타로</a>
  <a href="/lotto" class="header_nav_content">로또</a>
</div>`
  } else if (headerMain.id === 'lotto') {
    headerMain.innerHTML = ` <div class="header__upper">
  <div class="header__title">
    <div class="header__title__title">AI양반</div>
    <div class="header_title_date"></div>
  </div>
</div>
<div class="header_nav_wrap">
  <a href="/" class="header_nav_content">
    관상
  </a>
  <a href="/fortune" class="header_nav_content">운세</a>
  <a href="/destiny" class="header_nav_content">사주</a>
  <a href="/compatibility" class="header_nav_content">궁합</a>
  <a href="/tarot" class="header_nav_content">타로</a>
  <a href="/lotto" class="header_nav_content header_nav_select">로또</a>
</div>`
  }
}

const headerGetTime = () => {
  const headerDate = document.querySelector(`.header_title_date`)

  let today = new Date()
  let year = today.getFullYear()
  let month = today.getMonth() + 1
  let date = today.getDate()
  let dayOfWeekString = ''
  const dayOfWeek = today.getDay()
  switch (dayOfWeek) {
    case 0:
      dayOfWeekString = '일요일'
      break
    case 1:
      dayOfWeekString = '월요일'
      break
    case 2:
      dayOfWeekString = '화요일'
      break
    case 3:
      dayOfWeekString = '수요일'
      break
    case 4:
      dayOfWeekString = '목요일'
      break
    case 5:
      dayOfWeekString = '금요일'
      break
    case 6:
      dayOfWeekString = '토요일'
      break
  }

  headerDate.innerHTML = `${year.toString().substring(2)}.${
    month < 10 ? `0${month}` : month
  }.${date < 10 ? `0${date}` : date} ${dayOfWeekString}`
}

const headerFixedFunc = () => {
  window.addEventListener('scroll', function () {
    const headerNavWrap = document.querySelector('.header_nav_wrap')
    const mainContentWrap = this.document.querySelector(`.main_content_wrap`)
    if (window.pageYOffset > 68) {
      headerNavWrap.classList.add('header_fixed')
      if (mainContentWrap) {
        mainContentWrap.classList.add('main_content_wrap_top_margin')
      }
    } else {
      headerNavWrap.classList.remove('header_fixed')
      if (mainContentWrap) {
        mainContentWrap.classList.remove('main_content_wrap_top_margin')
      }
    }
  })
}

const goHeaderHome = () => {
  const headerTitle = document.querySelector(`.header__title__title`)

  headerTitle.addEventListener('click', function (event) {
    event.preventDefault()
    window.location.href = '/'
  })
}

function init() {
  headerContent()
  headerGetTime()
  headerFixedFunc()
  goHeaderHome()
}

init()
