# RHub Admin API Documentation

This document describes the admin API endpoints for managing the VPS document conversion system.

## Overview

The RHub admin API provides endpoints to:

- Check VPS connection and system status
- Install required packages for document conversion
- Set up the document conversion environment
- Monitor installed tools and their versions

## Base URL

```
http://localhost:3000/api/v1/admin
```

## Authentication

Protected endpoints (POST requests) require authentication:

1. **Localhost**: No authentication required when running on localhost
2. **Production**: Set `ADMIN_API_KEY` in `.env` and pass via Authorization header:
   ```bash
   curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" ...
   ```

## Endpoints

### 1. System Status

Check VPS connection and document conversion readiness.

#### GET /api/v1/admin/status

Check basic system status.

```bash
curl -X GET http://localhost:3000/api/v1/admin/status
```

#### GET /api/v1/admin/status?detailed=true

Get detailed system information including disk and memory usage.

```bash
curl -X GET "http://localhost:3000/api/v1/admin/status?detailed=true"
```

**Response:**

```json
{
  "success": true,
  "connected": true,
  "ready": true,
  "readyMessage": "System is ready for document conversion",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "duration": "1234ms",
  "system": {
    "os": "Ubuntu 22.04.3 LTS",
    "kernel": "5.15.0-91-generic",
    "uptime": "up 15 days",
    "hostname": "vps-server"
  },
  "tools": {
    "libreoffice": { "installed": true, "version": "LibreOffice 7.4.7.2" },
    "pandoc": { "installed": true, "version": "pandoc 2.17.1.1" },
    "pdftotext": { "installed": true, "version": "pdftotext version 22.02.0" },
    "convert": {
      "installed": true,
      "version": "Version: ImageMagick 6.9.11-60"
    },
    "tesseract": { "installed": false, "version": null },
    "ghostscript": { "installed": true, "version": "10.00.0" }
  },
  "workDirectories": [
    { "path": "/tmp/doc_conversions", "exists": true, "writable": true },
    { "path": "/tmp/doc_conversions/input", "exists": true, "writable": true },
    { "path": "/tmp/doc_conversions/output", "exists": true, "writable": true }
  ]
}
```

---

### 2. Package Installation

Install packages by category on the VPS.

#### GET /api/v1/admin/install

Check installation status of all package categories.

```bash
curl -X GET http://localhost:3000/api/v1/admin/install
```

#### GET /api/v1/admin/install?category=documents

Check specific category.

```bash
curl -X GET "http://localhost:3000/api/v1/admin/install?category=documents"
```

**Available Categories:**

- `documents` - LibreOffice for PDF/Word/ODT conversions
- `pdf` - PDF processing utilities (poppler-utils, ghostscript, qpdf)
- `pandoc` - Universal document converter
- `images` - Image conversion (ImageMagick, GraphicsMagick)
- `ocr` - Optical Character Recognition (Tesseract)
- `system` - Core system tools (curl, wget, unzip, etc.)

#### POST /api/v1/admin/install

Install packages for a specific category.

```bash
# Install document conversion tools (LibreOffice)
curl -X POST http://localhost:3000/api/v1/admin/install \
  -H "Content-Type: application/json" \
  -d '{"category": "documents"}'

# Install all categories
curl -X POST http://localhost:3000/api/v1/admin/install \
  -H "Content-Type: application/json" \
  -d '{"category": "all"}'

# Force reinstall
curl -X POST http://localhost:3000/api/v1/admin/install \
  -H "Content-Type: application/json" \
  -d '{"category": "documents", "force": true}'
```

**Response:**

```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "category": "documents",
  "results": {
    "documents": {
      "name": "Document Conversion",
      "success": true,
      "output": "Already installed, skipped.",
      "duration": 156
    }
  },
  "message": "All packages installed successfully"
}
```

---

### 3. Full Setup

Run complete setup for document conversion system.

#### GET /api/v1/admin/setup

Check current setup status.

```bash
curl -X GET http://localhost:3000/api/v1/admin/setup
```

**Response:**

```json
{
  "success": true,
  "ready": true,
  "fullyConfigured": true,
  "checks": {
    "libreoffice": true,
    "pandoc": true,
    "pdfTools": true,
    "imagemagick": true,
    "workDirs": true
  },
  "message": "System fully configured for document conversion"
}
```

#### POST /api/v1/admin/setup

Run setup (required packages only).

```bash
curl -X POST http://localhost:3000/api/v1/admin/setup
```

#### POST /api/v1/admin/setup (full)

Run full setup with all optional packages.

```bash
curl -X POST http://localhost:3000/api/v1/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"full": true}'
```

**Response:**

```json
{
  "success": true,
  "verified": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalDuration": "45000ms",
  "mode": "full",
  "steps": [
    {
      "step": "Update package list",
      "success": true,
      "output": "...",
      "duration": 2000,
      "required": true
    }
  ],
  "summary": {
    "total": 8,
    "successful": 8,
    "failed": 0
  },
  "nextSteps": [
    "System is ready for document conversion",
    "Test with: POST /api/tools/doc/convert"
  ]
}
```

---

## Quick Start

### 1. Check VPS Connection

```bash
curl -X GET http://localhost:3000/api/v1/admin/status
```

### 2. Run Full Setup

```bash
curl -X POST http://localhost:3000/api/v1/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"full": true}'
```

### 3. Verify Installation

```bash
curl -X GET http://localhost:3000/api/v1/admin/install
```

### 4. Test Document Conversion

```bash
curl -X POST http://localhost:3000/api/tools/doc/convert \
  -F "file=@document.pdf" \
  -F "targetFormat=docx"
```

---

## Environment Variables

Add these to your `.env` file:

```env
# TTYD Terminal Configuration (Required)
TTYD_BASE_URL="https://ttyd.ekddigital.com"
TTYD_KEY="your-ttyd-api-key"

# Admin API Key (Optional - for production)
ADMIN_API_KEY="your-secure-admin-key"
```

---

## Troubleshooting

### Connection Failed

- Verify `TTYD_BASE_URL` and `TTYD_KEY` in `.env`
- Check if TTYD server is running
- Test with: `curl -X GET http://localhost:3000/api/v1/admin/status`

### Installation Timeout

- Some packages (LibreOffice) take 5-10 minutes to install
- The API has a 10-minute timeout for installations
- Check VPS has sufficient disk space

### Permission Denied

- Ensure VPS user has sudo access
- Check work directory permissions: `chmod 777 /tmp/doc_conversions`

### LibreOffice Not Found

- Run: `POST /api/v1/admin/install` with `{"category": "documents"}`
- Verify with: `GET /api/v1/admin/install?category=documents`
