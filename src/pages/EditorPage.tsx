// src/pages/EditorPage.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from '@/components/theme-provider';
import Editor, { Monaco } from '@monaco-editor/react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Save, Link as LinkIcon, CircleX, CircleCheck, Settings2, Pencil, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSearchParams, useNavigate, Link } from 'react-router-dom'; // Use React Router hooks
import { getDocumentById, saveDocument, createNewDocument, JsonDocument } from '@/lib/mock-documents';
import jsonlint from 'jsonlint-mod';
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


interface LintError {
  line: number;
  message: string;
}

// No need for Suspense wrapper here as useSearchParams doesn't suspend in React Router v6
export default function EditorPage() {
  const [searchParams] = useSearchParams(); // Use React Router's useSearchParams
  const navigate = useNavigate(); // Use React Router's useNavigate

  const [jsonInput, setJsonInput] = useState<string>('');
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  // isClient state is not typically needed in Vite React apps like in Next.js SSR
  const [documentName, setDocumentName] = useState<string>("Untitled Document");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState<boolean>(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  const { toast } = useToast();
  const { resolvedTheme } = useTheme(); // Use the custom useTheme

  useEffect(() => {
    const docId = searchParams.get('docId');
    let initialContent = '{\n  "example": "Hello, World!",\n  "value": 123\n}';
    let initialName = "Untitled Document";
    let currentDocId: string | null = null;

    if (docId) {
      const doc = getDocumentById(docId);
      if (doc) {
        initialContent = doc.jsonContent;
        initialName = doc.name;
        currentDocId = doc.id;
      } else {
        toast({
          variant: "destructive",
          title: "Document Not Found",
          description: `Could not find document with ID: ${docId}. Loading default.`,
        });
        currentDocId = null;
        // Clear docId from URL if not found
        navigate('/', { replace: true });
      }
    } else {
       currentDocId = null;
    }

    setJsonInput(initialContent);
    setDocumentName(initialName);
    setDocumentId(currentDocId);
    setHasUnsavedChanges(false);
  }, [searchParams, toast, navigate]); // Add navigate dependency


  const lintJson = useCallback((input: string) => {
    if (!input.trim()) {
      setLintErrors([]);
      setIsValidJson(true);
      return;
    }

    try {
      jsonlint.parse(input);
      setLintErrors([]);
      setIsValidJson(true);
    } catch (e: any) {
      const errorMatch = e.message.match(/Parse error on line (\d+):\n?(.*)/s);
      if (errorMatch) {
        const [, line, details] = errorMatch;
        const firstLineOfDetails = details.trim().split('\n')[0];
        let simpleMessage = firstLineOfDetails;

        if (details.includes('Expecting') && (details.includes(', got') || details.includes('Instead, saw'))) {
           const expectingMatch = details.match(/Expecting (.*?)(?:, got|, while parsing|Instead, saw)/);
            if (expectingMatch) simpleMessage = `Expected ${expectingMatch[1].replace(/'/g, '').replace(/, OR/, ' or')}`;
        } else if (details.includes('Unrecognized text')) {
            const unexpectedMatch = details.match(/Unrecognized text.*? '(.*?)'/);
             if (unexpectedMatch) simpleMessage = `Unexpected token '${unexpectedMatch[1]}'`;
             else simpleMessage = 'Unrecognized text.'
        } else if (details.includes('EOF')) {
            simpleMessage = 'Unexpected end of input.';
        } else if (details.includes('invalid string') || details.includes('Bad string')) {
             simpleMessage = 'Invalid string format (check quotes and escapes).';
        } else if (details.includes('invalid number') || details.includes('Bad number')) {
             simpleMessage = 'Invalid number format.';
        } else if (details.includes('multiple JSON') ){
             simpleMessage = 'Multiple JSON root elements.';
        } else if (details.includes('Bad value')) {
             simpleMessage = 'Invalid value (e.g., undefined, NaN).';
        } else {
             simpleMessage = firstLineOfDetails.length > 50 ? 'Syntax error.' : firstLineOfDetails;
        }

        setLintErrors([{ line: parseInt(line, 10), message: simpleMessage }]);
      } else if (e.message.includes('Unexpected EOF')) {
        const lines = input.trimEnd().split('\n');
        setLintErrors([{ line: lines.length, message: 'Unexpected end of input.' }]);
      } else {
        console.warn("Could not parse jsonlint error format:", e.message);
        setLintErrors([{ line: -1, message: `Invalid JSON: ${e.message}` }]);
      }
      setIsValidJson(false);
    }
  }, []);


  useEffect(() => {
    lintJson(jsonInput);
  }, [jsonInput, lintJson]);


  const handleEditorChange = (value: string | undefined) => {
    setJsonInput(value || '');
    setHasUnsavedChanges(true);
  };

  const formatJson = useCallback(() => {
     if (!jsonInput.trim()) {
        toast({
            variant: "destructive",
            title: "Formatting Error",
            description: "Cannot format empty input.",
        });
        return;
    }

    try {
        const parsed = jsonlint.parse(jsonInput);
        const formatted = JSON.stringify(parsed, null, 2);

        if (editorRef.current) {
            const model = editorRef.current.getModel();
            if (model) {
                 editorRef.current.executeEdits('formatter', [{
                    range: model.getFullModelRange(),
                    text: formatted,
                }]);
                 // Monaco might re-trigger onChange, or might not, explicitly update state and lint
                 setJsonInput(formatted);
                 lintJson(formatted);
                 setHasUnsavedChanges(true);
            } else {
                 setJsonInput(formatted);
                 setHasUnsavedChanges(true);
            }
        } else {
             setJsonInput(formatted);
             setHasUnsavedChanges(true);
        }

        toast({
            title: "JSON Formatted",
            description: "The JSON content has been successfully formatted.",
        });
    } catch (e) {
        toast({
            variant: "destructive",
            title: "Formatting Error",
            description: "Cannot format invalid JSON. Please fix errors first.",
        });
        lintJson(jsonInput);
    }
  }, [jsonInput, toast, lintJson]);

   const copyJsonLink = useCallback(async () => {
      if (!jsonInput.trim()) {
         toast({
            variant: "destructive",
            title: "Copy Link Failed",
            description: "Cannot copy link for empty content.",
         });
         return;
      }
      if (hasUnsavedChanges || !documentId) {
         toast({
            variant: "destructive",
            title: hasUnsavedChanges ? "Unsaved Changes" : "Document Not Saved",
            description: "Please save your document before copying the link.",
         });
         return;
      }

      try {
         // Validate JSON before attempting to copy
         // This will throw an error if the JSON is invalid
         // So no need for an extra try catch below
         jsonlint.parse(jsonInput);
         // Construct URL for the view page using React Router's path format
         const urlToCopy = `${window.location.origin}/view?docId=${documentId}`;
          // Create a temporary textarea element
          const tempTextArea = document.createElement('textarea');
          tempTextArea.value = urlToCopy;
          // Append it to the DOM
          document.body.appendChild(tempTextArea);
          // Select the text
          tempTextArea.select();
          tempTextArea.setSelectionRange(0, 99999); // For mobile devices
          // Copy the text
          document.execCommand('copy');
          // Remove the textarea
          document.body.removeChild(tempTextArea);
          
          toast({
            title: "Link Copied",
            description: "A shareable link to view this document has been copied.",
          });
      } catch (e: any) {
           console.error("Failed to copy link:", e);
           toast({
             variant: "destructive",
             title: "Copy Link Failed",
             description: "Could not copy the link to the clipboard.",
           });
           toast({
               variant: "destructive",
               title: "Copy Link Failed",
               description: "Cannot create link for invalid JSON. Please fix errors first.",
           });
           lintJson(jsonInput);
      } }, [jsonInput, documentId, hasUnsavedChanges, toast, lintJson]);

   const saveJson = (): boolean => {
     try {
        if (!jsonInput.trim()) {
             toast({
                 variant: "destructive",
                 title: "Save Failed",
                 description: "Cannot save empty content.",
             });
             return false;
        }
        jsonlint.parse(jsonInput);

        let docToSave: Omit<JsonDocument, 'lastModified'>;
        let isNewDoc = false;

        if (documentId) {
            docToSave = { id: documentId, name: documentName, jsonContent: jsonInput };
        } else {
            isNewDoc = true;
            const newDoc = createNewDocument(documentName, JSON.parse(jsonInput));
            docToSave = newDoc;
            setDocumentId(newDoc.id);
            // Update URL using React Router's navigate function
             navigate(`/?docId=${newDoc.id}`, { replace: true }); // Use replace to avoid back button issues
        }

        // const savedDoc = saveDocument(docToSave);
        // setDocumentName(savedDoc.name);

        setHasUnsavedChanges(false);
        toast({
            title: `"${docToSave.name}" Saved`,
            description: `Your document ${isNewDoc ? 'created and' : ''} saved successfully.`,
        });
        return true;
     } catch (e) {
         toast({
             variant: "destructive",
             title: "Save Failed",
             description: "Cannot save invalid JSON. Please fix the errors first.",
         });
          lintJson(jsonInput);
          return false;
     }
   };

   const handleNavigateToDashboard = (e: React.MouseEvent<HTMLButtonElement>) => {
       if (hasUnsavedChanges) {
           e.preventDefault();
           setShowUnsavedDialog(true);
       } else {
           navigate('/dashboard'); // Use React Router's navigate
       }
   };

   const handleDialogSave = () => {
       const saveSuccessful = saveJson();
       if (saveSuccessful) {
           setShowUnsavedDialog(false);
           navigate('/dashboard'); // Navigate after successful save
       }
   };

   const handleDialogDiscard = () => {
       setShowUnsavedDialog(false);
       setHasUnsavedChanges(false);
       navigate('/dashboard'); // Navigate, discarding changes
   };

   const handleDialogCancel = () => {
       setShowUnsavedDialog(false);
   };


   const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       setDocumentName(event.target.value);
       setHasUnsavedChanges(true);
   };

   const handleNameEditBlur = () => {
       if (!documentName.trim()) {
           setDocumentName("Untitled Document");
       }
       setIsEditingName(false);
   };

   const handleNameEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
       if (event.key === 'Enter') {
           handleNameEditBlur();
       } else if (event.key === 'Escape') {
           if (nameInputRef.current) {
               nameInputRef.current.blur();
           }
       }
   };

   const startEditingName = () => {
       setIsEditingName(true);
       setTimeout(() => nameInputRef.current?.focus(), 0);
   };


  const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';

  function handleEditorDidMount(editor: any, monaco: Monaco) {
    editorRef.current = editor;
     monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
         validate: true,
         schemas: [],
         enableSchemaRequest: true,
     });
  }

  // No loading state needed as in Next.js SSR

  return (
    <TooltipProvider>
    <div className="flex flex-col h-screen bg-background text-foreground p-4 font-mono">
       <header className="flex justify-between items-center mb-4 pb-4 border-b">
         <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
             <Tooltip>
                <TooltipTrigger asChild>
                    {/* Button for dashboard navigation */}
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Go to Dashboard" onClick={handleNavigateToDashboard}>
                        <LayoutGrid className="h-5 w-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Back to Dashboard</p>
                </TooltipContent>
            </Tooltip>
           {isEditingName ? (
             <Input
               ref={nameInputRef}
               type="text"
               value={documentName}
               onChange={handleNameChange}
               onBlur={handleNameEditBlur}
               onKeyDown={handleNameEditKeyDown}
               className="text-2xl font-semibold font-sans h-9 px-2 flex-1 min-w-[150px] border-primary ring-primary focus-visible:ring-primary"
               aria-label="Document Name"
             />
           ) : (
             <div className="flex items-center gap-2 cursor-text group" onClick={startEditingName}>
               <h1 className="text-2xl font-semibold font-sans truncate group-hover:underline" title={documentName}>
                 {documentName}
                 {hasUnsavedChanges && <span className="text-muted-foreground text-xl ml-1 font-normal">*</span>}
               </h1>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit document name">
                     <Pencil className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Edit Name</p>
                 </TooltipContent>
               </Tooltip>
             </div>
           )}
         </div>

        <div className="flex items-center gap-2">
           <ThemeToggle />
           <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={formatJson} title="Format JSON (Pretty Print)" disabled={!jsonInput.trim()}>
                         <Settings2 />
                         <span className="hidden sm:inline ml-2">Format</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Format JSON</p></TooltipContent>
           </Tooltip>
           <Tooltip>
                 <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyJsonLink}
                      title={hasUnsavedChanges || !documentId ? "Save document to enable Copy Link" : "Copy shareable link"}
                      disabled={!jsonInput.trim() || hasUnsavedChanges || !documentId}
                      aria-disabled={hasUnsavedChanges || !documentId}
                    >
                         <LinkIcon />
                         <span className="hidden sm:inline ml-2">Copy Link</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    {hasUnsavedChanges || !documentId ? <p>Save document to enable Copy Link</p> : <p>Copy shareable link</p>}
                </TooltipContent>
           </Tooltip>
           <Tooltip>
               <TooltipTrigger asChild>
                    <Button
                        size="sm"
                        onClick={saveJson}
                        title="Save JSON"
                        disabled={!hasUnsavedChanges}
                        variant={hasUnsavedChanges ? "default" : "secondary"}
                        >
                        <Save className={hasUnsavedChanges ? "animate-pulse" : ""} />
                        <span className="hidden sm:inline ml-2">Save</span>
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Save JSON</p></TooltipContent>
            </Tooltip>
         </div>
       </header>

      <div className="flex flex-1 gap-4 overflow-hidden">
        <Card className="flex-1 flex flex-col shadow-md overflow-hidden">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="font-sans text-base">JSON Editor</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
              <Editor
                height="100%"
                language="json"
                theme={monacoTheme}
                value={jsonInput}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: true },
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: "on",
                  automaticLayout: true,
                  readOnly: false,
                  contextmenu: true,
                  tabSize: 2,
                  insertSpaces: true,
                  renderWhitespace: "boundary",
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  bracketPairColorization: { enabled: true },
                }}
                className="absolute inset-0"
              />
          </CardContent>
        </Card>

        <Card className="w-1/3 flex flex-col shadow-md max-w-sm">
          <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="font-sans text-base flex items-center gap-2">
               Linting Status
               {isValidJson ? (
                 <CircleCheck className="w-4 h-4 text-green-500" />
               ) : (
                 <CircleX className="w-4 h-4 text-destructive" />
               )}
             </CardTitle>
          </CardHeader>
          <Separator />
           <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full p-4">
             {lintErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                   <CircleCheck className="w-8 h-8 mb-2 text-green-500" />
                   <p className="font-sans text-sm">No linting errors found.</p>
                   <p className="font-sans text-xs mt-1">
                     {jsonInput.trim() ? "JSON appears valid!" : "Enter JSON to validate."}
                   </p>
                 </div>
              ) : (
                <ul className="space-y-2">
                  {lintErrors.map((error, index) => (
                    <li key={index} className="text-destructive text-xs p-2 border border-destructive/30 rounded-md bg-destructive/10 flex items-start gap-1.5">
                       <CircleX className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                       <span>
                         {error.line > 0 ? `Line ${error.line}: ` : ''}
                         {error.message}
                       </span>
                     </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
           <CardFooter className="p-3 border-t">
             <p className="text-xs text-muted-foreground font-sans">
               Real-time JSON validation.
             </p>
           </CardFooter>
        </Card>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Would you like to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogCancel}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDialogDiscard}>Discard Changes</Button>
            <AlertDialogAction onClick={handleDialogSave}>Save & Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
    </TooltipProvider>
  );
}
