import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at').notNull()
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at').notNull()
});

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull()
});

export const songs = sqliteTable('songs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  coverUrl: text('cover_url'),
  duration: integer('duration'),
  source: text('source').notNull(),
  rawLrc: text('raw_lrc'),
  metaJson: text('meta_json'),
  lyricsJson: text('lyrics_json'),
  hasChinese: integer('has_chinese', { mode: 'boolean' }).default(false),
  lastUpdated: integer('last_updated').notNull()
});

export const playlistSongs = sqliteTable('playlist_songs', {
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  songId: text('song_id').notNull().references(() => songs.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at').notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.playlistId, table.songId] })
  };
});
