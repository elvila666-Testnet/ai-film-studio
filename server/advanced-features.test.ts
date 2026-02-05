import { describe, it, expect } from 'vitest';
import * as timelinePlayback from './services/timelinePlayback';
import * as collaboration from './services/collaboration';
import * as costAnalytics from './services/costAnalytics';

describe('Advanced Features', () => {
  // Timeline Playback Tests
  describe('Timeline Playback Service', () => {
    const mockClips: timelinePlayback.PlaybackClip[] = [
      { id: 1, fileUrl: 'clip1.mp4', startTime: 0, duration: 5, trackId: 1, title: 'Clip 1' },
      { id: 2, fileUrl: 'clip2.mp4', startTime: 5, duration: 3, trackId: 1, title: 'Clip 2' },
      { id: 3, fileUrl: 'clip3.mp4', startTime: 10, duration: 4, trackId: 2, title: 'Clip 3' },
    ];

    it('should calculate total timeline duration', () => {
      const duration = timelinePlayback.calculateTimelineDuration(mockClips);
      expect(duration).toBe(14); // 10 + 4
    });

    it('should sort clips by start time', () => {
      const sorted = timelinePlayback.getSortedClips(mockClips);
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should find clip at specific time', () => {
      const clip = timelinePlayback.findClipAtTime(mockClips, 2);
      expect(clip?.id).toBe(1);
    });

    it('should return null for time outside clips', () => {
      const clip = timelinePlayback.findClipAtTime(mockClips, 20);
      expect(clip).toBeNull();
    });

    it('should get next clip in sequence', () => {
      const currentClip = mockClips[0];
      const nextClip = timelinePlayback.getNextClip(mockClips, currentClip);
      expect(nextClip?.id).toBe(2);
    });

    it('should return null for last clip', () => {
      const lastClip = mockClips[2];
      const nextClip = timelinePlayback.getNextClip(mockClips, lastClip);
      expect(nextClip).toBeNull();
    });

    it('should get previous clip in sequence', () => {
      const currentClip = mockClips[1];
      const prevClip = timelinePlayback.getPreviousClip(mockClips, currentClip);
      expect(prevClip?.id).toBe(1);
    });

    it('should calculate playback progress', () => {
      const progress = timelinePlayback.getPlaybackProgress(mockClips, 7);
      expect(progress).toBeCloseTo(50, 1); // 7/14 = 50%
    });

    it('should format playback time correctly', () => {
      const formatted = timelinePlayback.formatPlaybackTime(65.5);
      expect(formatted).toBe('01:05.50');
    });

    it('should detect timeline gaps', () => {
      const clipsWithGap: timelinePlayback.PlaybackClip[] = [
        { id: 1, fileUrl: 'clip1.mp4', startTime: 0, duration: 2, trackId: 1 },
        { id: 2, fileUrl: 'clip2.mp4', startTime: 5, duration: 2, trackId: 1 },
      ];
      const gaps = timelinePlayback.calculateTimelineGaps(clipsWithGap);
      expect(gaps.length).toBe(1);
      expect(gaps[0].duration).toBe(3); // Gap from 2 to 5
    });

    it('should get timeline statistics', () => {
      const stats = timelinePlayback.getTimelineStats(mockClips);
      expect(stats.totalDuration).toBe(14);
      expect(stats.clipCount).toBe(3);
      expect(stats.utilizationRate).toBe(100); // No gaps
    });
  });

  // Collaboration Tests
  describe('Collaboration Service', () => {
    it('should check user permissions correctly', () => {
      expect(collaboration.hasPermission('owner', 'delete')).toBe(true);
      expect(collaboration.hasPermission('viewer', 'delete')).toBe(false);
      expect(collaboration.hasPermission('editor', 'edit')).toBe(true);
    });

    it('should get role hierarchy level', () => {
      expect(collaboration.getRoleLevel('owner')).toBe(4);
      expect(collaboration.getRoleLevel('editor')).toBe(3);
      expect(collaboration.getRoleLevel('viewer')).toBe(1);
    });

    it('should check if user can change role', () => {
      expect(collaboration.canChangeRole('owner', 'editor')).toBe(true);
      expect(collaboration.canChangeRole('editor', 'owner')).toBe(false);
    });

    it('should suggest role based on user type', () => {
      expect(collaboration.getSuggestedRole('team_member')).toBe('editor');
      expect(collaboration.getSuggestedRole('client')).toBe('commenter');
      expect(collaboration.getSuggestedRole('stakeholder')).toBe('viewer');
    });

    it('should format activity log message', () => {
      const log: collaboration.ActivityLog = {
        id: 1,
        projectId: 1,
        userId: 1,
        userName: 'John Doe',
        action: 'edited',
        details: 'Updated script',
        timestamp: new Date('2026-01-30'),
      };
      const formatted = collaboration.formatActivityLog(log);
      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('edited');
    });

    it('should get user presence status', () => {
      const presence: collaboration.UserPresence = {
        userId: 1,
        userName: 'John',
        userEmail: 'john@example.com',
        isOnline: true,
        lastSeen: new Date(),
      };
      expect(collaboration.getUserPresenceStatus(presence)).toBe('online');
    });

    it('should count unresolved comments', () => {
      const comments: collaboration.ProjectComment[] = [
        { id: 1, projectId: 1, userId: 1, userName: 'John', userEmail: 'john@example.com', content: 'Test', timestamp: new Date(), resolved: false },
        { id: 2, projectId: 1, userId: 1, userName: 'John', userEmail: 'john@example.com', content: 'Test', timestamp: new Date(), resolved: true },
      ];
      expect(collaboration.countUnresolvedComments(comments)).toBe(1);
    });

    it('should check if user can be invited', () => {
      const shares: collaboration.ProjectShare[] = [
        { id: 1, projectId: 1, userId: 1, userEmail: 'john@example.com', userName: 'John', role: 'editor', sharedAt: new Date() },
      ];
      expect(collaboration.canInviteUser(shares, 'jane@example.com')).toBe(true);
      expect(collaboration.canInviteUser(shares, 'john@example.com')).toBe(false);
    });
  });

  // Cost Analytics Tests
  describe('Cost Analytics Service', () => {
    it('should calculate provider cost', () => {
      const cost = costAnalytics.getProviderCost('veo3', 'high', 60);
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate total cost', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 120, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'sora', quality: 'medium', duration: 30, resolution: '720p', cost: 24, timestamp: new Date(), status: 'completed' },
      ];
      const total = costAnalytics.calculateTotalCost(costs);
      expect(total).toBe(144);
    });

    it('should calculate average cost', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 100, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'sora', quality: 'medium', duration: 30, resolution: '720p', cost: 50, timestamp: new Date(), status: 'completed' },
      ];
      const avg = costAnalytics.calculateAverageCost(costs);
      expect(avg).toBe(75);
    });

    it('should get provider statistics', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 120, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'veo3', quality: 'medium', duration: 30, resolution: '720p', cost: 30, timestamp: new Date(), status: 'completed' },
      ];
      const stats = costAnalytics.getProviderStats(costs, 'veo3');
      expect(stats.totalCost).toBe(150);
      expect(stats.totalGenerations).toBe(2);
      expect(stats.successRate).toBe(100);
    });

    it('should get most cost-effective provider', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 120, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'sora', quality: 'high', duration: 60, resolution: '1080p', cost: 48, timestamp: new Date(), status: 'completed' },
        { id: 3, projectId: 1, provider: 'flow', quality: 'high', duration: 60, resolution: '1080p', cost: 96, timestamp: new Date(), status: 'completed' },
      ];
      const best = costAnalytics.getMostCostEffectiveProvider(costs);
      expect(best).toBe('sora');
    });

    it('should compare provider costs', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 120, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'sora', quality: 'high', duration: 60, resolution: '1080p', cost: 48, timestamp: new Date(), status: 'completed' },
      ];
      const comparison = costAnalytics.compareCosts(costs, 'veo3', 'sora');
      expect(comparison.winner).toBe('sora');
      expect(comparison.savings).toBe(72);
    });

    it('should check budget status', () => {
      expect(costAnalytics.isWithinBudget(100, 200)).toBe(true);
      expect(costAnalytics.isWithinBudget(300, 200)).toBe(false);
    });

    it('should calculate remaining budget', () => {
      const remaining = costAnalytics.calculateRemainingBudget(150, 500);
      expect(remaining).toBe(350);
    });

    it('should get budget utilization percentage', () => {
      const utilization = costAnalytics.getBudgetUtilization(150, 500);
      expect(utilization).toBe(30);
    });

    it('should get cost warning level', () => {
      expect(costAnalytics.getCostWarningLevel(100, 500)).toBe('safe');
      expect(costAnalytics.getCostWarningLevel(400, 500)).toBe('warning');
      expect(costAnalytics.getCostWarningLevel(600, 500)).toBe('critical');
    });

    it('should get cost breakdown by provider', () => {
      const costs: costAnalytics.GenerationCost[] = [
        { id: 1, projectId: 1, provider: 'veo3', quality: 'high', duration: 60, resolution: '1080p', cost: 100, timestamp: new Date(), status: 'completed' },
        { id: 2, projectId: 1, provider: 'sora', quality: 'medium', duration: 30, resolution: '720p', cost: 50, timestamp: new Date(), status: 'completed' },
      ];
      const breakdown = costAnalytics.getCostBreakdown(costs);
      expect(breakdown.veo3).toBe(100);
      expect(breakdown.sora).toBe(50);
      expect(breakdown.flow).toBe(0);
    });

    it('should estimate cost for generation', () => {
      const estimate = costAnalytics.estimateCost('veo3', 'high', 60);
      expect(estimate).toBeGreaterThan(0);
    });

    it('should format cost for display', () => {
      const formatted = costAnalytics.formatCost(1500);
      expect(formatted).toContain('1,500');
      expect(formatted).toContain('credits');
    });
  });
});
