import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  doublePrecision,
  boolean,
  jsonb,
  date,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  googleId: text('google_id').unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  defaultSessionMinutes: integer('default_session_minutes').notNull().default(15),
  inviteCode: text('invite_code').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted', 'blocked'] }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('friendships_pair_idx').on(table.requesterId, table.addresseeId)
  ]
)

export const beerSessions = pgTable(
  'beer_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    drinkType: text('drink_type', {
      enum: ['beer', 'wine', 'cocktail', 'shot', 'cider', 'non_alcoholic']
    }).notNull(),
    note: text('note'),
    address: text('address'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    endedEarlyAt: timestamp('ended_early_at', { withTimezone: true })
  },
  (table) => [index('beer_sessions_user_idx').on(table.userId), index('beer_sessions_expires_idx').on(table.expiresAt)]
)

export const reactions = pgTable('reactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  beerSessionId: uuid('beer_session_id').notNull().references(() => beerSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type', { enum: ['cheers', 'on_my_way', 'raised_glass', 'fire'] }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  category: text('category').notNull(),
  text: text('text').notNull(),
  difficulty: text('difficulty', { enum: ['easy', 'medium', 'hard'] }).notNull().default('easy'),
  isActive: boolean('is_active').notNull().default(true)
})

export const dailyChallenges = pgTable('daily_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: date('date').notNull().unique(),
  challengeId: uuid('challenge_id').notNull().references(() => challenges.id),
  selectedAt: timestamp('selected_at', { withTimezone: true }).notNull().defaultNow()
})

export const challengeCompletions = pgTable(
  'challenge_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dailyChallengeId: uuid('daily_challenge_id').notNull().references(() => dailyChallenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    completedAt: timestamp('completed_at', { withTimezone: true }).notNull().defaultNow(),
    proofNote: text('proof_note')
  },
  (table) => [uniqueIndex('challenge_completions_unique_idx').on(table.dailyChallengeId, table.userId)]
)

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  keys: jsonb('keys').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  friendRequest: boolean('friend_request').notNull().default(true),
  friendSessionStarted: boolean('friend_session_started').notNull().default(true),
  reaction: boolean('reaction').notNull().default(true),
  dailyChallenge: boolean('daily_challenge').notNull().default(true)
})

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull()
})
