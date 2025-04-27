import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  HomeIcon, 
  FileTextIcon, 
  UsersIcon, 
  TargetIcon, 
  ClipboardListIcon,
  SettingsIcon,
  BriefcaseIcon
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface SidebarProps {
  sidebarOpen: boolean;
}

export function Sidebar({ sidebarOpen }: SidebarProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  
  if (!sidebarOpen) return null;
  
  // Only show for logged in users
  if (!user) return null;
  
  const isAdmin = user.role === "admin";
  
  const adminNavigation = [
    {
      name: "Dashboard",
      href: "/admin/dashboard",
      icon: HomeIcon,
      current: location === "/admin/dashboard",
    },
    {
      name: "Job Roles",
      href: "/admin/job-roles",
      icon: BriefcaseIcon,
      current: location === "/admin/job-roles",
    },
    {
      name: "Resumes",
      href: "/admin/resumes",
      icon: FileTextIcon,
      current: location === "/admin/resumes",
    },
    {
      name: "Candidates",
      href: "/admin/candidates",
      icon: UsersIcon,
      current: location === "/admin/candidates",
    },
    {
      name: "Pre-qualification",
      href: "/admin/prequalify",
      icon: TargetIcon,
      current: location === "/admin/prequalify",
    },
    {
      name: "Exams",
      href: "/admin/exams",
      icon: ClipboardListIcon,
      current: location === "/admin/exams" || location.startsWith("/admin/exams/"),
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: SettingsIcon,
      current: location === "/admin/settings",
    },
  ];
  
  const candidateNavigation = [
    {
      name: "Dashboard",
      href: "/candidate",
      icon: HomeIcon,
      current: location === "/candidate",
    },
    {
      name: "Job Opportunities",
      href: "/candidate/jobs",
      icon: BriefcaseIcon,
      current: location === "/candidate/jobs",
    },
    {
      name: "My Resumes",
      href: "/candidate/resumes",
      icon: FileTextIcon,
      current: location === "/candidate/resumes",
    },
    {
      name: "My Exams",
      href: "/candidate",  // Updated to point to dashboard where exams are shown
      icon: ClipboardListIcon,
      current: location.startsWith("/candidate/exam/"),
    },
    {
      name: "Settings",
      href: "/candidate/settings",
      icon: SettingsIcon,
      current: location === "/candidate/settings",
    },
  ];
  
  const navigation = isAdmin ? adminNavigation : candidateNavigation;

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn(
        "md:flex flex-shrink-0 hidden", 
        sidebarOpen ? "md:block" : "md:hidden"
      )}>
        <div className="flex flex-col w-64 bg-gray-800 h-full">
          <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
            <span className="text-white font-semibold text-lg">Smart Resume AI</span>
          </div>
          
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    item.current
                      ? "bg-gray-900 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white",
                    "group flex items-center px-2 py-2 text-sm md:text-base font-medium rounded-md"
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current ? "text-primary-500" : "text-gray-400 group-hover:text-gray-300",
                      "mr-3 h-5 w-5 md:h-6 md:w-6 flex-shrink-0"
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar (fixed bottom navigation) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 md:hidden">
        <div className="grid grid-cols-5 items-center h-16">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1",
                item.current ? "text-primary-500" : "text-gray-300 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 mb-1",
                  item.current ? "text-primary-500" : "text-gray-400"
                )}
                aria-hidden="true"
              />
              <span className="text-xs">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
