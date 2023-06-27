const chatInit = () => {
  let userMessages = []
  let assistantMessages = []

  let yangbanProfileName = '관상가 양반'
  let yangbanProfileImage = 'https://i.ibb.co/s1r45Xv/yangbanppp.png'
  let backendApi = 'faceTell'
  let chatEx = '재물운은 어때 보여?'

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
      <div class="container_yangban_chat">저와 대화는 어떠셨나요? 힘이 되셨나요🙂 양반들은 모두 무료로 운영되고 있어요. 응원을 위해 작은 정성 베풀어주시면 더욱 좋은 행운이 따라올 겁니다! => <a href="https://qr.kakaopay.com/Ej9MgSCp09c405780" onclick="gtag('event', '관상-복채')" >눌러서 응원하기</a></div>
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

chatInit()
