async function analyzeFaceImage(file) {
    const formData = new FormData();
    formData.append("file", file);
  
    const resultContainer = document.getElementById("label-container");
  
    try {
      const response = await fetch("https://port-0-momzzi-fastapi-m7ynssht4601229b.sel4.cloudtype.app/analyze/", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("서버 응답 오류");
      }
  
      const data = await response.json();
      const imageTitleWrap = document.querySelector(`.ai`);
      imageTitleWrap.classList.add("disblock");   
  
      const noStore = document.querySelector(`.nostore`);
      noStore.classList.add("none");
  
      const { features, report } = data;
  
      // ✅ 마크다운을 HTML로 렌더링하여 삽입
      resultContainer.innerHTML = `
        <div class="face-result">
          ${marked.parse(report)}
        </div>
      `;
    } catch (error) {
      console.error("관상 분석 실패:", error);
      resultContainer.innerHTML =
        "<p style='color: red;'>분석 중 오류가 발생했습니다. 다시 시도해주세요.</p>";
    }
  
    mixpanel.track("GEMINI 관상 결과", {
      filename: file.name,
      timestamp: new Date().toISOString(),
    });
  }
  
  // fileupload.js의 readURL 함수에서 이 함수 연결 필요
  function readURL(input) {
    if (input.files && input.files[0]) {
      const reader = new FileReader();
  
      reader.onload = function (e) {
        document.getElementById("face-image").src = e.target.result;
        document.querySelector(".file-upload-content").style.display = "block";
        document.querySelector(".image-upload-wrap").style.display = "none";
      };


      mixpanel.track("관상 사진 업로드", {
        filename: input.files[0].name,
        timestamp: new Date().toISOString(),
      });
  
      reader.readAsDataURL(input.files[0]);
  
      // 👇 실제 서버로 업로드 및 분석 요청
      analyzeFaceImage(input.files[0]);
    }
  }
  