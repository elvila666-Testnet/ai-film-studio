# AI Film Studio - Production Pipeline UI Design

## Overview
The new interface is designed with a **Nuke/Flow-style production pipeline aesthetic**, featuring:
- Dark VFX software color scheme
- Linear workflow visualization
- Professional production tracking
- Stage-based progression system

## Design Philosophy

### Color Palette (Nuke-Inspired)
- **Background**: Very dark blue-gray (#0f1115) - like Nuke's node graph
- **Panels**: Slightly lighter gray (#1c1f26) - for cards and headers
- **Accent (Active)**: Orange/Amber (#ff9f1c) - for active pipeline stages
- **Primary (Approved)**: Cyan (#00d4ff) - for approved/completed actions
- **Success**: Green (#4ade80) - for completed stages
- **Borders**: Subtle dark gray (#2d3139) - professional separation

### Typography
- **Headers**: Bold, tight tracking, uppercase labels
- **Technical Info**: Monospace font for IDs, dates, status
- **Body**: Clean sans-serif for readability

## User Flow

### 1. Login Screen
- Minimal, centered card
- "AI FILM STUDIO" branding
- "Production Pipeline System" subtitle
- Authentication required message

### 2. Project Selection
- **Header**: Branding + user info
- **Left Panel**: "New Project" creation
  - Input field for project name
  - Orange "Create Project" button
- **Right Panel**: Projects list
  - Each project shows:
    - Project name
    - ID and creation date (monospace)
    - Delete button (on hover)
    - Chevron to enter project

### 3. Production Pipeline (Main Interface)

#### Layout
```
┌─────────────────────────────────────────────────┐
│  Header: Project Name | ID                      │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main Content Area                   │
│          │                                       │
│ 1. Brief │  [Current Stage Content]             │
│ 2. Script│                                       │
│ 3. Chars │                                       │
│ 4. Visual│                                       │
│ 5. Story │                                       │
│ 6. Video │                                       │
│ 7. Editor│                                       │
│ 8. Export│                                       │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

#### Sidebar - Pipeline Stages
- **Vertical list** of 8 production stages
- **Visual indicators**:
  - **Active stage**: Orange background, "Play" icon
  - **Completed stages**: Green tint, checkmark icon
  - **Pending stages**: Gray, muted
- **Connecting lines** between stages (orange when active/complete)
- **Click to navigate** between stages

#### Stage Progression
1. **Brief** - Human inputs project concept
2. **Script** - AI generates script, human reviews/edits
3. **Characters** - Define and cast characters
4. **Visual Style** - Generate mood boards
5. **Storyboard** - Create storyboard frames
6. **Video** - Generate video from approved storyboard
7. **Editor** - Edit and refine video
8. **Export** - Final export and delivery

## Key Features

### Approval Gates
- Each stage requires human approval before proceeding
- Visual feedback shows stage status
- Manual editing capabilities at each stage

### Production Tracking
- Monospace labels for technical information
- Stage numbers and order clearly visible
- Project ID and metadata always visible

### Professional Aesthetics
- Nuke-style dark theme
- Orange accents for active elements
- Cyan for primary actions
- Green for completed states
- Subtle animations (glow effects on active stages)

## Technical Implementation

### CSS Classes
- `.pipeline-container` - Main app container
- `.pipeline-header` - Top header bar
- `.pipeline-stage` - Individual stage cards
- `.pipeline-stage.active` - Active stage with glow
- `.pipeline-stage.complete` - Completed stage
- `.pipeline-connector` - Vertical lines between stages
- `.node-button` - Nuke-style buttons
- `.production-label` - Small caps technical labels

### Color Variables
```css
--background: 210 15% 8%;        /* Dark blue-gray */
--accent: 35 100% 55%;           /* Orange */
--primary: 190 85% 50%;          /* Cyan */
--success: 140 70% 45%;          /* Green */
--destructive: 0 75% 55%;        /* Red */
```

## Next Steps

1. **Test the interface** at http://localhost:3000
2. **Refine individual stage components** (Brief, Script, etc.)
3. **Add approval workflow logic**
4. **Implement stage completion tracking**
5. **Add production timeline visualization**

## Design Inspiration
- **Nuke**: Node-based compositing software
- **Flow Production Tracking**: VFX pipeline management
- **DaVinci Resolve**: Professional color grading UI
- **Unreal Engine**: Dark theme with accent colors
