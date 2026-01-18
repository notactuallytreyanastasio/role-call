// Core domain types for Role Call

export type CreditRole = 'creator' | 'writer' | 'director' | 'actor';

export interface Show {
  id: string; // IMDB tt ID (e.g., "tt0496424")
  title: string;
  yearStart: number | null;
  yearEnd: number | null;
  imdbRating: number | null;
  genres: string[]; // Parsed from JSON string in DB
  description: string | null;
  imageUrl: string | null;
  scrapedAt: string | null;
}

export interface Person {
  id: string; // IMDB nm ID (e.g., "nm0000114")
  name: string;
  imageUrl: string | null;
  userRating: number | null; // 1-5 stars
}

export interface Credit {
  showId: string;
  personId: string;
  role: CreditRole;
  details: string | null; // e.g., "38 episodes", character name
}

export interface CreditWithPerson extends Credit {
  personName: string;
  personImageUrl: string | null;
}

export interface CreditWithShow extends Credit {
  showTitle: string;
  showYearStart: number | null;
  showImdbRating: number | null;
  showImageUrl: string | null;
}

export interface ShowWithCredits extends Show {
  credits: CreditWithPerson[];
}

export interface Connection {
  personId: string;
  personName: string;
  role: CreditRole;
  sourceShowTitle: string;
}

export interface Recommendation {
  show: Show;
  score: number; // Weighted recommendation score
  connections: Connection[];
}

export interface RelatedShow {
  show: Show;
  sharedCrewCount: number;
  sharedCrew: Array<{
    personId: string;
    personName: string;
    role: CreditRole;
  }>;
}

// Role weights for recommendation scoring
export const ROLE_WEIGHTS: Record<CreditRole, number> = {
  creator: 3.0,
  writer: 2.5,
  director: 1.5,
  actor: 1.0,
} as const;

// Database row types (snake_case as stored in SQLite)
export interface ShowRow {
  id: string;
  title: string;
  year_start: number | null;
  year_end: number | null;
  imdb_rating: number | null;
  genres: string | null; // JSON string
  description: string | null;
  image_url: string | null;
  scraped_at: string | null;
}

export interface PersonRow {
  id: string;
  name: string;
  image_url: string | null;
  user_rating: number | null;
}

export interface CreditRow {
  show_id: string;
  person_id: string;
  role: string;
  details: string | null;
}

// Utility type for query results
export type SQLiteRow = Record<string, string | number | null>;
