const headerDate = document.querySelector(`.header_title_date`)

const headerGetTime = () => {
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

function init() {
  headerGetTime()

  window.addEventListener('scroll', function () {
    const headerNavWrap = document.querySelector('.header_nav_wrap')
    const mainContentWrap = this.document.querySelector(`.main_content_wrap`)
    if (window.pageYOffset > 68) {
      headerNavWrap.classList.add('header_fixed')
      mainContentWrap.classList.add('main_content_wrap_top_margin')
    } else {
      headerNavWrap.classList.remove('header_fixed')
      mainContentWrap.classList.remove('main_content_wrap_top_margin')
    }
  })
}

init()
