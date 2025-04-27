import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckIcon, EyeIcon, UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  experience: Array<{
    company: string;
    position: string;
    timeframe: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    timeframe: string;
  }>;
  skills: string[];
  location?: string;
  reasons: string[];
}

interface Resume {
  id: number;
  jobRoleId: number;
  keySkills: string;
  content: string;
  score: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
  parsedData: ParsedResume | null;
  candidateName: string | null;
  candidateEmail: string | null;
  candidateLocation: string | null;
  reasons: string[];
}

export default function ResumeList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { data: resumes, isLoading } = useQuery<{ resumes: Resume[] }>({
    queryKey: ["resumes", user?.id],
    queryFn: async () => {
      if (!user?.id || !user?.role) {
        throw new Error("User information is missing");
      }
      const response = await apiRequest(
        "GET",
        `/api/resumes?userId=${user.id}&role=${user.role}`
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch resumes");
      }
      return response.json();
    },
    enabled: !!user?.id && !!user?.role,
    onError: (e) => {
      setError(e);
    },
  });

  console.log(resumes);

  const analyzeResumeMutation = useMutation({
    mutationFn: async (resumeId: number) => {
      const response = await apiRequest(
        "POST",
        `/api/resumes/${resumeId}/analyze`,
        {}
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Resume analysis failed");
      }
      return response.json();
    },
    onSuccess: (data: { resume: Resume }) => {
      queryClient.invalidateQueries({ queryKey: ["resumes", user?.id] });
      setSelectedResume(data.resume);
      setShowDetails(true);
      const score = data.resume.score || 0;
      let scoreDescription = "average";
      if (score >= 80) scoreDescription = "excellent";
      else if (score >= 60) scoreDescription = "good";
      else if (score < 40) scoreDescription = "below average";
      toast({
        title: "Analysis complete",
        description: `Resume analysis completed with a ${scoreDescription} score of ${score}%.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedResume(data.resume);
              setShowDetails(true);
            }}
          >
            View Details
          </Button>
        ),
      });
    },
    onError: (error: any) => {
      let errorTitle = "Analysis failed";
      let errorMessage =
        error.message || "There was an error analyzing the resume.";
      if (errorMessage.includes("timed out")) {
        errorTitle = "Analysis timed out";
        errorMessage = "The resume analysis took too long. Please try again.";
      } else if (errorMessage.includes("text from resume")) {
        errorTitle = "Text extraction failed";
        errorMessage =
          "Could not extract text. Ensure the file is a valid PDF or DOCX.";
      } else if (errorMessage.includes("not found")) {
        errorTitle = "Resume not found";
        errorMessage = "The resume could not be found. Please upload again.";
      }
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = (resumeId: number) => {
    analyzeResumeMutation.mutate(resumeId);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedResume(null);
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Implementation of handleResumeUpload function
  };

  const handleViewResume = (resume: Resume) => {
    // Implementation of handleViewResume function
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resume Analysis Results</CardTitle>
          <CardDescription>Loading resume data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Resumes</h2>
        {user.role === 'candidate' && (
          <Button onClick={() => setShowUploadModal(true)}>
            Upload Resume
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <div className="text-red-500">Error loading resumes: {error.message}</div>
      ) : resumes?.resumes.length === 0 ? (
        <div className="text-gray-500">No resumes found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumes?.resumes.map((resume) => (
            <div
              key={resume.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{resume.fileName}</h3>
                  <p className="text-sm text-gray-500">
                    {resume.parsedData?.candidateName || 'Unknown Candidate'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewResume(resume)}
                  >
                    View
                  </Button>
                  {user.role === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAnalyzeResume(resume.id)}
                    >
                      Analyze
                    </Button>
                  )}
                </div>
              </div>
              {resume.score !== null && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <span className="text-sm font-medium">Score:</span>
                    <span className="ml-2 text-sm">
                      {resume.score.toFixed(2)}%
                    </span>
                  </div>
                  {resume.reasons && (
                    <div className="mt-1">
                      <span className="text-sm font-medium">Reasons:</span>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {resume.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showUploadModal && (
        <ResumeUploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleResumeUpload}
        />
      )}

      {selectedResume && (
        <ResumeViewModal
          resume={selectedResume}
          onClose={() => setSelectedResume(null)}
        />
      )}
    </div>
  );
}

function ResumeDetailsDialog({
  resume,
  onClose,
  onAnalyze,
}: {
  resume: Resume;
  onClose: () => void;
  onAnalyze: (id: number) => void;
}) {
  const parsedData: ParsedResume | null = useMemo(() => {
    try {
      return resume.parsedData ? resume.parsedData : null;
    } catch (e) {
      return null;
    }
  }, [resume.parsedData]);

  const getScoreCategory = (score: number | null) => {
    if (!score) return { color: "gray", label: "Not analyzed" };
    if (score >= 80) return { color: "green", label: "Excellent match" };
    if (score >= 60) return { color: "blue", label: "Good match" };
    if (score >= 40) return { color: "yellow", label: "Average match" };
    return { color: "red", label: "Low match" };
  };

  const scoreCategory = getScoreCategory(resume.score);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center justify-between">
            Resume Details
            <Badge
              variant="secondary"
              className={`bg-${scoreCategory.color}-100 text-${scoreCategory.color}-800 ml-2`}
            >
              {resume.score
                ? `${resume.score}% - ${scoreCategory.label}`
                : "Not analyzed"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Detailed analysis of the candidate's resume
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-gray-100 rounded-full">
              <UserIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">
                {parsedData?.name || "Unknown Candidate"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {parsedData?.email || "unknown@example.com"}
              </p>
              {parsedData?.phone && (
                <p className="text-sm text-muted-foreground">
                  {parsedData.phone}
                </p>
              )}
              {parsedData?.location && (
                <p className="text-sm text-muted-foreground">
                  {parsedData.location}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Key Analysis Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resume?.reasons ? (
                  Array.isArray(resume.reasons) ? (
                    resume.reasons.length > 0 ? (
                      <ul className="list-disc list-inside space-y-2">
                        {resume.reasons.map((reason, index) => (
                          <li key={index} className="text-sm">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No analysis available
                      </p>
                    )
                  ) : (
                    <p className="text-sm">{resume.reasons}</p>
                  )
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No analysis available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {parsedData?.skills && parsedData.skills.length > 0 ? (
                    parsedData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No skills listed
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData?.experience && parsedData.experience.length > 0 ? (
                <div>
                  {parsedData.experience.map((exp, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium">
                        Company: {exp.company}
                      </p>
                      <p className="text-sm font-medium">
                        Position: {exp.position}
                      </p>
                      <p className="text-sm font-medium">
                        Timeframe: {exp.timeframe}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No experience listed
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Education</CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData?.education && parsedData.education.length > 0 ? (
                <div className="space-y-4">
                  {parsedData.education.map((edu, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-gray-200 pl-4 py-1"
                    >
                      <p className="text-sm font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">
                        {edu.institution}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {edu.timeframe}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No education listed
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!resume.feedback && (
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                onAnalyze(resume.id);
              }}
            >
              Analyze Resume
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
