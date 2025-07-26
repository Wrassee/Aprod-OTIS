# OTIS Acceptance Protocol Application

## Overview

This is a full-stack TypeScript application that digitizes the OTIS elevator acceptance protocol process. The system guides users through a step-by-step questionnaire, allows error documentation with images, generates PDFs, and enables sharing via email or cloud storage. It supports both Hungarian and German languages.

## User Preferences

Preferred communication style: Simple, everyday language (Hungarian preferred).

## Recent Changes

### January 26, 2025 - UI Stability Improvements
- **Text Input Stabilization**: ✅ COMPLETED - MegaStableInput component with 1.5-second debouncing eliminates cursor jumping and UI flickering during text entry
- **Radio Button Issue**: ❌ ONGOING PROBLEM - Radio button selection still causes page navigation despite multiple attempts with UltraStableRadio, InstantRadio components
- **Excel Question Loading**: ✅ COMPLETED - Questions now load from uploaded Excel files (9 questions loading successfully)
- **Admin File Management**: ✅ COMPLETED - Template deletion functionality with physical file removal working properly
- **Database Integration**: ✅ COMPLETED - Full PostgreSQL integration with Neon serverless configuration
- **Component Architecture**: ✅ COMPLETED - Isolated question components with full memoization

### Current Issues (January 27, 2025)
- **Radio Button Page Switching**: CRITICAL UNRESOLVED - Radio button selections trigger unwanted page navigation. Attempted solutions:
  - UltraStableRadio with 800ms debounce
  - InstantRadio with immediate response 
  - IsolatedRadio with complete event isolation
  - ZeroRadio with minimal logic
  - SimpleRadio with no fancy features
  - Multiple useEffect dependency changes
  - Complete event propagation prevention methods
  - Focus/blur handling improvements
  - Removing language dependency from useEffect
  - **ROOT CAUSE**: Component remounting causing continuous API calls and state resets

### Analysis
- Questions still reload multiple times ("Loaded questions from API (ONCE)" appears 3x)
- Component is remounting repeatedly, not just re-rendering
- Problem is architectural, not with radio button components
- Need to investigate App.tsx state management and parent re-renders

### Latest Attempts (January 27, 2025)
- **StableQuestionnaire**: Created completely new component with useRef for local state storage
- **Debounced Updates**: 100ms delay between local updates and parent notifications  
- **Direct HTML Radio**: Replaced complex radio components with simple HTML inputs
- **CacheRadio**: Global Map cache + zero parent updates until Save button
- **CacheInput**: Text/number input cache preventing UI refreshes during typing
- **Logo Fix**: ✅ COMPLETED - Moved logo to client/public/ for proper static serving, increased size (start: h-48 w-48, header: h-12 w-12)
- **Component Isolation**: Multiple attempts to isolate radio state from parent updates

### Current Status (January 27, 2025 - 14:44)
- **RADIO BUTTON ISSUE**: ✅ RESOLVED - CacheRadio with global Map cache prevents parent updates
- **INPUT FIELD ISSUE**: ✅ RESOLVED - All text/number inputs converted to native HTML elements with onInput events
- **SIGNATURE NAME INPUT**: ✅ RESOLVED - Signature name field also converted to native HTML input with global storage
- **PAGE NAVIGATION**: ✅ RESOLVED - "Tovább" button works with proper validation and localStorage persistence
- **SIGNATURE CANVAS**: ✅ RESOLVED - Drawing functionality working with signature name input stable
- **PROTOCOL PREVIEW**: ✅ RESOLVED - Added /api/protocols/preview endpoint with mock data fallback
- **Cache Strategy**: All inputs use direct DOM manipulation - radio buttons via global Map cache, text inputs via window.inputValues storage
- **Event System**: Custom events for radio buttons, onInput for all text fields with no React state updates to prevent cursor jumping

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: TailwindCSS with custom OTIS brand colors
- **State Management**: React hooks and context for local state
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: Custom form state with localStorage persistence

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with custom middleware
- **Database**: PostgreSQL with Drizzle ORM
- **File Generation**: Excel and PDF services for document creation
- **Development**: Hot module replacement with Vite integration

### Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
└── dist/           # Build output
```

## Key Components

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Schema**: Protocols, templates, and question_configs tables with proper relations
- **Storage**: DatabaseStorage implementation with full persistence
- **Template Management**: Excel file uploads with question configuration mapping

### Business Logic
- **Protocol Management**: CRUD operations for acceptance protocols
- **Document Generation**: Excel template population and PDF conversion
- **Email Service**: Mock email service for protocol distribution
- **Multi-language Support**: Hungarian and German translations

### User Interface
- **Multi-step Form**: Questionnaire with progress tracking
- **Error Management**: Add, edit, delete protocol errors with severity levels
- **Image Upload**: Photo attachment for error documentation
- **Digital Signature**: Canvas-based signature capture
- **Responsive Design**: Mobile-first approach with OTIS branding

## Data Flow

1. **Language Selection**: User chooses Hungarian or German
2. **Form Completion**: Step-by-step questionnaire with automatic saving
3. **Error Documentation**: Optional error logging with images and severity
4. **Signature Capture**: Digital signature with printed name
5. **Document Generation**: Excel template population and PDF creation
6. **Distribution**: Email sending or cloud storage options

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM)
- UI components (Radix UI, Shadcn/ui)
- Styling (TailwindCSS, class-variance-authority)
- Data fetching (TanStack Query)
- Date handling (date-fns)
- Canvas manipulation for signatures

### Backend Dependencies
- Express.js for server framework
- Drizzle ORM with PostgreSQL driver
- Zod for schema validation
- Excel manipulation libraries
- PDF generation utilities

### Development Dependencies
- TypeScript for type safety
- Vite for development and build tooling
- ESBuild for server bundling
- PostCSS and Autoprefixer for CSS processing

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: TSX for TypeScript execution with file watching
- **Database**: Local PostgreSQL or connection to hosted instance

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Deployment**: Single Node.js process serving both API and static files

### Environment Configuration
- Database connection via `DATABASE_URL` environment variable
- Development/production mode detection
- Replit-specific integrations for hosted deployment

### Scalability Considerations
- Stateless server design for horizontal scaling
- Database-backed storage (currently in-memory for development)
- Separate static asset serving capability
- Cloud storage integration for file persistence