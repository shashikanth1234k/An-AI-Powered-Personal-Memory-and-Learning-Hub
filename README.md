# Second Brain App

A powerful note-taking application with AI-powered features, built with React and Vite.

## Features

### 📝 Core Features
- **Create and Edit Notes** - Simple, distraction-free note creation
- **Local Storage** - All notes are saved locally in your browser
- **Search Functionality** - Fast local search through all your notes
- **Export/Import** - Backup and restore your notes as JSON files

### 🤖 AI-Powered Features (Optional)
- **Smart Search** - AI-powered search across your notes
- **Summarize Notes** - Get AI-generated summaries of your notes
- **Continue Writing** - Let AI continue your thoughts
- **Action Item Extraction** - Automatically find tasks in your notes
- **Related Notes** - Discover connections between your notes

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. **Clone or download the project**
2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser** and go to `http://localhost:3000`

## Database

### Local Storage (Default)
The app uses **localStorage** by default, which means:
- ✅ No setup required
- ✅ Works offline
- ✅ Data stays on your device
- ✅ Fast performance
- ❌ Data not synced across devices
- ❌ Data lost if browser data is cleared

### Firebase (Optional)
For cloud storage and sync across devices:

1. **Follow the Firebase setup guide** in `FIREBASE_SETUP.md`
2. **Update** `src/firebase-config.js` with your credentials
3. **Modify** the app to use Firebase instead of localStorage

## Usage

### Creating Notes
- Click the **+** button to create a new note
- Notes are automatically saved as you type

### Searching
- Use the search bar to find notes
- Local search works instantly
- AI search requires Gemini API key

### Exporting/Importing
- Click the **📥** button to export all notes as JSON
- Click the **📤** button to import notes from a JSON file

### AI Features
To enable AI features, you'll need:
1. **Google Gemini API key**
2. **Update the API key** in the `callGeminiAPI` function

## File Structure

```
├── App.jsx                 # Main application component
├── src/
│   ├── main.jsx           # React entry point
│   ├── index.css          # Global styles
│   ├── database.js        # Local database service
│   └── firebase-config.js # Firebase configuration (optional)
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **localStorage** - Local data storage
- **Google Gemini API** - AI features (optional)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Customization

- **Styling**: Modify `src/index.css` and `tailwind.config.js`
- **Database**: Replace `src/database.js` with your preferred storage solution
- **AI Features**: Update the `callGeminiAPI` function with your API key

## Troubleshooting

### Common Issues

1. **"Could not connect to the database"**
   - This is normal for local storage - the app will work fine
   - Only appears if Firebase is configured but not working

2. **AI features not working**
   - Add your Gemini API key to enable AI features
   - Features work without AI - just slower search

3. **Notes not saving**
   - Check if localStorage is enabled in your browser
   - Try clearing browser data and restarting

## License

This project is open source and available under the MIT License. 