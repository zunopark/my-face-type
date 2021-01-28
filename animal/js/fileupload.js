var toggle = document.getElementById("container");
var toggleContainer = document.getElementById("toggle-container");
var toggleNumber;
let URL = "https://teachablemachine.withgoogle.com/models/m5BHhemVv/";

if (toggle) {
  toggle.addEventListener("click", function () {
    toggleNumber = !toggleNumber;
    if (toggleNumber) {
      toggleContainer.style.clipPath = "inset(0 0 0 50%)";
      toggleContainer.style.backgroundColor = "#d99958";
      toggleContainer.style.color = "#59371f";
      URL = "https://teachablemachine.withgoogle.com/models/WRmmOZCSz/";
    } else {
      toggleContainer.style.clipPath = "inset(0 50% 0 0)";
      toggleContainer.style.backgroundColor = "#d99958";
      toggleContainer.style.color = "#59371f";
      URL = "https://teachablemachine.withgoogle.com/models/m5BHhemVv/";
    }
  });
}

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

// let URL = "https://teachablemachine.withgoogle.com/models/07M68Vgss/";

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
  toggle.classList.add("hidden");
}

async function predict() {
  let image = document.getElementById("face-image");
  const prediction = await model.predict(image, false);

  let arr = new Map();
  let description = {
    윤아: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    서현: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    써니: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    태연: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    유리: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    수영: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    효연: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    티파니: [
      "선량하고 믿음직스러워 보이는 인상입니다. 부드러운 미소와 타인을 생각하는 마음은 주변 사람들의 마음을 사로잡기에 충분하네요. 그러나 사업과 같은 중요한 일을 할 때는 계획적이고 치밀한 모습을 보여주며 리더쉽을 발휘하기도 하며, 나긋나긋하지만 날카롭게 핵심을 찔러 상대방을 당황시키기도 합니다. 자기 사람이라고 느껴질 때 한없이 잘해주며, 그로 인해 가끔 뒷통수를 맞게 되기도 합니다.",
      "소녀시대",
      "https://i.ibb.co/ZKqjpCr/image.png",
    ],
    예은: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "원더걸스",
      "https://i.ibb.co/bXS0fqd/image.png",
    ],
    소희: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "원더걸스",
      "https://i.ibb.co/bXS0fqd/image.png",
    ],
    선예: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "원더걸스",
      "https://i.ibb.co/bXS0fqd/image.png",
    ],
    유빈: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "원더걸스",
      "https://i.ibb.co/bXS0fqd/image.png",
    ],
    선미: [
      "날카로워 보이는 인상이지만 의외로 속은 여립니다. 남들이 흉내낼 수 없는 우아함을 타고 났기에 주변 사람들의 선망의 대상입니다. 가지고 싶은 것은 무조건 가져야 하는 야망가 타입입니다. 본인의 지위와 명성을 삶에서 가장 중요한 가치로 두고 있기 때문에, 가장 참을 수 없는 것은 자신의 자존심을 뭉개는 것입니다. 사랑할 때 역시 불도저처럼 적극적인 모습을 보입니다. ",
      "원더걸스",
      "https://i.ibb.co/bXS0fqd/image.png",
    ],
    믹키유천: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "동방신기",
      "https://i.ibb.co/PTPhKF5/image.png",
    ],
    최강창민: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "동방신기",
      "https://i.ibb.co/PTPhKF5/image.png",
    ],
    유노윤호: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "동방신기",
      "https://i.ibb.co/PTPhKF5/image.png",
    ],
    영웅재중: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "동방신기",
      "https://i.ibb.co/PTPhKF5/image.png",
    ],
    시아준수: [
      "부드럽고 선한 인상은 주변 사람들에게 호감을 주며, 특유의 밝은 에너지로 궂은 일을 겪어도 금세 일어나는 모습을 보입니다. 추진력이 강해 목표한 일을 금세 해내고, 그런 모습을 본 주변 사람들이 도움을 주어 운이 따라주기도 합니다. 그러나 귀가 얇아 충동적인 행동을 할 때가 있으며, 자신과 가까운 사람의 일에서는 이성적인 판단이 흐려져 잘못된 선택을 할 수도 있으니 항상 주의해야겠습니다.",
      "동방신기",
      "https://i.ibb.co/PTPhKF5/image.png",
    ],
    탑: [
      "크고 맑은 눈망울을 가지고 있어 누구나 당신의 눈을 본다면 빠져들 것입니다. 마음씨가 착해 자신이 사랑하는 것들을 잘 챙기고, 설령 상처받았다고 해도 그 사람의 행복을 빌어줄 만큼 배려심이 깊습니다. 때로는 자신의 재능과 능력을 시기해 모함을 받기도 하지만, 이런 상황에서도 씩씩하게 오뚜기처럼 일어나는 모습이 정말 매력적이군요.",
      "빅뱅",
      "https://i.ibb.co/x71c2VW/image.png",
    ],
    대성: [
      "크고 맑은 눈망울을 가지고 있어 누구나 당신의 눈을 본다면 빠져들 것입니다. 마음씨가 착해 자신이 사랑하는 것들을 잘 챙기고, 설령 상처받았다고 해도 그 사람의 행복을 빌어줄 만큼 배려심이 깊습니다. 때로는 자신의 재능과 능력을 시기해 모함을 받기도 하지만, 이런 상황에서도 씩씩하게 오뚜기처럼 일어나는 모습이 정말 매력적이군요.",
      "빅뱅",
      "https://i.ibb.co/x71c2VW/image.png",
    ],
    지드래곤: [
      "크고 맑은 눈망울을 가지고 있어 누구나 당신의 눈을 본다면 빠져들 것입니다. 마음씨가 착해 자신이 사랑하는 것들을 잘 챙기고, 설령 상처받았다고 해도 그 사람의 행복을 빌어줄 만큼 배려심이 깊습니다. 때로는 자신의 재능과 능력을 시기해 모함을 받기도 하지만, 이런 상황에서도 씩씩하게 오뚜기처럼 일어나는 모습이 정말 매력적이군요.",
      "빅뱅",
      "https://i.ibb.co/x71c2VW/image.png",
    ],
    태양: [
      "크고 맑은 눈망울을 가지고 있어 누구나 당신의 눈을 본다면 빠져들 것입니다. 마음씨가 착해 자신이 사랑하는 것들을 잘 챙기고, 설령 상처받았다고 해도 그 사람의 행복을 빌어줄 만큼 배려심이 깊습니다. 때로는 자신의 재능과 능력을 시기해 모함을 받기도 하지만, 이런 상황에서도 씩씩하게 오뚜기처럼 일어나는 모습이 정말 매력적이군요.",
      "빅뱅",
      "https://i.ibb.co/x71c2VW/image.png",
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

  // console.log(
  //   resultArray[0].value,
  //   resultArray[0].key,
  //   answer,
  //   description[resultArray[0].key][2]
  // );

  for (let j = 0; j < 5; j++) {
    starsListImg =
      starsListImg +
      ` <div class="star__list__wrap">
        <div class="percent zero">${resultArray[j].key}</div>
      <div class="prog">
        <div class="progs" id="progressing" style="width: ${resultArray[j].value}%"> ${resultArray[j].value}%</div>
    </div>
      </div>`;
  }

  let resultImg = document.createElement("img");
  resultImg.classList.add("result__img");
  resultImg.src = `${description[answer][2]}`;
  labelContainer.appendChild(resultImg);

  let result = document.createElement("div");
  result.classList.add("main__result");
  result.innerHTML = `<span>${description[answer][1]} - ${answer}</span>`;
  labelContainer.appendChild(result);

  // let desc = document.createElement("p");
  // desc.textContent = description[answer][0];
  // labelContainer.appendChild(desc);

  let otherResult = document.createElement("div");
  otherResult.classList.add("other__result");
  otherResult.innerHTML = `${starsListImg}`;
  labelContainer.appendChild(otherResult);

  let reset = document.createElement("div");
  reset.classList.add("reset__btn");
  reset.innerHTML = `다른 사진으로 해보기`;
  reset.onclick = function () {
    gtag("event", "한번더 클릭 아이돌", {
      event_category: "한번더 클릭 아이돌",
      event_label: "결과 버튼",
    });
  };
  labelContainer.appendChild(reset);
  reset.addEventListener("click", handleReset);

  const subscribeBigWrap = document.querySelector(`.subscribe__big__wrap`);
  subscribeBigWrap.classList.remove("none");

  const privacy = document.querySelector(`.noti`);
  privacy.style.display = "none";

  function handleReset(e) {
    location.reload(true);
    location.href = location.href;
    history.go(0);
  }
}

// let ele = document.querySelectorAll(`#progressing`);

// if (ele) {
//   function moveBtn() {
//     console.log(ele.innerHTML);
//     let width = 5;
//     let id = setInterval(frame, 45);
//     function frame() {
//       if (width >= 100) {
//         clearInterval(id);
//       } else {
//         width++;
//         console.log(ele.style.width);
//         ele.style.width = width + "%";
//         ele.innerHTML = width + "%";
//       }
//     }
//   }
// }
// moveBtn();

// function handleGoMl() {
//   location.href = "http://www.moonletter.ml/";
// }

// handleGoMl();
