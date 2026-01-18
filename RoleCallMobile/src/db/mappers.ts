// Pure functions to map database rows to domain types
import type {
  Show,
  ShowRow,
  Person,
  PersonRow,
  Credit,
  CreditRow,
  CreditRole,
} from '../types';

/**
 * Parse JSON string safely, returning default on failure
 */
function parseJsonArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Map a database show row to domain Show type
 */
export function mapShowRow(row: ShowRow): Show {
  return {
    id: row.id,
    title: row.title,
    yearStart: row.year_start,
    yearEnd: row.year_end,
    imdbRating: row.imdb_rating,
    genres: parseJsonArray(row.genres),
    description: row.description,
    imageUrl: row.image_url,
    scrapedAt: row.scraped_at,
  };
}

/**
 * Map a database person row to domain Person type
 */
export function mapPersonRow(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    userRating: row.user_rating,
  };
}

/**
 * Validate that a string is a valid CreditRole
 */
function isValidRole(role: string): role is CreditRole {
  return ['creator', 'writer', 'director', 'actor'].includes(role);
}

/**
 * Map a database credit row to domain Credit type
 */
export function mapCreditRow(row: CreditRow): Credit | null {
  if (!isValidRole(row.role)) {
    return null;
  }
  return {
    showId: row.show_id,
    personId: row.person_id,
    role: row.role,
    details: row.details,
  };
}

/**
 * Get thumbnail URL from full image URL
 */
export function getThumbnailUrl(imageUrl: string | null, width = 200): string | null {
  if (!imageUrl) return null;
  // IMDB image URLs can be resized by modifying the URL
  // Original: https://m.media-amazon.com/images/M/...._V1_.jpg
  // Resized:  https://m.media-amazon.com/images/M/...._V1_UX200_.jpg
  return imageUrl.replace(/_V1_/, `_V1_UX${width}_`);
}
