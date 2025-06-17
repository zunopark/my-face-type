let deadline = new Date('2023-08-31T00:00:00')

function getTimeRemaining(endtime) {
  let t = Date.parse(endtime) - Date.parse(new Date())
  let seconds = Math.floor((t / 1000) % 60)
  let minutes = Math.floor((t / 1000 / 60) % 60)
  let hours = Math.floor((t / (1000 * 60 * 60)) % 24)
  let days = Math.floor(t / (1000 * 60 * 60 * 24))
  return {
    total: t,
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: seconds,
  }
}

function initializeClock(id, endtime) {
  let clock = document.getElementById(id)
  let timeinterval = setInterval(function () {
    let t = getTimeRemaining(endtime)
    clock.innerHTML =
      '마감까지 ' +
      t.days +
      '일 ' +
      t.hours +
      '시간 ' +
      t.minutes +
      '분 ' +
      t.seconds +
      '초 '
    if (t.total <= 0) {
      clearInterval(timeinterval)
      clock.innerHTML = '기한이 만료되었습니다.'
    }
  }, 1000)
}

initializeClock('timer', deadline)
