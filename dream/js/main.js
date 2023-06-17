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

const getGPTTell = async (text) => {
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

const start = async () => {
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

  userMessages.push(`${dreamContent}`)

  const dreamResultGtag = () => {
    gtag('event', '해몽꿈 Content', {
      dream_content: `${dreamContent}`,
    })
  }
  dreamResultGtag()

  const totalDreamTeller = await getGPTTell(userMessages)
  assistantMessages.push(totalDreamTeller.assistant)

  // const dataSummaryMessages = [`너무 길어. 많이 짧게 단어들로 알려줘`]

  userMessages.push(
    `너무 길어. 꿈 내용은 제외하고 꿈 풀이만 30글자 이하의 한 줄로 요약해줘`,
  )
  const summaryDreamTeller = await getGPTTell(userMessages)

  document.querySelector('.dream_result_wrap').style.display = 'block'

  spinnerDisappear('loader')

  // 결과 생성
  const resultTotal = document.querySelector('.dream_result_total')
  resultTotal.innerHTML = `
  <div class="dream_result_upper">
              <div class="dream_result_summary">
              ${summaryDreamTeller.assistant}
              </div>
              <div class="dream_result_date">- 해몽가 양반 -</div>
            </div>
            <div class="dream_result_middle">
              <div class="dream_result_category">
                나의 꿈
              </div>
              <div class="dream_result_mydream">
                ${dreamContent}
              </div>
            </div>
            <div class="dream_result_lower">
              <div class="dream_result_category">
                해몽가 양반의 꿈 풀이
              </div>
              <div class="dream_result_total">
              ${totalDreamTeller.assistant}
              </div>
            </div>
            <a href="/dream" class="dream_result_bottom" onclick="gtag('event', '해몽 한번 더')">
              다른 꿈 내용도 해몽 물어보기
            </a>
  `
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

const dreamUserChangeBtn = document.querySelector(`.dream_user_change`)

function handleFortuneReset() {
  location.reload(true)
  location.href = location.href
  history.go(0)
}

const initFortuneMain = () => {
  spinnerHTML()
}

initFortuneMain()
