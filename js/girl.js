const aiCont = document.querySelector(`.ai`);

async function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      $(".image-upload-wrap").hide();

      $(".file-upload-image").attr("src", e.target.result);
      $(".file-upload-content").show();

      $(".image-title").html(input.files[0].name);
    };

    await reader.readAsDataURL(input.files[0]);
    await init();
    aiCont.classList.add("disblock");
  } else {
    removeUpload();
  }
}

function removeUpload() {
  $(".file-upload-input").replaceWith($(".file-upload-input").clone());
  $(".file-upload-content").hide();
  $(".image-upload-wrap").show();
}
$(".image-upload-wrap").bind("dragover", function () {
  $(".image-upload-wrap").addClass("image-dropping");
});
$(".image-upload-wrap").bind("dragleave", function () {
  $(".image-upload-wrap").removeClass("image-dropping");
});

// 동물상 모델 학습
const URL = "https://teachablemachine.withgoogle.com/models/geNoPYIVp/";

let model, labelContainer, maxPredictions;

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  labelContainer = document.getElementById("label-container");
  for (let i = 0; i < maxPredictions; i++) {
    labelContainer.appendChild(document.createElement("span"));
  }
  predict();
  toggle.classList.add("hidden");
}

async function predict() {
  let image = document.getElementById("face-image");
  const prediction = await model.predict(image, false);

  let arr = new Map();
  // 내 얼굴상에 따른 이성친구의 얼굴상을 mapping
  // 내가 dog 일 때 => 상대방은 cat
  // 내가 cat 일 때 => 상대방은 dog
  // 내가 bear 일 때 => 상대방은 rabbit
  // 내가 dino 일 때 => 상대방은 bear
  // 내가 rabbit 일 때 => 상대방은 dino
  let description = {
    dog: [
      "당신의 얼굴상과 어울리는 남자친구의 관상은 고양이 얼굴의 관상입니다.",
      "남자친구는 고양이 얼굴의 관상, 황민현, 시우민, 강동원, 이종석, 이준기",
    ],
    cat: [
      "당신의 얼굴상과 어울리는 남자친구의 관상은 강아지 얼굴의 관상입니다.",
      "남자친구는 강아지 얼굴의 관상, 강다니엘, 백현, 박보검, 송중기",
    ],
    bear: [
      "당신의 얼굴상과 어울리는 남자친구의 관상은 토끼 얼굴의 관상입니다.",
      "남자친구는 토끼 얼굴의 관상, 정국, 바비, 박지훈, 수호",
    ],
    dino: [
      "당신의 얼굴상과 어울리는 남자친구의 관상은 곰 얼굴의 관상입니다.",
      "남자친구는 곰 얼굴의 관상, 마동석, 조진웅, 조세호, 안재홍",
    ],
    rabbit: [
      "당신의 얼굴상과 어울리는 남자친구의 관상은 공룡 얼굴의 관상입니다.",
      "남자친구는 공룡 얼굴의 관상, 윤두준, 이민기, 김우빈, 육성재, 공유",
    ],
  };

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    arr.set(
      prediction[i].className,
      parseInt((prediction[i].probability * 100).toFixed(0))
    );
  }

  maxV = 0;
  answer = "";
  let resultArray = [];
  arr.forEach((value, key, mapObject) => {
    resultArray.push({ key, value });
    if (value > maxV) {
      maxV = value;
      answer = key;
    }
  });

  Array.prototype.shuffle = function () {
    var length = this.length;
    while (length) {
      var index = Math.floor(length-- * Math.random());
      var temp = this[length];
      this[length] = this[index];
      this[index] = temp;
    }
    return this;
  };

  resultArray.shuffle();

  for (let i = 0; i < resultArray.length - 1; i++) {
    for (let j = i + 1; j < resultArray.length; j++) {
      if (resultArray[j].value > resultArray[i].value) {
        let temp = resultArray[i];
        resultArray[i] = resultArray[j];
        resultArray[j] = temp;
      }
    }
  }

  const starsEng = [];

  for (let i = 0; i < 5; i++) {
    let a = description[resultArray[i].key];
    starsEng.push(a[2]);
  }

  let starsListImg = "";

  for (let j = 0; j < 5; j++) {
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent zero">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent zeroone">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent onetwo">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent twothree">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent threefour">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent fourfive">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent fivesix">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent sixseven">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent seveneight">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent eightnine">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultArray[j].key}
        </div> 
        <div class="percent nineten">${resultArray[j].value}%</div>
      </div>
        `;
    }
  }

  let result = document.createElement("div");
  result.textContent = `${description[answer][1]}`;
  labelContainer.appendChild(result);

  let result2 = document.createElement("div");
  result2.classList.add("celebrity");
  result2.textContent = `${answer}`;
  labelContainer.appendChild(result2);

  let desc = document.createElement("p");
  desc.textContent = description[answer][0];
  labelContainer.appendChild(desc);

  let otherResult = document.createElement("div");
  otherResult.classList.add("other__result");
  otherResult.innerHTML = `${starsListImg}`;
  labelContainer.appendChild(otherResult);

  let reset = document.createElement("button");
  reset.innerHTML = "다른 사진도 해보기";
  labelContainer.appendChild(reset);

  // let boyFriendTest = document.createElement("button");
  // boyFriendTest.classList.add("boy__friend__btn");
  // boyFriendTest.innerHTML = "크리스마스를 함께 할 내 남자친구상은?";
  // labelContainer.appendChild(boyFriendTest);

  // let girlFriendTest = document.createElement("button");
  // girlFriendTest.classList.add("girl__friend__btn");
  // girlFriendTest.innerHTML = "크리스마스를 함께 할 내 여자친구상은?";
  // labelContainer.appendChild(girlFriendTest);

  reset.addEventListener("click", handleReset);

  const privacy = document.querySelector(`.noti`);
  privacy.style.display = "none";

  function handleReset(e) {
    location.href = "again.html";
  }
}

var toggle = document.getElementById("container");
var toggleContainer = document.getElementById("toggle-container");
var toggleNumber;
let changePicture = document.querySelector(".image-upload-wrap");
if (toggle) {
  toggle.addEventListener("click", function () {
    toggleNumber = !toggleNumber;
    if (toggleNumber) {
      toggleContainer.style.clipPath = "inset(0 0 0 50%)";
      toggleContainer.style.backgroundColor = "dodgerblue";
      changePicture.style.backgroundImage =
        "url(https://kr.object.ncloudstorage.com/your-face/man.jpeg)";
    } else {
      toggleContainer.style.clipPath = "inset(0 50% 0 0)";
      toggleContainer.style.backgroundColor = "#D74046";
      changePicture.style.backgroundImage =
        "url(https://kr.object.ncloudstorage.com/your-face/woman.png)";
    }
  });
}

// 실시간 js

const countNum = document.querySelector(`.count__num`);
const time = document.querySelector(`.timer`);
if (countNum) {
  function handleCountNum() {
    let countNumber = 3209999;
    function countUp() {
      if (countNumber < 6735311) {
        countNumber = countNumber + 10994;
        countNum.innerHTML = countNumber;
      }
    }
    setInterval(countUp, 1);
    time.innerHTML = `(20.12.05 12:00 기준)`;
  }
  handleCountNum();
}

//광고 js

const superImg = document.querySelector(`.super__img`);
if (superImg) {
  function handleSuper() {
    var newWindow = window.open("about:blank");
    newWindow.location.href =
      "https://ceo.supermembers.co.kr/?utm_source=naver&utm_medium=cpc&utm_campaign=2020faceApp&utm_term=faceApp&utm_content=faceAppAd";
  }
  superImg.addEventListener("click", handleSuper);
}
const dosaImg = document.querySelector(`.dosa__img`);

if (dosaImg) {
  function handleDosa() {
    var newWindow = window.open("about:blank");
    newWindow.location.href = "https://bit.ly/3ogfHm7";
  }
  dosaImg.addEventListener("click", handleDosa);
}

const linerImg = document.querySelector(`.liner__img`);
if (linerImg) {
  function handleLiner() {
    var newWindow = window.open("about:blank");
    newWindow.location.href =
      "https://getliner.com/?utm_source=site_listing&utm_medium=banner&utm_campaign=physiognomy_kr&utm_content=mock_up_free_web_pdf_hi";
  }
  linerImg.addEventListener("click", handleLiner);
}
const helloImg = document.querySelector(`.hello__img`);
if (helloImg) {
  function handleHello() {
    var newWindow = window.open("about:blank");
    newWindow.location.href = "https://abr.ge/wj4qfp3";
  }
  helloImg.addEventListener("click", handleHello);
}

// 상단 광고 js

const adUpper = document.querySelector(`.ad__upper`);
const adUpperBtn = document.querySelector(`.ad__upper__hide__btn`);

function handleAdUpper() {
  if (adUpper.classList[2] === undefined) {
    adUpper.classList.add("snackbar__anim__up");
  } else if (adUpper.classList[2] === "snackbar__anim__up") {
    adUpper.classList.remove("snackbar__anim__up");
  }
}

if (adUpper) {
  adUpperBtn.addEventListener("click", handleAdUpper);
  setTimeout(function () {
    adUpper.classList.add("snackbar__anim__result");
  }, 1000);
}

//header js

const headerMenu = document.querySelector(`.header__menu__wrap`);
const headerMenuBtn = document.querySelector(`.header__menu__btn`);
const headerTitle = document.querySelector(`.header__title`);
const aiMenuBtn = document.querySelector(`#ai`);
const boyAiMenuBtn = document.querySelector(`#boyAi`);
const girlAiMenuBtn = document.querySelector(`#girlAi`);
const allListMenuBtn = document.querySelector(`#allList`);

function handleMenu() {
  if (headerMenu.classList[2] === undefined) {
    headerMenu.classList.add("header__anim__up");
  } else if (headerMenu.classList[2] === "header__anim__up") {
    headerMenu.classList.remove("header__anim__up");
  }
}

function handleAiMenu() {
  location.href = "index.html";
}

function handleBoyMenu() {
  location.href = "boyfr.html";
}

function handleGirlMenu() {
  location.href = "girlfr.html";
}
function handleAllMenu() {
  location.href = "list.html";
}

function handleTitleBtn() {
  location.href = "index.html";
}

if (headerMenu) {
  headerMenuBtn.addEventListener("click", handleMenu);
  setTimeout(function () {
    headerMenu.classList.add("header__anim__result");
  }, 500);

  aiMenuBtn.addEventListener("click", handleAiMenu);
  boyAiMenuBtn.addEventListener("click", handleBoyMenu);
  girlAiMenuBtn.addEventListener("click", handleGirlMenu);
  allListMenuBtn.addEventListener("click", handleAllMenu);
  headerTitle.addEventListener("click", handleTitleBtn);
}
