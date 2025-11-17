import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, BrainCircuit, Search, Loader, X, Sparkles, Bot, CheckSquare, Link as LinkIcon, Download, Upload, Key as KeyIcon } from 'lucide-react';
import localDatabase from './src/database';

// --- Gemini API Helper ---
const callGeminiAPI = async (prompt) => {
    // Prefer env var, then localStorage, else ask user once
    let apiKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || localStorage.getItem('gemini_api_key') || '';
    if (!apiKey) {
        const entered = window.prompt('Enter your Gemini API key to enable AI features:');
        if (entered && entered.trim()) {
            apiKey = entered.trim();
            localStorage.setItem('gemini_api_key', apiKey);
        } else {
            throw new Error('Gemini API key not set');
        }
    }

    // Use a stable, widely available model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = `API request failed with status ${response.status}`;
            try {
                const errorBody = await response.json();
                console.error("Gemini API Error:", errorBody);
                const detail = errorBody.error?.message || errorBody.error || JSON.stringify(errorBody);
                if (detail) message += `: ${detail}`;
            } catch {}
            throw new Error(message);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        if (candidate && candidate.content?.parts?.[0]?.text) {
            return candidate.content.parts[0].text;
        } else {
            throw new Error("Invalid response from Gemini API (no text candidate)");
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        throw error;
    }
};

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [notes, setNotes] = useState([]);
    const [currentNote, setCurrentNote] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isContinuing, setIsContinuing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isFindingActions, setIsFindingActions] = useState(false);
    const [isFindingRelated, setIsFindingRelated] = useState(false);
    const [summary, setSummary] = useState('');
    const [actionItems, setActionItems] = useState('');
    const [relatedNotes, setRelatedNotes] = useState([]);
    const [smartSearchResult, setSmartSearchResult] = useState(null);
    const [error, setError] = useState(null);

    // --- Refs ---
    const editorRef = useRef(null);

    // --- Data Loading ---
    useEffect(() => {
        setIsLoading(true);
        try {
            const notesData = localDatabase.getAllNotes();
            setNotes(notesData);
        } catch (err) {
            console.error("Failed to load notes:", err);
            setError("Failed to load notes.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    // --- Helper to select a note ---
    const selectNote = (note) => {
        setCurrentNote(note);
        setSmartSearchResult(null);
        setSummary('');
        setActionItems('');
        setRelatedNotes([]);
    };

    // --- CRUD Functions ---
    const createNewNote = () => {
        const now = new Date();
        const newNote = {
            title: now.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            }),
            content: 'Location: Hyderabad, Telangana, India\n\n',
            attachments: []
        };
        const createdNote = localDatabase.createNote(newNote);
        setNotes(localDatabase.getAllNotes());
        selectNote(createdNote);
    };

    const handleNoteUpdate = (note) => {
        if (!note) return;
        localDatabase.updateNote(note.id, note);
        setNotes(localDatabase.getAllNotes());
    };

    const deleteNote = (noteId) => {
        localDatabase.deleteNote(noteId);
        setNotes(localDatabase.getAllNotes());
        if (currentNote && currentNote.id === noteId) {
            setCurrentNote(null);
        }
    };

    // --- API Key Helper ---
    const promptSetApiKey = () => {
        const existing = localStorage.getItem('gemini_api_key') || '';
        const entered = window.prompt('Enter your Gemini API key:', existing);
        if (entered && entered.trim()) {
            localStorage.setItem('gemini_api_key', entered.trim());
            alert('API key saved. You can now use AI features.');
        }
    };

    // --- Attachment Handlers ---
    const handleAddAttachments = (files) => {
        if (!currentNote || !files || files.length === 0) return;
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const readers = imageFiles.map(file => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: e.target.result,
                createdAt: new Date().toISOString()
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
        }));

        Promise.all(readers).then(newAttachments => {
            const updated = { 
                ...currentNote, 
                attachments: [ ...(currentNote.attachments || []), ...newAttachments ]
            };
            setCurrentNote(updated);
            handleNoteUpdate(updated);
        }).catch(() => {
            setError('Failed to read one or more images.');
        });
    };

    const handleRemoveAttachment = (attachmentId) => {
        if (!currentNote) return;
        const updated = {
            ...currentNote,
            attachments: (currentNote.attachments || []).filter(a => a.id !== attachmentId)
        };
        setCurrentNote(updated);
        handleNoteUpdate(updated);
    };

    // --- Export/Import Functions ---
    const exportNotes = () => {
        const dataStr = localDatabase.exportNotes();
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `second-brain-notes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importNotes = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file type
            if (!file.name.toLowerCase().endsWith('.json')) {
                setError("Please select a JSON file (.json extension). You selected: " + file.name);
                event.target.value = '';
                return;
            }
            
            // Check file size (warn if very large)
            if (file.size > 10 * 1024 * 1024) { // 10MB
                if (!confirm("The file is quite large (" + Math.round(file.size / 1024 / 1024) + "MB). Continue importing?")) {
                    event.target.value = '';
                    return;
                }
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = localDatabase.importNotes(e.target.result);
                if (result.success) {
                    setNotes(localDatabase.getAllNotes());
                    setError(null);
                    // Show success message
                    const message = result.skipped > 0 
                        ? `Successfully imported ${result.imported} notes. ${result.skipped} notes were skipped due to invalid format.`
                        : `Successfully imported ${result.imported} notes.`;
                    alert(message);
                } else {
                    setError(result.error || "Failed to import notes. Please check the file format.");
                }
            };
            reader.onerror = () => {
                setError("Failed to read the file. Please try again.");
                event.target.value = '';
            };
            reader.readAsText(file);
        }
        // Reset the input so the same file can be selected again
        event.target.value = '';
    };

    // --- Gemini-Powered Functions ---
    const handleSmartSearch = async () => {
        if (!searchTerm.trim() || !notes.length) return;
        setIsSearching(true);
        setCurrentNote(null);
        setSmartSearchResult(null);
        setError(null);
        
        // First try local search
        const localResults = localDatabase.searchNotes(searchTerm);
        if (localResults.length > 0) {
            setSmartSearchResult(`Found ${localResults.length} matching notes:\n\n${localResults.map(note => `📝 ${note.title}\n${note.content.substring(0, 200)}...`).join('\n\n')}`);
            setIsSearching(false);
            return;
        }

        // If no local results, try AI search (if API key is available)
        const prompt = `You are a helpful assistant for a user's personal notes. Your task is to answer the user's query based only on the provided notes. Be concise and direct. If the notes don't contain the answer, state that the information is not available in the notes.

        User Query: "${searchTerm}"

        Here are the notes:
        ${notes.map(note => `--- NOTE ---\nTitle: ${note.title}\nContent: ${note.content}\n----------`).join('\n\n')}`;

        try {
            const result = await callGeminiAPI(prompt);
            setSmartSearchResult(result);
        } catch (err) {
            setSmartSearchResult("No matching notes found for your search query.");
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSummarize = async () => {
        if (!currentNote || !currentNote.content) return;
        setIsSummarizing(true);
        setSummary('');
        setError(null);
        
        const prompt = `Summarize the following note in a few key points:\n\nTitle: ${currentNote.title}\n\nContent: ${currentNote.content}`;
        
        try {
            const result = await callGeminiAPI(prompt);
            setSummary(result);
        } catch (err) {
            setError(err?.message ? `Failed to generate summary: ${err.message}` : "Failed to generate summary.");
        } finally {
            setIsSummarizing(false);
        }
    };

    const handleContinueWriting = async () => {
        if (!currentNote || !currentNote.content) return;
        setIsContinuing(true);
        setError(null);

        const prompt = `Continue writing the following text in a consistent style. Do not repeat the original text in your response. Just provide the next part.\n\n${currentNote.content}`;

        try {
            const result = await callGeminiAPI(prompt);
            const updatedContent = currentNote.content + "\n\n" + result;
            const updatedNote = { ...currentNote, content: updatedContent };
            setCurrentNote(updatedNote);
            await handleNoteUpdate(updatedNote); // Save to Firestore
        } catch (err) {
            setError(err?.message ? `Failed to continue writing: ${err.message}` : "Failed to continue writing.");
        } finally {
            setIsContinuing(false);
        }
    };

    const handleFindActionItems = async () => {
        if (!currentNote || !currentNote.content) return;
        setIsFindingActions(true);
        setActionItems('');
        setError(null);
        
        const prompt = `Analyze the following note and extract all specific action items or tasks. List them clearly as a bulleted list. If no action items are found, respond with 'No action items found.'

        Note Content:
        "${currentNote.content}"`;
        
        try {
            const result = await callGeminiAPI(prompt);
            setActionItems(result);
        } catch (err) {
            setError(err?.message ? `Failed to find action items: ${err.message}` : "Failed to find action items.");
        } finally {
            setIsFindingActions(false);
        }
    };
    
    const handleFindRelatedNotes = async () => {
        if (!currentNote || notes.length <= 1) return;
        setIsFindingRelated(true);
        setRelatedNotes([]);
        setError(null);

        const otherNotes = notes.filter(n => n.id !== currentNote.id).map(n => ({id: n.id, title: n.title, content: n.content.substring(0, 300)}));

        const prompt = `You are a personal knowledge assistant. Your task is to find notes that are conceptually related to the 'Main Note' provided. Do not just look for keywords. Identify underlying themes, concepts, or connections.

        Main Note (ID: ${currentNote.id}):
        Title: ${currentNote.title}
        Content: ${currentNote.content}

        Search through these other notes:
        ${JSON.stringify(otherNotes)}

        Respond with a JSON array of the top 3 most relevant note IDs. For example: ["id1", "id2", "id3"]. If no notes are related, return an empty array.`;

        try {
            const result = await callGeminiAPI(prompt);
            const relatedIds = JSON.parse(result.replace(/json|/g, '').trim());
            const foundNotes = notes.filter(note => relatedIds.includes(note.id));
            setRelatedNotes(foundNotes);
        } catch (err) {
            console.error("Error finding related notes:", err);
            setError("Failed to find related notes.");
        } finally {
            setIsFindingRelated(false);
        }
    };

    // --- Render ---
    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {/* --- Sidebar --- */}
            <div className="w-1/3 max-w-sm bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center">
                        <BrainCircuit className="mr-2 text-blue-500" />
                        Second Brain
                    </h1>
                    <div className="flex items-center gap-2">
                        <button onClick={exportNotes} title="Export Notes" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <Download size={18} />
                        </button>
                        <label className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                            <Upload size={18} />
                            <input type="file" accept=".json" onChange={importNotes} className="hidden" />
                        </label>
                        <button onClick={createNewNote} title="Create New Note" className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
                <div className="p-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Ask a question about your notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSmartSearch()}
                            className="w-full p-2 pl-8 border rounded-md bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Search size={18} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500 flex items-center justify-center"><Loader className="animate-spin mr-2" /> Loading notes...</div>
                    ) : (
                        notes.map(note => (
                            <div
                                key={note.id}
                                onClick={() => selectNote(note)}
                                className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 border-l-4 ${currentNote?.id === note.id ? 'border-blue-500 bg-blue-50 dark:bg-gray-900' : 'border-transparent'}`}
                            >
                                <h3 className="font-semibold truncate text-gray-800 dark:text-gray-200">{note.title}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* --- Main Content --- */}
            <div className="flex-1 flex flex-col">
                {currentNote ? (
                    <>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4 flex-wrap">
                            <input
                                type="text"
                                value={currentNote.title}
                                onChange={(e) => setCurrentNote({ ...currentNote, title: e.target.value })}
                                onBlur={() => handleNoteUpdate(currentNote)}
                                className="text-2xl font-bold bg-transparent focus:outline-none w-full lg:w-auto flex-grow"
                            />
                            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                                <button onClick={handleFindRelatedNotes} disabled={isFindingRelated} className="flex items-center gap-1 p-2 rounded-md bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:bg-gray-400">
                                    {isFindingRelated ? <Loader size={18} className="animate-spin" /> : <LinkIcon size={18} />}
                                    <span>Find Related</span>
                                </button>
                                <button onClick={handleFindActionItems} disabled={isFindingActions} className="flex items-center gap-1 p-2 rounded-md bg-purple-500 text-white hover:bg-purple-600 transition-colors disabled:bg-gray-400">
                                    {isFindingActions ? <Loader size={18} className="animate-spin" /> : <CheckSquare size={18} />}
                                    <span>Find Actions</span>
                                </button>
                                <button onClick={handleContinueWriting} disabled={isContinuing} className="flex items-center gap-1 p-2 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors disabled:bg-gray-400">
                                    {isContinuing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    <span>Continue</span>
                                </button>
                                <button onClick={handleSummarize} disabled={isSummarizing} className="flex items-center gap-1 p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:bg-gray-400">
                                    {isSummarizing ? <Loader size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    <span>Summarize</span>
                                </button>
                                <button onClick={promptSetApiKey} className="flex items-center gap-1 p-2 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                                    <KeyIcon size={18} />
                                    <span>API Key</span>
                                </button>
                                <label className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer transition-colors">
                                    <Upload size={18} />
                                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleAddAttachments(e.target.files); e.target.value=''; }} />
                                </label>
                                <button onClick={() => deleteNote(currentNote.id)} className="p-2 rounded-md hover:bg-red-500 hover:text-white transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-6 overflow-y-auto relative">
                            <textarea
                                ref={editorRef}
                                value={currentNote.content}
                                onChange={(e) => setCurrentNote({ ...currentNote, content: e.target.value })}
                                onBlur={() => handleNoteUpdate(currentNote)}
                                className="w-full h-full bg-transparent text-lg leading-relaxed focus:outline-none resize-none"
                                placeholder="Start writing..."
                            />
                        </div>
                        {(currentNote.attachments && currentNote.attachments.length > 0) && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                <h3 className="font-bold mb-2">Images</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {currentNote.attachments.map(att => (
                                        <div key={att.id} className="relative group rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700">
                                            <img src={att.dataUrl} alt={att.name} className="w-full h-32 object-cover" />
                                            <button onClick={() => handleRemoveAttachment(att.id)} className="absolute top-1 right-1 p-1 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X size={14} />
                                            </button>
                                            <div className="px-2 py-1 text-xs truncate text-gray-600 dark:text-gray-300">{att.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {relatedNotes.length > 0 && (
                             <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-teal-50 dark:bg-gray-800">
                                <h3 className="font-bold mb-2 flex items-center gap-2 text-teal-800 dark:text-teal-300"><LinkIcon size={18} /> Related Notes</h3>
                                <div className="flex flex-col gap-2">
                                    {relatedNotes.map(note => (
                                        <div key={note.id} onClick={() => selectNote(note)} className="p-2 rounded-md bg-white dark:bg-gray-700 hover:bg-teal-100 dark:hover:bg-gray-600 cursor-pointer">
                                            <p className="font-semibold">{note.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                         {actionItems && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-gray-800">
                                <h3 className="font-bold mb-2 flex items-center gap-2 text-purple-800 dark:text-purple-300"><CheckSquare size={18} /> Action Items</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{actionItems}</div>
                            </div>
                        )}
                        {summary && (
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-gray-800">
                                <h3 className="font-bold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-300"><Sparkles size={18} /> AI Summary</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{summary}</div>
                            </div>
                        )}
                    </>
                ) : isSearching || smartSearchResult ? (
                     <div className="flex-1 p-6 overflow-y-auto">
                        <h2 className="text-2xl font-bold mb-4 flex items-center"><Bot className="mr-2" /> Smart Search Result</h2>
                        {isSearching ? (
                            <div className="flex items-center text-gray-500"><Loader className="animate-spin mr-2" /> Thinking...</div>
                        ) : (
                            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{smartSearchResult}</div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 text-center p-8">
                        <BrainCircuit size={64} className="mb-4 text-gray-400" />
                        <h2 className="text-2xl font-semibold">Welcome to your Second Brain</h2>
                        <p className="max-w-md mt-2">Select a note on the left, or create a new one to get started. You can also ask a question about your notes using the search bar.</p>
                    </div>
                )}
            </div>
            {error && (
                <div className="absolute bottom-4 right-4 bg-red-500 text-white p-4 rounded-md shadow-lg flex items-center gap-4">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="font-bold">
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
} 