import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Film } from "lucide-react";

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>;
    isLoading?: boolean;
    error?: string | null;
}

export function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        await onLogin(email, password);
    };

    const handleOAuthLogin = async () => {
        try {
            const response = await fetch("/api/auth/google/url");
            const { url } = await response.json();
            window.location.href = url;
        } catch (err) {
            console.error("Failed to get Google Auth URL:", err);
        }
    };

    const isOAuthPossible = true;

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#020205] relative overflow-hidden">
            {/* Background elements to match Landing Page */}
            <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-1/4 -left-1/4 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[100px]" />

            <Card className="w-full max-w-md bg-black/40 backdrop-blur-2xl border-white/5 shadow-2xl relative z-10 rounded-3xl p-4">
                <CardHeader className="space-y-4 text-center">
                    <div className="mx-auto w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                        <Film className="w-7 h-7 text-white" />
                    </div>
                    <div className="space-y-1">
                        <CardTitle className="text-3xl font-black text-white tracking-tighter uppercase italic">
                            Enter <span className="text-indigo-400">Studio</span>
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-mono text-[10px] tracking-widest uppercase">
                            Secure Production Gateway
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isOAuthPossible && (
                        <div className="space-y-6">
                            <Button
                                onClick={handleOAuthLogin}
                                variant="outline"
                                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-3 py-7 text-sm font-bold transition-all"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="currentColor"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                    />
                                    <path
                                        fill="currentColor"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-white/5" />
                                </div>
                                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-widest">
                                    <span className="bg-black px-4 text-slate-600">Secure Direct Login</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase ml-1">Studio Email</label>
                            <Input
                                type="email"
                                placeholder="director@filmstudio.ai"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                className="bg-white/5 border-white/10 text-white h-12 focus:ring-indigo-500/50"
                                autoComplete="email"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase ml-1">Access Key</label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="bg-white/5 border-white/10 text-white h-12 focus:ring-indigo-500/50"
                                autoComplete="current-password"
                            />
                        </div>
                        {error && (
                            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center font-medium">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-14 text-sm font-bold shadow-[0_10px_30px_rgba(79,70,229,0.2)] transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                "Grant Access"
                            )}
                        </Button>
                        <div className="text-center pt-4">
                            <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Test Credentials</div>
                            <div className="text-[11px] font-mono text-indigo-400/60 mt-2">admin@filmstudio.ai / admin123</div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
