import React, { useState, createContext, useContext } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface CostApprovalContextType {
    requestApproval: (cost: number, onApprove: () => void) => void;
}

const CostApprovalContext = createContext<CostApprovalContextType | undefined>(undefined);

export function useCostGuard() {
    const context = useContext(CostApprovalContext);
    if (!context) {
        throw new Error('useCostGuard must be used within a CostGuardProvider');
    }
    return context;
}

export function CostGuardProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [cost, setCost] = useState(0);
    const [onApproveCallback, setOnApproveCallback] = useState<(() => void) | null>(null);

    const requestApproval = (estimatedCost: number, onApprove: () => void) => {
        setCost(estimatedCost);
        setOnApproveCallback(() => onApprove);
        setIsOpen(true);
    };

    const handleApprove = () => {
        if (onApproveCallback) onApproveCallback();
        setIsOpen(false);
    };

    return (
        <CostApprovalContext.Provider value={{ requestApproval }}>
            {children}
            <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="bg-black/60 fixed inset-0 backdrop-blur-sm z-[100]" />
                    <Dialog.Content className="fixed top-[50%] left-[50%] z-[101] max-w-md w-full translate-x-[-50%] translate-y-[-50%] rounded-xl bg-slate-900 border border-red-900 shadow-2xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <Dialog.Title className="text-red-500 text-xl font-bold uppercase tracking-widest flex items-center gap-2">
                                ⚠️ Financial Alert
                            </Dialog.Title>
                            <Dialog.Close asChild>
                                <button className="text-gray-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        </div>

                        <div className="space-y-4">
                            <p className="text-gray-300">
                                This action exceeds the auto-approval threshold ($0.01).
                            </p>
                            <div className="bg-red-900/20 p-4 rounded border border-red-900/50">
                                <p className="text-sm text-red-300 uppercase font-mono mb-1">Estimated Cost</p>
                                <p className="text-3xl font-bold text-white">${cost.toFixed(4)}</p>
                            </div>
                            <p className="text-sm text-gray-500 italic">
                                Creating this asset will incur real costs on the connected connected AI provider account.
                            </p>

                            <div className="flex gap-3 justify-end mt-6">
                                <Dialog.Close asChild>
                                    <button className="px-4 py-2 rounded text-gray-300 hover:text-white font-medium">
                                        Cancel
                                    </button>
                                </Dialog.Close>
                                <button
                                    onClick={handleApprove}
                                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold uppercase tracking-wide transition-colors"
                                >
                                    Authorize Charge
                                </button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </CostApprovalContext.Provider>
    );
}