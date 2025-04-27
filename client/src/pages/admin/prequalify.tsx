import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  MapPinIcon,
  CheckIcon,
  XIcon,
  FilterIcon,
  RefreshCwIcon
} from "lucide-react";

type Resume = {
  id: number;
  fileName: string;
  candidateId: number | null;
  jobRoleId: number;
  parsedData: any;
  score: number | null;
  reasons: string | null;
  location: string;
  qualified: boolean;
  createdAt: string;
};

type JobRole = {
  id: number;
  title: string;
  keySkills: string[];
};

type LocationFilter = {
  type: 'country' | 'city' | 'remote';
  value: string;
};

export default function AdminPrequalify() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedJobRole, setSelectedJobRole] = useState<number | null>(null);
  const [locationFilters, setLocationFilters] = useState<LocationFilter[]>([]);
  const [newFilterValue, setNewFilterValue] = useState('');
  const [newFilterType, setNewFilterType] = useState<'country' | 'city' | 'remote'>('country');
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [checkedResumes, setCheckedResumes] = useState<number[]>([]);

  // Redirect to login if not authenticated or not an admin
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [user, loading, setLocation]);

  // Get job roles
  const { data: jobRoles } = useQuery<JobRole[]>({
    queryKey: ["/api/job-roles"],
  });

  console.log(selectedJobRole);

  // Get resumes filtered by job role
  const { data: resumes, isLoading: loadingResumes } = useQuery<Resume[]>({
    queryKey: [`/api/resumes`, selectedJobRole ? { jobRoleId: selectedJobRole, userId: user?.id, role: user?.role } : null],
    enabled: !!selectedJobRole,
  });

  // Mutation to qualify/disqualify a resume
  const qualifyResumeMutation = useMutation({
    mutationFn: async ({ resumeId, qualified }: { resumeId: number; qualified: boolean }) => {
      const response = await apiRequest("POST", `/api/resumes/${resumeId}/qualify`, { qualified });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/resumes`] });
      toast({
        title: "Status updated",
        description: "Candidate qualification status has been updated.",
      });
      setCheckedResumes([]);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message || "There was an error updating the qualification status.",
        variant: "destructive",
      });
    },
  });

  // Add a new location filter
  const addLocationFilter = () => {
    if (!newFilterValue.trim()) {
      toast({
        title: "Invalid filter",
        description: "Please enter a valid location filter value",
        variant: "destructive",
      });
      return;
    }

    setLocationFilters([...locationFilters, { type: newFilterType, value: newFilterValue.trim() }]);
    setNewFilterValue('');
  };

  // Remove a location filter
  const removeLocationFilter = (index: number) => {
    setLocationFilters(locationFilters.filter((_, i) => i !== index));
  };

  // Apply filters to resumes
  useEffect(() => {
    if (!resumes) {
      setFilteredResumes([]);
      return;
    }

    if (locationFilters.length === 0) {
      setFilteredResumes(resumes);
      return;
    }

    // Filter resumes by location
    const filtered = resumes.filter(resume => {
      const resumeLocation = resume.location || (resume.parsedData?.location || '').toLowerCase();
      
      return locationFilters.some(filter => {
        if (filter.type === 'remote' && filter.value.toLowerCase() === 'remote') {
          return resumeLocation.toLowerCase().includes('remote');
        } else if (filter.type === 'country') {
          return resumeLocation.toLowerCase().includes(filter.value.toLowerCase());
        } else if (filter.type === 'city') {
          return resumeLocation.toLowerCase().includes(filter.value.toLowerCase());
        }
        return false;
      });
    });

    setFilteredResumes(filtered);
  }, [resumes, locationFilters]);

  // Handle checkbox toggle
  const toggleResumeCheckbox = (resumeId: number) => {
    setCheckedResumes(prev => {
      if (prev.includes(resumeId)) {
        return prev.filter(id => id !== resumeId);
      } else {
        return [...prev, resumeId];
      }
    });
  };

  // Toggle all checkboxes
  const toggleAllCheckboxes = () => {
    if (checkedResumes.length === filteredResumes.length) {
      setCheckedResumes([]);
    } else {
      setCheckedResumes(filteredResumes.map(r => r.id));
    }
  };

  // Qualify selected resumes
  const qualifySelectedResumes = () => {
    if (checkedResumes.length === 0) {
      toast({
        title: "No resumes selected",
        description: "Please select at least one resume to qualify",
        variant: "destructive",
      });
      return;
    }

    const promises = checkedResumes.map(resumeId => 
      qualifyResumeMutation.mutate({ resumeId, qualified: true })
    );

    toast({
      title: "Processing qualification",
      description: `Qualifying ${checkedResumes.length} selected resumes...`,
    });
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null; // Will redirect due to useEffect
  }

  return (
    <MainLayout title="Pre-qualification">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Pre-qualification</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Location-Based Pre-qualification</CardTitle>
                <CardDescription>
                  Filter candidates by location criteria to pre-qualify them for the next stage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Job role selection */}
                  <div>
                    <Label htmlFor="job-role">Job Role</Label>
                    <select
                      id="job-role"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      value={selectedJobRole || ""}
                      onChange={(e) => setSelectedJobRole(Number(e.target.value) || null)}
                    >
                      <option value="">Select a job role</option>
                      {jobRoles?.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location filters */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Location Filters</Label>
                      {locationFilters.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setLocationFilters([])}
                        >
                          <RefreshCwIcon className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {locationFilters.map((filter, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="flex items-center gap-1 py-1.5"
                        >
                          <span>{filter.type}: {filter.value}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeLocationFilter(index)}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                      {locationFilters.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No location filters set. Add filters below.
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <select
                        className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        value={newFilterType}
                        onChange={(e) => setNewFilterType(e.target.value as any)}
                      >
                        <option value="country">Country</option>
                        <option value="city">City</option>
                        <option value="remote">Remote</option>
                      </select>
                      <Input 
                        placeholder={
                          newFilterType === 'country' ? "e.g. USA, Canada" : 
                          newFilterType === 'city' ? "e.g. New York, San Francisco" :
                          "Remote"
                        }
                        value={newFilterValue}
                        onChange={(e) => setNewFilterValue(e.target.value)}
                        className="flex-1"
                      />
                      <Button onClick={addLocationFilter}>
                        <FilterIcon className="h-4 w-4 mr-1" />
                        Add Filter
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Filtered Results */}
                  {selectedJobRole ? (
                    <>
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">
                          Filtered Candidates
                        </h3>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">
                            {filteredResumes.length} candidates match your filters
                          </div>
                          {filteredResumes.length > 0 && (
                            <Button
                              variant="default"
                              onClick={qualifySelectedResumes}
                              disabled={checkedResumes.length === 0 || qualifyResumeMutation.isPending}
                            >
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Qualify Selected
                            </Button>
                          )}
                        </div>
                      </div>

                      {loadingResumes ? (
                        <div className="text-center py-8 text-muted-foreground">
                          Loading candidates...
                        </div>
                      ) : filteredResumes.length > 0 ? (
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10">
                                  <Checkbox 
                                    checked={checkedResumes.length === filteredResumes.length && filteredResumes.length > 0}
                                    onCheckedChange={toggleAllCheckboxes}
                                  />
                                </TableHead>
                                <TableHead>Candidate</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredResumes.map((resume) => (
                                <TableRow key={resume.id}>
                                  <TableCell>
                                    <Checkbox 
                                      checked={checkedResumes.includes(resume.id)}
                                      onCheckedChange={() => toggleResumeCheckbox(resume.id)}
                                      disabled={resume.qualified}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {resume.parsedData?.name || "Unknown Candidate"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <MapPinIcon className="h-4 w-4 mr-1 text-muted-foreground" />
                                      {resume.location || (resume.parsedData?.location || "Unknown")}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {resume.score ? `${resume.score}%` : 'Not analyzed'}
                                  </TableCell>
                                  <TableCell>
                                    {resume.qualified ? (
                                      <Badge variant="outline" className="bg-green-50 text-green-700">
                                        Qualified
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                        Pending
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {!resume.qualified ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-green-600"
                                        onClick={() => qualifyResumeMutation.mutate({ resumeId: resume.id, qualified: true })}
                                      >
                                        <CheckIcon className="h-4 w-4 mr-1" />
                                        Qualify
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-red-600"
                                        onClick={() => qualifyResumeMutation.mutate({ resumeId: resume.id, qualified: false })}
                                      >
                                        <XIcon className="h-4 w-4 mr-1" />
                                        Disqualify
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-md bg-gray-50">
                          <MapPinIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
                          <p className="text-muted-foreground">No candidates match your location filters.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 border rounded-md bg-gray-50">
                      <p className="text-muted-foreground">Please select a job role to view candidates.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
