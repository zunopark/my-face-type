const aiCont = document.querySelector(`.ai__boy`);

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
const URL = "https://teachablemachine.withgoogle.com/models/_29hfPNBO/";

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
  // toggle.classList.add("hidden");
}

async function predict() {
  let image = document.getElementById("face-image");
  const prediction = await model.predict(image, false);

  let arr = new Map();
  let description = {
    dog: [
      "고양이상",
      "황민현, 시우민, 강동원, 이종석, 이준기",
      "도도하고 섹시하며 첫인상은 차갑겠지만 묘한 매력을 풍겨 언제나 인기가 많은 남자와 잘 어울립니다. 자존심이 매우 강하지만 당신에게 항상 관심을 받고 싶어하며 가끔씩 애교도 부리는 팔색조와 같은 매력을 갖고 있습니다. 시크하지만 츤데레로 당신에게 계속해서 설렘을 안겨주는 남자와 잘 어울립니다! ",
    ],
    cat: [
      "강아지상",
      "강다니엘, 백현, 박보검, 송중기",
      "다정다감하고 귀여우며 모든 사람들에게 즐거움을 주는 호감형의 남자와 잘 어울립니다. 상냥하고 활발한 성격으로 인기가 많지만 당신에게 특히 애교와 웃음이 많아 사랑스러울 것입니다. 당신을 항상 바라보고 있을 것이며 당신의 관심이 부족해지면 시무룩해지고 외로움을 많이 타니 사랑을 많이 주세요! ",
    ],
    dear: [
      "토끼상",
      "정국, 바비, 박지훈, 수호",
      "천진난만하고 귀여운 남자와 가장 잘 어울립니다. 그 남자는 사람들에게 항상 기쁨을 주는 행복 바이러스입니다! 호기심이 많아 활발하며 순수한 외모로 당신의 보호본능을 자극합니다. 존재 자체가 매우 상큼하며 깜찍한 남자와 잘 어울립니다! ",
    ],
    fox: [
      "곰상",
      "마동석, 조진웅, 조세호, 안재홍",
      "첫 인상은 무섭지만 알고 보면 귀여운 남자와 잘 어울립니다! 꼼꼼하고 섬세한 성격의 남자이며 연인이 되면 당신에게 헌신적으로 챙겨주고 그만큼 듬직한 남자입니다. 포근한 매력에 듬직한 남자와 가장 잘 어울려 보입니다.",
    ],
    rabbit: [
      "공룡상",
      "윤두준, 이민기, 김우빈, 육성재, 공유",
      "무심한 성격에 첫인상은 나쁜 남자처럼 보이지만 알고 보면 따뜻한 남자와 가장 잘 어울립니다. 시크한 매력을 갖고 있어 당신이 선뜻 다가가지 못하겠지만 한발자국 더 다가가면 그 남자는 헤어나올 수 없는 터프한 매력을 당신에게 보여줄 것입니다.",
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
  console.log(resultArray);

  let starsListImg = "";

  for (let j = 0; j < 5; j++) {
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent zero">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent zeroone">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent onetwo">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent twothree">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent threefour">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent fourfive">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent fivesix">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent sixseven">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent seveneight">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent eightnine">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][0]}
        </div> 
        <div class="percent nineten">${resultArray[j].value}%</div>
      </div>
        `;
    }
  }

  let desc = document.createElement("p");
  desc.innerHTML = `당신은 ${description[answer][0]} 남자친구와 잘 어울리네요!`;
  labelContainer.appendChild(desc);

  let result = document.createElement("div");
  result.classList.add("boyfr__star");
  result.innerHTML = `${description[answer][0]} 연예인: ${description[answer][1]}`;
  labelContainer.appendChild(result);

  let result2 = document.createElement("div");
  result2.classList.add("boyfr__celebrity");
  result2.innerHTML = `${description[answer][2]}`;
  labelContainer.appendChild(result2);

  let otherResult = document.createElement("div");
  otherResult.classList.add("other__result");
  otherResult.innerHTML = `${starsListImg}`;
  labelContainer.appendChild(otherResult);

  let reset = document.createElement("button");
  reset.innerHTML = "다른 사진도 해보기";
  labelContainer.appendChild(reset);

  reset.addEventListener("click", handleReset);

  const privacy = document.querySelector(`.noti`);
  privacy.style.display = "none";

  function handleReset(e) {
    location.reload(true);
    location.href = location.href;
    history.go(0);
  }
}
