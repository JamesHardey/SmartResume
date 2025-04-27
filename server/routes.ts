import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import { createServer, type Server } from "http";
import { MySQLStorage } from "./storage/mysql";
import {
  rankResume,
  generateExamQuestions,
  gradeOpenEndedAnswer,
} from "./openai";
import { z } from "zod";
import {
  insertUserSchema,
  insertJobRoleSchema,
  insertResumeSchema,
  insertExamSchema,
  insertCandidateExamSchema,
} from "@shared/schema";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import * as textract from "textract";
import { Express } from "express";
import bcrypt from "bcrypt";

export async function registerRoutes(
  app: Express,
  storage: MySQLStorage
): Promise<Server> {
  // Configure multer for resume uploads
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
        cb(null, `${uniqueSuffix}-${file.originalname}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only .pdf and .docx files are allowed"));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you would use a proper authentication system with tokens
      // and not return the password
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser(userData);

      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;

      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Job Roles routes
  app.post("/api/job-roles", async (req: Request, res: Response) => {
    console.log(req.body);
    try {
      if (!req.body.adminId) {
        return res.status(400).json({ message: "Admin ID is required" });
      }

      const jobRoleData = {
        ...req.body,
        keySkills: req.body.keySkills, // already an array
        adminId: parseInt(req.body.adminId),
      };

      const parsedData = insertJobRoleSchema.parse(jobRoleData);
      const jobRole = await storage.createJobRole(parsedData);

      await storage.createActivity({
        userId: jobRoleData.adminId,
        action: "create_job_role",
        details: `Created job role: ${jobRole.title}`,
      });

      return res.status(201).json(jobRole);
    } catch (error) {
      console.error("Create job role error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to create job role",
        });
    }
  });

  app.get("/api/job-roles", async (req: Request, res: Response) => {
    try {
      const jobRoles = await storage.getJobRoles();
      return res.status(200).json(jobRoles);
    } catch (error) {
      console.error("Get job roles error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/job-roles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job role ID" });
      }

      const jobRole = await storage.getJobRole(id);
      if (!jobRole) {
        return res.status(404).json({ message: "Job role not found" });
      }

      return res.status(200).json(jobRole);
    } catch (error) {
      console.error("Get job role error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/job-roles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job role ID" });
      }

      const jobRole = await storage.getJobRole(id);
      if (!jobRole) {
        return res.status(404).json({ message: "Job role not found" });
      }

      const updateData = {
        ...jobRole,
        ...req.body,
        keySkills: Array.isArray(req.body.keySkills)
          ? JSON.stringify(req.body.keySkills)
          : req.body.keySkills,
        id, // Ensure ID doesn't change
      };

      const updatedJobRole = await storage.updateJobRole(id, updateData);

      await storage.createActivity({
        userId: updateData.adminId || 1,
        action: "update_job_role",
        details: `Updated job role: ${updatedJobRole.title}`,
      });

      return res.status(200).json(updatedJobRole);
    } catch (error) {
      console.error("Update job role error:", error);
      return res
        .status(500)
        .json({
          message:
            error instanceof Error
              ? error.message
              : "Failed to update job role",
        });
    }
  });

  app.delete("/api/job-roles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job role ID" });
      }

      const jobRole = await storage.getJobRole(id);
      if (!jobRole) {
        return res.status(404).json({ message: "Job role not found" });
      }

      // Check if job role is in use by resumes or exams
      const associatedResumes = await storage.getResumes(id);
      if (associatedResumes.length > 0) {
        return res.status(400).json({
          message: "Cannot delete job role as it is associated with resumes",
          count: associatedResumes.length,
        });
      }

      // Delete the job role
      await storage.deleteJobRole(id);

      await storage.createActivity({
        userId: jobRole.adminId || 1,
        action: "delete_job_role",
        details: `Deleted job role: ${jobRole.title}`,
      });

      return res.status(200).json({ message: "Job role deleted successfully" });
    } catch (error) {
      console.error("Delete job role error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  async function parseResume(file: Express.Multer.File): Promise<string> {
    try {
      return await new Promise((resolve, reject) => {
        textract.fromFileWithPath(file.path, (err, text) => {
          if (err) reject(new Error(`Failed to extract text from ${file.originalname}`));
          resolve(text || "");
        });
      });
    } catch (error) {
      console.error("Parse resume error:", error);
      throw new Error("Unable to extract resume content");
    }
  }

  // Resume routes
  app.get("/api/resumes", async (req: Request, res: Response) => {
    console.log(req.body);
    try {
      const { userId, role, jobRoleId } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: "Missing required parameters: userId and role" });
      }

      let resumes: Resume[] = [];

      if (role === 'admin') {
        // For admin, get job roles they created first
        const adminJobRoles = await storage.getJobRolesByAdmin(parseInt(userId as string));
        const jobRoleIds = adminJobRoles.map(role => role.id);

        if (jobRoleId) {
          // If specific job role is requested, verify admin owns it
          if (!jobRoleIds.includes(parseInt(jobRoleId as string))) {
            return res.status(403).json({ message: "Access denied to this job role" });
          }
          resumes = await storage.getResumes(parseInt(jobRoleId as string));
        } else {
          // Get all resumes for all job roles owned by admin
          resumes = (await Promise.all(
            jobRoleIds.map(id => storage.getResumes(id))
          )).flat();
        }
      } else if (role === 'candidate') {
        // For candidates, get only their resumes
        resumes = await storage.getResumes(undefined, parseInt(userId as string));
      }

      return res.status(200).json({ resumes });
    } catch (error) {
      console.error("Get resumes error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/resumes/upload", upload.array("files"), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { jobRoleId, userId, role } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      if (!jobRoleId) {
        return res.status(400).json({ message: "Job role ID is required" });
      }
      
      const jobRole = await storage.getJobRole(parseInt(jobRoleId));
      if (!jobRole) {
        return res.status(404).json({ message: "Job role not found" });
      }

      // For admin, verify they created this job role
      if (role === "admin" && jobRole.adminId !== parseInt(userId)) {
        return res.status(403).json({ message: "You can only upload resumes to job roles you created" });
      }
      
      const user = await storage.getUserById(parseInt(userId));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const uploadedResumes = [];
      
      for (const file of files) {
        // Extract text from file first
        let fileContent = "";
        try {
          fileContent = await new Promise<string>((resolve, reject) => {
            textract.fromFileWithPath(file.path, (error: any, text: string) => {
              if (error) {
                console.error("Error extracting text:", error);
                reject(new Error("Failed to extract text from resume"));
              } else {
                resolve(text);
              }
            });
          });
        } catch (error) {
          console.error('Error extracting text from file:', error);
          continue; // Skip this file if text extraction fails
        }

        if (!fileContent) {
          console.error('No content extracted from file:', file.originalname);
          continue;
        }

        const resumeData = {
          fileName: file.originalname,
          fileUrl: file.path,
          candidateId: parseInt(userId),
          jobRoleId: parseInt(jobRoleId),
          content: fileContent
        };
        
        try {
          const resume = await storage.createResume(resumeData);
          uploadedResumes.push(resume);
        } catch (error) {
          console.error('Error creating resume:', error);
          continue;
        }
      }
      
      if (uploadedResumes.length === 0) {
        return res.status(500).json({ message: "Failed to upload any resumes" });
      }
      
      await storage.createActivity({
        userId: parseInt(userId),
        action: "upload_resumes",
        details: { 
          count: uploadedResumes.length, 
          jobRoleId: parseInt(jobRoleId),
          jobRoleTitle: jobRole.title
        }
      });
      
      return res.status(201).json({ 
        message: `${uploadedResumes.length} files uploaded successfully`,
        resumes: uploadedResumes
      });
    } catch (error) {
      console.error("Resume upload error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post('/api/resumes/:id/analyze', async (req: Request, res: Response) => {
    try {
      const resumeId = parseInt(req.params.id);
      if (isNaN(resumeId)) {
        return res.status(400).json({ message: 'Invalid resume ID' });
      }
  
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ message: 'Resume not found' });
      }

      if (resume.parsedData) {
        return res.status(400).json({ message: 'Resume already analyzed' });
      }
      
      const jobRole = await storage.getJobRole(resume.jobRoleId || 0);
      if (!jobRole) {
        return res.status(404).json({ message: 'Job role not found' });
      }

      // Extract text from the resume file
      
      const analysis = await rankResume({
        resumeText:resume.content,
        jobRole: jobRole.title,
        keySkills: jobRole.keySkills,
        description: jobRole.description,
        responsibilities: jobRole.responsibilities,
        requirements: jobRole.requirements,
        location: jobRole.location
      }
      );
      await storage.updateResume(resumeId, {
        score: analysis.score,
        parsedData: JSON.stringify(analysis),
        reasons: analysis.reasons.join(", ")
      });
  
      const updatedResume = await storage.getResume(resumeId);
      return res.status(200).json({
        message: 'Resume analyzed successfully',
        resume: updatedResume,
      });
    } catch (error) {
      console.error('Resume analysis error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/resumes/:id/qualify", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid resume ID" });
      }

      const { qualified } = req.body;
      if (typeof qualified !== "boolean") {
        return res
          .status(400)
          .json({ message: "Qualified status must be a boolean" });
      }

      const resume = await storage.getResume(id);
      if (!resume) {
        return res.status(404).json({ message: "Resume not found" });
      }

      const updatedResume = await storage.updateResumeQualification(
        id,
        qualified
      );

      await storage.createActivity({
        userId: req.body.userId || 1,
        action: qualified ? "qualify_resume" : "disqualify_resume",
        details: { resumeId: id },
      });

      return res.status(200).json(updatedResume);
    } catch (error) {
      console.error("Resume qualification error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Exam routes
  app.post("/api/exams/generate", async (req: Request, res: Response) => {
    try {
      const { jobRoleId, title, numQuestions, passMark, adminId } = req.body;

      if (!jobRoleId || !title || !numQuestions || !passMark) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const jobRole = await storage.getJobRole(parseInt(jobRoleId));
      if (!jobRole) {
        return res.status(404).json({ message: "Job role not found" });
      }

      // Parse keySkills to ensure it's an array
      let keySkillsArray: string[] = [];
      if (jobRole.keySkills) {
        if (Array.isArray(jobRole.keySkills)) {
          keySkillsArray = jobRole.keySkills;
        } else if (typeof jobRole.keySkills === "string") {
          try {
            keySkillsArray = JSON.parse(jobRole.keySkills);
          } catch (e) {
            keySkillsArray = jobRole.keySkills
              .split(",")
              .map((skill) => skill.trim());
          }
        }
      }

      // Ensure numQuestions is a valid number
      const totalQuestions = Math.max(1, Math.min(parseInt(numQuestions), 20)); // Limit to 20 questions max

      const questions = await generateExamQuestions({
        jobRole: jobRole.title,
        numQuestions: totalQuestions,
        includeMultipleChoice: true,
        includeOpenEnded: true,
        description: jobRole.description,
        responsibilities: jobRole.responsibilities,
        requirements: jobRole.requirements,
        keySkills: keySkillsArray,
      });

      const examData = {
        title,
        jobRoleId: parseInt(jobRoleId),
        questions,
        passMark: parseInt(passMark),
        timeLimit: 45, // Default 45 minutes
        adminId: parseInt(adminId) || 1,
      };

      const exam = await storage.createExam(examData);

      await storage.createActivity({
        userId: parseInt(adminId) || 1,
        action: "create_exam",
        details: {
          examId: exam.id,
          title: exam.title,
          jobRoleTitle: jobRole.title,
        },
      });

      return res.status(201).json(exam);
    } catch (error) {
      console.error("Exam generation error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/exams", async (req: Request, res: Response) => {
    try {
      const exams = await storage.getExams();
      return res.status(200).json(exams);
    } catch (error) {
      console.error("Get exams error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/exams/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid exam ID" });
      }

      const exam = await storage.getExam(id);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      return res.status(200).json(exam);
    } catch (error) {
      console.error("Get exam error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/exams/:id/assign", async (req: Request, res: Response) => {
    try {
      const examId = parseInt(req.params.id);
      const { candidateIds } = req.body;

      if (isNaN(examId) || !candidateIds || !Array.isArray(candidateIds)) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      const exam = await storage.getExam(examId);
      if (!exam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      const assignments = [];

      for (const candidateId of candidateIds) {
        const candidate = await storage.getUserById(parseInt(candidateId));
        if (!candidate) {
          continue; // Skip invalid candidates
        }

        const candidateExam = await storage.assignExamToCandidate({
          candidateId: parseInt(candidateId),
          examId,
        });

        assignments.push(candidateExam);
      }

      await storage.createActivity({
        userId: req.body.adminId || 1,
        action: "assign_exam",
        details: {
          examId,
          candidateCount: assignments.length,
        },
      });

      return res.status(201).json({
        message: `Exam assigned to ${assignments.length} candidates`,
        assignments,
      });
    } catch (error) {
      console.error("Exam assignment error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add candidate to exam
  app.post(
    "/api/exams/:examId/add-candidate",
    async (req: Request, res: Response) => {
      try {
        const examId = parseInt(req.params.examId);
        const { candidateId, adminId } = req.body;

        if (isNaN(examId) || !candidateId) {
          return res.status(400).json({ message: "Invalid request data" });
        }

        // Verify exam exists
        const exam = await storage.getExam(examId);
        if (!exam) {
          return res.status(404).json({ message: "Exam not found" });
        }

        // Verify candidate exists and is a candidate
        const candidate = await storage.getUserById(parseInt(candidateId));
        if (!candidate) {
          return res.status(404).json({ message: "Candidate not found" });
        }
        if (candidate.role !== "candidate") {
          return res.status(400).json({ message: "User is not a candidate" });
        }

        // Check if candidate is already assigned to this exam
        const candidateExams = await storage.getCandidateExamsByCandidate(
          parseInt(candidateId)
        );
        const isAlreadyAssigned = candidateExams.some(
          (ce) => ce.examId === examId
        );
        if (isAlreadyAssigned) {
          return res
            .status(400)
            .json({ message: "Candidate is already assigned to this exam" });
        }

        // Assign candidate to exam
        const candidateExam = await storage.assignExamToCandidate({
          candidateId: parseInt(candidateId),
          examId,
        });

        // Log the activity
        await storage.createActivity({
          userId: adminId || 1,
          action: "add_candidate_to_exam",
          details: {
            examId,
            candidateId,
            examTitle: exam.title,
          },
        });

        return res.status(201).json({
          message: "Candidate successfully added to exam",
          candidateExam,
        });
      } catch (error) {
        console.error("Add candidate to exam error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Candidate exam routes
  // app.get("/api/candidate-exams", async (req: Request, res: Response) => {
  //   try {
  //     const { candidateId, examId } = req.query;

  //     if (!candidateId && !examId) {
  //       return res.status(400).json({ message: "Either candidateId or examId is required" });
  //     }

  //     let result;
  //     if (candidateId) {
  //       result = await storage.getCandidateExamsByCandidate(parseInt(candidateId as string));
  //       // Get candidate information
  //       const candidate = await storage.getUserById(parseInt(candidateId as string));
  //       if (candidate) {
  //         result = result.map(exam => ({
  //           ...exam,
  //           candidate: {
  //             id: candidate.id,
  //             name: candidate.name,
  //             email: candidate.email
  //           }
  //         }));
  //       }
  //     } else {
  //       result = await storage.getExamCandidates(parseInt(examId as string));
  //       // Get candidate information for each exam
  //       result = await Promise.all(result.map(async (exam) => {
  //         const candidate = await storage.getUserById(exam.candidateId!!);
  //         return {
  //           ...exam,
  //           candidate: candidate ? {
  //             id: candidate.id,
  //             name: candidate.name,
  //             email: candidate.email
  //           } : null
  //         };
  //       }));
  //     }

  //     return res.status(200).json(result);
  //   } catch (error) {
  //     console.error("Get candidate exams error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // });

  app.get("/api/candidate-exams", async (req: Request, res: Response) => {
    try {
      const { candidateId, examId } = req.query;

      if (!candidateId && !examId) {
        return res
          .status(400)
          .json({ message: "Either candidateId or examId is required" });
      }

      let result;
      if (candidateId) {
        // Fetch candidate exams for a specific candidate
        result = await storage.getCandidateExamsByCandidate(
          parseInt(candidateId as string)
        );
        const candidate = await storage.getUserById(
          parseInt(candidateId as string)
        );

        // Enrich with exam details and candidate info
        result = await Promise.all(
          result.map(async (exam) => {
            const examDetails = await storage.getExam(exam.examId);
            return {
              ...exam,
              examDetails: examDetails
                ? {
                    title: examDetails.title,
                    questions: examDetails.questions || [],
                    passMark: examDetails.passMark,
                    timeLimit: examDetails.timeLimit,
                  }
                : null,
              candidate: candidate
                ? {
                    id: candidate.id,
                    name: candidate.name,
                    email: candidate.email,
                  }
                : null,
            };
          })
        );
      } else {
        // Fetch candidates for a specific exam
        result = await storage.getExamCandidates(parseInt(examId as string));
        const examDetails = await storage.getExam(parseInt(examId as string));

        // Enrich with exam details and candidate info
        result = await Promise.all(
          result.map(async (exam) => {
            const candidate = await storage.getUserById(exam.candidateId!);
            return {
              ...exam,
              examDetails: examDetails
                ? {
                    title: examDetails.title,
                    questions: examDetails.questions
                      ? JSON.parse(examDetails.questions as string)
                      : [],
                    passMark: examDetails.passMark,
                    timeLimit: examDetails.timeLimit,
                  }
                : null,
              candidate: candidate
                ? {
                    id: candidate.id,
                    name: candidate.name,
                    email: candidate.email,
                  }
                : null,
            };
          })
        );
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Get candidate exams error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // app.get("/api/candidate-exams/:id", async (req: Request, res: Response) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     if (isNaN(id)) {
  //       return res.status(400).json({ message: "Invalid candidate exam ID" });
  //     }

  //     const candidateExam = await storage.getCandidateExam(id);
  //     if (!candidateExam) {
  //       return res.status(404).json({ message: "Candidate exam not found" });
  //     }

  //     // Get the full exam details
  //     const exam = await storage.getExam(candidateExam.examId);
  //     if (!exam) {
  //       return res.status(404).json({ message: "Exam not found" });
  //     }

  //     return res.status(200).json({
  //       ...candidateExam,
  //       exam
  //     });
  //   } catch (error) {
  //     console.error("Get candidate exam error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // });

  app.get("/api/candidate-exams/:id", async (req: Request, res: Response) => {
    try {
      const candidateExamId = parseInt(req.params.id);
      const candidateExam = await storage.getCandidateExam(candidateExamId);
      if (!candidateExam) {
        return res.status(404).json({ message: "Candidate exam not found" });
      }
      const examDetails = await storage.getExam(candidateExam.examId!!);
      const candidate = await storage.getUserById(candidateExam.candidateId!!);
      let questions = [];
      try {
        questions = examDetails?.questions
          ? JSON.parse(examDetails.questions as string)
          : [];
        if (!Array.isArray(questions)) {
          console.error(
            `Invalid questions format for exam ${candidateExam.examId}:`,
            questions
          );
          questions = [];
        }
      } catch (error) {
        console.error(
          `Failed to parse questions for exam ${candidateExam.examId}:`,
          error
        );
        questions = [];
      }

      const result = {
        ...candidateExam,
        examDetails: examDetails
          ? {
              title: examDetails.title,
              questions,
              passMark: examDetails.passMark,
              timeLimit: examDetails.timeLimit,
            }
          : null,
        candidate: candidate
          ? {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
            }
          : null,
      };
      return res.status(200).json(result);
    } catch (error) {
      console.error("Get candidate exam error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(
    "/api/candidate-exams/:id/start",
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid candidate exam ID" });
        }

        const candidateExam = await storage.getCandidateExam(id);
        if (!candidateExam) {
          return res.status(404).json({ message: "Candidate exam not found" });
        }

        if (candidateExam.status !== "pending") {
          return res
            .status(400)
            .json({ message: "Exam already started or completed" });
        }

        const updatedCandidateExam = await storage.startCandidateExam(id);

        await storage.createActivity({
          userId: candidateExam.candidateId,
          action: "start_exam",
          details: { candidateExamId: id },
        });

        return res.status(200).json(updatedCandidateExam);
      } catch (error) {
        console.error("Start exam error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // app.post("/api/candidate-exams/:id/complete", async (req: Request, res: Response) => {
  //   try {
  //     const id = parseInt(req.params.id);
  //     const { answers, flags } = req.body;

  //     if (isNaN(id) || !answers || !Array.isArray(answers)) {
  //       return res.status(400).json({ message: "Invalid request data" });
  //     }

  //     const candidateExam = await storage.getCandidateExam(id);
  //     if (!candidateExam) {
  //       return res.status(404).json({ message: "Candidate exam not found" });
  //     }

  //     if (candidateExam.status !== "in_progress") {
  //       return res.status(400).json({ message: "Exam not in progress" });
  //     }

  //     const exam = await storage.getExam(candidateExam.examId);
  //     if (!exam) {
  //       return res.status(404).json({ message: "Exam not found" });
  //     }

  //     // Calculate score based on answers
  //     let totalScore = 0;
  //     const totalQuestions = exam.questions.length;

  //     for (let i = 0; i < answers.length; i++) {
  //       const answer = answers[i];
  //       const question = exam.questions[i];
  //       console.log(question);

  //       if (question.type === 'multiple_choice' && answer.selectedOption === question.correctAnswer) {
  //         totalScore += 1;
  //       } else if (question.type === 'open_ended') {
  //         const grade = await gradeOpenEndedAnswer({
  //           question: question.text,
  //           answer: answer.text,
  //           jobRole: exam.jobRole.title
  //         });
  //         totalScore += grade.score;
  //       }
  //     }

  //     const percentageScore = Math.round((totalScore / totalQuestions) * 100);
  //     const passed = percentageScore >= exam.passMark;

  //     const completedExam = await storage.completeCandidateExam(
  //       id,
  //       answers,
  //       percentageScore,
  //       flags
  //     );

  //     await storage.createActivity({
  //       userId: candidateExam.candidateId,
  //       action: "complete_exam",
  //       details: {
  //         candidateExamId: id,
  //         score: percentageScore,
  //         passed
  //       }
  //     });

  //     return res.status(200).json({
  //       ...completedExam,
  //       percentageScore,
  //       passed
  //     });
  //   } catch (error) {
  //     console.error("Complete exam error:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // });

  // In routes.ts
  app.post(
    "/api/candidate-exams/:id/complete",
    async (req: Request, res: Response) => {
      try {
        const candidateExamId = parseInt(req.params.id);
        const { answers, flags } = req.body;

        // Validate candidateExamId
        if (isNaN(candidateExamId)) {
          return res.status(400).json({ message: "Invalid candidate exam ID" });
        }

        // Fetch candidate exam
        const candidateExam = await storage.getCandidateExam(candidateExamId);
        if (!candidateExam) {
          return res.status(404).json({ message: "Candidate exam not found" });
        }

        // Fetch exam details
        const examDetails = await storage.getExam(candidateExam.examId);
        if (!examDetails) {
          return res
            .status(404)
            .json({
              message: `Exam with ID ${candidateExam.examId} not found`,
            });
        }

        // Log exam title safely
        console.log(`Completing exam: ${examDetails.title}`);

        // Calculate score
        let score = 0;
        if (Array.isArray(answers) && Array.isArray(examDetails.questions)) {
          let correctAnswers = 0;
          answers.forEach((answer: any) => {
            const question = examDetails.questions.find(
              (q: any) => q.id === answer.questionId
            );
            if (question && answer.questionType === "multiple_choice") {
              if (
                String(answer.selectedOption) === String(question.correctAnswer)
              ) {
                correctAnswers++;
              }
            }
            // Add logic for open_ended questions if needed
          });
          score =
            examDetails.questions.length > 0
              ? (correctAnswers / examDetails.questions.length) * 100
              : 0;
        }

        // Complete the exam
        const updatedExam = await storage.completeCandidateExam(
          candidateExamId,
          answers,
          score,
          flags
        );

        return res.status(200).json({
          message: "Exam completed successfully",
          score: updatedExam.score,
          passed: updatedExam.passed,
        });
      } catch (error) {
        console.error("Complete exam error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post("/api/proctor/log-event", (req: Request, res: Response) => {
    try {
      const { candidateExamId, event } = req.body;

      if (!candidateExamId || !event || !event.type) {
        return res.status(400).json({ message: "Invalid event data" });
      }

      // In a real app, store proctoring events in the database
      // Here we just log them
      console.log(`Proctoring event for exam ${candidateExamId}:`, event);

      return res.status(200).json({ message: "Event logged" });
    } catch (error) {
      console.error("Proctor event error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activity routes
  app.get("/api/activities/recent", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);

      // Enrich activities with user info
      const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUserById(activity.userId);
          return {
            ...activity,
            user: user
              ? { id: user.id, name: user.name, email: user.email }
              : null,
          };
        })
      );

      return res.status(200).json(enrichedActivities);
    } catch (error) {
      console.error("Get activities error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req: Request, res: Response) => {
    try {
      const resumes = await storage.getResumes();
      const exams = await storage.getExams();

      // Count qualified candidates
      const qualifiedResumes = resumes.filter(
        (resume) => resume.status === "accepted"
      );

      // Count exams by status
      const completedExamCount = (
        await Promise.all(
          exams.map(async (exam) => {
            const candidates = await storage.getExamCandidates(exam.id);
            return candidates.filter((c) => c.status === "completed").length;
          })
        )
      ).reduce((sum, count) => sum + count, 0);

      return res.status(200).json({
        totalResumes: resumes.length,
        qualifiedCandidates: qualifiedResumes.length,
        totalExams: exams.length,
        completedExams: completedExamCount,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/candidates/with-resumes",
    async (req: Request, res: Response) => {
      try {
        const candidates = await storage.getCandidatesWithResumes();
        return res.status(200).json(candidates);
      } catch (error) {
        console.error("Get candidates with resumes error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Users routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      const role = req.query.role as string | undefined;
      const users = await storage.getUsers();

      // Filter users by role if role query parameter is provided
      const filteredUsers = role
        ? users.filter(
            (user) => user.role?.toLowerCase() === role.toLowerCase()
          )
        : users;

      return res.status(200).json(filteredUsers);
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.status(200).json(user);
    } catch (error) {
      console.error("Get user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = await storage.createUser(userData);

      // Don't return the password
      const { password: _, ...userWithoutPassword } = user;

      return res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Create user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use the existing user as default values and update with req.body
      const updateData = {
        ...user,
        ...req.body,
        id, // Ensure ID doesn't change
      };

      // Validate the updated user data
      const updatedUserData = insertUserSchema.parse(updateData);

      // Update the user
      const updatedUser = await storage.updateUser(id, updatedUserData);

      // Don't return the password
      const { password: _, ...userWithoutPassword } = updatedUser;

      return res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Update user error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUserById(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is in use by resumes or exams
      const associatedResumes = await storage.getResumes(undefined, id);
      if (associatedResumes.length > 0) {
        return res.status(400).json({
          message: "Cannot delete user as they have associated resumes",
          count: associatedResumes.length,
        });
      }

      // Delete the user
      await storage.deleteUser(id);

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel job application
  app.delete(
    "/job-roles/:jobRoleId/apply",
    async (req: Request, res: Response) => {
      try {
        const { jobRoleId } = req.params;
        const userId = (req as any).user.id;

        // Delete the resume associated with this job application
        const resumes = await storage.getResumes(Number(jobRoleId), userId);
        if (resumes.length > 0) {
          await storage.deleteResume(resumes[0].id);
        }

        res.json({ success: true });
      } catch (error) {
        console.error("Error canceling job application:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Update job application (replace resume)
  app.put(
    "/job-roles/:jobRoleId/apply",
    async (req: Request, res: Response) => {
      try {
        const { jobRoleId } = req.params;
        const userId = (req as any).user.id;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Get existing resume
        const resumes = await storage.getResumes(Number(jobRoleId), userId);
        if (resumes.length === 0) {
          return res.status(404).json({ message: "No application found" });
        }

        // Delete old resume
        await storage.deleteResume(resumes[0].id);

        // Create new resume
        const resume = await storage.createResume({
          candidateId: userId,
          jobRoleId: Number(jobRoleId),
          content: "",
          parsedData: null,
        });

        res.json(resume);
      } catch (error) {
        console.error("Error updating job application:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Error handling middleware
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ message: err.message || "Internal server error" });
  });

  const httpServer = createServer(app);
  return httpServer;
}
