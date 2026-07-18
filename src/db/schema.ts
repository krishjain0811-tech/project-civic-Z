import { pgTable, serial, text, integer, timestamp, boolean, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  phoneNumber: text('phone_number'),
  fullName: text('full_name'),
  username: text('username').notNull().unique(),
  age: integer('age'),
  profilePicUrl: text('profile_pic_url'),
  bio: text('bio'),
  role: text('role').default('CITIZEN'),
  isVerified: boolean('is_verified').default(false),
  kycDocType: text('kyc_doc_type'),
  kycDocNumber: text('kyc_doc_number'),
  humanityPoints: integer('humanity_points').default(50),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pointLedger = pgTable('point_ledger', {
  id: text('id').primaryKey(), // uuid
  userId: integer('user_id').references(() => users.id).notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(), // EARNED_MONEY_PURCHASE, EARNED_CIVIC_WORK, etc.
  description: text('description').notNull(),
  previousHash: text('previous_hash').notNull(),
  currentHash: text('current_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const projects = pgTable('projects', {
  id: text('id').primaryKey(), // uuid
  title: text('title').notNull(),
  description: text('description').notNull(),
  listingFeePaid: boolean('listing_fee_paid').default(false),
  feeAmount: real('fee_amount').default(10.0),
  maxWorkers: integer('max_workers').default(50),
  status: text('status').default('ACTIVE'),
  beforePhotoUrl: text('before_photo_url'),
  afterPhotoUrl: text('after_photo_url'),
  assignedWorkers: text('assigned_workers'), // comma-separated user ID strings
  pointsEarned: integer('points_earned').default(10),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const workspaceLogs = pgTable('workspace_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // firebase user uid
  serviceName: text('service_name').notNull(), // 'DRIVE', 'GMAIL', 'CONTACTS', 'CHAT'
  actionType: text('action_type').notNull(), // 'LIST', 'SEND', 'CREATE', etc.
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});
