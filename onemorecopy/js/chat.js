const chatInit = () => {
  const chatBtnIcon = document.querySelector(`.main_chat_input_btn_icon`)
  const chatInput = document.querySelector(`.main_chat_input_text`)
  const changeBtnColor = () => {
    if (chatInput.value !== '') {
      chatBtnIcon.style.color = '#ffd620'
    } else {
      chatBtnIcon.style.color = '#aaaaaa'
    }
  }

  setInterval(changeBtnColor, 200)
}

chatInit()
