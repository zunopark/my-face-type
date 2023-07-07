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
    // const faceImageTitle = document.querySelector(`#face-image-text`)
    // faceImageTitle.classList.remove('none')

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
const URL = 'https://teachablemachine.withgoogle.com/models/FiW0HL4DO/'

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
}

async function predict() {
  let image = document.getElementById('face-image')

  const prediction = await model.predict(image, false)

  let arr = new Map()

  // 관상 결과 db
  let description = {
    강민경: [
      '이마는 둥근 형이라 집안일보다 바깥일을 좋아하고, 대인관계가 좋고 인복이 좋은 이마고 눈썹은 재복이 좋고 미간이 넓어서 자유로운 성격으로 보이네. 눈은 약간의 고집과 자존심이 있는 눈이며 남자가 많이 따르는, 남자복이 많은 눈일세. 턱은 재복이 좋지만 변덕이 심할 수 있고 연애 운이 강하고 복스러우니 이성을 조심해야 하오. 결국 결론은 출세와 성공에 강한 얼굴일세.',
      '개방적인 성격의 관상',
    ],
    강동원: [
      '좋은 이마를 가졌고 성격이 강인하며 정적인 것으로 보이네. 눈이 봉황 눈에 가깝기 때문에 재복이 좋은 눈이고 사람을 끌어들일거세. 눈썹을 보니 성격이 강직하니 자존심이 강하며 고집이 있소. 귀는 인복이 좋으며 정이 많은 귀이니 참고하시게나. 턱 선이 약간 갸름하여 성격이 원만하고 입은 무겁소. 전체적으로 사람을 끌어들이는 기운이 강하여 성공 운이 열린 얼굴일세.',
      '평생 재물운은 타고난 관상',
    ],
    강소라: [
      '이마가 적당하여 아담하고 결혼운이 좋으며 눈썹은 재복이 좋고 자존심이 강하오. 입술은 도톰하여 연애운이 좋고 살림을 잘하는 입술일세. 턱은 강인하고 재복이 좋고 말년운이 좋으며 서글서글한 성격을 지니고 있소. 당나귀귀에 가까워 인복이 좋으며 직업운이 좋고 대인관계가 좋소. 씀씀이는 큰편이나 자상하여 좋은 관상으로 볼 수 있소.',
      '결혼하면 행복할 관상',
    ],
    김수현: [
      '눈썹은 굵고 진하여 재물복이 좋소. 끈기가 강한 눈썹이고 눈썹과 눈 사이에 살이 별로 없는데 이기주의적인 성향이 조금 있으나 성격이 세심하니 참고하시게. 또 날카로운 눈은 예리하고 관찰력이 좋으며 눈치가 빨라 보이네. 코를 보면 재물복이 좋으며 재물에 대한 욕심이 있으니 주의하시게. 재주와 재능이 좋은 인중이며 예능계열 쪽으로 좋은 하관을 갖고있구려. 전체적으로 긍정적인 성향으로 말년운이 무난한 얼굴일세.',
      '섬세하고 끈기와 의지력이 강한 관상',
    ],
    김옥빈: [
      '이마는 적당하며 당돌한 면이 있고 눈썹이 길고 진하여 재복이 좋소. 눈은 이성을 유혹하는 눈으로서 기가 강하며 연애운이 강하오. 이성을 꼬시는 재주가 좋고 자존심이 강한 입일세. 볼은 욕심이 많고 고집이 강하며 이기적인 면도 있지만 재복이 좋고 생활력이 강하며 인복이 좋소. 전체적으로 흠잡을 곳이 없는 완벽한 관상이지만 단점으로는 얼굴에서 나오는 기가 강하오.',
      '강한 기를 가지고 있는 관상',
    ],
    박해일: [
      '이마는 훤칠하고 깨끗하여 이성운이 좋고 두뇌가 좋소. 자아도취적인 경향도 강하며 의지력이 강하고 무엇이든지 집중하는 성격일세. 눈을 보면 이성운이 강하며 재물에 대한 집착이 강하오. 화려하고 동시에 깨끗하고 수려한 것을 추구하는 상일세. 낙천적이고 긍정적인 마인드를 볼 수 있는 입꼬리와 입이 미세하게 나와있어 말재주가 좋은 얼굴일세.',
      '이성운이 강한 관상',
    ],
    송중기: [
      '이마가 짱구 이마에 가까워 머리가 좋고 지혜롭소. 노력은 잘 안하는편이지만 머리는 뛰어난 재능충 유형일세. 코는 재복이 좋고 여복이 좋으며 연애운이 좋은 눈으로 보이오. 강인하며 직업운이 좋고 말년운이 깔끔하며 재능이 다재다능한 상일세. 원숭이상에 가까운 상이라 재능을 통해 화려한 인생을 살 수도 있겠소.',
      '머리가 뛰어난 천재형 관상',
    ],
    안소희: [
      '갈매기 상의 이마는 슬기롭고 지혜로운 여성을 말하오. 재벌가의 눈썹을 지녔고 부모복이 좋고 남편복이 좋소. 눈이 매혹적이고 화개살이 있는 눈이라 사람들에게 사랑받고 이성운이 강한 눈이나 출세하지 않으면 필요없는 남자들이 많이 붙을 수 있소. 이성을 많이 꼬시는 눈이고 예능기질이 강하며 성격이 온순하고 착하고 선한 성격일세.',
      '사회성 좋은 화개살 강한 관상',
    ],
    수지: [
      '남자가 꼬이고 남편때문에 마음고생할 수 있는 이마로 보이는구려. 성격이 남자다운면도 있고 서글서글하고 붙임성이 좋고 사회성이 좋소. 연애운도 좋고 눈썹이 가지런하여 여성스럽고 차분하오. 좋은 성격은 다 가지고 있다고 보시면 되오. 하지만 돌아서면 아주 냉담한 면도 있소. 얼굴이 개성이 강한 얼굴이라 사람 마음을 끌어당기는 면이 강하니 참고하시게.',
      '연애운이 좋을 관상',
    ],
    유승호: [
      '이마가 깨끗하고 시원하여 성격도 시원스럽고 사회성도 좋고 눈이 길상이라 재복도 좋고 마음씨가 선하고 감정이 풍부하오. 코를 보면 감각이 뛰어나고 재능이 많고 대인관계가 좋고 성격은 차분하면서도 약간 급한면이 있소. 입이 큰 편이라서 결단력이 좋고 시원스러운 성격이고 마음씨가 넓고 자상하다고 보시면 되니 좋은 것 다 가지고 있소.',
      '전체적으로 완벽한 관상',
    ],
    유아인: [
      '이마를 볼때 성격은 착하고 인정이 많소. 하지만 뺀질이 기질도 있고 남의 말을 잘 안 듣는 성향이 강하오. 눈은 다정하면서 차분하고 사색적이고 반항아기질이 있고 개성이 강하고 주관이 뚜렷한 눈이고 남과 다른 인생을 살려하고 평범한 인생을 싫어하는 눈일세. 턱은 강인한 편이라 재복이 좋고 말년운이 좋지만 예민한 면도 강하오.',
      '평범한 인생을 살지 않을 관상',
    ],
    김태희: [
      '귀가 당나귀 귀라서 재복이 좋고 인복이 좋은 상일세. 작고 예쁜 정면 두상은 높은 판단력을 지니고 있으며 머리 회전이 빠르고 똑똑하며 눈썹이 눈꼬리보다 길어서 재복이 아주 좋소. 이를 보아하니 두상에 비해 큰 편이라서 성격 또한 시원시원 할 것으로 보이오. ',
      '재복과 인복이 좋은 관상',
    ],
    문채원: [
      '눈썹이 재복이 좋은 눈썹이고 눈은 내조를 잘하는 눈일세. 입은 자기 속마음을 잘 말하지 않아 보이고 턱은 말년에 운이 좋아 나중에 행운을 기대해도 좋을 것 같소. 귀가 낭비벽이 심한 귀라 절제를 해야하오. 하나 문제라면 이마때문에 남편이 사고칠 수 있는 이마라오 그러니 심성이 착한 남편을 만나면 좋을 관상일세.',
      '남편을 잘만나야 현모양처인 관상',
    ],
    박보영: [
      '이마가 적당하면서 약간 특이한 것이 남편을 좌지우지 하는 이마로 보이오. 눈썹과 코는 재복이 아주 좋소. 또한 귀와 눈꼬리가 옆에 있기 때문에 현실주의자일세. 얼굴에 비해서 입이 약간 작은 것이 자기 속마음을 남에게 잘 말하지 않지만 남자와 달리 여자는 입이 작아도 괜찮소. 눈이 약간 부리부리하니 자기 주관대로 개성있는 가정을 꾸려나갈 눈일세.',
      '진심을 속마음에 담아두는 관상',
    ],
    소지섭: [
      '이마에 세로 주름이 하나 있어 대표적인 재벌 또는 ceo 관상일세. 눈이 붕어눈 / 고래눈이라 재물운이 아주 좋아 보이오. 귀는 잘 보이지 않아 고집이 쎄보이고 자기 마음을 아무에게도 말하지 않는 성격이니 참고하시게. 침묵을 잘하고 잔잔한 성격이며 어떤 경우에는 성질이 강할 때도 보이는구려. 노년운은 남들과 비슷하게 살아갈 관상일세. ',
      '과묵하고 줏대가 있는 관상',
    ],
    손예진: [
      '이마가 갈매기상이라 현모양처상이며 지혜롭소. 얼굴해 비해 코가 크지만 그에 비해 콧구멍은 보이지 않아 재물이 들어올 상이며 귀를 보아하니 출세를 해야 재복이 산더미처럼 들어올 귀일세. 턱도 갸름하니 성격이 좋아보이며 이마가 너무 훨칠하여 남편과 트러블이 발생할 수도 있지만 지혜롭기 때문에 모든지 지혜롭게 대쳐해 나갈 수 있는 관상으로 보이오. ',
      '머리가 좋고 지혜로운 관상',
    ],
    원빈: [
      '코와 귀가 아주 재복이 좋고 특히 귀는 재복에 완벽한 귀로 보이니 걱정마시게나. 낭비벽이 약간 있어 보이나 신경쓰지말게. 얼굴형은 미남형이라 연예인을 하면 적성에 맞을 것이며 이마가 사각형이라 사회성도 매우 좋소. 눈은 잘생김을 넘어서 이 세상의 아름다움을 담은 눈일세. 아름다운 눈은 정에 약한 눈으로 보이오. 눈이 들어간 형태라 판단력과 머리 회전이 빠르오. 하지만 약간 외로운 상이라 결혼은 만약 하고 싶다면 하고 싶을 때 언제든 하면 되오. 전체적으로 이보다 좋은 관상은 없을 정도로 좋아보이네.',
      '마음만 먹으면 뭐든 할 수 있는 관상',
    ],
    이광수: [
      '이마는 적당하면서 관운이 강하고 개인주의 성향이 있어 보이오. 눈썹은 길고 진하여 재복이 좋으면서 눈썹뼈와 코를 보아하니 정력이 아주 강하오. 정력이 좋은 만큼 눈을 보아하니 가정에 충실한 눈이라 할 수 있소. 성격이 급하지만 대인 관계는 평소에 잘 쌓지만 말상이라 직업운이 강하며 욕심이 많은 상으로 보이오. 귀는 성공과 출세가 가능한 귀로 보이며 인복도 물론 좋은 귀일세. 전체적으로 흡잡을데 없는 좋은 관상으로 보이오. ',
      '누구보다 정력이 좋은 관상',
    ],
    이승기: [
      '말상이라 직업운이 아주 강하오. 이마가 사각형이라 사회성도 강하고 가정보다는 일을 중요하게 생각하는 성격으로 보이는구려. 코를 보아하니 강하고 활력이 있어 사업을 하면 아주 좋은 관상일세. 귀가 커서 인복이 좋고 기분파에 속하고 의리가 아주 강한 얼굴일세. 귀밑 턱이 갸름하여 인생에 굴곡이 없어 보이고 입이 큰편이라 시원한 성격이며 낙천적인 성격이라 할 수 있겠소. ',
      '인생에 굴곡이 없을 관상',
    ],
    크리스탈: [
      '이마가 넓고 둥근형이라 이혼수가 살짝 있소. 하지만 남편을 제외한 다른 사람하고는 항상 좋은 관계를 유지할 상일세. 눈썹은 자상하며 눈은 자존심이 강한 눈이며 코는 재복이 있는 코일세. 입은 가늘다보니 속마음을 잘 말하지 않을 것 같소. 귀 또한 정면에서 잘 안보이는 귀라 속마음을 알 수 없어 보여 겉으로는 모든 사람들에게 잘해주어 전체적으로 사회성도 좋고 붙입성도 좋은 대인관계가 아주 좋은 관상일세. ',
      '대인관계 마스터 관상',
    ],
    손나은: [
      '이미가 적당한 크기라 잔머리가 잘 돌아가고 눈치가 빠른 이마일세. 눈썹은 길고 가지런하며 여성스러운 눈썹이고 눈은 얌체기질이 있지만 이성운은 아주 강해 보이니 좋으면서 조심해야하오. 코가 짧고 콧구멍이 잘 보이니 애교가 많은 편이며 씀씀이도 강하오. 하지만 남편복이 약한 코로 보이는구려. 코를 통해 쓸데없는 남자들이 붙을 것을 알 수 있을 것 같소. 인중은 짧은 편이라 대인 관계가 원활하지만 이런 인중은 자기와 비슷한 부류의 사람들과 친해지려 한다네. 전체적으로 이성운이 강한 관상이지만 배우자를 만날 때 심사숙고해야함을 명심하.',
      '쓸데없이 남자들이 꼬이는 관상',
    ],
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

  let result = document.createElement('div')
  result.classList.add('main_result_description')
  result.innerHTML = `${description[answer][1]}`
  labelContainer.appendChild(result)

  let result2 = document.createElement('div')
  result2.classList.add('celebrity')
  result2.innerHTML = `같은 관상을 가진 연예인 : ${answer}`
  labelContainer.appendChild(result2)

  let desc = document.createElement('p')
  desc.classList.add('main__result__content__p')
  desc.classList.add('none')
  desc.innerHTML = `${description[answer][0]}`
  labelContainer.appendChild(desc)

  const faceResultChat = document.querySelector(`.main__result__content__p`)
  console.log(faceResultChat)

  function getResultGtag() {
    gtag('event', `관상 한 번 더 결과`, {
      result: `${answer}`,
    })
  }
  getResultGtag()

  let reset = document.createElement('button')
  reset.innerHTML = `
  <span>다른 사진 해보기</span>`

  reset.classList.add('reset__btn')
  reset.onclick = function () {
    gtag('event', '한번 더 클릭')
  }
  labelContainer.appendChild(reset)

  reset.addEventListener('click', handleReset)

  function handleReset() {
    location.reload(true)
    location.href = location.href
    history.go(0)
  }
}

const chatInit = () => {
  let userMessages = []
  let assistantMessages = []

  let yangbanProfileName = '관상가 양반'
  let yangbanProfileImage = 'https://i.ibb.co/s1r45Xv/yangbanppp.png'
  let backendApi = 'faceTell'
  let chatEx = '2023년 하반기 운세를 알려줘'

  const headerChatTitle = document.querySelector(`.header_chat_title`)
  headerChatTitle.innerHTML = yangbanProfileName

  const chatBtnIcon = document.querySelector(`.main_chat_input_btn_icon`)
  const chatInput = document.querySelector(`.main_chat_input_text`)
  const changeBtnColor = () => {
    if (chatInput.value !== '') {
      chatBtnIcon.style.color = '#ffd620'
    } else {
      chatBtnIcon.style.color = '#aaaaaa'
    }
  }

  const loadingHtml = ` <div class="container_yangban_chat_left">
  <div class="container_yangban_profile">
    <img
      src=${yangbanProfileImage}
      alt=${yangbanProfileName}
      class="yangban_profile_img"
    />
  </div>
</div>
<div class="container_yangban_chat_right">
  <div class="container_yangban_name">${yangbanProfileName}</div>
  <div class="container_yangban_chat">
    <div class="message-loading">
      <div class="led led-one"></div>
      <div class="led led-two"></div>
      <div class="led led-three"></div>
    </div>
  </div>
</div>`

  setInterval(changeBtnColor, 200)

  const chatInputBtn = document.querySelector(`.main_chat_input_btn`)
  const chatInputExBtn = document.querySelector(`.main_chat_input_example`)

  const chatInputBtnFunction = async () => {
    if (chatInput.value !== '') {
      const faceResultChat = document.querySelector(`.main__result__content__p`)
      const faceResult = faceResultChat.innerHTML

      const chatContainer = document.querySelector(`.main_chat_container`)
      const message = document.createElement('div')
      message.classList.add('container_user_chat_wrap')
      message.innerHTML = `<div class="container_user_chat">${chatInput.value}</div>`
      chatContainer.appendChild(message)

      const botMessage = document.createElement('div')
      botMessage.classList.add('container_yangban_chat_wrap')
      botMessage.innerHTML = loadingHtml
      chatContainer.appendChild(botMessage)

      userMessages.push(chatInput.value)
      const chatInpiutValueGtag = () => {
        gtag('event', `${yangbanProfileName} 채팅 내용: ${chatInput.value}`)
      }
      chatInpiutValueGtag()

      chatInput.value = ''

      const response = await fetch(
        `https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/` +
          `${backendApi}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            faceResult: faceResult,
            userMessages: userMessages,
            assistantMessages: assistantMessages,
          }),
        },
      )

      const data = await response.json()
      assistantMessages.push(data.assistant)

      botMessage.innerHTML = `<div class="container_yangban_chat_left">
      <div class="container_yangban_profile">
        <img
          src=${yangbanProfileImage}
          alt=${yangbanProfileName}
          class="yangban_profile_img"
        />
      </div>
    </div>
    <div class="container_yangban_chat_right">
      <div class="container_yangban_name">${yangbanProfileName}</div>
      <div class="container_yangban_chat">${data.assistant}</div>
      <div class="container_yangban_chat">
      저와 대화는 어떠셨나요? 더욱 좋은 행운을 담아드리기 위해 작은 정성과 함께 응원해주시면 진심으로 감사드립니다! 
      <a
        style="text-decoration: none; color: black; width: 100%;"
        href="https://qr.kakaopay.com/Ej9MgSCp09c405209"
        target='_blank'
        onclick="gtag('event', '복채 - ${yangbanProfileName}')"
      >
        <button
          style="
            background-color: #ffd620;
            width: 100%;
            font-weight: 700;
            font-size: 16px;
            padding: 10px 0px;
            border-radius: 10px;
            margin-top: 10px;
          "
        >
        ${yangbanProfileName} 응원하기 [커피 한 잔]
        </button>
      </a>
    </div>
    </div>`
    }
  }

  const chatInputExBtnFunction = () => {
    chatInput.value = chatEx
    chatInputBtnFunction()
  }

  chatInputExBtn.innerHTML = chatEx
  chatInputExBtn.addEventListener('click', chatInputExBtnFunction)
  chatInputBtn.addEventListener('click', chatInputBtnFunction)
}

// chatInit()
