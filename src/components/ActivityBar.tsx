"use client";

import React from "react";
import styles from "./AppShell.module.css";

export function ActivityBar() {
  return (
    <div className={styles.activitybar}>
      <div className={styles.activityIcon}>🗂</div>
      <div className={styles.activityIcon}>🔍</div>
      <div className={styles.activityIcon}>⚙️</div>
    </div>
  );
}

export default ActivityBar;
