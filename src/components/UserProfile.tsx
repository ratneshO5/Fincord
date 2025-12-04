"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUpdateMyPresence } from "@liveblocks/react";
import { useUser } from "@/context/UserContext";

import styles from "./UserProfile.module.css";

export const UserProfile: React.FC = () => {
  const { user, login } = useUser();
  const updateMyPresence = useUpdateMyPresence();

  const [isOpen, setIsOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (user) {
      updateMyPresence({
        name: user.name,
        color: user.color,
      } as any);
      setEditName(user.name);
      setEditColor(user.color);
    }
  }, [user, updateMyPresence]);

  const handleSave = () => {
    if (user && editName.trim()) {
      login(editName, editColor);
      setIsOpen(false);
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/" });
  };

  if (!user) return null;

  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
    "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
    "#f43f5e", "#007acc", "#333333", "#555555"
  ];

  return (
    <div className={styles.container}>
      {/* Trigger Button */}
      <div className={styles.trigger} onClick={() => setIsOpen(!isOpen)}>
        <div
          className={styles.triggerAvatar}
          style={{ background: user.color }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>
        <span className={styles.triggerName}>
          {user.name}
        </span>
      </div>

      {/* Popover Menu */}
      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.popover}>
            {/* User Info Header */}
            <div className={styles.header}>
              {user.image ? (
                <img src={user.image} alt={user.name} className={styles.headerAvatar} />
              ) : (
                <div className={styles.headerAvatarPlaceholder} style={{ background: user.color }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.headerInfo}>
                <div className={styles.headerName}>{user.name}</div>
                <div className={styles.headerEmail}>{user.email}</div>
              </div>
            </div>

            {/* Edit Section */}
            <div className={styles.content}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Display Name</label>
                <input
                  className={styles.input}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Avatar Color</label>
                <div className={styles.colorGrid}>
                  {colors.map(c => (
                    <div
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`${styles.colorOption} ${editColor === c ? styles.selected : ''}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <button className={styles.saveBtn} onClick={handleSave}>
                Save Changes
              </button>
            </div>

            {/* Actions Footer */}
            <div className={styles.footer}>
              <a href="/" className={styles.footerLink}>
                <span>←</span> Return to Dashboard
              </a>
              <button className={styles.signOutBtn} onClick={handleSignOut}>
                <span>⏻</span> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
