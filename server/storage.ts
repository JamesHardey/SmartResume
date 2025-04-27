import { 
  User, InsertUser, 
  JobRole, InsertJobRole, 
  Resume, InsertResume, 
  Exam, InsertExam, 
  CandidateExam, InsertCandidateExam,
  Activity, InsertActivity,
  Question, ParsedResume, ProctoringFlag
} from "@shared/schema";

// Storage interface for the application
export interface IStorage {
  // User management
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Job roles
  createJobRole(jobRole: InsertJobRole): Promise<JobRole>;
  getJobRoles(): Promise<JobRole[]>;
  getJobRole(id: number): Promise<JobRole | undefined>;
  updateJobRole(id: number, jobRole: InsertJobRole): Promise<JobRole>;
  deleteJobRole(id: number): Promise<void>;
  
  // Resumes
  createResume(resume: InsertResume): Promise<Resume>;
  getResumes(jobRoleId?: number): Promise<Resume[]>;
  getResume(id: number): Promise<Resume | undefined>;
  updateResumeScore(id: number, score: number, reasons: string, parsedData: ParsedResume): Promise<Resume>;
  updateResumeQualification(id: number, qualified: boolean): Promise<Resume>;
  
  // Exams
  createExam(exam: InsertExam): Promise<Exam>;
  getExams(): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  
  // Candidate exams
  assignExamToCandidate(candidateExam: InsertCandidateExam): Promise<CandidateExam>;
  getCandidateExams(candidateId: number): Promise<CandidateExam[]>;
  getExamCandidates(examId: number): Promise<CandidateExam[]>;
  getCandidateExamsByCandidate(candidateId: number): Promise<any>;
  getCandidateExam(id: number): Promise<CandidateExam | undefined>;
  startCandidateExam(id: number): Promise<CandidateExam>;
  completeCandidateExam(id: number, answers: any[], score?: number, flags?: ProctoringFlag[]): Promise<CandidateExam>;
  
  // Activities
  logActivity(activity: InsertActivity): Promise<Activity>;
  getRecentActivities(limit: number): Promise<Activity[]>;

  // Get candidates who have applied (have resumes)
  getCandidatesWithResumes(): Promise<Array<{
    user: User;
    resumes: Resume[];
  }>>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private jobRoles: Map<number, JobRole>;
  private resumes: Map<number, Resume>;
  private exams: Map<number, Exam>;
  private candidateExams: Map<number, CandidateExam>;
  private activities: Map<number, Activity>;
  
  private userId: number;
  private jobRoleId: number;
  private resumeId: number;
  private examId: number;
  private candidateExamId: number;
  private activityId: number;
  
  constructor() {
    this.users = new Map();
    this.jobRoles = new Map();
    this.resumes = new Map();
    this.exams = new Map();
    this.candidateExams = new Map();
    this.activities = new Map();
    
    this.userId = 1;
    this.jobRoleId = 1;
    this.resumeId = 1;
    this.examId = 1;
    this.candidateExamId = 1;
    this.activityId = 1;
    
    // Create default admin user
    this.createUser({
      email: "admin@example.com",
      password: "admin123",
      name: "Admin User",
      role: "admin",
      location: "New York, NY"
    });
  }
  
  // User methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: new Date() 
    };
    this.users.set(id, newUser);
    return newUser;
  }
  
  async updateUser(id: number, user: InsertUser): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updatedUser: User = {
      ...user,
      id,
      createdAt: existingUser.createdAt
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    this.users.delete(id);
  }
  
  // Job role methods
  async createJobRole(jobRole: InsertJobRole): Promise<JobRole> {
    const id = this.jobRoleId++;
    const newJobRole: JobRole = {
      ...jobRole,
      id,
      createdAt: new Date()
    };
    this.jobRoles.set(id, newJobRole);
    return newJobRole;
  }
  
  async getJobRoles(): Promise<JobRole[]> {
    return Array.from(this.jobRoles.values());
  }
  
  async getJobRole(id: number): Promise<JobRole | undefined> {
    return this.jobRoles.get(id);
  }
  
  async updateJobRole(id: number, jobRole: InsertJobRole): Promise<JobRole> {
    const existingJobRole = this.jobRoles.get(id);
    if (!existingJobRole) {
      throw new Error(`Job role with id ${id} not found`);
    }
    
    const updatedJobRole: JobRole = {
      ...jobRole,
      id,
      createdAt: existingJobRole.createdAt
    };
    this.jobRoles.set(id, updatedJobRole);
    return updatedJobRole;
  }
  
  async deleteJobRole(id: number): Promise<void> {
    const jobRole = this.jobRoles.get(id);
    if (!jobRole) {
      throw new Error(`Job role with id ${id} not found`);
    }
    
    this.jobRoles.delete(id);
  }
  
  // Resume methods
  async createResume(resume: InsertResume): Promise<Resume> {
    const id = this.resumeId++;
    const newResume: Resume = {
      ...resume,
      id,
      parsedData: null,
      score: null,
      reasons: null,
      qualified: false,
      createdAt: new Date()
    };
    this.resumes.set(id, newResume);
    return newResume;
  }
  
  async getResumes(jobRoleId?: number): Promise<Resume[]> {
    let resumes = Array.from(this.resumes.values());
    if (jobRoleId) {
      resumes = resumes.filter(resume => resume.jobRoleId === jobRoleId);
    }
    return resumes;
  }
  
  async getResume(id: number): Promise<Resume | undefined> {
    return this.resumes.get(id);
  }
  
  async updateResumeScore(id: number, score: number, reasons: string, parsedData:  ParsedResume): Promise<Resume> {
    const resume = this.resumes.get(id);
    if (!resume) {
      throw new Error(`Resume with id ${id} not found`);
    }
    
    const updatedResume: Resume = {
      ...resume,
      score,
      reasons,
      parsedData
    };
    this.resumes.set(id, updatedResume);
    return updatedResume;
  }
  
  async updateResumeQualification(id: number, qualified: boolean): Promise<Resume> {
    const resume = this.resumes.get(id);
    if (!resume) {
      throw new Error(`Resume with id ${id} not found`);
    }
    
    const updatedResume: Resume = {
      ...resume,
      qualified
    };
    this.resumes.set(id, updatedResume);
    return updatedResume;
  }
  
  // Exam methods
  async createExam(exam: InsertExam): Promise<Exam> {
    const id = this.examId++;
    const newExam: Exam = {
      ...exam,
      id,
      createdAt: new Date()
    };
    this.exams.set(id, newExam);
    return newExam;
  }
  
  async getExams(): Promise<Exam[]> {
    return Array.from(this.exams.values());
  }
  
  async getExam(id: number): Promise<Exam | undefined> {
    return this.exams.get(id);
  }
  
  // Candidate exam methods
  async assignExamToCandidate(candidateExam: InsertCandidateExam): Promise<CandidateExam> {
    const id = this.candidateExamId++;
    const newCandidateExam: CandidateExam = {
      ...candidateExam,
      id,
      status: "pending",
      score: null,
      passed: null,
      startedAt: null,
      completedAt: null,
      answers: null,
      flagged: false,
      flagReasons: null
    };
    this.candidateExams.set(id, newCandidateExam);
    return newCandidateExam;
  }
  
  async getCandidateExams(candidateId: number): Promise<CandidateExam[]> {
    return Array.from(this.candidateExams.values())
      .filter(exam => exam.candidateId === candidateId);
  }
  
  async getExamCandidates(examId: number): Promise<CandidateExam[]> {
    return Array.from(this.candidateExams.values())
      .filter(exam => exam.examId === examId);
  }
  
  async getCandidateExam(id: number): Promise<CandidateExam | undefined> {
    return this.candidateExams.get(id);
  }
  
  async startCandidateExam(id: number): Promise<CandidateExam> {
    const exam = this.candidateExams.get(id);
    if (!exam) {
      throw new Error(`Candidate exam with id ${id} not found`);
    }
    
    const updatedExam: CandidateExam = {
      ...exam,
      status: "in_progress",
      startedAt: new Date()
    };
    this.candidateExams.set(id, updatedExam);
    return updatedExam;
  }
  
  async completeCandidateExam(
    id: number, 
    answers: any[], 
    score?: number, 
    flags?: ProctoringFlag[]
  ): Promise<CandidateExam> {
    const exam = this.candidateExams.get(id);
    if (!exam) {
      throw new Error(`Candidate exam with id ${id} not found`);
    }
    
    const examDetails = this.exams.get(exam.examId);
    if (!examDetails) {
      throw new Error(`Exam with id ${exam.examId} not found`);
    }
    
    const calculatedScore = score || 0; // In real app, calculate score based on answers
    const passed = calculatedScore >= examDetails.passMark;
    const flagged = flags && flags.length > 0;
    
    const updatedExam: CandidateExam = {
      ...exam,
      status: "completed",
      completedAt: new Date(),
      answers,
      score: calculatedScore,
      passed,
      flagged,
      flagReasons: flags || null
    };
    this.candidateExams.set(id, updatedExam);
    return updatedExam;
  }
  
  // Activity methods
  async logActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityId++;
    const newActivity: Activity = {
      ...activity,
      id,
      createdAt: new Date()
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }
  
  async getRecentActivities(limit: number): Promise<Activity[]> {
    return Array.from(this.activities.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Get candidates who have applied (have resumes)
  async getCandidatesWithResumes(): Promise<Array<{
    user: User;
    resumes: Resume[];
  }>> {
    // Get all resumes
    const allResumes = Array.from(this.resumes.values());
    
    // Group resumes by candidateId
    const resumesByCandidate = allResumes.reduce((acc, resume) => {
      if (resume.candidateId) {
        if (!acc[resume.candidateId]) {
          acc[resume.candidateId] = [];
        }
        acc[resume.candidateId].push(resume);
      }
      return acc;
    }, {} as Record<number, Resume[]>);
    
    // Get unique candidate IDs
    const candidateIds = Object.keys(resumesByCandidate).map(Number);
    
    // Get candidate details and combine with their resumes
    const candidatesWithResumes = await Promise.all(
      candidateIds.map(async (candidateId) => {
        const user = await this.getUser(candidateId);
        if (!user) {
          return null;
        }
        
        return {
          user,
          resumes: resumesByCandidate[candidateId]
        };
      })
    );
    
    // Filter out any null results and return
    return candidatesWithResumes.filter((candidate): candidate is { user: User; resumes: Resume[] } => 
      candidate !== null
    );
  }
}

// Export a singleton instance of the storage
export const storage = new MemStorage();
