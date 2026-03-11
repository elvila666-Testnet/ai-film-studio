# Photorealistic Character Identity (PCI) Skill

**Description**: Standardized logic for generating multi-angle, photorealistic character identity sheets.

## PCI 1: Reference-Based Identity
Used when the user provides a reference image for the character.

### Prompt Template
Create a **photorealistic multi-angle photographic identity sheet** based **strictly** on the uploaded reference image.

- Match the **exact real-world appearance** of the person: facial structure, proportions, skin texture, age, asymmetry, and natural imperfections.
- The result must look like **real photography of a real human**, not a digital character or 3D asset.
- Use a **simple, neutral background**, similar to a studio or indoor wall.
- The overall feeling should be **documentary and natural**, not stylized or cinematic.

**Layout**
- **Two horizontal rows**, presented as a clean photo contact sheet.
    - **Top row:** four full-body photographs of the same person:
        1. Facing the camera
        2. Left-facing profile
        3. Right-facing profile
        4. Facing away from the camera
    - **Bottom row:** three close-up photographic portraits:
        1. Facing the camera
        2. Left-facing profile
        3. Right-facing profile

**Pose & Body Language**
- The subject stands **naturally and casually**, as a real person would when asked to stand still.
- No exaggerated stance, no rigid pose, no symmetry.
- Subtle, natural weight distribution and relaxed posture.

**Consistency & Accuracy**
- Maintain **strong identity consistency** across all images.
- Preserve natural human asymmetry.
- Proportions must remain realistic and consistent.

**Critical constraints**
- Not a 3D render
- Not CGI
- Not a game character
- Not stylized
- Not a model turnaround

---

## PCI 2: Description-Based Identity
Used when no reference image exists and description comes from director breakdown.

### Prompt Template
Create a **photorealistic photographic identity sheet** of the following person:

**[INSERT REALISTIC HUMAN DESCRIPTION HERE]**

- The subject must look like a **real human photographed in the real world**.
- Avoid any stylized, animated, or synthetic appearance.
- Use a **simple neutral background**, similar to an ID or documentary shoot.

**Layout**
- **Two horizontal rows**, presented as a photo contact sheet.
    - **Top row:** four full-body photographs:
        1. Facing the camera
        2. Left-facing profile
        3. Right-facing profile
        4. Facing away
    - **Bottom row:** three close-up portraits:
        1. Facing the camera
        2. Left-facing profile
        3. Right-facing profile

**Pose & Presence**
- Natural stance, relaxed posture.
- No posing for presentation.

---

## PCI 3: Changing Wardrobe
Used to update the clothing of an existing character sheet.

### Prompt Template
Use the **same photographic identity sheet** as reference.

- Maintain the **exact same person**: face, body, age, proportions, posture, and expression.
- Change **only** the clothing to the following:

**[INSERT OUTFIT DESCRIPTION OR REFERENCE IMAGE]**

**Constraints**
- The clothing must behave like real fabric on a real body.
- No change to lighting, camera angle, or body posture.
