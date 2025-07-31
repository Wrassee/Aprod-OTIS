# OTIS APROD (Acceptance Protocol Document) Application

## Overview
This full-stack TypeScript application digitizes the OTIS elevator acceptance protocol process. It guides users through a step-by-step questionnaire, enables error documentation with images, generates PDFs, and allows sharing via email or cloud storage. The system supports both Hungarian and German languages, providing a comprehensive, digitized solution for elevator acceptance protocols.

## User Preferences
Preferred communication style: Simple, everyday language (Hungarian preferred).

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter for client-side routing.
- **UI Library**: Shadcn/ui components built on Radix UI primitives.
- **Styling**: TailwindCSS with custom OTIS brand colors.
- **State Management**: React hooks and context with localStorage persistence.
- **Data Fetching**: TanStack Query for server state management.

### Backend Architecture
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js with custom middleware.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Generation**: Dedicated services for Excel and PDF document creation.
- **Development**: Hot module replacement with Vite integration.

### Key Features and Design Decisions
- **Multi-language Support**: Comprehensive implementation for Hungarian and German across UI and data.
- **Input Stability**: Native DOM manipulation and debouncing for stable text/number inputs, preventing cursor jumping.
- **Radio Button Stability**: CacheRadio pattern with global Map cache to prevent unwanted page navigation.
- **Advanced Save System**: Real-time visual feedback for save status (saving, saved, error) and auto-save notifications.
- **Template Management**: Admin UI for uploading, activating, and deleting Excel-based question and protocol templates.
- **Excel Integration**: XML-based manipulation preserves 100% original template formatting, supports Unicode, and maps questions to specific Excel cells. Includes logic for `yes_no_na`, `true_false`, `measurement`, and `calculated` question types. Excel handles calculations internally.
- **PDF Generation**: Utilizes LibreOffice for exact Excel-to-PDF conversion, preserving original OTIS formatting and layout.
- **Custom File Naming**: Generated files are named `AP_` + Otis Lift-azonosító (based on a specific question's value).
- **Responsive Design**: Mobile-first, tablet-optimized interface with OTIS branding.
- **Digital Signature**: Canvas-based signature capture with printed name functionality.
- **Protocol Management**: Full CRUD operations for acceptance protocols, with data persistence to localStorage and PostgreSQL.
- **Error Documentation**: Allows adding, editing, and deleting protocol errors with severity levels and image attachments.

## External Dependencies

### Frontend
- **React ecosystem**: React, React DOM
- **UI components**: Radix UI, Shadcn/ui
- **Styling**: TailwindCSS, class-variance-authority
- **Data fetching**: TanStack Query
- **Date handling**: date-fns
- **Canvas manipulation**: For digital signatures

### Backend
- **Server framework**: Express.js
- **Database ORM**: Drizzle ORM with PostgreSQL driver
- **Schema validation**: Zod
- **Document generation**: Specific libraries for Excel manipulation and PDF creation
- **Development tools**: TypeScript, Vite, ESBuild, PostCSS, Autoprefixer

### Services
- **Database**: PostgreSQL (specifically Neon for serverless deployment)
- **PDF Conversion**: LibreOffice (installed for headless conversion)