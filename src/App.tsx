import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider'; // Assuming you create this
import EditorPage from '@/pages/EditorPage';
import DashboardPage from '@/pages/DashboardPage';
import ViewPage from '@/pages/ViewPage';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <Router>
        {/* Suspense for lazy loading pages if needed in the future */}
        <Suspense fallback={
            <div className="flex flex-col h-screen bg-background text-foreground p-4 items-center justify-center">
                <p>Loading...</p>
            </div>
        }>
          <Routes>
            <Route path="/" element={<EditorPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/view" element={<ViewPage />} />
             {/* Add a fallback route if needed */}
             <Route path="*" element={
                <div className="flex flex-col h-screen bg-background text-foreground p-4 items-center justify-center">
                    <h1 className="text-2xl font-semibold">404 - Not Found</h1>
                </div>
             } />
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
