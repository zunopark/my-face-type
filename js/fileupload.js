// 사진 올리는거
const borderCont = document.querySelector(`.border`);

async function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader();

    reader.onload = function (e) {
      $(".image-upload-wrap").hide();
      $(".main_photo_container").hide();

      $(".file-upload-image").attr("src", e.target.result);
      $(".file-upload-content").show();

      $(".image-title").html(input.files[0].name);
    };
    // const faceImageTitle = document.querySelector(`#face-image-text`)
    // faceImageTitle.classList.remove('none')

    await reader.readAsDataURL(input.files[0]);

    await init();

    const imageTitleWrap = document.querySelector(`.ai`);
    imageTitleWrap.classList.add("disblock");
    // borderCont.classList.add("disblock");

    // // 모달을 가져옵니다
    // var modal = document.getElementById('myModal')

    // // 모달을 여는 버튼을 가져옵니다
    // var btn = document.getElementById('openModal')

    // // 모달을 닫는 <span> 요소를 가져옵니다
    // var span = document.getElementsByClassName('close')[0]

    // // 사용자가 버튼을 클릭하면 모달을 엽니다

    // modal.style.display = 'block'

    // // 사용자가 <span> (x)를 클릭하면 모달을 닫습니다
    // span.onclick = function () {
    //   modal.style.display = 'none'
    // }

    // // 사용자가 모달 외부를 클릭하면 모달을 닫습니다
    // window.onclick = function (event) {
    //   if (event.target == modal) {
    //     modal.style.display = 'none'
    //   }
    // }
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

// url & api 설정
const URL = "https://teachablemachine.withgoogle.com/models/FiW0HL4DO/";

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
  // toggle.classList.add('hidden')
}

async function predict() {
  let image = document.getElementById("face-image");

  const prediction = await model.predict(image, false);

  let arr = new Map();

  // 관상 결과 db
  let description = {
    강민경: [
      "이마는 둥근 형이라 바깥일을 선호하고 대인관계가 원만하며 인복이 좋습니다. 눈썹은 재복이 좋고 미간이 넓어 자유로운 성격을 지녔습니다. 눈은 약간의 고집과 자존심이 있으면서도 남자복이 많은 눈입니다. 턱은 재복이 좋지만 변덕이 있을 수 있으며 연애운이 강해 이성 관계에 주의해야 합니다. 전체적으로 출세와 성공 운이 강한 관상입니다.",
      "개방적이면서도 성공 운이 강한 관상",
      "한효주",
      "[2025년 총운] 새로운 기회가 찾아오며 인간관계에서 큰 도움이 예상됩니다. 이성 관계는 신중하게 다룰 필요가 있습니다.",
    ],
    강동원: [
      "넓고 좋은 이마를 가져 강인하면서도 정적인 성격입니다. 눈은 봉황 눈에 가까워 재복이 좋고 사람을 끌어들이는 힘이 있습니다. 눈썹은 자존심이 강하고 고집이 있는 성격을 나타냅니다. 귀는 인복이 좋고 따뜻한 정을 지녔습니다. 턱 선은 갸름하여 원만한 성격이며 입은 무겁습니다. 전체적으로 사람을 끌어들이는 기운이 강해 성공 운이 열린 관상입니다.",
      "평생 재물운이 타고난 관상",
      "강동원",
      "[2025년 총운] 큰 재물운이 따르며 중요한 사람과의 인연이 성공적인 결과로 이어질 가능성이 큽니다.",
    ],
    강소라: [
      "이마가 적당하여 결혼운이 좋고 눈썹은 재복과 자존심을 나타냅니다. 입술은 도톰하여 연애운이 좋고 살림을 잘하는 입입니다. 턱은 강인하면서도 말년운이 좋고 서글서글한 성격입니다. 귀는 인복이 좋고 직업운이 강하며 대인관계가 뛰어납니다. 씀씀이는 큰 편이지만 자상한 성격으로 좋은 관상입니다.",
      "결혼하면 행복할 관상",
      "김태리",
      "[2025년 총운] 가정과 일에서 균형을 맞출 기회가 찾아오며 새로운 인연이 이어질 가능성이 있습니다.",
    ],
    김수현: [
      "눈썹이 굵고 진하여 재물복이 좋고 끈기가 강합니다. 눈썹과 눈 사이가 좁아 이기적인 면이 있으나 성격이 세심합니다. 날카로운 눈은 관찰력이 뛰어나고 눈치가 빠릅니다. 코는 재물복이 좋고 욕심이 있으며, 인중은 재주와 재능이 뛰어납니다. 긍정적인 성향으로 말년운이 무난합니다.",
      "섬세하고 끈기와 의지력이 강한 관상",
      "차은우",
      "[2025년 총운] 재물과 명예에서 균형을 맞추는 한 해가 될 것이며 끈기 있는 노력이 좋은 결과를 가져올 것입니다.",
    ],
    김옥빈: [
      "이마는 적당하고 당돌한 면이 있으며 눈썹은 길고 진하여 재복이 좋습니다. 눈은 이성을 끌어들이는 매력이 있으며 강한 기운을 가졌습니다. 입술은 자존심이 강하며 볼은 욕심이 많고 고집이 있습니다. 생활력이 강하고 인복이 뛰어나 흠잡을 곳이 없는 관상입니다.",
      "강한 기운과 매력을 지닌 관상",
      "고윤정",
      "[2025년 총운] 새로운 사업이나 프로젝트에서 성공할 가능성이 크며 인간관계에서도 큰 도움을 받을 것입니다.",
    ],
    박해일: [
      "이마는 깨끗하고 훤칠하여 두뇌가 좋고 이성운이 뛰어납니다. 의지력이 강하며 집중력이 뛰어난 성격입니다. 눈은 이성운이 강하고 재물에 대한 집착이 보입니다. 입꼬리는 긍정적이며 낙천적인 성향을 나타내며, 말재주가 뛰어납니다.",
      "이성운과 두뇌가 뛰어난 관상",
      "조정석",
      "[2025년 총운] 이성과의 관계에서 긍정적인 변화가 예상되며, 새로운 아이디어나 프로젝트에서 두각을 나타낼 것입니다.",
    ],
    송중기: [
      "이마가 짱구이마에 가까워 지혜롭고 머리가 뛰어난 유형입니다. 노력보다는 재능으로 승부하는 스타일입니다. 코는 재복과 여복이 좋고 눈은 연애운이 강합니다. 강인한 성격에 말년운이 깔끔하고 다재다능한 모습이 돋보입니다.",
      "머리가 뛰어난 천재형 관상",
      "임시완",
      "[2025년 총운] 다재다능함이 빛을 발하며 새로운 도전에서 큰 성과를 이룰 가능성이 높습니다.",
    ],
    안소희: [
      "갈매기형 이마는 슬기롭고 지혜로운 성격을 나타냅니다. 눈썹은 재벌가의 눈썹으로 부모복과 남편복이 좋습니다. 눈은 매혹적이고 화개살이 있어 사람들에게 사랑받으며 이성운이 강합니다. 다만 출세하지 않으면 불필요한 이성들이 많이 따를 수 있습니다. 성격은 온순하고 선하며 예능 기질이 강합니다.",
      "사회성이 뛰어나고 이성운이 강한 관상",
      "김유정",
      "[2025년 총운] 새로운 기회가 찾아오며 대인관계에서 큰 도움을 받을 것입니다. 이성관계는 신중하게 접근할 필요가 있습니다.",
    ],
    수지: [
      "이마는 남자와의 인연이 많아 남편으로 인해 마음고생할 수 있습니다. 서글서글하고 붙임성이 좋으며 사회성이 뛰어납니다. 눈썹이 가지런하여 여성스럽고 차분합니다. 좋은 성격을 가지고 있지만 냉정한 면모도 있습니다. 얼굴은 개성이 강해 사람의 마음을 끌어당기는 매력이 있습니다.",
      "연애운이 강하고 매력적인 관상",
      "아이유",
      "[2025년 총운] 연애와 인간관계에서 큰 변화를 맞이할 가능성이 있습니다. 신중하게 선택하는 것이 중요합니다.",
    ],
    유승호: [
      "이마가 깨끗하고 시원해 성격이 시원스럽고 사회성이 좋습니다. 눈은 길상이라 재복이 좋고 마음씨가 선하며 감정이 풍부합니다. 코는 감각적이고 재능이 많습니다. 입이 커서 결단력이 뛰어나고 자상하며 마음이 넓습니다.",
      "재능과 따뜻함을 겸비한 관상",
      "이도현",
      "[2025년 총운] 직업적으로 좋은 기회가 찾아오며 주변 사람들과의 관계가 더 깊어질 것입니다.",
    ],
    유아인: [
      "이마는 인정 많고 착한 성격을 나타내지만 남의 말을 잘 듣지 않는 면이 있습니다. 눈은 다정하고 차분하면서도 사색적이며 반항적인 기질과 주관이 뚜렷합니다. 턱은 강인하여 재복이 좋고 말년운이 뛰어나지만 예민한 성격도 보입니다.",
      "독특하고 주관이 뚜렷한 관상",
      "지드래곤",
      "[2025년 총운] 새로운 도전을 통해 뜻깊은 결과를 얻을 가능성이 있으며 개인적인 성장의 기회가 열립니다.",
    ],
    김태희: [
      "귀는 당나귀 귀로 재복과 인복이 좋습니다. 작은 두상은 뛰어난 판단력과 머리 회전이 빠른 성격을 나타냅니다. 눈썹은 눈꼬리보다 길어 재복이 좋고, 이빨이 큰 편이라 시원시원한 성격을 보입니다.",
      "재복과 인복이 뛰어난 관상",
      "김태희",
      "[2025년 총운] 재물운과 인복이 크게 상승할 것이며, 새로운 도전에서 좋은 성과를 기대할 수 있습니다.",
    ],
    문채원: [
      "눈썹은 재복이 좋고 눈은 내조를 잘하는 성향을 나타냅니다. 입은 속마음을 잘 드러내지 않으며, 턱은 말년운이 좋아 연말에 행운을 기대할 수 있습니다. 귀는 낭비벽이 있어 절제가 필요합니다. 이마는 남편이 사고칠 가능성이 있으나 착한 배우자를 만나면 복이 따를 것입니다.",
      "현명하고 내조에 뛰어난 관상",
      "송혜교",
      "[2025년 총운] 가족과의 관계에서 큰 행운이 찾아올 것이며, 재정 관리에 주의할 필요가 있습니다.",
    ],
    박보영: [
      "이마가 적당하면서도 독특해 남편을 좌지우지하는 힘을 가지고 있습니다. 눈썹과 코는 재복이 아주 좋으며, 귀와 눈꼬리가 옆으로 향해 현실주의적 성향을 나타냅니다. 입은 작아 속마음을 잘 드러내지 않지만 이는 여자의 경우 단점이 되지 않습니다. 눈은 부리부리하여 주관이 뚜렷하고 가정을 잘 이끌어 나갈 힘이 있습니다.",
      "진심을 속마음에 담아두는 관상",
      "박보영",
      "[2025년 총운] 새로운 프로젝트나 작품에서 큰 주목을 받을 것이며, 신뢰할 수 있는 동료와의 협력이 중요합니다.",
    ],
    소지섭: [
      "이마에 세로 주름이 있어 재벌 또는 CEO의 기질이 보입니다. 눈은 붕어눈/고래눈으로 재물운이 좋으며 귀는 잘 보이지 않아 고집이 강하고 속마음을 잘 드러내지 않습니다. 과묵하고 잔잔한 성격이지만 가끔 성격이 강하게 드러날 때도 있습니다. 노년운은 안정적으로 살아갈 가능성이 높습니다.",
      "과묵하고 줏대가 있는 관상",
      "현빈",
      "[2025년 총운] 꾸준한 노력이 결실을 맺으며, 새로운 분야에서 성공적인 결과를 기대할 수 있습니다.",
    ],
    손예진: [
      "이마가 갈매기 상으로 현모양처의 관상이며 지혜롭습니다. 코는 크지만 콧구멍이 보이지 않아 재물이 들어올 상이며, 귀는 출세를 통해 재복을 얻게 되는 귀입니다. 턱은 갸름하고 성격이 부드러우며, 남편과의 관계에서 발생하는 트러블도 지혜롭게 해결할 수 있습니다.",
      "머리가 좋고 지혜로운 관상",
      "카리나",
      "[2025년 총운] 개인적인 프로젝트나 가정에서 균형을 맞추며 긍정적인 결과를 얻게 될 것입니다.",
    ],
    원빈: [
      "코와 귀가 재복을 타고났으며 귀는 완벽한 재복 귀입니다. 낭비벽이 약간 있지만 문제될 정도는 아닙니다. 이마가 사각형으로 사회성이 뛰어나고, 눈은 잘생김을 넘어 아름다움이 느껴지는 눈입니다. 판단력과 머리 회전이 뛰어나지만 외로운 면이 있습니다.",
      "마음만 먹으면 뭐든 할 수 있는 관상",
      "원빈",
      "[2025년 총운] 새로운 도전이 성공으로 이어지며, 작품을 통해 큰 주목을 받을 가능성이 높습니다.",
    ],
    이광수: [
      "이마는 적당하며 관운이 강하고 개인주의 성향을 보입니다. 눈썹은 길고 진하여 재복이 있으며 눈썹뼈와 코를 보면 정력이 강합니다. 성격은 급하지만 대인관계가 원만하며 직업운이 강하고 욕심이 있는 상입니다. 귀는 성공과 출세가 가능한 귀로 인복이 뛰어납니다.",
      "누구보다 정력이 좋은 관상",
      "뷔",
      "[2025년 총운] 다양한 분야에서 재능을 발휘하며, 인복으로 새로운 기회를 얻게 될 것입니다.",
    ],
    이승기: [
      "말상이라 직업운이 강합니다. 이마가 사각형이라 사회성이 뛰어나고 가정보다는 일을 우선시합니다. 코는 강인하며 사업에 적합한 관상입니다. 귀는 크고 인복이 좋으며, 의리가 강한 성격입니다. 귀밑 턱이 갸름해 인생에 큰 굴곡 없이 안정적인 삶을 살아갑니다.",
      "인생에 굴곡이 없을 관상",
      "박서준",
      "[2025년 총운] 사업이나 새로운 프로젝트에서 큰 성과를 이루며, 인생의 중요한 전환점을 맞이할 것입니다.",
    ],
    크리스탈: [
      "이마가 넓고 둥글어 이혼수의 가능성이 살짝 보이지만 다른 사람들과는 좋은 관계를 유지합니다. 눈썹은 자상하며 눈은 자존심이 강합니다. 코는 재복이 있으며 입은 가늘어 속마음을 잘 드러내지 않습니다. 귀는 정면에서 잘 보이지 않아 내면을 숨기는 성향이 있지만, 전체적으로 사회성과 대인관계가 뛰어난 관상입니다.",
      "대인관계 마스터 관상",
      "제니",
      "[2025년 총운] 새로운 인연과 협업이 큰 성공을 불러올 것이며, 대인관계에서 큰 도움을 받을 것입니다.",
    ],
    손나은: [
      "이마가 적당한 크기로 눈치가 빠르고 잔머리가 잘 돌아갑니다. 눈썹은 길고 가지런해 여성스러움을 나타냅니다. 눈은 이성운이 강하지만 얌체 같은 기질이 있습니다. 코는 짧고 콧구멍이 보이지만 애교가 많고 씀씀이가 큽니다. 인중이 짧아 대인관계는 원활하지만 비슷한 부류의 사람과 더 친해지는 경향이 있습니다.",
      "쓸데없이 남자들이 꼬이는 관상",
      "장원영",
      "[2025년 총운] 새로운 인연을 만날 가능성이 크며, 인간관계에서 중요한 기회가 찾아올 것입니다.",
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

  for (let i = 0; i < 5; i++) {
    let a = description[resultArray[i].key];
    starsEng.push(a[2]);
  }

  let starsListImg = "";

  for (let j = 0; j < 5; j++) {
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent zero">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent zeroone">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent onetwo">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent twothree">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent threefour">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent fourfive">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent fivesix">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent sixseven">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent seveneight">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent eightnine">${resultArray[j].value}%</div>
      </div>
        `;
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${description[resultArray[j].key][2]}
        </div> 
        <div class="percent nineten">${resultArray[j].value}%</div>
      </div>
        `;
    }
  }

  const fileUploadImg = document.querySelector(`.file-upload-image`);
  // console.log(fileUploadImg.src)

  // let dddd = document.createElement(`div`);
  // dddd.classList.add(`dddd`);
  // dddd.innerHTML = `
  //                       <div class=main_result_content_img_wrapper>
  //                         <div class=main_result_content_img_div>
  //                           <img src="${fileUploadImg.src}" alt="k-pop_AI" class="main_result_content_img" />
  //                         </div>
  //                       </div>
  // `;
  // labelContainer.appendChild(dddd);

  let result = document.createElement("div");
  result.classList.add("main_result_description");
  result.innerHTML = `${description[answer][1]}`;
  labelContainer.appendChild(result);

  let result2 = document.createElement("div");
  result2.classList.add("celebrity");
  result2.innerHTML = `같은 관상을 가진 연예인 : ${description[answer][2]}`;
  labelContainer.appendChild(result2);

  let desc = document.createElement("p");
  desc.classList.add("main__result__content__p");
  desc.innerHTML = `${description[answer][0]}`;
  labelContainer.appendChild(desc);

  let otherResult = document.createElement("div");
  otherResult.classList.add("other__result");
  otherResult.innerHTML = `${starsListImg}`;
  labelContainer.appendChild(otherResult);

  let desc2 = document.createElement("p");
  desc2.classList.add("main__result__content__p2");
  desc2.innerHTML = `${description[answer][3]}`;
  labelContainer.appendChild(desc2);

  function getResultGtag() {
    gtag("event", `관상 결과`, {
      result: `${answer}`,
    });
  }
  getResultGtag();

  const noStore = document.querySelector(`.nostore`);
  noStore.classList.add("none");

  let reset = document.createElement("button");
  reset.innerHTML = `
  <span>다른 사진으로 해보기</span>`;
  reset.classList.add("reset__btn");
  reset.onclick = function () {
    gtag("event", "한번 더 클릭");
  };
  labelContainer.appendChild(reset);

  // reset.addEventListener('click', handleReset)

  // function handleReset() {
  //   // location.reload(true)
  //   // location.href = location.href
  //   // history.go(0)
  //   location.href = '/onemore'

  //   // const url = 'https://link.coupang.com/a/bNHGIZ'
  //   // window.open(url, '_blank')
  //   // desc.classList.remove('coupang_effect')
  // }

  function handleFirstClick() {
    // 버튼 이름 변경
    reset.innerHTML = `<span>다른 사진으로 해보기</span>`;
    const url = "https://link.coupang.com/a/bNHGIZ";
    window.open(url, "_blank");

    desc.classList.remove("coupang_effect");
    reset.classList.remove("reset__btn_coupang");
    reset.classList.add("reset__btn");

    // 첫 번째 클릭 이벤트 로깅
    gtag("event", "쿠팡 방문 클릭");

    // 두 번째 클릭을 위한 이벤트 리스너 등록
    reset.removeEventListener("click", handleFirstClick);
    reset.addEventListener("click", handleCoupangVisit);
  }

  // 두 번째 클릭 핸들러
  function handleCoupangVisit() {
    location.href = "/";
    gtag("event", "한번 더 클릭");
  }

  // 첫 번째 클릭 이벤트 핸들러 추가
  reset.addEventListener("click", handleCoupangVisit);

  // let share = document.createElement('button')
  // share.innerHTML = '영어 한문장 듣고 천원 받기'
  // share.classList.add('share__btn')
  // share.onclick = function () {
  //   gtag('event', '공유하기', {
  //     event_category: '공유하기',
  //     event_label: '공유 버튼',
  //   })
  // }
  // labelContainer.appendChild(share)

  // share.addEventListener('click', handleSpeakCashLuckyBox)

  function handleTossSend5000() {
    location.href = "https://toss.me/yangban/5000";
  }

  function handleSpeakCashLuckyBox() {
    location.href =
      "https://speakcash-luckybox-event.nmax.team/?code=lxyi69&channel=gt";
  }

  // let share = document.createElement('button')
  // share.innerHTML = '매일 아침 카톡으로 날씨 받기'
  // share.classList.add('share__btn')
  // // share.onclick = function () {
  // //   gtag('event', '공유하기', {
  // //     event_category: '공유하기',
  // //     event_label: '공유 버튼',
  // //   })
  // // }
  // labelContainer.appendChild(share)

  // share.addEventListener('click', handleTodayWeather)

  // function handleTodayWeather() {
  //   // location.reload(true)
  //   // location.href = location.href
  //   // history.go(0)
  //   location.href = 'http://pf.kakao.com/_uGQJK'
  // }

  // let consult = document.createElement('button')
  // consult.innerHTML = `
  // <span>관상 더 자세히 알아보기</span>`
  // consult.classList.add('consult__btn')
  // consult.onclick = function () {
  //   gtag('event', '결과 - 프리미엄 관상 버튼')
  // }
  // labelContainer.appendChild(consult)

  // consult.addEventListener('click', handleConsult)

  // function handleConsult() {
  //   location.href = '/premium'
  // }

  // 앱 다운 함수
  // function handleAppDown() {
  //   location.href =
  //     'https://play.google.com/store/apps/details?id=com.yangban&pli=1'
  //   location.href = '/fortune'
  //   'http://pf.kakao.com/_Qfuvxj/chat'
  // }

  function kakaoShare() {
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: "인공지능 관상 테스트",
        description:
          "본인 얼굴을 직접 사진 찍어서 관상 무료로 보세요~ 95% 적중~!",
        imageUrl: "https://i.ibb.co/QYMyVRd/Group-1043-1.png",
        link: {
          mobileWebUrl: "https://keen-poitras-075b07.netlify.app/",
          androidExecParams: "test",
        },
      },
      buttons: [
        {
          title: "관상 확인하기",
          link: {
            mobileWebUrl: "https://keen-poitras-075b07.netlify.app/",
          },
        },
      ],
    });
  }
}

// 남녀 선택 토글 -> 현재 사용하지 않음
// var toggle = document.getElementById('container')
// var toggleContainer = document.getElementById('toggle-container')
// var toggleNumber
// let changePicture = document.querySelector('.image-upload-wrap')
// if (toggle) {
//   toggle.addEventListener('click', function () {
//     toggleNumber = !toggleNumber
//     if (toggleNumber) {
//       toggleContainer.style.clipPath = 'inset(0 0 0 50%)'
//       toggleContainer.style.backgroundColor = 'dodgerblue'
//       changePicture.style.backgroundImage =
//         'url(https://i.ibb.co/B2kj8Pk/man.png)'
//     } else {
//       toggleContainer.style.clipPath = 'inset(0 50% 0 0)'
//       toggleContainer.style.backgroundColor = '#D74046'
//       changePicture.style.backgroundImage =
//         'url(https://i.ibb.co/B2kj8Pk/man.png)'
//     }
//   })
// }

// const habitownBannerWrap = document.querySelector(`.habitown__banner__wrap`)
// const habitownBanner = document.querySelector(`.habitown__banner`)
// const downloadBtn = document.querySelector(`.app__download__btn`)
// const downloadBottonBtn = document.querySelector(
//   `.habitown__download__btn__bottom`,
// )

// const cancelNeverBtn = document.querySelector(`.cancel__btn__left`)

// const cancelBtn = document.querySelector(`.cancel__btn__right`)
// const blackBoard = document.querySelector(`.black__board`)

// const never = localStorage.getItem('never')

// if (!never) {
//   setTimeout(function () {
//     habitownBannerWrap.classList.remove('disblock')
//   }, 1500)
// }

// function handleGoAppDownload() {
//   location.href =
//     'https://play.google.com/store/apps/details?id=com.yangban&pli=1'
//   habitownBanner.classList.add('disblock')
//   blackBoard.classList.add('disblock')
// }

// function handleCancelBanner() {
//   habitownBanner.classList.add('disblock')
//   blackBoard.classList.add('disblock')
// }

// function handleCancelNeverBanner() {
//   localStorage.setItem('never', 'ok')
//   habitownBanner.classList.add('disblock')
//   blackBoard.classList.add('disblock')
// }

// function habitownInit() {
//   downloadBtn.addEventListener('click', handleGoAppDownload)
//   downloadBottonBtn.addEventListener('click', handleGoAppDownload)
// cancelBtn.addEventListener('click', handleCancelBanner)
// blackBoard.addEventListener('click', handleCancelBanner)
// cancelNeverBtn.addEventListener('click', handleCancelNeverBanner)
// }

// habitownInit()
