// 실시간 js

const countNum = document.querySelector(`.count__num`);
const time = document.querySelector(`.timer`);

if (countNum) {
  function handleCountNum() {
    let countNumber = 4209999;
    function countUp() {
      if (countNumber < 8135311) {
        countNumber = countNumber + 36994;
        countNum.innerHTML = countNumber;
      }
    }
    setInterval(countUp, 1);
    time.innerHTML = `(20.12.07 22:00 기준)`;
  }
  handleCountNum();
}
