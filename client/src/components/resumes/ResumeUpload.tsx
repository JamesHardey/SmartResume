import { useState, ChangeEvent, DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileIcon,
  TrashIcon,
  Loader2Icon,
  UploadCloudIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const uploadSchema = z.object({
  jobRoleId: z.string().min(1, { message: "Job role is required" }),
  keySkills: z.string().min(1, { message: "Key skills are required" }),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

export default function ResumeUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const form = useForm<UploadFormValues>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      jobRoleId: "",
      keySkills: "",
    },
  });

  const { data: jobRoles, isLoading: jobRolesLoading } = useQuery({
    queryKey: ["/api/job-roles"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest(
        "POST",
        "/api/resumes/upload",
        data,
        true
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resumes"] });
      toast({
        title: "Upload successful",
        description: `${files.length} resumes have been uploaded and are being analyzed.`,
      });
      setFiles([]);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description:
          error.message || "There was an error uploading the resumes.",
        variant: "destructive",
      });
    },
  });

  const handleFilesChange = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const filteredFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (
        (file.type === "application/pdf" ||
          file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") &&
        file.size <= maxSize
      ) {
        filteredFiles.push(file);
      } else {
        toast({
          title: "Invalid file",
          description: `${file.name} is not a PDF/DOCX or exceeds 10MB and was skipped.`,
          variant: "destructive",
        });
      }
    }

    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles, ...filteredFiles];
      console.log("Updated files state:", updatedFiles.map(f => f.name));
      return updatedFiles;
    });
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    console.log("Input files:", e.target.files);
    handleFilesChange(e.target.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    console.log("Dropped files:", e.dataTransfer.files);
    handleFilesChange(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const onSubmit = (values: UploadFormValues) => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one resume file to upload.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("jobRoleId", values.jobRoleId);
    formData.append("keySkills", values.keySkills);
    formData.append("userId", user?.id.toString() || "1");

    files.forEach((file) => {
      formData.append("files", file);
    });

    uploadMutation.mutate(formData);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Resumes</CardTitle>
        <CardDescription>
          Upload multiple resumes in PDF or DOCX format. Our AI will analyze and
          rank them based on the job requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <FormField
                control={form.control}
                name="jobRoleId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Job Role</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        disabled={jobRolesLoading}
                      >
                        <option value="">Select a job role</option>
                        {jobRoles?.map((role: any) => (
                          <option key={role.id} value={role.id}>
                            {role.title}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keySkills"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Key Skills (comma separated)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. React, JavaScript, CSS, HTML"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Resume Files
                </label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 rounded-md ${
                    dragOver
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-300"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                      >
                        <span>Upload files</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          multiple
                          onChange={handleInputChange}
                          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, DOCX up to 10MB each
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">
                  Selected Files
                </h4>
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                  {files.map((file, index) => (
                    <li
                      key={file.name + index}
                      className="px-4 py-3 flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center w-full">
                        <FileIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        <span className="ml-2 flex-1 truncate">
                          {file.name || "Unnamed file"}
                        </span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="font-medium text-red-600 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setFiles([]);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending || files.length === 0}
              >
                {uploadMutation.isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                {uploadMutation.isPending
                  ? "Processing..."
                  : "Upload & Analyze"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}