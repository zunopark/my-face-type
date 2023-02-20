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

  time.innerHTML = `(${year}.${month < 10 ? `0${month}` : month}.${
    date < 10 ? `0${date}` : date
  } ${hour < 10 ? `0${hour}` : hour}:00 기준)`
}

const randomBanner = document.querySelector(`.randomBanner`)
const randomNum = Math.floor(Math.random() * 2) + 1

if (randomNum == 1) {
  randomBanner.innerHTML = `
  <a
    class="dang__img"
    href=" https://refilled.co.kr/shop?utm_source=keen?utm_campaign=keen?utm_medium=banner?utm_content=scanner"
    onclick="gtag('event', '리필드스캐너이미지', {'event_category':
  '리필드스캐너이미지','event_label': '리필드스캐너이미지'});"
  ><img
  src="https://i.ibb.co/L9pfTYB/Kakao-Talk-Photo-2023-02-20-15-03-28-001.jpg"
  alt="scanner"
/>
  </a>`
} else {
  randomBanner.innerHTML = `
  <a
    class="dang__img"
    href="https://refilled.co.kr/shop?utm_source=keen?utm_campaign=keen?utm_medium=banner?utm_content=booster"
    onclick="gtag('event', '리필드부스터이미지', {'event_category':
  '리필드부스터이미지','event_label': '리필드부스터이미지'});"
  >
  <img
  src="https://i.ibb.co/2Fhd1N3/booster.jpg"
  alt="scanner"
/>
  </a>`
}
