import React, { createContext, useContext, useState, ReactNode } from "react";

interface AIProcessingContextType {
    isProcessing: boolean;
    processName: string;
    progress: number;
    startProcessing: (name: string) => void;
    stopProcessing: () => void;
    updateProgress: (progress: number) => void;
}

const AIProcessingContext = createContext<AIProcessingContextType | undefined>(undefined);

export function AIProcessingProvider({ children }: { children: ReactNode }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [processName, setProcessName] = useState("");
    const [progress, setProgress] = useState(0);

    const startProcessing = (name: string) => {
        setProcessName(name);
        setIsProcessing(true);
        setProgress(10);
    };

    const stopProcessing = () => {
        setIsProcessing(false);
        setProgress(0);
        setProcessName("");
    };

    const updateProgress = (p: number) => setProgress(p);

    return (
        <AIProcessingContext.Provider value={{ isProcessing, processName, progress, startProcessing, stopProcessing, updateProgress }}>
            {children}
        </AIProcessingContext.Provider>
    );
}

export function useAIProcessing() {
    const context = useContext(AIProcessingContext);
    if (!context) {
        throw new Error("useAIProcessing must be used within an AIProcessingProvider");
    }
    return context;
}
