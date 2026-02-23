interface ScrollHintProps {
  visible: boolean;
  styles: Record<string, string>;
}

export function ScrollHint({ visible, styles }: ScrollHintProps) {
  if (!visible) return null;

  return (
    <div className={styles.scroll_hint}>
      <span className="material-icons">keyboard_arrow_down</span>
      아래로 스크롤해주세요
    </div>
  );
}
