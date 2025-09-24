# Disruptica API

Disruptica test project

## Technologies

- **NestJS** - Node.js framework
- **Prisma** - PostgreSQL ORM
- **JWT** - Authentication
- **Docker** - Containerization
- **Swagger** - Documentation

## Running locally

### Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose
- Git

### Local Development

```bash
# Clone the repository
git clone <repository-url>
cd disruptica-api

# Install dependencies
yarn

# Start only the database
docker-compose up -d

# Generate Prisma client and run migrations
npx prisma generate
npx prisma db push

# Start the application in development mode
npm run start:dev
```

The API will be available at `http://localhost:3000`

## Endpoints

- `POST /users` - Create user
- `POST /auth/login` - User login
- `GET /users` - List users (protected)
- `GET /users/:id` - Get user by ID (protected)
- `GET /docs` - swagger docs
