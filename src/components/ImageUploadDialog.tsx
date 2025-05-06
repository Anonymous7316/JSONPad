
import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { createNewDocument } from '@/lib/mock-documents';
import { UploadCloud, FileImage, XCircle, Loader2 } from 'lucide-react';

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentCreated: (documentId: string) => void;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function ImageUploadDialog({ open, onOpenChange, onDocumentCreated }: ImageUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Clear files when the dialog is closed
  useEffect(() => {
    if (!open) {
      setFiles([]);
    }
  }, [open]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (files.length + acceptedFiles.length > MAX_FILES) {
      toast({
        variant: 'destructive',
        title: 'Too many files',
        description: `You can upload a maximum of ${MAX_FILES} images.`,
      });
      return;
    }

    const newFiles = acceptedFiles.filter(file => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: `${file.name} is larger than ${MAX_FILE_SIZE_MB}MB.`,
        });
        return false;
      }
      return true;
    });

    setFiles(prevFiles => [...prevFiles, ...newFiles].slice(0, MAX_FILES));

    if (fileRejections.length > 0) {
      fileRejections.forEach((rejection: any) => {
        rejection.errors.forEach((error: any) => {
          if (error.code === 'file-too-large') {
            // Already handled above
          } else if (error.code === 'file-invalid-type') {
             toast({
               variant: 'destructive',
               title: 'Invalid File Type',
               description: `${rejection.file.name}: ${error.message}. Only images are allowed.`,
             });
          } else {
            toast({
              variant: 'destructive',
              title: 'File Upload Error',
              description: `${rejection.file.name}: ${error.message}`,
            });
          }
        });
      });
    }
  }, [toast, files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/gif': [],
      'image/webp': [],
      'image/svg+xml': [],
    },
    multiple: true,
    maxSize: MAX_FILE_SIZE_BYTES,
  });

  const removeFile = (fileName: string) => {
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const handleCreateDocument = async () => {
    if (files.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Images Selected',
        description: 'Please upload at least one image to create a document.',
      });
      return;
    }

    setIsCreating(true);
    const imageJson: { [key: string]: string } = {};

    try {
      await Promise.all(
        files.map((file) => {
          return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataURL = reader.result as string;
              // Store the full data URL (e.g., "data:image/png;base64,iVBORw...")
              imageJson[file.name] = dataURL;
              resolve();
            };
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(file); // Read as Data URL
          });
        })
      );

      const docName = `Document from ${files.length} Image${files.length > 1 ? 's' : ''}`;
      const newDoc = createNewDocument(docName, imageJson);
      
      toast({
        title: 'Document Created',
        description: `"${newDoc.name}" created successfully with image data URLs.`,
      });
      onDocumentCreated(newDoc.id);
      // Files will be cleared by useEffect when `open` becomes false via `onOpenChange(false)`
      onOpenChange(false); // Close dialog
    } catch (error) {
      console.error('Error creating document from images:', error);
      toast({
        variant: 'destructive',
        title: 'Creation Failed',
        description: 'Could not create document from images. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create JSON Document from Images (Data URLs)</DialogTitle>
          <DialogDescription>
            Upload images to generate a JSON document with their full data URLs (e.g., data:image/png;base64,...). Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            {...getRootProps()}
            className={`p-6 border-2 border-dashed rounded-md cursor-pointer text-center transition-colors
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50 hover:border-primary'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            {isDragActive ? (
              <p>Drop the images here ...</p>
            ) : (
              <p>Drag 'n' drop some images here, or click to select files</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Supported: JPG, PNG, GIF, WEBP, SVG</p>
          </div>

          {files.length > 0 && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Selected Files ({files.length}/{MAX_FILES}):</h4>
              <ScrollArea className="h-[150px] border rounded-md p-2">
                <ul className="space-y-1">
                  {files.map(file => (
                    <li key={file.name} className="flex items-center justify-between text-sm p-1.5 bg-muted/50 rounded">
                      <div className="flex items-center gap-2 truncate">
                        <FileImage className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent dropzone click
                          removeFile(file.name);
                        }}
                        aria-label={`Remove ${file.name}`}
                      >
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            // Files will be cleared by useEffect when `open` becomes false via `onOpenChange(false)`
            onOpenChange(false);
          }} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreateDocument} disabled={files.length === 0 || isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Document'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

