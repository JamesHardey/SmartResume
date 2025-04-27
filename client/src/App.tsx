import React from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminResumes from "@/pages/admin/resumes";
import AdminCandidates from "@/pages/admin/candidates";
import AdminPrequalify from "@/pages/admin/prequalify";
import AdminExams from "@/pages/admin/exams/index";
import AdminExamDetail from "@/pages/admin/exams/[id]";
import AdminSettings from "@/pages/admin/settings";
import AdminJobRoles from "@/pages/admin/job-roles";
import CandidateDashboard from "@/pages/candidate/index";
import CandidateExam from "@/pages/candidate/exam/[id]";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Admin routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/resumes" component={AdminResumes} />
      <Route path="/admin/candidates" component={AdminCandidates} />
      <Route path="/admin/prequalify" component={AdminPrequalify} />
      <Route path="/admin/exams" component={AdminExams} />
      <Route path="/admin/exams/:id" component={AdminExamDetail} />
      <Route path="/admin/job-roles" component={AdminJobRoles} />
      <Route path="/admin/settings" component={AdminSettings} />
      
      {/* Candidate routes */}
      <Route path="/candidate" component={CandidateDashboard} />
      <Route path="/candidate/exam/:id" component={CandidateExam} />
      <Route path="/candidate/jobs">
        {() => {
          const Jobs = React.lazy(() => import('@/pages/candidate/jobs'));
          return (
            <React.Suspense fallback={<div>Loading...</div>}>
              <Jobs />
            </React.Suspense>
          );
        }}
      </Route>
      <Route path="/candidate/resumes">
        {() => {
          const Resumes = React.lazy(() => import('@/pages/candidate/resumes'));
          return (
            <React.Suspense fallback={<div>Loading...</div>}>
              <Resumes />
            </React.Suspense>
          );
        }}
      </Route>
      <Route path="/candidate/settings">
        {() => {
          const Settings = React.lazy(() => import('@/pages/candidate/settings'));
          return (
            <React.Suspense fallback={<div>Loading...</div>}>
              <Settings />
            </React.Suspense>
          );
        }}
      </Route>
      
      {/* Default route - redirect to login for now */}
      <Route path="/">
        {() => {
          window.location.href = "/login";
          return null;
        }}
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
