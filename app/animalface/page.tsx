"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  trackPageView,
  trackPhotoUpload,
  trackAnalysisComplete,
  trackRetry,
} from "@/lib/mixpanel";
import Footer from "@/components/layout/Footer";

// 동물상 설명 데이터
const ANIMAL_DESCRIPTIONS = {
  male: {
    dog: {
      title: "다정다감 애교쟁이 강아지상",
      description: "당신은 다정하고 귀여운 성격으로 모두에게 즐거움을 선사하는 호감형입니다. 친절하고 활발하며, 풍부한 애교와 웃음으로 어디서나 인기가 많습니다. 연인에게는 특히 사랑스럽게 다가가며, 관심이 떨어지면 강아지처럼 외로워하는 특징이 있습니다.",
      celebrities: "강아지상 연예인: 송중기, 박보검, 천정명",
    },
    cat: {
      title: "설렘가득 츤데레 고양이상",
      description: "당신은 무뚝뚝하고 차가워 보이는 첫인상과는 달리, 묘한 매력을 발산하여 항상 인기가 많습니다. 높은 자존심을 가지고 있지만, 실제로는 관심을 받는 것을 좋아하며, 연인에게는 은근히 애교를 부립니다.",
      celebrities: "고양이상 연예인: 강동원, 김수현, 이종석",
    },
    rabbit: {
      title: "사랑스러운 상큼 토끼상",
      description: "당신은 천진난만하고 귀여운 성격으로, 그저 존재만으로도 주변에 행복을 전파하는 사람입니다. 호기심 많고 활발한 성격으로, 그 귀여운 외모는 연인의 보호본능을 자극합니다.",
      celebrities: "토끼상 연예인: 정국(BTS), 바비, 수호(엑소)",
    },
    dinosaur: {
      title: "따뜻한 카리스마 공룡상",
      description: "당신은 무심한 성격과 첫 인상은 나쁜 남자 같지만, 알고 보면 따뜻함이 묻어나는 카리스마 있는 남자입니다. 시크한 매력 때문에 사람들이 쉽게 다가가지는 못하지만, 한 번 깊게 알게 되면 그 끝없는 터프한 매력에 헤어나올 수 없게 됩니다.",
      celebrities: "공룡상 연예인: 공유, 김우빈, 이민기",
    },
    bear: {
      title: "포근한 매력의 곰상",
      description: "당신은 처음에는 무서워 보이지만 사실은 귀여운 매력을 가진 사람입니다. 세심하고 꼼꼼한 성격을 가지고 있으며, 연인에게는 헌신적으로 돌봐주는 듬직한 존재입니다.",
      celebrities: "곰상 연예인: 마동석, 조진웅, 박성웅",
    },
  },
  female: {
    dog: {
      title: "다정다감 애교쟁이 강아지상",
      description: "당신은 다정하고 귀여운 성격으로 모두에게 즐거움을 선사하는 호감형입니다. 친절하고 활발하며, 풍부한 애교와 웃음으로 어디서나 인기가 많습니다. 연인에게는 특히 사랑스럽게 다가가며, 관심이 떨어지면 강아지처럼 외로워하는 특징이 있습니다.",
      celebrities: "강아지상 연예인: 박보영, 수지, 박하선",
    },
    cat: {
      title: "설렘가득 츤데레 고양이상",
      description: "당신은 무뚝뚝하고 차가워 보이는 첫인상과는 달리, 묘한 매력을 발산하여 항상 인기가 많습니다. 높은 자존심을 가지고 있지만, 실제로는 관심을 받는 것을 좋아하며, 연인에게는 은근히 애교를 부립니다.",
      celebrities: "고양이상 연예인: 한예슬, 한채영, 경리",
    },
    rabbit: {
      title: "사랑스러운 상큼 토끼상",
      description: "당신은 천진난만하고 귀여운 성격으로, 그저 존재만으로도 주변에 행복을 전파하는 사람입니다. 호기심 많고 활발한 성격으로, 그 귀여운 외모는 연인의 보호본능을 자극합니다.",
      celebrities: "토끼상 연예인: 정유미, 문채원, 나연(트와이스)",
    },
    deer: {
      title: "온순하고 우아한 사슴상",
      description: "당신은 맑고 영롱한 분위기를 가진, 사슴처럼 차분한 성격의 사람입니다. 깜짝 놀라게 하는 눈망울은 당신의 트레이드마크이며, 그 따스하고 온순한 눈빛은 사랑스러움을 풍깁니다.",
      celebrities: "사슴상 연예인: 서현진, 아이린, 태연",
    },
    fox: {
      title: "섹시한 밀당고수 여우상",
      description: "당신은 사람들을 사로잡는 섹시한 매력과 우아한 외모, 뛰어난 센스를 가진 인물입니다. 어디에서나 주목 받으며, 사교적인 성격으로 연인에게도 적극적으로 애정을 표현합니다.",
      celebrities: "여우상 연예인: 김연아, 제니, 오연서",
    },
  },
};

const ANIMAL_NAMES: Record<string, string> = {
  dog: "강아지",
  cat: "고양이",
  rabbit: "토끼",
  dinosaur: "공룡",
  bear: "곰",
  deer: "사슴",
  fox: "여우",
};

// TeachableMachine 모델 URL
const MODEL_URL_MALE = "https://teachablemachine.withgoogle.com/models/o9D1N5TN/";
const MODEL_URL_FEMALE = "https://teachablemachine.withgoogle.com/models/bB3YHn5r/";

interface PredictionResult {
  key: string;
  value: number;
}

declare global {
  interface Window {
    tmImage: {
      load: (modelURL: string, metadataURL: string) => Promise<{
        getTotalClasses: () => number;
        predict: (image: HTMLImageElement, flip?: boolean) => Promise<Array<{ className: string; probability: number }>>;
      }>;
    };
  }
}

export default function AnimalFacePage() {
  const [gender, setGender] = useState<"male" | "female">("male");
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    topAnimal: string;
    description: { title: string; description: string; celebrities: string };
    allResults: PredictionResult[];
  } | null>(null);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // 페이지 방문 추적
  useEffect(() => {
    trackPageView("animalface");
  }, []);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setImage(base64);
        setIsAnalyzing(true);
        setResult(null);

        trackPhotoUpload("animalface", { gender });
      };
      reader.readAsDataURL(file);
    },
    [gender]
  );

  // 이미지가 로드되면 분석 시작
  useEffect(() => {
    if (image && isAnalyzing && scriptsLoaded && imageRef.current) {
      analyzeImage();
    }
  }, [image, isAnalyzing, scriptsLoaded]);

  const analyzeImage = async () => {
    if (!imageRef.current || !window.tmImage) return;

    try {
      const modelURL = gender === "male" ? MODEL_URL_MALE : MODEL_URL_FEMALE;
      const model = await window.tmImage.load(
        modelURL + "model.json",
        modelURL + "metadata.json"
      );

      const predictions = await model.predict(imageRef.current, false);

      // 결과 정렬
      const results: PredictionResult[] = predictions
        .map((p) => ({
          key: p.className,
          value: Math.round(p.probability * 100),
        }))
        .sort((a, b) => b.value - a.value);

      const topAnimal = results[0].key;
      const descriptions = gender === "male" ? ANIMAL_DESCRIPTIONS.male : ANIMAL_DESCRIPTIONS.female;
      const animalDesc = descriptions[topAnimal as keyof typeof descriptions];

      setResult({
        topAnimal,
        description: animalDesc || {
          title: ANIMAL_NAMES[topAnimal] || topAnimal,
          description: "",
          celebrities: "",
        },
        allResults: results,
      });

      trackAnalysisComplete("animalface", {
        result: topAnimal,
        gender,
        top5: results.slice(0, 5).map((r) => `${r.key} (${r.value}%)`).join(", "),
      });
    } catch (error) {
      console.error("분석 오류:", error);
      alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImage(null);
    setResult(null);
    setIsAnalyzing(false);
    trackRetry("animalface");
  };

  const handleGenderToggle = () => {
    setGender(gender === "male" ? "female" : "male");
  };

  const getPercentClass = (value: number) => {
    if (value === 0) return "zero";
    if (value <= 10) return "zeroone";
    if (value <= 20) return "onetwo";
    if (value <= 30) return "twothree";
    if (value <= 40) return "threefour";
    if (value <= 50) return "fourfive";
    if (value <= 60) return "fivesix";
    if (value <= 70) return "sixseven";
    if (value <= 80) return "seveneight";
    if (value <= 90) return "eightnine";
    return "nineten";
  };

  return (
    <>
      {/* TensorFlow.js & TeachableMachine */}
      <Script
        src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js"
        strategy="afterInteractive"
        onLoad={() => setScriptsLoaded(true)}
      />

      <div className="animal-page">
        {/* 뒤로가기 버튼 */}
        <Link href="/" className="animal-back-btn">
          <span className="material-icons">arrow_back</span>
          <span>홈으로</span>
        </Link>

        <div className="animal-content">
          {/* Title */}
          <div className="animal-title-wrap">
            <div className="animal-subtitle">동물상 테스트</div>
            <div className="animal-main-title">AI가 알려주는 나와 닮은 동물</div>
          </div>

          {/* 성별 선택 토글 - 원본 스타일 (결과 없을 때만 표시) */}
          {!result && (
            <div
              className="animal-toggle-container"
              onClick={handleGenderToggle}
            >
              <div className="animal-toggle-inner animal-toggle-bg">
                <div className="animal-toggle-item">
                  <p>남</p>
                </div>
                <div className="animal-toggle-item">
                  <p>여</p>
                </div>
              </div>
              <div
                className="animal-toggle-inner animal-toggle-active"
                style={{
                  clipPath: gender === "male" ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)"
                }}
              >
                <div className="animal-toggle-item">
                  <p>남</p>
                </div>
                <div className="animal-toggle-item">
                  <p>여</p>
                </div>
              </div>
            </div>
          )}

          {/* 이미지 업로드 영역 - 원본 스타일 */}
          {!result && (
            <div className="animal-border">
              <div className="animal-frame">
                <div className="animal-image-area">
                  <div className="animal-file-upload">
                    {!image ? (
                      <div className="animal-upload-wrap">
                        <input
                          className="animal-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        <div className="animal-drag-text">
                          <i className="material-icons">add_photo_alternate</i>
                          <h2>(사진 첨부)</h2>
                          <h3>당신의 동물상은?</h3>
                        </div>
                      </div>
                    ) : (
                      <div className="animal-upload-content">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          ref={imageRef}
                          className="animal-uploaded-image"
                          src={image}
                          alt="your image"
                          onLoad={() => {
                            if (isAnalyzing && scriptsLoaded) {
                              analyzeImage();
                            }
                          }}
                        />
                        <div className="animal-analyzing-text">
                          <div className="animal-ai-text">
                            {isAnalyzing ? "당신의 동물상을 분석중..." : "분석 완료!"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 결과 영역 - 원본 스타일 */}
          {result && (
            <div className="animal-result">
              {/* 업로드한 이미지 */}
              <div className="animal-result-image-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image!}
                  alt="분석된 이미지"
                  className="animal-result-image"
                />
              </div>

              {/* 결과 타이틀 */}
              <div className="animal-result-main-title">{result.description.title}</div>
              <div className="animal-result-celebrity">{result.description.celebrities}</div>
              <p className="animal-result-desc">{result.description.description}</p>

              {/* 원형 배지 결과 - 원본 스타일 */}
              <div className="animal-other-result">
                {result.allResults.map((item) => (
                  <div key={item.key} className="animal-star-list-wrap">
                    <div className="animal-star-list-img">
                      {ANIMAL_NAMES[item.key] || item.key}
                    </div>
                    <span className={`animal-percent ${getPercentClass(item.value)}`}>
                      {item.value}%
                    </span>
                  </div>
                ))}
              </div>

              {/* 버튼들 */}
              <button className="animal-reset-btn" onClick={handleReset}>
                다른 사진으로 해보기
              </button>
            </div>
          )}

          <div className="animal-noti">*걱정마세요! 사진은 절대로 저장되지 않습니다.</div>
        </div>

        <Footer />
      </div>
    </>
  );
}
