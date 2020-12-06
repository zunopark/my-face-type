const aiCont = document.querySelector(`.ai__girl`);

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
}

async function predict() {
  let image = document.getElementById("face-image");
  const prediction = await model.predict(image, false);

  let arr = new Map();
  let description = {
    bear: [
      "고양이상",
      "유인영, 제니, 차예련, 한채영",
      "도도하고 섹시한 당신은 첫인상은 차가워 보이지만 묘한 매력을 풍겨 언제나 인기가 넘친다. 자존심이 세계 1등과 맞먹지만 관심 받는 것을 좋아하고 애인에게 관심이 받고 싶을 때는 애교도 부릴 줄 아는 귀여운 매력을 가졌다. 시크한 츤데레로 연인에게 끊임없이 설렘을 안겨주는 당신은 고양이와 닮았다!",
    ],
    cat: [
      "강아지상",
      "박보영, 송혜교, 한지민, 손예진, 방민아",
      "다정다감하고 귀여운 당신은 모든 사람들에게 즐거움을 주는 호감형이다! 상냥하고 활발한 성격으로 어디에서도 인기폭발이지만, 애교와 웃음이 많아 연인에게 특히나 사랑스럽다. 당신은 애인바라기로 애인의 관심이 부족하면 시무룩해지고 외로움을 타는 모습이 마치 강아지와 똑 닮았다!",
    ],
    dog: [
      "사슴상",
      "고아라, 문근영, 이연희, 윤아",
      "맑고 영롱한 분위기의 당신은 사슴처럼 차분한 성격의 소유자다. 초롱초롱한 눈망울이 당신의 가장 큰 트레이드마크며 따스하고 온순한 눈빛을 가져 사랑스러움을 항상 머금고 있다! 부끄러움이 많아 애정표현이 낯설은 당신은 연인에게조차 신비한 존재지만 따뜻한 성격으로 연인의 마음을 사로잡는 능력을 가졌다.",
    ],
    dino: [
      "토끼상",
      "나연, 소희, 수지",
      "발랄하고 귀여운 당신은 주변 사람들에게 기쁨을 주는 행복바이러스다! 호기심이 많아 활발하며 귀엽고 순수한 외모로 연인의 보호본능을 자극한다. 존재 자체가 상큼하고 깜찍한 당신은 특별한 애교 없이도 연인에게 너무나도 사랑스럽다!",
    ],
    rabbit: [
      "여우상",
      "경리, 쯔위, 지연, 헤이즈",
      "사람을 홀리는 매력을 가진 당신은 선뜻 다가가기 힘든 섹시한 매력을 가졌다. 우아한 외모에 더해 뛰어난 센스의 성격을 가진 당신은 어딜가도 주목받는 주인공이다! 사교적인 성격을 가져 연인에게도 적극적으로 애정표현을 하지만 밀당의 고수인 당신은 연인의 혼을 쏙 빼놓는 매력쟁이다.",
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
  desc.innerHTML = `당신은 ${description[answer][0]} 여자친구와 잘 어울리네요!`;
  labelContainer.appendChild(desc);

  let result = document.createElement("div");
  result.innerHTML = `${description[answer][0]} 연예인: ${description[answer][1]}`;
  labelContainer.appendChild(result);

  let result2 = document.createElement("div");
  result2.classList.add("celebrity");
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
