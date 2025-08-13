# OTIS APROD (Acceptance Protocol Document) Application

## Overview
This full-stack TypeScript application digitalizes the OTIS elevator acceptance protocol process. It guides users through a step-by-step questionnaire, enables error documentation with images, generates PDFs, and supports sharing. The system operates in both Hungarian and German, aiming to streamline and standardize the acceptance process, reduce manual errors, and improve efficiency for OTIS technicians. The project envisions a future of fully digitized and seamlessly integrated elevator inspection and acceptance procedures within existing OTIS systems.

## User Preferences
Preferred communication style: Simple, everyday language (Hungarian preferred).

## System Architecture
### Frontend
- **Framework**: React with TypeScript, using Vite.
- **Routing**: Wouter.
- **UI Library**: Shadcn/ui built on Radix UI.
- **Styling**: TailwindCSS with custom OTIS brand colors.
- **State Management**: React hooks and context for local state, with localStorage persistence.
- **Data Fetching**: TanStack Query.
- **UI/UX Decisions**: Mobile-first, tablet-optimized interface with official OTIS branding. Prioritized input stability, debouncing to prevent cursor jumping, and a global Map cache for radio button functionality. Advanced save system with visual feedback.

### Backend
- **Runtime**: Node.js with TypeScript.
- **Framework**: Express.js.
- **Database**: PostgreSQL with Drizzle ORM.
- **File Generation**: Dedicated services for Excel and PDF document creation.
- **API Endpoints**: RESTful API for protocols, templates, and question configurations.

### Key Features & Design Patterns
- **Multi-language Support**: Hungarian and German localization with dynamic switching.
- **Template Management System**: Admin interface for uploading, activating, and deleting Excel-based question and protocol templates, supporting unified multilingual templates.
- **Excel Integration**: XML-based manipulation preserves original formatting, handles unicode, and supports complex cell mapping (multi-row/multi-cell question types). Calculations handled by Excel's formulas.
- **PDF Generation**: Uses LibreOffice for accurate Excel-to-PDF conversion, maintaining appearance and layout.
- **Data Persistence**: Form data saved to localStorage and PostgreSQL.
- **Error Documentation**: Allows adding, editing, and deleting protocol errors with image attachments.
- **Digital Signature**: Canvas-based signature capture with printed name functionality.
- **Measurement & Calculation**: Supports 'measurement' and 'calculated' question types with a dedicated engine and automatic error detection for out-of-range values.
- **Deployment**: Configured for Vercel with serverless API, PWA functionality, and automated deployment scripts.

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
- **File Manipulation**: `adm-zip`, `xml2js`, `simple-excel-js`
- **PDF Conversion**: `libreoffice-convert` (requires LibreOffice installation)
- **Utilities**: `nanoid`

### Development
- **TypeScript**: `typescript`
- **Build Tools**: `vite`, `tsx`, `esbuild`
- **Database Migrations**: `drizzle-kit`