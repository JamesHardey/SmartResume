import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { formatDistance } from "date-fns";
import { ClipboardListIcon, ClockIcon } from "lucide-react";

interface Exam {
  id: number;
  title: string;
  jobRoleId: number;
  questions: any[];
  passMark: number;
  timeLimit: number;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'completed';
  score: number | null;
  passed: boolean | null;
}

export default function CandidateExams() {
  const { user } = useAuth();
  
  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/candidate-exams", user?.id],
    enabled: !!user?.id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Exams</CardTitle>
          <CardDescription>Loading your exams...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Exams</CardTitle>
        <CardDescription>Exams assigned to you for completion</CardDescription>
      </CardHeader>
      <CardContent>
        {exams && exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{exam.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {exam.questions.length} questions • {exam.timeLimit} minutes
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={
                        exam.status === 'completed' 
                          ? 'bg-green-50 text-green-700' 
                          : exam.status === 'in_progress'
                            ? 'bg-yellow-50 text-yellow-700'
                            : 'bg-blue-50 text-blue-700'
                      }
                    >
                      {exam.status === 'completed' 
                        ? 'Completed' 
                        : exam.status === 'in_progress'
                          ? 'In Progress'
                          : 'Pending'}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <ClockIcon className="mr-1 h-4 w-4" />
                        {formatDistance(new Date(exam.createdAt), new Date(), { addSuffix: true })}
                      </div>
                      {exam.status === 'completed' && (
                        <div className="flex items-center">
                          <ClipboardListIcon className="mr-1 h-4 w-4" />
                          Score: {exam.score}% ({exam.passed ? 'Passed' : 'Failed'})
                        </div>
                      )}
                    </div>
                    
                    {exam.status === 'pending' && (
                      <Button>
                        Start Exam
                      </Button>
                    )}
                    {exam.status === 'in_progress' && (
                      <Button variant="outline">
                        Continue Exam
                      </Button>
                    )}
                    {exam.status === 'completed' && (
                      <Button variant="outline">
                        View Results
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <ClipboardListIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-3" />
            <p>No exams assigned to you yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 