import { useState, useCallback, useRef } from "react";

export function useTypingEffect(speed = 50) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopTyping = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const typeText = useCallback(
    (text: string, onComplete: () => void) => {
      stopTyping();
      setIsTyping(true);
      setDisplayText("");

      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.substring(0, i + 1));
          i++;
        } else {
          stopTyping();
          setIsTyping(false);
          onComplete();
        }
      }, speed);
    },
    [speed, stopTyping]
  );

  const skipTyping = useCallback(
    (fullText: string) => {
      stopTyping();
      setDisplayText(fullText);
      setIsTyping(false);
    },
    [stopTyping]
  );

  const showInstant = useCallback((text: string) => {
    stopTyping();
    setDisplayText(text);
    setIsTyping(false);
  }, [stopTyping]);

  return { displayText, isTyping, typeText, skipTyping, showInstant, stopTyping };
}
