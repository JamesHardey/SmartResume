import { mysqlTable, text, serial, int, boolean, json, timestamp, decimal, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for both admin and candidates)
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "candidate"] }).notNull().default("candidate"),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job Roles table
export const jobRoles = mysqlTable("job_roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  responsibilities: text("responsibilities").notNull(),
  keySkills: text("key_skills").notNull(),
  location: text("location").notNull(),
  adminId: int("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Resumes table
export const resumes = mysqlTable("resumes", {
  id: serial("id").primaryKey(),
  candidateId: int("candidate_id").references(() => users.id),
  jobRoleId: int("job_role_id").references(() => jobRoles.id),
  content: text("content").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  status: text("status", { enum: ["pending", "reviewed", "accepted", "rejected"] }).default("pending"),
  feedback: text("feedback"),
  parsedData: json("parsed_data").default('null'),
  createdAt: timestamp("created_at").defaultNow(),
});

// Exams table
export const exams = mysqlTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  questions: json("questions").notNull(),
  passMark: int("pass_mark").notNull(),
  timeLimit: int("time_limit").notNull(), // in minutes
  jobRoleId: int("job_role_id").references(() => jobRoles.id),
  adminId: int("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Candidate Exam assignments
export const candidateExams = mysqlTable("candidate_exams", {
  id: serial("id").primaryKey(),
  candidateId: int("candidate_id").references(() => users.id),
  examId: int("exam_id").references(() => exams.id),
  status: text("status", { enum: ["pending", "in_progress", "completed"] }).default("pending"),
  score: int("score"),
  passed: boolean("passed"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  answers: json("answers"), // Candidate's answers
  flagged: boolean("flagged").default(false),
  flagReasons: json("flag_reasons"), // Proctoring flags
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity log
export const activities = mysqlTable("activities", {
  id: serial("id").primaryKey(),
  userId: int("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
}); 