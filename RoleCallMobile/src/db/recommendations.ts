// Recommendation algorithm - finds shows based on shared writers/creators
import { getDatabase } from './database';
import { mapShowRow } from './mappers';
import type { Show, Recommendation, Connection, CreditRole, ShowRow, ROLE_WEIGHTS } from '../types';

/**
 * Get show recommendations based on liked shows
 * Algorithm:
 * 1. Get all writers/creators from liked shows
 * 2. Find all shows by those writers
 * 3. Count how many liked-show-writers worked on each
 * 4. Rank by overlap count + IMDB rating
 */
export async function getRecommendations(
  likedShowIds: string[],
  excludeIds: string[] = [],
  limit = 12
): Promise<Recommendation[]> {
  if (likedShowIds.length === 0) return [];

  const database = getDatabase();

  // Combine all excluded IDs (liked + hidden)
  const allExcluded = [...new Set([...likedShowIds, ...excludeIds])];

  // Get all key crew (creators, writers) from liked shows
  const likedPlaceholders = likedShowIds.map(() => '?').join(',');

  const crewRows = await database.getAllAsync<{
    person_id: string;
    person_name: string;
    role: string;
    source_show_id: string;
    source_show_title: string;
  }>(
    `SELECT DISTINCT c.person_id, p.name as person_name, c.role,
            s.id as source_show_id, s.title as source_show_title
     FROM credits c
     JOIN people p ON c.person_id = p.id
     JOIN shows s ON c.show_id = s.id
     WHERE c.show_id IN (${likedPlaceholders})
       AND c.role IN ('creator', 'writer')`,
    likedShowIds
  );

  if (crewRows.length === 0) return [];

  // Build a map of person -> their shows the user liked
  const personToSourceShows = new Map<string, Array<{ showId: string; showTitle: string; role: CreditRole }>>();

  for (const row of crewRows) {
    if (!['creator', 'writer', 'director', 'actor'].includes(row.role)) continue;

    const existing = personToSourceShows.get(row.person_id) || [];
    existing.push({
      showId: row.source_show_id,
      showTitle: row.source_show_title,
      role: row.role as CreditRole,
    });
    personToSourceShows.set(row.person_id, existing);
  }

  const crewIds = [...personToSourceShows.keys()];
  const crewPlaceholders = crewIds.map(() => '?').join(',');
  const excludePlaceholders = allExcluded.map(() => '?').join(',');

  // Find shows by these crew members
  const recommendedRows = await database.getAllAsync<ShowRow & { overlap_count: number }>(
    `SELECT s.*, COUNT(DISTINCT c.person_id) as overlap_count
     FROM shows s
     JOIN credits c ON s.id = c.show_id
     WHERE c.person_id IN (${crewPlaceholders})
       AND s.id NOT IN (${excludePlaceholders})
       AND c.role IN ('creator', 'writer')
       AND s.scraped_at IS NOT NULL
     GROUP BY s.id
     ORDER BY overlap_count DESC, s.imdb_rating DESC
     LIMIT ?`,
    [...crewIds, ...allExcluded, limit]
  );

  // Build recommendations with connection details
  const recommendations: Recommendation[] = [];

  for (const row of recommendedRows) {
    // Get which crew members connect this show to liked shows
    const connectionRows = await database.getAllAsync<{
      person_id: string;
      person_name: string;
      role: string;
    }>(
      `SELECT c.person_id, p.name as person_name, c.role
       FROM credits c
       JOIN people p ON c.person_id = p.id
       WHERE c.show_id = ?
         AND c.person_id IN (${crewPlaceholders})
         AND c.role IN ('creator', 'writer')`,
      [row.id, ...crewIds]
    );

    const connections: Connection[] = [];

    for (const conn of connectionRows) {
      const sourceShows = personToSourceShows.get(conn.person_id) || [];
      for (const source of sourceShows) {
        if (['creator', 'writer', 'director', 'actor'].includes(conn.role)) {
          connections.push({
            personId: conn.person_id,
            personName: conn.person_name,
            role: conn.role as CreditRole,
            sourceShowTitle: source.showTitle,
          });
        }
      }
    }

    recommendations.push({
      show: mapShowRow(row),
      score: row.overlap_count,
      connections,
    });
  }

  return recommendations;
}

/**
 * Get recommendations for a specific person (shows they worked on)
 */
export async function getRecommendationsForPerson(
  personId: string,
  excludeIds: string[] = [],
  limit = 20
): Promise<Show[]> {
  const database = getDatabase();

  let query = `
    SELECT DISTINCT s.* FROM shows s
    JOIN credits c ON s.id = c.show_id
    WHERE c.person_id = ?
      AND s.scraped_at IS NOT NULL
  `;
  const params: (string | number)[] = [personId];

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(',');
    query += ` AND s.id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  query += ` ORDER BY s.imdb_rating DESC LIMIT ?`;
  params.push(limit);

  const rows = await database.getAllAsync<ShowRow>(query, params);
  return rows.map(mapShowRow);
}

/**
 * Get writers who have worked on the most liked shows
 */
export async function getTopWriters(
  likedShowIds: string[],
  limit = 10
): Promise<Array<{ personId: string; personName: string; showCount: number }>> {
  if (likedShowIds.length === 0) return [];

  const database = getDatabase();
  const placeholders = likedShowIds.map(() => '?').join(',');

  const rows = await database.getAllAsync<{
    person_id: string;
    person_name: string;
    show_count: number;
  }>(
    `SELECT c.person_id, p.name as person_name, COUNT(DISTINCT c.show_id) as show_count
     FROM credits c
     JOIN people p ON c.person_id = p.id
     WHERE c.show_id IN (${placeholders})
       AND c.role IN ('creator', 'writer')
     GROUP BY c.person_id
     ORDER BY show_count DESC
     LIMIT ?`,
    [...likedShowIds, limit]
  );

  return rows.map((r) => ({
    personId: r.person_id,
    personName: r.person_name,
    showCount: r.show_count,
  }));
}
