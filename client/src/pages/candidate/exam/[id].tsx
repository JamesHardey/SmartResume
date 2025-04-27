import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { ExamInterface } from "@/components/exams/ExamInterface";

export default function CandidateExamPage() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();
  const examId = parseInt(id);

  // Redirect to login if not authenticated or not a candidate
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "candidate")) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Verify this exam belongs to the candidate
  const { data: candidateExams, isLoading: loadingExams } = useQuery({
    queryKey: ['candidateExams', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User ID is not available");
      const response = await fetch(`/api/candidate-exams?candidateId=${user.id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch candidate exams: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Log the fetched data for debugging
  console.log("Candidate Exams:", candidateExams);
  console.log("Requested Exam ID:", examId);

  // Check if this is a preview mode for admins
  const isPreview = id === "preview" && user?.role === "admin";

  const hasAccess = isPreview || 
                    (candidateExams && 
                     candidateExams.some((exam: any) => exam.id === examId));

  if (authLoading || loadingExams) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect due to useEffect
  }

  if (!isPreview && !hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full">
          <h1 className="text-xl font-semibold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have access to this exam or it does not exist.
          </p>
          <Button onClick={() => setLocation("/candidate")}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {isPreview && (
        <div className="max-w-7xl mx-auto mb-6">
          <Button variant="outline" onClick={() => setLocation("/admin/dashboard")}>
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          <div className="mt-4 mb-6 bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-700">
            <p className="font-medium">Preview Mode</p>
            <p className="text-sm">
              This is a preview of the candidate exam interface. No data will be saved.
            </p>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        {!isPreview && (
          <div className="mb-6">
            <Button variant="outline" onClick={() => setLocation("/candidate")}>
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        )}
        
        {isPreview ? (
          <ExamInterface candidateExamId={0} /* Mock ID for preview */ />
        ) : (
          <ExamInterface candidateExamId={examId} />
        )}
      </div>
    </div>
  );
}