const headerMenu = document.querySelector(`.header__menu__wrap`)
const headerMenuBtn = document.querySelector(`.header__menu__btn`)
const headerTitle = document.querySelector(`.header__title__title`)
const headerBlog = document.querySelector(`.header__title__blog`)
const aiMenuBtn = document.querySelector(`#ai`)
const animalMenuBtn = document.querySelector(`#animal`)
const houseMenuBtn = document.querySelector(`#house`)
const idolMenuBtn = document.querySelector(`#idol`)
const blogMenuBtn = document.querySelector(`#blog`)

function handleMenu() {
  if (headerMenu.classList[2] === undefined) {
    headerMenu.classList.add('header__anim__up')
  } else if (headerMenu.classList[2] === 'header__anim__up') {
    headerMenu.classList.remove('header__anim__up')
  }
}

function handleAiMenu() {
  location.href = 'https://yourface.ga'
}

function handleBlogMenu() {
  location.href = 'https://yourface.ga/blog'
}

function handleHouseMenu() {
  location.href = 'https://yourface.ga/house'
}

function handleAnimalMenu() {
  location.href = 'https://animalface.site/'
}

function handleTitleBtn() {
  location.href = 'https://yourface.ga'
}

function handleIdolMenu() {
  location.href = 'https://yourface.ga/k-pop2008/'
}
function init() {
  if (headerMenu) {
    headerMenuBtn.addEventListener('click', handleMenu)
    setTimeout(function () {
      headerMenu.classList.add('header__anim__result')
    }, 500)

    aiMenuBtn.addEventListener('click', handleAiMenu)
    houseMenuBtn.addEventListener('click', handleHouseMenu)
    animalMenuBtn.addEventListener('click', handleAnimalMenu)
    headerTitle.addEventListener('click', handleTitleBtn)
    headerBlog.addEventListener('click', handleBlogMenu)
    idolMenuBtn.addEventListener('click', handleIdolMenu)
    blogMenuBtn.addEventListener('click', handleBlogMenu)
  }
}
init()
