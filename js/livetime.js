// 실시간 js
const countNum = document.querySelector(`.count__num`)

if (countNum) {
  function handleCountNum() {
    let countNumber = 15
    function countUp() {
      if (countNumber < 897) {
        countNumber = countNumber + 3
        countNum.innerHTML = `6,257만 2,${countNumber}`
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

// // 모달을 가져옵니다
// var modal = document.getElementById('myModal')

// // 모달을 여는 버튼을 가져옵니다
// var btn = document.getElementById('openModal')

// // 모달을 닫는 <span> 요소를 가져옵니다
// var span = document.getElementsByClassName('close')[0]

// // 사용자가 버튼을 클릭하면 모달을 엽니다
// btn.onclick = function () {
//   modal.style.display = 'block'
// }

// // 사용자가 <span> (x)를 클릭하면 모달을 닫습니다
// span.onclick = function () {
//   modal.style.display = 'none'
// }

// // 사용자가 모달 외부를 클릭하면 모달을 닫습니다
// window.onclick = function (event) {
//   if (event.target == modal) {
//     modal.style.display = 'none'
//   }
// }
