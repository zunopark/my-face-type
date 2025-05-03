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

    if (typeof mixpanel !== "undefined") {
      mixpanel.track("관상 사진 업로드", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn("⚠️ mixpanel is not defined yet");
    }
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
      "이 이마를 보니 둥글고 넉넉하구먼. 이런 이마는 집안일보다는 바깥일에서 재능을 발휘하며, 사람들과의 관계도 원만하고 타고난 인복이 있네. 눈썹은 재복의 기운이 깃들어 있고, 미간이 넓어 자유롭고 대범한 성격이구먼. 눈빛은 약간의 고집과 자존심이 서려있어 스스로의 신념을 지키려는 기질이 보이네. 특히 남자복이 많아 이성과의 인연이 끊이지 않을 상이니 주의해야 할 것이야. 턱은 복을 머금은 상으로 보이지만 변덕스러움이 있을 수 있네. 연애 운이 강하게 드리워져 있으니 이성 문제에 신중함이 필요할 것이야. 결론적으로, 이 상은 출세와 성공의 운이 강하게 드리워져 있구먼. 개방적이고 사람들과의 인연이 좋은 관상이라 할 수 있네.",
      "개방적이면서도 성공 운이 강한 관상",
      "한효주",
      "[2025년 총운] 새로운 기회가 찾아오며 인간관계에서 큰 도움이 예상됩니다. 이성 관계는 신중하게 다룰 필요가 있습니다.",
    ],
    강동원: [
      "이마는 좋고 반듯하여 강인하면서도 정적인 성격을 보여주는구먼. 눈은 봉황 눈에 가까워 재복이 따르고, 사람을 자연스럽게 끌어당기는 기운이 서려 있네. 눈썹은 강직하면서도 자존심과 고집이 뚜렷한 상이야. 귀는 인복이 좋아 주변에 사람들이 끊이지 않을 것이며, 정이 깊고 따뜻한 귀로 보이는구먼. 턱 선은 약간 갸름하여 성격이 부드럽고 원만하며, 입은 무겁고 신중한 기운이 드리워져 있네. 전체적으로 사람을 끌어당기는 기운이 강하여 성공의 운이 활짝 열린 얼굴이라 할 수 있네.",
      "평생 재물운이 타고난 관상",
      "강동원",
      "[2025년 총운] 큰 재물운이 따르며 중요한 사람과의 인연이 성공적인 결과로 이어질 가능성이 큽니다.",
    ],
    강소라: [
      "이마는 적당하고 아담하여 결혼운이 좋으며, 눈썹은 재복이 깃들어 있고 자존심이 강한 상이로다. 입술은 도톰하여 연애운이 좋고 살림을 잘 꾸릴 입술이구먼. 턱은 강인하면서도 재복과 말년운이 좋아 서글서글한 성격이 드러나 있네. 귀는 당나귀귀에 가까워 인복이 좋고 직업운과 대인관계가 원만한 상이야. 씀씀이는 큰 편이지만 자상한 기질이 더해져 전체적으로 좋은 관상이라 할 수 있네.",
      "결혼하면 행복할 관상",
      "김태리",
      "[2025년 총운] 가정과 일에서 균형을 맞출 기회가 찾아오며 새로운 인연이 이어질 가능성이 있습니다.",
    ],
    김수현: [
      "눈썹은 굵고 진해 재물복이 좋고 끈기가 강한 상이네. 눈썹과 눈 사이에 살이 적어 이기적인 면이 조금 있으나 세심한 성격을 지녔구먼. 눈은 날카롭고 예리하여 관찰력이 뛰어나며 눈치가 빠른 상이야. 코는 재물복이 좋고 재물에 대한 욕심과 집념이 엿보이네. 인중은 재주와 재능이 좋아 특히 예능 계열에서 두각을 나타낼 상이야. 전체적으로 긍정적인 성향을 지녀 말년운이 무난하고 안정적인 관상이라 할 수 있네.",
      "섬세하고 끈기와 의지력이 강한 관상",
      "차은우",
      "[2025년 총운] 재물과 명예에서 균형을 맞추는 한 해가 될 것이며 끈기 있는 노력이 좋은 결과를 가져올 것입니다.",
    ],
    김옥빈: [
      "이마는 적당하면서도 당돌한 기운이 서려 있구먼. 눈썹은 길고 진하여 재복이 좋고 복이 따르는 상이야. 눈은 이성을 끌어당기는 힘이 강하며 연애운이 강하게 드리워져 있네. 입은 자존심이 강하고 이성을 유혹하는 재주가 뛰어난 입이구먼. 볼은 욕심이 많고 고집스러우며 이기적인 면도 엿보이지만, 재복이 좋고 생활력이 강하며 인복도 타고난 상이야. 전체적으로 흠잡을 데 없는 완벽한 관상이라 할 수 있으나, 얼굴에서 뿜어져 나오는 기가 강해 다소 부담스럽게 느껴질 수 있으니 그 기를 잘 다스리는 것이 중요하겠네.",
      "강한 기운과 매력을 지닌 관상",
      "고윤정",
      "[2025년 총운] 새로운 사업이나 프로젝트에서 성공할 가능성이 크며 인간관계에서도 큰 도움을 받을 것입니다.",
    ],
    박해일: [
      "이마는 훤칠하고 깨끗하여 이성운이 좋고 두뇌가 명석한 상이로다. 자아도취적 성향이 있으나 의지력이 강하고 무엇이든 집중하는 성격이네. 눈을 보면 이성운이 강하게 드리워져 있으며 재물에 대한 집착 또한 엿보이는구먼. 화려하면서도 깨끗하고 수려한 것을 추구하는 기질이 눈에 서려있네. 입꼬리는 낙천적이고 긍정적인 성향을 보여주며, 입이 미세하게 나와 있어 말재주가 뛰어난 관상이라 할 수 있네.",
      "이성운과 두뇌가 뛰어난 관상",
      "조정석",
      "[2025년 총운] 이성과의 관계에서 긍정적인 변화가 예상되며, 새로운 아이디어나 프로젝트에서 두각을 나타낼 것입니다.",
    ],
    송중기: [
      "이마는 짱구이마에 가까워 머리가 좋고 지혜로운 상이로다. 노력보다는 타고난 재능으로 성과를 내는, 이른바 ‘재능충’ 유형이구먼. 코는 재복이 깃들어 있고 여복과 연애운이 따르는 상이야. 눈빛에는 강인함이 서려 있으며 직업운이 좋고 말년운 또한 깔끔하게 정리될 상이로다. 다재다능한 재능을 지녔으며, 원숭이상에 가까워 다양한 재능을 통해 화려한 인생을 살 가능성이 높네. 전체적으로 타고난 재능과 복이 조화를 이루는 관상이라 할 수 있네.",
      "머리가 뛰어난 천재형 관상",
      "임시완",
      "[2025년 총운] 다재다능함이 빛을 발하며 새로운 도전에서 큰 성과를 이룰 가능성이 높습니다.",
    ],
    안소희: [
      "갈매기 상의 이마는 슬기롭고 지혜로운 여성을 상징하네. 눈썹은 재벌가의 기운을 품고 있어 부모복과 남편복이 타고난 상이로다. 눈은 매혹적이면서도 화개살이 있어 사람들에게 사랑받고 이성운이 강하게 드리워져 있구먼. 다만 출세하지 못하면 필요 없는 인연들이 붙을 가능성이 있어 주의가 필요하네. 이성을 끌어당기는 매력이 강하고 예능 기질이 풍부하며, 성격은 온순하고 착하며 선한 마음을 지닌 상이라 할 수 있네. 전체적으로 복과 매력을 겸비한 관상이라 볼 수 있네.",
      "사회성이 뛰어나고 이성운이 강한 관상",
      "김유정",
      "[2025년 총운] 새로운 기회가 찾아오며 대인관계에서 큰 도움을 받을 것입니다. 이성관계는 신중하게 접근할 필요가 있습니다.",
    ],
    수지: [
      "남자 인연이 많아 남자가 꼬이기 쉽고, 남편으로 인해 마음고생을 할 수 있는 상이로다. 성격은 남자다운 면모도 있으면서 서글서글하고 붙임성이 좋아 사람들과의 사회적 관계가 원만하네. 연애운 또한 강하게 드리워져 있으며, 눈썹은 가지런하여 여성스럽고 차분한 기질이 엿보이네. 좋은 성격을 두루 갖춘 관상이라 할 수 있지만, 돌아서면 냉담한 면도 있어 이중적인 매력을 지닌 상이구먼. 얼굴에는 개성이 강하게 드러나 사람들의 마음을 자연스럽게 끌어당기는 힘이 있는 관상이라 할 수 있네.",
      "연애운이 강하고 매력적인 관상",
      "아이유",
      "[2025년 총운] 연애와 인간관계에서 큰 변화를 맞이할 가능성이 있습니다. 신중하게 선택하는 것이 중요합니다.",
    ],
    유승호: [
      "이마는 깨끗하고 시원하여 성격 또한 시원스럽고 사회성도 뛰어난 상이로다. 눈은 길상(吉相)의 기운이 깃들어 재복이 좋고 마음씨가 선하며 감정이 풍부하네. 코를 보면 감각이 뛰어나고 다재다능한 재능을 지녔으며, 대인관계 또한 원만하구먼. 성격은 차분하지만 때로는 급한 면이 엿보이는 상이야. 입은 큰 편이라 결단력이 뛰어나고 시원시원한 성격이 드러나 있으며, 마음씨가 넓고 자상한 기질을 품고 있네. 전체적으로 사람을 끌어당기는 매력과 더불어 따뜻한 성정을 지닌 좋은 관상이라 할 수 있네.",
      "재능과 따뜻함을 겸비한 관상",
      "이도현",
      "[2025년 총운] 직업적으로 좋은 기회가 찾아오며 주변 사람들과의 관계가 더 깊어질 것입니다.",
    ],
    유아인: [
      "이마를 보니 성격이 착하고 인정이 많아 사람들과의 관계에서 따뜻함을 느끼게 하는 상이로다. 하지만 뺀질이 기질이 있어 남의 말을 곧이곧대로 듣지 않는 성향도 엿보이는구먼. 눈은 다정하면서도 차분하고 사색적이며, 반항아 기질과 개성이 강해 주관이 뚜렷한 눈이라 할 수 있네. 이 눈은 남들과 다른 특별한 인생을 추구하며 평범함을 거부하는 기질을 보여주고 있구먼. 턱은 강인하여 재복이 좋고 말년운 또한 안정적이지만, 예민한 면이 드러나 있어 스스로의 마음을 잘 다스리는 것이 중요하네. 전체적으로 개성과 강인함이 어우러진 독특한 매력을 지닌 관상이라 할 수 있네.",
      "독특하고 주관이 뚜렷한 관상",
      "지드래곤",
      "[2025년 총운] 새로운 도전을 통해 뜻깊은 결과를 얻을 가능성이 있으며 개인적인 성장의 기회가 열립니다.",
    ],
    김태희: [
      "귀가 당나귀 귀에 가까워 재복과 인복이 타고난 상이로다. 작고 예쁜 정면 두상은 높은 판단력을 상징하며 머리 회전이 빠르고 지혜로운 기질이 엿보이네. 눈썹은 눈꼬리보다 길어 재복이 아주 강하게 드리워져 있구먼. 이빨은 두상에 비해 큰 편이라 성격 또한 시원시원하고 솔직한 기질을 지녔음을 보여주는구먼. 전체적으로 재복과 인복이 균형 있게 갖추어진 좋은 관상이라 할 수 있네.",
      "재복과 인복이 뛰어난 관상",
      "김태희",
      "[2025년 총운] 재물운과 인복이 크게 상승할 것이며, 새로운 도전에서 좋은 성과를 기대할 수 있습니다.",
    ],
    문채원: [
      "눈썹은 재복이 깃들어 있어 재물운이 좋은 상이로다. 눈은 내조의 기운이 강해 가정을 잘 돌볼 눈이구먼. 입은 자기 속마음을 쉽게 드러내지 않아 신중하고 속 깊은 성격임을 보여주네. 턱은 말년운이 좋아 연말쯤 행운을 기대해도 좋을 상이야. 귀는 낭비벽이 있는 귀라 절제가 필요하겠구먼. 다만 이마에 조금 흠이 있어 남편이 사고를 칠 가능성이 있으니 착하고 성실한 남편을 만나면 이 모든 기운이 균형을 이루어 더할 나위 없는 좋은 관상이 될 것이야.",
      "현명하고 내조에 뛰어난 관상",
      "송혜교",
      "[2025년 총운] 가족과의 관계에서 큰 행운이 찾아올 것이며, 재정 관리에 주의할 필요가 있습니다.",
    ],
    박보영: [
      "이마는 적당하면서도 약간 독특한 기운이 서려 있어 남편을 좌지우지할 능력을 가진 이마로다. 눈썹과 코는 재복이 매우 좋아 재물운과 복이 따르는 상이네. 귀와 눈꼬리가 옆으로 자리 잡아 현실적이고 실리를 추구하는 성향이 강하게 드러나는구먼. 얼굴에 비해 입이 약간 작은 편이라 속마음을 쉽게 드러내지 않는 기질이 있지만, 여성에게 작은 입은 오히려 단정하고 신중함을 의미하니 문제될 것이 없네. 눈은 약간 부리부리하여 자기 주관이 뚜렷하고 강단이 있어 가정을 자기 방식대로 꾸려나갈 힘이 보이는 눈이라 할 수 있네. 전체적으로 현실적이면서도 주관이 강한 복 있는 관상이라 할 수 있네.",
      "진심을 속마음에 담아두는 관상",
      "박보영",
      "[2025년 총운] 새로운 프로젝트나 작품에서 큰 주목을 받을 것이며, 신뢰할 수 있는 동료와의 협력이 중요합니다.",
    ],
    소지섭: [
      "이마를 보아하니 재벌 또는 CEO의 기운이 서려 있는 관상이로다. 눈은 붕어눈 또는 고래눈의 형상으로 재물운이 강하게 깃들어 있어 재복이 따를 상이네. 귀가 잘 보이지 않아 고집이 강하고 속마음을 쉽게 드러내지 않는 성향이 엿보이는구먼. 침묵을 잘 지키며 잔잔한 성격을 지녔지만, 필요할 때는 강한 성질을 드러낼 줄 아는 기질도 엿보이네. 노년운은 특별히 큰 부침 없이 남들과 비슷하게 평온하게 흘러갈 상이로다. 전체적으로 재복이 강하고 내면의 강단이 돋보이는 관상이라 할 수 있네.",
      "과묵하고 줏대가 있는 관상",
      "현빈",
      "[2025년 총운] 꾸준한 노력이 결실을 맺으며, 새로운 분야에서 성공적인 결과를 기대할 수 있습니다.",
    ],
    손예진: [
      "이마는 갈매기상이라 현모양처의 기운이 서려 있으며 지혜롭고 슬기로운 상이로다. 얼굴에 비해 코가 크지만 콧구멍이 보이지 않아 재물이 새어나가지 않고 들어올 복이 깃들어 있네. 귀를 보니 출세를 해야 재복이 산더미처럼 쌓일 귀라 할 수 있구먼. 턱은 갸름하여 성격이 원만하고 부드러운 기질이 엿보이네. 다만 이마가 너무 훤칠하여 남편과의 트러블이 발생할 가능성이 있지만, 타고난 지혜로 모든 상황을 슬기롭게 헤쳐나갈 힘이 있는 관상이라 할 수 있네. 전체적으로 복과 지혜가 조화를 이룬 좋은 상이로다.",
      "머리가 좋고 지혜로운 관상",
      "카리나",
      "[2025년 총운] 개인적인 프로젝트나 가정에서 균형을 맞추며 긍정적인 결과를 얻게 될 것입니다.",
    ],
    원빈: [
      "코와 귀는 재복이 아주 뛰어나며, 특히 귀는 재복의 완벽한 기운을 품고 있는 귀라 할 수 있네. 낭비벽이 약간 보이지만 큰 문제로 이어지지는 않을 것이야. 얼굴형은 미남형으로 연예인과 같은 분야에 적성이 잘 맞을 상이구먼. 이마는 사각형으로 사회성이 뛰어나 사람들과의 관계에서 두각을 나타낼 수 있는 상이라 할 수 있네. 눈은 잘생김을 넘어 아름다움이 깃들어 있어 정에 약한 기질이 엿보이는구먼. 눈이 안쪽으로 들어간 형태라 판단력이 뛰어나고 머리 회전이 빠른 상이야. 하지만 어딘가 외로움이 서려 있는 관상이라 결혼은 마음이 내킬 때 하는 것이 좋겠네. 전체적으로 정적이고 과묵한 기질이 돋보이며, 재복과 사회성이 어우러진 훌륭한 관상이라 할 수 있네.",
      "마음만 먹으면 뭐든 할 수 있는 관상",
      "원빈",
      "[2025년 총운] 새로운 도전이 성공으로 이어지며, 작품을 통해 큰 주목을 받을 가능성이 높습니다.",
    ],
    이광수: [
      "이마는 적당하면서도 관운이 강하게 드리워져 있으며, 개인주의적인 성향이 엿보이는 상이로다. 눈썹은 길고 진해 재복이 풍부하고, 눈썹뼈와 코의 기운을 보니 정력이 강하게 깃든 상이구먼. 정력이 강한 만큼 눈에서는 가정에 충실한 기질이 드러나네. 성격은 다소 급한 면이 있지만 대인관계는 평소에 잘 쌓으며, 말상이라 직업운이 강하고 욕심 또한 많은 편이야. 귀는 성공과 출세의 기운을 품고 있으며 인복 또한 좋은 귀로다. 전체적으로 흠잡을 데 없이 균형 잡힌 좋은 관상이라 할 수 있네.",
      "누구보다 정력이 좋은 관상",
      "뷔",
      "[2025년 총운] 다양한 분야에서 재능을 발휘하며, 인복으로 새로운 기회를 얻게 될 것입니다.",
    ],
    이승기: [
      "말상이라 직업운이 매우 강하게 드리워져 있구먼. 이마는 사각형으로 사회성이 뛰어나고 가정보다는 일을 더 중요하게 생각하는 성향이 보이는 상이네. 코는 강인하고 활력이 넘쳐 사업을 하면 큰 성과를 이룰 관상이라 할 수 있네. 귀가 커서 인복이 좋고, 기분파 기질이 있으면서도 의리가 깊어 주변 사람들과의 관계가 두터울 것이야. 귀밑 턱이 갸름하여 인생의 굴곡이 적고 평탄하게 흘러갈 기운이 보이며, 입은 큰 편이라 시원시원하고 낙천적인 성격을 지닌 상이로다. 전체적으로 직업운과 인복이 조화를 이룬 안정적이고 복 있는 관상이라 할 수 있네.",
      "인생에 굴곡이 없을 관상",
      "박서준",
      "[2025년 총운] 사업이나 새로운 프로젝트에서 큰 성과를 이루며, 인생의 중요한 전환점을 맞이할 것입니다.",
    ],
    크리스탈: [
      "이마는 넓고 둥근형이라 이혼수가 살짝 엿보이지만, 남편을 제외한 다른 사람들과는 항상 좋은 관계를 유지할 상이네. 눈썹은 자상함이 서려 있고, 눈은 자존심이 강하며 자신을 굳건하게 지키려는 기질이 드러나는구먼. 코는 재복이 깃든 상으로 재물운이 좋게 흐르고 있네. 입은 가늘어 속마음을 쉽게 드러내지 않는 신중한 성향이 보이는 입이야. 귀는 정면에서 잘 보이지 않아 속마음을 알기 어려워 보이지만, 겉으로는 사람들에게 친절하고 잘 대해 사회성과 붙임성이 뛰어난 상이라 할 수 있네. 전체적으로 대인관계가 원만하고 타고난 재복과 신중함이 균형을 이루는 관상이라 할 수 있네.",
      "대인관계 마스터 관상",
      "제니",
      "[2025년 총운] 새로운 인연과 협업이 큰 성공을 불러올 것이며, 대인관계에서 큰 도움을 받을 것입니다.",
    ],
    손나은: [
      "이마는 적당한 크기로 잔머리가 잘 돌아가고 눈치가 빠른 이마로구먼. 눈썹은 길고 가지런하여 여성스럽고 부드러운 기질이 드러나는 상이야. 눈은 얌체 기질이 살짝 보이지만 이성운이 매우 강한 눈이라 할 수 있네. 코는 짧고 콧구멍이 잘 보여 애교가 많고 씀씀이도 큰 편이지만, 남편복이 약한 기운이 엿보이는구먼. 이 코로 보아 불필요한 남자들이 주위를 맴돌 가능성이 있어 주의가 필요하겠네. 인중은 짧은 편이라 대인관계는 원활하지만, 자기와 비슷한 부류의 사람들과 더 쉽게 친해지는 경향이 있네. 전체적으로 이성운이 강하게 드러난 관상이지만, 배우자를 선택할 때는 심사숙고하는 것이 중요하네. 주의 깊게 선택한다면 복이 따를 상이라 할 수 있네.",
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

  mixpanel.track("관상 결과 도출", {
    result: answer, // 예: 강민경
    top5: resultArray.slice(0, 5).map(r => `${r.key} (${r.value}%)`).join(", "),
    timestamp: new Date().toISOString(),
  });

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

  // let otherResult = document.createElement("div");
  // otherResult.classList.add("other__result");
  // otherResult.innerHTML = `${starsListImg}`;
  // labelContainer.appendChild(otherResult);

  // let desc2 = document.createElement("p");
  // desc2.classList.add("main__result__content__p2");
  // desc2.innerHTML = `${description[answer][3]}`;
  // labelContainer.appendChild(desc2);

  function getResultGtag() {
    gtag("event", `관상 결과`, {
      result: `${answer}`,
    });
  }
  getResultGtag();

  const noStore = document.querySelector(`.nostore`);
  noStore.classList.add("none");


//   let share = document.createElement('button')
//   share.innerHTML = `
// <div class="ad_box_custom">
//   <div class="ad_top_text">관상 심층 분석 + 나의 평생 재물운</div>
//   <div class="ad_title">내 관상은 평생 몇 억을 모을까?</div>
//   <div class="ad_subtitle">AI 관상가 양반 공식 서비스</div>
//   <div class="ad_footer">
//     <div class="ad_count">현재 누적 신청 : 2,387명</div>
//     <a href="/premium" class="ad_button">10,000자 레포트</a>
//   </div>
// </div>
// `;
//   share.classList.add('share__btn')
//   share.onclick = function () {
//     gtag('event', '관상 분석', {
//       event_category: '관상 분석',
//       event_label: '관상 분석',
//     })
//     mixpanel.track("관상 분석 + 재물 분석 받기");
//   }
//   labelContainer.appendChild(share)

  let reset = document.createElement("button");
  reset.innerHTML = `
  <span>다른 사진으로 해보기</span>`;
  reset.classList.add("reset__btn");
  reset.onclick = function () {
    gtag("event", "한번 더 클릭");
    mixpanel.track("관상 다른 사진으로 재시도");
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


  share.addEventListener('click', handleSpeakCashLuckyBox)

  function handleTossSend5000() {
    location.href = "https://toss.me/yangban/5000";
  }

  function handleSpeakCashLuckyBox() {
    location.href =
      "/premium";
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
