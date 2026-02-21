
import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Star, Info, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Model {
    id: number;
    modelId: string;
    name?: string;
    description?: string;
    provider: string;
    costPerUnit: number;
    isFavorite: boolean;
    isBuiltIn: boolean;
}

interface ModelSelectorProps {
    value: string; // The modelId (e.g., "black-forest-labs/flux-pro")
    onValueChange: (value: string) => void;
    className?: string;
}

export function ModelSelector({ value, onValueChange, className }: ModelSelectorProps) {
    const [open, setOpen] = useState(false);
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

    const utils = trpc.useUtils();
    const modelsQuery = trpc.models.list.useQuery();
    const toggleFavoriteMutation = trpc.models.toggleFavorite.useMutation({
        onSuccess: () => {
            utils.models.list.invalidate();
        }
    });

    const models = useMemo(() => modelsQuery.data || [], [modelsQuery.data]);

    const selectedModel = models.find((m: unknown) => m.modelId === value);

    const filteredModels = useMemo(() => {
        if (showFavoritesOnly) {
            return models.filter((m: unknown) => m.isFavorite);
        }
        return models;
    }, [models, showFavoritesOnly]);

    // Group models by provider or category if needed, for now flat list

    const handleToggleFavorite = async (e: React.MouseEvent, model: Model) => {
        e.stopPropagation();
        await toggleFavoriteMutation.mutateAsync({ modelConfigId: model.id });
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {selectedModel ? (
                        <div className="flex items-center gap-2 truncate">
                            <span className="truncate">{selectedModel.name || selectedModel.modelId}</span>
                            {selectedModel.costPerUnit > 0.01 ? (
                                <Badge variant="secondary" className="px-1 py-0 h-5 text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">PRO</Badge>
                            ) : (
                                <Badge variant="secondary" className="px-1 py-0 h-5 text-[10px] bg-green-500/10 text-green-500 border-green-500/20">FAST</Badge>
                            )}
                        </div>
                    ) : (
                        "Select model..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <div className="flex items-center border-b px-3 py-2">
                        <CommandInput placeholder="Search models..." className="h-9 border-none focus:ring-0" />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn("h-6 w-6 ml-2 shrink-0", showFavoritesOnly && "text-yellow-400")}
                                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                                    >
                                        <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Show favorites only</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <CommandList>
                        <CommandEmpty>No models found.</CommandEmpty>
                        <CommandGroup heading={showFavoritesOnly ? "Favorites" : "Models"}>
                            {filteredModels.map((model: unknown) => (
                                <CommandItem
                                    key={model.modelId}
                                    value={model.name || model.modelId} // Search by name or ID
                                    onSelect={() => {
                                        onValueChange(model.modelId);
                                        setOpen(false);
                                    }}
                                    className="flex items-center justify-between"
                                >
                                    <div className="flex flex-col gap-0.5 overflow-hidden">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium">{model.name || model.modelId}</span>
                                            {model.costPerUnit > 0.01 ? (
                                                <Zap className="h-3 w-3 text-amber-500 fill-amber-500/20" />
                                            ) : (
                                                <Zap className="h-3 w-3 text-green-500" />
                                            )}
                                        </div>
                                        {model.description && (
                                            <span className="text-xs text-muted-foreground truncate">{model.description}</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-2">
                                        <div
                                            role="button"
                                            onClick={(e) => handleToggleFavorite(e, model)}
                                            className={cn(
                                                "cursor-pointer hover:bg-muted p-1 rounded-sm transition-colors",
                                                model.isFavorite ? "text-yellow-400" : "text-muted-foreground opacity-20 hover:opacity-100"
                                            )}
                                        >
                                            <Star className={cn("h-4 w-4", model.isFavorite && "fill-current")} />
                                        </div>
                                        {value === model.modelId && (
                                            <Check className="h-4 w-4 text-primary" />
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                    <div className="border-t p-2 text-xs text-center text-muted-foreground bg-muted/20">
                        Tip: Star models to access them quickly
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
