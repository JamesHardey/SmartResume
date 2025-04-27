import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeftIcon,
  PencilIcon,
  SaveIcon,
  TrashIcon,
  PlusIcon,
  UsersIcon
} from "lucide-react";

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

export default function ExamDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState(false);
  const [editedExam, setEditedExam] = useState<Exam | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  // Redirect to login if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Get exam details
  const { data: exam, isLoading: isLoadingExam } = useQuery<Exam>({
    queryKey: [`/api/exams/${examId}`],
    enabled: !isNaN(examId),
  });

  // Update edited exam when data loads
  useEffect(() => {
    if (exam) {
      setEditedExam(exam);
    }
  }, [exam]);

  // Update exam mutation
  const updateExamMutation = useMutation({
    mutationFn: async (updatedExam: Partial<Exam>) => {
      const response = await apiRequest("PATCH", `/api/exams/${examId}`, updatedExam);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      setEditMode(false);
      toast({
        title: "Exam updated",
        description: "The exam has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the exam.",
        variant: "destructive",
      });
    },
  });

  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/exams/${examId}`, {});
      return response.json();
    },
    onSuccess: () => {
      setLocation("/admin/exams");
      toast({
        title: "Exam deleted",
        description: "The exam has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message || "There was an error deleting the exam.",
        variant: "destructive",
      });
    },
  });

  // Handle save changes
  const handleSaveChanges = () => {
    if (!editedExam) return;
    updateExamMutation.mutate(editedExam);
  };

  // Update question text
  const updateQuestionText = (index: number, text: string) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], text };
    setEditedExam({ ...editedExam, questions: updatedQuestions });
  };

  // Update option text
  const updateOptionText = (questionIndex: number, optionIndex: number, text: string) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options[optionIndex] = text;
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      options 
    };
    setEditedExam({ ...editedExam, questions: updatedQuestions });
  };

  // Update correct answer
  const updateCorrectAnswer = (questionIndex: number, value: string | number) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      correctAnswer: value 
    };
    setEditedExam({ ...editedExam, questions: updatedQuestions });
  };

  // Add new option to a multiple choice question
  const addOption = (questionIndex: number) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    const options = [...(updatedQuestions[questionIndex].options || []), "New option"];
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      options 
    };
    setEditedExam({ ...editedExam, questions: updatedQuestions });
  };

  // Delete an option
  const deleteOption = (questionIndex: number, optionIndex: number) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options.splice(optionIndex, 1);
    
    // If we're deleting the correct answer option, reset correctAnswer
    let correctAnswer = updatedQuestions[questionIndex].correctAnswer;
    if (correctAnswer === optionIndex) {
      correctAnswer = options.length > 0 ? 0 : undefined;
    } else if (typeof correctAnswer === 'number' && correctAnswer > optionIndex) {
      // Adjust correctAnswer index if we're deleting an option before it
      correctAnswer = correctAnswer - 1;
    }
    
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      options,
      correctAnswer
    };
    setEditedExam({ ...editedExam, questions: updatedQuestions });
  };

  // Delete a question
  const deleteQuestion = (index: number) => {
    if (!editedExam) return;
    const updatedQuestions = [...editedExam.questions];
    updatedQuestions.splice(index, 1);
    setEditedExam({ ...editedExam, questions: updatedQuestions });
    setEditingQuestionIndex(null);
  };

  // Add a new question
  const addQuestion = (type: 'multiple_choice' | 'open_ended') => {
    if (!editedExam) return;
    
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      text: type === 'multiple_choice' ? 'New multiple choice question' : 'New open-ended question',
      type,
      ...(type === 'multiple_choice' ? { 
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        correctAnswer: 0
      } : {})
    };
    
    const updatedQuestions = [...editedExam.questions, newQuestion];
    setEditedExam({ ...editedExam, questions: updatedQuestions });
    setEditingQuestionIndex(updatedQuestions.length - 1);
  };

  const parseQuestions = (questions: any): Question[] => {
    if (!questions) return [];
    if (Array.isArray(questions)) {
      return questions.filter((q): q is Question => 
        typeof q === 'object' && 
        q !== null && 
        'id' in q && 
        'text' in q && 
        'type' in q
      );
    }
    if (typeof questions === 'string') {
      try {
        const parsed = JSON.parse(questions);
        return Array.isArray(parsed) ? parsed.filter((q): q is Question => 
          typeof q === 'object' && 
          q !== null && 
          'id' in q && 
          'text' in q && 
          'type' in q
        ) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null; // Will redirect due to useEffect
  }

  if (isLoadingExam || !editedExam) {
    return (
      <MainLayout title="Exam Details">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center mb-4">
              <Button variant="ghost" onClick={() => setLocation("/admin/exams")}>
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Exams
              </Button>
            </div>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <div className="grid gap-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Exam Details">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center mb-4">
            <Button variant="ghost" onClick={() => setLocation("/admin/exams")}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Exams
            </Button>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {editMode ? (
                  <Input
                    value={editedExam.title}
                    onChange={(e) => setEditedExam({ ...editedExam, title: e.target.value })}
                    className="text-2xl font-semibold h-auto py-0"
                  />
                ) : (
                  exam.title
                )}
              </h1>
              <p className="text-muted-foreground">
                {exam.questions.length} questions · {exam.passMark}% pass mark · {exam.timeLimit} min time limit
              </p>
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedExam(exam);
                      setEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={updateExamMutation.isPending}
                  >
                    <SaveIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignDialog(true)}
                  >
                    <UsersIcon className="h-4 w-4 mr-2" />
                    Assign to Candidates
                  </Button>
                  <Button
                    onClick={() => setEditMode(true)}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Edit Exam
                  </Button>
                </>
              )}
            </div>
          </div>
          
          {editMode && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Exam Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pass-mark">Pass Mark (%)</Label>
                    <Input
                      id="pass-mark"
                      type="number"
                      min="1"
                      max="100"
                      value={editedExam.passMark}
                      onChange={(e) => setEditedExam({ 
                        ...editedExam, 
                        passMark: parseInt(e.target.value) || 70 
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                    <Input
                      id="time-limit"
                      type="number"
                      min="1"
                      value={editedExam.timeLimit}
                      onChange={(e) => setEditedExam({ 
                        ...editedExam, 
                        timeLimit: parseInt(e.target.value) || 45 
                      })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Questions</CardTitle>
                {editMode && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => addQuestion('multiple_choice')}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add MCQ
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => addQuestion('open_ended')}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Open-Ended
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {parseQuestions(editedExam.questions).map((question, index) => (
                  <div key={question.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <p className="text-sm text-muted-foreground">{question.text}</p>
                      </div>
                      <Badge variant="outline" className={question.type === "multiple_choice" ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
                        {question.type === "multiple_choice" ? "Multiple Choice" : "Open Ended"}
                      </Badge>
                    </div>
                    {question.type === "multiple_choice" && question.options && (
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <div className={`w-4 h-4 rounded-full border ${question.correctAnswer === i ? 'bg-primary border-primary' : 'border-gray-300'}`} />
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this exam? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteExamMutation.mutate()}
              disabled={deleteExamMutation.isPending}
            >
              {deleteExamMutation.isPending ? "Deleting..." : "Delete Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Assign to Candidates Dialog would go here */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Candidates</DialogTitle>
            <DialogDescription>
              Select candidates to take this exam.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              This functionality is available from the main exams list by clicking the "Assign" button next to this exam.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
