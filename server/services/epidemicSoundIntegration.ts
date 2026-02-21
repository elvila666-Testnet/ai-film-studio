import { errorHandler } from "./errorHandling";

/**
 * Epidemic Sound API Integration Service
 * Provides access to Epidemic Sound music library with mood-based recommendations
 */

export interface EpidemicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  mood: string[];
  genre: string;
  tempo: number; // BPM
  energyLevel: "low" | "medium" | "high";
  preview_url: string;
  download_url?: string;
  license_type: "standard" | "premium";
  metadata: {
    instrumentals: string[];
    vocals: "instrumental" | "vocal" | "mixed";
    production: string;
    year: number;
  };
}

export interface MusicSearchParams {
  query?: string;
  mood?: string[];
  genre?: string;
  tempo?: { min: number; max: number };
  energyLevel?: "low" | "medium" | "high";
  duration?: { min: number; max: number };
  limit?: number;
  offset?: number;
}

export interface MusicRecommendation {
  track: EpidemicTrack;
  matchScore: number; // 0-100
  reasoning: string;
}

class EpidemicSoundService {
  private apiKey: string;
  private apiBaseUrl = "https://api.epidemicsound.com/v1";
  private cache: Map<string, { data: Record<string, unknown>; timestamp: number }> = new Map();
  private cacheTTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.apiKey = process.env.EPIDEMIC_SOUND_API_KEY || "";

    if (!this.apiKey) {
      console.warn(
        "EPIDEMIC_SOUND_API_KEY not configured. Music features will be limited."
      );
    }
  }

  /**
   * Search for tracks in Epidemic Sound library
   */
  async searchTracks(params: MusicSearchParams): Promise<EpidemicTrack[]> {
    const cacheKey = `search:${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }

    try {
      const queryParams = new URLSearchParams();

      if (params.query) queryParams.append("q", params.query);
      if (params.mood?.length) queryParams.append("mood", params.mood.join(","));
      if (params.genre) queryParams.append("genre", params.genre);
      if (params.tempo) {
        queryParams.append("tempo_min", params.tempo.min.toString());
        queryParams.append("tempo_max", params.tempo.max.toString());
      }
      if (params.energyLevel) queryParams.append("energy", params.energyLevel);
      if (params.duration) {
        queryParams.append("duration_min", params.duration.min.toString());
        queryParams.append("duration_max", params.duration.max.toString());
      }
      queryParams.append("limit", (params.limit || 20).toString());
      queryParams.append("offset", (params.offset || 0).toString());

      const response = await fetch(
        `${this.apiBaseUrl}/tracks/search?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Epidemic Sound API error: ${response.statusText}`);
      }

      const data = await response.json();
      const tracks = this.normalizeTracks(data.tracks || []);

      // Cache results
      this.cache.set(cacheKey, {
        data: tracks,
        timestamp: Date.now() + this.cacheTTL,
      });

      return tracks;
    } catch (error) {
      errorHandler.logError(
        `Failed to search Epidemic Sound tracks: ${(error as Error).message}`,
        "EPIDEMIC_SEARCH_ERROR",
        "error",
        { operation: "searchTracks" },
        error as Error
      );

      // Return empty array as fallback
      return [];
    }
  }

  /**
   * Get track details by ID
   */
  async getTrackDetails(trackId: string): Promise<EpidemicTrack | null> {
    const cacheKey = `track:${trackId}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/tracks/${trackId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Epidemic Sound API error: ${response.statusText}`);
      }

      const data = await response.json();
      const track = this.normalizeTrack(data);

      // Cache result
      this.cache.set(cacheKey, {
        data: track,
        timestamp: Date.now() + this.cacheTTL,
      });

      return track;
    } catch (error) {
      errorHandler.logError(
        `Failed to get track details: ${(error as Error).message}`,
        "EPIDEMIC_GET_TRACK_ERROR",
        "error",
        { operation: "getTrackDetails" },
        error as Error
      );

      return null;
    }
  }

  /**
   * Get trending tracks
   */
  async getTrendingTracks(limit: number = 20): Promise<EpidemicTrack[]> {
    const cacheKey = `trending:${limit}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.apiBaseUrl}/tracks/trending?limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Epidemic Sound API error: ${response.statusText}`);
      }

      const data = await response.json();
      const tracks = this.normalizeTracks(data.tracks || []);

      // Cache results
      this.cache.set(cacheKey, {
        data: tracks,
        timestamp: Date.now() + this.cacheTTL,
      });

      return tracks;
    } catch (error) {
      errorHandler.logError(
        `Failed to get trending tracks: ${(error as Error).message}`,
        "EPIDEMIC_TRENDING_ERROR",
        "error",
        { operation: "getTrendingTracks" },
        error as Error
      );

      return [];
    }
  }

  /**
   * Get available moods/genres
   */
  async getAvailableMoods(): Promise<string[]> {
    const cacheKey = "moods";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/moods`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Epidemic Sound API error: ${response.statusText}`);
      }

      const data = await response.json();
      const moods = data.moods || [];

      // Cache results
      this.cache.set(cacheKey, {
        data: moods,
        timestamp: Date.now() + this.cacheTTL,
      });

      return moods;
    } catch (error) {
      errorHandler.logError(
        `Failed to get available moods: ${(error as Error).message}`,
        "EPIDEMIC_MOODS_ERROR",
        "error",
        { operation: "getAvailableMoods" },
        error as Error
      );

      // Return default moods
      return [
        "happy",
        "sad",
        "energetic",
        "calm",
        "dramatic",
        "romantic",
        "dark",
        "uplifting",
      ];
    }
  }

  /**
   * Get available genres
   */
  async getAvailableGenres(): Promise<string[]> {
    const cacheKey = "genres";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() < cached.timestamp) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/genres`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Epidemic Sound API error: ${response.statusText}`);
      }

      const data = await response.json();
      const genres = data.genres || [];

      // Cache results
      this.cache.set(cacheKey, {
        data: genres,
        timestamp: Date.now() + this.cacheTTL,
      });

      return genres;
    } catch (error) {
      errorHandler.logError(
        `Failed to get available genres: ${(error as Error).message}`,
        "EPIDEMIC_GENRES_ERROR",
        "error",
        { operation: "getAvailableGenres" },
        error as Error
      );

      // Return default genres
      return [
        "electronic",
        "acoustic",
        "orchestral",
        "hip-hop",
        "pop",
        "rock",
        "ambient",
        "cinematic",
      ];
    }
  }

  /**
   * Normalize track data from API response
   */
  private normalizeTrack(rawTrack: Record<string, unknown>): EpidemicTrack {
    return {
      id: rawTrack.id,
      title: rawTrack.title,
      artist: rawTrack.artist?.name || "Unknown Artist",
      duration: rawTrack.duration || 0,
      mood: rawTrack.moods || [],
      genre: rawTrack.genre || "Unknown",
      tempo: rawTrack.tempo || 120,
      energyLevel: this.getEnergyLevel(rawTrack.tempo || 120),
      preview_url: rawTrack.preview_url || "",
      download_url: rawTrack.download_url,
      license_type: rawTrack.license_type || "standard",
      metadata: {
        instrumentals: rawTrack.instrumentals || [],
        vocals: rawTrack.vocals || "instrumental",
        production: rawTrack.production || "Unknown",
        year: rawTrack.year || new Date().getFullYear(),
      },
    };
  }

  /**
   * Normalize multiple tracks
   */
  private normalizeTracks(rawTracks: Record<string, unknown>[]): EpidemicTrack[] {
    return rawTracks.map((track) => this.normalizeTrack(track));
  }

  /**
   * Determine energy level based on tempo
   */
  private getEnergyLevel(tempo: number): "low" | "medium" | "high" {
    if (tempo < 90) return "low";
    if (tempo < 140) return "medium";
    return "high";
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

// Export singleton instance
export const epidemicSoundService = new EpidemicSoundService();
