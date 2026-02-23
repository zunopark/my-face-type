import { Scene } from "../types";

interface TocItem {
  index: number;
  label: string;
}

export function buildTocItems(scenes: Scene[]): TocItem[] {
  const items: TocItem[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    let label: string | undefined;

    if (scene.kind === "dialogue" && scene.tocLabel) {
      label = scene.tocLabel;
    } else if (scene.kind === "card" && scene.tocLabel) {
      label = scene.tocLabel;
    } else if (scene.kind === "waiting") {
      label = "분석 대기";
    }

    if (label) {
      items.push({ index: i, label });
    }
  }
  return items;
}

interface TocModalProps {
  scenes: Scene[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  styles: Record<string, string>;
}

export function TocModal({
  scenes,
  currentIndex,
  onClose,
  onNavigate,
  styles,
}: TocModalProps) {
  const tocItems = buildTocItems(scenes);

  return (
    <div className={styles.toc_modal_overlay} onClick={onClose}>
      <div className={styles.toc_modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.toc_modal_header}>
          <h3 className={styles.toc_modal_title}>목차</h3>
          <button className={styles.toc_modal_close} onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <ul className={styles.toc_modal_list}>
          {tocItems.map((item) => {
            const isCurrent = item.index === currentIndex;
            const isAvailable = item.index <= currentIndex;

            return (
              <li
                key={item.index}
                className={`${styles.toc_modal_item} ${
                  isCurrent ? styles.current : ""
                } ${!isAvailable ? styles.disabled : ""}`}
                onClick={() => {
                  if (isAvailable) {
                    onNavigate(item.index);
                    onClose();
                  }
                }}
              >
                <span className={styles.toc_item_label}>{item.label}</span>
                {isCurrent && (
                  <span className={styles.toc_item_current}>현재</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
