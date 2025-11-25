# Real-time Collaborative Code Editor with AI Code Completion
A modern web-based code editor that enables users to collaboratively edit code in real-time, enhanced with AI-powered code completion using Google's Gemini API.

## Features

- **AI Code Completion**: Intelligent code suggestions powered by Google Gemini
- **Live Cursors**: See other collaborators cursor and selections in real-time
- **Session Management**: Join Specific rooms using unique room IDs
- **Language Support**: Javascript, Typescript support with syntax highlighting
- **Responsive UI**: Modern Angular interface with real-time connection status

### Technology Stack

**Backend**
- Node.js with typescript
- Express.js for REST API
- WebSocket (ws) for real-time communication

**Frontend**
- Angular 17+ with typescript
- CodeMirror 6 for code editing
- RxJS for reactive programming

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Angular CLI 17+
- Google Gemini API Key

###1. Clone the Repository

```bash
git clone <repository-url>

# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file and add below details
# GEMINI_API_KEY=<YOUR_API_KEY>
# PORT=3000
# NODE_ENV=development

Getting a Gemini API Key:

1. Visit Google AI Studio
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your .env file

# Build the Backend application
npm run dev

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
ng serve
```

The frontend will be available at
```bash
http://localhost:4200
```
