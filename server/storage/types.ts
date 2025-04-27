export type User = {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  location: string | null;
  createdAt: string | null;
};

export type JobRole = {
  id: number;
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  keySkills: string;
  location: string;
  adminId: number | null;
  createdAt: string | null;
};

export type Resume = {
  id: number;
  fileName: string;
  fileUrl: string;
  jobRoleId: number | null;
  candidateId: number | null;
  score: number | null;
  reasons: string | null;
  parsedData: string | null;
  qualified: boolean | null;
  createdAt: string | null;
};

export type Exam = {
  id: number;
  title: string;
  questions: string;
  passMark: number;
  timeLimit: number;
  jobRoleId: number | null;
  adminId: number | null;
  createdAt: string | null;
};

export type CandidateExam = {
  id: number;
  candidateId: number;
  examId: number;
  status: string;
  score: number | null;
  passed: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  answers: string | null;
  flagged: boolean | null;
  flagReasons: string | null;
  createdAt: string | null;
};

export type Activity = {
  id: number;
  userId: number | null;
  action: string;
  details: string;
  createdAt: string | null;
}; 