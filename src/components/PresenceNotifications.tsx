"use client";

import { useOthers } from "@liveblocks/react/suspense";
import { useEffect, useRef, useState } from "react";
import { Toast, ToastType } from "./Toast";
import styles from "./Toast.module.css";

type Notification = {
    id: string;
    message: string;
    type: ToastType;
};

export function PresenceNotifications() {
    const others = useOthers();
    const previousOthers = useRef(others);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        const current = others;
        const prev = previousOthers.current;

        // Check for joins
        current.forEach((user) => {
            if (!prev.find((p) => p.connectionId === user.connectionId)) {
                addNotification(`${user.info?.name || "Anonymous"} joined`, 'join');
            }
        });

        // Check for leaves
        prev.forEach((user) => {
            if (!current.find((c) => c.connectionId === user.connectionId)) {
                addNotification(`${user.info?.name || "Anonymous"} left`, 'leave');
            }
        });

        previousOthers.current = current;
    }, [others]);

    const addNotification = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Remove notification after animation completes (3s total: 0.3s in + 2.2s wait + 0.5s out)
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 3000);
    };

    return (
        <div className={styles.toastContainer}>
            {notifications.map((n) => (
                <Toast key={n.id} message={n.message} type={n.type} />
            ))}
        </div>
    );
}
