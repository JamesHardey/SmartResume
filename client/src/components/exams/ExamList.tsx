import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  CalendarIcon, 
  ClipboardListIcon, 
  EditIcon, 
  UsersIcon, 
  PlusIcon,
  ExternalLinkIcon,
  Loader2
} from "lucide-react";
import { formatDistance } from "date-fns";

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer?: string;
}

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

interface Candidate {
  id: number;
  name: string;
  email: string;
  location: string | null;
  resumes: Array<{
    id: number;
    jobRole: {
      id: number;
      title: string;
    } | null;
  }>;
}

const parseQuestions = (questions: unknown): Question[] => {
  if (!questions) return [];
  
  let parsedQuestions: Question[] = [];
  
  if (Array.isArray(questions)) {
    parsedQuestions = questions.filter((q): q is Question => 
      typeof q === 'object' && 
      q !== null && 
      'id' in q && 
      'text' in q && 
      'type' in q
    );
  } else if (typeof questions === 'string') {
    try {
      const parsed = JSON.parse(questions);
      if (Array.isArray(parsed)) {
        parsedQuestions = parsed.filter((q): q is Question => 
          typeof q === 'object' && 
          q !== null && 
          'id' in q && 
          'text' in q && 
          'type' in q
        );
      }
    } catch (e) {
      console.error('Failed to parse questions:', e);
    }
  }
  
  return parsedQuestions;
};

export default function ExamList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  // Get the list of exams
  const { data: exams, isLoading: isLoadingExams } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Get list of candidates for assigning
  const { data: candidates, isLoading: isLoadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates/with-resumes"],
    enabled: showAssignDialog,
    select: (data: any) => {
      if (!Array.isArray(data)) return [];
      return data.map((item: any) => ({
        id: item.user.id,
        name: item.user.name || 'Unknown',
        email: item.user.email || 'No email',
        location: item.user.location || 'Unknown',
        resumes: Array.isArray(item.resumes) ? item.resumes.map((resume: any) => ({
          id: resume.id,
          fileUrl: resume.fileUrl,
          jobRoleId: resume.jobRoleId,
          score: resume.score,
          reasons: resume.reasons ? JSON.parse(resume.reasons) : [],
          qualified: resume.qualified,
          createdAt: resume.createdAt
        })) : [],
        jobRoles: Array.isArray(item.resumes)
          ? item.resumes
              .map((resume: any) => ({ id: resume.jobRoleId }))
              .filter((jobRole: any) => jobRole.id)
          : []
      }));
    }
  });

  console.log(candidates);

  const assignExamMutation = useMutation({
    mutationFn: async ({ examId, candidateIds }: { examId: number; candidateIds: number[] }) => {
      const response = await apiRequest("POST", `/api/exams/${examId}/assign`, { candidateIds });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam assigned",
        description: `The exam has been assigned to the selected candidates.`,
      });
      setShowAssignDialog(false);
      setSelectedCandidates([]);
    },
    onError: (error) => {
      toast({
        title: "Assignment failed",
        description: error.message || "There was an error assigning the exam.",
        variant: "destructive",
      });
    },
  });

  const handleAssignExam = () => {
    if (!selectedExam) return;

    console.log('Selected Exam', selectedExam);
    console.log('Selected Candidates', selectedCandidates);
    assignExamMutation.mutate({
      examId: selectedExam.id,
      candidateIds: selectedCandidates,
    });
  };

  const toggleCandidateSelection = (candidateId: number) => {
    setSelectedCandidates(prev => {
      if (prev.includes(candidateId)) {
        return prev.filter(id => id !== candidateId);
      } else {
        return [...prev, candidateId];
      }
    });
  };

  if (isLoadingExams) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exams</CardTitle>
          <CardDescription>Loading exams...</CardDescription>
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
              <CardTitle>Exams</CardTitle>
              <CardDescription>All created exams for the recruitment process.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {exams && exams.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Pass Mark</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.title}</TableCell>
                      <TableCell>{parseQuestions(exam.questions).length} questions</TableCell>
                      <TableCell>{exam.passMark}%</TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {formatDistance(new Date(exam.createdAt), new Date(), {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedExam(exam);
                              setShowDetails(true);
                            }}
                          >
                            <ClipboardListIcon className="h-4 w-4 mr-1" />
                            <span className="sr-only md:not-sr-only md:ml-1">View</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedExam(exam);
                              setShowAssignDialog(true);
                            }}
                          >
                            <UsersIcon className="h-4 w-4 mr-1" />
                            <span className="sr-only md:not-sr-only md:ml-1">Assign</span>
                          </Button>
                          <Link href={`/admin/exams/${exam.id}`}>
                            <Button size="sm" variant="ghost">
                              <EditIcon className="h-4 w-4 mr-1" />
                              <span className="sr-only md:not-sr-only md:ml-1">Edit</span>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardListIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
              <p>No exams found. Create a new exam to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title}</DialogTitle>
            <DialogDescription>
              Created {selectedExam && formatDistance(new Date(selectedExam.createdAt), new Date(), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Questions</h4>
                  <p className="text-2xl font-bold">{parseQuestions(selectedExam.questions).length}</p>
                </div>
                <div className="col-span-1 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Pass Mark</h4>
                  <p className="text-2xl font-bold">{selectedExam.passMark}%</p>
                </div>
                <div className="col-span-1 bg-gray-50 p-4 rounded-md">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Time Limit</h4>
                  <p className="text-2xl font-bold">{selectedExam.timeLimit} min</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Questions Preview
                </h4>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parseQuestions(selectedExam.questions).slice(0, 5).map((question, index) => (
                        <TableRow key={question.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{question.text}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={question.type === "multiple_choice" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
                              {question.type === "multiple_choice" ? "Multiple Choice" : "Open Ended"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parseQuestions(selectedExam.questions).length > 5 && (
                    <div className="px-4 py-3 bg-gray-50 text-sm text-center">
                      {parseQuestions(selectedExam.questions).length - 5} more questions...
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedExam(null);
                  }}
                >
                  Close
                </Button>
                <Button 
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedExam(selectedExam);
                    setShowAssignDialog(true);
                  }}
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Assign to Candidates
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Exam Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Exam</DialogTitle>
            <DialogDescription>
              Select candidates to assign this exam to.
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingCandidates ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : candidates && candidates.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Select</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Roles</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates?.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedCandidates.includes(candidate.id)}
                          onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{candidate.name}</TableCell>
                      <TableCell>{candidate.email}</TableCell>
                      <TableCell>
                        {candidate.jobRoles?.length > 0 ? (
                          <div className="space-y-1">
                            {candidate.jobRoles.map((jobRole) => (
                              <Badge key={jobRole.id} variant="outline" className="mr-1">
                                {jobRole.title}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No job roles</span>
                        )}
                      </TableCell>
                      <TableCell>{candidate.location || "Not specified"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No candidates available to assign. Candidates must apply for a job first.
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAssignDialog(false);
                setSelectedCandidates([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignExam}
              disabled={selectedCandidates.length === 0 || assignExamMutation.isPending}
            >
              {assignExamMutation.isPending ? (
                <>Assigning...</>
              ) : (
                <>Assign Exam ({selectedCandidates.length} selected)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
