// 사진 올리는거

const aiCont = document.querySelector(`.ai`);
const noti = document.querySelector(`.noti`);

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
    noti.classList.add("disblock");
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

// url 설정

const URL = "https://teachablemachine.withgoogle.com/models/QgTC6_yQ1/";

let model, webcam, labelContainer, maxPredictions;

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
    심수련: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "부드러운 카리스마",
      "https://i.ibb.co/vmw1sN9/image.png",
    ],
    천서진: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "욕망이 이끄는 대로",
      "https://i.ibb.co/qyq6HHJ/image.png",
    ],
    오윤희: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "선 혹은 악",
      "https://i.ibb.co/nkcfMdS/image.png",
    ],
    주단태: [
      "호감형이지만 다른사람들로 하여금 함부로 할 수 없게 하는 카리스마를 가지고 있습니다. 사람의 마음을 잘 읽으며 처세술에 능합니다. 두뇌 회전 속도가 빠르며 손익에 밝고, 사람들의 마음을 흔드는 능력이 있어 모두들 당신을 '좋은 사람'이라고 생각합니다. 그러나 마음 한 구석에 결여된 도덕성과 약간의 폭력성이 잠재되어 있으니, 당신 안의 야수가 탈출하지 못하도록 조심하세요. ",
      "가면을 쓴 야수",
      "https://i.ibb.co/GJVG6s2/image.png",
    ],
    강마리: [
      "귀족스러운 외모를 가지고 있지만 어딘지 모르게 친근함이 느껴지는 타입. 감정이 매우 풍부해 타인의 말에 공감을 잘 해줍니다. 특유의 친근함으로 사람들과 어울려 다니기를 좋아하며, 특히 연상들에게 인기가 많겠네요. 사치스러워 보이지만 쓸 때 쓰고, 썼으면 또 벌면 된다는 생각으로 즐겁게 산다고 하는 것이 맞겠습니다. 사랑에 빠지게 되면 앞뒤 재지 않고 모두 퍼주는 스타일입니다.",
      "깨방정 마님",
      "https://i.ibb.co/D4P11Sm/image.png",
    ],
    이규진: [
      "동글동글 귀여운 인상에 연상들의 귀여움을 독차지합니다. 이런 외모와는 달리 계산적이고 냉철하여 사업과 같은 중요한 일을 할 때는 신중한 모습을 보이기도 합니다. 자신보다 윗 사람에게 약하며, 때로는 찌질할 정도로 속좁은 모습을 보이기도 하지만, 그마저도 귀여움으로 승화시키는 당신! ",
      "찌질한 귀요미",
      "https://i.ibb.co/9TGp6RC/image.png",
    ],
    마두기: [
      "강렬한 스타일을 추구합니다. 자기만의 세계가 있는 타입. 주변 사람들이 보기에 굉장히 개성이 넘쳐서 때론 다가가기 힘들 수도 있습니다. 예술적 감각이 뛰어나며 재능이 많아 예술가로서도 성공할 가능성이 크지만, 돈 관리를 잘 하고 흐름을 읽는 것에 매우 밝아 정치계에 들어간다면 대성할 확률이 높습니다. 그런데 이런 모습이 지나치게 된다면 다른 사람들이 당신을 이익만 좇는 사람으로 인식할 수도 있으니 조심하세요.",
      "매력적인 팔색조",
      "https://i.ibb.co/ng2Nr1w/image.png",
    ],
    배로나: [
      "서글서글한 눈매로 쉽게 타인의 호감을 사며, 밝고 당찬 성격으로 난관이 닥쳐도 특유의 솔직함으로 이를 헤쳐나갑니다. 조금만 노력해도 평범한 사람들보다 훨씬 나은 결과물을 낼 수 있을 정도의 재능을 가졌습니다. 잠재력이 뛰어나고 목적의식도 강합니다. 때로는 너무 큰 욕심을 부려 화를 입을 것이 우려되나, 이마저도 본인의 능력으로 잘 해결해나가는 모습을 보여주어 주변의 시기와 질투를 사기도 합니다.",
      "빛나는 재능의 소유자",
      "https://i.ibb.co/8jx9Jst/image.png",
    ],
    민설아: [
      "크고 맑은 눈망울을 가지고 있어 누구나 당신의 눈을 본다면 빠져들 것입니다. 마음씨가 착해 자신이 사랑하는 것들을 잘 챙기고, 설령 상처받았다고 해도 그 사람의 행복을 빌어줄 만큼 배려심이 깊습니다. 때로는 자신의 재능과 능력을 시기해 모함을 받기도 하지만, 이런 상황에서도 씩씩하게 오뚜기처럼 일어나는 모습이 정말 매력적이군요.",
      "씩씩한 오뚜기",
      "https://i.ibb.co/nB34ZDF/image.png",
    ],
    하은별: [
      "맑고 깨끗한 인상의 소유자입니다. 완벽주의자 성향이 있고 경쟁심도 있어 목표한 바를 이루기 위해서 갖은 노력을 하는 스타일입니다. 솔직한 성격이라 표정이 얼굴에 그대로 드러나는데, 중요한 순간엔 포커페이스를 유지하기도 합니다. 목표를 이루려는 과정에서 자기 자신을 괴롭히기도 하는데 이런 습관은 몸을 해칠 수도 있으니 각별히 유의하셔야겠습니다.",
      "유리멘탈 공주님",
      "https://i.ibb.co/zN6DqkJ/image.png",
    ],
    유제니: [
      "동글동글한 눈매와 얼굴형으로 매우 동안이며, 주변의 귀여움을 독차지할 상입니다. 이런 외모와 어울리게 당신의 말투에도 역시 애교가 듬뿍 섞여 있는데, 가끔 애교가 지나쳐 얄밉게 보는 사람들도 있습니다. 그러나 이런 반응마저 주변의 시기라고 치부하고 신경쓰지 않는 것이 진정한 당신의 매력! 평소에는 자신을 가장 중요하게 여기지만, 중요한 순간에 마음이 약해져 선행을 베풀기도 합니다.",
      "사랑스러운 애교쟁이",
      "https://i.ibb.co/J5dmrWV/image.png",
    ],
    주석훈: [
      "눈매가 길고 깊은 전형적인 냉미남 스타일입니다. 당신의 관심사는 극히 좁으며, 관심있는 것 이외에는 늘 차가운 태도로 일관합니다. 하지만 그 역시도 매력 포인트로 느끼는 사람들이 있어 남녀를 불문하고 모두에게 인기가 많은 스타일입니다. 늘 유행의 중심에 서 있는 당신은 종종 삶이 따분하다고 느끼기도 하지만, 좋아하는 것들 한정으로 애정을 듬뿍 쏟아 붓기도 합니다.",
      "차가운 츤데레",
      "https://i.ibb.co/yydnWgK/image.png",
    ],
    로건리: [
      "짙은 눈썹과 강인한 눈매로 타인의 신뢰를 쉽게 얻습니다. 귀족적인 외모에 비해 거친 스포츠를 좋아하며, 신체 능력도 매우 뛰어납니다. 부드러워 보이지만 자신이 목표한 바를 이루기 위한 집념이 대단하며, 이에 방해가 되는 사람에게는 가차없는 모습을 보이기도 합니다. 정이 많고 따뜻하며 불의를 보면 참지 못하는 성격입니다.",
      "반전 도련님",
      "https://i.ibb.co/FzLN8zH/image.png",
    ],
    하윤철: [
      "부드러운 눈매와 오똑한 콧날, 매력적인 입술을 가진 당신을 본 사람은 누구라도 미남이라는 말이 절로 나오게 될 것입니다. 눈은 장난끼를 머금고 있어 때론 악동같아 보이기도 하군요. 하지만 이런 외모와는 달리 돈과 권력에 대한 야망이 매우 크며, 현실에 적당히 타협하는 성격으로 부를 거머쥘 확률이 큽니다. 이런 야망에 비해 너무 독하게 굴지는 못 하는 여린 성격이 가끔 발목을 잡기도 합니다.",
      "현실적 야망가",
      "https://i.ibb.co/sy7yC2d/image.png",
    ],
    주석경: [
      "날카로운 고양이상 눈매에 앙다문 입술이 매력포인트입니다. 남녀노소 모두 좋아하는 외모를 가지고 있고, 이성 뿐만 아니라 동성도 따르게 될 상입니다. 자기 주장이 강한 완벽주의 성향이라 고집스러워 보일 수도 있지만, 그마저도 매력 포인트로 느끼는 사람들이 많으니 안심하세요. 필요에 따라 사람을 대할 때 가면을 쓰는 것에도 능해 주변에 사람이 아주 많겠군요. 하지만 지나친 거짓은 화를 부를 수 있다는 것을 명심하세요.",
      "톡 쏘는 사이다 냉미녀",
      "https://i.ibb.co/CJLmM0S/image.png",
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

  for (let i = 0; i < 4; i++) {
    let a = description[resultArray[i].key];
    starsEng.push(a[2]);
  }

  let starsListImg = "";

  console.log(
    resultArray[0].value,
    resultArray[0].key,
    answer,
    description[resultArray[0].key][2]
  );

  for (let j = 0; j < 4; j++) {
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        </div> 
        <div class="percent zero">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent zeroone">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent onetwo">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent twothree">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent threefour">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent fourfive">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent fivesix">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent sixseven">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent seveneight">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent eightnine">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        <img src=${description[resultArray[j].key][2]} alt="">
        
        </div> 
        <div class="percent nineten">${resultArray[j].key} ${
          resultArray[j].value
        }%</div>
      </div>
        `;
    }
  }

  let resultImg = document.createElement("img");
  resultImg.classList.add("result__img");
  resultImg.src = `${description[answer][2]}`;
  labelContainer.appendChild(resultImg);

  let result = document.createElement("div");
  result.classList.add("main__result");
  result.innerHTML = `<span>${description[answer][1]}, ${answer}</span>`;
  labelContainer.appendChild(result);

  // let result2 = document.createElement("div");
  // result2.classList.add("celebrity");
  // // result2.textContent = `${answer} (이지아)`;
  // result2.textContent = `착하지만 치밀한 성격`;
  // labelContainer.appendChild(result2);

  let desc = document.createElement("p");
  desc.textContent = description[answer][0];
  labelContainer.appendChild(desc);

  let otherResult = document.createElement("div");
  otherResult.classList.add("other__result");
  otherResult.innerHTML = `${starsListImg}`;
  labelContainer.appendChild(otherResult);

  let reset = document.createElement("img");
  reset.classList.add("reset__btn");
  reset.src = `https://i.ibb.co/d5fSrCg/image.png`;
  reset.onclick = function () {
    gtag("event", "한번더 클릭", {
      event_category: "한번더 클릭",
      event_label: "결과 버튼",
    });
  };
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
        "url(https://i.ibb.co/B2kj8Pk/man.png)";
    } else {
      toggleContainer.style.clipPath = "inset(0 50% 0 0)";
      toggleContainer.style.backgroundColor = "#D74046";
      changePicture.style.backgroundImage =
        "url(https://i.ibb.co/B2kj8Pk/man.png)";
    }
  });
}

// function handleGoMl() {
//   location.href = "http://www.moonletter.ml/";
// }

// handleGoMl();
