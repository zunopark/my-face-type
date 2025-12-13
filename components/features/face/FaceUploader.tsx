"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { analyzeFaceFeatures } from "@/app/actions/analyze";
import { saveFaceAnalysisRecord } from "@/lib/db/faceAnalysisDB";

interface FaceUploaderProps {
  onAnalysisStart?: () => void;
  onAnalysisComplete?: (result: unknown) => void;
}

export default function FaceUploader({
  onAnalysisStart,
  onAnalysisComplete,
}: FaceUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        setPreview(base64);
        setIsAnalyzing(true);
        onAnalysisStart?.();

        // 진행률 애니메이션
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += Math.random() * 15;
          if (currentProgress > 90) {
            currentProgress = 90;
            clearInterval(interval);
          }
          setProgress(currentProgress);
        }, 300);

        try {
          // Server Action을 통해 API 호출 (API URL 노출 방지)
          const imageBase64 = base64.split(",")[1];
          const result = await analyzeFaceFeatures(imageBase64);

          if (!result.success) {
            throw new Error(result.error);
          }
          clearInterval(interval);
          setProgress(100);

          // IndexedDB에 저장하고 결과 페이지로 이동
          const resultId = crypto.randomUUID();

          // IndexedDB에 저장
          await saveFaceAnalysisRecord({
            id: resultId,
            imageBase64: base64,
            features: result.data.features,
            timestamp: new Date().toISOString(),
          });

          onAnalysisComplete?.(result.data);

          // 결과 페이지로 이동
          setTimeout(() => {
            router.push(`/face/result?id=${resultId}`);
          }, 500);
        } catch (error) {
          clearInterval(interval);
          setIsAnalyzing(false);
          setProgress(0);
          console.error("분석 오류:", error);
          alert("분석 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
      };
      reader.readAsDataURL(file);
    },
    [router, onAnalysisStart, onAnalysisComplete]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {!preview ? (
        // 업로드 전 상태
        <div
          onClick={handleClick}
          className="aspect-square bg-[var(--fortune-cream)] rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--fortune-gold)] transition-colors"
        >
          <span className="material-icons text-5xl text-gray-400 mb-3">
            add_photo_alternate
          </span>
          <h2 className="text-lg font-medium text-gray-600 mb-1">
            (정면 사진 첨부)
          </h2>
          <p className="text-sm text-gray-400">관상? 얼굴 한번 봅시다</p>
        </div>
      ) : (
        // 업로드 후 상태
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
          <Image
            src={preview}
            alt="업로드된 사진"
            fill
            className="object-cover"
            unoptimized
          />

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
              <div className="w-3/4 mb-4">
                <Progress value={progress} className="h-2" />
              </div>
              <p className="text-sm animate-pulse">
                관상가가 당신의 얼굴을 분석중..
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
