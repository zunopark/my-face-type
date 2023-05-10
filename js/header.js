const headerContent = () => {
  const headerMain = document.querySelector(`.header`)

  if (headerMain.id === 'face') {
    headerMain.innerHTML = ` <div class="header__upper header_fixed">
  <div class="header__title">
    <a href="/" class="header__title__title">관상가 양반</a>
    <div class="header_title_date"></div>
  </div>
</div>`
  } else if (headerMain.id === 'fortune') {
    headerMain.innerHTML = ` <div class="header__upper header_fixed">
  <div class="header__title">
    <a href="/fortune" class="header__title__title">역술가 양반</a>
    <div class="header_title_date"></div>
  </div>
</div>`
  } else if (headerMain.id === 'dream') {
    headerMain.innerHTML = ` <div class="header__upper header_fixed">
  <div class="header__title">
    <a href="/dream" class="header__title__title">해몽가 양반</a>
    <div class="header_title_date"></div>
  </div>
</div>`
  }

  const mainContentWrap = this.document.querySelector(`.main_content_wrap`)
  mainContentWrap.classList.add('main_content_wrap_top_margin')
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

// const headerFixedFunc = () => {
//   window.addEventListener('scroll', function () {
//     const headerNavWrap = document.querySelector('.header_nav_wrap')
//     const mainContentWrap = this.document.querySelector(`.main_content_wrap`)
//     mainContentWrap.classList.add('main_content_wrap_top_margin')

//     if (window.pageYOffset > 68) {
//       headerNavWrap.classList.add('header_fixed')
//       if (mainContentWrap) {
//         mainContentWrap.classList.add('main_content_wrap_top_margin')
//       }
//     } else {
//       headerNavWrap.classList.remove('header_fixed')
//       if (mainContentWrap) {
//         mainContentWrap.classList.remove('main_content_wrap_top_margin')
//       }
//     }
//   })
// }

// const goHeaderHome = () => {
//   const headerTitle = document.querySelector(`.header__title__title`)

//   headerTitle.addEventListener('click', function (event) {
//     event.preventDefault()
//     window.location.href = '/'
//   })
// }

function init() {
  headerContent()
  headerGetTime()
  // headerFixedFunc()
  // goHeaderHome()
}

init()
