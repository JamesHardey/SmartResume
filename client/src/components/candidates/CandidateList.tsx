import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ClipboardCheckIcon, 
  UserIcon, 
  MapPinIcon, 
  CheckIcon,
  XIcon,
  EyeIcon
} from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "candidate";
  location?: string;
  createdAt: string;
};

type Resume = {
  id: number;
  fileName: string;
  candidateId: number | null;
  score: number | null;
  qualified: boolean;
};

type CandidateExam = {
  id: number;
  candidateId: number;
  examId: number;
  status: 'pending' | 'in_progress' | 'completed';
  score: number | null;
  passed: boolean | null;
  examDetails?: {
    title: string;
  }
};

type CandidateDetail = {
  user: User;
  resumes: Resume[];
  exams: CandidateExam[];
};

export default function CandidateList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<User | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get the list of candidates
  const { data: candidates, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users?role=candidate"],
  });

  // Get candidate details
  const { data: candidateDetail, isLoading: isLoadingDetails } = useQuery<CandidateDetail>({
    queryKey: [`/api/candidates/${selectedCandidate?.id}/details`],
    enabled: !!selectedCandidate && showDetails,
  });

  // Mutation to qualify/disqualify a candidate
  const qualifyResumeMutation = useMutation({
    mutationFn: async ({ resumeId, qualified }: { resumeId: number; qualified: boolean }) => {
      const response = await apiRequest("POST", `/api/resumes/${resumeId}/qualify`, { qualified });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/candidates/${selectedCandidate?.id}/details`] });
      toast({
        title: "Status updated",
        description: "Candidate qualification status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the candidate qualification.",
        variant: "destructive",
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getBestResumeScore = (resumes: Resume[] | undefined) => {
    if (!resumes || resumes.length === 0) return null;
    
    const scoresWithValues = resumes
      .filter(r => r.score !== null)
      .map(r => r.score as number);
      
    if (scoresWithValues.length === 0) return null;
    return Math.max(...scoresWithValues);
  };

  const isAnyResumeQualified = (resumes: Resume[] | undefined) => {
    if (!resumes || resumes.length === 0) return false;
    return resumes.some(r => r.qualified);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
          <CardDescription>Loading candidates...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Candidates</CardTitle>
              <CardDescription>
                View and manage all applicants in the recruitment process.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {candidates && candidates.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(candidate.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{candidate.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>{candidate.email}</TableCell>
                      <TableCell>{candidate.location || "Not specified"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          New Applicant
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setShowDetails(true);
                          }}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          <span className="sr-only md:not-sr-only md:ml-1">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <UserIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
              <p>No candidates found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
            <DialogDescription>
              View detailed information about this candidate.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedCandidate && candidateDetail ? (
            <div className="space-y-6">
              {/* Candidate Basic Info */}
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-primary-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{selectedCandidate.name}</h3>
                  <p className="text-muted-foreground">{selectedCandidate.email}</p>
                  {selectedCandidate.location && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      <span>{selectedCandidate.location}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 pt-2">
                    {isAnyResumeQualified(candidateDetail.resumes) ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Qualified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Pending Qualification
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Resumes */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Resume Submissions
                </h4>
                {candidateDetail.resumes && candidateDetail.resumes.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidateDetail.resumes.map((resume) => (
                          <TableRow key={resume.id}>
                            <TableCell className="font-medium">{resume.fileName}</TableCell>
                            <TableCell>
                              {resume.score ? `${resume.score}%` : 'Not analyzed'}
                            </TableCell>
                            <TableCell>
                              {resume.qualified ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Qualified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                  Not Qualified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {resume.score && !resume.qualified ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600"
                                  onClick={() => qualifyResumeMutation.mutate({ resumeId: resume.id, qualified: true })}
                                >
                                  <CheckIcon className="h-4 w-4 mr-1" />
                                  Qualify
                                </Button>
                              ) : resume.qualified ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => qualifyResumeMutation.mutate({ resumeId: resume.id, qualified: false })}
                                >
                                  <XIcon className="h-4 w-4 mr-1" />
                                  Disqualify
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-4 text-center text-muted-foreground">
                    No resumes submitted.
                  </div>
                )}
              </div>

              {/* Candidate Exams */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Assigned Exams
                </h4>
                {candidateDetail.exams && candidateDetail.exams.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Exam</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Result</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidateDetail.exams.map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">
                              {exam.examDetails?.title || `Exam #${exam.examId}`}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={
                                  exam.status === 'completed' 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : exam.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }
                              >
                                {exam.status === 'pending' ? 'Not Started' : 
                                 exam.status === 'in_progress' ? 'In Progress' : 'Completed'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {exam.score !== null ? `${exam.score}%` : '-'}
                            </TableCell>
                            <TableCell>
                              {exam.passed === null ? (
                                '-'
                              ) : exam.passed ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Passed
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-md p-4 text-center text-muted-foreground">
                    No exams assigned yet.
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedCandidate(null);
                  }}
                >
                  Close
                </Button>
                <Button>
                  <ClipboardCheckIcon className="h-4 w-4 mr-2" />
                  Assign Exam
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              Failed to load candidate details.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
