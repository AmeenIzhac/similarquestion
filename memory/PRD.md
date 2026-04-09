# Similar Question (SQ) - PRD

## Original Problem Statement
"Can u revamp the UI? Just make it look more modern but simple."

## User Preferences
- Light theme
- Full revamp (everything)
- Minimal/clean (Apple-like)
- No elements to keep as-is
- Can reorganize layouts

## Architecture
- **Stack**: Vite + React + TypeScript + Tailwind CSS
- **No backend** - pure frontend app
- **External APIs**: Pinecone (vector search), OpenAI (chatbot), Tesseract.js (OCR)
- **Hosting**: Firebase

## Core Features
1. Landing page with search bar (text + image OCR upload)
2. Question viewer with zoom/pan + annotation tools (pen, eraser, text, undo, clear)
3. Sidebar with filters, annotation tools, worksheet builder, feedback form
4. AI chatbot tutor (GPT-4o-mini) with step-by-step mode
5. PDF viewer for full papers and markschemes
6. Worksheet builder (select questions, download as PDF)
7. Mobile responsive with hamburger menu drawer

## What's Been Implemented (Jan 2026)
### UI Revamp - Complete
- **Font**: Outfit (headings) + Inter (body) via Google Fonts
- **Colors**: #F5F5F7 bg, #FFFFFF surfaces, #0066CC accent, #1D1D1F text
- **Components updated**: All 10 components (App.tsx, Sidebar, SearchBar, FilterModal, QuestionViewer, ChatBot, LoadingOverlay, AnnotationTools, WorksheetPanel, FeedbackForm) + index.css
- **Design**: Floating rounded panels, pill-shaped buttons, glassmorphic effects, ambient background image on landing
- **Testing**: 100% pass rate across frontend, UI interactions, responsive design, data-testids

## Prioritized Backlog
- P0: None (all core features working)
- P1: Performance optimization for large question sets
- P2: Dark mode toggle, keyboard shortcuts

## Next Tasks
- User review and feedback on the revamp
- Potential dark mode toggle
