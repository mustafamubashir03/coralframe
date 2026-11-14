"use client";

import * as React from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

const SaveStatusContext = React.createContext<{
    status: SaveStatus;
    setStatus: React.Dispatch<React.SetStateAction<SaveStatus>>;
} | null>(null);

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = React.useState<SaveStatus>("idle");
    return (
        <SaveStatusContext.Provider value={{ status, setStatus }}>
            {children}
        </SaveStatusContext.Provider>
    );
}

export function useSaveStatus() {
    const ctx = React.useContext(SaveStatusContext);
    if (!ctx) {
        throw new Error("useSaveStatus must be used inside a SaveStatusProvider");
    }
    return ctx;
}
