import { useState, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceInputProps {
    onResult: (text: string) => void;
    className?: string;
}

export function VoiceInput({ onResult, className }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);

    const toggleListening = useCallback(() => {
        if (!isListening) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            
            if (!SpeechRecognition) {
                toast.error("Voice recognition is not supported in this browser.");
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = "en-US";

            recognition.onstart = () => {
                setIsListening(true);
                toast.info("Listening...");
            };

            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
                toast.error("Failed to recognize speech.");
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    onResult(transcript);
                    toast.success("Speech captured");
                }
            };

            recognition.start();
        } else {
            setIsListening(false);
        }
    }, [isListening, onResult]);

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleListening}
            className={`h-8 w-8 rounded-full transition-all ${isListening ? "bg-primary/20 text-primary animate-pulse" : "text-slate-500 hover:text-primary hover:bg-primary/10"} ${className}`}
            title="Voice Recognition"
        >
            {isListening ? <Mic className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </Button>
    );
}
