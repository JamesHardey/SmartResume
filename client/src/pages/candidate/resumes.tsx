import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon, ThumbsUpIcon, ThumbsDownIcon, FileTextIcon, ClipboardCheckIcon, ExternalLinkIcon } from "lucide-react";

type Resume = {
  id: number;
  fileName: string;
  fileUrl: string;
  candidateId: number | null;
  jobRoleId: number;
  parsedData: any;
  score: number | null;
  reasons: string | null;
  location: string;
  qualified: boolean;
  createdAt: string;
  jobRole?: {
    title: string;
    description: string;
  };
};

export default function CandidateResumes() {
  const { user } = useAuth();
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  // Query for candidate's resumes
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ['/api/candidate/' + user?.id + '/resumes'],
    enabled: !!user?.id,
  });
  
  const handleViewDetails = (resume: Resume) => {
    setSelectedResume(resume);
    setOpenDialog(true);
  };
  
  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-200";
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <MainLayout title="My Resumes">
      <div className="py-4 sm:py-6 pb-safe">
        <div className="container-responsive">
          <h1 className="heading-responsive mb-2">My Resumes</h1>
          <p className="text-responsive text-muted-foreground mb-6">
            View your submitted resumes and their evaluation status
          </p>
          
          <Card>
            <CardHeader>
              <CardTitle>Submitted Resumes</CardTitle>
              <CardDescription>
                View the status of your resume evaluations for different job applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : resumes && resumes.length > 0 ? (
                <div className="responsive-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Resume</TableHead>
                        <TableHead className="hidden md:table-cell">Job Role</TableHead>
                        <TableHead className="hidden sm:table-cell">Score</TableHead>
                        <TableHead className="hidden sm:table-cell">Status</TableHead>
                        <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resumes.map((resume) => (
                        <TableRow key={resume.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <FileIcon className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                              <span className="truncate">{resume.fileName}</span>
                            </div>
                            {/* Mobile only information */}
                            <div className="flex flex-col space-y-1 sm:hidden mt-1">
                              <div className="text-xs text-muted-foreground">
                                {resume.jobRole?.title || "Unknown Job"}
                              </div>
                              <div className="flex items-center">
                                {resume.qualified === true ? (
                                  <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
                                    Qualified
                                  </Badge>
                                ) : resume.qualified === false ? (
                                  <Badge variant="outline" className="text-xs bg-red-100 text-red-800 border-red-200">
                                    Not Qualified
                                  </Badge>
                                ) : resume.score !== null ? (
                                  <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-200">
                                    Evaluated
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                                    Pending
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {resume.jobRole?.title || "Unknown Job"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {resume.score !== null ? (
                              <div className="flex items-center">
                                <Progress 
                                  value={resume.score} 
                                  className={`w-16 sm:w-20 h-2 mr-2 ${getScoreColor(resume.score)}`}
                                />
                                <span className="text-sm">{resume.score}%</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Pending</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {resume.qualified === true ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <ThumbsUpIcon className="h-3 w-3 mr-1 hidden md:inline" />
                                Qualified
                              </Badge>
                            ) : resume.qualified === false ? (
                              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                                <ThumbsDownIcon className="h-3 w-3 mr-1 hidden md:inline" />
                                Not Qualified
                              </Badge>
                            ) : resume.score !== null ? (
                              <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                <ClipboardCheckIcon className="h-3 w-3 mr-1 hidden md:inline" />
                                Evaluated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {new Date(resume.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(resume)}
                              className="w-full sm:w-auto"
                            >
                              <FileTextIcon className="h-4 w-4 mr-1" />
                              <span className="md:inline">Details</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 sm:py-20 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <FileIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No resumes submitted</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't submitted any resumes yet. Visit the Jobs page to apply for positions.
                  </p>
                  <Button className="mt-4" asChild>
                    <a href="/candidate/jobs">
                      Browse Jobs
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Resume details dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedResume && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Resume Details</DialogTitle>
                <DialogDescription className="text-sm">
                  Evaluation for {selectedResume.fileName}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="overview" className="mt-2 sm:mt-4">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="overview" className="text-xs sm:text-sm py-1.5 px-1 sm:px-3">Overview</TabsTrigger>
                  <TabsTrigger value="evaluation" className="text-xs sm:text-sm py-1.5 px-1 sm:px-3">Evaluation</TabsTrigger>
                  <TabsTrigger value="content" className="text-xs sm:text-sm py-1.5 px-1 sm:px-3">Resume Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-sm font-medium text-gray-500">Job Role</h3>
                      <p className="mt-1 text-sm">{selectedResume.jobRole?.title || "Unknown Job"}</p>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-sm font-medium text-gray-500">Submission Date</h3>
                      <p className="mt-1 text-sm">
                        {new Date(selectedResume.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-sm font-medium text-gray-500">Score</h3>
                      <div className="mt-1 flex items-center">
                        {selectedResume.score !== null ? (
                          <>
                            <Progress 
                              value={selectedResume.score} 
                              className={`w-24 h-2 mr-2 ${getScoreColor(selectedResume.score)}`}
                            />
                            <span className="text-sm font-medium">{selectedResume.score}%</span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pending evaluation</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2 sm:col-span-1">
                      <h3 className="text-sm font-medium text-gray-500">Status</h3>
                      <div className="mt-1">
                        {selectedResume.qualified === true ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <ThumbsUpIcon className="h-3 w-3 mr-1" />
                            Qualified
                          </Badge>
                        ) : selectedResume.qualified === false ? (
                          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                            <ThumbsDownIcon className="h-3 w-3 mr-1" />
                            Not Qualified
                          </Badge>
                        ) : selectedResume.score !== null ? (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <ClipboardCheckIcon className="h-3 w-3 mr-1" />
                            Evaluated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                            Pending Review
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <h3 className="text-sm font-medium text-gray-500">Original Resume</h3>
                      <div className="mt-1">
                        <Button variant="outline" size="sm" asChild>
                          <a href={selectedResume.fileUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLinkIcon className="h-4 w-4 mr-1" />
                            View Resume File
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="evaluation" className="mt-4">
                  {selectedResume.score !== null ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-md font-medium">Evaluation Summary</h3>
                        <div className="mt-2 p-4 bg-gray-50 rounded-md">
                          <p className="text-sm whitespace-pre-line">{selectedResume.reasons}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium">Match Score</h3>
                        <div className="mt-2">
                          <Progress 
                            value={selectedResume.score} 
                            className={`w-full h-4 ${getScoreColor(selectedResume.score)}`}
                          />
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>Poor Match</span>
                            <span>Average Match</span>
                            <span>Strong Match</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <ClipboardCheckIcon className="mx-auto h-10 w-10 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Evaluation Pending</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your resume is still being evaluated. Check back later for results.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="content" className="mt-4">
                  {selectedResume.parsedData ? (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-md font-medium">Contact Information</h3>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Name</h4>
                            <p className="text-sm">{selectedResume.parsedData.name || "Not available"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Email</h4>
                            <p className="text-sm">{selectedResume.parsedData.email || "Not available"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Phone</h4>
                            <p className="text-sm">{selectedResume.parsedData.phone || "Not available"}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">Location</h4>
                            <p className="text-sm">{selectedResume.parsedData.location || "Not available"}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium">Skills</h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedResume.parsedData.skills && selectedResume.parsedData.skills.length > 0 ? (
                            selectedResume.parsedData.skills.map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No skills extracted</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium">Experience</h3>
                        <div className="mt-2 space-y-2">
                          {selectedResume.parsedData.experience && selectedResume.parsedData.experience.length > 0 ? (
                            selectedResume.parsedData.experience.map((exp: string, index: number) => (
                              <div key={index} className="p-2 bg-gray-50 rounded-md">
                                <p className="text-sm">{exp}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No experience extracted</p>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium">Education</h3>
                        <div className="mt-2 space-y-2">
                          {selectedResume.parsedData.education && selectedResume.parsedData.education.length > 0 ? (
                            selectedResume.parsedData.education.map((edu: string, index: number) => (
                              <div key={index} className="p-2 bg-gray-50 rounded-md">
                                <p className="text-sm">{edu}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No education extracted</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg">
                      <FileTextIcon className="mx-auto h-10 w-10 text-gray-400" />
                      <h3 className="mt-2 text-lg font-medium text-gray-900">Resume Not Parsed</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your resume hasn't been parsed yet. Check back after evaluation.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}