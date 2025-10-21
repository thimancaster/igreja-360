# AI Development Rules for Igreja360

This document outlines the rules and conventions for AI-driven development of this application. Adhering to these guidelines ensures consistency, maintainability, and quality.

## Tech Stack Overview

The application is built with a modern, type-safe, and efficient technology stack:

- **Framework**: [React](https://react.dev/) with [Vite](https://vitejs.dev/) for a fast development experience.
- **Language**: [TypeScript](https://www.typescriptlang.org/) for static typing and improved code quality.
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) for a comprehensive set of accessible and customizable components.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for a utility-first CSS framework.
- **Routing**: [React Router](https://reactrouter.com/) for client-side navigation.
- **Data Fetching & Caching**: [TanStack Query](https://tanstack.com/query) for managing server state.
- **Backend & Database**: [Supabase](https://supabase.com/) for the database, authentication, and serverless functions.
- **Forms**: [React Hook Form](https://react-hook-form.com/) for performant form handling, paired with [Zod](https://zod.dev/) for schema validation.
- **Icons**: [Lucide React](https://lucide.dev/) for a clean and consistent icon set.
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/) for toast notifications.

## Library Usage and Coding Conventions

### 1. Component Development

- **Primary Library**: ALWAYS use components from `shadcn/ui` located in `@/components/ui`.
- **Custom Components**: If a required component does not exist in `shadcn/ui`, create a new one in the `src/components/` directory. New components MUST be styled with Tailwind CSS and follow the existing project's architectural patterns.
- **File Structure**: Each component must be in its own file. Page components go in `src/pages/`, and reusable components go in `src/components/`.

### 2. Styling

- **Exclusively Tailwind CSS**: All styling MUST be done using Tailwind CSS utility classes. Do not write custom CSS files or use CSS-in-JS libraries.
- **Class Merging**: Use the `cn` utility from `@/lib/utils.ts` for conditionally applying classes to handle merging and conflicts correctly.

### 3. State Management

- **Server State**: Use TanStack Query (`useQuery`, `useMutation`) for all interactions with the Supabase backend (fetching, creating, updating, deleting data).
- **Client State**:
    - For local component state, use React's `useState` and `useReducer`.
    - For global state that needs to be shared across components (like authentication), use React Context. The `AuthContext` is a good example. Do not introduce libraries like Redux or Zustand.

### 4. Forms

- **Form Library**: All forms MUST be built using `react-hook-form`.
- **Validation**: All form validation MUST be handled using `zod`. Define a Zod schema for each form's data structure.

### 5. Backend and Database

- **Supabase Client**: All interactions with the database or Supabase services MUST use the pre-configured Supabase client available at `@/integrations/supabase/client`.
- **Types**: Utilize the auto-generated Supabase types from `@/integrations/supabase/types.ts` to ensure type safety when interacting with the database.

### 6. Routing

- **Router**: Use `react-router-dom` for all navigation.
- **Route Definitions**: All application routes are defined in `src/App.tsx`. Keep this file as the single source of truth for routing.

### 7. Icons and Notifications

- **Icons**: Use icons exclusively from the `lucide-react` package.
- **Toasts**: Use the `sonner` library for all toast notifications. It is already configured in `App.tsx`.

By following these rules, we ensure the codebase remains simple, elegant, and consistent.