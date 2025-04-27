# SmartResume AI

SmartResume AI is an intelligent resume evaluation and management system that helps recruiters and candidates streamline the hiring process. The platform uses AI-powered analysis to evaluate resumes against job requirements, providing detailed insights and match scores.

## Table of Contents
- [Features](#features)
- [Screens](#screens)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

### For Recruiters/Admins
- **Resume Analysis**
  - AI-powered analysis of resumes against job requirements
  - Natural Language Processing for skill extraction
  - Experience matching with job requirements
  - Education qualification verification
  - Key skills identification and matching
  - Automated scoring system (0-100%)

- **Match Scoring**
  - Weighted scoring based on job requirements
  - Skills match percentage
  - Experience relevance score
  - Education qualification match
  - Overall compatibility score
  - Visual score representation with color coding

- **Detailed Insights**
  - Comprehensive feedback on candidate qualifications
  - Skills gap analysis
  - Experience relevance breakdown
  - Education qualification assessment
  - Key strengths and weaknesses
  - Improvement suggestions

- **Bulk Processing**
  - Multiple resume upload support
  - Batch analysis capabilities
  - Parallel processing for faster results
  - Progress tracking for bulk operations
  - Export analysis results in CSV/PDF
  - Bulk qualification/disqualification

- **Candidate Management**
  - Candidate profile tracking
  - Application status monitoring
  - Communication history
  - Interview scheduling
  - Notes and feedback management
  - Candidate pipeline visualization

- **Job Role Management**
  - Create detailed job descriptions
  - Define required skills and proficiency levels
  - Set experience requirements
  - Specify education qualifications
  - Add custom evaluation criteria
  - Template management for job roles

### For Candidates
- **Resume Upload**
  - Support for multiple file formats (PDF, DOC, DOCX)
  - Drag-and-drop interface
  - File size validation
  - Format verification
  - Upload progress tracking
  - Error handling and notifications

- **Instant Feedback**
  - Real-time analysis results
  - Match score with job roles
  - Skills assessment
  - Experience evaluation
  - Education verification
  - Improvement suggestions

- **Score Tracking**
  - Historical score tracking
  - Score comparison across roles
  - Progress monitoring
  - Score breakdown by category
  - Improvement tracking
  - Performance analytics

- **Profile Management**
  - Personal information management
  - Resume version control
  - Application history
  - Job role preferences
  - Notification settings
  - Privacy controls

## Screens

### Admin Dashboard
- **Resume List View**
  - Grid/Table view with sorting options
  - Advanced filtering by:
    - Job role
    - Status (New, Analyzed, Qualified, Rejected)
    - Date range
    - Score range
    - Location
  - Quick actions:
    - Analyze resume
    - View details
    - Download resume
    - Qualify/Disqualify
  - Score indicators:
    - Color-coded progress bars
    - Percentage display
    - Status badges
  - Bulk actions:
    - Select multiple resumes
    - Bulk analyze
    - Bulk qualify/disqualify
    - Export selected

- **Resume Analysis View**
  - Detailed resume content display:
    - Formatted text view
    - Original file preview
    - Section highlighting
  - AI-generated match score:
    - Overall score
    - Category-wise breakdown
    - Visual representation
  - Key skills and qualifications:
    - Required vs. possessed skills
    - Skill match percentage
    - Missing skills highlight
  - Experience and education analysis:
    - Timeline visualization
    - Relevance scoring
    - Gap analysis
  - Action buttons:
    - Qualify
    - Disqualify
    - Download
    - Share
    - Add notes

- **Job Role Management**
  - Create and edit job roles:
    - Title and description
    - Required qualifications
    - Experience requirements
    - Key responsibilities
  - Define required skills:
    - Skill name
    - Proficiency level
    - Importance weight
    - Category grouping
  - Set experience requirements:
    - Minimum years
    - Industry preference
    - Role-specific experience
    - Project requirements
  - Manage job descriptions:
    - Rich text editor
    - Template system
    - Version control
    - Preview mode

### Candidate Dashboard
- **Profile View**
  - Personal information:
    - Basic details
    - Contact information
    - Professional summary
    - Social links
  - Resume upload section:
    - Current resume display
    - Version history
    - Upload new version
    - Delete resume
  - Application history:
    - Applied positions
    - Application status
    - Interview schedule
    - Feedback received
  - Match scores:
    - Score breakdown
    - Improvement tips
    - Historical comparison
    - Role-wise analysis

- **Resume Upload**
  - Drag-and-drop interface:
    - Visual upload area
    - File type indicators
    - Size limit display
  - File format validation:
    - Supported formats check
    - File integrity verification
    - Virus scanning
  - Upload progress indicator:
    - Progress bar
    - Time estimation
    - Speed display
  - Success/error notifications:
    - Toast messages
    - Email notifications
    - Status updates

## Project Structure

```
smart-resume-evaluator/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Base UI components
│   │   │   │   ├── button/   # Button variants
│   │   │   │   ├── card/     # Card components
│   │   │   │   ├── dialog/   # Modal dialogs
│   │   │   │   ├── form/     # Form elements
│   │   │   │   └── table/    # Table components
│   │   │   ├── resumes/      # Resume-specific components
│   │   │   │   ├── upload/   # Upload components
│   │   │   │   ├── view/     # View components
│   │   │   │   └── analyze/  # Analysis components
│   │   │   └── candidates/   # Candidate-specific components
│   │   │       ├── profile/  # Profile components
│   │   │       └── list/     # List components
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useAuth/      # Authentication hooks
│   │   │   ├── useResumes/   # Resume management hooks
│   │   │   └── useJobRoles/  # Job role hooks
│   │   ├── pages/            # Page components
│   │   │   ├── admin/        # Admin pages
│   │   │   ├── candidate/    # Candidate pages
│   │   │   └── auth/         # Authentication pages
│   │   ├── lib/              # Utility functions
│   │   │   ├── api/          # API client
│   │   │   ├── auth/         # Authentication utilities
│   │   │   └── utils/        # General utilities
│   │   └── types/            # TypeScript type definitions
│   │       ├── resume.ts     # Resume types
│   │       ├── user.ts       # User types
│   │       └── jobRole.ts    # Job role types
│   └── public/               # Static assets
│       ├── images/           # Image assets
│       └── fonts/            # Font files
│
├── server/                    # Backend Node.js application
│   ├── routes/               # API route handlers
│   │   ├── auth.ts           # Authentication routes
│   │   ├── resumes.ts        # Resume routes
│   │   └── jobRoles.ts       # Job role routes
│   ├── storage/              # Database storage implementations
│   │   ├── mysql.ts          # MySQL implementation
│   │   └── types.ts          # Storage types
│   ├── openai/               # OpenAI integration
│   │   ├── analysis.ts       # Resume analysis
│   │   └── prompts.ts        # AI prompts
│   └── utils/                # Utility functions
│       ├── validation.ts     # Input validation
│       └── file.ts           # File handling
│
├── shared/                    # Shared code between client and server
│   └── schema.ts             # Shared type definitions
│
└── docs/                     # Documentation
    ├── api/                  # API documentation
    │   ├── auth.md           # Authentication API
    │   ├── resumes.md        # Resume API
    │   └── jobRoles.md       # Job role API
    └── setup/                # Setup guides
        ├── development.md    # Development setup
        └── production.md     # Production setup
```

## Technology Stack

### Frontend
- **React with TypeScript**
  - React 18 with hooks
  - TypeScript for type safety
  - Functional components
  - Custom hooks
  - Context API for state management

- **Tailwind CSS**
  - Utility-first CSS framework
  - Custom theme configuration
  - Responsive design
  - Dark mode support
  - Component styling

- **React Query**
  - Data fetching and caching
  - Optimistic updates
  - Automatic background refetching
  - Error handling
  - Loading states

- **React Router**
  - Client-side routing
  - Protected routes
  - Route parameters
  - Navigation guards
  - Route transitions

- **Shadcn UI**
  - Accessible components
  - Customizable themes
  - Responsive design
  - Dark mode support
  - Component variants

### Backend
- **Node.js with Express**
  - Express.js framework
  - Middleware support
  - Route handling
  - Error handling
  - Request validation

- **MySQL Database**
  - Relational database
  - Drizzle ORM
  - Migrations
  - Query optimization
  - Connection pooling

- **OpenAI API**
  - GPT-4 integration
  - Custom prompts
  - Response parsing
  - Error handling
  - Rate limiting

- **Multer**
  - File upload handling
  - Size limits
  - File type validation
  - Storage configuration
  - Error handling

### Development Tools
- **TypeScript**
  - Type checking
  - Interface definitions
  - Type inference
  - Generic types
  - Type guards

- **ESLint**
  - Code linting
  - Style enforcement
  - Error detection
  - Custom rules
  - Auto-fixing

- **Prettier**
  - Code formatting
  - Consistent style
  - Automatic formatting
  - Custom rules
  - Editor integration

- **Jest**
  - Unit testing
  - Component testing
  - API testing
  - Coverage reports
  - Mocking

## Installation

1. **Prerequisites**
   - Node.js (v18 or higher)
   - MySQL (v8.0 or higher)
   - Git
   - npm or yarn

2. **Clone the repository**
```bash
git clone https://github.com/yourusername/smart-resume-evaluator.git
cd smart-resume-evaluator
```

3. **Install dependencies**
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

4. **Environment Setup**
```bash
# Server .env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=smart_resume_evaluator
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
PORT=3001

# Client .env
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=SmartResume AI
```

5. **Database Setup**
```bash
# Create database
mysql -u root -p
CREATE DATABASE smart_resume_evaluator;
exit;

# Run migrations
cd server
npm run migrate
```

6. **Start Development Servers**
```bash
# Start server
cd server
npm run dev

# Start client
cd ../client
npm run dev
```

## Usage

### Admin Access
1. **Authentication**
   - Navigate to login page
   - Enter admin credentials
   - Access dashboard

2. **Dashboard Navigation**
   - View resume list
   - Access job role management
   - View analytics
   - Manage settings

3. **Job Role Management**
   - Create new job roles
   - Define requirements
   - Set evaluation criteria
   - Manage existing roles

4. **Resume Analysis**
   - Upload resumes
   - View analysis results
   - Qualify/disqualify candidates
   - Add feedback

5. **Candidate Management**
   - View candidate profiles
   - Track applications
   - Schedule interviews
   - Manage communications

### Candidate Access
1. **Registration/Login**
   - Create account
   - Verify email
   - Complete profile
   - Access dashboard

2. **Resume Management**
   - Upload resume
   - View analysis
   - Track scores
   - Update profile

3. **Job Applications**
   - Browse job roles
   - View match scores
   - Apply for positions
   - Track status

4. **Profile Management**
   - Update information
   - Manage resumes
   - View history
   - Update preferences

## API Documentation

### Authentication
- **POST `/api/auth/login`**
  - Request body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
  - Response:
    ```json
    {
      "token": "string",
      "user": {
        "id": "number",
        "email": "string",
        "role": "string"
      }
    }
    ```

- **POST `/api/auth/register`**
  - Request body:
    ```json
    {
      "email": "string",
      "password": "string",
      "name": "string",
      "role": "string"
    }
    ```
  - Response:
    ```json
    {
      "token": "string",
      "user": {
        "id": "number",
        "email": "string",
        "role": "string"
      }
    }
    ```

- **GET `/api/auth/me`**
  - Headers:
    ```
    Authorization: Bearer <token>
    ```
  - Response:
    ```json
    {
      "id": "number",
      "email": "string",
      "role": "string"
    }
    ```

### Resumes
- **GET `/api/resumes`**
  - Query parameters:
    - `userId`: string
    - `role`: string
    - `jobRoleId`: string (optional)
  - Response:
    ```json
    {
      "resumes": [
        {
          "id": "number",
          "fileName": "string",
          "score": "number",
          "status": "string",
          "parsedData": "object"
        }
      ]
    }
    ```

- **POST `/api/resumes/upload`**
  - Form data:
    - `file`: File
    - `jobRoleId`: string
  - Response:
    ```json
    {
      "id": "number",
      "fileName": "string",
      "status": "string"
    }
    ```

- **GET `/api/resumes/:id`**
  - Response:
    ```json
    {
      "id": "number",
      "fileName": "string",
      "content": "string",
      "score": "number",
      "status": "string",
      "parsedData": "object"
    }
    ```

- **POST `/api/resumes/:id/analyze`**
  - Response:
    ```json
    {
      "id": "number",
      "score": "number",
      "reasons": "string[]",
      "parsedData": "object"
    }
    ```

- **POST `/api/resumes/:id/qualify`**
  - Request body:
    ```json
    {
      "qualified": "boolean"
    }
    ```
  - Response:
    ```json
    {
      "id": "number",
      "status": "string"
    }
    ```

### Job Roles
- **GET `/api/job-roles`**
  - Response:
    ```json
    {
      "jobRoles": [
        {
          "id": "number",
          "title": "string",
          "description": "string",
          "requirements": "object"
        }
      ]
    }
    ```

- **POST `/api/job-roles`**
  - Request body:
    ```json
    {
      "title": "string",
      "description": "string",
      "requirements": "object"
    }
    ```
  - Response:
    ```json
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "requirements": "object"
    }
    ```

- **PUT `/api/job-roles/:id`**
  - Request body:
    ```json
    {
      "title": "string",
      "description": "string",
      "requirements": "object"
    }
    ```
  - Response:
    ```json
    {
      "id": "number",
      "title": "string",
      "description": "string",
      "requirements": "object"
    }
    ```

- **DELETE `/api/job-roles/:id`**
  - Response:
    ```json
    {
      "success": "boolean"
    }
    ```

## Contributing

1. **Fork the Repository**
   - Create your fork
   - Clone locally
   - Set up upstream

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow coding standards
   - Write tests
   - Update documentation
   - Commit changes

4. **Push Changes**
   ```bash
   git push origin feature/amazing-feature
   ```

5. **Open Pull Request**
   - Describe changes
   - Reference issues
   - Request review

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License
```
Copyright (c) 2024 SmartResume AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
``` 