import type { ReactNode } from "react";

import styles from "@/styles/scroll.module.css";

type ScrollLayoutProps = {
  children: ReactNode;
};

export default function ScrollLayout({ children }: ScrollLayoutProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.top} aria-hidden="true" />
      <div className={styles.middle}>{children}</div>
      <div className={styles.bottom} aria-hidden="true" />
    </div>
  );
}
