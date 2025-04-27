import { pgTable, text, serial, integer, boolean, jsonb, timestamp, decimal, foreignKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for both admin and candidates)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "candidate"] }).notNull().default("candidate"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job roles
export const jobRoles = pgTable("job_roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  responsibilities: text("responsibilities").notNull(),
  requirements: text("requirements").notNull(),
  keySkills: text("key_skills").array().notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
  adminId: integer("admin_id").references(() => users.id),
});

// Resumes
export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  candidateId: integer("candidate_id"),
  jobRoleId: integer("job_role_id").references(() => jobRoles.id),
  parsedData: jsonb("parsed_data"), // Extracted resume data
  score: decimal("score", { precision: 5, scale: 2 }), // Percentage match
  reasons: text("reasons"), // Reasons for the score
  location: text("location"),
  qualified: boolean("qualified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exams
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  jobRoleId: integer("job_role_id").references(() => jobRoles.id),
  questions: jsonb("questions").notNull(), // Array of question objects
  passMark: integer("pass_mark").notNull().default(70),
  timeLimit: integer("time_limit").notNull().default(45), // In minutes
  createdAt: timestamp("created_at").defaultNow(),
  adminId: integer("admin_id").references(() => users.id),
});

// Candidate Exam assignments
export const candidateExams = pgTable("candidate_exams", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => users.id),
  examId: integer("exam_id").references(() => exams.id),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).default("pending"),
  score: integer("score"),
  passed: boolean("passed"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  answers: jsonb("answers"), // Candidate's answers
  flagged: boolean("flagged").default(false),
  flagReasons: jsonb("flag_reasons"), // Proctoring flags
});

// Activity log
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertJobRoleSchema = createInsertSchema(jobRoles).omit({
  id: true,
  createdAt: true,
});

export const insertResumeSchema = createInsertSchema(resumes).omit({
  id: true,
  parsedData: true,
  score: true,
  reasons: true,
  qualified: true,
  createdAt: true,
});

export const insertExamSchema = createInsertSchema(exams).omit({
  id: true,
  createdAt: true,
});

export const insertCandidateExamSchema = createInsertSchema(candidateExams).omit({
  id: true,
  status: true,
  score: true,
  passed: true,
  startedAt: true,
  completedAt: true,
  answers: true,
  flagged: true,
  flagReasons: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

// Custom types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type JobRole = typeof jobRoles.$inferSelect;
export type InsertJobRole = z.infer<typeof insertJobRoleSchema>;

export interface Resume {
  id: number;
  fileName: string;
  fileUrl: string;
  candidateId: number | null;
  jobRoleId: number | null;
  parsedData: any;
  score: string | null;
  reasons: string | null;
  location: string | null;
  qualified: boolean | null;
  createdAt: Date | null;
  candidateName: string | null;
  candidateEmail: string | null;
  candidateRole: string | null;
  candidateLocation: string | null;
  candidateCreatedAt: Date | null;
}

export type InsertResume = z.infer<typeof insertResumeSchema>;

export type Exam = typeof exams.$inferSelect;
export type InsertExam = z.infer<typeof insertExamSchema>;

export type CandidateExam = typeof candidateExams.$inferSelect;
export type InsertCandidateExam = z.infer<typeof insertCandidateExamSchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

// Types for app functionality
export type Question = {
  id: string;
  text: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer?: string | number;
};

export type ParsedResume = {
  name: string;
  email: string;
  phone?: string;
  experience: string[];
  education: string[];
  skills: string[];
  location?: string;
};

export type ProctoringFlag = {
  timestamp: number;
  type: 'no_face' | 'multiple_faces' | 'looking_away' | 'tab_switch';
  details?: string;
};
