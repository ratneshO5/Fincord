"use client";
import { useState } from "react";
import { useUser } from "@/context/UserContext";

type Props = {
    isOpen: boolean;
    onClose: () => void;
};

export function ProfileSettingsModal({ isOpen, onClose }: Props) {
    const { user, login } = useUser();
    const [name, setName] = useState(user?.name || "");
    const [color, setColor] = useState(user?.color || "#007acc");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(name, color);
        onClose();
    };

    const colors = [
        "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
        "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef",
        "#f43f5e", "#007acc", "#333333", "#555555"
    ];

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#1c1c1f', padding: '2rem', borderRadius: '1rem',
                width: '100%', maxWidth: '400px', border: '1px solid #2c2c2f'
            }}>
                <h2 style={{ marginTop: 0, color: 'white' }}>Edit Profile</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>Display Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: '100%', padding: '0.75rem', backgroundColor: '#2c2c2f',
                                border: '1px solid #3e3e42', borderRadius: '0.5rem', color: 'white'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#d1d5db' }}>Avatar Color</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    style={{
                                        width: '2rem', height: '2rem', borderRadius: '50%',
                                        backgroundColor: c, border: color === c ? '2px solid white' : 'none',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '0.5rem 1rem', backgroundColor: 'transparent',
                                border: '1px solid #3e3e42', color: 'white', borderRadius: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                padding: '0.5rem 1rem', backgroundColor: '#2563eb',
                                border: 'none', color: 'white', borderRadius: '0.5rem',
                                cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
