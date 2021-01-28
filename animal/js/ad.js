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

//배너 광고 js
const superImg = document.querySelector(`.super__img`);
if (superImg) {
  function handleSuper() {
    var newWindow = window.open("about:blank");
    newWindow.location.href =
      "https://ceo.supermembers.co.kr/?utm_source=naver&utm_medium=cpc&utm_campaign=2020faceApp&utm_term=faceApp&utm_content=faceAppAd";
  }
  superImg.addEventListener("click", handleSuper);
}

// const dosaImg = document.querySelector(`.dosa__img`);
// if (dosaImg) {
//   function handleDosa() {
//     var newWindow = window.open("about:blank");
//     newWindow.location.href = "https://bit.ly/3ogfHm7";
//   }
//   dosaImg.addEventListener("click", handleDosa);
// }

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
    newWindow.location.href = "testmake.html";
  }
  helloImg.addEventListener("click", handleHello);
}

// 구독 입력 js
const thx = document.querySelector(`#thx`);
const applying = document.querySelector(`#applying`);
const submitBtn = document.querySelector(`.submit__submit`);
const submitEmail = document.querySelector(`.submit__email`);

function handleSubmitBtn() {
  if (submitEmail.value !== "") {
    applying.classList.remove("none");
    setTimeout(function () {
      submitBtn.disabled = "disabled";
    }, 100);
  }
  let link = setInterval(function () {
    if (thx.style.display === "block") {
      setTimeout(function () {
        applying.classList.add("none");
      }, 10);
      clearInterval(link);
    }
  }, 200);
}

submitBtn.addEventListener("click", handleSubmitBtn);
