import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and, inArray, sql } from "drizzle-orm";
import { 
  users, 
  jobRoles, 
  resumes, 
  exams, 
  candidateExams, 
  activities 
} from "../db/schema";
import { 
  User, InsertUser, 
  JobRole, InsertJobRole, 
  Resume, InsertResume, 
  Exam, InsertExam, 
  CandidateExam, InsertCandidateExam,
  Activity, InsertActivity
} from "@shared/schema";
import bcrypt from "bcrypt";

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smart_resume_evaluator",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const db = drizzle(pool);

type Question = {
  id: string;
  text: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  correctAnswer?: string | number;
};

// Function to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
    [process.env.DB_NAME || "smart_resume_evaluator", tableName]
  );
  return (result as any)[0].count > 0;
}

// Function to create all tables
async function createTables() {
  const tables = [
    { 
      name: "users", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "email", type: "VARCHAR(255)", notNull: true },
        { name: "password", type: "VARCHAR(255)", notNull: true },
        { name: "name", type: "VARCHAR(255)", notNull: true },
        { name: "role", type: "VARCHAR(50)", notNull: true, default: "'candidate'" },
        { name: "location", type: "VARCHAR(255)" },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    },
    { 
      name: "job_roles", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "title", type: "VARCHAR(255)", notNull: true },
        { name: "description", type: "TEXT", notNull: true },
        { name: "requirements", type: "TEXT", notNull: true },
        { name: "responsibilities", type: "TEXT", notNull: true },
        { name: "key_skills", type: "TEXT", notNull: true },
        { name: "location", type: "VARCHAR(255)", notNull: true },
        { name: "admin_id", type: "INT", notNull: true },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    },
    { 
      name: "resumes", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "candidate_id", type: "INT", notNull: true },
        { name: "job_role_id", type: "INT", notNull: true },
        { name: "file_name", type: "VARCHAR(255)" },
        { name: "file_url", type: "VARCHAR(255)" },
        { name: "content", type: "TEXT", notNull: true },
        { name: "score", type: "DECIMAL(5,2)" },
        { name: "status", type: "VARCHAR(50)", default: "'pending'" },
        { name: "feedback", type: "TEXT" },
        { name: "parsed_data", type: "JSON" },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    },
    { 
      name: "exams", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "title", type: "VARCHAR(255)", notNull: true },
        { name: "questions", type: "JSON", notNull: true },
        { name: "pass_mark", type: "INT", notNull: true },
        { name: "time_limit", type: "INT", notNull: true },
        { name: "job_role_id", type: "INT", notNull: true },
        { name: "admin_id", type: "INT", notNull: true },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    },
    { 
      name: "candidate_exams", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "candidate_id", type: "INT", notNull: true },
        { name: "exam_id", type: "INT", notNull: true },
        { name: "status", type: "VARCHAR(50)", notNull: true, default: "'pending'" },
        { name: "score", type: "INT" },
        { name: "passed", type: "BOOLEAN" },
        { name: "started_at", type: "DATETIME" },
        { name: "completed_at", type: "DATETIME" },
        { name: "answers", type: "JSON" },
        { name: "flagged", type: "BOOLEAN", default: "false" },
        { name: "flag_reasons", type: "JSON" },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    },
    { 
      name: "activities", 
      columns: [
        { name: "id", type: "INT", notNull: true, primaryKey: true, autoIncrement: true },
        { name: "user_id", type: "INT", notNull: true },
        { name: "action", type: "VARCHAR(255)", notNull: true },
        { name: "details", type: "JSON" },
        { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
      ]
    }
  ];

  // Create tables if they don't exist
  for (const { name, columns } of tables) {
    if (!(await tableExists(name))) {
      console.log(`Creating table ${name}...`);
      const columnDefs = columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (col.notNull) def += " NOT NULL";
        if (col.autoIncrement) def += " AUTO_INCREMENT";
        if (col.primaryKey) def += " PRIMARY KEY";
        if (col.default) def += ` DEFAULT ${col.default}`;
        return def;
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${name} (
          ${columnDefs.join(", ")}
        )
      `);
    }
  }

  // Create default admin user if it doesn't exist
  const [adminExists] = await pool.query(
    "SELECT COUNT(*) as count FROM users WHERE email = ?",
    ["admin@example.com"]
  );

  if ((adminExists as any)[0].count === 0) {
    console.log("Creating default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await pool.query(
      "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
      ["admin@example.com", hashedPassword, "Admin User", "admin"]
    );
  }
}

export class MySQLStorage {
  constructor() {
    // Initialize tables when the storage is created
    createTables().catch(err => {
      console.error("Error creating tables:", err);
    });
  }

  // Users
  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db.insert(users).values({
      email: user.email,
      password: hashedPassword,
      name: user.name,
      role: user.role as "admin" | "candidate",
      location: user.location
    });
    
    const [newUser] = await db.select().from(users).where(eq(users.email, user.email));
    return {
      ...newUser,
      createdAt: newUser.createdAt?.toISOString() || null
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email));
    if (result.length === 0) return null;
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null
    };
  }

  async getUserById(id: number): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id));
    if (result.length === 0) return null;
    return {
      ...result[0],
      createdAt: result[0].createdAt?.toISOString() || null
    };
  }

  async getUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    }));
  }

  async getUsersByRole(role: "admin" | "candidate"): Promise<User[]> {
    const result = await db.select().from(users).where(eq(users.role, role));
    return result.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    }));
  }

  async updateUser(id: number, user: InsertUser): Promise<User> {
    const updateData: any = {
      email: user.email,
      name: user.name,
      role: user.role as "admin" | "candidate",
      location: user.location
    };

    if (user.password) {
      updateData.password = await bcrypt.hash(user.password, 10);
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, id));
    
    const [updatedUser] = await db.select().from(users).where(eq(users.id, id));
    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt?.toISOString() || null
    };
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Job Roles
  async createJobRole(jobRole: InsertJobRole): Promise<JobRole> {
    if (!jobRole.adminId) {
      throw new Error("Admin ID is required to create a job role");
    }

    await db.insert(jobRoles).values({
      title: jobRole.title,
      description: jobRole.description,
      requirements: jobRole.requirements,
      responsibilities: jobRole.responsibilities,
      keySkills: typeof jobRole.keySkills === 'string' ? jobRole.keySkills : JSON.stringify(jobRole.keySkills),
      location: jobRole.location,
      adminId: jobRole.adminId
    });
    
    const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT LAST_INSERT_ID() as lastId');
    const lastId = rows[0]?.lastId;
    if (!lastId) {
      throw new Error("Failed to create job role");
    }

    const [newJobRole] = await db.select().from(jobRoles).where(eq(jobRoles.id, Number(lastId)));
    if (!newJobRole) {
      throw new Error("Failed to fetch created job role");
    }

    return {
      ...newJobRole,
      keySkills: typeof newJobRole.keySkills === 'string' ? JSON.parse(newJobRole.keySkills) : newJobRole.keySkills || [],
      createdAt: newJobRole.createdAt?.toISOString() || null
    };
  }

  async getJobRole(id: number): Promise<JobRole | null> {
    const result = await db.select().from(jobRoles).where(eq(jobRoles.id, id));
    if (result.length === 0) return null;
    return {
      ...result[0],
      keySkills: typeof result[0].keySkills === 'string' ? JSON.parse(result[0].keySkills) : result[0].keySkills || [],
      createdAt: result[0].createdAt?.toISOString() || null
    };
  }

  async getJobRoles(): Promise<JobRole[]> {
    const result = await db.select().from(jobRoles);
    return result.map(role => ({
      ...role,
      keySkills: typeof role.keySkills === 'string' ? JSON.parse(role.keySkills) : role.keySkills || [],
      createdAt: role.createdAt?.toISOString() || null
    }));
  }

  async getJobRolesByAdmin(adminId: number): Promise<JobRole[]> {
    const result = await db.select().from(jobRoles).where(eq(jobRoles.adminId, adminId));
    return result.map(role => ({
      ...role,
      keySkills: typeof role.keySkills === 'string' ? JSON.parse(role.keySkills) : role.keySkills || [],
      createdAt: role.createdAt?.toISOString() || null
    }));
  }

  async updateJobRole(id: number, jobRole: InsertJobRole): Promise<JobRole> {
    const keySkillsValue = Array.isArray(jobRole.keySkills) ? JSON.stringify(jobRole.keySkills) 
      : typeof jobRole.keySkills === 'string' ? jobRole.keySkills 
      : JSON.stringify([]);

    await db.update(jobRoles)
      .set({
        title: jobRole.title,
        description: jobRole.description,
        requirements: jobRole.requirements,
        responsibilities: jobRole.responsibilities,
        keySkills: keySkillsValue,
        location: jobRole.location,
        adminId: jobRole.adminId
      })
      .where(eq(jobRoles.id, id));
    
    const [updatedJobRole] = await db.select().from(jobRoles).where(eq(jobRoles.id, id));
    return {
      ...updatedJobRole,
      keySkills: typeof updatedJobRole.keySkills === 'string' ? JSON.parse(updatedJobRole.keySkills) : updatedJobRole.keySkills || [],
      createdAt: updatedJobRole.createdAt?.toISOString() || null
    };
  }

  async deleteJobRole(id: number): Promise<void> {
    await db.delete(jobRoles).where(eq(jobRoles.id, id));
  }

  // Resumes
  async createResume(resume: InsertResume): Promise<Resume> {
    try {
      const [result] = await pool.query(
        `INSERT INTO resumes (candidate_id, job_role_id, file_name, file_url, content, status, parsed_data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          resume.candidateId,
          resume.jobRoleId,
          resume.fileName || null,
          resume.fileUrl || null,
          resume.content,
          'pending',
          resume.parsedData ? JSON.stringify(resume.parsedData) : null
        ]
      );
      
      const insertId = (result as any).insertId;
      if (!insertId) {
        throw new Error("Failed to create resume");
      }

      const [rows] = await pool.query(
        'SELECT * FROM resumes WHERE id = ?',
        [insertId]
      );
      
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Failed to fetch newly created resume');
      }
      
      const newResume = rows[0] as any;
      
      return {
        id: newResume.id,
        candidateId: newResume.candidate_id,
        jobRoleId: newResume.job_role_id,
        fileName: newResume.file_name || '',
        fileUrl: newResume.file_url || '',
        content: newResume.content || '',
        status: newResume.status as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        reasons: newResume.feedback || null,
        score: newResume.score ? parseFloat(newResume.score) : null,
        parsedData: newResume.parsed_data ? JSON.parse(newResume.parsed_data) : null,
        qualified: newResume.status === 'accepted',
        createdAt: new Date(newResume.created_at).toISOString()
      };
    } catch (error) {
      console.error('Error creating resume:', error);
      throw error;
    }
  }

  async getResume(id: number): Promise<Resume | null> {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM resumes WHERE id = ?',
        [id]
      );
      
      if (!Array.isArray(rows) || rows.length === 0) {
        return null;
      }
      
      const resume = rows[0] as any;

      
      return {
        id: resume.id,
        candidateId: resume.candidate_id,
        jobRoleId: resume.job_role_id,
        fileName: resume.file_name || '',
        fileUrl: resume.file_url || '',
        content: resume.content || '',
        status: resume.status as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        reasons: resume.feedback || null,
        score: resume.score ? parseFloat(resume.score) : null,
        parsedData: resume.parsed_data ? resume.parsed_data : null,
        qualified: resume.status === 'accepted',
        createdAt: new Date(resume.created_at).toISOString()
      };
    } catch (error) {
      console.error('Error fetching resume:', error);
      return null;
    }
  }

  async getResumes(jobRoleId?: number, candidateId?: number): Promise<Resume[]> {
    try {
      let query = `
        SELECT r.*, 
          u.id as user_id,
          u.email as user_email,
          u.name as user_name,
          u.role as user_role,
          u.location as user_location,
          u.created_at as user_created_at
        FROM resumes r
        LEFT JOIN users u ON r.candidate_id = u.id
      `;
      const queryParams: any[] = [];
  
      if (jobRoleId !== undefined || candidateId !== undefined) {
        query += ' WHERE';
        if (jobRoleId !== undefined) {
          query += ' r.job_role_id = ?';
          queryParams.push(jobRoleId);
        }
        if (candidateId !== undefined) {
          if (jobRoleId !== undefined) {
            query += ' AND';
          }
          query += ' r.candidate_id = ?';
          queryParams.push(candidateId);
        }
      }
  
      const [rows] = await pool.query(query, queryParams);
  
      if (!Array.isArray(rows)) {
        return [];
      }
  
      return rows.map((resume: any) => {
        let parsedData = null;
        if (resume.parsed_data) {
          try {
            parsedData = resume.parsed_data;
            // If parsedData has a parsedData property, use that instead
            if (parsedData && parsedData.parsedData) {
              parsedData = parsedData.parsedData;
            }
          } catch (e) {
            console.error(
              `Failed to parse parsed_data for resume ID ${resume.id}: ${resume.parsed_data}`,
              e
            );
            parsedData = null;
          }
        }

        return {
          id: resume.id,
          candidateId: resume.candidate_id,
          jobRoleId: resume.job_role_id,
          fileName: resume.file_name || '',
          fileUrl: resume.file_url || '',
          content: resume.content || '',
          status: resume.status as 'pending' | 'reviewed' | 'accepted' | 'rejected',
          reasons: resume.feedback || null,
          score: resume.score ? parseFloat(resume.score) : null,
          parsedData,
          qualified: resume.status === 'accepted',
          createdAt: new Date(resume.created_at).toISOString(),
          candidateName: resume.user_name || null,
          candidateEmail: resume.user_email || null,
          candidateRole: resume.user_role || null,
          candidateLocation: resume.user_location || null,
          candidateCreatedAt: resume.user_created_at ? new Date(resume.user_created_at).toISOString() : null
        };
      });
    } catch (error) {
      console.error('Error fetching resumes:', error);
      return [];
    }
  }

  async getResumesByJobRole(jobRoleId: number): Promise<Resume[]> {
    const results = await db.select().from(resumes).where(eq(resumes.jobRoleId, jobRoleId));
    return results.map(resume => ({
      ...resume,
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    }));
  }

  async updateResume(id: number, data: {
    score?: number | null;
    parsedData?: string | null;
    reasons?: string | null;
    qualified?: boolean;
  }): Promise<Resume> {
    try {
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (data.score !== undefined) {
        updateFields.push('score = ?');
        updateValues.push(data.score);
      }

      if (data.parsedData !== undefined) {
        updateFields.push('parsed_data = ?');
        updateValues.push(data.parsedData);
      }

      if (data.reasons !== undefined) {
        updateFields.push('feedback = ?');
        updateValues.push(data.reasons);
      }

      if (data.qualified !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(data.qualified ? 'accepted' : 'rejected');
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      const query = `UPDATE resumes SET ${updateFields.join(', ')} WHERE id = ?`;
      updateValues.push(id);

      await pool.query(query, updateValues);

      const updatedResume = await this.getResume(id);
      if (!updatedResume) {
        throw new Error('Failed to fetch updated resume');
      }

      return updatedResume;
    } catch (error) {
      console.error('Error updating resume:', error);
      throw error;
    }
  }

  // Exams
  async createExam(exam: InsertExam): Promise<Exam> {
    await db.insert(exams).values({
      title: exam.title,
      questions: JSON.stringify(exam.questions),
      passMark: exam.passMark,
      timeLimit: exam.timeLimit,
      jobRoleId: exam.jobRoleId,
      adminId: exam.adminId
    });
    
    const [newExam] = await db.select().from(exams).where(eq(exams.title, exam.title));
    return {
      id: newExam.id,
      title: newExam.title,
      questions: newExam.questions as string,
      passMark: newExam.passMark,
      timeLimit: newExam.timeLimit,
      jobRoleId: newExam.jobRoleId,
      adminId: newExam.adminId,
      createdAt: newExam.createdAt?.toISOString() || null
    };
  }

  async getExam(id: number): Promise<Exam | null> {
    const result = await db.select().from(exams).where(eq(exams.id, id));
    if (result.length === 0) return null;
    const exam = result[0];
    let questions: Question[] = [];
    try {
      questions = exam.questions ? JSON.parse(exam.questions as string) : [];
      if (!Array.isArray(questions)) {
        console.error(`Invalid questions format for exam ${id}:`, questions);
        questions = [];
      }
    } catch (error) {
      console.error(`Failed to parse questions for exam ${id}:`, error);
      questions = [];
    }
    return {
      id: exam.id,
      title: exam.title,
      questions,
      passMark: exam.passMark,
      timeLimit: exam.timeLimit,
      jobRoleId: exam.jobRoleId,
      adminId: exam.adminId,
      createdAt: exam.createdAt?.toISOString() || new Date().toISOString()
    };
  }

  async getExams(): Promise<Exam[]> {
    const result = await db.select().from(exams);
    return result.map(exam => ({
      id: exam.id,
      title: exam.title,
      questions: exam.questions as string,
      passMark: exam.passMark,
      timeLimit: exam.timeLimit,
      jobRoleId: exam.jobRoleId,
      adminId: exam.adminId,
      createdAt: exam.createdAt?.toISOString() || null
    }));
  }

  // Candidate Exams
  async assignExamToCandidate(candidateExam: InsertCandidateExam): Promise<CandidateExam> {
    await db.insert(candidateExams).values({
      candidateId: candidateExam.candidateId,
      examId: candidateExam.examId,
      status: "pending" as const,
      score: null,
      passed: false,
      startedAt: null,
      completedAt: null,
      answers: null,
      flagged: false,
      flagReasons: null
    });

    const [newExam] = await db.select()
      .from(candidateExams)
      .where(
        and(
          eq(candidateExams.candidateId, candidateExam.candidateId),
          eq(candidateExams.examId, candidateExam.examId)
        )
      );

    if (!newExam) {
      throw new Error('Failed to create candidate exam');
    }

    return {
      id: newExam.id,
      candidateId: newExam.candidateId,
      examId: newExam.examId,
      status: newExam.status as 'pending' | 'in_progress' | 'completed',
      score: newExam.score || null,
      passed: newExam.passed || false,
      startedAt: newExam.startedAt?.toISOString() || null,
      completedAt: newExam.completedAt?.toISOString() || null,
      answers: newExam.answers ? JSON.parse(newExam.answers as string) : null,
      flagged: newExam.flagged || false,
      flagReasons: newExam.flagReasons ? JSON.parse(newExam.flagReasons as string) : null,
      createdAt: newExam.createdAt?.toISOString() || null
    };
  }

  async getCandidateExam(id: number): Promise<CandidateExam | null> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    if (result.length === 0) return null;
    const ce = result[0];
    return {
      id: ce.id,
      candidateId: ce.candidateId,
      examId: ce.examId,
      status: ce.status as 'pending' | 'in_progress' | 'completed',
      score: ce.score || null,
      passed: ce.passed || false,
      startedAt: ce.startedAt?.toISOString() || null,
      completedAt: ce.completedAt?.toISOString() || null,
      answers: ce.answers ? JSON.parse(ce.answers as string) : null,
      flagged: ce.flagged || false,
      flagReasons: ce.flagReasons ? JSON.parse(ce.flagReasons as string) : null,
      createdAt: ce.createdAt?.toISOString() || null
    };
  }

  async getCandidateExamsByCandidate(candidateId: number): Promise<CandidateExam[]> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.candidateId, candidateId));
    return result.map(ce => ({
      id: ce.id,
      candidateId: ce.candidateId,
      examId: ce.examId,
      status: ce.status as 'pending' | 'in_progress' | 'completed',
      score: ce.score || null,
      passed: ce.passed || false,
      startedAt: ce.startedAt?.toISOString() || null,
      completedAt: ce.completedAt?.toISOString() || null,
      answers: ce.answers ? JSON.parse(ce.answers as string) : null,
      flagged: ce.flagged || false,
      flagReasons: ce.flagReasons ? JSON.parse(ce.flagReasons as string) : null,
      createdAt: ce.createdAt?.toISOString() || null
    }));
  }

  async getExamCandidates(examId: number): Promise<CandidateExam[]> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.examId, examId));
    return result.map(ce => ({
      id: ce.id,
      candidateId: ce.candidateId,
      examId: ce.examId,
      status: ce.status as 'pending' | 'in_progress' | 'completed',
      score: ce.score || null,
      passed: ce.passed || false,
      startedAt: ce.startedAt?.toISOString() || null,
      completedAt: ce.completedAt?.toISOString() || null,
      answers: ce.answers ? JSON.parse(ce.answers as string) : null,
      flagged: ce.flagged || false,
      flagReasons: ce.flagReasons ? JSON.parse(ce.flagReasons as string) : null,
      createdAt: ce.createdAt?.toISOString() || null
    }));
  }

  async startCandidateExam(id: number): Promise<CandidateExam> {
    await db.update(candidateExams)
      .set({
        status: 'in_progress',
        startedAt: new Date()
      })
      .where(eq(candidateExams.id, id));

    const [updatedExam] = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    return {
      id: updatedExam.id,
      candidateId: updatedExam.candidateId,
      examId: updatedExam.examId,
      status: updatedExam.status as 'pending' | 'in_progress' | 'completed',
      score: updatedExam.score || null,
      passed: updatedExam.passed || false,
      startedAt: updatedExam.startedAt?.toISOString() || null,
      completedAt: updatedExam.completedAt?.toISOString() || null,
      answers: updatedExam.answers ? JSON.parse(updatedExam.answers as string) : null,
      flagged: updatedExam.flagged || false,
      flagReasons: updatedExam.flagReasons ? JSON.parse(updatedExam.flagReasons as string) : null,
      createdAt: updatedExam.createdAt?.toISOString() || null
    };
  }

  async completeCandidateExam(id: number, answers: any[], score: number, flags?: any[]): Promise<CandidateExam> {
    await db.update(candidateExams)
      .set({
        status: 'completed',
        score,
        passed: score >= 70, // Assuming 70% pass mark, adjust as needed
        completedAt: new Date(),
        answers: JSON.stringify(answers),
        flagged: flags && flags.length > 0,
        flagReasons: flags ? JSON.stringify(flags) : null
      })
      .where(eq(candidateExams.id, id));

    const [updatedExam] = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    return {
      id: updatedExam.id,
      candidateId: updatedExam.candidateId,
      examId: updatedExam.examId,
      status: updatedExam.status as 'pending' | 'in_progress' | 'completed',
      score: updatedExam.score || null,
      passed: updatedExam.passed || false,
      startedAt: updatedExam.startedAt?.toISOString() || null,
      completedAt: updatedExam.completedAt?.toISOString() || null,
      answers: updatedExam.answers ? JSON.parse(updatedExam.answers as string) : null,
      flagged: updatedExam.flagged || false,
      flagReasons: updatedExam.flagReasons ? JSON.parse(updatedExam.flagReasons as string) : null,
      createdAt: updatedExam.createdAt?.toISOString() || null
    };
  }

  // Activities
  async createActivity(activity: InsertActivity): Promise<Activity> {
    await db.insert(activities).values({
      userId: activity.userId,
      action: activity.action,
      details: activity.details ? JSON.stringify(activity.details) : null
    });

    const [newActivity] = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, activity.userId),
          eq(activities.action, activity.action)
        )
      )
      .orderBy(sql`created_at DESC`)
      .limit(1);

    return {
      id: newActivity.id,
      userId: newActivity.userId,
      action: newActivity.action,
      details: newActivity.details ? JSON.parse(newActivity.details as string) : null,
      createdAt: newActivity.createdAt?.toISOString() || null
    };
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    const result = await db.select()
      .from(activities)
      .orderBy(sql`created_at DESC`)
      .limit(limit);
    
    return result.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      details: activity.details ? JSON.parse(activity.details as string) : null,
      createdAt: activity.createdAt?.toISOString() || null
    }));
  }

  // Dashboard
  async getCandidatesWithResumes(): Promise<(User & { resumes: Resume[] })[]> {
    const allUsers = await this.getUsersByRole('candidate');
    const allResumes = await this.getResumes();

    return allUsers.map(user => ({
      ...user,
      resumes: allResumes.filter(resume => resume.candidateId === user.id)
    }));
  }
}