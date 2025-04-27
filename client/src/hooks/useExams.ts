import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Question = {
  id: string;
  text: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer?: string | number;
};

type Exam = {
  id: number;
  title: string;
  jobRoleId: number;
  questions: Question[];
  passMark: number;
  timeLimit: number;
  createdAt: string;
  adminId: number;
};

type CandidateExam = {
  id: number;
  candidateId: number;
  examId: number;
  status: 'pending' | 'in_progress' | 'completed';
  score: number | null;
  passed: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  answers: any[] | null;
  flagged: boolean;
  flagReasons: any[] | null;
};

type CreateExamOptions = {
  title: string;
  jobRoleId: number;
  numQuestions: number;
  passMark: number;
  adminId?: number;
};

type AssignExamOptions = {
  examId: number;
  candidateIds: number[];
};

type StartExamOptions = {
  candidateExamId: number;
};

type CompleteExamOptions = {
  candidateExamId: number;
  answers: any[];
  flags?: any[];
};

export function useExams() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all exams
  const getExams = () => {
    return useQuery<Exam[]>({
      queryKey: ["/api/exams"],
    });
  };

  // Get a single exam
  const getExam = (examId: number) => {
    return useQuery<Exam>({
      queryKey: [`/api/exams/${examId}`],
      enabled: !!examId,
    });
  };

  // Get candidate exams
  const getCandidateExams = (candidateId: number) => {
    return useQuery<CandidateExam[]>({
      queryKey: [`/api/candidate/${candidateId}/exams`],
      enabled: !!candidateId,
    });
  };

  // Get a single candidate exam
  const getCandidateExam = (candidateExamId: number) => {
    return useQuery<CandidateExam>({
      queryKey: [`/api/candidate-exams/${candidateExamId}`],
      enabled: !!candidateExamId,
    });
  };

  // Create exam mutation
  const createExam = () => {
    return useMutation({
      mutationFn: async (data: CreateExamOptions) => {
        const response = await apiRequest("POST", "/api/exams/generate", data);
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
        toast({
          title: "Exam created",
          description: `Your ${data.title} exam has been created with ${data.questions.length} questions.`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Exam creation failed",
          description: error.message || "There was an error creating the exam.",
          variant: "destructive",
        });
      },
    });
  };

  // Update exam mutation
  const updateExam = (examId: number) => {
    return useMutation({
      mutationFn: async (data: Partial<Exam>) => {
        const response = await apiRequest("PATCH", `/api/exams/${examId}`, data);
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
        toast({
          title: "Exam updated",
          description: "The exam has been successfully updated.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Update failed",
          description: error.message || "There was an error updating the exam.",
          variant: "destructive",
        });
      },
    });
  };

  // Delete exam mutation
  const deleteExam = (examId: number) => {
    return useMutation({
      mutationFn: async () => {
        const response = await apiRequest("DELETE", `/api/exams/${examId}`, {});
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
        toast({
          title: "Exam deleted",
          description: "The exam has been successfully deleted.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Delete failed",
          description: error.message || "There was an error deleting the exam.",
          variant: "destructive",
        });
      },
    });
  };

  // Assign exam to candidates mutation
  const assignExam = () => {
    return useMutation({
      mutationFn: async ({ examId, candidateIds }: AssignExamOptions) => {
        const response = await apiRequest("POST", `/api/exams/${examId}/assign`, { candidateIds });
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
        toast({
          title: "Exam assigned",
          description: "The exam has been assigned to the selected candidates.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Assignment failed",
          description: error.message || "There was an error assigning the exam.",
          variant: "destructive",
        });
      },
    });
  };

  // Start exam mutation
  const startExam = () => {
    return useMutation({
      mutationFn: async ({ candidateExamId }: StartExamOptions) => {
        const response = await apiRequest("POST", `/api/candidate-exams/${candidateExamId}/start`, {});
        return response.json();
      },
      onSuccess: () => {
        toast({
          title: "Exam started",
          description: "Your exam has started. Good luck!",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to start exam",
          description: error.message || "There was an error starting the exam.",
          variant: "destructive",
        });
      },
    });
  };

  // Complete exam mutation
  const completeExam = () => {
    return useMutation({
      mutationFn: async ({ candidateExamId, answers, flags }: CompleteExamOptions) => {
        const response = await apiRequest("POST", `/api/candidate-exams/${candidateExamId}/complete`, { 
          answers,
          flags
        });
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/candidate-exams`] });
        toast({
          title: "Exam completed",
          description: "Your exam has been submitted for evaluation.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Submission failed",
          description: error.message || "There was an error submitting your exam.",
          variant: "destructive",
        });
      },
    });
  };

  return {
    getExams,
    getExam,
    getCandidateExams,
    getCandidateExam,
    createExam,
    updateExam,
    deleteExam,
    assignExam,
    startExam,
    completeExam,
  };
}
