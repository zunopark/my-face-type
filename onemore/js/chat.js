const chatInit = () => {
  let userMessages = []
  let assistantMessages = []

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
      src="https://i.ibb.co/s1r45Xv/yangbanppp.png"
      alt=""
      class="yangban_profile_img"
    />
  </div>
</div>
<div class="container_yangban_chat_right">
  <div class="container_yangban_name">관상가 양반</div>
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
        gtag('event', `채팅 내용: ${chatInput.value}`)
      }
      chatInpiutValueGtag()

      chatInput.value = ''

      const response = await fetch(
        'https://fkfucds3e9.execute-api.ap-northeast-2.amazonaws.com/prod/faceTell',
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
          src="https://i.ibb.co/s1r45Xv/yangbanppp.png"
          alt=""
          class="yangban_profile_img"
        />
      </div>
    </div>
    <div class="container_yangban_chat_right">
      <div class="container_yangban_name">관상가 양반</div>
      <div class="container_yangban_chat">${data.assistant}</div>
    </div>`
    }
  }

  chatInputBtn.addEventListener('click', chatInputBtnFunction)
}

chatInit()

// const messages = document.querySelector('.messages')
// const input = document.getElementById('user-input')
// const button = document.getElementById('send-btn')
// const loading = document.getElementById('loading')
// let chatCnt = 0
// let birthDatetime
// let userMessage = []
// let botMessage = []

// function start() {
//   const date = document.getElementById('date').value
//   if (date == '') {
//     alert('생년월일을 입력해주세요!')
//     return
//   }
//   let hour = document.getElementById('hour').value
//   if (hour == '') {
//     hour = '00'
//   }
//   birthDatetime = date + ' ' + hour + ':00'

//   document.getElementById('intro-question').style.display = 'none'
//   document.getElementById('chat').style.display = 'block'
//   document.getElementById('intro-message').innerHTML = '"오.. 미래가 보인다..!"'
//   loadingOn()
//   input.value = '오늘 나의 운세는 어때?'
//   send()
// }

// function appendMessage(text, sender) {
//   const message = document.createElement('div')
//   message.classList.add('message')
//   message.classList.add(sender.toLowerCase())
//   message.innerText = text
//   if (sender == 'bot' && chatCnt > 2) {
//     const link = document.createElement('a')
//     link.href = 'https://toss.me/jocoding'
//     link.innerText = '복채 보내기'
//     message.innerText +=
//       '\n 추가로 링크를 눌러 작은 정성 배풀어주시면 더욱 좋은 운이 있으실겁니다. => '
//     message.appendChild(link)
//   }
//   messages.appendChild(message)
//   messages.scrollTop = messages.scrollHeight

//   if (chatCnt != 0) {
//     if (sender == 'me') {
//       userMessage.push(text)
//     } else if (sender == 'bot') {
//       botMessage.push(text)
//     }
//   }
//   chatCnt++
// }

// function loadingOn() {
//   loading.style.display = 'block'
//   button.disabled = true
// }

// function loadingOff() {
//   loading.style.display = 'none'
//   button.disabled = false
// }

// function sleep(sec) {
//   return new Promise((resolve) => setTimeout(resolve, sec * 1000))
// }
