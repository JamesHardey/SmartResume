import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
import { 
  PlayIcon, 
  ClipboardListIcon, 
  InboxIcon,
  ClockIcon
} from "lucide-react";

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
  examDetails: {
    title: string;
    questions: any[];
    passMark: number;
    timeLimit: number;
  };
};

export default function CandidateDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Get candidate exams
  // const { data: candidateExams, isLoading: loadingExams } = useQuery<CandidateExam[]>({
  //   queryKey: [`/api/candidate-exams/${user?.id}`],
  //   enabled: !!user,
  // });

  const { data: candidateExams, isLoading: loadingExams } = useQuery<CandidateExam[]>({
    queryKey: ['candidateExams', user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/candidate-exams?candidateId=${user?.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidate exams');
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  console.log(candidateExams);
  

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  return (
    <MainLayout title="Candidate Dashboard">
      <div className="py-4 sm:py-6 pb-safe">
        <div className="container-responsive">
          <h1 className="heading-responsive mb-4">Candidate Dashboard</h1>
          
          <div className="mb-4">
            <p className="text-responsive text-muted-foreground">Welcome back, {user.name}! Here's your progress overview.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Assigned Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{candidateExams?.length || 0}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Completed Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {candidateExams?.filter(e => e.status === 'completed').length || 0}
                </p>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {candidateExams?.filter(e => e.status === 'completed' && e.score !== null).length
                    ? Math.round(candidateExams.filter(e => e.status === 'completed' && e.score !== null)
                        .reduce((sum, exam) => sum + (exam.score || 0), 0) / 
                      candidateExams.filter(e => e.status === 'completed' && e.score !== null).length) + '%'
                    : 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Exams</CardTitle>
                <CardDescription>
                  View and take your assigned exams
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingExams ? (
                  <Skeleton className="h-64 w-full" />
                ) : candidateExams && candidateExams.length > 0 ? (
                  <div className="responsive-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">Exam</TableHead>
                          <TableHead className="hidden md:table-cell">Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Questions</TableHead>
                          <TableHead className="hidden lg:table-cell">Duration</TableHead>
                          <TableHead className="hidden md:table-cell">Results</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {candidateExams.map((exam) => (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">
                              <div className="md:hidden flex items-center space-x-2 mb-1">
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
                              </div>
                              {exam.examDetails.title}
                              <div className="md:hidden text-xs text-muted-foreground mt-1">
                                {exam.examDetails.questions.length} questions • {exam.examDetails.timeLimit} min
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
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
                            <TableCell className="hidden lg:table-cell">
                              {exam.examDetails.questions.length} questions
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                                {exam.examDetails.timeLimit} minutes
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {exam.status === 'completed' ? (
                                <div>
                                  <div className="font-medium">{exam.score !== null ? `${exam.score}%` : 'Calculating...'}</div>
                                  {exam.passed !== null && (
                                    <Badge
                                      variant="outline"
                                      className={exam.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}
                                    >
                                      {exam.passed ? 'Passed' : 'Failed'}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not available</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {exam.status === 'pending' ? (
                                <Link href={`/candidate/exam/${exam.id}`}>
                                  <Button size="sm" className="w-full md:w-auto">
                                    <PlayIcon className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                </Link>
                              ) : exam.status === 'in_progress' ? (
                                <Link href={`/candidate/exam/${exam.id}`}>
                                  <Button size="sm" variant="outline" className="w-full md:w-auto">
                                    <PlayIcon className="h-4 w-4 mr-1" />
                                    Continue
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/candidate/exam/${exam.id}`}>
                                  <Button size="sm" variant="outline" className="w-full md:w-auto">
                                    <ClipboardListIcon className="h-4 w-4 mr-1" />
                                    Results
                                  </Button>
                                </Link>
                              )}
                              
                              {/* Show score on mobile */}
                              {exam.status === 'completed' && exam.score !== null && (
                                <div className="md:hidden text-xs mt-2 font-medium text-center">
                                  Score: {exam.score}%
                                  {exam.passed !== null && (
                                    <Badge
                                      variant="outline"
                                      className={`ml-1 ${exam.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                                    >
                                      {exam.passed ? 'Passed' : 'Failed'}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <InboxIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No exams assigned</h3>
                    <p>You don't have any exams assigned to you yet.</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-6">
                <Button variant="ghost" disabled>Previous</Button>
                <Button variant="ghost" disabled>Next</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
