import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BriefcaseIcon, UploadIcon, MapPinIcon, CalendarIcon, CheckCircleIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Job application schema
const applicationSchema = z.object({
  jobRoleId: z.number().min(1, "Please select a job role"),
  resumeFile: z.instanceof(FileList).refine(files => files.length > 0, "Please upload a resume"),
});

type JobRole = {
  id: number;
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  keySkills: string[];
  location: string | null;
  createdAt: string;
};

// Helper function to parse keySkills
const parseKeySkills = (keySkills: string | string[] | null): string[] => {
  if (!keySkills) return [];
  if (Array.isArray(keySkills)) return keySkills;
  try {
    return JSON.parse(keySkills);
  } catch {
    return keySkills.split(',').map(skill => skill.trim());
  }
};

export default function CandidateJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<JobRole | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Form for job application
  const form = useForm<z.infer<typeof applicationSchema>>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      jobRoleId: undefined,
    },
  });
  
  // Query for job roles
  const { data: jobRoles, isLoading: loadingJobs } = useQuery<JobRole[]>({
    queryKey: ['/api/job-roles'],
  });
  
  // Mutation for job application
  const { mutate: applyForJob, isPending: isApplying } = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest('POST', '/api/resumes/upload',
        data, true );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidate/' + user?.id + '/resumes'] });
      setOpenDialog(false);
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: z.infer<typeof applicationSchema>) => {
    if (!user) return;
    const formData = new FormData();
    formData.append('jobRoleId', String(values.jobRoleId));
    formData.append('userId', String(user.id));
    
    // Add resume file
    // if (values.resumeFile instanceof FileList && values.resumeFile.length > 0) {
    //   for (let i = 0; i < values.resumeFile.length; i++) {
    //     formData.append('files', values.resumeFile[i]);
    //   }
    // }

    if (values.resumeFile instanceof FileList && values.resumeFile.length > 0) {
      const file = values.resumeFile[0]; 
      formData.append('files', file, file.name);
    }
    console.log(formData);
    
    // Get key skills from the selected job
    const job = jobRoles?.find(job => job.id === values.jobRoleId);
    if (job) {
      formData.append('keySkills', parseKeySkills(job.keySkills).join(','));
    }
    
    applyForJob(formData);
  };
  
  // View job details
  const handleViewJob = (job: JobRole) => {
    setSelectedJob(job);
    setOpenDialog(true);
    
    // Pre-fill the form
    form.setValue('jobRoleId', job.id);
  };

  const JobCard = ({ job, onApply }: { job: JobRole; onApply: (job: JobRole) => void }) => {
    const [isApplied, setIsApplied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      const checkApplication = async () => {
        try {
          const response = await fetch(`/api/job-roles/${job.id}/resumes`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          const resumes = await response.json();
          setIsApplied(resumes.length > 0);
        } catch (error) {
          console.error("Error checking application status:", error);
        }
      };
      checkApplication();
    }, [job.id]);

    const handleCancel = async () => {
      try {
        await fetch(`/api/job-roles/${job.id}/apply`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setIsApplied(false);
        toast.success("Application cancelled successfully");
      } catch (error) {
        console.error("Error cancelling application:", error);
        toast.error("Failed to cancel application");
      }
    };

    const handleEdit = () => {
      setIsEditing(true);
      fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        setSelectedFile(e.target.files[0]);
      }
    };

    const handleUpdate = async () => {
      if (!selectedFile) return;

      const formData = new FormData();
      formData.append("resume", selectedFile);

      try {
        await fetch(`/api/job-roles/${job.id}/apply`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        });
        setIsEditing(false);
        setSelectedFile(null);
        toast.success("Resume updated successfully");
      } catch (error) {
        console.error("Error updating resume:", error);
        toast.error("Failed to update resume");
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
        <p className="text-gray-600 mb-4">{job.description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {parseKeySkills(job.keySkills).slice(0, 3).map((skill, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {skill}
            </span>
          ))}
          {parseKeySkills(job.keySkills).length > 3 && (
            <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
              +{parseKeySkills(job.keySkills).length - 3} more
            </span>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </span>
          {isApplied ? (
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Edit Resume
              </button>
              <button
                onClick={handleCancel}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Cancel Application
              </button>
            </div>
          ) : (
            <button
              onClick={() => onApply(job)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Apply Now
            </button>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />
        {isEditing && selectedFile && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="mb-2">Selected file: {selectedFile.name}</p>
            <div className="flex gap-2">
              <button
                onClick={handleUpdate}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Update Resume
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedFile(null);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <MainLayout title="Job Opportunities">
      <div className="py-4 sm:py-6 pb-safe">
        <div className="container-responsive">
          <h1 className="heading-responsive mb-2">Available Positions</h1>
          <p className="text-responsive text-muted-foreground mb-6">
            Browse and apply for available job roles
          </p>
          
          {loadingJobs ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[280px] w-full rounded-lg" />
              ))}
            </div>
          ) : jobRoles && jobRoles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {jobRoles.map((job) => (
                <JobCard key={job.id} job={job} onApply={handleViewJob} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <BriefcaseIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No jobs available</h3>
              <p className="mt-1 text-sm text-gray-500">Check back later for new opportunities.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Job details and application dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedJob.title}</DialogTitle>
                <DialogDescription className="flex items-center mt-1">
                  <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{selectedJob.location || "Remote"}</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-2 sm:py-4">
                <div>
                  <h3 className="text-sm sm:text-md font-medium mb-2">Description</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedJob.description}</p>
                </div>
                
                <div>
                  <h3 className="text-sm sm:text-md font-medium mb-2">Responsibilities</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedJob.responsibilities}</p>
                </div>
                
                <div>
                  <h3 className="text-sm sm:text-md font-medium mb-2">Requirements</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{selectedJob.requirements}</p>
                </div>
                
                <div>
                  <h3 className="text-sm sm:text-md font-medium mb-2">Key Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {parseKeySkills(selectedJob.keySkills).map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4 sm:pt-6">
                  <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Apply for this position</h3>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                      <FormField
                        control={form.control}
                        name="resumeFile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Upload Resume</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => field.onChange(e.target.files)}
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                              />
                            </FormControl>
                            <FormDescription className="text-xs sm:text-sm">
                              Upload your resume in PDF, DOC, or DOCX format.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full" disabled={isApplying}>
                        {isApplying ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                          </span>
                        ) : (
                          <>
                            <CheckCircleIcon className="mr-2 h-4 w-4" />
                            Submit Application
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}