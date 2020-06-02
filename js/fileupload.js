const aiCont = document.querySelector(`.ai`);


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

const URL = "https://teachablemachine.withgoogle.com/models/DohDi_6py/";

let model, webcam, labelContainer, maxPredictions;

async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  labelContainer = document.getElementById("label-container");
  for (let i = 0; i < maxPredictions; i++) {
    // and class labels
    labelContainer.appendChild(document.createElement("div"));
  }

  predict();

  toggle.classList.add("hidden");

}

async function predict() {
  let image = document.getElementById("face-image");
  // predict can take in an image, video or canvas html element
  const prediction = await model.predict(image, false);

  let arr = new Map();
  // 키값을 그대로 클래스 이름으로 학습시킨다.
  let description = {
    "평생 재물운은 타고난 관상":
      ["이마가 안보이지만 좋은 이마를 가졌고 성격이 차분하고 강인하며 정적입니다. 눈이 봉황눈에 가깝기 때문에 재복이 좋은 눈이고 사람을 끌어들입니다. 눈썹또한 재복이 좋고 성격이 강직하니 자존심이 강하며 고집이 있습니다. 귀는 큰편에 가까운데 인복이 좋으며 정이 많은 귀입니다. 얼굴이 갸름하여 성격이 원만하고 입은 무겁습니다. 전체적으로 사람을 끌어들이는 기운이 아주 강하여 성공운이 열린 얼굴입니다.", "강동원"],
    "개방적인 성격의 관상":
      ["이마는 둥근형이라 집안일보다 바깥일을 좋아하고, 대인관계가 좋고 사업성이 좋은 이마입니다. 눈썹은 진하여 재복이 좋고 정력이 좋으며 미간이 넓어서 성적으로 개방된 성격입니다. 눈은 고집과 자존심이 강한 눈이며 여자이면 남자가 많이 따르는 남자복이 많은 눈입니다. 턱은 재복이 좋지만 변덕이 심할 수 있고 연애운이 광하고 복스러우니 인복이 좋고 출세와 성공에 강합니다. 전체적으로 이성을 조심해야 합니다.", "강민경"],
    "결혼하면 잘살 관상":
      ["이마가 적당하여 아담하고 결혼운이 좋으며 눈썹은 재복이 좋고 자존심이 강합니다. 인중은 평범하며 입술은 도톰하여 연애운이 좋고 살림을 잘하는 입술입니다. 턱은 강인하고 적당하여 재복이 좋고 말년운이 좋으며 서글서글한 성격을 지닙니다. 칼귀이자 당나귀귀로서 재복과 인복이 좋으며 직업운이 좋고 대인관계가 좋습니다. 씀씀이는 큰편이며 자상하여 좋은 관상으로 볼 수 있습니다.", "강소라"],
    "섬세하고 끈기가 있으며 의지력이 강한 관상":
      ["눈썹은 굵고 진하여 재물복이 좋습니다. 끈기가 강한 눈썹으로 미간이 넓이니 재물복이 좋은 미간입니다. 눈썹과 눈 사이에 살이 별로 없는데 이기주의적인 성향이 있고 성격이 세심합니다. 날카로운 눈은 예리하고 관찰력이 좋으며 눈치가 빠릅니다. 코를 보면 재물복이 좋으며 재물에 대한 집착과 욕심이 있습니다. 재주와 재능이 좋은 인중이며 예능계열쪽으로 좋은 하관입니다. 긍정적인 성향으로 말년운이 무난합니다.", "김수현"],
    "강한 기를 가지고 있는 관상":
      ["이마는 적당하며 당돌한 면이 있고 눈썹이 길고 진하여 재복이 좋습니다. 눈은 이성을 유혹하는 눈으로서 기가 강하며 연애운이 강합니다. 이성을 꼬시는 재주가 좋고 자존심이 강한 입입니다. 볼은 욕심이 많고 고집이 강하며 이기적인 면도 있지만 재복이 좋고 생활력이 강하며 인복이 좋습니다. 전체적으로 흠잡을 곳이 없는 완벽한 관상이지만 단점으로는 얼굴에서 나오는 기가 강합니다.", "김옥빈"],
    "이성운이 강한 관상":
      ["이마는 훤칠하고 깨끗하여 이성운이 좋고 두뇌가 좋습니다. 자아도취적인 경향도 강하며 의지력이 강하고 무엇이든지 집중하는 성격입니다. 미간은 적당하고 눈을 보면 이성운이 또한 강하며 재물에 대한 집착이 강합니다. 화려하고 동시에 깨끗하고 수려한 것을 추구하는 상입니다. 낙천적이고 긍정적인 마인드를 볼 수 있는 입꼬리와 입이 미세하게 나와있어 말재주가 좋습니다.", "박해일"],
      "머리가 뛰어난 천재형 관상":
      ["이마가 짱구이마에 가까워 머리가 좋고 지혜롭습니다. 노력은 잘 안하는편이지만 머리는 뛰어난 재능충 유형입니다. 코는 재복이 좋고 여복이 좋으며 연애운이 좋은 눈입니다. 강인하며 직업운이 좋고 말년운이 깔끔하며 재능이 다재다능한 상입니다. 원숭이상에 가까운 상이라 재능을 통해 화려한 인생을 살 수도 있습니다.", "송중기"],
      "사회성 좋은 화개살 강한 관상":
      ["갈매기 상의 이마는 슬기롭고 지혜로운 여성을 말합니다. 재벌가의 눈썹을 지녔고 부모복이 좋고 남편복이 좋습니다. 눈이 자상하면서 매혹적이고 화개살이 있는 눈이라 사람들에게 사랑받고 이성운이 강한 눈이나 출세하지 않으면 필요없는 남자들이 많이 붙을 수 있습니다. 이성을 많이 꼬시는 눈이고 예능기질이 강하며 성격이 온순하고 착하고 선한 성격입니다.", "안소희"],
      "연애운이 좋을 관상":
      ["남자가 꼬이고 남편때문에 마음고생하는 이마입니다. 성격이 남자다운면도 있고 서글서글하고 붙임성이 좋고 사회성이 좋습니다. 연애운도 좋고 눈썹이 가지런하여 여성스럽고 차분합니다. 좋은 성격은 다가지고 있다고 보시면 됩니다. 하지만 돌아서면 아주 냉담한 면도 있습니다. 얼굴이 개성이 강한 얼굴이라 사람 마음을 끌어당기는 면이 강합니다", "수지"],
      "전체적으로 완벽한 관상":
      ["이마가 깨끗하고 시원하여 성격도 시원스럽고 사회성도 좋고 눈이 길상이라 재복도 좋고 마음씨가 선하고 감정이 풍부합니다. 코를 보면 감각이 뛰어나고 재능이 많고 대인관계가 좋고 성격은 차분하면서도 약간 급한면이 있습니다. 입이 큰편이라서 결단력이 좋고 시원스러운 성격이고 마음씨가 넓고 자상하다고 보시면 됩니다 ", "유승호"],
      "평범한 인생을 살지 않을 관상":
      ["이마는 좁은편이군요. 저런 이마는 성격은 착하고 인정이 많습니다. 하지만 뺀질이 기질도 있고 남의 말을 잘 안 듣는 성향이 강합니다. 눈은 다정하면서 차분하고 사색적이고 반항아기질이 있고 개성이 강하고 주관이 뚜렷한 눈입니다. 남과 다른 인생을 살려하고 평범한 인생을 싫어하는 눈입니다. 턱은 강인한편이라 재복이 좋고 말년운이 좋지만 예민한면도 강합니다 ", "유아인"]
  };

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    // labelContainer.childNodes[i].innerHTML = classPrediction;
    // arr[prediction[i].className] = parseInt((prediction[i].probability * 100).toFixed(0));
    arr.set(
      prediction[i].className,
      parseInt((prediction[i].probability * 100).toFixed(0))
    );
  }

  maxV = 0;
  answer = "";
  arr.forEach((value, key, mapObject) => {
    // console.log(key, value);
    if (value > maxV) {
      maxV = value;
      answer = key;
    }
  });

  let result = document.createElement("div");
  result.textContent = `${answer}`;
  labelContainer.appendChild(result);

  let result2 = document.createElement("div");
  result2.classList.add("celebrity")
  result2.textContent = `나와 같은 관상을 가진 연예인 : ${description[answer][1]}`;
  labelContainer.appendChild(result2)

  let desc = document.createElement("p");
  desc.textContent = description[answer][0];
  labelContainer.appendChild(desc);

  let reset = document.createElement("button");
  reset.innerHTML = "다른 사진도 해보기";
  labelContainer.appendChild(reset);

  reset.addEventListener("click", handleReset);

  function handleReset(e) {
    location.reload(true);
    location.href = location.href;
    history.go(0);
  }
}


var toggle = document.getElementById('container');
var toggleContainer = document.getElementById('toggle-container');
var toggleNumber;
let changePicture = document.querySelector(".image-upload-wrap");


toggle.addEventListener('click', function() {
  toggleNumber = !toggleNumber;
	if (toggleNumber) {
		toggleContainer.style.clipPath = 'inset(0 0 0 50%)';
    toggleContainer.style.backgroundColor = '#D74046';
    changePicture.style.backgroundImage = 'url(../ornamental/images/woman.jpeg)';
	} else {
		toggleContainer.style.clipPath = 'inset(0 50% 0 0)';
    toggleContainer.style.backgroundColor = 'dodgerblue';
    changePicture.style.backgroundImage = 'url(../ornamental/images/man.jpeg)';
	}
});