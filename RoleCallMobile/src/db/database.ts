// Database initialization and query layer
import * as SQLite from 'expo-sqlite';
import { Paths, Directory, File } from 'expo-file-system';
import { Asset } from 'expo-asset';
import type {
  Show,
  Person,
  Credit,
  CreditWithPerson,
  ShowWithCredits,
  RelatedShow,
  CreditRole,
  ShowRow,
  PersonRow,
  CreditRow,
} from '../types';
import { mapShowRow, mapPersonRow, mapCreditRow } from './mappers';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database by copying bundled DB to document directory
 * and opening it with expo-sqlite
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  const dbName = 'role_call.db';

  // Create SQLite directory in document directory
  const sqliteDir = new Directory(Paths.document, 'SQLite');
  const dbFile = new File(sqliteDir, dbName);

  // Check if DB already exists
  if (!dbFile.exists) {
    // Create directory if needed
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }

    // Load the bundled database asset
    const asset = Asset.fromModule(require('../../assets/data/role_call.db'));
    await asset.downloadAsync();

    if (asset.localUri) {
      // Copy to document directory using the new File API
      const sourceFile = new File(asset.localUri);
      sourceFile.copy(dbFile);
    }
  }

  // Open database
  db = await SQLite.openDatabaseAsync(dbName);

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  return db;
}

/**
 * Get the database instance (must be initialized first)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ============ Show Queries ============

/**
 * Search shows by title
 */
export async function searchShows(
  query: string,
  limit = 20
): Promise<Show[]> {
  const database = getDatabase();
  const searchTerm = `%${query.toLowerCase()}%`;

  const rows = await database.getAllAsync<ShowRow>(
    `SELECT * FROM shows
     WHERE LOWER(title) LIKE ?
       AND scraped_at IS NOT NULL
     ORDER BY imdb_rating DESC NULLS LAST
     LIMIT ?`,
    [searchTerm, limit]
  );

  return rows.map(mapShowRow);
}

/**
 * Get a single show by ID
 */
export async function getShow(showId: string): Promise<Show | null> {
  const database = getDatabase();

  const row = await database.getFirstAsync<ShowRow>(
    'SELECT * FROM shows WHERE id = ?',
    [showId]
  );

  return row ? mapShowRow(row) : null;
}

/**
 * Get multiple shows by IDs
 */
export async function getShowsByIds(showIds: string[]): Promise<Show[]> {
  if (showIds.length === 0) return [];

  const database = getDatabase();
  const placeholders = showIds.map(() => '?').join(',');

  const rows = await database.getAllAsync<ShowRow>(
    `SELECT * FROM shows WHERE id IN (${placeholders})`,
    showIds
  );

  return rows.map(mapShowRow);
}

/**
 * Get random highly-rated shows for discovery
 */
export async function getRandomShows(
  limit = 12,
  minRating = 7.5,
  excludeIds: string[] = []
): Promise<Show[]> {
  const database = getDatabase();

  let query = `
    SELECT * FROM shows
    WHERE imdb_rating >= ?
      AND scraped_at IS NOT NULL
  `;
  const params: (string | number)[] = [minRating];

  if (excludeIds.length > 0) {
    const placeholders = excludeIds.map(() => '?').join(',');
    query += ` AND id NOT IN (${placeholders})`;
    params.push(...excludeIds);
  }

  query += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  const rows = await database.getAllAsync<ShowRow>(query, params);
  return rows.map(mapShowRow);
}

// ============ Person Queries ============

/**
 * Get a person by ID
 */
export async function getPerson(personId: string): Promise<Person | null> {
  const database = getDatabase();

  const row = await database.getFirstAsync<PersonRow>(
    'SELECT * FROM people WHERE id = ?',
    [personId]
  );

  return row ? mapPersonRow(row) : null;
}

// ============ Credit Queries ============

/**
 * Get credits for a show with person details
 */
export async function getShowCredits(showId: string): Promise<CreditWithPerson[]> {
  const database = getDatabase();

  const rows = await database.getAllAsync<CreditRow & { person_name: string; person_image_url: string | null }>(
    `SELECT c.*, p.name as person_name, p.image_url as person_image_url
     FROM credits c
     JOIN people p ON c.person_id = p.id
     WHERE c.show_id = ?
     ORDER BY
       CASE c.role
         WHEN 'creator' THEN 1
         WHEN 'writer' THEN 2
         WHEN 'director' THEN 3
         WHEN 'actor' THEN 4
       END`,
    [showId]
  );

  return rows
    .map((row) => {
      const credit = mapCreditRow(row);
      if (!credit) return null;
      return {
        ...credit,
        personName: row.person_name,
        personImageUrl: row.person_image_url,
      };
    })
    .filter((c): c is CreditWithPerson => c !== null);
}

/**
 * Get a show with all its credits
 */
export async function getShowWithCredits(showId: string): Promise<ShowWithCredits | null> {
  const show = await getShow(showId);
  if (!show) return null;

  const credits = await getShowCredits(showId);

  return { ...show, credits };
}

/**
 * Get all shows by a specific person
 */
export async function getShowsByPerson(
  personId: string,
  roles?: CreditRole[]
): Promise<Show[]> {
  const database = getDatabase();

  let query = `
    SELECT DISTINCT s.* FROM shows s
    JOIN credits c ON s.id = c.show_id
    WHERE c.person_id = ?
  `;
  const params: string[] = [personId];

  if (roles && roles.length > 0) {
    const placeholders = roles.map(() => '?').join(',');
    query += ` AND c.role IN (${placeholders})`;
    params.push(...roles);
  }

  query += ` ORDER BY s.year_start DESC`;

  const rows = await database.getAllAsync<ShowRow>(query, params);
  return rows.map(mapShowRow);
}

// ============ Related Shows ============

/**
 * Find shows related by shared crew members
 */
export async function getRelatedShows(
  showId: string,
  excludeIds: string[] = [],
  limit = 20
): Promise<RelatedShow[]> {
  const database = getDatabase();

  // First get the key crew (creators, writers, directors) for this show
  const showCrew = await database.getAllAsync<{ person_id: string; role: string }>(
    `SELECT person_id, role FROM credits
     WHERE show_id = ? AND role IN ('creator', 'writer', 'director')`,
    [showId]
  );

  if (showCrew.length === 0) return [];

  const crewIds = showCrew.map((c) => c.person_id);
  const allExcluded = [showId, ...excludeIds];

  // Find other shows with these crew members
  const crewPlaceholders = crewIds.map(() => '?').join(',');
  const excludePlaceholders = allExcluded.map(() => '?').join(',');

  const relatedRows = await database.getAllAsync<ShowRow & { shared_count: number }>(
    `SELECT s.*, COUNT(DISTINCT c.person_id) as shared_count
     FROM shows s
     JOIN credits c ON s.id = c.show_id
     WHERE c.person_id IN (${crewPlaceholders})
       AND s.id NOT IN (${excludePlaceholders})
       AND c.role IN ('creator', 'writer', 'director')
       AND s.scraped_at IS NOT NULL
     GROUP BY s.id
     ORDER BY shared_count DESC, s.imdb_rating DESC
     LIMIT ?`,
    [...crewIds, ...allExcluded, limit]
  );

  // For each related show, get the specific shared crew
  const results: RelatedShow[] = [];

  for (const row of relatedRows) {
    const sharedCrewRows = await database.getAllAsync<{
      person_id: string;
      person_name: string;
      role: string;
    }>(
      `SELECT c.person_id, p.name as person_name, c.role
       FROM credits c
       JOIN people p ON c.person_id = p.id
       WHERE c.show_id = ?
         AND c.person_id IN (${crewPlaceholders})
         AND c.role IN ('creator', 'writer', 'director')`,
      [row.id, ...crewIds]
    );

    results.push({
      show: mapShowRow(row),
      sharedCrewCount: row.shared_count,
      sharedCrew: sharedCrewRows
        .filter((sc) => ['creator', 'writer', 'director', 'actor'].includes(sc.role))
        .map((sc) => ({
          personId: sc.person_id,
          personName: sc.person_name,
          role: sc.role as CreditRole,
        })),
    });
  }

  return results;
}
