import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { WebcamMonitor } from "@/components/proctoring/WebcamMonitor";
import { useProctoring } from "@/hooks/useProctoring";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

type Question = {
  id: string;
  text: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  correctAnswer?: string | number;
};

type CandidateExam = {
  id: number;
  candidateId: number;
  examId: number;
  status: "pending" | "in_progress" | "completed";
  score: number | null;
  passed: boolean | null;
  startedAt: string | null;
  completedAt: string | null;
  answers: any[] | null;
  flagged: boolean;
  flagReasons: any[] | null;
  examDetails?: {
    title: string;
    questions: Question[];
    passMark: number;
    timeLimit: number;
  };
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

interface ExamInterfaceProps {
  candidateExamId: number;
  exam?: CandidateExam;
}

export function ExamInterface({
  candidateExamId,
  exam: propExam,
}: ExamInterfaceProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1); // 1: setup, 2: exam, 3: completed
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [webcamApproved, setWebcamApproved] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [remainingTime, setRemainingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { flags, startMonitoring, stopFaceDetection, captureFlag } =
    useProctoring();

  // Get the candidate exam data
  const { data: candidateExam, isLoading: loadingCandidateExam } =
    useQuery<CandidateExam>({
      queryKey: [`/api/candidate-exams/${candidateExamId}`],
      enabled: !propExam && candidateExamId !== 0,
    });

  // Get the full exam data with questions
  const { data: fetchedExam, isLoading: loadingExam } = useQuery<Exam>({
    queryKey: [`/api/exams/${candidateExam?.examId}`],
    enabled: !!candidateExam?.examId && !propExam,
  });

  // Use propExam if provided, otherwise use fetched data
  const exam = propExam
    ? {
        id: propExam.examId,
        title: propExam.examDetails?.title || "Unknown Exam",
        jobRoleId: 0, // Placeholder, adjust as needed
        questions: propExam.examDetails?.questions || [],
        passMark: propExam.examDetails?.passMark || 0,
        timeLimit: propExam.examDetails?.timeLimit || 0,
        createdAt: propExam.createdAt || new Date().toISOString(),
        adminId: 0, // Placeholder, adjust as needed
      }
    : fetchedExam;

  // Start exam mutation
  const startExamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/candidate-exams/${candidateExamId}/start`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      setExamStarted(true);
      setCurrentStep(2);

      if (exam) {
        setRemainingTime(exam.timeLimit * 60);
        startMonitoring();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start exam",
        description: error.message || "There was an error starting the exam",
        variant: "destructive",
      });
    },
  });

  // Complete exam mutation
  const completeExamMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        `/api/candidate-exams/${candidateExamId}/complete`,
        {
          answers,
          flags,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      setExamCompleted(true);
      setCurrentStep(3);
      stopFaceDetection();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit exam",
        description: error.message || "There was an error submitting the exam",
        variant: "destructive",
      });
    },
  });

  // Handle timer countdown
  useEffect(() => {
    if (examStarted && !examCompleted && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            completeExamMutation.mutate();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examStarted, examCompleted, remainingTime]);

  // Initialize answers array when exam data loads
  useEffect(() => {
    if (exam && Array.isArray(exam.questions)) {
      const initialAnswers = exam.questions.map((q) => ({
        questionId: q.id,
        questionType: q.type,
        selectedOption: q.type === "multiple_choice" ? null : "",
        text: q.type === "open_ended" ? "" : null,
      }));
      setAnswers(initialAnswers);
    } else {
      console.error("Invalid or missing questions:", exam?.questions);
      setAnswers([]);
    }
  }, [exam]);

  // Leave exam warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted && !examCompleted) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [examStarted, examCompleted]);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Start the exam
  const handleStartExam = () => {
    if (!webcamApproved) {
      toast({
        title: "Webcam access required",
        description: "Please enable webcam access before starting the exam",
        variant: "destructive",
      });
      return;
    }
    startExamMutation.mutate();
  };

  // Complete the exam
  const handleCompleteExam = () => {
    const unansweredCount = answers.filter(
      (a) =>
        (a.questionType === "multiple_choice" && a.selectedOption === null) ||
        (a.questionType === "open_ended" && (!a.text || a.text.trim() === ""))
    ).length;

    if (unansweredCount > 0) {
      const confirmed = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit the exam?`
      );
      if (!confirmed) return;
    }

    completeExamMutation.mutate();
  };

  // Update answer for the current question
  const updateAnswer = (value: string | number | null) => {
    if (!exam) return;

    const question = exam.questions[currentQuestionIndex];
    const newAnswers = [...answers];

    if (question.type === "multiple_choice") {
      newAnswers[currentQuestionIndex].selectedOption = value;
    } else {
      newAnswers[currentQuestionIndex].text = value as string;
    }

    setAnswers(newAnswers);
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (!exam) return;
    if (currentQuestionIndex < exam.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Jump to specific question
  const jumpToQuestion = (index: number) => {
    if (!exam) return;
    if (index >= 0 && index < exam.questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Check if question has been answered
  const isQuestionAnswered = (index: number) => {
    if (!answers[index]) return false;

    return answers[index].questionType === "multiple_choice"
      ? answers[index].selectedOption !== null
      : answers[index].text && answers[index].text.trim() !== "";
  };

  // Preview mode handling
  if (candidateExamId === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exam Preview</CardTitle>
          <CardDescription>
            This is a preview of the exam interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <p className="text-gray-600 mb-6">
              Preview mode is not fully implemented.
            </p>
            <Button onClick={() => setLocation("/admin/dashboard")}>
              Return to Admin Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loadingCandidateExam || loadingExam) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (!candidateExam || !exam) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Exam Not Found</CardTitle>
          <CardDescription>
            The requested exam could not be found or accessed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was a problem loading the exam. Please contact support if
              the issue persists.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => setLocation("/candidate")}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If exam already completed
  if (candidateExam.status === "completed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{exam.title} - Completed</CardTitle>
          <CardDescription>
            You have already completed this exam.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-lg mx-auto text-center">
          <CheckCircleIcon className="h-24 w-24 text-primary-500 mx-auto mb-6" />

          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Exam Completed!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Your answers have been submitted for evaluation. You will receive
            your results once the evaluation is complete.
          </p>

          <div className="mt-6 bg-gray-50 p-4 rounded-md inline-block">
            <h3 className="text-lg font-medium text-gray-900">Exam Summary</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              <dt className="text-sm font-medium text-gray-500 text-left">
                Score:
              </dt>
              <dd className="text-sm text-gray-900 text-right">
                {candidateExam.score !== null
                  ? `${candidateExam.score}%`
                  : "Pending"}
              </dd>

              <dt className="text-sm font-medium text-gray-500 text-left">
                Status:
              </dt>
              <dd className="text-sm text-right">
                {candidateExam.passed === null ? (
                  <Badge variant="outline" className="bg-gray-100">
                    Pending
                  </Badge>
                ) : candidateExam.passed ? (
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    Passed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    Failed
                  </Badge>
                )}
              </dd>
            </dl>
          </div>

          <div className="mt-6">
            <Button onClick={() => setLocation("/candidate")}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{exam.title}</CardTitle>
            <CardDescription>
              {examStarted
                ? `${exam.questions.length} questions • ${exam.timeLimit} minutes • ${exam.passMark}% pass mark`
                : "Please read the instructions and setup your webcam before starting"}
            </CardDescription>
          </div>
          {examStarted && !examCompleted && (
            <div className="text-sm font-medium text-red-600 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Time Remaining: {formatTime(remainingTime)}</span>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Pre-exam Setup */}
      {currentStep === 1 && (
        <CardContent className="pt-6">
          <div className="max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Exam Setup</h2>

            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Grant Webcam Access
                  </h3>
                  <p className="text-sm text-gray-500">
                    This exam uses AI proctoring to ensure fair assessment.
                  </p>
                </div>
              </div>

              <div className="ml-14">
                <WebcamMonitor
                  onApprove={() => setWebcamApproved(true)}
                  setup={true}
                />
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Review Exam Rules
                  </h3>
                  <p className="text-sm text-gray-500">
                    Make sure you understand the requirements before starting.
                  </p>
                </div>
              </div>

              <div className="ml-14 bg-gray-50 p-4 rounded-md">
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                    <span>
                      You must stay in the exam browser window at all times.
                    </span>
                  </li>
                  <li className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                    <span>Your webcam must stay on and your face visible.</span>
                  </li>
                  <li className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                    <span>
                      No other people should be visible in the webcam frame.
                    </span>
                  </li>
                  <li className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                    <span>
                      The exam is {exam.timeLimit} minutes long with{" "}
                      {exam.questions.length} questions.
                    </span>
                  </li>
                  <li className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500 mr-2 flex-shrink-0" />
                    <span>
                      You must score at least {exam.passMark}% to pass.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleStartExam}
                disabled={!webcamApproved || startExamMutation.isPending}
              >
                {startExamMutation.isPending ? "Starting..." : "Start Exam"}
              </Button>
            </div>
          </div>
        </CardContent>
      )}

      {/* Exam Interface */}
      {currentStep === 2 && (
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row">
            {/* Main Exam Area */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">
                    Question
                  </span>
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentQuestionIndex + 1} of{" "}
                    {Array.isArray(exam.questions) ? exam.questions.length : 0}
                  </h3>
                </div>
                <div className="hidden md:block">
                  <Button
                    variant="outline"
                    onClick={handleCompleteExam}
                    className="text-red-700 hover:text-red-800 hover:bg-red-50"
                  >
                    End Exam
                  </Button>
                </div>
              </div>

              {Array.isArray(exam.questions) && exam.questions.length > 0 ? (
                <div className="mb-6">
                  <h4 className="text-base font-medium text-gray-900 mb-4">
                    {exam.questions[currentQuestionIndex].text}
                  </h4>

                  {exam.questions[currentQuestionIndex].type ===
                    "multiple_choice" && (
                    <RadioGroup
                      value={
                        answers[
                          currentQuestionIndex
                        ]?.selectedOption?.toString() || ""
                      }
                      onValueChange={(value) => updateAnswer(value)}
                      className="space-y-3 mt-4"
                    >
                      {Array.isArray(
                        exam.questions[currentQuestionIndex].options
                      ) ? (
                        exam.questions[currentQuestionIndex].options.map(
                          (option, idx) => (
                            <div
                              key={idx}
                              className="flex items-center space-x-2"
                            >
                              <RadioGroupItem
                                value={idx.toString()}
                                id={`option-${idx}`}
                              />
                              <Label
                                htmlFor={`option-${idx}`}
                                className="font-medium text-gray-700"
                              >
                                {option}
                              </Label>
                            </div>
                          )
                        )
                      ) : (
                        <p className="text-sm text-red-600">
                          No options available
                        </p>
                      )}
                    </RadioGroup>
                  )}

                  {exam.questions[currentQuestionIndex].type ===
                    "open_ended" && (
                    <Textarea
                      placeholder="Type your answer here..."
                      className="mt-4"
                      value={answers[currentQuestionIndex]?.text || ""}
                      onChange={(e) => updateAnswer(e.target.value)}
                      rows={6}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-600">No questions available</p>
              )}

              <div className="flex justify-between pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={prevQuestion}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentQuestionIndex <
                (Array.isArray(exam.questions)
                  ? exam.questions.length - 1
                  : 0) ? (
                  <Button onClick={nextQuestion}>
                    Next
                    <ChevronRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    onClick={handleCompleteExam}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircleIcon className="mr-2 h-4 w-4" />
                    Submit Exam
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar - Webcam Monitor and Question Navigator */}
            <div className="md:ml-6 mt-6 md:mt-0 md:w-64">
              <div className="bg-gray-50 rounded-md p-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Webcam Monitor
                </h4>
                <WebcamMonitor onApprove={() => {}} />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Question Navigator
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {Array.isArray(exam.questions) ? (
                    exam.questions.map((_, idx) => (
                      <button
                        key={idx}
                        className={`h-8 w-8 flex items-center justify-center text-sm font-medium rounded ${
                          idx === currentQuestionIndex
                            ? "bg-primary-100 border-2 border-primary-500 text-primary-700"
                            : isQuestionAnswered(idx)
                            ? "bg-green-100 text-green-700 border border-green-300"
                            : "bg-white border border-gray-300 text-gray-700"
                        }`}
                        onClick={() => jumpToQuestion(idx)}
                      >
                        {idx + 1}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-red-600">
                      No questions available
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 md:hidden">
                <Button
                  variant="outline"
                  onClick={handleCompleteExam}
                  className="w-full text-red-700 hover:text-red-800 hover:bg-red-50"
                >
                  End Exam
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      )}

      {/* Exam Completion View */}
      {currentStep === 3 && (
        <CardContent className="pt-6">
          <div className="max-w-lg mx-auto text-center">
            <CheckCircleIcon className="h-24 w-24 text-primary-500 mx-auto" />

            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Exam Completed!
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your answers have been submitted for evaluation. You will receive
              your results once the evaluation is complete.
            </p>

            <div className="mt-6 bg-gray-50 p-4 rounded-md inline-block">
              <h3 className="text-lg font-medium text-gray-900">
                Exam Summary
              </h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-sm font-medium text-gray-500 text-left">
                  Questions:
                </dt>
                <dd className="text-sm text-gray-900 text-right">
                  {exam.questions.length}
                </dd>

                <dt className="text-sm font-medium text-gray-500 text-left">
                  Answered:
                </dt>
                <dd className="text-sm text-gray-900 text-right">
                  {
                    answers.filter(
                      (a) =>
                        (a.questionType === "multiple_choice" &&
                          a.selectedOption !== null) ||
                        (a.questionType === "open_ended" &&
                          a.text &&
                          a.text.trim() !== "")
                    ).length
                  }
                </dd>
              </dl>
            </div>

            <div className="mt-6">
              <Button onClick={() => setLocation("/candidate")}>
                Return to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default ExamInterface;
