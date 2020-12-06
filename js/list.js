const testAi = document.querySelectorAll(`.test__ai`);

function handleTestAi() {
  location.href = "index.html";
}
function handleTestBoyFr() {
  location.href = "boyfr.html";
}
function handleTestGirlFr() {
  location.href = "girlfr.html";
}

function init() {
  if (testAi[0]) {
    testAi[0].addEventListener("click", handleTestAi);
  }
  testAi[1].addEventListener("click", handleTestBoyFr);
  testAi[2].addEventListener("click", handleTestGirlFr);
}

init();
