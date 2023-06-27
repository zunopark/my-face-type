const chatInit = () => {
  let userMessages = []
  let assistantMessages = []

  let yangbanProfileName = '해몽 아씨'
  let yangbanProfileImage = 'https://i.ibb.co/TtqTTk4/jinju-dream.png'
  let backendApi = 'dreamTell'
  let chatEx = '해몽을 해줄 수 있어?'

  const headerChatTitle = document.querySelector(`.header_chat_title`)
  const initYangbanName = document.querySelector(`#init_yangban_chat_profile`)
  const initYangbanName2 = document.querySelector(`.container_yangban_chat`)
  const initYangbanImge = document.querySelector(`.yangban_profile_img`)
  headerChatTitle.innerHTML = yangbanProfileName
  initYangbanName.innerHTML = yangbanProfileName
  initYangbanName2.innerHTML = `안녕하세요, 저는 ${yangbanProfileName}입니다.`
  initYangbanImge.src = yangbanProfileImage

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
