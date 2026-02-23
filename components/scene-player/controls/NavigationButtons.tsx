import { Scene } from "../types";

interface NavigationButtonsProps {
  currentScene: Scene;
  sceneIndex: number;
  totalScenes: number;
  canProceed: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRestart: () => void;
  onExit: () => void;
  getButtonText?: () => string;
  styles: Record<string, string>;
}

export function CardNavigationButtons({
  currentScene,
  sceneIndex,
  canProceed,
  onPrev,
  onNext,
  onRestart,
  onExit,
  styles,
}: NavigationButtonsProps) {
  const isEnding = currentScene.kind === "card" && currentScene.id === "ending";
  const isWaiting = currentScene.kind === "waiting";
  const isAction = currentScene.kind === "action";

  const visible =
    canProceed && !isWaiting && !isAction;

  return (
    <div
      className={`${styles.report_bottom_btn_wrap} ${
        visible ? styles.visible : ""
      }`}
    >
      {isEnding ? (
        <div className={styles.end_buttons}>
          <button
            className={styles.dialogue_next_btn}
            onClick={onRestart}
          >
            처음부터 다시 보기
          </button>
          <button
            className={styles.dialogue_secondary_btn}
            onClick={onExit}
          >
            홈으로
          </button>
        </div>
      ) : isWaiting ? (
        <div className={styles.waiting_info}>
          <p>분석이 완료되면 자동으로 다음으로 넘어갑니다</p>
        </div>
      ) : (
        <div className={styles.report_nav_buttons}>
          {sceneIndex > 0 && (
            <button className={styles.report_prev_btn} onClick={onPrev}>
              이전
            </button>
          )}
          <button className={styles.report_next_btn} onClick={onNext}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}

interface DialogueButtonsProps {
  sceneIndex: number;
  showButtons: boolean;
  onPrev: () => void;
  onNext: () => void;
  buttonText: string;
  styles: Record<string, string>;
}

export function DialogueButtons({
  sceneIndex,
  showButtons,
  onPrev,
  onNext,
  buttonText,
  styles,
}: DialogueButtonsProps) {
  return (
    <div
      className={`${styles.dialogue_buttons} ${
        showButtons ? styles.visible : ""
      }`}
    >
      {sceneIndex > 0 && (
        <button className={styles.dialogue_prev_btn} onClick={onPrev}>
          이전
        </button>
      )}
      <button className={styles.dialogue_next_btn} onClick={onNext}>
        {buttonText}
      </button>
    </div>
  );
}
