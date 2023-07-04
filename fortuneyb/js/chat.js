const chatInit = () => {
  let userMessages = []
  let assistantMessages = []

  let yangbanProfileName = '역술가 양반'
  let yangbanProfileImage =
    'https://i.ibb.co/VMNVgRy/3607184628-A-bearded-Joseon-Dynasty-man-with-a-solemn-express-xl-beta-v2-2-2.png'
  let backendApi = 'fortuneTell2'
  let chatEx = '2023년 하반기 운세'

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

chatInit()
