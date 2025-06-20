// 사진 올리는거
async function readURL(input) {
  if (input.files && input.files[0]) {
    var reader = new FileReader()

    reader.onload = function (e) {
      $('.image-upload-wrap').hide()
      $('.main_photo_container').hide()

      $('.file-upload-image').attr('src', e.target.result)
      $('.file-upload-content').show()

      $('.image-title').html(input.files[0].name)
    }

    if (typeof mixpanel !== "undefined") {
      mixpanel.track("동물상 사진 업로드", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn("⚠️ mixpanel is not defined yet");
    }

    await reader.readAsDataURL(input.files[0])

    await init()

    const imageTitleWrap = document.querySelector(`.ai`)
    imageTitleWrap.classList.add('disblock')
  } else {
    removeUpload()
  }
}

function removeUpload() {
  $('.file-upload-input').replaceWith($('.file-upload-input').clone())
  $('.file-upload-content').hide()
  $('.image-upload-wrap').show()
}
$('.image-upload-wrap').bind('dragover', function () {
  $('.image-upload-wrap').addClass('image-dropping')
})
$('.image-upload-wrap').bind('dragleave', function () {
  $('.image-upload-wrap').removeClass('image-dropping')
})

// url & api 설정

const urlMale = 'https://teachablemachine.withgoogle.com/models/o9D1N5TN/'
const urlFemale = 'https://teachablemachine.withgoogle.com/models/bB3YHn5r/'
let URL = urlFemale

var toggle = document.getElementById('container')
var toggleContainer = document.getElementById('toggle-container')
var toggleNumber = false
let changePicture = document.querySelector('.image-upload-wrap')

if (toggle) {
  toggle.addEventListener('click', function () {
    toggleNumber = !toggleNumber
    if (toggleNumber) {
      toggleContainer.style.clipPath = 'inset(0 0 0 50%)'
      toggleContainer.style.backgroundColor = '#dea55d'
      // changePicture.style.backgroundImage =
      //   'url(https://i.ibb.co/B2kj8Pk/man.png)'
      URL = urlMale
    } else {
      toggleContainer.style.clipPath = 'inset(0 50% 0 0)'
      toggleContainer.style.backgroundColor = '#dea55d'
      // changePicture.style.backgroundImage =
      //   'url(https://i.ibb.co/B2kj8Pk/man.png)'
      URL = urlFemale
    }
  })
}

let model, webcam, labelContainer, maxPredictions

async function init() {
  const modelURL = URL + 'model.json'
  const metadataURL = URL + 'metadata.json'

  model = await tmImage.load(modelURL, metadataURL)
  maxPredictions = model.getTotalClasses()

  labelContainer = document.getElementById('label-container')

  for (let i = 0; i < maxPredictions; i++) {
    labelContainer.appendChild(document.createElement('span'))
  }
  predict()
  // toggle.classList.add('hidden')
}

async function predict() {
  let image = document.getElementById('face-image')

  const prediction = await model.predict(image, false)

  let arr = new Map()

  let description
  if (toggleNumber) {
    description = {
      dog: [
        '다정다감 애교쟁이 강아지상',
        '당신은 다정하고 귀여운 성격으로 모두에게 즐거움을 선사하는 호감형입니다. 친절하고 활발하며, 풍부한 애교와 웃음으로 어디서나 인기가 많습니다. 연인에게는 특히 사랑스럽게 다가가며, 관심이 떨어지면 강아지처럼 외로워하는 특징이 있습니다. 당신은 애인에게의 집착이 강하여, 그들의 관심이 필요한 사람입니다.',
        '강아지상 연예인: 송중기, 박보검, 천정명',
      ],
      cat: [
        '설렘가득 츤데레 고양이상',
        '당신은 무뚝뚝하고 차가워 보이는 첫인상과는 달리, 묘한 매력을 발산하여 항상 인기가 많습니다. 높은 자존심을 가지고 있지만, 실제로는 관심을 받는 것을 좋아하며, 연인에게는 은근히 애교를 부립니다. 시크하고 츤데레 스타일의 당신은 연인에게 지속적인 설렘이 되며, 이런 모습은 마치 고양이와 닮아 있습니다.',
        '고양이상 연예인: 강동원, 김수현, 이종석',
      ],
      rabbit: [
        '사랑스러운 상큼 토끼상',
        '당신은 천진난만하고 귀여운 성격으로, 그저 존재만으로도 주변에 행복을 전파하는 사람입니다. 호기심 많고 활발한 성격으로, 그 귀여운 외모는 연인의 보호본능을 자극합니다. 상큼한 당신은 특별한 애교 없이도 연인에게 매우 사랑스럽게 느껴집니다.',
        '토끼상 연예인: 정국(BTS), 바비, 수호(엑소)',
      ],
      dinosaur: [
        '따뜻한 카리스마 공룡상',
        '당신은 무심한 성격과 첫 인상은 나쁜 남자 같지만, 알고 보면 따뜻함이 묻어나는 카리스마 있는 남자입니다. 시크한 매력 때문에 사람들이 쉽게 다가가지는 못하지만, 한 번 깊게 알게 되면 그 끝없는 터프한 매력에 헤어나올 수 없게 됩니다.',
        '공룡상 연예인: 공유, 김우빈, 이민기',
      ],
      bear: [
        '포근한 매력의 곰상',
        '당신은 처음에는 무서워 보이지만 사실은 귀여운 매력을 가진 사람입니다. 세심하고 꼼꼼한 성격을 가지고 있으며, 연인에게는 헌신적으로 돌봐주는 듬직한 존재입니다. 포근한 매력과 신뢰감을 모두 갖춘 최고의 남자로, 누구든지 의지할 수 있는 인물입니다.',
        '곰상 연예인: 마동석, 조진웅, 박성웅',
      ],
    }
  } else {
    description = {
      dog: [
        '다정다감 애교쟁이 강아지상',
        '당신은 다정하고 귀여운 성격으로 모두에게 즐거움을 선사하는 호감형입니다. 친절하고 활발하며, 풍부한 애교와 웃음으로 어디서나 인기가 많습니다. 연인에게는 특히 사랑스럽게 다가가며, 관심이 떨어지면 강아지처럼 외로워하는 특징이 있습니다. 당신은 애인에게의 집착이 강하여, 그들의 관심이 필요한 사람입니다.',
        '강아지상 연예인: 박보영, 수지, 박하선',
      ],
      cat: [
        '설렘가득 츤데레 고양이상',
        '당신은 무뚝뚝하고 차가워 보이는 첫인상과는 달리, 묘한 매력을 발산하여 항상 인기가 많습니다. 높은 자존심을 가지고 있지만, 실제로는 관심을 받는 것을 좋아하며, 연인에게는 은근히 애교를 부립니다. 시크하고 츤데레 스타일의 당신은 연인에게 지속적인 설렘이 되며, 이런 모습은 마치 고양이와 닮아 있습니다.',
        '고양이상 연예인: 한예슬, 한채영, 경리',
      ],
      rabbit: [
        '사랑스러운 상큼 토끼상',
        '당신은 천진난만하고 귀여운 성격으로, 그저 존재만으로도 주변에 행복을 전파하는 사람입니다. 호기심 많고 활발한 성격으로, 그 귀여운 외모는 연인의 보호본능을 자극합니다. 상큼한 당신은 특별한 애교 없이도 연인에게 매우 사랑스럽게 느껴집니다.',
        '토끼상 연예인: 정유미, 문채원, 나연(트와이스)',
      ],
      deer: [
        '온순하고 우아한 사슴상',
        '당신은 맑고 영롱한 분위기를 가진, 사슴처럼 차분한 성격의 사람입니다. 깜짝 놀라게 하는 눈망울은 당신의 트레이드마크이며, 그 따스하고 온순한 눈빛은 사랑스러움을 풍깁니다. 부끄러움이 많아 애정 표현이 조금 어렵지만, 그 신비한 면모와 따뜻한 성격으로 연인의 마음을 사로잡는 능력이 있습니다.',
        '사슴상 연예인: 서현진, 아이린, 태연',
      ],
      fox: [
        '섹시한 밀당고수 여우상',
        '당신은 사람들을 사로잡는 섹시한 매력과 우아한 외모, 뛰어난 센스를 가진 인물입니다. 어디에서나 주목 받으며, 사교적인 성격으로 연인에게도 적극적으로 애정을 표현합니다. 하지만 동시에 밀당의 고수로, 연인을 항상 당신에게 몰입하게 만드는 매력을 가지고 있습니다.',
        '여우상 연예인: 김연아, 제니, 오연서',
      ],
    }
  }

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ': ' + prediction[i].probability.toFixed(2)
    arr.set(
      prediction[i].className,
      parseInt((prediction[i].probability * 100).toFixed(0)),
    )
  }

  maxV = 0
  answer = ''
  let resultArray = []
  arr.forEach((value, key, mapObject) => {
    resultArray.push({ key, value })
    if (value > maxV) {
      maxV = value
      answer = key
    }
  })

  Array.prototype.shuffle = function () {
    var length = this.length
    while (length) {
      var index = Math.floor(length-- * Math.random())
      var temp = this[length]
      this[length] = this[index]
      this[index] = temp
    }
    return this
  }

  resultArray.shuffle()

  for (let i = 0; i < resultArray.length - 1; i++) {
    for (let j = i + 1; j < resultArray.length; j++) {
      if (resultArray[j].value > resultArray[i].value) {
        let temp = resultArray[i]
        resultArray[i] = resultArray[j]
        resultArray[j] = temp
      }
    }
  }

  const starsEng = []

  for (let i = 0; i < 5; i++) {
    let a = description[resultArray[i].key]
    // starsEng.push(a[2])
  }

  let starsListImg = ''

  for (let j = 0; j < 5; j++) {
    let resultText
    if (resultArray[j].key === 'dog') {
      resultText = '강아지상'
    } else if (resultArray[j].key === 'cat') {
      resultText = '고양이상'
    } else if (resultArray[j].key === 'dinosaur') {
      resultText = '공룡상'
    } else if (resultArray[j].key === 'bear') {
      resultText = '곰상'
    } else if (resultArray[j].key === 'rabbit') {
      resultText = '토끼상'
    } else if (resultArray[j].key === 'fox') {
      resultText = '여우상'
    } else if (resultArray[j].key === 'deer') {
      resultText = '사슴상'
    }
    if (resultArray[j].value === 0) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent zero">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 0 && resultArray[j].value <= 10) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent zeroone">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 10 && resultArray[j].value <= 20) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent onetwo">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 20 && resultArray[j].value <= 30) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent twothree">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 30 && resultArray[j].value <= 40) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent threefour">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 40 && resultArray[j].value <= 50) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent fourfive">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 50 && resultArray[j].value <= 60) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent fivesix">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 60 && resultArray[j].value <= 70) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent sixseven">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 70 && resultArray[j].value <= 80) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent seveneight">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 80 && resultArray[j].value <= 90) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent eightnine">${resultArray[j].value}%</div>
      </div>
        `
    } else if (resultArray[j].value > 90 && resultArray[j].value <= 100) {
      starsListImg =
        starsListImg +
        ` <div class="star__list__wrap">
        <div class="star__list__img">
        ${resultText}
        </div>
        <div class="percent nineten">${resultArray[j].value}%</div>
      </div>
        `
    }
  }

  mixpanel.track("동물상 결과 도출", {
    result: answer, // 예: 강민경
    top5: resultArray.slice(0, 5).map(r => `${r.key} (${r.value}%)`).join(", "),
    timestamp: new Date().toISOString(),
  });

  let result = document.createElement('div')
  result.classList.add('main_result_description')
  result.innerHTML = `${description[answer][0]}`
  labelContainer.appendChild(result)

  let result2 = document.createElement('div')
  result2.classList.add('celebrity')
  result2.innerHTML = `${description[answer][2]}`
  labelContainer.appendChild(result2)

  let desc = document.createElement('p')
  desc.classList.add('main__result__content__p')
  desc.innerHTML = `${description[answer][1]}`
  labelContainer.appendChild(desc)

  let otherResult = document.createElement('div')
  otherResult.classList.add('other__result')
  otherResult.innerHTML = `${starsListImg}`
  labelContainer.appendChild(otherResult)

  function getResultGtag() {
    gtag('event', `동물상 결과`, {
      result: `${answer}`,
    })
  }
  getResultGtag()

  let reset = document.createElement('button')
  reset.innerHTML = `
  <span>다른 사진 해보기</span>`

  reset.classList.add('reset__btn')
  reset.onclick = function () {
    gtag('event', '한번 더 클릭[동물상]')
    mixpanel.track("동물상 다른 사진으로 재시도");
  }
  labelContainer.appendChild(reset)

  // let consult = document.createElement('button')
  // consult.innerHTML = `
  // <span>매일 10분, 200원 앱태크</span>`
  // consult.classList.add('consult__btn')
  // consult.onclick = function () {
  //   gtag('event', '결과 후 스픽볼 배너[200원 앱태크]')
  // }
  // labelContainer.appendChild(consult)

  // consult.addEventListener('click', handleConsult)

  // function handleConsult() {
  //   location.href = 'https://onelink.to/9wsxet'
  // }

  // let appDown = document.createElement('button')
  // appDown.innerHTML = `
  // <span>오늘의 운세 보기</span>
  // `
  // appDown.classList.add('app_down_btn')
  // appDown.onclick = function () {
  //   gtag('event', '결과 - 오늘 운세 워딩')
  // }
  // labelContainer.appendChild(appDown)

  // let share = document.createElement('button')
  // share.innerHTML = `
  // <span>주변에 관상 테스트 알려주기</span>
  // `
  // share.classList.add('share__btn')
  // share.onclick = function () {
  //   gtag('event', '공유하기')
  // }
  // labelContainer.appendChild(share)

  reset.addEventListener('click', handleReset)
  // appDown.addEventListener('click', handleAppDown)
  // share.addEventListener('click', handleFortune)
  // share.addEventListener('click', kakaoShare)

  // 한번 더 하기 함수
  function handleReset() {
    // checkMobile()

    function checkMobile() {
      const mobileType = navigator.userAgent.toLowerCase()

      if (mobileType.indexOf('android') > -1) {
        return window.open(
          'https://play.google.com/store/apps/details?id=com.nmax.cashball',
          '_blank',
        )
      } else if (
        mobileType.indexOf('iphone') > -1 ||
        mobileType.indexOf('ipad') > -1 ||
        mobileType.indexOf('ipod') > -1
      ) {
        return window.open(
          'https://apps.apple.com/kr/app/%EC%8A%A4%ED%94%BD%EB%B3%BC-%EB%8F%88-%EB%B2%84%EB%8A%94-%EC%98%81%EC%96%B4-%ED%9A%8C%ED%99%94-%EC%95%B1-%EC%8A%A4%ED%94%BC%ED%82%B9-%EB%A6%AC%EC%8A%A4%EB%8B%9D/id6457251682',
          '_blank',
        )
      } else {
        return window.open(
          'https://play.google.com/store/apps/details?id=com.nmax.cashball',
          '_blank',
        )
      }
    }

    location.reload(true)
    location.href = location.href
    history.go(0)
    // location.href = '/more'
  }

  // 앱 다운 함수
  // function handleAppDown() {
  //   location.href =
  //     'https://play.google.com/store/apps/details?id=com.yangban&pli=1'
  //   location.href = '/fortune'
  //   'http://pf.kakao.com/_Qfuvxj/chat'
  // }

  // function handleFortune() {
  //   location.href = '/fortune'
  // }

  // function kakaoShare() {
  //   Kakao.Share.sendDefault({
  //     objectType: 'feed',
  //     content: {
  //       title: '관상 테스트',
  //       description:
  //         '본인 얼굴을 직접 사진 찍어서 관상 무료로 보세요~ 95% 적중~!',
  //       imageUrl: 'https://i.ibb.co/QYMyVRd/Group-1043-1.png',
  //       link: {
  //         mobileWebUrl: 'https://keen-poitras-075b07.netlify.app/',
  //         androidExecParams: 'test',
  //       },
  //     },
  //     buttons: [
  //       {
  //         title: '관상 확인하기',
  //         link: {
  //           mobileWebUrl: 'https://keen-poitras-075b07.netlify.app/',
  //         },
  //       },
  //     ],
  //   })
  // }
}

// 남녀 선택 토글 -> 현재 사용하지 않음

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
