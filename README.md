# Smart Resume Evaluator

A comprehensive system for evaluating resumes and managing candidate assessments.

## Project Structure

```
├── 📁 client/                    # Frontend React application
│   ├── 📁 src/                   # Source code
│   │   ├── 📁 components/        # Reusable UI components
│   │   ├── 📁 hooks/            # Custom React hooks
│   │   ├── 📁 lib/              # Utility functions and configurations
│   │   ├── 📁 pages/            # Page components
│   │   ├── 📄 App.tsx           # Main application component
│   │   ├── 📄 main.tsx          # Application entry point
│   │   ├── 📄 types.ts          # TypeScript type definitions
│   │   └── 📄 index.css          # Global styles
│   └── 📄 index.html            # HTML template
│
├── 📁 server/                    # Backend Express server
│   ├── 📁 db/                    # Database related files
│   ├── 📁 public/               # Static files
│   ├── 📁 storage/              # Storage implementations
│   ├── 📄 index.ts              # Server entry point
│   ├── 📄 routes.ts             # API routes
│   ├── 📄 storage.ts            # Storage interface
│   ├── 📄 openai.ts             # OpenAI integration
│   └── 📄 vite.ts               # Vite configuration
│
├── 📁 shared/                    # Shared code between frontend and backend
│
├── 📁 test/                      # Test files
│
├── 📁 uploads/                   # Uploaded files storage
│
├── 📁 .vscode/                   # VS Code configuration
│
├── 📄 .gitignore                 # Git ignore rules
├── 📄 components.json            # Component configuration
├── 📄 drizzle.config.ts          # Drizzle ORM configuration
├── 📄 package.json               # Project dependencies
├── 📄 postcss.config.js          # PostCSS configuration
├── 📄 tailwind.config.ts         # Tailwind CSS configuration
├── 📄 tsconfig.json              # TypeScript configuration
└── 📄 vite.config.ts             # Vite build configuration
```

## Features

- Resume upload and analysis
- Job role management
- Candidate assessment
- Exam generation and management
- Real-time proctoring
- Activity logging

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: MySQL with Drizzle ORM
- **AI Integration**: OpenAI API
- **Build Tools**: Vite

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=smart_resume_evaluator
OPENAI_API_KEY=your_openai_api_key
```

## License

[MIT License](LICENSE) 