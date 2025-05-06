// src/pages/DashboardPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileJson, PlusCircle, Edit, Search, Trash2, ImagePlus, FilePlus2 } from 'lucide-react';
import { getAllDocuments, deleteDocumentById, JsonDocument } from '@/lib/mock-documents';
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
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageUploadDialog } from '@/components/ImageUploadDialog'; // Import the new dialog

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<JsonDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<JsonDocument | null>(null);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false);


  useEffect(() => {
    setDocuments(getAllDocuments());
  }, []);

  const handleCreateNewBlank = () => {
    navigate('/');
  };

  const handleCreateFromImages = () => {
    setIsImageUploadDialogOpen(true);
  };
  
  const handleDocumentCreatedFromImages = (documentId: string) => {
    setDocuments(getAllDocuments()); // Refresh document list
    navigate(`/?docId=${documentId}`); // Navigate to the new document in the editor
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

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
      setDocumentToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="p-4 sm:p-6 lg:p-8 flex-grow pb-24">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b gap-4 sm:gap-0">
          <h1 className="text-3xl font-semibold font-sans flex items-center gap-2">
            <FileJson className="h-8 w-8 text-muted-foreground flex-shrink-0 mt-0.5" />JSONPad{/*My JSON Documents*/}
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
             <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 w-full"
              />
             </div>
             <ThemeToggle />
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCreateNewBlank}>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    Blank Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCreateFromImages}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    From Images
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>

        <main>
          {documents.length === 0 ? (
            <div className="text-center text-muted-foreground mt-10">
              <FileJson className="mx-auto h-12 w-12 mb-4" />
              <p>No documents yet.</p>
              {/* Removed the single create button, users will use the dropdown */}
            </div>
          ) : filteredDocuments.length === 0 ? (
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
      </div>

       <footer className="fixed bottom-0 left-0 w-full py-4 border-t text-center text-sm text-muted-foreground font-sans bg-background">
         <p>JSONPad - Formatter & Editor</p>
       </footer>

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

      <ImageUploadDialog
        open={isImageUploadDialogOpen}
        onOpenChange={setIsImageUploadDialogOpen}
        onDocumentCreated={handleDocumentCreatedFromImages}
      />
    </div>
  );
}
