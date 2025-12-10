"use client";

import { useRef } from "react";
import Image from "next/image";
import styles from "./PictureFrame.module.css";

interface PictureFrameProps {
  image: string | null;
  isAnalyzing?: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PictureFrame({
  image,
  isAnalyzing = false,
  onImageChange,
}: PictureFrameProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.border}>
      <div className={styles.frame}>
        <div className={styles.image}>
          <div className={styles.fileUpload}>
            {!image ? (
              <div className={styles.uploadWrap}>
                <input
                  ref={inputRef}
                  className={styles.uploadInput}
                  type="file"
                  accept="image/*"
                  onChange={onImageChange}
                />
                <div className={styles.dragText}>
                  <span className={`material-icons ${styles.uploadIcon}`}>
                    add_photo_alternate
                  </span>
                  <h2>(정면 사진 첨부)</h2>
                  <h3>관상? 얼굴 한번 봅시다</h3>
                </div>
              </div>
            ) : (
              <div className={styles.uploadedContent}>
                <div className={styles.imageFrame}>
                  <Image
                    className={styles.uploadedImage}
                    src={image}
                    alt="your image"
                    fill
                    style={{ objectFit: "cover" }}
                    unoptimized
                  />
                </div>
                <div className={styles.titleWrap}>
                  <div className={styles.analysisText}>
                    {isAnalyzing
                      ? "관상가가 당신의 얼굴을 분석중.."
                      : "분석 완료!"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
