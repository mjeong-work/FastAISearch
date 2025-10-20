# AI Tools Search Application

## Overview

This is a web-based AI tools directory and comparison platform built with FastAPI (Python backend) and vanilla JavaScript (frontend). The application allows users to browse, search, and filter a curated collection of AI tools across different categories, pricing models, and use cases. Users can search by keywords, filter by category and pricing, and compare tools side-by-side.

**Built:** October 20, 2025

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Architecture

**Framework Choice: FastAPI**
- **Problem**: Need a lightweight, fast API server with automatic documentation
- **Solution**: FastAPI provides async support, automatic OpenAPI documentation, and built-in request validation
- **Rationale**: FastAPI offers excellent performance for read-heavy applications while keeping the codebase simple and maintainable

**Data Storage: JSON File-Based**
- **Problem**: Store and retrieve AI tool information
- **Solution**: Simple JSON file (`data/tools.json`) loaded on each request
- **Pros**: No database setup required, easy to edit, version-controllable
- **Cons**: Not suitable for write-heavy operations or large datasets, no concurrent write safety
- **Rationale**: For a relatively static catalog of AI tools with infrequent updates, file-based storage keeps deployment simple

**API Design Pattern: RESTful endpoints**
- `/api/tools` - List and filter tools with query parameters (search, category, pricing)
- `/api/tools/{tool_id}` - Retrieve individual tool details
- `/api/tools/compare` - Compare up to 3 tools by IDs
- `/api/categories` - Get list of all tool categories
- Search/filter logic implemented server-side for flexibility

**Error Handling**
- Proper HTTPException usage for 404 and 400 errors
- Input validation for compare endpoint to handle invalid IDs
- Graceful error responses with meaningful messages

### Frontend Architecture

**Technology Stack: Vanilla JavaScript + HTML/CSS**
- **Problem**: Create an interactive, responsive search and comparison interface
- **Solution**: Plain JavaScript without frameworks, server-side rendering for initial page load
- **Rationale**: Keeps the application lightweight and reduces complexity for a relatively simple UI

**Static File Serving**
- FastAPI serves static assets (HTML, CSS, JS) directly
- Root path (`/`) returns the main HTML file
- All UI assets stored in `/static` directory

**Client-Side Features**
- Dynamic tool filtering and display
- Tool comparison functionality (supports comparing up to 3 tools)
- Search with real-time API calls
- Category and pricing dropdown filters
- Responsive grid layout for tool cards
- Modal window for side-by-side comparison

### Data Model

**Tool Schema** (from `tools.json`):
- `id`: Unique identifier
- `name`: Tool name
- `description`: Brief description
- `category`: Tool category (e.g., "Conversational AI", "Image Generation")
- `pricing`: Pricing model ("free", "paid", "free/paid")
- `pricing_details`: Specific pricing information
- `tags`: Array of searchable keywords
- `features`: Array of key features
- `website`: Official tool URL

**Search Strategy**:
- Case-insensitive search across name, description, and tags
- Multiple filter support (search keyword, category, pricing)
- Filters are combinable (AND logic)

## External Dependencies

### Python Backend Dependencies
- **FastAPI**: Web framework for building the API
- **Uvicorn**: ASGI server to run FastAPI
- Standard library modules: `json`, `pathlib`, `typing`

### Frontend Dependencies
- **No external JavaScript libraries**: Pure vanilla JavaScript
- Browser-native Fetch API for HTTP requests
- Modern CSS with gradient backgrounds and flexbox/grid layouts

### Data Sources
- **Static JSON file**: Self-contained tool catalog without external API dependencies
- Tool information is manually curated with 15 AI tools including ChatGPT, Midjourney, GitHub Copilot, Grammarly, Claude, and others

### Hosting/Deployment Considerations
- Application requires serving both API endpoints and static files
- No database server needed
- Can be deployed on platforms supporting Python/FastAPI (Replit, Heroku, Vercel, etc.)
- Static assets and data file must be deployed alongside application code

## Project Structure

```
.
├── main.py                 # FastAPI backend with all API endpoints
├── data/
│   └── tools.json          # Curated AI tools database (15 tools)
├── static/
│   ├── index.html          # Frontend HTML
│   ├── styles.css          # Responsive CSS styling
│   └── script.js           # Client-side JavaScript
├── .gitignore              # Python-specific ignore patterns
├── pyproject.toml          # Python project configuration
└── replit.md               # This file

```

## Recent Changes

**October 20, 2025**
- Initial project setup with FastAPI and Python 3.11
- Created curated JSON database with 15 AI tools
- Built RESTful API with search, filter, and compare functionality
- Implemented responsive frontend with search and comparison features
- Fixed error handling to use proper HTTPException for 404 and 400 errors
- Added input validation for compare endpoint to prevent 500 errors
- Configured workflow to run server on port 5000

## Features Implemented

✅ Keyword search across tool names, descriptions, and tags  
✅ Filter by category and pricing type  
✅ Compare up to 3 tools side-by-side  
✅ RESTful API with GET /api/tools endpoint  
✅ Responsive design that works on mobile and desktop  
✅ Clean, intuitive user interface  
✅ Proper error handling with meaningful messages

## Future Enhancements

Potential improvements for future versions:
- Add automated tests for endpoints and edge cases
- Implement caching for repeated data loading
- Add pagination for larger datasets
- User-submitted tool suggestions
- Sorting options (by name, pricing, popularity)
- Advanced filtering (multiple categories, feature-based filters)
- User favorites/bookmarks with local storage
