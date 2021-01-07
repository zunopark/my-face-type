const headerMenu = document.querySelector(`.header__menu__wrap`);
const headerMenuBtn = document.querySelector(`.header__menu__btn`);
const headerTitle = document.querySelector(`.header__title`);
const aiMenuBtn = document.querySelector(`#ai`);
const animalMenuBtn = document.querySelector(`#animal`);
const houseMenuBtn = document.querySelector(`#house`);

// console.log(temp);

function handleMenu() {
  if (headerMenu.classList[2] === undefined) {
    headerMenu.classList.add("header__anim__up");
  } else if (headerMenu.classList[2] === "header__anim__up") {
    headerMenu.classList.remove("header__anim__up");
  }
}

function handleAiMenu() {
  location.href = "https://yourface.ga";
}

function handleHouseMenu() {
  location.href = "https://yourface.ga/house";
}

function handleAnimalMenu() {
  location.href = "https://animalface.site/";
}

function handleTitleBtn() {
  location.href = "https://yourface.ga";
}

function init() {
  if (headerMenu) {
    headerMenuBtn.addEventListener("click", handleMenu);
    setTimeout(function () {
      headerMenu.classList.add("header__anim__result");
    }, 500);
    aiMenuBtn.addEventListener("click", handleAiMenu);
    houseMenuBtn.addEventListener("click", handleHouseMenu);
    animalMenuBtn.addEventListener("click", handleAnimalMenu);
    headerTitle.addEventListener("click", handleTitleBtn);
  }
}
init();
