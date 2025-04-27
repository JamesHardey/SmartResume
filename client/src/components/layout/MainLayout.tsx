import { useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* Sidebar for larger screens */}
      <Sidebar sidebarOpen={sidebarOpen} />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          title={title}
        />
        
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="container mx-auto px-2 sm:px-4 py-4 h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
