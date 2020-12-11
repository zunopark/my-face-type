// 실시간 js

const countNum = document.querySelector(`.count__num`);
const time = document.querySelector(`.timer`);

if (countNum) {
  function handleCountNum() {
    let countNumber = 7209999;
    function countUp() {
      if (countNumber < 11452627) {
        countNumber = countNumber + 37994;
        countNum.innerHTML = countNumber;
      }
    }
    setInterval(countUp, 1);
    time.innerHTML = `(20.12.11 12:00 기준)`;
  }
  handleCountNum();
}
