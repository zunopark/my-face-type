
      let featureDb = null;

      function initFeatureDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open("FaceFeatureDB", 1);
          request.onsuccess = (event) => {
            featureDb = event.target.result;
            resolve();
          };
          request.onerror = reject;
        });
      }

      function getIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("id");
      }

      function getFeatureById(id) {
        return new Promise((resolve, reject) => {
          const tx = featureDb.transaction(["features"], "readonly");
          const store = tx.objectStore("features");
          const request = store.get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = reject;
        });
      }

      // 🔵 사진 영역 렌더링
      function renderImage(imageBase64) {
        document.querySelector(".file-upload-image").src = imageBase64;
        document.querySelector(".file-upload-content").style.display = "block";
        document.querySelector(".image-upload-wrap").style.display = "none";
      }

      // 🔵 상품 카드 렌더링
      function renderFeatureResult(data) {
        const products = [
          {
            key: "base",
            emoji: "🐍",
            title:
              "처음 보는 내 관상, 이렇게까지 자세히? 궁금해요? 궁금하면 500원",
            desc: "3,000+자 리포트",
            rating: 4.9,
            views: "4,500+",
            discount: 90,
            price: "500원",
            original_price: 4900,
          },
          {
            key: "marriage",
            emoji: "💍",
            title: "[매우 중요] 언제, 누구와 결혼할지 얼굴에 다 나와 있다면?",
            desc: "8,000+자 리포트",
            rating: 4.8,
            views: "2,300+",
            discount: 42,
            price: "9,900원",
            original_price: 16900,
          },
          {
            key: "wealth",
            emoji: "💸",
            title: "타고난 부: 내 관상 재물운과 평생 모을 재산은?",
            desc: "10,000+자 리포트",
            rating: 4.9,
            views: "10,000+",
            discount: 23,
            price: "16,900원",
            original_price: 21900,
          },
          {
            key: "job",
            emoji: "💼",
            title:
              "관상으로 보는 직업: 사실 난 이런 직업을 가졌어야 했다면...?",
            desc: "6,000+자 리포트",
            rating: 4.7,
            views: "1,900+",
            discount: 45,
            price: "4,900원",
            original_price: 8900,
          },
          {
            key: "love",
            emoji: "💖",
            title: "연애 관상: 나는 어떤 사람을 만나야 할까?",
            desc: "6,000+자 리포트",
            rating: 4.9,
            views: "2,800+",
            discount: 31,
            price: "6,900원",
            original_price: 9900,
          },
        ];

        const productCards = products
          .map(
            (product) => `
            <div class="product-card" onclick="location.href='/report/${
              product.key
            }'" style="cursor: pointer;">
              <div class="product-image">
                <img src="/img/${product.key}.png" alt="${
              product.key
            }" class="square-image" />
              </div>
              <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-meta">
                  <div class="product-stats">총 ${product.desc}</div>
                  <div class="product-meta-price">
                    <div class="product-original-price">${product.original_price.toLocaleString()}원</div>
                    <div class="discount">${product.discount}%</div>
                    <div class="product-price">${product.price}</div>
                  </div>
                </div>
              </div>
            </div>
          `
          )
          .join("");

        document.getElementById("label-container").innerHTML = `
            <div class="ai-expect-title">
              <h3 style="font-size:22px;font-weight:700;">관상 분석이 완료됐습니다!</h3>
              <div class="ai-expect-sub" style="margin-bottom: 12px;">아래 항목에서 궁금한 분석을 선택해보세요.</div>
            </div>
            <div class="face-product-section">${productCards}</div>
          `;
      }

      // 🔵 실행 흐름
      window.onload = async () => {
        await initFeatureDB();
        const id = getIdFromUrl();
        const result = await getFeatureById(id);
        if (!result) {
          document.getElementById(
            "label-container"
          ).innerHTML = `<p style="color:red;">분석 결과를 찾을 수 없습니다.</p>`;
          return;
        }

        renderImage(result.imageBase64); // 상단 사진
        renderFeatureResult(result); // 하단 리포트 카드들
      };
