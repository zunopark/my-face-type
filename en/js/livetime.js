// 실시간 js
const countNum = document.querySelector(`.count__num`)

if (countNum) {
  function handleCountNum() {
    let countNumber = 100
    function countUp() {
      if (countNumber < 943) {
        countNumber = countNumber + 3
        countNum.innerHTML = `40,189,${countNumber}`
      }
    }
    setInterval(countUp, 1)
  }

  handleCountNum()
}

getTime()

function getTime() {
  let currentTime = new Date()
  let year = currentTime.getFullYear()
  let month = currentTime.getMonth() + 1
  let date = currentTime.getDate()
  let hour = currentTime.getHours()

  const time = document.querySelector(`.timer`)

  time.innerHTML = `(As of ${month < 10 ? `0${month}` : month} ${
    date < 10 ? `0${date}` : date
  }, ${year} at ${hour < 10 ? `0${hour}` : hour}:00)`
}

const randomBanner = document.querySelector(`.randomBanner`)
const randomNum = Math.floor(Math.random() * 2) + 1
