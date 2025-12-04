import React from 'react';
import styles from './Toast.module.css';

export type ToastType = 'join' | 'leave';

interface ToastProps {
    message: string;
    type: ToastType;
}

export function Toast({ message, type }: ToastProps) {
    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            {type === 'join' ? '👋' : '💨'}
            <span>{message}</span>
        </div>
    );
}
