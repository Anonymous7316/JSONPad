// src/lib/mock-documents.ts

export interface JsonDocument {
  id: string;
  name: string;
  jsonContent: string;
  lastModified: string; // ISO date string
}

// Simulate a database or persistent storage
const mockDocumentsStore: Map<string, JsonDocument> = new Map([
  [
    "doc1",
    {
      id: "doc1",
      name: "Sample Configuration",
      jsonContent: JSON.stringify(
        {
          theme: "dark",
          fontSize: 14,
          settings: {
            autosave: true,
            linters: ["jsonlint"],
          },
        },
        null,
        2
      ),
      lastModified: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    },
  ],
  [
    "doc2",
    {
      id: "doc2",
      name: "User Profile Data",
      jsonContent: JSON.stringify(
        {
          userId: "user-123",
          username: "john_doe",
          email: "john.doe@example.com",
          preferences: {
            notifications: true,
            language: "en",
          },
        },
        null,
        2
      ),
      lastModified: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    },
  ],
  [
    "doc3",
    {
      id: "doc3",
      name: "Product Catalog Snippet",
      jsonContent: JSON.stringify(
        [
          { id: "prod-a", name: "Laptop", price: 1200 },
          { id: "prod-b", name: "Mouse", price: 25 },
        ],
        null,
        2
      ),
      lastModified: new Date().toISOString(), // Now
    },
  ],
    [
    "doc4",
    {
      id: "doc4",
      name: "Empty Document",
      jsonContent: JSON.stringify({}, null, 2),
      lastModified: new Date(Date.now() - 86400000 * 7).toISOString(), // 1 week ago
    },
  ],
]);

// API functions to interact with the mock store
export function getAllDocuments(): JsonDocument[] {
  // Return a new array to prevent direct mutation of the Map's values array
  return Array.from(mockDocumentsStore.values()).sort(
    (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

export function getDocumentById(id: string): JsonDocument | undefined {
  // Return a copy to prevent external mutation? For now, returning direct reference is fine for mock.
  return mockDocumentsStore.get(id);
}

// Simulate saving (updates or creates) - we don't use this yet but good for future
export function saveDocument(doc: Omit<JsonDocument, 'lastModified'> & { lastModified?: string }): JsonDocument {
  const now = new Date().toISOString();
  const docToSave: JsonDocument = {
    ...doc,
    lastModified: now,
  };
  mockDocumentsStore.set(doc.id, docToSave);
  // Return a copy to reflect that the saved data might be different (e.g., new lastModified)
  return { ...docToSave };
}

// Simulate creating a new document
export function createNewDocument(name: string = "Untitled Document", content: object = {}): JsonDocument {
    // Generate a more robust unique ID (though simple increment is fine for mock)
    const newId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newDoc: JsonDocument = {
        id: newId,
        name: name.trim() || "Untitled Document", // Ensure name is not empty
        jsonContent: JSON.stringify(content, null, 2),
        lastModified: new Date().toISOString(),
    };
    mockDocumentsStore.set(newId, newDoc);
    // Return a copy
    return { ...newDoc };
}

// Simulate deleting a document
export function deleteDocumentById(id: string): boolean {
  return mockDocumentsStore.delete(id);
}
