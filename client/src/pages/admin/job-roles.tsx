import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  SaveIcon,
  BriefcaseIcon,
} from "lucide-react";

// Job role schema
const jobRoleSchema = z.object({
  title: z.string().min(3, { message: "Job title is required" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  responsibilities: z.string().min(10, { message: "Responsibilities must be at least 10 characters" }),
  requirements: z.string().min(10, { message: "Requirements must be at least 10 characters" }),
  keySkills: z.string().min(3, { message: "Key skills are required" }),
  location: z.string().optional(),
});

type JobRoleFormValues = z.infer<typeof jobRoleSchema>;

interface JobRole {
  id: number;
  title: string;
  description: string;
  responsibilities: string;
  requirements: string;
  keySkills: string[];
  location?: string;
  createdAt: string;
}

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

export default function AdminJobRoles() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedJobRole, setSelectedJobRole] = useState<JobRole | null>(null);

  // Redirect to login if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Get job roles
  const { data: jobRoles, isLoading: loadingJobRoles } = useQuery<JobRole[]>({
    queryKey: ["/api/job-roles"],
  });

  // Create job role form
  const createJobRoleForm = useForm<JobRoleFormValues>({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: {
      title: "",
      description: "",
      responsibilities: "",
      requirements: "",
      keySkills: "",
      location: "",
    },
  });

  // Edit job role form
  const editJobRoleForm = useForm<JobRoleFormValues>({
    resolver: zodResolver(jobRoleSchema),
    defaultValues: {
      title: "",
      description: "",
      responsibilities: "",
      requirements: "",
      keySkills: "",
      location: "",
    },
  });

  // Set edit form values when a job role is selected
  useEffect(() => {
    if (selectedJobRole) {
      editJobRoleForm.reset({
        title: selectedJobRole.title,
        description: selectedJobRole.description,
        responsibilities: selectedJobRole.responsibilities,
        requirements: selectedJobRole.requirements,
        keySkills: selectedJobRole.keySkills.join(", "),
        location: selectedJobRole.location || "",
      });
    }
  }, [selectedJobRole, editJobRoleForm]);

  // Create job role mutation
  const createJobRoleMutation = useMutation({
    mutationFn: async (data: JobRoleFormValues) => {
      if (!user?.id) {
        throw new Error("You must be logged in to create a job role");
      }

      // Convert keySkills string to array
      const keySkillsArray = data.keySkills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);
      
      const payload = {
        ...data,
        keySkills: keySkillsArray,
        adminId: user.id
      };
      

      const response = await apiRequest("POST", "/api/job-roles", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-roles"] });
      toast({
        title: "Job role created",
        description: "The job role has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      createJobRoleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Creation failed",
        description: error.message || "Failed to create job role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update job role mutation
  const updateJobRoleMutation = useMutation({
    mutationFn: async (data: JobRoleFormValues & { id: number }) => {
      if (!user?.id) {
        throw new Error("You must be logged in to update a job role");
      }

      // Convert keySkills string to array
      const keySkillsArray = data.keySkills
        .split(",")
        .map((skill) => skill.trim())
        .filter((skill) => skill.length > 0);
      
      const payload = {
        ...data,
        keySkills: keySkillsArray,
        adminId: user.id
      };
      
      const response = await apiRequest("PATCH", `/api/job-roles/${data.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-roles"] });
      toast({
        title: "Job role updated",
        description: "The job role has been updated successfully.",
      });
      setIsEditDialogOpen(false);
      setSelectedJobRole(null);
      editJobRoleForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update job role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete job role mutation
  const deleteJobRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/job-roles/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-roles"] });
      toast({
        title: "Job role deleted",
        description: "The job role has been deleted successfully.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedJobRole(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message || "Failed to delete job role. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onCreateJobRole = (data: JobRoleFormValues) => {
    createJobRoleMutation.mutate(data);
  };

  const onUpdateJobRole = (data: JobRoleFormValues) => {
    if (!selectedJobRole) return;
    updateJobRoleMutation.mutate({ ...data, id: selectedJobRole.id });
  };

  const onDeleteJobRole = () => {
    if (!selectedJobRole) return;
    deleteJobRoleMutation.mutate(selectedJobRole.id);
  };

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null; // Will redirect due to useEffect
  }

  return (
    <MainLayout title="Job Roles">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Job Roles</h1>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Job Role
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Roles & Responsibilities</CardTitle>
                <CardDescription>
                  Manage job roles, responsibilities, and requirements for resume evaluation and exam generation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingJobRoles ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : !jobRoles || jobRoles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BriefcaseIcon className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-1">No job roles yet</h3>
                    <p>Create job roles to start evaluating resumes and generating exams.</p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Key Skills</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobRoles.map((jobRole) => (
                          <TableRow key={jobRole.id}>
                            <TableCell className="font-medium">{jobRole.title}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {parseKeySkills(jobRole.keySkills).slice(0, 3).map((skill, index) => (
                                  <Badge key={index} variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                                    {skill}
                                  </Badge>
                                ))}
                                {parseKeySkills(jobRole.keySkills).length > 3 && (
                                  <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">
                                    +{parseKeySkills(jobRole.keySkills).length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {jobRole.location || <span className="text-muted-foreground">Any</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedJobRole(jobRole);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => {
                                    setSelectedJobRole(jobRole);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Job Role Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Job Role</DialogTitle>
            <DialogDescription>
              Add a new job role with responsibilities and requirements.
            </DialogDescription>
          </DialogHeader>
          <Form {...createJobRoleForm}>
            <form onSubmit={createJobRoleForm.handleSubmit(onCreateJobRole)} className="space-y-6">
              <div className="max-h-[70vh] overflow-y-auto">
                <div className="space-y-4 px-1">
                  <FormField
                    control={createJobRoleForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Full Stack Developer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createJobRoleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Provide a general description of the job role..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createJobRoleForm.control}
                    name="responsibilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsibilities</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List the key responsibilities for this role..."
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter each responsibility on a new line. These will be used for resume evaluation.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createJobRoleForm.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List the requirements for this role..."
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter qualifications, experience level, and other requirements.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createJobRoleForm.control}
                    name="keySkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Skills</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. React, Node.js, MongoDB"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter skills separated by commas. These will be used to score resumes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createJobRoleForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. New York, Remote, or leave blank for any location"
                          />
                        </FormControl>
                        <FormDescription>
                          Specify a location or "Remote" if applicable.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createJobRoleMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <SaveIcon className="h-4 w-4" />
                  Create Job Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Job Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job Role</DialogTitle>
            <DialogDescription>
              Update the job role details, responsibilities, and requirements.
            </DialogDescription>
          </DialogHeader>
          <Form {...editJobRoleForm}>
            <form onSubmit={editJobRoleForm.handleSubmit(onUpdateJobRole)} className="space-y-6">
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4 px-1">
                  <FormField
                    control={editJobRoleForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Full Stack Developer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobRoleForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Provide a general description of the job role..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobRoleForm.control}
                    name="responsibilities"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsibilities</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List the key responsibilities for this role..."
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter each responsibility on a new line. These will be used for resume evaluation.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobRoleForm.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="List the requirements for this role..."
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter qualifications, experience level, and other requirements.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobRoleForm.control}
                    name="keySkills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Skills</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. React, Node.js, MongoDB"
                          />
                        </FormControl>
                        <FormDescription>
                          Enter skills separated by commas. These will be used to score resumes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobRoleForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. New York, Remote, or leave blank for any location"
                          />
                        </FormControl>
                        <FormDescription>
                          Specify a location or "Remote" if applicable.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateJobRoleMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <SaveIcon className="h-4 w-4" />
                  Update Job Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job role? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {selectedJobRole && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="font-medium text-red-800">{selectedJobRole.title}</p>
                <p className="text-sm text-red-700 mt-1">
                  Deleting this job role will remove all associated data and may affect existing resumes and exams.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteJobRole}
              disabled={deleteJobRoleMutation.isPending}
              className="flex items-center gap-2"
            >
              <TrashIcon className="h-4 w-4" />
              Delete Job Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}