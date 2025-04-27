import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "candidate";
  location?: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
    const [, setLocation] = useLocation();
  

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Error checking auth:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        toast({
          title: "Login successful",
          description: `Welcome back, ${data.user.name}!`,
        });
        
        return data.user;
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Invalid email or password");
      toast({
        title: "Login failed",
        description: err.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Register function
  const register = useCallback(async (
    name: string, 
    email: string, 
    password: string, 
    role: "admin" | "candidate", 
    location?: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("POST", "/api/auth/register", { 
        name, 
        email, 
        password, 
        role, 
        location 
      });
      
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        toast({
          title: "Registration successful",
          description: `Welcome, ${data.user.name}!`,
        });
        
        return data.user;
      }
    } catch (err: any) {
      console.error("Registration failed:", err);
      setError(err.message || "Registration failed. Please try a different email address.");
      toast({
        title: "Registration failed",
        description: err.message || "Registration failed. Please try a different email address.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem("user");
    setUser(null);
    
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
    setLocation('/')
  }, [toast]);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout
  };
}
