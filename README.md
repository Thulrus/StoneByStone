# StoneByStone

**A modern, offline-first Progressive Web App for cemetery documentation and data management.**

🌐 **[Try it now on GitHub Pages](https://thulrus.github.io/StoneByStone/)**

## What is StoneByStone?

StoneByStone is a web application designed to help document and preserve cemetery records. I built this project to help my sister with her work documenting local cemeteries—a meaningful project to preserve historical records and help families find their ancestors' resting places.

The app lets you:

- Map cemetery plots on an interactive grid
- Record grave information (names, dates, inscriptions, notes)
- Work completely offline using your browser's local storage
- Export and share cemetery data as portable JSON files
- Merge data from multiple sources with smart conflict resolution
- Handle incomplete data gracefully (not every grave has complete information)

This is a **passion project** built solo using AI-assisted development ("vibe-coded" with GitHub Copilot and other AI tools) to rapidly prototype and iterate on features that solve real-world documentation challenges.

## Key Features

### 📍 Interactive Grid Map

- Visual cemetery layout with zoom and pan
- Click to add or edit grave markers
- Optional landmarks (trees, benches, buildings, monuments)
- Road overlays for navigation

### 💾 Offline-First Design

- All data stored locally in IndexedDB
- Works without internet connection
- Progressive Web App (PWA) - install on mobile or desktop

### 🔄 Smart Data Management

- Import/Export cemetery data as `.cem.json` files
- Automatic merge conflict detection
- Change tracking and audit logs
- Flexible data model - only plot location is required

### 🔍 Search & Filter

- Search graves by name, inscription, or notes
- Filter by date ranges
- Soft delete support (mark graves as deleted without losing data)

### ✅ Data Validation

- JSON Schema validation for all imports
- Ensures data integrity across merges
- Prevents invalid data entry

## Using the App

### Getting Started

1. **Visit the live app**: [https://thulrus.github.io/StoneByStone/](https://thulrus.github.io/StoneByStone/)
2. **Create a new cemetery** or **import sample data**:
   - Try the sample files in the `samples/` folder of this repository
   - `example.cem.json` - Full featured example with multiple graves
   - `minimal-example.cem.json` - Minimal data showing optional fields
   - `willow-creek-example.cem.json` - Realistic cemetery with landmarks

3. **Add graves**:
   - Click cells on the map grid, or
   - Use the "Add New Grave" button in the grave list
   - Only plot number and grid position are required—all other fields are optional

4. **Export your data**:
   - Go to Import/Export page
   - Download as `.cem.json` file
   - Share with others or import to merge datasets

### Data Format

Cemetery data is stored as JSON with a flexible schema. Here's a minimal grave record:

```json
{
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "plot": "A-1",
  "grid": { "row": 0, "col": 0 },
  "properties": {
    "last_modified": "2024-10-04T12:00:00.000Z",
    "modified_by": "user_abc123"
  }
}
```

Optional fields: `name`, `birth`, `death`, `inscription`, `notes`, and more.

See `schema/cemetery.schema.json` for the complete specification.

## Development

### About This Project

This project is currently **solo-developed** with AI assistance. I'm using this as an opportunity to explore rapid development workflows with AI pair programming tools. While I'm focusing on features my sister needs right now, I plan to **open this up for contributions in the future** once the core features are stable.

If you're interested in contributing ideas or feedback, feel free to open an issue!

### Setting Up for Local Development

Want to hack on StoneByStone or customize it for your own cemetery documentation needs? Here's how:

#### Prerequisites

- Node.js 18+ and npm
- Git

#### Setup

```bash
# Clone the repository
git clone https://github.com/Thulrus/StoneByStone.git
cd StoneByStone

# Run the setup script (installs dependencies and git hooks)
chmod +x setup.sh
./setup.sh

# Or manually:
npm install
```

#### Development Commands

```bash
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests
npm run lint     # Check code style
npm run format   # Auto-format code
```

#### Project Structure

```text
src/
  components/     # React components (MapGrid, GraveList, etc.)
  lib/           # Utilities (IndexedDB, merge logic, validation)
  pages/         # Route pages (Home, CemeteryView, ImportExport)
  types/         # TypeScript type definitions
schema/          # JSON Schema for data validation
samples/         # Example cemetery data files
docs/           # Detailed feature documentation
```

#### Code Quality

This project uses automated pre-commit hooks:

- **ESLint** and **Prettier** for code style
- **TypeScript** type checking
- **Jest** tests

See [docs/PRE_COMMIT_SETUP.md](docs/PRE_COMMIT_SETUP.md) for details.

#### Need Help?

Check out the documentation:

- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed setup instructions
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines (for future use)
- [docs/](docs/) - Feature-specific documentation
- [.github/copilot-instructions.md](.github/copilot-instructions.md) - AI assistant guidelines (useful for understanding design decisions)

## Technology Stack

- **React 18** with TypeScript
- **Vite 5** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **IndexedDB** (via `idb`) - Client-side storage
- **AJV** - JSON Schema validation
- **React Router** - Navigation
- **Jest** & React Testing Library

## Roadmap

Current focus areas:

- ✅ Core CRUD operations
- ✅ Offline-first PWA
- ✅ Merge conflict resolution
- ✅ Landmark and road markers
- 🚧 Mobile touch improvements
- 🚧 Photo attachments
- 🚧 GPS coordinate support
- 📋 Multi-cemetery management
- 📋 Collaborative editing features

See [TODO.md](TODO.md) and [IMPLEMENTATION.md](IMPLEMENTATION.md) for detailed status.

## Why "Vibe-Coded"?

This project embraces AI-assisted development. Rather than traditional, meticulous hand-coding, I'm iterating quickly with AI pair programming tools to explore features and solve problems creatively. The goal is to build something useful fast, while learning what works (and what doesn't) with AI collaboration.

It's not perfect, but it's real, functional, and serving a genuine need for cemetery documentation.

## License

MIT License - See [LICENSE](LICENSE) for details.

## Acknowledgments

Built with 💜 for genealogists, historians, and anyone preserving the stories of those who came before us.

Special thanks to my sister for the inspiration and real-world testing!
