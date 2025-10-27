# WCAG Compliance Checker - Complete Setup Guide

This guide will help you set up and run the complete WCAG Compliance Checker API with frontend interface.

## 📁 Project Structure

```
wcag-compliance-checker-api/
├── server.js                          # Main API server
├── index.html                         # Frontend interface
├── package.json                       # Dependencies and scripts
├── Dockerfile                         # Docker configuration
├── docker-compose.yml                 # Docker Compose setup
├── .env.example                       # Environment variables template
├── src/
│   ├── WCAGComplianceChecker.js       # Core checker implementation
│   ├── data/
│   │   └── wcag-criteria.js           # WCAG criteria database
│   └── utils/
│       ├── color-contrast.js          # Color contrast analyzer
│       ├── report-generator.js        # Report generation utility
│       ├── logger.js                  # Logging utility
│       ├── config.js                  # Configuration management
│       └── validation.js              # Input validation
├── tests/
│   ├── setup.js                       # Test setup
│   └── integration/
│       └── api.test.js                # API integration tests
├── scripts/
│   └── generate-docs.js               # Documentation generator
├── examples/
│   └── client-examples.js             # Usage examples
├── logs/                              # Log files (created automatically)
└── docs/                              # Generated documentation
```

## 🚀 Quick Start

### 1. Create Project Directory

```bash
mkdir wcag-compliance-checker-api
cd wcag-compliance-checker-api
```

### 2. Create All Files

Create the directory structure and copy all the provided code files:

**Core Files:**
- `server.js` - Main API server
- `index.html` - Frontend interface  
- `package.json` - Dependencies
- `src/WCAGComplianceChecker.js` - Core implementation
- `src/data/wcag-criteria.js` - WCAG database
- `src/utils/*.js` - Utility files

### 3. Install Dependencies

```bash
npm install
```

### 4. Set Up Environment

```bash
# Create environment file
cp .env.example .env

# Edit environment variables (optional)
nano .env
```

**Default .env content:**
```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Puppeteer Configuration
PUPPETEER_HEADLESS=true
PUPPETEER_TIMEOUT=30000
BROWSER_POOL_SIZE=3

# Security
API_KEY_REQUIRED=false
CORS_ORIGIN=*
```

### 5. Create Required Directories

```bash
mkdir -p logs src/data src/utils tests/integration scripts examples docs
```

### 6. Start the Server

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

### 7. Access the Application

Open your browser and navigate to:
- **Frontend Interface**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/health

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `LOG_LEVEL` | info | Logging level |
| `LOG_DIR` | ./logs | Log directory |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Rate limit per window |
| `PUPPETEER_HEADLESS` | true | Run browser headless |
| `PUPPETEER_TIMEOUT` | 30000 | Browser timeout (ms) |

### Puppeteer Configuration

For production environments, you may need to adjust Puppeteer settings:

```javascript
// In src/utils/config.js
puppeteer: {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu'
  ]
}
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- WCAG API server on port 3000
- Nginx reverse proxy on port 80
- Redis for caching (optional)

### Using Docker Only

```bash
# Build image
docker build -t wcag-api .

# Run container
docker run -p 3000:3000 -e NODE_ENV=production wcag-api
```

## 📝 API Usage Examples

### Check URL via API

```bash     
curl -X POST http://localhost:3000/api/check/url \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "wcagVersion": "2.1",
    "complianceLevel": "AA"
  }'
```

### Check HTML Content

```bash
curl -X POST http://localhost:3000/api/check/html \
  -H "Content-Type: application/json" \
  -d '{
    "html": "<!DOCTYPE html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>",
    "wcagVersion": "2.1",
    "complianceLevel": "AA"
  }'
```

### Export Results

```bash
curl -X POST http://localhost:3000/api/export \
  -H "Content-Type: application/json" \
  -d '{
    "results": { ... },
    "format": "pdf",
    "includeDetails": true
  }' \
  --output report.pdf
```

## 🖥️ Frontend Interface

The web interface provides:

### 1. **Check Page Tab**
- URL input for website checking
- HTML content input for direct code analysis
- Live page analysis for current page
- WCAG version and compliance level selection

### 2. **Results Tab**
- Accessibility score and summary
- Detailed issue breakdown
- Filtering by error type
- Export functionality

### 3. **View Criteria Tab**
- Complete WCAG criteria database
- Filterable by version and level
- Expandable sections with detailed guidelines

### Key Features:
- **Real-time Progress**: Shows checking progress with detailed messages
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and live regions
- **Responsive Design**: Works on mobile and desktop
- **Export Options**: JSON, CSV, HTML, and PDF reports

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests only
npm run test:e2e

# Watch mode for development
npm run test:watch
```

### Manual Testing

1. **Test URL Checking:**
   - Enter: `https://example.com`
   - Select WCAG 2.1, Level AA
   - Click "Start Accessibility Check"

2. **Test HTML Checking:**
   - Switch to "HTML Code" tab
   - Paste sample HTML
   - Run check

3. **Test Live Analysis:**
   - Switch to "Live Page Analysis"
   - Run check (analyzes the current page)

## 📊 Monitoring and Logging

### Log Files

Logs are written to the `logs/` directory:

- `error.log` - Application errors
- `combined.log` - All log entries
- `access.log` - HTTP requests

### Viewing Logs

```bash
# Follow all logs
tail -f logs/combined.log

# View errors only
tail -f logs/error.log

# Search for specific patterns
grep "accessibility check" logs/combined.log
```

### Performance Monitoring

```bash
# Check API health
curl http://localhost:3000/api/health

# Monitor performance logs
grep "Performance Log" logs/combined.log

# Monitor slow operations
grep "Slow Operation" logs/combined.log
```

## 🔒 Security Considerations

### Production Security

1. **Environment Variables:**
   ```bash
   NODE_ENV=production
   API_KEY_REQUIRED=true
   CORS_ORIGIN=your-domain.com
   ```

2. **Reverse Proxy:**
   Use nginx or similar for:
   - SSL termination
   - Rate limiting
   - Load balancing

3. **Updates:**
   ```bash
   npm audit
   npm update
   ```

### Rate Limiting

Default limits:
- 100 requests per 15 minutes per IP
- Configurable via environment variables

## 🚨 Troubleshooting

### Common Issues

1. **Puppeteer Installation Fails:**
   ```bash
   # Install dependencies manually
   sudo apt-get install -y chromium-browser
   
   # Or skip Chromium download
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
   ```

2. **Permission Errors (Docker):**
   ```bash
   # Ensure proper permissions
   sudo chown -R $USER:$USER logs/
   ```

3. **Memory Issues:**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 server.js
   ```

4. **Port Already in Use:**
   ```bash
   # Kill process on port 3000
   sudo lsof -ti:3000 | xargs kill -9
   
   # Or use different port
   PORT=3001 npm start
   ```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm start

# Run with Node.js debugging
node --inspect server.js
```

## 📈 Performance Optimization

### Production Recommendations

1. **Use PM2 for Process Management:**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

2. **Enable Gzip Compression:**
   ```javascript
   app.use(compression());
   ```

3. **Implement Caching:**
   - Redis for result caching
   - Browser caching headers

4. **Load Balancing:**
   - Multiple API instances
   - Nginx upstream configuration

## 🔄 Updates and Maintenance

### Regular Maintenance

```bash
# Update dependencies
npm update

# Security audit
npm audit fix

# Clean logs
find logs/ -name "*.log" -mtime +30 -delete

# Restart services
pm2 restart all
```

### Monitoring Health

```bash
# Check API status
curl http://localhost:3000/api/health

# Monitor resource usage
top -p $(pgrep -f "node.*server.js")

# Check disk space
df -h
```

## 🤝 Contributing

### Development Setup

```bash
# Clone and setup
git clone <repository>
cd wcag-compliance-checker-api
npm install
npm run dev

# Run tests before contributing
npm test
npm run lint
```

### Code Standards

- ESLint for code quality
- Jest for testing
- Winston for logging
- Express.js best practices

## 📞 Support

- **Issues**: Create GitHub issues for bugs
- **Documentation**: Check `/api/docs` endpoint
- **Logs**: Check application logs for errors
- **Health**: Monitor `/api/health` endpoint

## 🎯 Next Steps

1. **Customize WCAG Criteria**: Modify `src/data/wcag-criteria.js`
2. **Add Custom Checks**: Extend `WCAGComplianceChecker.js`
3. **Custom Reports**: Modify `ReportGenerator.js`
4. **Integration**: Use provided client examples
5. **Scaling**: Implement load balancing and caching

Your WCAG Compliance Checker API is now ready for production use! 🚀