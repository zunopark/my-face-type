// 실시간 js

// if (countNum) {
//   getTime();
//   function handleCountNum() {
//     let countNumber = 12209999;
//     function countUp() {
//       if (countNumber < 21432627) {
//         countNumber = countNumber + 47994;
//         countNum.innerHTML = countNumber;
//       }
//     }
//     setInterval(countUp, 1);
//   }

//   handleCountNum();
// }

getTime();

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
