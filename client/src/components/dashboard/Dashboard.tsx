import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatsCards } from "./StatsCards";
import { RecentActivity } from "./RecentActivity";
import ResumeUpload from "@/components/resumes/ResumeUpload";
import ResumeList from "@/components/resumes/ResumeList";
import ExamCreator from "@/components/exams/ExamCreator";
import ExamList from "@/components/exams/ExamList";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type DashboardStats = {
  totalResumes: number;
  qualifiedCandidates: number;
  totalExams: number;
  completedExams: number;
};

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });
  
  useEffect(() => {
    if (statsError) {
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    }
  }, [statsError, toast]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="px-4 sm:px-6 md:px-8 flex-1 flex flex-col">
        <div className="py-4 flex-1 flex flex-col">
          {/* Stats Cards */}
          {statsLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <StatsCards 
              totalResumes={stats?.totalResumes || 0}
              qualifiedCandidates={stats?.qualifiedCandidates || 0}
              completedExams={stats?.completedExams || 0}
            />
          )}

          {/* Recent Activity */}
          <div className="mt-8 flex-1">
            <RecentActivity />
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="resumeUpload">Resume Upload</TabsTrigger>
                <TabsTrigger value="examCreation">Exam Creation</TabsTrigger>
                <TabsTrigger value="candidateView">Candidate View</TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard" className="mt-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Welcome to Smart Resume Evaluator</h3>
                  <p className="text-gray-600">
                    This dashboard allows you to manage the recruitment process from resume evaluation to candidate testing.
                    Use the tabs above to navigate between different features.
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="resumeUpload" className="mt-6">
                <div className="space-y-8">
                  <ResumeUpload />
                  <ResumeList />
                </div>
              </TabsContent>
              
              <TabsContent value="examCreation" className="mt-6">
                <div className="space-y-8">
                  <ExamCreator />
                  <ExamList />
                </div>
              </TabsContent>
              
              <TabsContent value="candidateView" className="mt-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Candidate Exam Preview</h3>
                  <p className="text-gray-600 mb-4">
                    This tab shows a preview of what candidates will see when taking an exam.
                  </p>
                  <div className="flex justify-center">
                    <a 
                      href="/candidate/exam/preview" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md"
                    >
                      View Candidate Exam Interface
                    </a>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
