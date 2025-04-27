import { MainLayout } from "@/components/layout/MainLayout";
import ResumeUpload from "@/components/resumes/ResumeUpload";
import ResumeList from "@/components/resumes/ResumeList";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { UserIcon } from "lucide-react";

interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  experience: string[];
  education: string[];
  skills: string[];
  location?: string;
}

interface Resume {
  id: number;
  fileName: string;
  fileUrl: string;
  jobRoleId: number;
  candidateId: number;
  score: number | null;
  reasons: string;
  parsedData: ParsedResume | null;
  qualified: boolean;
  createdAt: string;
}

function ResumeDetails({ resume }: { resume: Resume }) {
  const parsedReasons = useMemo(() => {
    try {
      return typeof resume.reasons === 'string' ? JSON.parse(resume.reasons) : resume.reasons;
    } catch (e) {
      return [resume.reasons];
    }
  }, [resume.reasons]);

  const parsedData = resume.parsedData;

  return (
    <Dialog>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resume Details</DialogTitle>
          <DialogDescription>Detailed analysis of the candidate's resume.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Candidate Info */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-gray-100 rounded-full">
              <UserIcon className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {parsedData?.name || "Unknown Candidate"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {parsedData?.email || "unknown@example.com"}
              </p>
              {parsedData?.phone && (
                <p className="text-sm text-muted-foreground">{parsedData.phone}</p>
              )}
              {parsedData?.location && (
                <p className="text-sm text-muted-foreground">{parsedData.location}</p>
              )}
            </div>
            <div className="ml-auto">
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {resume.score}% Match
              </Badge>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Strengths */}
            <Card>
              <CardHeader>
                <CardTitle>Key Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(parsedReasons) && parsedReasons.length > 0 ? (
                  <ul className="list-disc list-inside space-y-2">
                    {parsedReasons.map((reason, index) => (
                      <li key={index} className="text-sm">{reason}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No analysis available</p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
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
                    <p className="text-sm text-muted-foreground">No skills listed</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Experience */}
          <Card>
            <CardHeader>
              <CardTitle>Experience</CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData?.experience && parsedData.experience.length > 0 ? (
                <ul className="space-y-4">
                  {parsedData.experience.map((exp, index) => (
                    <li key={index} className="text-sm">
                      {exp}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No experience listed</p>
              )}
            </CardContent>
          </Card>

          {/* Education */}
          <Card>
            <CardHeader>
              <CardTitle>Education</CardTitle>
            </CardHeader>
            <CardContent>
              {parsedData?.education && parsedData.education.length > 0 ? (
                <ul className="space-y-4">
                  {parsedData.education.map((edu, index) => (
                    <li key={index} className="text-sm">
                      {edu}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No education listed</p>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Close
          </Button>
          <Button 
            variant="default" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              // Handle qualification
            }}
          >
            Qualify Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminResumes() {
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
    <MainLayout title="Resume Evaluation">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Resume Evaluation</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-8">
            <ResumeUpload />
            <ResumeList />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
