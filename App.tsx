import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from "./src/components/ui/toaster.tsx";
import { ThemeProvider } from './src/components/theme-provider.tsx'; // Assuming you create this
import EditorPage from './src/pages/EditorPage.tsx';
import DashboardPage from './src/pages/DashboardPage.tsx';
import ViewPage from './src/pages/ViewPage.tsx';

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
