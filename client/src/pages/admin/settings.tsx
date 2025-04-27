import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircleIcon,
  SaveIcon,
  Settings2Icon,
  ShieldIcon,
  UserCogIcon,
  KeyIcon
} from "lucide-react";

// Schema for platform settings
const platformSettingsSchema = z.object({
  companyName: z.string().min(2, { message: "Company name is required" }),
  supportEmail: z.string().email({ message: "Please enter a valid email" }),
  defaultPassMark: z.coerce.number().min(1).max(100),
  defaultExamTimeLimit: z.coerce.number().min(5).max(240),
  autoQualifyScore: z.coerce.number().min(0).max(100),
  enableProctoring: z.boolean().default(true),
  enableLocationFiltering: z.boolean().default(true),
});

// Schema for user profile
const userProfileSchema = z.object({
  name: z.string().min(2, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).optional(),
  confirmPassword: z.string().optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Schema for API settings
const apiSettingsSchema = z.object({
  openaiApiKey: z.string().min(1, { message: "API key is required" }),
  enableAiResumeAnalysis: z.boolean().default(true),
  enableAiExamGeneration: z.boolean().default(true),
  maxQuestionsPerExam: z.coerce.number().min(5).max(50),
});

type PlatformSettings = z.infer<typeof platformSettingsSchema>;
type UserProfile = z.infer<typeof userProfileSchema>;
type ApiSettings = z.infer<typeof apiSettingsSchema>;

export default function AdminSettings() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("platform");

  // Redirect to login if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, authLoading, setLocation]);

  // Platform settings form
  const platformSettingsForm = useForm<PlatformSettings>({
    resolver: zodResolver(platformSettingsSchema),
    defaultValues: {
      companyName: "Smart Resume AI",
      supportEmail: "support@smartresumeai.com",
      defaultPassMark: 70,
      defaultExamTimeLimit: 45,
      autoQualifyScore: 80,
      enableProctoring: true,
      enableLocationFiltering: true,
    },
  });

  // User profile form
  const userProfileForm = useForm<UserProfile>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      confirmPassword: "",
    },
  });

  // API settings form
  const apiSettingsForm = useForm<ApiSettings>({
    resolver: zodResolver(apiSettingsSchema),
    defaultValues: {
      openaiApiKey: "",
      enableAiResumeAnalysis: true,
      enableAiExamGeneration: true,
      maxQuestionsPerExam: 20,
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: UserProfile) => {
      const payload = {
        name: data.name,
        email: data.email,
        ...(data.password ? { password: data.password } : {}),
      };
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save platform settings mutation
  const savePlatformSettingsMutation = useMutation({
    mutationFn: async (data: PlatformSettings) => {
      const response = await apiRequest("POST", "/api/settings/platform", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Platform settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save API settings mutation
  const saveApiSettingsMutation = useMutation({
    mutationFn: async (data: ApiSettings) => {
      const response = await apiRequest("POST", "/api/settings/api", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "API settings saved",
        description: "API settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save API settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submissions
  const onSavePlatformSettings = (data: PlatformSettings) => {
    savePlatformSettingsMutation.mutate(data);
  };

  const onUpdateProfile = (data: UserProfile) => {
    updateProfileMutation.mutate(data);
  };

  const onSaveApiSettings = (data: ApiSettings) => {
    saveApiSettingsMutation.mutate(data);
  };

  // Update user profile form when user data changes
  useEffect(() => {
    if (user) {
      userProfileForm.reset({
        name: user.name,
        email: user.email,
        password: "",
        confirmPassword: "",
      });
    }
  }, [user, userProfileForm]);

  if (authLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null; // Will redirect due to useEffect
  }

  return (
    <MainLayout title="Settings">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="platform" className="flex items-center gap-2">
                  <Settings2Icon className="h-4 w-4" />
                  <span>Platform</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <UserCogIcon className="h-4 w-4" />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <KeyIcon className="h-4 w-4" />
                  <span>API Keys</span>
                </TabsTrigger>
              </TabsList>

              {/* Platform Settings Tab */}
              <TabsContent value="platform" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Platform Settings</CardTitle>
                    <CardDescription>
                      Configure global settings for the Smart Resume AI platform.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...platformSettingsForm}>
                      <form onSubmit={platformSettingsForm.handleSubmit(onSavePlatformSettings)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={platformSettingsForm.control}
                            name="companyName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Company Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormDescription>
                                  Used throughout the platform and in email communications.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={platformSettingsForm.control}
                            name="supportEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Support Email</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" />
                                </FormControl>
                                <FormDescription>
                                  Email address for candidate inquiries.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />
                        <h3 className="text-lg font-medium">Exam Settings</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={platformSettingsForm.control}
                            name="defaultPassMark"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Pass Mark (%)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min={1} max={100} />
                                </FormControl>
                                <FormDescription>
                                  Default passing score for new exams.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={platformSettingsForm.control}
                            name="defaultExamTimeLimit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Default Time Limit (minutes)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min={5} max={240} />
                                </FormControl>
                                <FormDescription>
                                  Default time limit for new exams.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />
                        <h3 className="text-lg font-medium">Resume Evaluation Settings</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={platformSettingsForm.control}
                            name="autoQualifyScore"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Auto-Qualify Score (%)</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min={0} max={100} />
                                </FormControl>
                                <FormDescription>
                                  Resumes with scores above this threshold will be automatically qualified.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={platformSettingsForm.control}
                            name="enableLocationFiltering"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel>Location-Based Filtering</FormLabel>
                                  <FormDescription>
                                    Enable location-based filtering for pre-qualification.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />
                        <h3 className="text-lg font-medium">Security Settings</h3>

                        <FormField
                          control={platformSettingsForm.control}
                          name="enableProctoring"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                              <div className="space-y-0.5">
                                <FormLabel>AI Proctoring</FormLabel>
                                <FormDescription>
                                  Enable AI-powered proctoring for exams to detect cheating attempts.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={savePlatformSettingsMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <SaveIcon className="h-4 w-4" />
                            Save Settings
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* User Profile Tab */}
              <TabsContent value="profile" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>User Profile</CardTitle>
                    <CardDescription>
                      Update your account details and password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...userProfileForm}>
                      <form onSubmit={userProfileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={userProfileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userProfileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input {...field} type="email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Separator />
                        <h3 className="text-lg font-medium">Change Password</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={userProfileForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" />
                                </FormControl>
                                <FormDescription>
                                  Leave blank to keep your current password.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={userProfileForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <SaveIcon className="h-4 w-4" />
                            Update Profile
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* API Settings Tab */}
              <TabsContent value="api" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Settings</CardTitle>
                    <CardDescription>
                      Configure API keys and settings for AI features.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...apiSettingsForm}>
                      <form onSubmit={apiSettingsForm.handleSubmit(onSaveApiSettings)} className="space-y-6">
                        <div className="space-y-4">
                          <FormField
                            control={apiSettingsForm.control}
                            name="openaiApiKey"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>OpenAI API Key</FormLabel>
                                <FormControl>
                                  <Input {...field} type="password" />
                                </FormControl>
                                <FormDescription>
                                  Used for resume analysis and exam question generation.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3 text-yellow-800">
                            <AlertCircleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div className="text-sm">
                              <p className="font-medium">API Key Security</p>
                              <p>Your API keys are encrypted before being stored. Never share your API keys with others.</p>
                            </div>
                          </div>
                        </div>

                        <Separator />
                        <h3 className="text-lg font-medium">AI Feature Settings</h3>

                        <div className="space-y-4">
                          <FormField
                            control={apiSettingsForm.control}
                            name="enableAiResumeAnalysis"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel>AI Resume Analysis</FormLabel>
                                  <FormDescription>
                                    Enable AI-powered resume analysis and scoring.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={apiSettingsForm.control}
                            name="enableAiExamGeneration"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel>AI Exam Generation</FormLabel>
                                  <FormDescription>
                                    Enable AI-powered exam question generation.
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={apiSettingsForm.control}
                            name="maxQuestionsPerExam"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maximum Questions Per Exam</FormLabel>
                                <FormControl>
                                  <Input {...field} type="number" min={5} max={50} />
                                </FormControl>
                                <FormDescription>
                                  Set a limit for the number of AI-generated questions per exam.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={saveApiSettingsMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <SaveIcon className="h-4 w-4" />
                            Save API Settings
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}