import { useQuery } from "@tanstack/react-query";
import { CalendarIcon } from "lucide-react";
import { formatDistance } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityUser = {
  id: number;
  name: string;
  email: string;
};

type ActivityDetails = {
  jobRoleId?: number;
  jobRoleTitle?: string;
  resumeId?: number;
  examId?: number;
  candidateExamId?: number;
  score?: number;
  passed?: boolean;
  count?: number;
};

type Activity = {
  id: number;
  userId: number;
  action: string;
  details: ActivityDetails;
  createdAt: string;
  user: ActivityUser | null;
};

export function RecentActivity() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/activities/recent"],
  });

  const getActivityTitle = (activity: Activity): string => {
    switch (activity.action) {
      case "job_role_created":
        return "New job role created";
      case "resumes_uploaded":
        return "New resumes uploaded";
      case "resume_analyzed":
        return "Resume analysis completed";
      case "resume_qualified":
        return "Candidate qualified";
      case "resume_disqualified":
        return "Candidate disqualified";
      case "exam_created":
        return "New exam created";
      case "exam_assigned":
        return "Exam assigned to candidates";
      case "exam_started":
        return "Exam started";
      case "exam_completed":
        return "Exam completed";
      default:
        return "Activity logged";
    }
  };

  const getActivityDescription = (activity: Activity): string => {
    switch (activity.action) {
      case "job_role_created":
        return `for ${activity.details.jobRoleTitle || "role"}`;
      case "resumes_uploaded":
        return `for ${activity.details.jobRoleTitle || "role"} (${activity.details.count || 0} resumes)`;
      case "resume_analyzed":
        return `with score ${activity.details.score || 0}%`;
      case "resume_qualified":
        return `for next round`;
      case "resume_disqualified":
        return `from selection process`;
      case "exam_created":
        return `for ${activity.details.jobRoleTitle || "role"}`;
      case "exam_assigned":
        return `to ${activity.details.count || 0} candidates`;
      case "exam_started":
        return `by ${activity.user?.name || "candidate"}`;
      case "exam_completed":
        return `with score ${activity.details.score || 0}% (${activity.details.passed ? "Passed" : "Failed"})`;
      default:
        return "";
    }
  };

  const getActivityTag = (activity: Activity): { text: string; color: string } => {
    switch (activity.action) {
      case "job_role_created":
        return { text: "New role", color: "bg-blue-100 text-blue-800" };
      case "resumes_uploaded":
        return { text: `${activity.details.count || 0} new`, color: "bg-green-100 text-green-800" };
      case "resume_analyzed":
        return { text: `${activity.details.score || 0}%`, color: "bg-green-100 text-green-800" };
      case "exam_completed":
        return { 
          text: activity.details.passed ? "Passed" : "Failed", 
          color: activity.details.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800" 
        };
      case "exam_started":
        return { text: "In progress", color: "bg-yellow-100 text-yellow-800" };
      default:
        return { text: "Activity", color: "bg-gray-100 text-gray-800" };
    }
  };

  if (isLoading) {
    return (
      <div>
        <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h2>
        <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {[...Array(3)].map((_, i) => (
              <li key={i} className="px-4 py-4">
                <Skeleton className="h-16 w-full" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h2>
      <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {activities && activities.length > 0 ? (
            activities.map((activity) => (
              <li key={activity.id}>
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <div className="flex text-sm">
                        <p className="font-medium text-primary-600 truncate">
                          {getActivityTitle(activity)}
                        </p>
                        <p className="ml-1 flex-shrink-0 font-normal text-gray-500">
                          {getActivityDescription(activity)}
                        </p>
                      </div>
                      <div className="mt-2 flex">
                        <div className="flex items-center text-sm text-gray-500">
                          <CalendarIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          <span>
                            {formatDistance(new Date(activity.createdAt), new Date(), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0">
                      <div className="flex overflow-hidden">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActivityTag(activity).color}`}>
                          {getActivityTag(activity).text}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-gray-500">
              No recent activity to display
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
