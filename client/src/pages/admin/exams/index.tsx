import { MainLayout } from "@/components/layout/MainLayout";
import ExamCreator from "@/components/exams/ExamCreator";
import ExamList from "@/components/exams/ExamList";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function AdminExams() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to login if not authenticated or not an admin
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null; // Will redirect due to useEffect
  }

  return (
    <MainLayout title="Exams">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Exam Management</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-8">
            <ExamCreator />
            <ExamList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
