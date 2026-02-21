import { epidemicSoundService, EpidemicTrack } from "./epidemicSoundIntegration";
import { ProjectMood } from "./moodAnalysis";
import { errorHandler } from "./errorHandling";

/**
 * Music Recommendation Engine
 * Recommends tracks based on project mood and user preferences
 */

export interface RecommendationRequest {
  projectMood: ProjectMood;
  userPreferences?: {
    favoriteGenres?: string[];
    favoriteArtists?: string[];
    excludedGenres?: string[];
  };
  duration?: number; // in seconds
  limit?: number; // number of recommendations
}

export interface MusicRecommendation {
  track: EpidemicTrack;
  matchScore: number; // 0-100
  reasoning: string;
  compatibility: {
    moodMatch: number;
    tempoMatch: number;
    energyMatch: number;
    genreMatch: number;
  };
}

class MusicRecommendationEngine {
  /**
   * Get music recommendations based on project mood
   */
  async getRecommendations(
    request: RecommendationRequest
  ): Promise<MusicRecommendation[]> {
    try {
      const { projectMood, userPreferences, duration: _duration, limit = 10 } = request;

      // Build search parameters based on mood
      const searchParams = this.buildSearchParams(projectMood, userPreferences);

      // Search for matching tracks
      const tracks = await epidemicSoundService.searchTracks({
        ...searchParams,
        limit: limit * 2, // Get more to filter and rank
      });

      // Score and rank tracks
      const recommendations = tracks
        .map((track) => this.scoreTrack(track, projectMood, userPreferences))
        .filter((rec) => rec.matchScore >= 40) // Filter low-scoring tracks
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);

      return recommendations;
    } catch (error) {
      errorHandler.logError(
        `Failed to get music recommendations: ${(error as Error).message}`,
        "RECOMMENDATION_ERROR",
        "error",
        { operation: "getRecommendations" },
        error as Error
      );

      return [];
    }
  }

  /**
   * Get trending music recommendations
   */
  async getTrendingRecommendations(
    limit: number = 10
  ): Promise<EpidemicTrack[]> {
    try {
      return await epidemicSoundService.getTrendingTracks(limit);
    } catch (error) {
      errorHandler.logError(
        `Failed to get trending recommendations: ${(error as Error).message}`,
        "TRENDING_ERROR",
        "error",
        { operation: "getTrendingRecommendations" },
        error as Error
      );

      return [];
    }
  }

  /**
   * Get personalized recommendations based on user history
   */
  async getPersonalizedRecommendations(
    userHistory: { moods: ProjectMood[]; likedTracks: string[] },
    limit: number = 10
  ): Promise<MusicRecommendation[]> {
    try {
      if (userHistory.moods.length === 0) {
        return this.getTrendingRecommendations(limit).then((tracks) =>
          tracks.map((track) => ({
            track,
            matchScore: 60,
            reasoning: "Popular track",
            compatibility: {
              moodMatch: 60,
              tempoMatch: 60,
              energyMatch: 60,
              genreMatch: 60,
            },
          }))
        );
      }

      // Calculate average mood from history
      const avgMood = this.calculateAverageMood(userHistory.moods);

      // Get recommendations based on average mood
      const recommendations = await this.getRecommendations({
        projectMood: avgMood,
        limit: limit * 2,
      });

      // Boost score for previously liked tracks
      return recommendations
        .map((rec) => {
          if (userHistory.likedTracks.includes(rec.track.id)) {
            rec.matchScore = Math.min(100, rec.matchScore + 15);
          }
          return rec;
        })
        .slice(0, limit);
    } catch (error) {
      errorHandler.logError(
        `Failed to get personalized recommendations: ${(error as Error).message}`,
        "PERSONALIZED_ERROR",
        "error",
        { operation: "getPersonalizedRecommendations" },
        error as Error
      );

      return [];
    }
  }

  /**
   * Score a track based on mood compatibility
   */
  private scoreTrack(
    track: EpidemicTrack,
    projectMood: ProjectMood,
    userPreferences?: {
      favoriteGenres?: string[];
      favoriteArtists?: string[];
      excludedGenres?: string[];
    }
  ): MusicRecommendation {
    // Calculate component scores
    const moodMatch = this.calculateMoodMatch(track, projectMood);
    const tempoMatch = this.calculateTempoMatch(track, projectMood);
    const energyMatch = this.calculateEnergyMatch(track, projectMood);
    const genreMatch = this.calculateGenreMatch(track, userPreferences);

    // Calculate weighted overall score
    const matchScore =
      moodMatch * 0.35 +
      tempoMatch * 0.25 +
      energyMatch * 0.25 +
      genreMatch * 0.15;

    // Generate reasoning
    const reasoning = this.generateReasoning(
      track,
      projectMood,
      moodMatch,
      tempoMatch,
      energyMatch
    );

    return {
      track,
      matchScore: Math.round(matchScore),
      reasoning,
      compatibility: {
        moodMatch: Math.round(moodMatch),
        tempoMatch: Math.round(tempoMatch),
        energyMatch: Math.round(energyMatch),
        genreMatch: Math.round(genreMatch),
      },
    };
  }

  /**
   * Calculate mood match score
   */
  private calculateMoodMatch(
    track: EpidemicTrack,
    projectMood: ProjectMood
  ): number {
    const moodAnalysisService = require("./moodAnalysis").moodAnalysisService;

    // Check primary mood match
    const primaryMatch = track.mood.some(
      (m) => m.toLowerCase() === projectMood.primaryMood.toLowerCase()
    )
      ? 100
      : 0;

    if (primaryMatch === 100) return 100;

    // Check secondary mood matches
    const secondaryMatches = track.mood.filter((m) =>
      projectMood.secondaryMoods.some(
        (sm) => sm.toLowerCase() === m.toLowerCase()
      )
    );

    if (secondaryMatches.length > 0) {
      return 70 + (secondaryMatches.length * 10) / projectMood.secondaryMoods.length;
    }

    // Check mood compatibility
    const compatibilityScores = track.mood.map((m) =>
      moodAnalysisService.getMoodCompatibilityScore(
        projectMood.primaryMood,
        m
      )
    );

    return Math.max(...compatibilityScores, 30);
  }

  /**
   * Calculate tempo match score
   */
  private calculateTempoMatch(
    track: EpidemicTrack,
    projectMood: ProjectMood
  ): number {
    const tempoRange = 20; // BPM tolerance
    const suggestedTempo = projectMood.suggestedTempo;
    const trackTempo = track.tempo;

    const difference = Math.abs(suggestedTempo - trackTempo);

    if (difference <= tempoRange) {
      return 100 - (difference / tempoRange) * 20;
    } else {
      return Math.max(30, 100 - (difference / 60) * 50);
    }
  }

  /**
   * Calculate energy match score
   */
  private calculateEnergyMatch(
    track: EpidemicTrack,
    projectMood: ProjectMood
  ): number {
    const energyMap = { low: 1, medium: 2, high: 3 };
    const projectEnergy = energyMap[projectMood.energyLevel];
    const trackEnergy = energyMap[track.energyLevel];

    const difference = Math.abs(projectEnergy - trackEnergy);

    if (difference === 0) return 100;
    if (difference === 1) return 70;
    return 40;
  }

  /**
   * Calculate genre match score
   */
  private calculateGenreMatch(
    track: EpidemicTrack,
    userPreferences?: {
      favoriteGenres?: string[];
      favoriteArtists?: string[];
      excludedGenres?: string[];
    }
  ): number {
    if (!userPreferences) return 60;

    // Check excluded genres
    if (
      userPreferences.excludedGenres?.some(
        (g) => g.toLowerCase() === track.genre.toLowerCase()
      )
    ) {
      return 0;
    }

    // Check favorite genres
    if (
      userPreferences.favoriteGenres?.some(
        (g) => g.toLowerCase() === track.genre.toLowerCase()
      )
    ) {
      return 100;
    }

    // Check favorite artists
    if (
      userPreferences.favoriteArtists?.some(
        (a) => a.toLowerCase() === track.artist.toLowerCase()
      )
    ) {
      return 90;
    }

    return 60;
  }

  /**
   * Build search parameters from mood
   */
  private buildSearchParams(
    projectMood: ProjectMood,
    _userPreferences?: {
      favoriteGenres?: string[];
      favoriteArtists?: string[];
      excludedGenres?: string[];
    }
  ) {
    const moods = [
      projectMood.primaryMood,
      ...projectMood.secondaryMoods,
    ].slice(0, 3);

    return {
      mood: moods,
      energyLevel: projectMood.energyLevel,
      tempo: {
        min: Math.max(60, projectMood.suggestedTempo - 30),
        max: projectMood.suggestedTempo + 30,
      },
    };
  }

  /**
   * Generate human-readable reasoning for recommendation
   */
  private generateReasoning(
    _track: EpidemicTrack,
    projectMood: ProjectMood,
    moodMatch: number,
    tempoMatch: number,
    energyMatch: number
  ): string {
    const reasons: string[] = [];

    if (moodMatch >= 80) {
      reasons.push(`Perfect mood match for ${projectMood.primaryMood}`);
    } else if (moodMatch >= 60) {
      reasons.push(`Good mood compatibility`);
    }

    if (tempoMatch >= 80) {
      reasons.push(`Tempo aligns with project pacing`);
    }

    if (energyMatch >= 80) {
      reasons.push(`Energy level matches project intensity`);
    }

    if (reasons.length === 0) {
      reasons.push("Complementary to project style");
    }

    return reasons.join(". ");
  }

  /**
   * Calculate average mood from multiple moods
   */
  private calculateAverageMood(moods: ProjectMood[]): ProjectMood {
    if (moods.length === 0) {
      return {
        primaryMood: "neutral",
        secondaryMoods: [],
        energyLevel: "medium",
        pace: "moderate",
        emotionalTone: "balanced",
        suggestedTempo: 120,
        intensity: 50,
        confidence: 50,
      };
    }

    const avgTempo =
      moods.reduce((sum, m) => sum + m.suggestedTempo, 0) / moods.length;
    const avgIntensity =
      moods.reduce((sum, m) => sum + m.intensity, 0) / moods.length;

    // Get most common primary mood
    const moodCounts = new Map<string, number>();
    moods.forEach((m) => {
      moodCounts.set(m.primaryMood, (moodCounts.get(m.primaryMood) || 0) + 1);
    });

    const primaryMood = Array.from(moodCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "neutral";

    // Get energy level distribution
    const energyCounts = new Map<string, number>();
    moods.forEach((m) => {
      energyCounts.set(m.energyLevel, (energyCounts.get(m.energyLevel) || 0) + 1);
    });

    const energyLevel = Array.from(energyCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || "medium";

    return {
      primaryMood,
      secondaryMoods: [],
      energyLevel: energyLevel as "low" | "medium" | "high",
      pace: "moderate",
      emotionalTone: "balanced",
      suggestedTempo: Math.round(avgTempo),
      intensity: Math.round(avgIntensity),
      confidence: 70,
    };
  }
}

export const musicRecommendationEngine = new MusicRecommendationEngine();
