# AI Film Studio - Complete User Manual

**Version:** 1.0  
**Author:** Manus AI  
**Last Updated:** January 30, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Account Management](#user-account-management)
4. [Brand Setup & Configuration](#brand-setup--configuration)
5. [Project Creation](#project-creation)
6. [Brief & Planning](#brief--planning)
7. [Script Generation & Editing](#script-generation--editing)
8. [Visual Style & References](#visual-style--references)
9. [Storyboard & Character Casting](#storyboard--character-casting)
10. [Voiceover Generation](#voiceover-generation)
11. [Video Editing & Composition](#video-editing--composition)
12. [Video Export & Delivery](#video-export--delivery)
13. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Introduction

**AI Film Studio** is a professional AI-powered film production platform that streamlines the entire creative workflow from concept to final video export. The system is built around a **Brand Brain** architecture that ensures all generated content—scripts, visuals, voiceovers, and music—aligns perfectly with your brand guidelines.

### Key Features

The platform provides an integrated production pipeline with AI-assisted content generation at every stage. Brand Intelligence ensures consistency across all creative elements, with compliance scoring validating alignment with your brand guidelines. Character casting and consistency checking prevent visual inconsistencies across shots. Professional-grade video editing with timeline-based composition and effects enables post-production refinement. Multi-format export supports delivery across different platforms and use cases.

### Who This Manual Is For

This manual is designed for producers, directors, content creators, and production teams who want to leverage AI to accelerate film and video production while maintaining strict brand consistency. No prior experience with AI tools is required—the interface guides you through each step of the creative process.

---

## Getting Started

### System Requirements

To use AI Film Studio, you'll need a modern web browser with JavaScript enabled. Recommended browsers include Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+. A stable internet connection is required for all AI generation features. For optimal performance, use a computer with at least 4GB RAM and a 1920x1080 resolution display.

### Accessing the Application

Navigate to your AI Film Studio deployment URL in your web browser. If you're accessing a self-hosted instance, use the URL provided by your administrator. For cloud-hosted deployments, use the Cloud Run service URL from your Google Cloud Console.

### First-Time Setup

Upon first access, you'll see the login page. Click the "Sign In" button to authenticate using your Manus account. If you don't have an account, create one by clicking "Create Account" and following the registration process. After successful authentication, you'll be redirected to the main dashboard.

---

## User Account Management

### Creating Your User Account

**Step 1: Navigate to Login**

Open AI Film Studio in your web browser. You'll see the login page with the application title and a prominent sign-in button.

**Step 2: Authenticate**

Click the "Sign In with Manus" button. You'll be redirected to the Manus authentication portal. Enter your email address and password. If you don't have a Manus account, click "Create Account" and complete the registration form with your name, email, and password.

**Step 3: Authorize Application Access**

After authentication, you may be asked to authorize AI Film Studio to access your Manus account. Review the requested permissions and click "Authorize" to proceed. This grants the application permission to manage your projects and content.

**Step 4: Complete Setup**

You'll be redirected back to AI Film Studio. Your user profile is now created and linked to your account. You can now access the main dashboard and begin creating projects.

### Managing Your Profile

**Accessing Profile Settings**

Click your profile icon in the top-right corner of the application. Select "Profile Settings" from the dropdown menu. Your profile page displays your name, email, account creation date, and last login information.

**Updating Profile Information**

To update your profile, click the "Edit Profile" button. Modify your name or other information as needed. Click "Save Changes" to apply updates. Your profile information is immediately synchronized across all your projects.

**Changing Your Password**

In Profile Settings, click "Change Password" under the Security section. Enter your current password, then enter your new password twice to confirm. Click "Update Password" to save changes. You'll be logged out and need to log in again with your new password.

**Managing API Keys**

If you need to integrate AI Film Studio with external tools, you can generate API keys in the Developer section of your profile. Click "Generate New Key" to create an API key. Store this key securely—you won't be able to view it again after creation.

### Logging Out

To log out, click your profile icon in the top-right corner and select "Log Out". You'll be redirected to the login page. Your session will be terminated and you'll need to log in again to access the application.

---

## Brand Setup & Configuration

### Understanding Brand Intelligence

The **Brand Brain** system is the foundation of AI Film Studio. It ensures every piece of content you create—scripts, visuals, storyboards, voiceovers—aligns perfectly with your brand identity. Rather than manually enforcing consistency, the AI analyzes all generated content against your brand guidelines and provides compliance scores.

### Creating Your First Brand

**Step 1: Access Brand Management**

From the main dashboard, click "Brands" in the left navigation menu. If no brands exist, you'll see an empty state with a "Create Brand" button.

**Step 2: Click Create Brand**

Click the "Create Brand" button. A form will appear with four essential fields that define your brand identity.

**Step 3: Define Brand Parameters**

Fill in the following information:

**Target Customer:** Describe your ideal customer in 2-3 sentences. Example: "Tech-savvy millennials aged 25-35 who value sustainability and innovation. They shop online, follow social media influencers, and prefer brands with authentic values."

**Aesthetic:** Define your visual style and design philosophy. Example: "Modern, minimalist design with bold accent colors (electric blue and coral). Clean typography, lots of white space, geometric shapes. Cinematic photography with natural lighting."

**Mission:** State your brand's core purpose and what you're trying to achieve. Example: "To make sustainable technology accessible and affordable to everyone. We believe technology should empower people, not complicate their lives."

**Core Messaging:** Define the key messages you want to communicate. Example: "Quality without compromise. Sustainability as standard. Technology that works for you. Innovation with integrity."

**Step 4: Save Brand**

Click "Save Brand" to create your brand profile. The system will now use these guidelines to analyze and score all generated content.

### Editing Brand Guidelines

To modify an existing brand, click the brand name in the Brands list. Click the "Edit" button to modify any of the four brand parameters. After making changes, click "Save Changes" to update the brand profile. All future content generation will use the updated guidelines.

### Viewing Brand Compliance Scores

When content is generated, it receives compliance scores across five dimensions: overall alignment (0-100), target customer fit, aesthetic consistency, mission alignment, and messaging coherence. Scores above 80 indicate strong brand alignment. Scores between 50-80 suggest minor adjustments needed. Scores below 50 indicate significant deviation from brand guidelines.

---

## Project Creation

### Starting a New Project

**Step 1: Navigate to Projects**

From the main dashboard, click "Projects" in the left navigation menu. You'll see a list of your existing projects and a "New Project" button.

**Step 2: Click New Project**

Click the "New Project" button. A project creation dialog will appear.

**Step 3: Select Brand**

Choose the brand that will guide this project. This is crucial—the selected brand will be used to analyze all generated content. If you haven't created a brand yet, go back to Brand Setup first.

**Step 4: Enter Project Details**

Fill in the following information:

**Project Name:** Give your project a descriptive name. Example: "Q1 2026 Product Launch Campaign" or "Holiday Season Commercial Series"

**Project Description:** Briefly describe the project's goals and scope. Example: "30-second commercial for new product launch targeting social media platforms"

**Project Type:** Select the type of content you're creating: Commercial, Documentary, Training Video, Social Media Content, Music Video, or Other

**Target Duration:** Specify the desired video length. Example: 30 seconds, 60 seconds, 2 minutes, etc.

**Step 5: Create Project**

Click "Create Project" to initialize your project. You'll be taken to the project editor where you can begin the creative workflow.

### Project Dashboard

The project editor displays five main tabs representing the production pipeline:

**Brief Tab** — Define your project concept, goals, and creative direction

**Script Tab** — Generate and refine your screenplay

**Visual Style Tab** — Establish the visual aesthetic and cinematography approach

**Technical Shots Tab** — Break down scenes into individual shots with technical specifications

**Storyboard Tab** — Generate visual frames for each shot and manage character consistency

**Video Editor Tab** — Compose, edit, and add effects to your final video

---

## Brief & Planning

### Creating Your Project Brief

The Brief is your creative foundation. It captures your vision, goals, and key creative decisions that will guide all subsequent content generation.

**Step 1: Open Brief Tab**

In your project, click the "Brief" tab. You'll see a text editor with a prompt asking you to describe your project concept.

**Step 2: Write Your Brief**

Provide comprehensive information about your project. Include the following elements:

**Concept:** What is your project about? What's the core idea or story you're telling?

**Target Audience:** Who are you creating this for? Describe their demographics, interests, and viewing habits.

**Key Messages:** What do you want the audience to understand or feel after watching?

**Tone & Style:** What's the overall mood? Serious, humorous, inspirational, dramatic?

**Visual References:** Any specific films, commercials, or visual styles you want to emulate?

**Constraints:** Any limitations to consider? Budget, timeline, technical requirements?

**Example Brief:**

> "We're creating a 60-second product launch commercial for our new sustainable water bottle. The target audience is environmentally conscious millennials aged 25-40 who value quality and sustainability. The key message is that our product combines premium quality with environmental responsibility. The tone should be inspiring and aspirational, showing real people using the product in their daily lives. We want a cinematic, nature-focused visual style with lots of outdoor scenes and natural lighting. The video should feel authentic and documentary-like rather than overly produced. Constraint: Must be suitable for Instagram, TikTok, and YouTube."

**Step 3: Save Brief**

Click "Save Brief" to store your project brief. The system will use this information to guide script generation and ensure all content aligns with your vision.

### Generating Brief Insights

Click "Generate Insights" to have the AI analyze your brief and provide recommendations for:

- Key scenes to include
- Narrative structure suggestions
- Visual style recommendations
- Character archetypes to consider
- Pacing and timing suggestions

These insights will inform your script generation and visual planning.

### Refining Your Brief

As your project develops, you may want to refine your brief. Click "Edit Brief" to modify the text. The system will re-analyze your updated brief and adjust recommendations accordingly.

---

## Script Generation & Editing

### Generating Your Script

**Step 1: Open Script Tab**

Click the "Script" tab in your project editor. You'll see an empty text area with a "Generate Script" button.

**Step 2: Click Generate Script**

Click "Generate Script". The AI will use your project brief and brand guidelines to create a screenplay. This typically takes 30-60 seconds. You'll see a loading indicator while generation is in progress.

**Step 3: Review Generated Script**

Once generation completes, your screenplay will appear in the editor. The script is formatted in industry-standard screenplay format with scene headings, action descriptions, character names, dialogue, and parentheticals.

**Example Generated Script:**

```
FADE IN:

EXT. MOUNTAIN TRAIL - EARLY MORNING

Mist rises from a valley below. Sunlight filters through pine trees.

ALEX, 30s, athletic and confident, hikes along a narrow trail. She's
carrying our water bottle, clipped to her backpack.

ALEX
(to herself)
Perfect morning for a hike.

She stops at a scenic overlook. Mountains stretch to the horizon.
She takes a long drink from the water bottle. Pure satisfaction.

ALEX (CONT'D)
This is why I do it. This is why
it matters.

She looks at the bottle, then at the pristine landscape.

ALEX (CONT'D)
And now, I can do it without guilt.
```

### Editing Your Script

**Making Direct Edits**

Click anywhere in the script text to place your cursor. You can directly edit the text, add scenes, modify dialogue, or restructure the screenplay. The system tracks your changes and maintains proper screenplay formatting.

**Using the Refine Feature**

For more sophisticated edits, use the "Refine Script" button. This opens a dialog where you can specify what you want to change. Examples include:

- "Make the dialogue more natural and conversational"
- "Add more emotional depth to the main character"
- "Shorten the opening scene by 30%"
- "Add a humorous moment in the middle"
- "Make the ending more impactful"

Enter your refinement request and click "Apply". The AI will regenerate the affected sections while maintaining the overall structure.

### Checking Brand Compliance

After generating or editing your script, click "Check Compliance" to see how well your script aligns with your brand guidelines. You'll receive:

- Overall compliance score (0-100)
- Target customer alignment score
- Aesthetic consistency score
- Mission alignment score
- Messaging coherence score
- Specific recommendations for improvement

Scores above 80 indicate strong brand alignment. If your score is lower, review the recommendations and use the Refine feature to adjust your script.

### Saving Your Script

Click "Save Script" to store your screenplay. Your script is automatically saved every 5 minutes, but you can also save manually at any time. You can always revert to previous versions by clicking "Version History".

---

## Visual Style & References

### Establishing Your Visual Aesthetic

The Visual Style tab is where you define the cinematography, color palette, lighting approach, and overall visual direction for your project.

**Step 1: Open Visual Style Tab**

Click the "Visual Style" tab in your project editor. You'll see a text editor for describing your visual approach.

**Step 2: Write Your Visual Style Guide**

Describe the visual direction for your project. Include:

**Cinematography:** Camera movement, shot types, framing approach. Example: "Handheld camera with natural movement. Mix of wide establishing shots and intimate close-ups. Lots of movement and energy."

**Color Palette:** Primary and accent colors. Example: "Natural earth tones: greens, browns, warm whites. Accent colors: electric blue and coral. Avoid artificial colors."

**Lighting:** Lighting approach and mood. Example: "Natural outdoor lighting. Golden hour preferred. Soft, diffused light. Avoid harsh shadows."

**Composition:** How you want scenes framed. Example: "Rule of thirds. Lots of negative space. Symmetrical framing for product shots."

**Special Techniques:** Any specific techniques or effects. Example: "Slow motion for emotional moments. Time-lapse for environmental scenes. Shallow depth of field for product focus."

**Example Visual Style:**

> "Cinematic and aspirational with a documentary feel. Handheld camera with smooth, intentional movement. Wide shots of natural landscapes with intimate close-ups of people. Color palette: natural earth tones (greens, browns, warm whites) with electric blue accents. Golden hour lighting with soft, diffused light. Shallow depth of field to isolate subjects from background. Slow motion for emotional moments. No artificial effects or transitions—let the content speak for itself."

**Step 3: Generate Visual Style**

Click "Generate Visual Style" to have the AI create detailed visual guidelines based on your description. This includes specific recommendations for camera settings, lighting setups, and composition techniques.

### Uploading Reference Images

Reference images help the AI understand your desired visual style more accurately.

**Step 1: Click Upload References**

Click the "Upload Reference Images" button. A file dialog will appear.

**Step 2: Select Images**

Choose 3-5 reference images that exemplify your desired visual style. These can be screenshots from films, commercials, photography, or mood boards. Select multiple images and click "Open".

**Step 3: Review Uploaded Images**

Your reference images will appear in a gallery. You can delete any image by clicking the X button, or add more by clicking "Add More References".

**Step 4: Analyze References**

Click "Analyze References" to have the AI examine your images and extract visual patterns. The system will identify:

- Dominant colors and color palettes
- Lighting approaches and mood
- Composition patterns and framing
- Camera movement and shot types
- Overall aesthetic and style

These insights will be incorporated into your visual style guide and used to influence storyboard generation.

### Creating a Moodboard

A moodboard is a collection of visual references organized by theme or concept.

**Step 1: Click Create Moodboard**

Click the "Create Moodboard" button in the Visual Style tab. A moodboard creation dialog will appear.

**Step 2: Name Your Moodboard**

Give your moodboard a descriptive name. Example: "Outdoor Adventure Aesthetic" or "Product Hero Shots"

**Step 3: Add Images**

Click "Add Images" to upload images to your moodboard. You can upload multiple images at once. Organize them by dragging and dropping to reorder.

**Step 4: Add Descriptions**

For each image, you can add a description explaining why it's included and what elements you want to capture. Example: "Golden hour lighting with warm tones" or "Shallow depth of field with blurred background"

**Step 5: Save Moodboard**

Click "Save Moodboard" to create your moodboard. It will be linked to your project and available for reference during storyboard generation.

### Checking Visual Compliance

Click "Check Compliance" to see how well your visual style aligns with your brand guidelines. You'll receive compliance scores for aesthetic consistency and recommendations for adjustments.

---

## Storyboard & Character Casting

### Understanding Storyboarding

A storyboard is a sequence of visual frames that illustrate your script scene-by-scene. Each frame shows the composition, camera angle, character positions, and key visual elements. AI Film Studio generates storyboards automatically from your script and visual style guide.

### Generating Your Storyboard

**Step 1: Open Storyboard Tab**

Click the "Storyboard" tab in your project editor. You'll see your script on the left and an empty storyboard area on the right.

**Step 2: Click Generate Storyboard**

Click "Generate Storyboard". The AI will analyze your script and visual style to create individual frames for each scene. This process typically takes 2-5 minutes depending on script length. You'll see a progress indicator showing generation status.

**Step 3: Review Generated Frames**

Once generation completes, your storyboard will display as a grid of visual frames. Each frame shows:

- Scene number and heading
- Visual composition and camera angle
- Character positions and actions
- Key visual elements and props
- Lighting and color information

### Managing Characters

**Step 1: Extract Characters from Script**

Click "Extract Characters" to have the AI identify all characters in your script. The system will create character profiles based on script descriptions and dialogue.

**Step 2: Review Character List**

You'll see a list of all characters with their descriptions. Example:

- **Alex** — 30s, athletic, confident. Main protagonist.
- **Jordan** — 40s, wise mentor figure. Supportive role.
- **Sam** — 20s, enthusiastic newcomer. Comic relief.

**Step 3: Create Character Library**

Click "Create Character Library" to save these character profiles to your brand. This allows you to maintain character consistency across multiple projects.

**Step 4: Assign Actors/Models**

For each character, you can assign a specific actor, model, or visual reference. Click on a character to open its details panel. Upload a reference image or select from your character library.

### Ensuring Character Consistency

**Step 1: Check Consistency**

Click "Check Character Consistency" to analyze whether characters appear consistent across all storyboard frames. The system will identify:

- Appearance changes (clothing, hairstyle, etc.)
- Facial feature variations
- Inconsistent character positioning
- Costume or makeup issues

**Step 2: Review Consistency Report**

You'll see a report showing which frames have consistency issues. Frames with high consistency scores (80+) are marked green. Frames with lower scores (50-80) are marked yellow. Frames with significant issues (<50) are marked red.

**Step 3: Regenerate Inconsistent Frames**

For frames with consistency issues, click "Regenerate" to create a new version that maintains character consistency. The AI will regenerate the frame while keeping the character appearance consistent with other frames.

**Step 4: Lock Character Appearance**

Once you're satisfied with a character's appearance in a frame, click "Lock Appearance" to prevent accidental changes during future regenerations.

### Editing Individual Frames

**Regenerating a Frame**

If you want to change a storyboard frame, click the frame to select it. Click "Regenerate" to create a new version with the same scene but different composition or camera angle.

**Refining a Frame**

Click "Refine" to specify what you want to change. Examples:

- "Change the camera angle to a low angle shot"
- "Add more dramatic lighting"
- "Show the character from a different perspective"
- "Include the product more prominently"

**Adding Notes**

Click "Add Notes" to add production notes to a frame. These notes will be visible to the video editor and production team. Example: "Use slow motion for this shot" or "This is a hero shot—make it dramatic"

### Reordering Frames

You can reorder storyboard frames by dragging and dropping them. Click and hold a frame, then drag it to its new position. The system will automatically update scene numbering.

### Exporting Storyboard

Click "Export Storyboard" to download your storyboard as a PDF. The PDF includes all frames with scene numbers, descriptions, and production notes. This can be shared with your production team.

---

## Voiceover Generation

### Understanding Voiceovers

Voiceovers are audio recordings of dialogue or narration that accompany your video. AI Film Studio uses ElevenLabs technology to generate natural-sounding voiceovers that match your brand voice and tone.

### Setting Up Your Brand Voice

**Step 1: Access Voice Profiles**

Click "Voice Profiles" in the left navigation menu. You'll see a list of available voice profiles or an option to create a new one.

**Step 2: Create Brand Voice Profile**

Click "Create Voice Profile". A form will appear asking for:

**Voice Name:** Give your brand voice a name. Example: "Professional & Warm" or "Energetic & Youthful"

**Voice Tone:** Select the tone of voice: Professional, Friendly, Energetic, Calm, Authoritative, Conversational, etc.

**Language:** Select the primary language for voiceovers. Supported languages include English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, Norwegian, Danish, Finnish, Polish, Russian, Japanese, Korean, Chinese (Mandarin), and others.

**Speed:** Adjust the speaking speed from 50% (slow) to 200% (fast). 100% is normal speed.

**Pitch:** Adjust the voice pitch from 50% (lower) to 200% (higher). 100% is neutral.

**Step 3: Select Voice Actor**

Choose from available voice actors. ElevenLabs provides a variety of professional voice options in different genders, ages, and accents. Listen to voice samples to find the best match for your brand.

**Step 4: Save Voice Profile**

Click "Save Voice Profile" to create your brand voice. This profile will be used for all voiceover generation in this brand.

### Generating Voiceovers

**Step 1: Open Voiceover Tab**

In your project editor, click the "Voiceover" tab. You'll see your script with dialogue and narration highlighted.

**Step 2: Select Text for Voiceover**

The system automatically identifies all dialogue and narration in your script. You can select which sections to generate voiceovers for. By default, all dialogue and narration is selected.

**Step 3: Click Generate Voiceovers**

Click "Generate Voiceovers". The AI will generate audio for all selected text using your brand voice profile. This typically takes 1-2 minutes. You'll see a progress indicator.

**Step 4: Review & Preview**

Once generation completes, you'll see audio waveforms for each voiceover. Click the play button to preview each voiceover. You can:

- Listen to the full voiceover
- Adjust timing and pacing
- Regenerate specific voiceovers
- Download individual audio files

### Editing Voiceovers

**Adjusting Timing**

If a voiceover is too fast or too slow, click "Adjust Timing" and select a new speed (50-200%). The system will regenerate the voiceover at the new speed.

**Changing Voice**

To use a different voice actor, click "Change Voice" and select a new voice from the available options. The voiceover will be regenerated with the new voice.

**Adding Emphasis**

You can add emphasis to specific words or phrases. Select the text you want to emphasize and click "Add Emphasis". The voiceover will be regenerated with more emphasis on those words.

**Regenerating Voiceovers**

If you're not satisfied with a voiceover, click "Regenerate" to create a new version. You can regenerate multiple times until you're happy with the result.

### Downloading Voiceovers

Click "Download Voiceovers" to download all generated voiceovers as individual audio files (MP3 format). You can then import these into your video editor or use them separately.

---

## Video Editing & Composition

### Understanding the Video Editor

The Video Editor is where you compose your final video by combining storyboard frames, voiceovers, music, effects, and transitions. It features a professional timeline interface similar to industry-standard editing software.

### Accessing the Video Editor

**Step 1: Click Video Editor Tab**

In your project editor, click the "Video Editor" tab. The editor interface will load with four main panels:

- **Media Pool (Left)** — Your storyboard frames, audio files, and available effects
- **Canvas (Center)** — Live preview of your video
- **Timeline (Bottom)** — Multi-track editing interface
- **Inspector (Right)** — Properties and effects for selected clips

**Step 2: Import Storyboard**

Click "Import Storyboard" to automatically populate the timeline with your storyboard frames. Each frame will be placed on the video track with default timing (2 seconds per frame).

**Step 3: Import Audio**

Click "Import Audio" to add your generated voiceovers to the audio track. Voiceovers will be automatically synced to the video timeline.

### Timeline Editing

**Understanding the Timeline**

The timeline displays your video composition horizontally. Time flows from left to right. Each horizontal line represents a different track:

- **Video Track** — Your storyboard frames and visual elements
- **Audio Track 1** — Voiceovers and dialogue
- **Audio Track 2** — Music and ambient sound
- **Audio Track 3** — Sound effects

**Adjusting Frame Duration**

Click and drag the right edge of a frame clip to extend or shorten its duration. For example, to make a frame display for 3 seconds instead of 2, drag the right edge to the right.

**Reordering Clips**

Click and drag a clip to move it to a different position on the timeline. You can also drag clips between tracks to reorganize your composition.

**Adding Transitions**

To add a transition between two clips, click the space between them. Select a transition type: Cut, Fade, Dissolve, Wipe, Slide, or Zoom. The transition will be applied with default duration (0.5 seconds).

**Adjusting Transition Duration**

Click and drag the transition to extend or shorten its duration. A longer transition creates a smoother effect.

### Working with Audio

**Adjusting Audio Levels**

Click an audio clip to select it. In the Inspector panel on the right, you'll see volume controls. Drag the volume slider to adjust the audio level. You can also see a waveform showing the audio signal.

**Syncing Audio to Video**

If your voiceover doesn't sync perfectly with the video, you can adjust timing. Click and drag the audio clip to move it earlier or later on the timeline. Fine-tune the timing until the audio matches the video.

**Adding Music**

Click "Add Music" to browse available royalty-free music tracks. Select a track and click "Add to Timeline". The music will be added to Audio Track 2. Adjust the volume so music doesn't overpower voiceovers.

**Adding Sound Effects**

Click "Add Sound Effects" to browse available sound effects. Select an effect and click "Add to Timeline". Position the effect at the appropriate time on the timeline. Adjust volume as needed.

### Adding Effects & Filters

**Applying Color Correction**

Select a video clip. In the Inspector panel, click "Color Correction". Adjust:

- **Brightness** — Make the clip brighter or darker
- **Contrast** — Increase or decrease contrast
- **Saturation** — Make colors more or less vibrant
- **Hue** — Shift the overall color tone

**Applying Motion Effects**

Select a video clip. Click "Motion Effects" in the Inspector. Options include:

- **Zoom** — Slowly zoom in or out during the clip
- **Pan** — Move the frame left, right, up, or down
- **Rotation** — Rotate the frame
- **Speed** — Speed up or slow down the clip (for slow-motion or fast-motion effects)

**Applying Filters**

Select a video clip. Click "Filters" in the Inspector. Available filters include:

- **Black & White** — Convert to grayscale
- **Sepia** — Add vintage sepia tone
- **Blur** — Blur the entire frame or specific areas
- **Sharpen** — Increase sharpness and detail
- **Vignette** — Darken edges of the frame

### Previewing Your Video

**Playing the Timeline**

Click the play button in the Canvas area to preview your video. The playhead will move across the timeline showing which section is currently playing. Use the pause button to stop playback.

**Scrubbing the Timeline**

Click and drag the playhead (vertical line) on the timeline to jump to any point in your video. This allows you to quickly navigate to specific sections.

**Adjusting Preview Quality**

If playback is choppy, reduce the preview quality. Click the quality dropdown in the Canvas area and select a lower resolution. This speeds up preview playback while editing.

### Exporting Your Video

See the "Video Export & Delivery" section below for detailed export instructions.

---

## Video Export & Delivery

### Preparing for Export

Before exporting your final video, ensure:

- All clips are properly timed and positioned on the timeline
- Audio levels are balanced (voiceovers, music, sound effects)
- Color correction and effects are applied
- Video duration matches your target (30 seconds, 60 seconds, etc.)
- Brand compliance has been verified

### Export Settings

**Step 1: Click Export Video**

In the Video Editor, click "Export Video" in the top toolbar. An export dialog will appear.

**Step 2: Select Export Format**

Choose your desired export format:

- **MP4 (H.264)** — Most compatible format, suitable for all platforms
- **MP4 (H.265)** — Smaller file size, better quality, requires modern devices
- **WebM** — Optimized for web, smaller file size
- **MOV** — Apple format, suitable for Mac and iOS
- **AVI** — Legacy format, larger file size

For most use cases, MP4 (H.264) is recommended.

**Step 3: Select Resolution**

Choose your export resolution:

- **1080p (1920x1080)** — Standard HD, suitable for most platforms
- **2K (2560x1440)** — High definition, larger file size
- **4K (3840x2160)** — Ultra HD, very large file size, requires powerful devices
- **720p (1280x720)** — Lower quality, smaller file size, suitable for web

For social media, 1080p is recommended. For broadcast or cinema, use 2K or 4K.

**Step 4: Select Frame Rate**

Choose your frame rate:

- **24fps** — Cinematic look, standard for film
- **30fps** — Standard for video, suitable for most platforms
- **60fps** — Smooth motion, suitable for action or sports content

30fps is recommended for most use cases.

**Step 5: Adjust Quality Settings**

- **Bitrate** — Higher bitrate = better quality but larger file size. Recommended: 5-10 Mbps for 1080p
- **Audio Bitrate** — Quality of audio. Recommended: 128-256 kbps

**Step 6: Add Metadata**

- **Title** — Your video title
- **Description** — Brief description of your video
- **Tags** — Keywords for searching and categorization
- **Creator** — Your name or company name

**Step 7: Start Export**

Click "Export Video" to begin the export process. A progress indicator will show export status. Export time depends on video length and selected quality settings. A 60-second video typically takes 2-5 minutes to export.

### Export Formats for Different Platforms

| Platform | Recommended Format | Resolution | Frame Rate | Notes |
|----------|-------------------|-----------|-----------|-------|
| YouTube | MP4 (H.264) | 1080p or 4K | 30fps or 60fps | Supports wide range of formats |
| Instagram | MP4 (H.264) | 1080p | 30fps | Square (1:1) or vertical (9:16) for Stories |
| TikTok | MP4 (H.264) | 1080p | 30fps | Vertical (9:16) format recommended |
| Facebook | MP4 (H.264) | 1080p | 30fps | Supports various aspect ratios |
| LinkedIn | MP4 (H.264) | 1080p | 30fps | Landscape (16:9) recommended |
| Twitter | MP4 (H.264) | 1080p | 30fps | Supports up to 512MB file size |
| Email | MP4 (H.264) | 720p | 30fps | Smaller file size for email delivery |
| Website | MP4 (H.264) or WebM | 1080p | 30fps | WebM for better compression |
| Broadcast | MOV or MP4 | 2K or 4K | 24fps or 30fps | Consult broadcast specifications |

### Downloading Your Video

Once export completes, you'll see a "Download" button. Click to download your video file to your computer. The file will be named with your project name and export settings. Example: `ProjectName_1080p_30fps.mp4`

### Uploading to Platforms

**YouTube**

1. Go to youtube.com and sign in to your account
2. Click the upload icon in the top right
3. Select your video file
4. Add title, description, and tags
5. Select visibility (Public, Unlisted, or Private)
6. Click "Publish"

**Instagram**

1. Open Instagram app or web
2. Click the + icon to create new post
3. Select your video file
4. Add caption and tags
5. Select where to share (Feed, Stories, Reels)
6. Click "Share"

**TikTok**

1. Open TikTok app
2. Click the + icon to create new video
3. Select your video file
4. Add effects, music, text (optional)
5. Add caption and hashtags
6. Click "Post"

**Facebook**

1. Go to facebook.com and sign in
2. Click "Create" or go to your Page
3. Click "Video"
4. Select your video file
5. Add title, description, and tags
6. Click "Post"

### Sharing Your Video

**Creating a Shareable Link**

After uploading to a platform, you can share the link directly. Copy the video URL and share via email, messaging, or social media.

**Embedding in Websites**

Most platforms provide embed codes. Copy the embed code from the platform and paste it into your website HTML to embed the video.

**Downloading for Offline Use**

Your exported video file can be shared via file transfer services like Google Drive, Dropbox, or WeTransfer. Simply upload the file and share the link with others.

---

## Troubleshooting & FAQ

### Common Issues

**Issue: Script generation is taking too long**

**Solution:** Script generation typically takes 30-60 seconds. If it's taking longer than 5 minutes, try refreshing the page or checking your internet connection. If the problem persists, contact support.

**Issue: Generated images don't match my visual style**

**Solution:** Upload more reference images to your moodboard. The AI learns from examples. Also ensure your visual style description is detailed and specific. Use the "Refine" feature to request specific adjustments.

**Issue: Character appearances are inconsistent across frames**

**Solution:** Use the "Check Character Consistency" feature to identify problematic frames. Regenerate inconsistent frames and lock character appearances once satisfied. Provide more detailed character descriptions in your character library.

**Issue: Voiceover audio is out of sync with video**

**Solution:** In the Video Editor, select the audio clip and drag it to adjust timing. You can also adjust frame durations to match voiceover timing. Fine-tune until audio and video are synchronized.

**Issue: Video export is failing**

**Solution:** Ensure you have sufficient disk space for the export file. Try exporting at a lower resolution or bitrate. Check that your browser supports the export format. If the problem persists, try a different browser.

**Issue: My brand compliance score is low**

**Solution:** Review the specific recommendations provided with your compliance score. Use the "Refine" feature to adjust content to better align with brand guidelines. Ensure your brand parameters are clearly defined.

### Frequently Asked Questions

**Q: How long does it take to create a complete video?**

A: The timeline varies based on project complexity. A simple 30-second video might take 30-60 minutes from start to finish. A more complex project with multiple scenes and effects might take 2-4 hours. Most of this time is spent on generation and refinement rather than manual editing.

**Q: Can I use AI Film Studio for commercial projects?**

A: Yes, absolutely. The platform is designed for professional production. All generated content is owned by you and can be used commercially. Ensure you have proper licenses for any third-party music or sound effects used.

**Q: What if I'm not happy with generated content?**

A: You can regenerate any content as many times as needed. Use the "Refine" feature to specify what you want to change. Provide more detailed instructions or reference images to guide the AI toward your desired result.

**Q: Can multiple people work on the same project?**

A: Currently, projects are individual user accounts. For team collaboration, you can export your project and share it with team members, or have team members create separate projects and combine elements during final editing.

**Q: What are the file size limits for uploads?**

A: Reference images are limited to 10MB each. Audio files are limited to 100MB. Video files are limited to 500MB. Contact support if you need to work with larger files.

**Q: Can I edit my brand guidelines after creating projects?**

A: Yes, you can edit brand guidelines at any time. Existing projects will continue to use the brand guidelines that were active when they were created. To apply updated guidelines to existing projects, regenerate content after updating your brand.

**Q: What happens if I delete a project?**

A: Deleted projects cannot be recovered. Ensure you export or download any content you want to keep before deleting a project. Consider archiving important projects instead of deleting them.

**Q: Can I download my projects for backup?**

A: Yes, you can export individual components (scripts, storyboards, videos) from your projects. For complete project backup, contact support for data export options.

**Q: What file formats does the platform support?**

A: **Video:** MP4, MOV, WebM, AVI. **Audio:** MP3, WAV, AAC, OGG. **Images:** JPG, PNG, GIF, WebP. **Documents:** TXT, PDF (for reference).

**Q: How do I get support if I encounter issues?**

A: Visit https://help.manus.im to submit support requests. Include details about your issue, the project you're working on, and any error messages you received. Our support team typically responds within 24 hours.

---

## Best Practices & Tips

### Optimizing Your Workflow

**Start with a Strong Brief**

Invest time in creating a comprehensive brief. A detailed brief leads to better script generation and more aligned visual content. The better your brief, the fewer refinements you'll need.

**Use Reference Images Liberally**

Upload reference images for visual style, moodboards, and character casting. The AI learns from examples. More references lead to better results.

**Check Compliance Regularly**

Check brand compliance scores after each generation step. Address low scores early rather than waiting until the end. It's easier to adjust scripts than to regenerate entire storyboards.

**Iterate and Refine**

Don't expect perfect results on the first generation. Use the "Refine" feature to make adjustments. Multiple iterations often lead to better final results than trying to get it perfect immediately.

**Save Frequently**

The system auto-saves, but manually save your work frequently using the Save buttons. This ensures you don't lose any changes.

**Organize Your Assets**

Use meaningful names for projects, brands, and moodboards. Organize reference images logically. Good organization makes it easier to find assets and maintain consistency across projects.

### Advanced Techniques

**Creating Consistent Visual Styles Across Projects**

Create detailed moodboards and character libraries within your brand. Reuse these assets across multiple projects to maintain consistent visual identity.

**Optimizing for Different Platforms**

Create multiple export versions optimized for different platforms. YouTube videos can be longer and higher quality. Social media videos should be shorter and optimized for vertical viewing.

**A/B Testing Content**

Generate multiple versions of scenes and compare them. Export different versions and test with your audience to see which resonates best.

**Batch Processing**

If creating multiple videos for a campaign, create them in sequence. Reuse successful scripts, visual styles, and voiceovers across videos to maintain consistency.

---

## Appendix: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S / Cmd+S | Save current work |
| Ctrl+Z / Cmd+Z | Undo last action |
| Ctrl+Y / Cmd+Y | Redo last action |
| Spacebar | Play/Pause timeline |
| Left Arrow | Move playhead left 1 frame |
| Right Arrow | Move playhead right 1 frame |
| Delete | Delete selected clip |
| Ctrl+A / Cmd+A | Select all |
| Ctrl+C / Cmd+C | Copy selected |
| Ctrl+V / Cmd+V | Paste |
| Ctrl+X / Cmd+X | Cut |
| F | Fit to window |
| Z | Zoom in |
| Shift+Z | Zoom out |

---

## Appendix: Glossary

**Animatic** — A sequence of storyboard frames edited together with timing, voiceover, and sound effects to preview the final video.

**Brand Brain** — The AI-powered system that ensures all generated content aligns with brand guidelines and maintains consistency.

**Compliance Score** — A numerical rating (0-100) indicating how well generated content aligns with brand guidelines.

**Frame** — A single still image in a storyboard or video sequence.

**Moodboard** — A collection of reference images organized by theme or concept to inspire visual direction.

**Storyboard** — A sequence of visual frames illustrating a script scene-by-scene.

**Voiceover** — Audio recording of dialogue or narration that accompanies video.

**Waveform** — Visual representation of audio signal showing amplitude over time.

---

## Support & Resources

For additional help and resources:

- **Help Center:** https://help.manus.im
- **Documentation:** https://docs.manus.im
- **Community Forum:** https://community.manus.im
- **Email Support:** support@manus.im
- **Live Chat:** Available in-app during business hours

---

**End of User Manual**

**Version:** 1.0  
**Last Updated:** January 30, 2026  
**Next Review:** April 30, 2026

For feedback or corrections to this manual, please contact support@manus.im
