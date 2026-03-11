import { Upload, Loader2, Trash2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferenceLibraryProps {
    isUploading: boolean;
    referenceImages: any[];
    moodboardUrl: string | null;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDeleteReference: (id: number) => void;
}

export function ReferenceLibrary({
    isUploading,
    referenceImages,
    moodboardUrl,
    onFileUpload,
    onDeleteReference
}: ReferenceLibraryProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-3 space-y-8">
                <div className="glass-panel p-12 flex flex-col items-center justify-center border-dashed border-white/10 hover:border-primary/50 transition-all cursor-pointer relative group bg-white/[0.01]">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={onFileUpload} disabled={isUploading} />
                    {isUploading ? <Loader2 className="w-12 h-12 text-primary animate-spin" /> : <Upload className="w-12 h-12 text-slate-800 group-hover:text-primary transition-all duration-500" />}
                    <h3 className="mt-6 text-sm font-black text-white uppercase tracking-widest">Ingest Reference Shard</h3>
                    <p className="text-[10px] text-slate-600 mt-2 font-mono tracking-tighter uppercase">PNG, JPG, HEIC up to 10MB</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {referenceImages.map((ref: any) => (
                        <div key={ref.id} className="relative aspect-square rounded-[2rem] overflow-hidden border border-white/10 group shadow-2xl">
                            <img src={ref.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={ref.description} />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <Button
                                    variant="destructive" size="icon" className="h-10 w-10 rounded-full hover:scale-110 transition-transform"
                                    onClick={() => onDeleteReference(ref.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <div className="glass-panel p-8 space-y-6 border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <ImageIcon className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest">Atmosphere Gallery</h3>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">These anchors define the visual noise, material age, and geometric soul of the project.</p>
                </div>

                {moodboardUrl && (
                    <div className="glass-panel p-2 overflow-hidden border-primary/20 group cursor-zoom-in">
                        <h4 className="text-[9px] font-black text-emerald-400 uppercase p-3 tracking-[0.3em]">AI Synthesized Moodboard</h4>
                        <img src={moodboardUrl} className="w-full h-auto rounded-3xl transition-transform duration-1000 group-hover:scale-[1.02]" alt="Moodboard" />
                    </div>
                )}
            </div>
        </div>
    );
}
