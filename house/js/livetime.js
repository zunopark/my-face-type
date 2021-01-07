// 실시간 js

const countNum = document.querySelector(`.count__num`);
getTime();

// if (countNum) {
//   function handleCountNum() {
//     let countNumber = 1200;
//     function countUp() {
//       if (countNumber < 2318) {
//         countNumber = countNumber + 7;
//         countNum.innerHTML = countNumber;
//       }
//     }
//     setInterval(countUp, 1);
//   }

//   handleCountNum();
// }

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

// main people

let description = [
  { key: "심수련", src: "https://i.ibb.co/vmw1sN9/image.png" },
  { key: "천서진", src: "https://i.ibb.co/qyq6HHJ/image.png" },
  { key: "오윤희", src: "https://i.ibb.co/nkcfMdS/image.png" },
  { key: "주단태", src: "https://i.ibb.co/GJVG6s2/image.png" },
  { key: "강마리", src: "https://i.ibb.co/D4P11Sm/image.png" },
  { key: "이규진", src: "https://i.ibb.co/9TGp6RC/image.png" },
  { key: "마두기", src: "https://i.ibb.co/ng2Nr1w/image.png" },
  { key: "배로나", src: "https://i.ibb.co/8jx9Jst/image.png" },
  { key: "민설아", src: "https://i.ibb.co/nB34ZDF/image.png" },
  { key: "하은별", src: "https://i.ibb.co/zN6DqkJ/image.png" },
  { key: "유제니", src: "https://i.ibb.co/J5dmrWV/image.png" },
  { key: "주석경", src: "https://i.ibb.co/CJLmM0S/image.png" },
  { key: "주석훈", src: "https://i.ibb.co/yydnWgK/image.png" },
  { key: "로건리", src: "https://i.ibb.co/FzLN8zH/image.png" },
  { key: "하윤철", src: "https://i.ibb.co/sy7yC2d/image.png" },
];
console.log(description[0].key);

const introChar1 = document.querySelector(`.intro__character1`);
const introChar2 = document.querySelector(`.intro__character2`);
const introChar3 = document.querySelector(`.intro__character3`);

let starsListImg1 = "";
for (let j = 0; j < 5; j++) {
  starsListImg1 =
    starsListImg1 +
    ` <div class="star__list__wrap2">
      <div class="star__list__img2">
      <img src=${description[j].src} alt="">
      </div> 
      <div class="percent zero">${description[j].key}</div>
    </div>
      `;
}
let starsListImg2 = "";
for (let j = 5; j < 10; j++) {
  starsListImg2 =
    starsListImg2 +
    ` <div class="star__list__wrap2">
      <div class="star__list__img2">
      <img src=${description[j].src} alt="">
      </div> 
      <div class="percent zero">${description[j].key}</div>
    </div>
      `;
}
let starsListImg3 = "";
for (let j = 10; j < 15; j++) {
  starsListImg3 =
    starsListImg3 +
    ` <div class="star__list__wrap2">
      <div class="star__list__img2">
      <img src=${description[j].src} alt="">
      </div> 
      <div class="percent zero">${description[j].key}</div>
    </div>
      `;
}

introChar1.innerHTML = starsListImg1;
introChar2.innerHTML = starsListImg2;
introChar3.innerHTML = starsListImg3;
