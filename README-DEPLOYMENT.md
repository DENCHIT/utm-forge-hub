# UTM Link Creator - Hostinger Deployment Guide

## Prerequisites

1. **Hostinger Shared Hosting Account** with:
   - PHP 7.4+ support
   - MySQL database
   - FTP access

2. **GitHub Repository** connected to your project

## Setup Instructions

### 1. Database Setup

1. Create a MySQL database in your Hostinger control panel
2. Import the database schema: `api/schema.sql`
3. Note your database credentials:
   - Host (usually `localhost`)
   - Database name
   - Username
   - Password

### 2. API Configuration

1. Copy `api/config.example.php` to `api/config.php`
2. Update the database credentials in `api/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_username'); 
define('DB_PASS', 'your_password');
```

3. Upload `api/config.php` to your server (this file is ignored by Git for security)

### 3. GitHub Actions Setup

1. In your GitHub repository, go to Settings → Secrets and Variables → Actions
2. Add the following secrets:
   - `FTP_HOST`: Your Hostinger FTP host (e.g., `ftp.yourdomain.com`)
   - `FTP_USERNAME`: Your FTP username
   - `FTP_PASSWORD`: Your FTP password

### 4. Domain Configuration

The deployment assumes your app will be at `yourdomain.com/utm/`. If you want it at the root:

1. Change `server-dir: ./public_html/utm/` to `server-dir: ./public_html/` in `.github/workflows/deploy.yml`
2. Update the API base URL in `src/lib/api.ts` if needed

### 5. Deploy

1. Push your code to the `main` branch
2. GitHub Actions will automatically:
   - Build the frontend
   - Deploy files to your Hostinger account via FTP

## File Structure on Server

```
public_html/utm/
├── index.html          # Built frontend
├── assets/            # CSS, JS, images
├── api/              # PHP backend
│   ├── config.php    # Database config
│   ├── db.php        # Database connection
│   ├── list_links.php # Get links
│   ├── insert_link.php # Create links
│   ├── delete_link.php # Delete links
│   ├── get_options.php # Get UTM options
│   ├── get_settings.php # Get settings
│   └── insert_campaign.php # Create campaigns
└── .htaccess         # SPA routing
```

## API Endpoints

- `GET /api/list_links.php` - Get all UTM links
- `POST /api/insert_link.php` - Create new UTM link
- `DELETE /api/delete_link.php/{id}` - Delete UTM link
- `GET /api/get_options.php` - Get UTM options (sources, mediums, campaigns)
- `GET /api/get_settings.php` - Get UTM settings
- `POST /api/insert_campaign.php` - Create new campaign option

## Troubleshooting

### Database Issues
- Ensure MySQL version is 5.7+ for JSON column support
- Check database permissions for your user
- Verify the database connection in `api/config.php`

### FTP Deployment Issues
- Check FTP credentials in GitHub Secrets
- Ensure the target directory exists: `public_html/utm/`
- Verify FTP permissions allow file uploads

### API Issues
- Check PHP error logs in your Hostinger control panel
- Ensure `api/config.php` exists with correct credentials
- Verify CORS headers if accessing from different domain

### Frontend Issues
- Check that `.htaccess` is properly uploaded
- Ensure the base URL in `src/lib/api.ts` matches your domain structure
- Verify all asset paths are correct after build

## Security Notes

- `api/config.php` contains sensitive database credentials and is excluded from Git
- Ensure your database user has minimal required permissions
- Consider adding rate limiting for production use
- The app uses simple password protection - consider implementing proper authentication for production

## Manual Deployment Alternative

If GitHub Actions doesn't work:

1. Build locally: `npm run build`
2. Create `upload/` folder
3. Copy `dist/*` to `upload/`
4. Copy `api/` to `upload/api/`
5. Upload `upload/` contents to your server via FTP