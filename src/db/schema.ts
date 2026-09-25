import { pgTable, text, jsonb, integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { Profile } from '@/game/content';
export const operators = pgTable('veilbreak_operators', {
 id: uuid('id').primaryKey(),
 profile: jsonb('profile').$type<Profile>().notNull(),
 updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
export const matchRecords = pgTable('veilbreak_matches', {
 id: uuid('id').defaultRandom().primaryKey(),
 operatorId: uuid('operator_id').notNull().references(()=>operators.id),
 callsign:text('callsign').notNull(),
 mode:text('mode').notNull(),
 mission:integer('mission').notNull(),
 kills:integer('kills').notNull(),
 xp:integer('xp').notNull(),
 wave:integer('wave').notNull(),
 duration:integer('duration').notNull(),
 outcome:text('outcome').notNull(),
 createdAt:timestamp('created_at').defaultNow().notNull(),
});
