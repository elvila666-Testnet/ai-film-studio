import * as React from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LightboxProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    imageAlt?: string;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
    title?: string;
}

export function Lightbox({
    isOpen,
    onClose,
    imageSrc,
    imageAlt = "Image view",
    onNext,
    onPrev,
    hasNext,
    hasPrev,
    title,
}: LightboxProps) {
    // Handle keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === "ArrowRight" && onNext && hasNext) {
                onNext();
            } else if (e.key === "ArrowLeft" && onPrev && hasPrev) {
                onPrev();
            } else if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onNext, onPrev, hasNext, hasPrev, onClose]);

    const handleDownload = async () => {
        try {
            const response = await fetch(imageSrc);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `image-${Date.now()}.png`; // Simple filename strategy
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to download image:", error);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogPortal>
                <DialogOverlay className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogContent className="fixed left-[50%] top-[50%] z-[101] flex h-full w-full max-w-none translate-x-[-50%] translate-y-[-50%] flex-col items-center justify-center p-0 shadow-none outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-none border-none bg-transparent">

                    {/* Header Controls */}
                    <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 z-50 bg-gradient-to-b from-black/80 to-transparent">
                        <h3 className="text-white/90 font-medium text-lg ml-4 truncate max-w-[50%]">
                            {title}
                        </h3>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                onClick={handleDownload}
                                title="Download original"
                            >
                                <Download className="w-5 h-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                onClick={onClose}
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="relative flex h-full w-full items-center justify-center p-4 md:p-12">

                        {/* Prev Button */}
                        {onPrev && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/20 text-white/70 hover:bg-black/40 hover:text-white backdrop-blur-sm transition-all",
                                    !hasPrev && "opacity-0 pointer-events-none"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPrev();
                                }}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </Button>
                        )}

                        {/* Image */}
                        <div
                            className="relative h-full w-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={imageSrc}
                                alt={imageAlt}
                                className="max-h-[85vh] max-w-[90vw] object-contain rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                            />
                        </div>

                        {/* Next Button */}
                        {onNext && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 rounded-full bg-black/20 text-white/70 hover:bg-black/40 hover:text-white backdrop-blur-sm transition-all",
                                    !hasNext && "opacity-0 pointer-events-none"
                                )}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNext();
                                }}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </Button>
                        )}
                    </div>

                    {/* Footer / Caption could go here */}

                </DialogContent>
            </DialogPortal>
        </Dialog>
    );
}
