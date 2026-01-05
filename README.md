# Family Photo Gallery

A web-based photo and video gallery for personal/family use, hosted on Azure Static Web Apps with Azure Blob Storage backend.

## Features

- 📸 Browse photos and videos with beautiful lightGallery interface
- 🎥 Watch videos online with built-in video player
- 📁 Create and manage albums
- 📅 Navigate by year or albums
- 🔒 Password protected access
- ☁️ Azure Blob Storage for media files
- 🚀 Azure Static Web Apps hosting

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Gallery Library**: [lightGallery](https://www.lightgalleryjs.com/) (MIT License)
- **Backend**: Azure Functions (Node.js)
- **Storage**: Azure Blob Storage
- **Hosting**: Azure Static Web Apps

## Project Structure

```
PhotoGallery/
├── index.html              # Main application page
├── login.html              # Password protection page
├── css/
│   └── styles.css          # Custom styles
├── js/
│   ├── auth.js             # Password authentication
│   ├── app.js              # Main application logic
│   └── config.js           # Configuration
├── api/                    # Azure Functions
│   ├── GetSasToken/
│   ├── GetMediaIndex/
│   └── SaveAlbums/
├── staticwebapp.config.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Azure account
- Azure CLI installed
- Azure Functions Core Tools

### 1. Azure Resources Setup

#### Create Storage Account

```bash
# Create resource group
az group create --name PhotoGalleryRG --location eastus

# Create storage account
az storage account create \
  --name photogallerystorage123 \
  --resource-group PhotoGalleryRG \
  --location eastus \
  --sku Standard_LRS

# Get connection string
az storage account show-connection-string \
  --name photogallerystorage123 \
  --resource-group PhotoGalleryRG

# Create blob container
az storage container create \
  --name media \
  --account-name photogallerystorage123 \
  --public-access off
```

#### Configure CORS

```bash
az storage cors add \
  --services b \
  --methods GET POST PUT OPTIONS \
  --origins "*" \
  --allowed-headers "*" \
  --exposed-headers "*" \
  --max-age 3600 \
  --account-name photogallerystorage123
```

#### Create Static Web App

```bash
az staticwebapp create \
  --name PhotoGallery \
  --resource-group PhotoGalleryRG \
  --location eastus2 \
  --sku Free
```

### 2. Local Development

#### Install Dependencies

```bash
cd PhotoGallery
npm install
```

#### Configure Local Settings

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "YOUR_CONNECTION_STRING_HERE",
    "GALLERY_PASSWORD": "your-password-here"
  }
}
```

#### Run Locally

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Start local development server
swa start . --api-location api
```

Open http://localhost:4280 in your browser.

### 3. Deployment

#### One-Time Deployment from Local Machine

```bash
# Build and deploy
swa deploy \
  --app-location . \
  --api-location api \
  --deployment-token YOUR_DEPLOYMENT_TOKEN
```

To get your deployment token:

```bash
az staticwebapp secrets list \
  --name PhotoGallery \
  --resource-group PhotoGalleryRG \
  --query "properties.apiKey" -o tsv
```

#### Set Environment Variables in Azure

```bash
az staticwebapp appsettings set \
  --name PhotoGallery \
  --resource-group PhotoGalleryRG \
  --setting-names AZURE_STORAGE_CONNECTION_STRING="YOUR_CONNECTION_STRING" GALLERY_PASSWORD="your-password"
```

## Bulk Upload Instructions (AzCopy)

### Install AzCopy

**Windows:**
```powershell
# Download and extract AzCopy
Invoke-WebRequest -Uri "https://aka.ms/downloadazcopy-v10-windows" -OutFile AzCopy.zip
Expand-Archive AzCopy.zip -DestinationPath .
# Add to PATH or use full path to azcopy.exe
```

**macOS/Linux:**
```bash
# Download and install
wget https://aka.ms/downloadazcopy-v10-linux
tar -xvf downloadazcopy-v10-linux
sudo cp ./azcopy_linux_amd64_*/azcopy /usr/bin/
```

### Upload Photos and Videos

1. **Get SAS Token** (from Azure Portal or CLI):

```bash
# Generate SAS token for container (valid for 1 hour)
az storage container generate-sas \
  --account-name photogallerystorage123 \
  --name media \
  --permissions rwl \
  --expiry $(date -u -d "1 hour" '+%Y-%m-%dT%H:%MZ') \
  --output tsv
```

2. **Upload Using AzCopy**:

```bash
# Upload all photos from a local folder to 2024/photos/
azcopy copy "C:\MyPhotos\2024\*" \
  "https://photogallerystorage123.blob.core.windows.net/media/2024/photos?YOUR_SAS_TOKEN" \
  --recursive

# Upload videos
azcopy copy "C:\MyVideos\2024\*" \
  "https://photogallerystorage123.blob.core.windows.net/media/2024/videos?YOUR_SAS_TOKEN" \
  --recursive
```

3. **Recommended Folder Structure**:

```
media/
  ├── 2023/
  │   ├── photos/
  │   └── videos/
  ├── 2024/
  │   ├── photos/
  │   └── videos/
  └── 2025/
      ├── photos/
      └── videos/
```

### Upload from Mobile Phone

1. Transfer photos/videos from mobile to computer:
   - **USB cable**: Connect phone and copy files
   - **Cloud sync**: Use Google Photos, iCloud, OneDrive, etc.
   - **File sharing**: AirDrop (iOS/Mac), Nearby Share (Android)

2. Organize files by year on your computer

3. Use AzCopy to bulk upload to Azure Blob Storage

## Configuration

### Change Password

Update the password in Azure Static Web Apps settings:

```bash
az staticwebapp appsettings set \
  --name PhotoGallery \
  --resource-group PhotoGalleryRG \
  --setting-names GALLERY_PASSWORD="new-password"
```

Also update in `js/config.js` for client-side verification (or fetch from API).

### Supported Media Formats

**Images:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**Videos:**
- MP4 (.mp4)
- WebM (.webm)
- OGG (.ogg)

## Usage

1. **Access the Gallery**: Navigate to your Azure Static Web App URL
2. **Login**: Enter the configured password
3. **Browse**: View all photos and videos in the gallery
4. **Filter by Year**: Click on a year to view media from that year
5. **Create Albums**: Select photos/videos and create custom albums
6. **View Full Size**: Click any image/video to open in lightbox
7. **Watch Videos**: Videos play directly in the gallery viewer

## Troubleshooting

### Images Not Loading

- Check CORS configuration on Storage Account
- Verify SAS token is valid and not expired
- Check browser console for errors

### Videos Not Playing

- Ensure video format is supported (MP4 recommended)
- Check video codec (H.264 recommended)
- Try re-encoding video with HandBrake or FFmpeg

### Password Not Working

- Verify `GALLERY_PASSWORD` environment variable is set in Azure
- Clear browser cache and cookies
- Check browser console for authentication errors

## Security Notes

⚠️ **Important**: This implementation uses basic JavaScript password protection, which is suitable for lightweight security but not for highly sensitive content. The password can potentially be found by inspecting the code or network requests.

For enhanced security:
- Upgrade to Azure Static Web Apps Standard SKU and use built-in password protection
- Implement Azure Active Directory authentication
- Use private blob containers with short-lived SAS tokens

## License

This project uses the following open-source libraries:
- [lightGallery](https://github.com/sachinchoolur/lightGallery) - MIT License

## Support

For issues or questions:
- Check Azure Static Web Apps documentation
- Review lightGallery documentation
- Check Azure Blob Storage documentation
