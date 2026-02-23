import { useState, useCallback, useRef, useEffect } from "react";
import { Scene, TransitionPhase } from "./types";
import { useTypingEffect } from "./useTypingEffect";

function ensureImageLoaded(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    if (img.complete) {
      resolve();
      return;
    }
    img.src = url;
  });
}

export function useSceneNavigation(
  scenes: Scene[],
  initialIndex = 0,
  defaultBgImage: string
) {
  const [sceneIndex, setSceneIndex] = useState(initialIndex);
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [showButtons, setShowButtons] = useState(false);
  const [displayBgImage, setDisplayBgImage] = useState(
    scenes[initialIndex]?.bgImage || defaultBgImage
  );
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const typing = useTypingEffect(50);

  const currentScene = scenes[sceneIndex] || null;
  const currentBgImage = displayBgImage;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
      typing.stopTyping();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle scene change from external source (e.g. scenes array replacement)
  useEffect(() => {
    if (sceneIndex >= scenes.length && scenes.length > 0) {
      setSceneIndex(scenes.length - 1);
    }
  }, [scenes.length, sceneIndex]);

  const enterScene = useCallback(
    (index: number, options?: { prependText?: string }) => {
      const scene = scenes[index];
      if (!scene) return;

      setSceneIndex(index);
      setShowButtons(false);

      // Only update bg for dialogue scenes;
      // card/waiting/action scenes are fullscreen overlays so bg stays as-is
      if (scene.kind === "dialogue") {
        setDisplayBgImage(scene.bgImage || defaultBgImage);
        const text = options?.prependText
          ? `${options.prependText}\n\n${scene.text}`
          : scene.text;
        typing.typeText(text, () => setShowButtons(true));
      } else {
        setShowButtons(true);
      }
    },
    [scenes, typing, defaultBgImage]
  );

  const goTo = useCallback(
    async (
      targetIndex: number,
      options?: { animate?: boolean; prependText?: string }
    ) => {
      const animate = options?.animate !== false;
      const scene = scenes[targetIndex];
      if (!scene) return;

      if (!animate) {
        enterScene(targetIndex, options);
        return;
      }

      // Preload next background image
      const nextImage = scene.bgImage || defaultBgImage;
      await Promise.race([
        ensureImageLoaded(nextImage),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      // Clear old dialogue text only for dialogue→dialogue transitions
      if (scene.kind === "dialogue") {
        typing.showInstant("");
      }
      setShowButtons(false);
      setPhase("out");

      phaseTimerRef.current = setTimeout(() => {
        enterScene(targetIndex, options);
        setPhase("in");

        phaseTimerRef.current = setTimeout(() => {
          setPhase("idle");
        }, 300);
      }, 300);
    },
    [scenes, defaultBgImage, enterScene, typing]
  );

  const goNext = useCallback(() => {
    // If typing, skip to end
    if (typing.isTyping) {
      const scene = scenes[sceneIndex];
      if (scene?.kind === "dialogue") {
        typing.skipTyping(scene.text);
        setShowButtons(true);
      }
      return;
    }

    const scene = scenes[sceneIndex];

    // Block navigation from waiting scene
    if (scene?.kind === "waiting") return;

    const nextIndex = sceneIndex + 1;
    if (nextIndex < scenes.length) {
      goTo(nextIndex, { animate: true });
    }
  }, [sceneIndex, scenes, typing, goTo]);

  const goPrev = useCallback(() => {
    if (typing.isTyping) return;
    if (sceneIndex <= 0) return;

    const prevIndex = sceneIndex - 1;
    const prevScene = scenes[prevIndex];

    setSceneIndex(prevIndex);
    setShowButtons(true);

    if (prevScene?.kind === "dialogue") {
      setDisplayBgImage(prevScene.bgImage || defaultBgImage);
      typing.showInstant(prevScene.text);
    }
  }, [sceneIndex, scenes, typing, defaultBgImage]);

  const jumpTo = useCallback(
    (index: number) => {
      const scene = scenes[index];
      if (!scene) return;

      setSceneIndex(index);
      setShowButtons(true);
      setPhase("idle");
      setDisplayBgImage(scene.bgImage || defaultBgImage);

      if (scene.kind === "dialogue") {
        typing.showInstant(scene.text);
      }
    },
    [scenes, typing]
  );

  return {
    sceneIndex,
    currentScene,
    currentBgImage,
    phase,
    showButtons,
    setShowButtons,
    typing,
    goNext,
    goPrev,
    goTo,
    jumpTo,
    enterScene,
    setSceneIndex,
  };
}
