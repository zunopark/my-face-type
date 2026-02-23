interface ExitModalProps {
  onClose: () => void;
  onConfirm: () => void;
  styles: Record<string, string>;
}

export function ExitModal({ onClose, onConfirm, styles }: ExitModalProps) {
  return (
    <div className={styles.exit_modal_overlay} onClick={onClose}>
      <div className={styles.exit_modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.exit_modal_text}>홈으로 돌아갈까요?</p>
        <div className={styles.exit_modal_buttons}>
          <button className={styles.exit_modal_cancel} onClick={onClose}>
            아니요
          </button>
          <button className={styles.exit_modal_confirm} onClick={onConfirm}>
            네, 돌아갈게요
          </button>
        </div>
      </div>
    </div>
  );
}
