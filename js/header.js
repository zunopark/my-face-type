const headerMenu = document.querySelector(`.header__menu__wrap`);
const headerMenuBtn = document.querySelector(`.header__menu__btn`);
const headerTitle = document.querySelector(`.header__title`);
const aiMenuBtn = document.querySelector(`#ai`);
const animalMenuBtn = document.querySelector(`#animal`);
const boyAiMenuBtn = document.querySelector(`#boyAi`);
const girlAiMenuBtn = document.querySelector(`#girlAi`);
const allListMenuBtn = document.querySelector(`#allList`);
// console.log(temp);

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

function handleAnimalMenu() {
  location.href = "https://animalface.site/";
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

function init() {
  if (headerMenu) {
    headerMenuBtn.addEventListener("click", handleMenu);
    setTimeout(function () {
      headerMenu.classList.add("header__anim__result");
    }, 500);

    aiMenuBtn.addEventListener("click", handleAiMenu);
    animalMenuBtn.addEventListener("click", handleAnimalMenu);
    boyAiMenuBtn.addEventListener("click", handleBoyMenu);
    girlAiMenuBtn.addEventListener("click", handleGirlMenu);
    allListMenuBtn.addEventListener("click", handleAllMenu);
    headerTitle.addEventListener("click", handleTitleBtn);
  }
}
init();
