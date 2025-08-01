# OTIS APROD (Acceptance Protocol Document) Application

## Overview

This full-stack TypeScript application digitizes the OTIS elevator acceptance protocol process. It guides users through a step-by-step questionnaire, enables error documentation with images, generates PDFs, and supports sharing via email or cloud storage. The system operates in both Hungarian and German languages, aiming to streamline and standardize the acceptance process, reduce manual errors, and improve efficiency for OTIS technicians. The project envisions a future where all elevator inspection and acceptance procedures are fully digitized and seamlessly integrated with existing OTIS systems.

## User Preferences

Preferred communication style: Simple, everyday language (Hungarian preferred).

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool.
- **Routing**: Wouter for client-side routing.
- **UI Library**: Shadcn/ui components built on Radix UI primitives.
- **Styling**: TailwindCSS with custom OTIS brand colors.
- **State Management**: React hooks and context for local state, with localStorage persistence for form data.
- **Data Fetching**: TanStack Query for server state management.
- **UI/UX Decisions**: Mobile-first, tablet-optimized interface with official OTIS branding. Input stability is prioritized using native DOM manipulation and debouncing to prevent cursor jumping. Radio button functionality uses a global Map cache to prevent unwanted page navigation. An advanced save system provides visual feedback with status indicators.

### Backend Architecture
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js with custom middleware.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Generation**: Dedicated services for Excel and PDF document creation.
- **API Endpoints**: RESTful API for managing protocols, templates, and question configurations.

### Key Features & Design Patterns
- **Multi-language Support**: Comprehensive Hungarian and German localization with dynamic language switching.
- **Template Management System**: Admin interface for uploading, activating, and deleting Excel-based question and protocol templates. Supports unified multilingual templates.
- **Excel Integration**: XML-based manipulation preserves 100% original template formatting, handles unicode, and supports complex cell mapping including multi-row and multi-cell question types. Calculations are handled by Excel's built-in formulas.
- **PDF Generation**: Utilizes LibreOffice for perfect Excel-to-PDF conversion, maintaining exact appearance and layout.
- **Data Persistence**: All form data is saved to localStorage with PostgreSQL as the primary database backend.
- **Error Documentation**: Allows adding, editing, and deleting protocol errors with image attachments.
- **Digital Signature**: Canvas-based signature capture with printed name functionality.
- **Measurement & Calculation**: Supports 'measurement' and 'calculated' question types with a dedicated calculation engine and automatic error detection for out-of-range values.

## External Dependencies

### Frontend
- **React Ecosystem**: `react`, `react-dom`
- **UI Components**: `@radix-ui/react-slot`, `lucide-react`, `class-variance-authority`, `tailwind-merge`
- **Styling**: `tailwindcss`, `postcss`, `autoprefixer`
- **Data Fetching**: `@tanstack/react-query`
- **Date Handling**: `date-fns`
- **Routing**: `wouter`
- **Signature Capture**: `react-signature-canvas`

### Backend
- **Server Framework**: `express`
- **Database ORM**: `drizzle-orm`, `@neondatabase/serverless` (PostgreSQL driver)
- **Schema Validation**: `zod`
- **File Manipulation**: `adm-zip`, `xml2js`, `simple-excel-js` (or similar for Excel XML)
- **PDF Conversion**: `libreoffice-convert` (requires LibreOffice installation)
- **Utilities**: `nanoid`

### Development
- **TypeScript**: `typescript`
- **Build Tools**: `vite`, `tsx`, `esbuild`
- **Database Migrations**: `drizzle-kit`