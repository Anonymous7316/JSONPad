// src/pages/DashboardPage.tsx
import React, { useState, useMemo, useEffect } from 'react'; // Import useEffect
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input component
import { FileJson, PlusCircle, Edit, Search, Trash2 } from 'lucide-react'; // Import Search and Trash2 icons
import { getAllDocuments, deleteDocumentById, JsonDocument } from '@/lib/mock-documents'; // Import deleteDocumentById and JsonDocument type
import { formatDistanceToNow } from 'date-fns';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components
import { useToast } from '@/hooks/use-toast'; // Import useToast

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<JsonDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // State for the search query
  const [documentToDelete, setDocumentToDelete] = useState<JsonDocument | null>(null); // State for delete confirmation

  // Load documents on initial mount
  useEffect(() => {
    setDocuments(getAllDocuments());
  }, []);

  const handleCreateNew = () => {
    navigate('/');
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Filter documents based on the search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) {
      return documents;
    }
    return documents.filter(doc =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  const handleDeleteClick = (doc: JsonDocument) => {
    setDocumentToDelete(doc);
  };

  const handleConfirmDelete = () => {
    if (documentToDelete) {
      const deleted = deleteDocumentById(documentToDelete.id);
      if (deleted) {
        // Update the documents state to reflect the deletion
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentToDelete.id));
        toast({
          title: "Document Deleted",
          description: `"${documentToDelete.name}" has been successfully deleted.`,
        });
      } else {
         toast({
           variant: "destructive",
           title: "Deletion Failed",
           description: `Could not delete "${documentToDelete.name}".`,
         });
      }
      setDocumentToDelete(null); // Close the dialog
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex-grow pb-24"> {/* Add padding-bottom to account for fixed footer */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b gap-4 sm:gap-0">
          <h1 className="text-3xl font-semibold font-sans flex items-center gap-2">
            <FileJson className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-0.5" />JSONPad{/*My JSON Documents*/}
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
             {/* Search Input */}
             <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 w-full" // Add padding for the icon
              />
             </div>
             <ThemeToggle />
             <Button onClick={handleCreateNew}>
               <PlusCircle className="mr-2 h-4 w-4" /> Create New
             </Button>
          </div>
        </header>

        <main>
          {documents.length === 0 ? ( // Check documents length for the initial empty state
            <div className="text-center text-muted-foreground mt-10">
              <FileJson className="mx-auto h-12 w-12 mb-4" />
              <p>No documents yet.</p>
              <Button onClick={handleCreateNew} className="mt-4">
                Create your first document
              </Button>
            </div>
          ) : filteredDocuments.length === 0 ? ( // Check filtered documents length for no search results
             <div className="text-center text-muted-foreground mt-10">
               <Search className="mx-auto h-12 w-12 mb-4" />
               <p>No documents found matching "{searchQuery}".</p>
               <Button variant="outline" onClick={() => setSearchQuery('')} className="mt-4">
                 Clear Search
               </Button>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="flex flex-col hover:shadow-lg transition-shadow duration-200">
                  <CardHeader className="pb-3">
                     <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-lg font-sans font-medium leading-tight truncate flex-1" title={doc.name}>
                          {doc.name}
                        </CardTitle>
                         <FileJson className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                     </div>
                    <CardDescription className="text-xs pt-1">
                      Last modified: {formatDistanceToNow(new Date(doc.lastModified), { addSuffix: true })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-end pt-2">
                     <div className="mt-auto flex gap-2">
                         {/* Use React Router Link component */}
                         <Link to={`/?docId=${doc.id}`} className="flex-1">
                           <Button variant="outline" size="sm" className="w-full">
                              <Edit className="mr-2 h-3.5 w-3.5" />
                              Open
                           </Button>
                         </Link>
                         <Button
                           variant="destructive"
                           size="icon"
                           className="h-9 w-9 flex-shrink-0"
                           onClick={() => handleDeleteClick(doc)}
                           title={`Delete "${doc.name}"`}
                         >
                           <Trash2 className="h-4 w-4" />
                         </Button>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div> {/* Close flex-grow container */}

       <footer className="fixed bottom-0 left-0 w-full py-4 border-t text-center text-sm text-muted-foreground font-sans bg-background">
         <p>JSON Formatter & Editor</p>
       </footer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the document
              "<span className="font-medium">{documentToDelete?.name}</span>".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
