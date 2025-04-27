export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string | null;
}

export interface JobRole {
  id: number;
  title: string;
  description: string;
  createdAt: string | null;
} 