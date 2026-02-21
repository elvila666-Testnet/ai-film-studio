/**
 * Professional Audio Mixing Console
 * Provides EQ, compression, and mixing controls for audio tracks
 */

export interface EQBand {
  frequency: number; // Hz
  gain: number; // dB, -12 to +12
  q: number; // Quality factor, 0.1 to 10
  type: "peaking" | "highpass" | "lowpass" | "highshelf" | "lowshelf";
}

export interface Compressor {
  threshold: number; // dB, -60 to 0
  ratio: number; // 1:1 to 20:1
  attackTime: number; // ms, 0.1 to 100
  releaseTime: number; // ms, 10 to 1000
  makeupGain: number; // dB, 0 to 24
  enabled: boolean;
}

export interface Limiter {
  threshold: number; // dB, -20 to 0
  releaseTime: number; // ms, 10 to 1000
  enabled: boolean;
}

export interface AudioTrackMixer {
  trackId: string;
  trackName: string;
  volume: number; // dB, -inf to +12
  pan: number; // -100 (left) to +100 (right)
  muted: boolean;
  solo: boolean;
  eqBands: EQBand[];
  compressor: Compressor;
  limiter: Limiter;
  automation: AutomationPoint[];
}

export interface AutomationPoint {
  time: number; // seconds
  value: number; // 0-100
  type: "volume" | "pan";
}

export interface MixerPreset {
  name: string;
  description: string;
  tracks: Partial<AudioTrackMixer>[];
}

/**
 * Default EQ presets for different track types
 */
export const EQ_PRESETS = {
  voiceover: [
    {
      frequency: 80,
      gain: -3,
      q: 0.7,
      type: "highpass" as const,
    },
    {
      frequency: 200,
      gain: -2,
      q: 0.7,
      type: "peaking" as const,
    },
    {
      frequency: 3000,
      gain: 2,
      q: 1.5,
      type: "peaking" as const,
    },
    {
      frequency: 12000,
      gain: 1,
      q: 1,
      type: "highshelf" as const,
    },
  ],
  music: [
    {
      frequency: 60,
      gain: 0,
      q: 0.7,
      type: "highpass" as const,
    },
    {
      frequency: 250,
      gain: -1,
      q: 0.7,
      type: "peaking" as const,
    },
    {
      frequency: 2000,
      gain: 1,
      q: 1,
      type: "peaking" as const,
    },
    {
      frequency: 10000,
      gain: 0.5,
      q: 1,
      type: "highshelf" as const,
    },
  ],
  soundeffects: [
    {
      frequency: 100,
      gain: -2,
      q: 0.7,
      type: "highpass" as const,
    },
    {
      frequency: 500,
      gain: 1,
      q: 1,
      type: "peaking" as const,
    },
    {
      frequency: 5000,
      gain: 2,
      q: 1.5,
      type: "peaking" as const,
    },
  ],
  ambient: [
    {
      frequency: 40,
      gain: -6,
      q: 0.7,
      type: "highpass" as const,
    },
    {
      frequency: 200,
      gain: -1,
      q: 0.7,
      type: "peaking" as const,
    },
    {
      frequency: 8000,
      gain: -2,
      q: 1,
      type: "peaking" as const,
    },
  ],
};

/**
 * Default compressor presets
 */
export const COMPRESSOR_PRESETS = {
  gentle: {
    threshold: -20,
    ratio: 2,
    attackTime: 10,
    releaseTime: 100,
    makeupGain: 2,
    enabled: true,
  },
  moderate: {
    threshold: -15,
    ratio: 4,
    attackTime: 5,
    releaseTime: 50,
    makeupGain: 4,
    enabled: true,
  },
  aggressive: {
    threshold: -10,
    ratio: 8,
    attackTime: 2,
    releaseTime: 30,
    makeupGain: 6,
    enabled: true,
  },
  voiceover: {
    threshold: -18,
    ratio: 3,
    attackTime: 8,
    releaseTime: 80,
    makeupGain: 3,
    enabled: true,
  },
};

/**
 * Create default audio track mixer
 */
export function createAudioTrackMixer(
  trackId: string,
  trackName: string,
  trackType: "voiceover" | "music" | "soundeffects" | "ambient" = "music"
): AudioTrackMixer {
  return {
    trackId,
    trackName,
    volume: 0,
    pan: 0,
    muted: false,
    solo: false,
    eqBands: EQ_PRESETS[trackType] || [],
    compressor: COMPRESSOR_PRESETS.moderate,
    limiter: {
      threshold: -0.3,
      releaseTime: 50,
      enabled: true,
    },
    automation: [],
  };
}

/**
 * Build FFmpeg audio filter chain from mixer settings
 */
export function buildAudioFilterChain(mixer: AudioTrackMixer): string {
  const filters: string[] = [];

  // Apply volume
  if (mixer.volume !== 0) {
    const volumeLinear = Math.pow(10, mixer.volume / 20);
    filters.push(`volume=${volumeLinear}`);
  }

  // Apply pan
  if (mixer.pan !== 0) {
    const panValue = mixer.pan / 100; // -1 to 1
    filters.push(`pan=stereo|c0=c0*${1 - Math.abs(panValue)}+c1*${Math.max(0, panValue)}|c1=c1*${1 - Math.abs(panValue)}+c0*${Math.max(0, -panValue)}`);
  }

  // Apply EQ bands
  if (mixer.eqBands.length > 0) {
    const eqFilters = mixer.eqBands.map((band) => {
      return `equalizer=f=${band.frequency}:width_type=q:w=${band.q}:g=${band.gain}:t=${band.type}`;
    });
    filters.push(...eqFilters);
  }

  // Apply compressor
  if (mixer.compressor.enabled) {
    const comp = mixer.compressor;
    filters.push(
      `acompressor=threshold=${comp.threshold}:ratio=${comp.ratio}:attack=${comp.attackTime}:release=${comp.releaseTime}:makeup=${comp.makeupGain}`
    );
  }

  // Apply limiter
  if (mixer.limiter.enabled) {
    filters.push(`alimiter=limit=${Math.pow(10, mixer.limiter.threshold / 20)}:release=${mixer.limiter.releaseTime / 1000}`);
  }

  return filters.join(",");
}

/**
 * Calculate RMS (Root Mean Square) level for audio visualization
 */
export function calculateRMSLevel(audioData: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < audioData.length; i++) {
    sum += audioData[i] * audioData[i];
  }
  const rms = Math.sqrt(sum / audioData.length);
  // Convert to dB
  return 20 * Math.log10(Math.max(rms, 1e-10));
}

/**
 * Validate mixer settings
 */
export function validateMixerSettings(mixer: AudioTrackMixer): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (mixer.volume < -96 || mixer.volume > 12) {
    errors.push("Volume must be between -96 dB and +12 dB");
  }

  if (mixer.pan < -100 || mixer.pan > 100) {
    errors.push("Pan must be between -100 (left) and +100 (right)");
  }

  // Validate EQ bands
  mixer.eqBands.forEach((band, idx) => {
    if (band.frequency < 20 || band.frequency > 20000) {
      errors.push(`EQ band ${idx}: frequency must be between 20 Hz and 20 kHz`);
    }
    if (band.gain < -12 || band.gain > 12) {
      errors.push(`EQ band ${idx}: gain must be between -12 dB and +12 dB`);
    }
    if (band.q < 0.1 || band.q > 10) {
      errors.push(`EQ band ${idx}: Q must be between 0.1 and 10`);
    }
  });

  // Validate compressor
  if (mixer.compressor.enabled) {
    if (mixer.compressor.threshold < -60 || mixer.compressor.threshold > 0) {
      errors.push("Compressor threshold must be between -60 dB and 0 dB");
    }
    if (mixer.compressor.ratio < 1 || mixer.compressor.ratio > 20) {
      errors.push("Compressor ratio must be between 1:1 and 20:1");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get mixer preset by name
 */
export function getMixerPreset(presetName: string): MixerPreset | null {
  const presets: Record<string, MixerPreset> = {
    voiceover_podcast: {
      name: "Voiceover - Podcast",
      description: "Optimized for clear, punchy voiceover with compression",
      tracks: [
        {
          volume: 0,
          pan: 0,
          eqBands: EQ_PRESETS.voiceover,
          compressor: COMPRESSOR_PRESETS.voiceover,
        },
      ],
    },
    music_balanced: {
      name: "Music - Balanced",
      description: "Balanced mix for background music",
      tracks: [
        {
          volume: -3,
          pan: 0,
          eqBands: EQ_PRESETS.music,
          compressor: COMPRESSOR_PRESETS.gentle,
        },
      ],
    },
    cinematic: {
      name: "Cinematic",
      description: "Professional cinematic mix with wide stereo field",
      tracks: [
        {
          volume: 0,
          pan: -30,
          eqBands: EQ_PRESETS.music,
          compressor: COMPRESSOR_PRESETS.moderate,
        },
        {
          volume: -6,
          pan: 30,
          eqBands: EQ_PRESETS.soundeffects,
          compressor: COMPRESSOR_PRESETS.gentle,
        },
      ],
    },
  };

  return presets[presetName] || null;
}

/**
 * Get available mixer presets
 */
export function getAvailableMixerPresets(): {
  name: string;
  label: string;
  description: string;
}[] {
  return [
    {
      name: "voiceover_podcast",
      label: "Voiceover - Podcast",
      description: "Optimized for clear, punchy voiceover with compression",
    },
    {
      name: "music_balanced",
      label: "Music - Balanced",
      description: "Balanced mix for background music",
    },
    {
      name: "cinematic",
      label: "Cinematic",
      description: "Professional cinematic mix with wide stereo field",
    },
  ];
}
