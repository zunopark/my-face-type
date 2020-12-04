const testAi = document.querySelector(`.test__ai`);

function handleTestAi() {
  location.href = "index.html";
}

function init() {
  testAi.addEventListener("click", handleTestAi);
}

init();
