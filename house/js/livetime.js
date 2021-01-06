// 실시간 js

const countNum = document.querySelector(`.count__num`);

if (countNum) {
  getTime();
  function handleCountNum() {
    let countNumber = 1200;
    function countUp() {
      if (countNumber < 1933) {
        countNumber = countNumber + 7;
        countNum.innerHTML = countNumber;
      }
    }
    setInterval(countUp, 1);
  }

  handleCountNum();
}

function getTime() {
  let currentTime = new Date();
  let year = currentTime.getFullYear();
  let month = currentTime.getMonth() + 1;
  let date = currentTime.getDate();
  let hour = currentTime.getHours();

  const time = document.querySelector(`.timer`);

  time.innerHTML = `(${year}.${month < 10 ? `0${month}` : month}.${
    date < 10 ? `0${date}` : date
  } ${hour < 10 ? `0${hour}` : hour}:00 기준)`;
}