"use client";

import { useState, useCallback, useEffect, ReactNode, useRef } from "react";
import { useRouter } from "next/navigation";
import { Scene, CardScene, WaitingScene, ActionScene, ScenePlayerConfig } from "./types";
import { useSceneNavigation } from "./useSceneNavigation";
import { useScrollGating } from "./useScrollGating";
import { TocModal } from "./controls/TocModal";
import { ExitModal } from "./controls/ExitModal";
import { ScrollHint } from "./controls/ScrollHint";
import {
  CardNavigationButtons,
  DialogueButtons,
} from "./controls/NavigationButtons";

interface ScenePlayerProps {
  config: ScenePlayerConfig;
  scenes: Scene[];
  initialIndex?: number;
  styles: Record<string, string>;
  /** Render callback for card scenes */
  renderCard: (scene: CardScene) => ReactNode;
  /** Render callback for waiting scenes */
  renderWaiting: (scene: WaitingScene, props: {
    isComplete: boolean;
    onTransition: () => void;
  }) => ReactNode;
  /** Render callback for action scenes */
  renderAction?: (scene: ActionScene, onComplete: () => void) => ReactNode;
  /** Whether the analysis is complete (for waiting scenes) */
  analysisComplete?: boolean;
  /** Called when analysis transition should happen */
  onAnalysisTransition?: () => void;
  /** Callback to get the next button text */
  getButtonText?: (sceneIndex: number, scenes: Scene[]) => string;
  /** Extra buttons to render in the header area (e.g., share button) */
  extraButtons?: ReactNode;
  /** Extra overlay content (e.g., review modal) */
  extraOverlay?: ReactNode;
  /** Called when scene changes */
  onSceneChange?: (index: number, scene: Scene) => void;
  /** Whether all TOC items should be unlocked (e.g., returning paid user) */
  allTocUnlocked?: boolean;
}

export function ScenePlayer({
  config,
  scenes,
  initialIndex = 0,
  styles,
  renderCard,
  renderWaiting,
  renderAction,
  analysisComplete = false,
  onAnalysisTransition,
  getButtonText,
  extraButtons,
  extraOverlay,
  onSceneChange,
  allTocUnlocked = false,
}: ScenePlayerProps) {
  const router = useRouter();
  const [showTocModal, setShowTocModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const initDone = useRef(false);

  const nav = useSceneNavigation(scenes, initialIndex, config.defaultBgImage);
  const { currentScene, sceneIndex, phase, typing, showButtons } = nav;

  // Determine if we're showing a card/waiting/action (non-dialogue) scene
  const isCardView = currentScene
    ? currentScene.kind !== "dialogue"
    : false;

  // Scroll gating for card scenes
  const scrollGating = useScrollGating(
    isCardView && currentScene?.kind === "card" && currentScene.scrollGated !== false,
    [sceneIndex]
  );

  const canProceed =
    currentScene?.kind === "card"
      ? currentScene.scrollGated === false
        ? true
        : scrollGating.canProceed
      : true;

  // Notify parent of scene changes
  useEffect(() => {
    if (currentScene && onSceneChange) {
      onSceneChange(sceneIndex, currentScene);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneIndex]);

  // Start typing when first scene loads
  useEffect(() => {
    if (scenes.length > 0 && !initDone.current) {
      initDone.current = true;
      const timer = setTimeout(() => {
        nav.enterScene(initialIndex);
      }, 500);
      return () => {
        clearTimeout(timer);
        initDone.current = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes.length]);

  // NOTE: Analysis completion for waiting scenes is handled by the WaitingCard's
  // own onTransition callback, which animates progress to 100% before transitioning.
  // Do NOT call onAnalysisTransition directly here — it would skip the 100% animation.

  const handleScreenClick = useCallback(() => {
    if (!isCardView && currentScene?.kind === "dialogue") {
      nav.goNext();
    }
  }, [isCardView, currentScene, nav]);

  const handleNext = useCallback(() => {
    nav.goNext();
  }, [nav]);

  const handlePrev = useCallback(() => {
    nav.goPrev();
  }, [nav]);

  const handleTocNavigate = useCallback(
    (index: number) => {
      nav.jumpTo(index);
    },
    [nav]
  );

  const defaultGetButtonText = useCallback((): string => {
    if (!currentScene) return "다음";
    const nextScene = scenes[sceneIndex + 1];
    if (!nextScene) return "다음";

    if (nextScene.kind === "card" || nextScene.kind === "waiting") {
      return "보기";
    }
    return "다음";
  }, [currentScene, scenes, sceneIndex]);

  const buttonText = getButtonText
    ? getButtonText(sceneIndex, scenes)
    : defaultGetButtonText();

  if (!currentScene) return null;

  return (
    <div
      className={`${styles.newyear_result_page || styles.saju_result_page || ""} ${styles.chat_mode || ""}`}
      onClick={handleScreenClick}
    >
      {/* Background image */}
      <div className={styles.result_bg}>
        <img
          src={nav.currentBgImage}
          alt=""
          className={styles.result_bg_image}
        />
      </div>

      {/* Back button */}
      <button
        className={styles.back_btn}
        onClick={(e) => {
          e.stopPropagation();
          setShowExitModal(true);
        }}
      >
        <span className="material-icons">arrow_back</span>
        <span className={styles.back_btn_text}>홈으로</span>
      </button>

      {/* Exit modal */}
      {showExitModal && (
        <ExitModal
          onClose={() => setShowExitModal(false)}
          onConfirm={() => router.push(config.homeRoute)}
          styles={styles}
        />
      )}

      {/* Extra buttons (e.g., share button) */}
      {extraButtons}

      {/* TOC button */}
      <button
        className={styles.toc_btn}
        onClick={(e) => {
          e.stopPropagation();
          setShowTocModal(true);
        }}
      >
        <span className={styles.toc_btn_text}>목차</span>
      </button>

      {/* TOC modal */}
      {showTocModal && (
        <TocModal
          scenes={scenes}
          currentIndex={sceneIndex}
          onClose={() => setShowTocModal(false)}
          onNavigate={handleTocNavigate}
          styles={styles}
          allUnlocked={allTocUnlocked}
        />
      )}

      {/* Card/Report overlay */}
      {currentScene && (
        <div
          className={`${styles.report_overlay} ${
            isCardView ? styles.active : ""
          } ${phase !== "idle" ? styles.animating : ""}`}
        >
          <div className={styles.report_scroll} ref={scrollGating.scrollRef}>
            {currentScene.kind === "card" &&
              (currentScene.render ? currentScene.render() : renderCard(currentScene))}
            {currentScene.kind === "waiting" &&
              renderWaiting(currentScene, {
                isComplete: analysisComplete,
                onTransition: () => onAnalysisTransition?.(),
              })}
            {currentScene.kind === "action" &&
              renderAction?.(currentScene, handleNext)}
          </div>

          {/* Scroll hint */}
          <ScrollHint
            visible={
              isCardView &&
              scrollGating.showScrollHint &&
              !scrollGating.canProceed
            }
            styles={styles}
          />

          {/* Card navigation buttons */}
          <CardNavigationButtons
            currentScene={currentScene}
            sceneIndex={sceneIndex}
            totalScenes={scenes.length}
            canProceed={canProceed}
            onPrev={handlePrev}
            onNext={handleNext}
            onRestart={() => window.location.reload()}
            onExit={() => setShowExitModal(true)}
            styles={styles}
          />
        </div>
      )}

      {/* Dialogue UI (bottom fixed) */}
      <div
        className={`${styles.dialogue_wrap} ${
          !isCardView ? styles.active : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.dialogue_box} onClick={handleNext}>
          <div className={styles.dialogue_speaker}>{config.characterName}</div>
          <p className={styles.dialogue_text}>
            {typing.displayText}
            {typing.isTyping && <span className={styles.typing_cursor}></span>}
          </p>
        </div>

        <DialogueButtons
          sceneIndex={sceneIndex}
          showButtons={showButtons && !isCardView}
          onPrev={handlePrev}
          onNext={handleNext}
          buttonText={buttonText}
          styles={styles}
        />
      </div>

      {/* Extra overlay (e.g., review modal, review inline card) */}
      {extraOverlay}
    </div>
  );
}
