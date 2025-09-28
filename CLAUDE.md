# CLAUDE CLI GROUND RULES - MANDATORY COMPLIANCE

You are working with a developer's production environment. Follow these rules EXACTLY. Every project must be enterprise-grade and immediately deployable.

## ⚠️ CRITICAL PROCESS MANAGEMENT WARNING

**NEVER kill Node.js processes (pkill, taskkill, kill-port, etc.) without explicit user permission.**

The user runs multiple projects simultaneously and killing processes breaks other running applications. Always ask before terminating any processes.

## IMPLEMENTATION STANDARDS

- **NEVER use placeholders, TODOs, or "coming soon" labels**
- **ALL features must be fully implemented and functional**
- **Complete all code - no partial implementations**
- **Every function, component, and feature must work end-to-end**
- **No skeleton code, stub functions, or placeholder content**
- **Implement proper TypeScript types where applicable**
- **Follow consistent code formatting and style guidelines**

## SERVER AND PROCESS MANAGEMENT

- **NEVER kill all Node processes with `pkill node` or `killall node`**
- **Always use specific process management (PM2, process IDs, or port-specific kills)**
- **Launch each project on a UNIQUE port number (check 3000-9000 range)**
- **Check for port availability before starting servers**
- **Use environment-specific ports with proper fallbacks**
- **Never assume default ports are available**

## DATABASE AND DATA HANDLING

- **Always implement proper database connections with connection pooling**
- **Include full CRUD operations where needed**
- **Implement proper error handling for database operations**
- **Never use mock data unless explicitly requested for testing**
- **Include proper data validation and sanitization**
- **Handle database connection failures gracefully**

## ERROR HANDLING AND VALIDATION

- **Implement comprehensive error handling in ALL code**
- **Add input validation for all user inputs (client AND server side)**
- **Include proper try-catch blocks with specific error types**
- **Handle edge cases and potential failures**
- **Log errors appropriately with structured logging**

## CONFIGURATION AND ENVIRONMENT

- **Create proper .env files with all required variables**
- **Include example .env.example files with placeholder values**
- **Never hardcode sensitive information**
- **Use proper configuration management with validation**
- **Include all necessary dependencies in package.json with exact versions**

## SECURITY IMPLEMENTATION

- **Implement proper authentication and authorization**
- **Add rate limiting to all public endpoints**
- **Include CORS configuration with specific origins**
- **Implement input sanitization and XSS protection**
- **Add HTTPS configuration for production**
- **Include security headers (helmet.js for Node.js)**

## TESTING AND QUALITY ASSURANCE

- **Code must be production-ready and thoroughly tested**
- **Include unit tests for all business logic**
- **Add integration tests for API endpoints**
- **Implement proper logging and monitoring**
- **Add health check endpoints**

## DEPENDENCY MANAGEMENT

- **Always check and install ALL required dependencies**
- **Include exact version numbers in package.json**
- **Test npm/yarn install before declaring complete**
- **Never assume global packages are installed**
- **Check for peer dependency warnings and resolve them**

## API AND INTEGRATION STANDARDS

- **Always configure CORS properly for frontend-backend communication**
- **Test API endpoints before integration**
- **Handle different HTTP methods (GET, POST, PUT, DELETE, PATCH)**
- **Include proper request/response headers**
- **Test cross-origin requests if applicable**
- **Implement proper API versioning (/api/v1/)**

## ABSOLUTE PROHIBITIONS

❌ **NEVER use `pkill node`, `killall node`, or similar broad process kills**
❌ **NEVER leave TODO comments or unimplemented features**
❌ **NEVER use placeholder text like "Add your API key here" without proper setup**
❌ **NEVER assume services are running on default ports**
❌ **NEVER skip error handling or validation**
❌ **NEVER create incomplete or broken implementations**
❌ **NEVER ignore security best practices**
❌ **NEVER hardcode credentials or sensitive data**
❌ **NEVER assume dependencies are installed globally**
❌ **NEVER skip testing API endpoints before integration**
❌ **NEVER ignore CORS configuration**

## SUCCESS CRITERIA CHECKLIST

✅ **Every feature works completely from start to finish**
✅ **All servers start on unique, available ports**
✅ **All dependencies install without errors**
✅ **API endpoints respond correctly with proper data**
✅ **CORS is configured and cross-origin requests work**
✅ **Database connections are stable and tested**
✅ **Authentication flows work end-to-end**
✅ **Forms submit and process data correctly**
✅ **Error handling covers both expected and edge cases**
✅ **Frontend and backend communicate properly**

## MANDATORY PRE-COMPLETION TESTING

Before declaring any project complete, you MUST verify:

- [ ] **Fresh installation works in clean environment**
- [ ] **All user registration/login flows function**
- [ ] **All API endpoints tested with different HTTP methods**
- [ ] **Form submissions persist data correctly**
- [ ] **Error scenarios and edge cases handled**
- [ ] **All environment variables work correctly**
- [ ] **Database operations perform correctly**
- [ ] **Security measures and input validation active**

**CORE PRINCIPLE: If a user cannot successfully complete every intended workflow on their first attempt after following your setup instructions, the project is incomplete. No exceptions.**

## Project Commands

- **Lint**: `npm run lint`
- **Typecheck**: `npm run typecheck`  
- **Test**: `npm run test`
- **Dev**: `npm run dev` (default port 3000)
- **Build**: `npm run build`

## Database

- Uses Prisma with SQLite for development: `DATABASE_URL="file:./dev.db"`
- Prisma Studio: `DATABASE_URL="file:./dev.db" npx prisma studio --browser none --port 5555`