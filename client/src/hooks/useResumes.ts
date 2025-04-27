import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Resume = {
  id: number;
  fileName: string;
  fileUrl: string;
  candidateId: number | null;
  jobRoleId: number;
  parsedData: any;
  score: number | null;
  reasons: string | null;
  location: string;
  qualified: boolean;
  createdAt: string;
};

type UploadResumeOptions = {
  files: File[];
  jobRoleId: number;
  keySkills: string;
  userId?: number;
};

type AnalyzeResumeOptions = {
  resumeId: number;
};

type QualifyResumeOptions = {
  resumeId: number;
  qualified: boolean;
};

export function useResumes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Get all resumes
  const getResumes = (jobRoleId?: number) => {
    return useQuery<Resume[]>({
      queryKey: ["/api/resumes", jobRoleId ? { jobRoleId } : null],
    });
  };

  // Get a single resume
  const getResume = (resumeId: number) => {
    return useQuery<Resume>({
      queryKey: [`/api/resumes/${resumeId}`],
      enabled: !!resumeId,
    });
  };

  // Upload resumes mutation
  const uploadResumes = () => {
    return useMutation({
      mutationFn: async ({ files, jobRoleId, keySkills, userId }: UploadResumeOptions) => {
        setUploadProgress(0);
        
        const formData = new FormData();
        formData.append("jobRoleId", jobRoleId.toString());
        formData.append("keySkills", keySkills);
        
        if (userId) {
          formData.append("userId", userId.toString());
        }
        
        files.forEach(file => {
          formData.append("files", file);
        });
        
        const xhr = new XMLHttpRequest();
        
        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        // Return a promise
        return new Promise((resolve, reject) => {
          xhr.open("POST", "/api/resumes/upload");
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(xhr.statusText || "Upload failed"));
            }
          };
          
          xhr.onerror = () => {
            reject(new Error("Network error"));
          };
          
          xhr.send(formData);
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
        toast({
          title: "Upload successful",
          description: "Resumes have been uploaded and are being analyzed.",
        });
        setUploadProgress(0);
      },
      onError: (error: Error) => {
        toast({
          title: "Upload failed",
          description: error.message || "There was an error uploading the resumes.",
          variant: "destructive",
        });
        setUploadProgress(0);
      },
    });
  };

  // Analyze resume mutation
  const analyzeResume = () => {
    return useMutation({
      mutationFn: async ({ resumeId }: AnalyzeResumeOptions) => {
        const response = await apiRequest("POST", `/api/resumes/${resumeId}/analyze`, {});
        return response.json();
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
        toast({
          title: "Analysis complete",
          description: `Resume analysis completed with a score of ${data.analysis.score}%.`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Analysis failed",
          description: error.message || "There was an error analyzing the resume.",
          variant: "destructive",
        });
      },
    });
  };

  // Qualify/disqualify resume mutation
  const qualifyResume = () => {
    return useMutation({
      mutationFn: async ({ resumeId, qualified }: QualifyResumeOptions) => {
        const response = await apiRequest("POST", `/api/resumes/${resumeId}/qualify`, { qualified });
        return response.json();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
        toast({
          title: "Status updated",
          description: "Candidate qualification status has been updated.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Update failed",
          description: error.message || "There was an error updating the qualification status.",
          variant: "destructive",
        });
      },
    });
  };

  return {
    getResumes,
    getResume,
    uploadResumes,
    analyzeResume,
    qualifyResume,
    uploadProgress,
  };
}
