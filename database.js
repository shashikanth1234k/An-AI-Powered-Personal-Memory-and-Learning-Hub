// Local Database Service using localStorage
class LocalDatabase {
    constructor() {
        this.storageKey = 'second-brain-notes';
        this.notes = this.loadNotes();
    }

    // Load notes from localStorage
    loadNotes() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading notes from localStorage:', error);
            return [];
        }
    }

    // Save notes to localStorage
    saveNotes() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes to localStorage:', error);
        }
    }

    // Get all notes
    getAllNotes() {
        return this.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Create a new note
    createNote(note) {
        const newNote = {
            ...note,
            id: note.id || Date.now().toString(),
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString(),
            attachments: Array.isArray(note.attachments) ? note.attachments : []
        };
        this.notes.push(newNote);
        this.saveNotes();
        return newNote;
    }

    // Update a note
    updateNote(noteId, updates) {
        const index = this.notes.findIndex(note => note.id === noteId);
        if (index !== -1) {
            this.notes[index] = {
                ...this.notes[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveNotes();
            return this.notes[index];
        }
        return null;
    }

    // Delete a note
    deleteNote(noteId) {
        const index = this.notes.findIndex(note => note.id === noteId);
        if (index !== -1) {
            this.notes.splice(index, 1);
            this.saveNotes();
            return true;
        }
        return false;
    }

    // Search notes
    searchNotes(query) {
        const lowerQuery = query.toLowerCase();
        return this.notes.filter(note => 
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery)
        );
    }

    // Get note by ID
    getNoteById(noteId) {
        return this.notes.find(note => note.id === noteId);
    }

    // Clear all notes
    clearAllNotes() {
        this.notes = [];
        this.saveNotes();
    }

    // Export notes
    exportNotes() {
        const exportData = {
            version: "1.0",
            exportedAt: new Date().toISOString(),
            totalNotes: this.notes.length,
            notes: this.notes
        };
        return JSON.stringify(exportData, null, 2);
    }

    // Import notes
    importNotes(notesJson) {
        try {
            // Check if the content looks like a binary file
            if (notesJson.includes('PNG') || notesJson.includes('JFIF') || notesJson.includes('GIF') || 
                notesJson.includes('PDF') || notesJson.includes('DOC') || notesJson.includes('XLS')) {
                return { 
                    success: false, 
                    error: 'This appears to be a binary file (image, document, etc.). Please select a JSON file exported from this app or another note-taking application.' 
                };
            }
            
            // Check if content starts with common binary file signatures
            const firstChars = notesJson.substring(0, 10);
            if (firstChars.includes('\u0000') || firstChars.includes('\uFFFD') || 
                firstChars.match(/[^\x20-\x7E\s]/)) {
                return { 
                    success: false, 
                    error: 'This file appears to be binary or corrupted. Please select a valid JSON text file.' 
                };
            }
            
            const data = JSON.parse(notesJson);
            let notes = [];
            
            // Handle different import formats
            if (Array.isArray(data)) {
                notes = data;
            } else if (data.notes && Array.isArray(data.notes)) {
                // Handle object with notes array
                notes = data.notes;
            } else if (data.title && data.content) {
                // Handle single note object
                notes = [data];
            } else {
                console.error('Invalid import format: Expected array of notes or single note object');
                return { success: false, error: 'Invalid file format. Expected a JSON file with notes array or single note object.' };
            }
            
            // Validate and clean notes
            const validNotes = notes.filter(note => {
                return note && 
                       typeof note === 'object' && 
                       (note.title || note.content) && // At least title or content
                       typeof note.title === 'string' && 
                       typeof note.content === 'string';
            }).map(note => ({
                id: note.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                title: note.title || 'Untitled Note',
                content: note.content || '',
                createdAt: note.createdAt || new Date().toISOString(),
                updatedAt: note.updatedAt || new Date().toISOString(),
                attachments: Array.isArray(note.attachments)
                    ? note.attachments.filter(a => a && typeof a === 'object' && typeof a.dataUrl === 'string').map(a => ({
                        id: a.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: a.name || 'image',
                        type: a.type || 'image/*',
                        size: a.size || 0,
                        dataUrl: a.dataUrl,
                        createdAt: a.createdAt || new Date().toISOString()
                    }))
                    : []
            }));
            
            if (validNotes.length === 0) {
                return { success: false, error: 'No valid notes found in the file. Each note must have at least a title or content.' };
            }
            
            // Merge with existing notes (don't replace all)
            this.notes = [...this.notes, ...validNotes];
            this.saveNotes();
            
            return { 
                success: true, 
                imported: validNotes.length, 
                skipped: notes.length - validNotes.length 
            };
        } catch (error) {
            console.error('Error importing notes:', error);
            
            // Provide more specific error messages
            if (error.message.includes('Unexpected token')) {
                return { 
                    success: false, 
                    error: 'Invalid JSON format. The file may be corrupted or not a valid JSON file. Please try exporting from this app first to see the correct format.' 
                };
            } else if (error.message.includes('JSON')) {
                return { 
                    success: false, 
                    error: `JSON parsing error: ${error.message}. Please check that the file is a valid JSON file.` 
                };
            } else {
                return { 
                    success: false, 
                    error: `Failed to import notes: ${error.message}` 
                };
            }
        }
    }
}

// Create and export a singleton instance
const localDatabase = new LocalDatabase();
export default localDatabase; 