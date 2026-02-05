/**
 * Timeline Playback Service
 * Handles sequential playback of clips on timeline with automatic transitions
 */

export interface PlaybackClip {
  id: number;
  fileUrl: string;
  startTime: number;
  duration: number;
  trackId: number;
  title?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  currentClipIndex: number;
  totalDuration: number;
  clips: PlaybackClip[];
}

/**
 * Calculate total timeline duration from clips
 */
export function calculateTimelineDuration(clips: PlaybackClip[]): number {
  if (clips.length === 0) return 0;
  
  let maxEndTime = 0;
  for (const clip of clips) {
    const endTime = clip.startTime + clip.duration;
    if (endTime > maxEndTime) {
      maxEndTime = endTime;
    }
  }
  
  return maxEndTime;
}

/**
 * Get clips sorted by start time for sequential playback
 */
export function getSortedClips(clips: PlaybackClip[]): PlaybackClip[] {
  return [...clips].sort((a, b) => a.startTime - b.startTime);
}

/**
 * Find which clip is playing at given time
 */
export function findClipAtTime(clips: PlaybackClip[], time: number): PlaybackClip | null {
  const sortedClips = getSortedClips(clips);
  
  for (const clip of sortedClips) {
    const clipEndTime = clip.startTime + clip.duration;
    if (time >= clip.startTime && time < clipEndTime) {
      return clip;
    }
  }
  
  return null;
}

/**
 * Get playback sequence - clips in order with gaps filled
 */
export function getPlaybackSequence(clips: PlaybackClip[]): PlaybackClip[] {
  if (clips.length === 0) return [];
  
  const sorted = getSortedClips(clips);
  const sequence: PlaybackClip[] = [];
  
  for (const clip of sorted) {
    sequence.push(clip);
  }
  
  return sequence;
}

/**
 * Calculate time offset within current clip
 */
export function getClipTimeOffset(clip: PlaybackClip, currentTime: number): number {
  const offset = currentTime - clip.startTime;
  return Math.max(0, Math.min(offset, clip.duration));
}

/**
 * Get next clip in sequence
 */
export function getNextClip(clips: PlaybackClip[], currentClip: PlaybackClip): PlaybackClip | null {
  const sorted = getSortedClips(clips);
  const currentIndex = sorted.findIndex(c => c.id === currentClip.id);
  
  if (currentIndex === -1 || currentIndex === sorted.length - 1) {
    return null;
  }
  
  return sorted[currentIndex + 1];
}

/**
 * Get previous clip in sequence
 */
export function getPreviousClip(clips: PlaybackClip[], currentClip: PlaybackClip): PlaybackClip | null {
  const sorted = getSortedClips(clips);
  const currentIndex = sorted.findIndex(c => c.id === currentClip.id);
  
  if (currentIndex <= 0) {
    return null;
  }
  
  return sorted[currentIndex - 1];
}

/**
 * Check if playback is at end of timeline
 */
export function isAtEndOfTimeline(clips: PlaybackClip[], currentTime: number): boolean {
  const totalDuration = calculateTimelineDuration(clips);
  return currentTime >= totalDuration;
}

/**
 * Get playback progress as percentage
 */
export function getPlaybackProgress(clips: PlaybackClip[], currentTime: number): number {
  const totalDuration = calculateTimelineDuration(clips);
  if (totalDuration === 0) return 0;
  
  return (currentTime / totalDuration) * 100;
}

/**
 * Format time for display (MM:SS.ms)
 */
export function formatPlaybackTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

/**
 * Create playback state from clips
 */
export function createPlaybackState(clips: PlaybackClip[]): PlaybackState {
  return {
    isPlaying: false,
    currentTime: 0,
    currentClipIndex: 0,
    totalDuration: calculateTimelineDuration(clips),
    clips: getSortedClips(clips),
  };
}

/**
 * Update playback time and return current clip
 */
export function updatePlaybackTime(state: PlaybackState, newTime: number): PlaybackClip | null {
  state.currentTime = Math.max(0, Math.min(newTime, state.totalDuration));
  return findClipAtTime(state.clips, state.currentTime);
}

/**
 * Skip to next clip
 */
export function skipToNextClip(state: PlaybackState): PlaybackClip | null {
  const currentClip = findClipAtTime(state.clips, state.currentTime);
  if (!currentClip) return null;
  
  const nextClip = getNextClip(state.clips, currentClip);
  if (!nextClip) return null;
  
  state.currentTime = nextClip.startTime;
  return nextClip;
}

/**
 * Skip to previous clip
 */
export function skipToPreviousClip(state: PlaybackState): PlaybackClip | null {
  const currentClip = findClipAtTime(state.clips, state.currentTime);
  if (!currentClip) return null;
  
  const prevClip = getPreviousClip(state.clips, currentClip);
  if (!prevClip) return null;
  
  state.currentTime = prevClip.startTime;
  return prevClip;
}

/**
 * Get clips that overlap at given time
 */
export function getOverlappingClips(clips: PlaybackClip[], time: number): PlaybackClip[] {
  return clips.filter(clip => {
    const clipEndTime = clip.startTime + clip.duration;
    return time >= clip.startTime && time < clipEndTime;
  });
}

/**
 * Get clips on specific track
 */
export function getClipsOnTrack(clips: PlaybackClip[], trackId: number): PlaybackClip[] {
  return clips.filter(clip => clip.trackId === trackId);
}

/**
 * Calculate gaps in timeline (unused time segments)
 */
export function calculateTimelineGaps(clips: PlaybackClip[]): Array<{ start: number; end: number; duration: number }> {
  if (clips.length === 0) return [];
  
  const sorted = getSortedClips(clips);
  const gaps: Array<{ start: number; end: number; duration: number }> = [];
  
  // Check gap before first clip
  if (sorted[0].startTime > 0) {
    gaps.push({
      start: 0,
      end: sorted[0].startTime,
      duration: sorted[0].startTime,
    });
  }
  
  // Check gaps between clips
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentClipEnd = sorted[i].startTime + sorted[i].duration;
    const nextClipStart = sorted[i + 1].startTime;
    
    if (currentClipEnd < nextClipStart) {
      gaps.push({
        start: currentClipEnd,
        end: nextClipStart,
        duration: nextClipStart - currentClipEnd,
      });
    }
  }
  
  return gaps;
}

/**
 * Check if timeline has gaps
 */
export function hasTimelineGaps(clips: PlaybackClip[]): boolean {
  return calculateTimelineGaps(clips).length > 0;
}

/**
 * Get timeline statistics
 */
export function getTimelineStats(clips: PlaybackClip[]) {
  const totalDuration = calculateTimelineDuration(clips);
  const gaps = calculateTimelineGaps(clips);
  const totalGapDuration = gaps.reduce((sum, gap) => sum + gap.duration, 0);
  const usedDuration = totalDuration - totalGapDuration;
  const utilizationRate = totalDuration > 0 ? (usedDuration / totalDuration) * 100 : 0;
  
  return {
    totalDuration,
    usedDuration,
    totalGapDuration,
    gapCount: gaps.length,
    clipCount: clips.length,
    utilizationRate,
    averageClipDuration: clips.length > 0 ? usedDuration / clips.length : 0,
  };
}


/**
 * Playback session management
 */

export interface PlaybackSession {
  sessionId: string;
  state: PlaybackState;
  playbackRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const playbackSessions = new Map<string, PlaybackSession>();

/**
 * Create playback session
 */
export function createPlaybackSession(clips: PlaybackClip[]): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const session: PlaybackSession = {
    sessionId,
    state: createPlaybackState(clips),
    playbackRate: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  playbackSessions.set(sessionId, session);
  return sessionId;
}

/**
 * Get playback session
 */
export function getPlaybackSession(sessionId: string): PlaybackSession | undefined {
  return playbackSessions.get(sessionId);
}

/**
 * Set playback rate
 */
export function setPlaybackRate(sessionId: string, rate: number): boolean {
  const session = playbackSessions.get(sessionId);
  if (!session) return false;
  session.playbackRate = Math.max(0.25, Math.min(2, rate));
  session.updatedAt = new Date();
  return true;
}

/**
 * Delete playback session
 */
export function deletePlaybackSession(sessionId: string): boolean {
  return playbackSessions.delete(sessionId);
}

/**
 * Clean up old sessions
 */
export function cleanupOldSessions(): number {
  let cleaned = 0;
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const sessionsToDelete: string[] = [];
  
  playbackSessions.forEach((session, sessionId) => {
    if (session.updatedAt.getTime() < oneHourAgo) {
      sessionsToDelete.push(sessionId);
    }
  });
  
  sessionsToDelete.forEach((sessionId) => {
    playbackSessions.delete(sessionId);
    cleaned++;
  });
  
  return cleaned;
}
