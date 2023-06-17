const fortune_user_info = document.querySelector(`.fortune_user_info`)
const loaderWrap = document.querySelectorAll(`.loader`)

let userMessages = []
let assistantMessages = []
let myDateTime = ''
let userInfo = {}

const spinnerHTML = () => {
  loaderWrap.forEach(function (content) {
    content.innerHTML = `<div class="loader_wrap"><i class="fa fa-spinner fa-spin"></i><div class="spinner_comment">운세를 분석중입니다.</div></div>`
  })
}

const spinnerAppear = (idName) => {
  document.getElementById(idName).style.display = 'block'
}

const spinnerDisappear = (idName) => {
  document.getElementById(idName).style.display = 'none'
}

const start = async () => {
  const resultTotal = document.querySelector('.fortune_result_total')
  const bottomAdFile = document.querySelector(`.bottom_ad`)

  const name = document.querySelector(`.fortune_name`).value
  const relationship = document.querySelector(`.fortune_relationship`).value
  const gender = document.querySelector(`.fortune_gender`).value
  const dateType = document.querySelector(`.fortune_birth_type`).value
  const date = document.querySelector('.fortune_date').value
  const time = document.querySelector('.fortune_time').value

  if (name === '') {
    alert('이름을 입력해주세요.')
    return
  }

  myDateTime = date + time

  userInfo = {
    name,
    relationship,
    gender,
    dateType,
    date,
    time,
  }

  document.querySelector(`.fortune_user_name`).innerHTML = userInfo.name
  document.querySelector(`.fortune_user_relationship`).innerHTML =
    userInfo.relationship
  document.querySelector(`.fortune_user_gender`).innerHTML = userInfo.gender
  document.querySelector(
    `.fortune_user_birth_type`,
  ).innerHTML = `(${userInfo.dateType})`
  document.querySelector('.fortune_user_date').innerHTML = userInfo.date
  document.querySelector('.fortune_user_time').innerHTML = `${
    userInfo.time === '' ? '태어난 시간 모름' : userInfo.time
  }`

  localStorage.setItem('UserInfo', JSON.stringify(userInfo))

  spinnerAppear('loader')
  document.querySelector(`.fortune_start_btn_wrap`).style.display = 'none'

  userMessages.push('나의 오늘의 운세를 알려줘!')

  const fortuneResultGtag = () => {
    gtag('event', '오늘의 운세 User', {
      event_result: `오늘의 운세 User 이름: ${name}, 관계: ${relationship}, 성별: ${gender}, 생일타입: ${dateType}, 생일: ${date}, 태어난시간: ${time}`,
    })
  }

  fortuneResultGtag()

  const response = await fetch(
    'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/fortuneTell',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userInfo: userInfo,
        myDateTime: myDateTime,
        userMessages: userMessages,
        assistantMessages: assistantMessages,
      }),
    },
  )

  const data = await response.json()

  document.getElementById('intro').style.display = 'none'
  document.querySelector('.fortune_user_info_wrap').style.display = 'block'
  document.querySelector('.fortune_result_wrap').style.display = 'block'

  spinnerDisappear('loader')

  //assistantMessage 메세지 추가
  assistantMessages.push(data.assistant)
  bottomAdFile.classList.remove('hidden')

  const astrologerMessage = document.createElement('div')
  astrologerMessage.classList.add('fortune_result_content')
  astrologerMessage.innerHTML = `${data.assistant}`
  resultTotal.appendChild(astrologerMessage)
}

const result = async (type) => {
  const resultContentWrap = document.querySelector(
    `.fortune_result_` + `${type}`,
  )
  let userMessageContent = ''

  spinnerAppear(`loader_` + `${type}`)
  document.querySelector('.result_' + `${type}` + '_btn').style.display = 'none'

  if (type === 'love') {
    userMessageContent = '오늘 나의 애정운을 알려줘'
  } else if (type === 'wealth') {
    userMessageContent = '오늘 나의 재물운을 알려줘'
  } else if (type === 'health') {
    userMessageContent = '오늘 나의 건강운을 알려줘'
  } else if (type === 'business') {
    userMessageContent = '오늘 나의 사업운을 알려줘'
  } else if (type === 'study') {
    userMessageContent = '오늘 나의 학업운을 알려줘'
  }

  userMessages.push(userMessageContent)

  const response = await fetch(
    'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/fortuneTell',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        myDateTime: myDateTime,
        userInfo: userInfo,
        userMessages: userMessages,
        assistantMessages: assistantMessages,
      }),
    },
  )

  const data = await response.json()

  spinnerDisappear(`loader_` + `${type}`)

  //assistantMessage 메세지 추가
  assistantMessages.push(data.assistant)

  const astrologerMessage = document.createElement('div')
  astrologerMessage.classList.add('fortune_result_content')
  astrologerMessage.innerHTML = `${data.assistant}`
  resultContentWrap.appendChild(astrologerMessage)
}

const sendMessage = async () => {
  const chatInput = document.querySelector('.chat-input input')
  const chatMessage = document.createElement('div')
  chatMessage.classList.add('chat-message')
  chatMessage.innerHTML = `
  <p>${chatInput.value}</p>
`
  chatBox.appendChild(chatMessage)

  //userMessage 메세지 추가
  userMessages.push(chatInput.value)

  chatInput.value = ''
  spinnerAppear('loader')

  const response = await fetch(
    'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/fortuneTell',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        myDateTime: myDateTime,
        userInfo: userInfo,
        userMessages: userMessages,
        assistantMessages: assistantMessages,
      }),
    },
  )

  const data = await response.json()
  spinnerDisappear('loader')

  //assistantMessage 메세지 추가
  assistantMessages.push(data.assistant)

  const astrologerMessage = document.createElement('div')
  astrologerMessage.classList.add('chat-message')
  astrologerMessage.innerHTML = `<p class='assistant'>${data.assistant}</p>`
  chatBox.appendChild(astrologerMessage)
}

const fortuneUserData = () => {
  const userData = localStorage.getItem('UserInfo')
  let user = JSON.parse(userData)

  if (user != null) {
    document.querySelector(`.fortune_name`).value = user.name
    document.querySelector(`.fortune_relationship`).value = user.relationship
    document.querySelector(`.fortune_gender`).value = user.gender
    document.querySelector(`.fortune_birth_type`).value = user.dateType
    document.querySelector('.fortune_date').value = user.date
    document.querySelector('.fortune_time').value = user.time
  }
}

const fortuneUserChangeBtn = document.querySelector(`.fortune_user_change`)

fortuneUserChangeBtn.addEventListener('click', handleFortuneReset)

function handleFortuneReset() {
  localStorage.removeItem('UserInfo')
  location.reload(true)
  location.href = location.href
  history.go(0)
}

const initFortuneMain = () => {
  spinnerHTML()
  fortuneUserData()

  // document
  //   .querySelector('.chat-input button')
  //   .addEventListener('click', sendMessage)
}

initFortuneMain()
