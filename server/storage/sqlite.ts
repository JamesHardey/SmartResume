import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, inArray } from "drizzle-orm";
import { 
  users, 
  jobRoles, 
  resumes, 
  exams, 
  candidateExams, 
  activities 
} from "../db/schema";
import type { 
  User, 
  JobRole, 
  Resume, 
  Exam, 
  CandidateExam, 
  Activity 
} from "./types";

const sqlite = new Database("database.sqlite");
const db = drizzle(sqlite);

export class SQLiteStorage {
  // Users
  async createUser(user: Omit<User, "id">): Promise<User> {
    const result = await db.insert(users).values({
      ...user,
      createdAt: user.createdAt ? new Date(user.createdAt) : null
    }).returning();
    const createdUser = result[0];
    return {
      ...createdUser,
      createdAt: createdUser.createdAt?.toISOString() || null
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    const user = result[0];
    if (!user) return null;
    return {
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    };
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    const user = result[0];
    if (!user) return null;
    return {
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    };
  }

  async getUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    }));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const result = await db.select().from(users).where(eq(users.role, role));
    return result.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    }));
  }

  // Job Roles
  async createJobRole(jobRole: Omit<JobRole, "id">): Promise<JobRole> {
    const result = await db.insert(jobRoles).values({
      ...jobRole,
      createdAt: jobRole.createdAt ? new Date(jobRole.createdAt) : null
    }).returning();
    const createdJobRole = result[0];
    return {
      ...createdJobRole,
      createdAt: createdJobRole.createdAt?.toISOString() || null
    };
  }

  async getJobRoleById(id: number): Promise<JobRole | null> {
    const result = await db.select().from(jobRoles).where(eq(jobRoles.id, id));
    const jobRole = result[0];
    if (!jobRole) return null;
    return {
      ...jobRole,
      createdAt: jobRole.createdAt?.toISOString() || null
    };
  }

  async getJobRoles(): Promise<JobRole[]> {
    const result = await db.select().from(jobRoles);
    return result.map(role => ({
      ...role,
      createdAt: role.createdAt?.toISOString() || null
    }));
  }

  async getJobRolesByAdmin(adminId: number): Promise<JobRole[]> {
    return await db.select().from(jobRoles).where(eq(jobRoles.adminId, adminId));
  }

  // Resumes
  async createResume(resume: Omit<Resume, "id">): Promise<Resume> {
    const result = await db.insert(resumes).values({
      ...resume,
      createdAt: resume.createdAt ? new Date(resume.createdAt) : null
    }).returning();
    const createdResume = result[0];
    return {
      ...createdResume,
      createdAt: createdResume.createdAt?.toISOString() || null
    };
  }

  async getResumeById(id: number): Promise<Resume | null> {
    const result = await db.select().from(resumes).where(eq(resumes.id, id));
    const resume = result[0];
    if (!resume) return null;
    return {
      ...resume,
      createdAt: resume.createdAt?.toISOString() || null
    };
  }

  async getResumesByJobRole(jobRoleId: number): Promise<Resume[]> {
    const result = await db.select().from(resumes).where(eq(resumes.jobRoleId, jobRoleId));
    return result.map(resume => ({
      ...resume,
      createdAt: resume.createdAt?.toISOString() || null
    }));
  }

  async getResumesByCandidate(candidateId: number): Promise<Resume[]> {
    const result = await db.select().from(resumes).where(eq(resumes.candidateId, candidateId));
    return result.map(resume => ({
      ...resume,
      createdAt: resume.createdAt?.toISOString() || null
    }));
  }

  // Exams
  async createExam(exam: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
    const result = await db.insert(exams).values({
      ...exam,
      createdAt: new Date()
    }).returning();
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null
    };
  }

  async getExamById(id: string): Promise<Exam | null> {
    const result = await db.select().from(exams).where(eq(exams.id, id));
    if (result.length === 0) return null;
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null
    };
  }

  async getExamsByJobRole(jobRoleId: string): Promise<Exam[]> {
    const result = await db.select().from(exams).where(eq(exams.jobRoleId, jobRoleId));
    return result.map(exam => ({
      ...exam,
      createdAt: exam.createdAt?.toISOString() || null
    }));
  }

  // Candidate Exams
  async createCandidateExam(exam: Omit<CandidateExam, 'id' | 'createdAt' | 'startedAt' | 'completedAt' | 'flagged' | 'flagReasons'>): Promise<CandidateExam> {
    const result = await db.insert(candidateExams).values({
      ...exam,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      flagged: false,
      flagReasons: null
    }).returning();
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null,
      startedAt: result[0].startedAt?.toISOString() || null,
      completedAt: result[0].completedAt?.toISOString() || null
    };
  }

  async getCandidateExamById(id: string): Promise<CandidateExam | null> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    if (result.length === 0) return null;
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null,
      startedAt: result[0].startedAt?.toISOString() || null,
      completedAt: result[0].completedAt?.toISOString() || null
    };
  }

  async getCandidateExamsByCandidateId(candidateId: string): Promise<CandidateExam[]> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.candidateId, candidateId));
    return result.map(exam => ({
      ...exam,
      createdAt: exam.createdAt?.toISOString() || null,
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null
    }));
  }

  async getCandidateExamsByExamId(examId: string): Promise<CandidateExam[]> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.examId, examId));
    return result.map(exam => ({
      ...exam,
      createdAt: exam.createdAt?.toISOString() || null,
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null
    }));
  }

  async updateCandidateExam(id: number, updates: Partial<CandidateExam>): Promise<void> {
    await db.update(candidateExams)
      .set(updates)
      .where(eq(candidateExams.id, id));
  }

  // Activities
  async createActivity(activity: Omit<Activity, "id">): Promise<Activity> {
    const result = await db.insert(activities).values({
      userId: activity.userId,
      action: activity.action,
      details: activity.details,
      createdAt: activity.createdAt
    }).returning();
    return result[0];
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.userId, userId));
  }

  async getCandidatesWithResumes(): Promise<User[]> {
    const resumes = await db.select().from(resumes);
    const candidateIds = [...new Set(resumes.map(r => r.candidateId))];
    
    if (candidateIds.length === 0) return [];
    
    return await db.select()
      .from(users)
      .where(and(
        eq(users.role, "candidate"),
        inArray(users.id, candidateIds)
      ));
  }

  async assignExamToCandidate(candidateExam: Omit<CandidateExam, "id">): Promise<CandidateExam> {
    const result = await db.insert(candidateExams).values({
      candidateId: candidateExam.candidateId,
      examId: candidateExam.examId,
      status: "pending",
      score: null,
      passed: null,
      startedAt: null,
      completedAt: null,
      answers: null,
      flagged: false,
      flagReasons: null,
      createdAt: new Date().toISOString()
    }).returning();
    return result[0];
  }
} 