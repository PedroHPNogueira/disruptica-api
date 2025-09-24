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

- Node.js 20+ and yarn or npm
- Docker and Docker Compose
- Git

### Environment Setup

Create a `.env` file in the root directory, for example:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=disruptica_db
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/disruptica_db?schema=public

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Encryption Configuration
CRYPTO_KEY=your-32-character-encryption-key-here

# Application Configuration
NODE_ENV=development
PORT=3000
```

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
