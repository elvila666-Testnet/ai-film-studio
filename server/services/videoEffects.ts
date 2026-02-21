/**
 * Video Transitions & Effects Library
 * Provides FFmpeg filter chains for professional video transitions and effects
 */

export type TransitionType = "crossfade" | "dissolve" | "wipe" | "slide" | "fade" | "zoom";
export type EffectType = "colorgrade" | "blur" | "brightness" | "saturation" | "contrast" | "hue" | "sharpen";
export type WipeDirection = "left" | "right" | "up" | "down" | "diagonal";

export interface Transition {
  type: TransitionType;
  duration: number; // milliseconds
  direction?: WipeDirection;
}

export interface Effect {
  type: EffectType;
  intensity: number; // 0-100
  params?: Record<string, number | string>;
}

export interface VideoClipWithEffects {
  clipId: string;
  startTime: number;
  duration: number;
  effects: Effect[];
  transition?: Transition;
}

/**
 * Transition Filter Generators
 */
export const TransitionFilters = {
  /**
   * Crossfade transition - gradually transitions from one clip to another
   */
  crossfade: (duration: number): string => {
    const frames = Math.ceil((duration / 1000) * 30); // Assuming 30fps
    return `xfade=transition=fade:duration=${duration / 1000}:offset=${frames}`;
  },

  /**
   * Dissolve transition - similar to crossfade but with different blending
   */
  dissolve: (duration: number): string => {
    return `xfade=transition=dissolve:duration=${duration / 1000}`;
  },

  /**
   * Wipe transition - reveals new clip by moving a line across the screen
   */
  wipe: (duration: number, direction: WipeDirection = "right"): string => {
    const directionMap: Record<WipeDirection, string> = {
      left: "wipeleft",
      right: "wiperight",
      up: "wipeup",
      down: "wipedown",
      diagonal: "wipediagonal",
    };
    return `xfade=transition=${directionMap[direction]}:duration=${duration / 1000}`;
  },

  /**
   * Slide transition - slides new clip in from the side
   */
  slide: (duration: number, direction: WipeDirection = "right"): string => {
    const directionMap: Record<WipeDirection, string> = {
      left: "slideleft",
      right: "slideright",
      up: "slideup",
      down: "slidedown",
      diagonal: "slideleft", // Fallback
    };
    return `xfade=transition=${directionMap[direction]}:duration=${duration / 1000}`;
  },

  /**
   * Fade to black transition
   */
  fade: (duration: number): string => {
    return `fade=t=in:st=0:d=${duration / 1000}`;
  },

  /**
   * Zoom transition - zooms in/out during transition
   */
  zoom: (_duration: number): string => {
    return `scale=iw*1.1:ih*1.1,pad=iw:ih:(ow-iw)/2:(oh-ih)/2`;
  },
};

/**
 * Effect Filter Generators
 */
export const EffectFilters = {
  /**
   * Color grading - adjust color temperature and tone
   */
  colorgrade: (intensity: number): string => {
    // Intensity 0-100, where 50 is neutral
    const colorTemp = (intensity - 50) * 0.1; // -5 to +5
    const saturation = 1 + (intensity - 50) * 0.01; // 0.5 to 1.5

    return `colortemperature=${colorTemp},saturation=${saturation}`;
  },

  /**
   * Blur effect - applies Gaussian blur
   */
  blur: (intensity: number): string => {
    // Intensity 0-100 maps to blur radius 0-30
    const radius = (intensity / 100) * 30;
    return `gblur=sigma=${radius}`;
  },

  /**
   * Brightness adjustment
   */
  brightness: (intensity: number): string => {
    // Intensity 0-100, where 50 is neutral (1.0)
    const brightness = 0.5 + (intensity / 100) * 1.5; // 0.5 to 2.0
    return `eq=brightness=${brightness - 1}`;
  },

  /**
   * Saturation adjustment
   */
  saturation: (intensity: number): string => {
    // Intensity 0-100, where 50 is neutral (1.0)
    const saturation = (intensity / 100) * 2; // 0 to 2.0
    return `hue=s=${saturation}`;
  },

  /**
   * Contrast adjustment
   */
  contrast: (intensity: number): string => {
    // Intensity 0-100, where 50 is neutral (1.0)
    const contrast = (intensity / 100) * 2; // 0 to 2.0
    return `eq=contrast=${contrast}`;
  },

  /**
   * Hue shift - rotates colors on the color wheel
   */
  hue: (intensity: number): string => {
    // Intensity 0-100 maps to hue shift -180 to +180 degrees
    const hueShift = (intensity - 50) * 3.6; // -180 to +180
    return `hue=h=${hueShift}`;
  },

  /**
   * Sharpen effect - increases edge definition
   */
  sharpen: (intensity: number): string => {
    // Intensity 0-100 maps to sharpen amount 0-2
    const amount = (intensity / 100) * 2;
    return `unsharp=m=${amount}:r=1:a=1`;
  },
};

/**
 * Build FFmpeg filter chain from effects
 */
export function buildEffectFilterChain(effects: Effect[]): string {
  if (effects.length === 0) return "";

  const filters = effects.map((effect) => {
    const filterFn = EffectFilters[effect.type as keyof typeof EffectFilters];
    if (!filterFn) {
      console.warn(`Unknown effect type: ${effect.type}`);
      return "";
    }
    return filterFn(effect.intensity);
  });

  return filters.filter((f) => f).join(",");
}

/**
 * Build FFmpeg filter chain from transition
 */
export function buildTransitionFilterChain(transition: Transition): string {
  const filterFn = TransitionFilters[transition.type as keyof typeof TransitionFilters];
  if (!filterFn) {
    console.warn(`Unknown transition type: ${transition.type}`);
    return "";
  }

  if (transition.type === "wipe" || transition.type === "slide") {
    return filterFn(transition.duration, transition.direction);
  }

  return filterFn(transition.duration);
}

/**
 * Validate effect parameters
 */
export function validateEffect(effect: Effect): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (effect.intensity < 0 || effect.intensity > 100) {
    errors.push("Effect intensity must be between 0 and 100");
  }

  if (!Object.keys(EffectFilters).includes(effect.type)) {
    errors.push(`Unknown effect type: ${effect.type}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate transition parameters
 */
export function validateTransition(transition: Transition): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (transition.duration < 100 || transition.duration > 5000) {
    errors.push("Transition duration must be between 100 and 5000 milliseconds");
  }

  if (!Object.keys(TransitionFilters).includes(transition.type)) {
    errors.push(`Unknown transition type: ${transition.type}`);
  }

  if ((transition.type === "wipe" || transition.type === "slide") && !transition.direction) {
    errors.push("Wipe and slide transitions require a direction");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get available transitions
 */
export function getAvailableTransitions(): {
  type: TransitionType;
  name: string;
  description: string;
  requiresDirection: boolean;
}[] {
  return [
    {
      type: "crossfade",
      name: "Crossfade",
      description: "Gradually transitions from one clip to another",
      requiresDirection: false,
    },
    {
      type: "dissolve",
      name: "Dissolve",
      description: "Smooth dissolve between clips",
      requiresDirection: false,
    },
    {
      type: "wipe",
      name: "Wipe",
      description: "Reveals new clip with a moving line",
      requiresDirection: true,
    },
    {
      type: "slide",
      name: "Slide",
      description: "Slides new clip in from the side",
      requiresDirection: true,
    },
    {
      type: "fade",
      name: "Fade",
      description: "Fades to black between clips",
      requiresDirection: false,
    },
    {
      type: "zoom",
      name: "Zoom",
      description: "Zooms in/out during transition",
      requiresDirection: false,
    },
  ];
}

/**
 * Get available effects
 */
export function getAvailableEffects(): {
  type: EffectType;
  name: string;
  description: string;
  defaultIntensity: number;
}[] {
  return [
    {
      type: "colorgrade",
      name: "Color Grade",
      description: "Adjust color temperature and saturation",
      defaultIntensity: 50,
    },
    {
      type: "blur",
      name: "Blur",
      description: "Apply Gaussian blur effect",
      defaultIntensity: 30,
    },
    {
      type: "brightness",
      name: "Brightness",
      description: "Adjust brightness levels",
      defaultIntensity: 50,
    },
    {
      type: "saturation",
      name: "Saturation",
      description: "Adjust color saturation",
      defaultIntensity: 50,
    },
    {
      type: "contrast",
      name: "Contrast",
      description: "Adjust image contrast",
      defaultIntensity: 50,
    },
    {
      type: "hue",
      name: "Hue Shift",
      description: "Rotate colors on the color wheel",
      defaultIntensity: 50,
    },
    {
      type: "sharpen",
      name: "Sharpen",
      description: "Increase edge definition",
      defaultIntensity: 30,
    },
  ];
}
