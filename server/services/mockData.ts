/**
 * Mock data service for development/testing mode
 * Provides placeholder data instead of calling LLM APIs
 */

export const mockScripts = {
  default: `# Product Commercial - 30 Second Script

## Scene 1: Opening (0-5s)
- Wide shot of product on clean white background
- Soft lighting, cinematic depth of field
- Text overlay: "Introducing [Product Name]"

## Scene 2: Product Showcase (5-15s)
- Product rotates slowly, showing all angles
- Close-ups of key features
- Text: "Engineered for perfection"

## Scene 3: Use Case (15-25s)
- Person using product in lifestyle setting
- Natural lighting, real-world environment
- Text: "Made for your lifestyle"

## Scene 4: Call to Action (25-30s)
- Product front and center
- Brand logo appears
- Text: "Available now at [website]"`,

  tech: `# Technical Product Demo - 60 Second Script

## Scene 1: Problem Statement (0-10s)
- Show common problem with existing solutions
- Dark, moody lighting
- Text: "The challenge"

## Scene 2: Solution Introduction (10-30s)
- Product enters frame
- Bright, energetic lighting
- Demonstrate key technical features
- Text: "The solution"

## Scene 3: Technical Details (30-50s)
- Close-ups of components
- Animated diagrams showing how it works
- Technical specifications on screen

## Scene 4: Conclusion (50-60s)
- Product in action
- Brand statement
- Call to action with website`,

  lifestyle: `# Lifestyle Brand Commercial - 45 Second Script

## Scene 1: Mood Setting (0-10s)
- Cinematic establishing shot
- Warm, natural lighting
- Subtle product placement

## Scene 2: Story Development (10-30s)
- Character interaction with product
- Emotional connection
- Multiple angles and perspectives

## Scene 3: Product Highlight (30-40s)
- Product becomes focal point
- Premium presentation
- Quality emphasis

## Scene 4: Brand Message (40-45s)
- Brand values conveyed
- Emotional resonance
- Call to action`,
};

export const mockVisualStyles = {
  default: `# Master Visual Style Guide

## Color Palette
- Primary: Deep Ocean Blue (#0D47A1)
- Secondary: Warm Gold (#FFB300)
- Accent: Crisp White (#FFFFFF)
- Background: Soft Gray (#F5F5F5)

## Lighting
- Key Light: 45° angle, soft diffusion
- Fill Light: Opposite side, 1:2 ratio
- Back Light: Rim lighting for depth
- Overall: Cinematic, warm temperature (3200K)

## Camera Work
- Primary: Static wide shots with slow push-ins
- Secondary: Smooth tracking shots
- Tertiary: Subtle parallax for depth
- Depth of Field: f/2.8 for subject isolation

## Typography
- Headlines: Bold, sans-serif, 48pt minimum
- Body: Clean sans-serif, 24pt minimum
- Hierarchy: Clear visual distinction between levels

## Composition
- Rule of thirds for main subjects
- Negative space for breathing room
- Symmetrical layouts for premium feel
- Asymmetrical for dynamic energy`,

  cinematic: `# Cinematic Visual Style

## Color Grading
- Shadows: Teal tint (#0D7377)
- Midtones: Neutral with slight warmth
- Highlights: Golden hour warmth (#FFB700)
- Saturation: Slightly desaturated for sophistication

## Lighting Setup
- Three-point lighting with emphasis on drama
- Practical lights as story elements
- Heavy use of shadows for mood
- Contrast ratio: 4:1 to 6:1

## Movement
- Smooth gimbal movements
- Slow, deliberate camera work
- Parallax layers for depth
- Minimal cuts, long takes preferred

## Mood
- Sophisticated and aspirational
- Emotional storytelling
- Premium positioning
- High production value`,

  modern: `# Modern Minimalist Style

## Aesthetic
- Clean lines and geometric shapes
- Minimal color palette (2-3 colors max)
- Lots of white/negative space
- Contemporary and fresh

## Lighting
- Flat, even lighting
- Minimal shadows
- High-key exposure
- Bright, airy feel

## Movement
- Quick, snappy cuts
- Modern transitions
- Dynamic angles
- Fast-paced energy

## Typography
- Bold, geometric sans-serif
- Large, statement-making text
- Minimal copy
- Modern color blocking`,
};

export const mockTechnicalShots = [
  {
    name: "Wide Establishing Shot",
    description: "Full product in environment context",
    duration: 3,
    camera: "Wide angle lens, static position",
  },
  {
    name: "Product Close-up",
    description: "Detailed view of main features",
    duration: 4,
    camera: "50mm lens, shallow depth of field",
  },
  {
    name: "Detail Shot",
    description: "Macro view of specific component",
    duration: 2,
    camera: "Macro lens, extreme close-up",
  },
  {
    name: "360 Rotation",
    description: "Product rotates to show all angles",
    duration: 5,
    camera: "Turntable rotation, fixed camera",
  },
  {
    name: "In-Use Shot",
    description: "Product being used in real scenario",
    duration: 4,
    camera: "Handheld, dynamic movement",
  },
  {
    name: "Lifestyle Integration",
    description: "Product in natural environment",
    duration: 5,
    camera: "Wide shot, cinematic framing",
  },
];

export const mockStoryboardFrames = [
  {
    sceneNumber: 1,
    description: "Opening shot - product on white background",
    visualStyle: "Minimalist, clean lighting",
    duration: 3,
    notes: "Soft diffused light, shallow depth of field",
  },
  {
    sceneNumber: 2,
    description: "Product feature highlight",
    visualStyle: "Close-up with warm accent lighting",
    duration: 4,
    notes: "Golden hour lighting, premium feel",
  },
  {
    sceneNumber: 3,
    description: "Product in use",
    visualStyle: "Lifestyle, natural environment",
    duration: 5,
    notes: "Real-world setting, authentic moment",
  },
  {
    sceneNumber: 4,
    description: "Call to action",
    visualStyle: "Bold typography, brand colors",
    duration: 3,
    notes: "High contrast, clear messaging",
  },
  {
    sceneNumber: 5,
    description: "Brand logo reveal",
    visualStyle: "Elegant animation",
    duration: 2,
    notes: "Subtle motion, premium presentation",
  },
];

export const mockBrandIdentities = {
  default: {
    name: "Premium Brand",
    description: "Luxury product positioning",
    colors: ["#0D47A1", "#FFB300", "#FFFFFF"],
    tone: "Sophisticated, aspirational",
    values: ["Quality", "Innovation", "Excellence"],
  },
  tech: {
    name: "Tech Innovation",
    description: "Cutting-edge technology brand",
    colors: ["#1976D2", "#00BCD4", "#000000"],
    tone: "Modern, forward-thinking",
    values: ["Innovation", "Reliability", "Performance"],
  },
  lifestyle: {
    name: "Lifestyle Brand",
    description: "Aspirational lifestyle positioning",
    colors: ["#D32F2F", "#FFC107", "#FFFFFF"],
    tone: "Energetic, inspiring",
    values: ["Authenticity", "Community", "Experience"],
  },
};

export const mockCharacterOptions = [
  {
    id: 1,
    name: "Professional Host",
    description: "Confident, articulate presenter",
    characteristics: ["Professional", "Trustworthy", "Authoritative"],
    ageRange: "30-45",
    style: "Business casual to formal",
  },
  {
    id: 2,
    name: "Lifestyle Influencer",
    description: "Relatable, authentic personality",
    characteristics: ["Approachable", "Genuine", "Inspiring"],
    ageRange: "25-35",
    style: "Contemporary casual",
  },
  {
    id: 3,
    name: "Expert Specialist",
    description: "Technical knowledge authority",
    characteristics: ["Knowledgeable", "Credible", "Detailed"],
    ageRange: "35-55",
    style: "Smart casual to technical",
  },
  {
    id: 4,
    name: "Brand Ambassador",
    description: "Embodiment of brand values",
    characteristics: ["Charismatic", "Aligned", "Memorable"],
    ageRange: "20-40",
    style: "Brand-aligned aesthetic",
  },
];

export const mockMoodboardImages = [
  {
    id: 1,
    title: "Premium Minimalist",
    description: "Clean, sophisticated aesthetic",
    mood: ["Luxurious", "Modern", "Refined"],
  },
  {
    id: 2,
    title: "Cinematic Drama",
    description: "Bold lighting and composition",
    mood: ["Dramatic", "Emotional", "Impactful"],
  },
  {
    id: 3,
    title: "Warm Lifestyle",
    description: "Natural, inviting environment",
    mood: ["Authentic", "Welcoming", "Aspirational"],
  },
  {
    id: 4,
    title: "Tech Forward",
    description: "Modern, dynamic presentation",
    mood: ["Innovative", "Energetic", "Progressive"],
  },
];

export function getMockScript(type: string = "default"): string {
  return mockScripts[type as keyof typeof mockScripts] || mockScripts.default;
}

export function getMockVisualStyle(type: string = "default"): string {
  return mockVisualStyles[type as keyof typeof mockVisualStyles] || mockVisualStyles.default;
}

export function getMockTechnicalShots() {
  return mockTechnicalShots;
}

export function getMockStoryboardFrames() {
  return mockStoryboardFrames;
}

export function getMockBrandIdentity(type: string = "default") {
  return mockBrandIdentities[type as keyof typeof mockBrandIdentities] || mockBrandIdentities.default;
}

export function getMockCharacterOptions() {
  return mockCharacterOptions;
}

export function getMockMoodboardImages() {
  return mockMoodboardImages;
}

/**
 * Mock LLM response with simulated delay
 */
export async function mockLLMResponse(content: string, delayMs: number = 1000): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(content);
    }, delayMs);
  });
}
