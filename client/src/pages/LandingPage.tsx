import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Play, Film, PenTool, Layout,
    ChevronRight, Menu, X, Cpu, Layers, Radio, Camera,
    Music, Share2, Zap
} from "lucide-react";
import { LoginPage } from "./LoginPage";

export function LandingPage({ onLoginSuccess, isAuthenticated, user }: { onLoginSuccess: () => void; isAuthenticated?: boolean; user?: unknown }) {
    const [isLoginView, setIsLoginView] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleEnterStudio = () => {
        if (isAuthenticated) {
            onLoginSuccess();
        } else {
            setIsLoginView(true);
        }
    };

    if (isLoginView) {
        return (
            <div className="min-h-screen bg-[#020203] relative overflow-hidden flex flex-col items-center justify-center">
                {/* Background Glows for Login */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />

                <div className="absolute top-8 left-8 z-50">
                    <Button
                        variant="ghost"
                        onClick={() => setIsLoginView(false)}
                        className="text-slate-400 hover:text-white hover:bg-white/5"
                    >
                        ← Back to Studio
                    </Button>
                </div>

                <div className="relative z-10 w-full max-w-md p-4">
                    <LoginPage onLogin={async (email, password) => {
                        const response = await fetch("/api/auth/login", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email, password }),
                        });

                        if (!response.ok) {
                            const data = await response.json();
                            throw new Error(data.error || "Login failed");
                        }
                        onLoginSuccess();
                    }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020205] text-slate-200 selection:bg-indigo-500/30 font-sans overflow-x-hidden">
            {/* Cinematic Overlay Grain */}
            <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-[60] transition-all duration-700 ${scrolled ? "bg-black/40 backdrop-blur-2xl border-b border-white/5 py-3" : "bg-transparent py-8"}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <Film className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-white leading-none">
                                AI FILM <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">STUDIO</span>
                            </span>
                            <span className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase mt-1">Production Suite</span>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-10">
                        {["Pipeline", "Features", "Showcase"].map((item) => (
                            <a
                                key={item}
                                href={`#${item.toLowerCase()}`}
                                className="text-sm font-bold text-slate-400 hover:text-white transition-all hover:tracking-widest duration-300 uppercase tracking-wider"
                            >
                                {item}
                            </a>
                        ))}
                        <Button
                            onClick={handleEnterStudio}
                            className="bg-white text-black hover:bg-indigo-500 hover:text-white rounded-md px-8 h-12 font-bold transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] active:scale-95"
                        >
                            {isAuthenticated ? `Enter Studio (${user?.name?.split(' ')[0]})` : "Enter Studio"}
                        </Button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden p-2 text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse" />
                <div className="absolute bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px]" />

                {/* Animated Light Beam */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-screen bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent opacity-20" />

                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-5xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase mb-10 animate-fade-in shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                            <Zap className="w-3 h-3 fill-current" />
                            The First End-to-End AI Production Suite
                        </div>

                        <h1 className="text-6xl md:text-[120px] font-black text-white leading-[0.9] tracking-tighter mb-10">
                            FILMS <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-white to-cyan-400">
                                REIMAGINED
                            </span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-400 leading-relaxed max-w-3xl mx-auto font-medium mb-12">
                            Stop managing disparate tools. Our unified AI pipeline handles everything from the first script beat to the final 4K cinematic render.
                        </p>

                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                            <Button
                                onClick={handleEnterStudio}
                                className="group bg-indigo-600 hover:bg-indigo-500 text-white rounded-md px-12 py-8 text-lg font-bold shadow-[0_0_50px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-1"
                            >
                                {isAuthenticated ? "Go to Dashboard" : "Start Production"}
                                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                                variant="outline"
                                className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-md px-12 py-8 text-lg font-bold backdrop-blur-xl transition-all"
                            >
                                Watch Demo
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Bottom Gradient Fade */}
                <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-[#020205] to-transparent" />
            </section>

            {/* The Pipeline Section - Detailed Explanation */}
            <section id="pipeline" className="py-32 relative">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col items-center mb-24">
                        <h2 className="text-indigo-500 font-mono text-xs tracking-[0.5em] uppercase mb-4 text-center">Industrial Workflow</h2>
                        <h3 className="text-4xl md:text-6xl font-black text-white text-center">The AI Movie Machine</h3>
                        <div className="w-24 h-1 bg-gradient-to-r from-indigo-600 to-cyan-400 mt-8 rounded-full" />
                    </div>

                    <div className="grid lg:grid-cols-4 gap-4 px-4 overflow-hidden">
                        {[
                            {
                                step: "01",
                                title: "Brief to Script",
                                desc: "Input your core idea. Our specialized LLMs generate studio-standard scripts including dialogue, camera blocking, and scene direction.",
                                icon: PenTool,
                                detail: "Industry Standard Formatting"
                            },
                            {
                                step: "02",
                                title: "Visual Storyboard",
                                desc: "Every scene is automatically parsed. AI generates high-fidelity frames for every shot, maintaining character consistency.",
                                icon: Layout,
                                detail: "Character Face-Locking Tech"
                            },
                            {
                                step: "03",
                                title: "Cinematic Gen",
                                desc: "Convert static boards into motion. Our temporal stabilization ensures fluid, realistic movement at 24fps.",
                                icon: Camera,
                                detail: "4K High-Dynamic Range"
                            },
                            {
                                step: "04",
                                title: "Final Studio",
                                desc: "Assemble scenes, add AI-generated foley, orchestral scores, and color grade in our cloud editor.",
                                icon: Music,
                                detail: "Multi-track Cloud Editing"
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="relative group p-1 w-full">
                                <div className="absolute -inset-0.5 bg-gradient-to-b from-indigo-500/20 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative h-full bg-[#08080f] rounded-[2rem] p-10 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden">
                                    <div className="absolute top-6 right-8 text-4xl font-black text-white/[0.03] group-hover:text-indigo-500/10 transition-colors uppercase italic tracking-tighter">
                                        Phase {item.step}
                                    </div>
                                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-8 border border-indigo-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <item.icon className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <h4 className="text-2xl font-bold text-white mb-4">{item.title}</h4>
                                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                        {item.desc}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] font-mono text-indigo-400 uppercase tracking-widest bg-indigo-500/5 py-2 px-3 rounded-lg border border-indigo-500/10 w-fit">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                        {item.detail}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* UI Preview Section */}
            <section id="features" className="py-32 bg-gradient-to-b from-[#020205] via-[#05050a] to-[#020205]">
                <div className="container mx-auto px-6">
                    <div className="bg-[#0a0a14] rounded-[3rem] border border-white/5 p-4 md:p-8 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="p-8 md:p-12 space-y-10">
                                <div className="inline-flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
                                    <Cpu className="w-4 h-4" />
                                    Live Interface Preview
                                </div>
                                <h3 className="text-4xl md:text-5xl font-black text-white leading-tight">
                                    A Professional <br />
                                    <span className="text-indigo-400">Command Center</span>
                                </h3>
                                <p className="text-slate-400 text-lg leading-relaxed">
                                    We've rebuilt the filmmaking workflow from scratch. No legacy menus. Just a powerful, AI-accelerated interface designed for speed.
                                </p>
                                <ul className="space-y-6">
                                    {[
                                        { t: "Dynamic Timeline", d: "Manage AI generations across time with frame-perfect precision.", icon: Layers },
                                        { t: "Neural Asset Library", d: "Store characters and styles that the AI reuses perfectly.", icon: Radio },
                                        { t: "Cloud Render Cluster", d: "Export in 4K without touching your CPU.", icon: Share2 }
                                    ].map((li, idx) => (
                                        <li key={idx} className="flex gap-6 group">
                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-shrink-0 items-center justify-center border border-white/10 group-hover:border-indigo-500/40 group-hover:bg-indigo-500/10 transition-all">
                                                <li.icon className="w-5 h-5 text-slate-400 group-hover:text-indigo-400" />
                                            </div>
                                            <div>
                                                <div className="text-white font-bold mb-1">{li.t}</div>
                                                <div className="text-slate-400 text-sm">{li.d}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Simulated App Screenshot / UI Piece */}
                            <div className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-cyan-500/20 rounded-[2rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
                                <div className="relative bg-[#020205] rounded-[2rem] aspect-[4/3] border border-white/10 overflow-hidden shadow-2xl">
                                    {/* UI Elements Mockup */}
                                    <div className="absolute top-0 left-0 w-full h-12 border-b border-white/5 bg-white/5 flex items-center px-6 gap-4">
                                        <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-amber-500/20" />
                                        <div className="w-3 h-3 rounded-full bg-emerald-500/20" />
                                        <div className="h-6 w-32 bg-white/5 rounded mx-auto" />
                                    </div>
                                    <div className="mt-12 p-8 grid grid-cols-[200px_1fr] h-full gap-8">
                                        <div className="space-y-4">
                                            {[...Array(6)].map((_, i) => (
                                                <div key={i} className="h-8 bg-white/5 rounded-lg border border-white/5" />
                                            ))}
                                        </div>
                                        <div className="space-y-8">
                                            <div className="aspect-video bg-gradient-to-br from-indigo-900/40 to-black rounded-xl border border-white/10 flex items-center justify-center relative">
                                                <Play className="w-12 h-12 text-white/40" />
                                                <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 rounded text-[10px] font-mono text-cyan-400 border border-cyan-400/20">
                                                    00:12:04:15
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4">
                                                {[...Array(4)].map((_, i) => (
                                                    <div key={i} className="aspect-square bg-white/5 rounded-lg border border-white/5" />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Showcase Section */}
            <section id="showcase" className="py-24 overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                        <div>
                            <h2 className="text-indigo-500 font-mono text-xs tracking-[0.5em] uppercase mb-4">Masterpieces</h2>
                            <h3 className="text-4xl md:text-6xl font-black text-white">Created in Studio</h3>
                        </div>
                        <Button variant="outline" className="text-white border-white/10 hover:bg-white/5">
                            View Full Gallery
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { name: "Neon Seoul", cat: "Cyberpunk", img: "https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=2000&auto=format&fit=crop" },
                            { name: "Dust & Gears", cat: "Steampunk", img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop" },
                            { name: "The Alchemist", cat: "Fantasy", img: "https://images.unsplash.com/photo-1543336783-bb59dc93f30b?q=80&w=2000&auto=format&fit=crop" },
                        ].map((movie, idx) => (
                            <div key={idx} className="group relative aspect-video rounded-3xl p-1 overflow-hidden transition-all duration-700">
                                <div className="absolute inset-0 bg-white/5 group-hover:bg-indigo-500/10 transition-colors" />
                                <div className="relative h-full w-full rounded-[1.4rem] overflow-hidden bg-slate-900 border border-white/5">
                                    <img
                                        src={movie.img}
                                        alt={movie.name}
                                        className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-60"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                                    <div className="absolute bottom-0 left-0 p-8 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        <div className="text-indigo-400 font-mono text-[10px] tracking-[0.3em] uppercase mb-2">{movie.cat}</div>
                                        <h4 className="text-3xl font-black text-white mb-2">{movie.name}</h4>
                                        <div className="flex items-center gap-4 pt-4 opacity-0 group-hover:opacity-100 transition-opacity delay-200">
                                            <div className="h-[1px] flex-grow bg-white/20" />
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase">
                                                Watch <Play className="w-3 h-3 fill-current" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-40 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="container mx-auto px-6 text-center relative z-10">
                    <h2 className="text-5xl md:text-8xl font-black text-white mb-12 tracking-tighter">
                        DIRECT THE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-white to-cyan-400 italic">
                            UNIMAGINABLE
                        </span>
                    </h2>
                    <Button
                        onClick={() => setIsLoginView(true)}
                        className="bg-white text-black hover:bg-indigo-500 hover:text-white rounded-md px-16 py-10 text-2xl font-black transition-all transform hover:-translate-y-2 shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)] active:scale-95"
                    >
                        START CREATING
                    </Button>
                    <p className="mt-12 text-slate-500 font-mono text-xs uppercase tracking-widest">
                        FREE ACCESS DURING BETA • NO CREDIT CARD REQUIRED
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-white/5 relative z-10">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-12">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                                <Film className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-black text-white">AI FILM STUDIO</span>
                        </div>
                        <div className="flex gap-12 text-sm font-bold text-slate-500">
                            {["Twitter", "Discord", "Terms", "Privacy"].map((link) => (
                                <a key={link} href="#" className="hover:text-indigo-400 transition-colors uppercase tracking-widest">{link}</a>
                            ))}
                        </div>
                        <div className="text-slate-600 font-mono text-[10px] uppercase">
                            © 2026 AI FILM STUDIO. BUILT FOR THE FUTURE.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
