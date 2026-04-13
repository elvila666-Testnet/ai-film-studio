import React, { useState, createContext, useContext } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Coins, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface CostApprovalContextType {
    requestApproval: (cost: number, onApprove: () => void, actionType?: string) => void;
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
    const [tokenCost, setTokenCost] = useState<number | null>(null);
    const [tokenBalance, setTokenBalance] = useState<number | null>(null);
    const onApproveRef = React.useRef<(() => void) | null>(null);

    // Fetch token balance when dialog opens
    const balanceQuery = trpc.finops.getTokenBalance.useQuery(undefined, {
        enabled: isOpen,
    });

    React.useEffect(() => {
        if (balanceQuery.data) {
            setTokenBalance(balanceQuery.data.balance);
        }
    }, [balanceQuery.data]);

    const requestApproval = (estimatedCost: number, onApprove: () => void, actionType?: string) => {
        setCost(estimatedCost);
        onApproveRef.current = onApprove;

        // Try to map action to token cost
        if (actionType) {
            // We'll calculate token cost client-side from known rates
            const tokenRates: Record<string, number> = {
                image_generation_fast: 5,
                image_generation_quality: 15,
                image_upscale: 10,
                video_generation: 50,
                video_generation_premium: 100,
                llm_script: 2,
                llm_synopsis: 1,
                llm_analysis: 1,
                lora_training: 200,
                tts_voiceover: 5,
                sound_effect: 3,
            };
            setTokenCost(tokenRates[actionType] ?? null);
        } else {
            setTokenCost(null);
        }

        setIsOpen(true);
    };

    const handleApprove = () => {
        if (onApproveRef.current) onApproveRef.current();
        setIsOpen(false);
    };

    const insufficientTokens = tokenCost !== null && tokenBalance !== null && tokenBalance < tokenCost;

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
                            <Dialog.Description className="sr-only">
                                Financial approval required for AI asset generation.
                            </Dialog.Description>
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

                            {/* Token balance display */}
                            {(tokenCost !== null || tokenBalance !== null) && (
                                <div className="bg-slate-800/60 p-4 rounded border border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs text-slate-400 uppercase font-mono flex items-center gap-1.5">
                                            <Coins className="w-3 h-3 text-indigo-400" />
                                            Token Cost
                                        </span>
                                        <span className="text-lg font-bold text-indigo-400">
                                            {tokenCost ?? "?"} tokens
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400 uppercase font-mono">Your Balance</span>
                                        <span className={`text-lg font-bold ${insufficientTokens ? 'text-red-400' : 'text-green-400'}`}>
                                            {tokenBalance?.toLocaleString() ?? "..."} tokens
                                        </span>
                                    </div>
                                </div>
                            )}

                            {insufficientTokens && (
                                <div className="bg-red-900/30 p-3 rounded border border-red-800/50 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-red-300 font-medium">Insufficient Tokens</p>
                                        <p className="text-xs text-red-400/80 mt-1">
                                            You need {tokenCost} tokens but only have {tokenBalance}.{' '}
                                            <a href="/?view=billing" className="underline hover:text-white">
                                                Buy more tokens →
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-gray-500 italic">
                                Creating this asset will incur real costs on the connected AI provider account.
                            </p>

                            <div className="flex gap-3 justify-end mt-6">
                                <Dialog.Close asChild>
                                    <button className="px-4 py-2 rounded text-gray-300 hover:text-white font-medium">
                                        Cancel
                                    </button>
                                </Dialog.Close>
                                <button
                                    onClick={handleApprove}
                                    disabled={insufficientTokens}
                                    className={`px-6 py-2 rounded font-bold uppercase tracking-wide transition-colors ${
                                        insufficientTokens
                                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                            : 'bg-red-600 hover:bg-red-700 text-white'
                                    }`}
                                >
                                    {insufficientTokens ? "Need More Tokens" : "Authorize Charge"}
                                </button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </CostApprovalContext.Provider>
    );
}