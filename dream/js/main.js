const fortune_user_info = document.querySelector(`.fortune_user_info`)
const loaderWrap = document.querySelectorAll(`.loader`)

let userMessages = []
let assistantMessages = []
let myDateTime = ''

const spinnerHTML = () => {
  loaderWrap.forEach(function (content) {
    // content.innerHTML = ``
  })
}

const spinnerAppear = (idName) => {
  document.getElementById(idName).style.display = 'block'
}

const spinnerDisappear = (idName) => {
  document.getElementById(idName).style.display = 'none'
}

const getDreamTell = async (text) => {
  const response = await fetch(
    'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/dreamTell',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessages: text,
        assistantMessages: assistantMessages,
      }),
    },
  )

  const data = await response.json()
  return data
}

const getDreamSummary = async (text) => {
  const response2 = await fetch(
    'https://sa394esbff.execute-api.ap-northeast-2.amazonaws.com/default/dreamTellSummary',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userMessages: text,
        assistantMessages: assistantMessages,
      }),
    },
  )

  const data2 = await response2.json()
  return data2
}

const start = async () => {
  const resultTotal = document.querySelector('.fortune_result_total')
  const dreamContent = document.querySelector(`.dream_main`).value

  if (dreamContent === '') {
    alert('꿈 내용을 입력해주세요.')
    return
  }

  // display: none
  spinnerAppear('loader')
  document.querySelector(`.dream_start_btn_wrap`).style.display = 'none'
  document.getElementById('intro').style.display = 'none'
  document.querySelector(`.main_ai_title_wrap`).style.display = 'none'

  userMessages.push(`내가 꾼 꿈은 ${dreamContent} 이런 내용인데 꿈 풀이좀 해줘`)

  const dreamResultGtag = () => {
    gtag('event', '해몽꿈 Content', {
      event_category: '해몽꿈 Content',
      event_label: `해몽 꿈 작성 내용: ${dreamContent}`,
    })
  }
  dreamResultGtag()

  const totalDreamTeller = await getDreamTell(userMessages)
  console.log(totalDreamTeller)
  const dataSummaryMessages = `${totalDreamTeller.assistant} 라는 꿈을 꿨는데 30자 이하의 완성된 문장으로 요약해줘`
  const summaryDreamTeller = await getDreamSummary(dataSummaryMessages)

  document.querySelector('.fortune_result_wrap').style.display = 'block'

  spinnerDisappear('loader')

  //assistantMessage 메세지 추가
  assistantMessages.push(data.assistant)

  const astrologerMessage = document.createElement('div')
  astrologerMessage.classList.add('fortune_result_content')
  astrologerMessage.innerHTML = `${dreamContent} // ${totalDreamTeller.assistant} //${summaryDreamTeller.assistant}`
  resultTotal.appendChild(astrologerMessage)
}

// const result = async (type) => {
//   userMessages.push(userMessageContent)

//   const response = await fetch(
//     'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/dreamTell',
//     {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         myDateTime: myDateTime,
//         userInfo: userInfo,
//         userMessages: userMessages,
//         assistantMessages: assistantMessages,
//       }),
//     },
//   )

//   const data = await response.json()

//   spinnerDisappear(`loader_` + `${type}`)

//   //assistantMessage 메세지 추가
//   assistantMessages.push(data.assistant)

//   const astrologerMessage = document.createElement('div')
//   astrologerMessage.classList.add('fortune_result_content')
//   astrologerMessage.innerHTML = `${data.assistant}`
//   resultContentWrap.appendChild(astrologerMessage)
// }

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
    'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/dreamTell',
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

const fortuneUserChangeBtn = document.querySelector(`.fortune_user_change`)

function handleFortuneReset() {
  location.reload(true)
  location.href = location.href
  history.go(0)
}

const initFortuneMain = () => {
  spinnerHTML()
}

initFortuneMain()
