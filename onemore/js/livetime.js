// 실시간 js
const countNum = document.querySelector(`.count__num`)

if (countNum) {
  function handleCountNum() {
    let countNumber = 15
    function countUp() {
      if (countNumber < 897) {
        countNumber = countNumber + 3
        countNum.innerHTML = `5,457만 2,${countNumber}`
      }
    }
    setInterval(countUp, 1)
  }

  handleCountNum()
}

// getTime()

// function getTime() {
//   let currentTime = new Date()
//   let year = currentTime.getFullYear()
//   let month = currentTime.getMonth() + 1
//   let date = currentTime.getDate()
//   let hour = currentTime.getHours()

//   const time = document.querySelector(`.timer`)

//   time.innerHTML = `(${year}.${month < 10 ? `0${month}` : month}.${
//     date < 10 ? `0${date}` : date
//   } ${hour < 10 ? `0${hour}` : hour}:00 기준)`
// }
