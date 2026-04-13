# DataFlow AI - Intelligent Data Analytics Platform

> Transform raw CSV data into actionable insights with an intelligent AI agent pipeline. Real-time processing, anomaly detection, predictions, and comprehensive reporting.

![Status](https://img.shields.io/badge/status-production%20ready-brightgreen)
![Node.js](https://img.shields.io/badge/node.js-18+-green)
![React](https://img.shields.io/badge/react-19-blue)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![Docker](https://img.shields.io/badge/docker-compose-2496ED)

## 🎯 Features

- **📤 One-Click Upload** - Drag & drop CSV files with validation
- **🧹 Smart Data Cleaning** - Automatic type detection, missing value handling, deduplication
- **🤖 Multi-Agent Pipeline** - Orchestrated AI agents for intelligent analysis
- **📊 Dynamic Visualizations** - Auto-generated charts based on data characteristics
- **⚠️ Anomaly Detection** - Detect outliers, spikes, and unusual patterns
- **🔮 Predictive Analytics** - Time-series forecasting when applicable
- **💬 Chat with Data** - Natural language Q&A on your dataset
- **📈 Historical Tracking** - Track dataset changes and compare versions
- **📥 Export Everything** - CSV, JSON, or PDF reports
- **🔐 Secure Authentication** - JWT-based user authentication
- **⚡ Real-Time Progress** - SSE streaming for live pipeline updates

## 🏗️ Architecture

```
CSV Upload → Cleaner → Orchestrator → Multi-Agent Pipeline → Dashboard
                                    ├→ Analyzer
                                    ├→ Anomaly Detector
                                    ├→ Visualizer
                                    ├→ Predictor
                                    ├→ Reporter
                                    └→ Memory Tracker
                                         ↓
                                    PostgreSQL Storage
```

## 💻 Tech Stack

### Backend
- **Node.js + Express.js** - REST API server
- **MySQL** - Persistent data storage with JSON support
- **JWT + bcryptjs** - Secure authentication
- **multer** - File upload handling
- **csv-parser** - Efficient CSV processing
- **Server-Sent Events (SSE)** - Real-time progress streaming

### Frontend
- **React 19** - Modern UI framework
- **Vite** - Lightning-fast build tool
- **Recharts** - Data visualization
- **axios** - HTTP client
- **react-dropzone** - Drag-drop file upload
- **Lucide Icons** - Beautiful UI icons

### Deployment
- **Docker** - Container orchestration
- **Docker Compose** - Multi-service management
- **Nginx** - Frontend reverse proxy
- **MySQL 8 Alpine** - Lightweight database

## 📋 Prerequisites

- **Docker & Docker Compose** (recommended for easiest setup)
  - OR
- **Node.js** 18+ & **npm**
- **MySQL** 8+

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd demo1

# Start all services
docker-compose up -d

# Services will be available at:
# Frontend:  http://localhost
# Backend:   http://localhost:3001
# Database:  localhost:5432
```

### Option 2: Local Development

```bash
# Setup Backend
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev

# In a new terminal - Setup Frontend
cd frontend
npm install
npm run dev

# Frontend will be at http://localhost:5173
```

### Option 3: Production Build

```bash
# Build backend
cd backend
npm install --production

# Build frontend
cd frontend
npm install
npm run build

# Run backend
cd ../backend
npm start

# Serve frontend build (configure your web server)
```

## 📝 Environment Variables

Create a `.env` file in the root:

```bash
# Database
DB_HOST=...
DB_PORT=...
DB_NAME=...
DB_USER=...
DB_PASSWORD=...

# Server
PORT=...
NODE_ENV=...

# Auth
JWT_SECRET=.....
```

## 📁 Project Structure

```
demo1/
├── backend/
│   ├── agents/              # AI agent modules
│   │   ├── analyzer.js      # Statistical analysis
│   │   ├── anomaly.js       # Outlier detection
│   │   ├── cleaner.js       # Data cleaning
│   │   ├── memory.js        # Historical comparison
│   │   ├── orchestrator.js  # Pipeline orchestration
│   │   ├── predictor.js     # Time-series forecasting
│   │   ├── reporter.js      # Report generation
│   │   └── visualizer.js    # Chart generation
│   ├── routes/              # API endpoints
│   │   ├── auth.js          # Authentication
│   │   ├── upload.js        # File upload & processing
│   │   ├── chat.js          # Chat with data
│   │   ├── history.js       # Dataset history
│   │   └── export.js        # Data export
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # JWT verification
│   │   ├── logger.js        # Request logging
│   │   └── errorHandler.js  # Error handling
│   ├── config/              # Configuration
│   │   └── db.js            # Database setup
│   ├── uploads/             # Temporary file storage
│   ├── server.js            # Express app entry point
│   ├── Dockerfile           # Backend container
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── api/             # API client
│   │   ├── App.jsx          # Main app
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── Dockerfile           # Frontend container
│   ├── vite.config.js       # Vite configuration
│   └── package.json
├── database/
│   └── init.sql             # PostgreSQL schema
├── docker-compose.yml       # Multi-container setup
├── sample-data.csv          # Test dataset
└── README.md                # This file
```

## 🔌 API Endpoints

### Authentication
```bash
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login user
GET    /api/auth/me                # Get current user (Protected)
```

### Upload & Processing
```bash
POST   /api/upload                 # Upload CSV (Protected)
POST   /api/upload/stream          # Upload with SSE (Protected)
```

### Chat
```bash
POST   /api/chat                   # Chat with dataset (Protected)
```

### History
```bash
GET    /api/history                # Get all datasets (Protected)
GET    /api/history/:id            # Get dataset details (Protected)
DELETE /api/history/:id            # Delete dataset (Protected)
```

### Export
```bash
GET    /api/export/:id/csv         # Export CSV (Protected)
GET    /api/export/:id/json        # Export JSON (Protected)
GET    /api/export/:id/pdf         # Export PDF (Protected)
```

### Health
```bash
GET    /api/health                 # Server health check
```

## 🔐 Authentication

The platform uses JWT (JSON Web Tokens) for authentication:

1. **Register** - Create new account with email & password
2. **Login** - Receive JWT token (7-day expiration)
3. **Protected Requests** - Include `Authorization: Bearer <token>` header
4. **Auto-logout** - Session expires if token invalid (401 response)

All upload, chat, and export operations require authentication.

## 📊 Data Processing Pipeline

### Cleaner Agent
- Parse CSV files
- Detect column types (numeric, categorical, date, boolean)
- Handle missing values (median for numeric, mode for categorical)
- Remove duplicate rows
- Normalize numeric columns

### Orchestrator Agent
- Analyze dataset characteristics
- Dynamically create execution plan
- Skip unnecessary agents (e.g., anomaly detection if < 10 rows)
- Optimize for performance

### Analyzer Agent
- Calculate descriptive statistics
- Compute correlation matrix
- Detect outliers using IQR method
- Generate actionable insights

### Anomaly Agent
- Z-score method for statistical anomalies
- Changepoint detection for sudden shifts
- Only runs if data > 10 rows & numeric columns exist

### Visualizer Agent
- Generate histograms for numeric distributions
- Create scatter plots for correlations
- Make pie charts for categorical data
- Limit to 4-6 most important charts

### Predictor Agent
- Time-series forecasting with exponential smoothing
- Only runs for time-indexed data

### Reporter Agent
- Compile comprehensive report
- Combine all insights and visualizations
- Generate exportable summary

### Memory Agent
- Compare current dataset with previous uploads
- Track changes and evolution
- Highlight significant differences

## 🧪 Testing

```bash
# Test with sample data
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Upload test CSV
curl -X POST http://localhost:3001/api/upload/stream \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample-data.csv"
```

## 📊 Database Schema

```sql
users              -- User profiles & authentication
├── id (CHAR(36) UUID)
├── email (unique)
├── password_hash
└── name

datasets           -- Uploaded CSV files
├── id (CHAR(36) UUID)
├── filename
├── original_row_count
├── cleaned_row_count
├── columns (JSON)
└── user_id (FK)

analysis_results   -- Analysis output
├── statistics
├── correlations
├── outliers
└── insights

visualizations     -- Generated charts
├── charts (JSON)
└── dataset_id (FK)

predictions        -- Forecast data
├── predictions (JSON)
├── summary
└── dataset_id (FK)

reports            -- Compiled reports
├── report (JSON)
└── dataset_id (FK)
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error
```bash
# Check MySQL is running
docker-compose logs mysql

# Reset database
docker-compose down -v  # Remove volumes
docker-compose up       # Recreate fresh
```

### CORS Errors
- Ensure frontend URL is in `CORS_ORIGIN` environment variable
- Default: `http://localhost:5173` (Vite) and `http://localhost:3000`

### File Upload Issues
- Maximum file size: 50MB
- Supported format: CSV only
- Check `/backend/uploads` folder permissions

## 📈 Performance Tips

1. **Batch Processing** - For multiple files, use async uploads
2. **Data Limits** - Tested up to 1M+ rows
3. **Browser Caching** - Enable caching for static assets
4. **Database Indexing** - Pre-built indexes on `user_id` and `dataset_id`

## 🔄 Development Workflow

### Backend Development
```bash
cd backend
npm run dev        # Auto-reload on file changes
```

### Frontend Development
```bash
cd frontend
npm run dev        # Vite hot module replacement
```

### Database Changes
1. Modify `database/init.sql`
2. Remove MySQL volume: `docker-compose down -v`
3. Restart: `docker-compose up`

## 📦 Deployment

### Deploy to Cloud (AWS, GCP, Azure)

1. **Build Docker images:**
   ```bash
   docker build -t dataflow-backend:latest ./backend
   docker build -t dataflow-frontend:latest ./frontend
   ```

2. **Push to registry:**
   ```bash
   docker tag dataflow-backend:latest myregistry/dataflow-backend
   docker push myregistry/dataflow-backend
   ```

3. **Update `.env` for production:**
   ```bash
   JWT_SECRET=<strong-random-secret>
   DB_HOST=<your-db-host>
   NODE_ENV=production
   ```

4. **Deploy using:**
   - Docker Swarm
   - Kubernetes
   - AWS ECS / Google Cloud Run / Azure Container Instances
   - Heroku / Railway / Render

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/awesome-feature`
3. Commit changes: `git commit -m 'Add awesome feature'`
4. Push branch: `git push origin feature/awesome-feature`
5. Open Pull Request

## 📜 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📧 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact: support@dataflow-ai.com

## 🚀 Roadmap

- [ ] WebSocket support for real-time chat
- [ ] Advanced ML models (Random Forest, Neural Networks)
- [ ] Custom agent creation
- [ ] Team collaboration & sharing
- [ ] Advanced scheduling & automation
- [ ] Mobile app (React Native)
- [ ] GraphQL API
- [ ] Real-time data streaming (Kafka)

## 🎓 Learning Resources

- [Express.js Documentation](https://expressjs.com)
- [React Documentation](https://react.dev)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Vite Documentation](https://vitejs.dev)

---

**Built with ❤️ using modern web technologies**

Last updated: April 2026 | Version: 2.0.0
