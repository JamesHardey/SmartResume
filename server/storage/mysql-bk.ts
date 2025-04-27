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
import type { 
  User, 
  JobRole, 
  Resume, 
  Exam, 
  CandidateExam, 
  Activity 
} from "./types";
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

// Function to check if table exists
async function tableExists(tableName: string): Promise<boolean> {
  const [result] = await pool.query(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
    [process.env.DB_NAME || "smart_resume_evaluator", tableName]
  );
  return (result as any)[0].count > 0;
}

// Function to get MySQL data type from drizzle type
function getMySQLType(dataType: string): string {
  switch (dataType) {
    case 'number':
      return 'INT';
    case 'string':
      return 'VARCHAR(255)';
    case 'boolean':
      return 'BOOLEAN';
    case 'date':
      return 'DATETIME';
    case 'json':
      return 'JSON';
    default:
      return 'VARCHAR(255)';
  }
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

interface DBResume {
  id: number;
  candidateId: number;
  jobRoleId: number;
  content: string;
  score: string | null;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  feedback: string | null;
  parsedData: unknown;
  createdAt: Date;
}

interface ResumeResponse {
  id: number;
  candidateId: number;
  jobRoleId: number;
  content: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  feedback: string | null;
  score: number | null;
  parsedData: any;
  createdAt: Date;
}

export class MySQLStorage {
  constructor() {
    // Initialize tables when the storage is created
    createTables().catch(err => {
      console.error("Error creating tables:", err);
    });
  }

  // Users
  async createUser(user: Omit<User, "id">): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const result = await db.insert(users).values({
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

  async updateUser(id: number, user: Omit<User, "id">): Promise<User> {
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
  async createJobRole(jobRole: Omit<JobRole, "id">): Promise<JobRole> {
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
    
    // Get the last inserted ID using a raw query
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

  async updateJobRole(
    id: number, 
    jobRole: Omit<JobRole, "id" | "keySkills"> & { keySkills: string[] | string }
  ): Promise<JobRole> {
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
  async createResume(resume: Omit<DBResume, 'id' | 'createdAt' | 'status' | 'score' | 'feedback'>): Promise<ResumeResponse> {
    try {
      // Use the raw pool to get reliable insert ID
      const [result] = await pool.query(
        `INSERT INTO resumes (candidate_id, job_role_id, content, status, parsed_data) VALUES (?, ?, ?, ?, ?)`,
        [
          resume.candidateId,
          resume.jobRoleId,
          resume.content,
          'pending',
          JSON.stringify(resume.parsedData || null)
        ]
      );
      
      // Get the insert ID directly from the result
      const insertId = (result as any).insertId;
      
      if (!insertId || isNaN(insertId)) {
        throw new Error('Failed to get valid insert ID');
      }
      
      // Fetch the newly created resume
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
        content: newResume.content || '',
        status: (newResume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        feedback: newResume.feedback,
        score: newResume.score ? parseFloat(newResume.score) : null,
        parsedData: newResume.parsed_data ? JSON.parse(newResume.parsed_data) : null,
        createdAt: new Date(newResume.created_at || Date.now())
      };
    } catch (error) {
      console.error('Error creating resume:', error);
      throw error;
    }
  }

  async getResume(id: number): Promise<ResumeResponse | null> {
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
        content: resume.content || '',
        status: (resume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        feedback: resume.feedback,
        score: resume.score ? parseFloat(resume.score) : null,
        parsedData: resume.parsed_data ? JSON.parse(resume.parsed_data) : null,
        createdAt: new Date(resume.created_at || Date.now())
      };
    } catch (error) {
      console.error('Error fetching resume:', error);
      return null;
    }
  }

  async getResumesByJobRole(jobRoleId: number): Promise<ResumeResponse[]> {
    const result = await db.select().from(resumes).where(eq(resumes.jobRoleId, jobRoleId));
    return result
      .filter((resume): resume is (typeof resume & { candidateId: number; jobRoleId: number }) => 
        Boolean(resume && typeof resume.candidateId === 'number' && typeof resume.jobRoleId === 'number'))
      .map(resume => ({
        id: resume.id,
        candidateId: resume.candidateId,
        jobRoleId: resume.jobRoleId,
        content: resume.content || '',
        status: (resume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        feedback: resume.feedback,
        score: resume.score ? parseFloat(resume.score) : null,
        parsedData: resume.parsedData ? JSON.parse(resume.parsedData as string) : null,
        createdAt: new Date(resume.createdAt || Date.now())
      }));
  }

  async getResumesByCandidate(candidateId: number): Promise<DBResume[]> {
    const result = await db.select().from(resumes).where(eq(resumes.candidateId, candidateId));
    return result
      .filter(resume => resume.candidateId && resume.jobRoleId)
      .map(resume => ({
        id: resume.id,
        candidateId: resume.candidateId as number,
        jobRoleId: resume.jobRoleId as number,
        content: resume.content || '',
        score: resume.score,
        status: resume.status as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        feedback: resume.feedback,
        parsedData: typeof resume.parsedData === 'string' ? resume.parsedData : null,
        createdAt: resume.createdAt || new Date()
      }));
  }

  // async getResumes(jobRoleId?: number, candidateId?: number): Promise<ResumeResponse[]> {
  //   try {
  //     let query = 'SELECT * FROM resumes';
  //     const queryParams = [];
      
  //     // Build the WHERE clause if we have conditions
  //     if (jobRoleId !== undefined || candidateId !== undefined) {
  //       query += ' WHERE';
        
  //       if (jobRoleId !== undefined) {
  //         query += ' job_role_id = ?';
  //         queryParams.push(jobRoleId);
  //       }
        
  //       if (candidateId !== undefined) {
  //         if (jobRoleId !== undefined) {
  //           query += ' AND';
  //         }
          
  //         query += ' candidate_id = ?';
  //         queryParams.push(candidateId);
  //       }
  //     }
      
  //     const [rows] = await pool.query(query, queryParams);
      
  //     if (!Array.isArray(rows)) {
  //       return [];
  //     }

  //     console.log(rows);
      
  //     return rows.map((resume: any) => ({
  //       id: resume.id,
  //       candidateId: resume.candidate_id,
  //       jobRoleId: resume.job_role_id,
  //       content: resume.content || '',
  //       status: (resume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
  //       feedback: resume.feedback,
  //       score: resume.score ? parseFloat(resume.score) : null,
  //       parsedData: resume.parsed_data ? JSON.parse(resume.parsed_data) : null,
  //       createdAt: new Date(resume.created_at || Date.now())
  //     }));
  //   } catch (error) {
  //     console.error('Error fetching resumes:', error);
  //     return [];
  //   }
  // }


  async getResumes(jobRoleId?: number, candidateId?: number): Promise<ResumeResponse[]> {
    try {
      let query = 'SELECT * FROM resumes';
      const queryParams: any[] = [];
  
      if (jobRoleId !== undefined || candidateId !== undefined) {
        query += ' WHERE';
        if (jobRoleId !== undefined) {
          query += ' job_role_id = ?';
          queryParams.push(jobRoleId);
        }
        if (candidateId !== undefined) {
          if (jobRoleId !== undefined) {
            query += ' AND';
          }
          query += ' candidate_id = ?';
          queryParams.push(candidateId);
        }
      }
  
      const [rows] = await pool.query(query, queryParams);
  
      if (!Array.isArray(rows)) {
        console.warn('No resumes found or query returned unexpected result');
        return [];
      }
  
      return rows.map((resume: any) => {
        let feedback = resume.feedback;
        let parsedData = null;
  
        if (resume.feedback) {
          try {
            feedback = JSON.parse(resume.feedback);
          } catch (e) {
            console.error(
              `Failed to parse feedback for resume ID ${resume.id}: ${resume.feedback}`,
              e
            );
            feedback = resume.feedback; // Keep as string to match interface
          }
        }
  
        if (resume.parsed_data) {
          try {
            parsedData = JSON.parse(resume.parsed_data);
          } catch (e) {
            console.error(
              `Failed to parse parsed_data for resume ID ${resume.id}: ${resume.parsed_data}`,
              e
            );
            parsedData = null; // Set to null to avoid invalid data
          }
        }
  
        return {
          id: resume.id,
          candidateId: resume.candidate_id,
          jobRoleId: resume.job_role_id,
          content: resume.content || '',
          status: (resume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
          feedback,
          score: resume.score ? parseFloat(resume.score) : null,
          parsedData,
          createdAt: new Date(resume.created_at || Date.now()),
        };
      });
    } catch (error) {
      console.error('Error fetching resumes:', error);
      return [];
    }
  }

  async updateResumeScore(
    id: number,
    score: number,
    reasons: string,
    parsedData: any
  ): Promise<ResumeResponse> {
    try {
      // Use raw pool query for more control
      await pool.query(
        `UPDATE resumes SET score = ?, feedback = ?, parsed_data = ?, status = ? WHERE id = ?`,
        [
          score.toString(),
          reasons,
          JSON.stringify(parsedData),
          'reviewed',
          id
        ]
      );
      
      // Fetch the updated resume
      const [rows] = await pool.query(
        'SELECT * FROM resumes WHERE id = ?',
        [id]
      );
      
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Failed to fetch updated resume');
      }
      
      const updatedResume = rows[0] as any;
      
      return {
        id: updatedResume.id,
        candidateId: updatedResume.candidate_id,
        jobRoleId: updatedResume.job_role_id,
        content: updatedResume.content || '',
        status: (updatedResume.status || 'pending') as 'pending' | 'reviewed' | 'accepted' | 'rejected',
        feedback: updatedResume.feedback,
        score: updatedResume.score ? parseFloat(updatedResume.score) : null,
        parsedData: updatedResume.parsed_data ? JSON.parse(updatedResume.parsed_data) : null,
        createdAt: new Date(updatedResume.created_at || Date.now())
      };
    } catch (error) {
      console.error('Error updating resume score:', error);
      throw error;
    }
  }

  async updateResumeQualification(id: number, qualified: boolean): Promise<ResumeResponse> {
    try {
      const status = qualified ? "accepted" : "rejected";
      
      await pool.query(
        'UPDATE resumes SET status = ? WHERE id = ?',
        [status, id]
      );
      
      const resume = await this.getResume(id);
      if (!resume) throw new Error("Resume not found after update");
      return resume;
    } catch (error) {
      console.error('Error updating resume qualification:', error);
      throw error;
    }
  }

  // Exams
  async createExam(exam: Omit<Exam, "id">): Promise<Exam> {
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
    return {
      id: exam.id,
      title: exam.title,
      questions: exam.questions as string,
      passMark: exam.passMark,
      timeLimit: exam.timeLimit,
      jobRoleId: exam.jobRoleId,
      adminId: exam.adminId,
      createdAt: exam.createdAt?.toISOString() || null
    };
  }

  async getExamsByJobRole(jobRoleId: number): Promise<Exam[]> {
    const result = await db.select().from(exams).where(eq(exams.jobRoleId, jobRoleId));
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
  async createCandidateExam(examId: number, candidateId: number): Promise<CandidateExam> {
    const result = await db.insert(candidateExams)
      .values({
        examId,
        candidateId,
        status: "pending" as const,
        answers: "[]",
        flagReasons: "[]",
        passed: false,
        flagged: false
      });
    
    const [newExam] = await db.select()
      .from(candidateExams)
      .where(eq(candidateExams.id, result[0].insertId));
    
    return {
      id: newExam.id,
      examId: newExam.examId || 0,
      candidateId: newExam.candidateId || 0,
      status: newExam.status as "pending" | "in_progress" | "completed" | "failed",
      score: newExam.score || 0,
      passed: newExam.passed || false,
      answers: newExam.answers ? JSON.parse(newExam.answers as string) : [],
      flagged: newExam.flagged || false,
      flagReasons: newExam.flagReasons ? JSON.parse(newExam.flagReasons as string) : [],
      startedAt: newExam.startedAt?.toISOString() || null,
      completedAt: newExam.completedAt?.toISOString() || null,
      createdAt: newExam.createdAt?.toISOString() || null
    };
  }

  async getCandidateExam(id: number): Promise<CandidateExam | null> {
    const [result] = await db.select()
      .from(candidateExams)
      .where(eq(candidateExams.id, id));
    
    if (!result) return null;
    
    return {
      id: result.id,
      examId: result.examId || 0,
      candidateId: result.candidateId || 0,
      status: result.status as "pending" | "in_progress" | "completed" | "failed",
      score: result.score || 0,
      passed: result.passed || false,
      answers: result.answers ? JSON.parse(result.answers as string) : [],
      flagged: result.flagged || false,
      flagReasons: result.flagReasons ? JSON.parse(result.flagReasons as string) : [],
      startedAt: result.startedAt?.toISOString() || null,
      completedAt: result.completedAt?.toISOString() || null,
      createdAt: result.createdAt?.toISOString() || null
    };
  }

  async getCandidateExamsByCandidate(candidateId: number): Promise<CandidateExam[]> {
    const result = await db.select()
      .from(candidateExams)
      .where(eq(candidateExams.candidateId, candidateId));
    
    return result.map(exam => ({
      id: exam.id,
      examId: exam.examId || 0,
      candidateId: exam.candidateId || 0,
      status: exam.status as "pending" | "in_progress" | "completed" | "failed",
      score: exam.score || 0,
      passed: exam.passed || false,
      answers: exam.answers ? JSON.parse(exam.answers as string) : [],
      flagged: exam.flagged || false,
      flagReasons: exam.flagReasons ? JSON.parse(exam.flagReasons as string) : [],
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null,
      createdAt: exam.createdAt?.toISOString() || null
    }));
  }

  async startCandidateExam(id: number): Promise<CandidateExam> {
    await db.update(candidateExams)
      .set({
        status: "in_progress",
        startedAt: new Date()
      })
      .where(eq(candidateExams.id, id));
    
    const [exam] = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    return {
      id: exam.id,
      examId: exam.examId || 0,
      candidateId: exam.candidateId || 0,
      status: exam.status as "pending" | "in_progress" | "completed" | "failed",
      score: exam.score || 0,
      passed: exam.passed || false,
      answers: exam.answers ? JSON.parse(exam.answers as string) : [],
      flagged: exam.flagged || false,
      flagReasons: exam.flagReasons ? JSON.parse(exam.flagReasons as string) : [],
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null,
      createdAt: exam.createdAt?.toISOString() || null
    };
  }

  async completeCandidateExam(
    id: number,
    answers: any[],
    score: number,
    flags: string[] | null = null
  ): Promise<CandidateExam> {
    await db.update(candidateExams)
      .set({
        status: "completed",
        completedAt: new Date(),
        answers: JSON.stringify(answers),
        score: score,
        passed: score >= 60, // Assuming 60 is the pass mark
        flagged: flags && flags.length > 0,
        flagReasons: flags ? JSON.stringify(flags) : null
      })
      .where(eq(candidateExams.id, id));
    
    const [exam] = await db.select().from(candidateExams).where(eq(candidateExams.id, id));
    return {
      id: exam.id,
      examId: exam.examId || 0,
      candidateId: exam.candidateId || 0,
      status: exam.status as "pending" | "in_progress" | "completed" | "failed",
      score: exam.score || 0,
      passed: exam.passed || false,
      answers: exam.answers ? JSON.parse(exam.answers as string) : [],
      flagged: exam.flagged || false,
      flagReasons: exam.flagReasons ? JSON.parse(exam.flagReasons as string) : [],
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null,
      createdAt: exam.createdAt?.toISOString() || null
    };
  }

  async getExamCandidates(examId: number): Promise<CandidateExam[]> {
    const result = await db.select().from(candidateExams).where(eq(candidateExams.examId, examId));
    return result.map(exam => ({
      id: exam.id,
      examId: exam.examId || 0,
      candidateId: exam.candidateId || 0,
      status: exam.status as "pending" | "in_progress" | "completed" | "failed",
      score: exam.score || 0,
      passed: exam.passed || false,
      answers: exam.answers ? JSON.parse(exam.answers as string) : [],
      flagged: exam.flagged || false,
      flagReasons: exam.flagReasons ? JSON.parse(exam.flagReasons as string) : [],
      startedAt: exam.startedAt?.toISOString() || null,
      completedAt: exam.completedAt?.toISOString() || null,
      createdAt: exam.createdAt?.toISOString() || null
    }));
  }

  // Activities
  async createActivity(activity: { userId: number; action: string; details?: any }): Promise<Activity> {
    await db.insert(activities).values({
      userId: activity.userId,
      action: activity.action,
      details: activity.details ? JSON.stringify(activity.details) : null
    }).execute();
    
    const [newActivity] = await db.select()
      .from(activities)
      .where(
        and(
          eq(activities.userId, activity.userId),
          eq(activities.action, activity.action)
        )
      )
      .execute();

    if (!newActivity) {
      throw new Error('Failed to create activity');
    }

    return {
      id: newActivity.id,
      userId: newActivity.userId,
      action: newActivity.action,
      details: newActivity.details as string,
      createdAt: newActivity.createdAt?.toISOString() || null
    };
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    const result = await db.select().from(activities).where(eq(activities.userId, userId));
    return result.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      details: activity.details as string,
      createdAt: activity.createdAt?.toISOString() || null
    }));
  }

  async getRecentActivities(limit: number): Promise<Activity[]> {
    const result = await db.select()
      .from(activities)
      .orderBy(activities.createdAt)
      .limit(limit);
    
    return result.map(activity => ({
      id: activity.id,
      userId: activity.userId,
      action: activity.action,
      details: activity.details as string,
      createdAt: activity.createdAt?.toISOString() || null
    }));
  }

  // New method to get candidates who applied for a specific job role
  async getCandidatesByJobRole(jobRoleId: number): Promise<User[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        name: users.name,
        role: users.role,
        location: users.location,
        createdAt: users.createdAt
      })
      .from(users)
      .innerJoin(resumes, eq(users.id, resumes.candidateId))
      .where(and(
        eq(resumes.jobRoleId, jobRoleId),
        eq(users.role, "candidate")
      ));
    
    return result.map(user => ({
      ...user,
      createdAt: user.createdAt?.toISOString() || null
    }));
  }

  async assignExamToCandidate(candidateExam: { candidateId: number; examId: number }): Promise<CandidateExam> {
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
    }).execute();

    const [newExam] = await db.select()
      .from(candidateExams)
      .where(
        and(
          eq(candidateExams.candidateId, candidateExam.candidateId),
          eq(candidateExams.examId, candidateExam.examId)
        )
      )
      .execute();

    if (!newExam || !newExam.candidateId || !newExam.examId) {
      throw new Error('Failed to create candidate exam');
    }

    return {
      id: newExam.id,
      candidateId: newExam.candidateId,
      examId: newExam.examId,
      status: newExam.status || "pending",
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

  async getCandidatesWithResumes(): Promise<Array<{ user: User; resumes: Resume[] }>> {
    const candidates = await db.select()
      .from(users)
      .where(eq(users.role, "candidate"));
    
    const result = await Promise.all(candidates.map(async (candidate) => {
      const userResumes = await db.select()
        .from(resumes)
        .where(eq(resumes.candidateId, candidate.id));
      
      return {
        user: {
          ...candidate,
          createdAt: candidate.createdAt?.toISOString() || null
        },
        resumes: userResumes.map(resume => ({
          id: resume.id,
          fileName: "", // Not stored in MySQL
          fileUrl: resume.content,
          candidateId: resume.candidateId,
          jobRoleId: resume.jobRoleId,
          score: resume.score ? parseFloat(resume.score) : null,
          reasons: resume.feedback,
          parsedData: resume.parsedData && typeof resume.parsedData === 'string' ? JSON.parse(resume.parsedData) : null,
          qualified: resume.status === "accepted",
          createdAt: resume.createdAt?.toISOString() || null
        }))
      };
    }));
    
    return result;
  }
} 