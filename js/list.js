const testAi = document.querySelector(`.test__ai`);

function handleTestAi() {
  location.href = "index.html";
}

function init() {
  testAi.addEventListener("click", handleTestAi);
}

init();

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
