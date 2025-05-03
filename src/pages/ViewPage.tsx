
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom'; // Use React Router's useSearchParams
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, CircleCheck, CircleX, FileJson } from 'lucide-react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useTheme } from '@/components/theme-provider'; // Use custom theme provider
import jsonlint from 'jsonlint-mod';
import { getDocumentById, JsonDocument } from '@/lib/mock-documents';

interface LintError {
  line: number;
  message: string;
}

// No Suspense needed here for React Router v6 useSearchParams
export default function ViewPage() {
  const [searchParams] = useSearchParams();
  const [document, setDocument] = useState<JsonDocument | null>(null);
  const [jsonData, setJsonData] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [isValidJson, setIsValidJson] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { resolvedTheme } = useTheme(); // Use custom theme hook
  const editorRef = useRef<any>(null);

    useEffect(() => {
        setIsLoading(true);
        setError(null); // Reset error on new searchParams
        setDocument(null);
        setJsonData('');
        setIsValidJson(true);
        setLintErrors([]);

        const docId = searchParams.get('docId');
        if (docId) {
            const fetchedDoc = getDocumentById(docId);
            if (fetchedDoc) {
                setDocument(fetchedDoc);
                try {
                    const parsed = jsonlint.parse(fetchedDoc.jsonContent);
                    const formatted = JSON.stringify(parsed, null, 2);
                    setJsonData(formatted);
                    setIsValidJson(true);
                } catch (parseError) {
                    setJsonData(fetchedDoc.jsonContent);
                    setError('The stored JSON data is invalid and could not be formatted.');
                    setIsValidJson(false);
                }
            } else {
                setError(`Document with ID "${docId}" not found.`);
                setIsValidJson(false);
            }
        } else {
            setError('No document ID specified in the URL.');
            setIsValidJson(false);
        }

        setIsLoading(false);
    }, [searchParams]);


    const lintJson = useCallback((input: string) => {
    if (!input?.trim()) {
      setLintErrors([]);
      return ;
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
            let simpleMessage = `Syntax error: ${firstLineOfDetails}`;

            if (details.includes('Expecting')) {
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
            }

            setLintErrors([{ line: parseInt(line, 10), message: simpleMessage }]);
         } else if (e.message.includes('Unexpected EOF')) {
            const lines = input.trimEnd().split('\n');
            setLintErrors([{ line: lines.length, message: 'Unexpected end of input.' }]);
        } else {
            console.warn("Could not parse jsonlint error format on view page:", e.message);
            setLintErrors([{ line: -1, message: `Invalid JSON structure: ${e.message}` }]);
        }
        setIsValidJson(false);
    }
    }, []);


    useEffect(() => {
    lintJson(jsonData);
    }, [jsonData, lintJson]);


    const monacoTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light';

    function handleEditorDidMount(editor: any, monaco: Monaco) {
    editorRef.current = editor;
 }

  if (isLoading) {
    return (
        <div className="flex flex-col h-screen bg-background text-foreground p-4 items-center justify-center">
            <p>Loading Document...</p>
        </div>
    );
  }

  if (error && !document) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Document</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 h-screen flex flex-col">
       <h1 className="text-2xl font-semibold font-sans mb-4 flex items-center gap-2">
           <FileJson className="h-6 w-6 text-muted-foreground" />
         View: <span className="truncate" title={document?.name}>{document?.name || '...'}</span>
       </h1>
       {error && document && (
         <Alert variant="default" className="mb-4">
           <Terminal className="h-4 w-4" />
           <AlertTitle>JSON Formatting Issue</AlertTitle>
           <AlertDescription>{error} Displaying raw content.</AlertDescription>
         </Alert>
       )}
      <Card className="flex-1 flex flex-col shadow-md overflow-hidden">
         <CardHeader className="py-3 px-4 border-b">
            <CardTitle className="font-sans text-base flex items-center gap-2">
               JSON Viewer
               {isValidJson ? (
                 <CircleCheck className="w-4 h-4 text-green-500" />
               ) : (
                 <CircleX className="w-4 h-4 text-destructive" />
               )}
            </CardTitle>
          </CardHeader>
        <CardContent className="flex-1 p-0 relative">
           <Editor
               height="100%"
               language="json"
               theme={monacoTheme}
               value={jsonData}
               onMount={handleEditorDidMount}
               options={{
                 minimap: { enabled: true },
                 lineNumbers: 'on',
                 scrollBeyondLastLine: false,
                 fontSize: 14,
                 wordWrap: 'on',
                 automaticLayout: true,
                 readOnly: true,
                 contextmenu: false,
                 domReadOnly: true,
                 renderWhitespace: 'boundary',
                 bracketPairColorization: { enabled: true },
                 smoothScrolling: true,
               }}
               className="absolute inset-0"
             />
        </CardContent>
      </Card>
       {lintErrors.length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Linting Errors Found in Content</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 text-xs">
                  {lintErrors.map((err, index) => (
                    <li key={index}>
                     {err.line > 0 ? `Line ${err.line}: ` : ''} {err.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
        )}
    </div>
  );
}
