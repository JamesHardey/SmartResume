import { useState } from "react";
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
  CardFooter
} from "@/components/ui/card";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2Icon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const examSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  jobRoleId: z.string().min(1, { message: "Job role is required" }),
  numQuestions: z.string().min(1, { message: "Number of questions is required" }),
  passMark: z.string().min(1, { message: "Pass mark is required" }),
});

type ExamFormValues = z.infer<typeof examSchema>;

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'open_ended';
  options?: string[];
  correctAnswer?: string;
}
export default function ExamCreator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [examGenerated, setExamGenerated] = useState(false);

  const parseQuestions = (questions: unknown): Question[] => {
    if (!questions) return [];
    
    let parsedQuestions: Question[] = [];
    
    if (Array.isArray(questions)) {
      parsedQuestions = questions.filter((q): q is Question => 
        typeof q === 'object' && 
        q !== null && 
        'id' in q && 
        'text' in q && 
        'type' in q
      );
    } else if (typeof questions === 'string') {
      try {
        const parsed = JSON.parse(questions);
        if (Array.isArray(parsed)) {
          parsedQuestions = parsed.filter((q): q is Question => 
            typeof q === 'object' && 
            q !== null && 
            'id' in q && 
            'text' in q && 
            'type' in q
          );
        }
      } catch (e) {
        console.error('Failed to parse questions:', e);
      }
    }
    
    return parsedQuestions;
  };
  
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      jobRoleId: "",
      numQuestions: "15",
      passMark: "70",
    },
  });

  const { data: jobRoles, isLoading: jobRolesLoading } = useQuery({
    queryKey: ["/api/job-roles"],
  });

  const generateExamMutation = useMutation({
    mutationFn: async (data: ExamFormValues) => {
      const response = await apiRequest("POST", "/api/exams/generate", {
        ...data,
        adminId: user?.id || 1,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      setExamGenerated(true);
      toast({
        title: "Exam created successfully",
        description: `Your ${data.title} exam has been created with ${parseQuestions(data.questions).length} questions.`,
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Exam creation failed",
        description: error.message || "There was an error creating the exam.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ExamFormValues) => {
    generateExamMutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create AI-Generated Exam</CardTitle>
        <CardDescription>
          Define the parameters and our AI will generate role-specific questions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Exam Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="e.g. Frontend Developer Assessment"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name="numQuestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Questions</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 questions</SelectItem>
                          <SelectItem value="15">15 questions</SelectItem>
                          <SelectItem value="20">20 questions</SelectItem>
                          <SelectItem value="30">30 questions</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passMark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pass Mark (%)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="60">60%</SelectItem>
                          <SelectItem value="70">70%</SelectItem>
                          <SelectItem value="80">80%</SelectItem>
                          <SelectItem value="90">90%</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generateExamMutation.isPending}
              >
                {generateExamMutation.isPending && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                {generateExamMutation.isPending ? "Generating..." : "Generate Exam"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
