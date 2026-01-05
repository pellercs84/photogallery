# Deployment Guide - Photo Gallery

This guide walks you through deploying your Photo Gallery to Azure Static Web Apps with Azure Blob Storage.

## Prerequisites

- Azure account with active subscription
- Azure CLI installed ([Download](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli))
- Node.js 18+ installed
- Azure Functions Core Tools ([Download](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local))

## Step 1: Create Azure Resources

### 1.1 Login to Azure

```powershell
az login
```

### 1.2 Create Resource Group

```powershell
az group create --name PhotoGalleryRG --location eastus
```

### 1.3 Create Storage Account

```powershell
# Create storage account (name must be globally unique)
az storage account create `
  --name photogallery2024storage `
  --resource-group PhotoGalleryRG `
  --location eastus `
  --sku Standard_LRS `
  --allow-blob-public-access true

# Get connection string
az storage account show-connection-string `
  --name photogallery2024storage `
  --resource-group PhotoGalleryRG `
  --query connectionString `
  --output tsv
```

**Save the connection string** - you'll need it later!

### 1.4 Create Blob Container

```powershell
az storage container create `
  --name media `
  --account-name photogallery2024storage `
  --public-access blob
```

### 1.5 Configure CORS for Blob Storage

```powershell
az storage cors add `
  --services b `
  --methods GET POST PUT OPTIONS `
  --origins "*" `
  --allowed-headers "*" `
  --exposed-headers "*" `
  --max-age 3600 `
  --account-name photogallery2024storage
```

### 1.6 Create Static Web App

```powershell
az staticwebapp create `
  --name PhotoGallery `
  --resource-group PhotoGalleryRG `
  --location eastus2 `
  --sku Free
```

Get the deployment token:

```powershell
az staticwebapp secrets list `
  --name PhotoGallery `
  --resource-group PhotoGalleryRG `
  --query "properties.apiKey" `
  --output tsv
```

**Save the deployment token** - you'll need it for deployment!

## Step 2: Local Setup and Testing

### 2.1 Install Dependencies

```powershell
cd c:\Workspace\_Own\PhotoGallery

# Install frontend dependencies
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### 2.2 Configure Local Settings

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "YOUR_CONNECTION_STRING_FROM_STEP_1.3",
    "GALLERY_PASSWORD": "family2024"
  }
}
```

Replace `YOUR_CONNECTION_STRING_FROM_STEP_1.3` with the actual connection string.

### 2.3 Test Locally

```powershell
# Start local development server
swa start . --api-location api
```

Open http://localhost:4280 in your browser and test:
- Login with password: `family2024`
- Gallery should load (will be empty until you upload media)

Press `Ctrl+C` to stop the server.

## Step 3: Configure Azure Static Web App

### 3.1 Set Environment Variables

```powershell
az staticwebapp appsettings set `
  --name PhotoGallery `
  --resource-group PhotoGalleryRG `
  --setting-names `
    AZURE_STORAGE_CONNECTION_STRING="YOUR_CONNECTION_STRING" `
    GALLERY_PASSWORD="family2024"
```

Replace `YOUR_CONNECTION_STRING` with your actual connection string.

## Step 4: Deploy to Azure

### 4.1 Deploy Using SWA CLI

```powershell
# Deploy from local machine
swa deploy `
  --app-location . `
  --api-location api `
  --deployment-token "YOUR_DEPLOYMENT_TOKEN_FROM_STEP_1.6"
```

Replace `YOUR_DEPLOYMENT_TOKEN_FROM_STEP_1.6` with the actual deployment token.

### 4.2 Get Your App URL

```powershell
az staticwebapp show `
  --name PhotoGallery `
  --resource-group PhotoGalleryRG `
  --query "defaultHostname" `
  --output tsv
```

Your gallery will be available at: `https://[output].azurestaticapps.net`

## Step 5: Upload Media Using AzCopy

### 5.1 Install AzCopy

**Windows PowerShell:**

```powershell
# Download AzCopy
Invoke-WebRequest -Uri "https://aka.ms/downloadazcopy-v10-windows" -OutFile AzCopy.zip -UseBasicParsing

# Extract
Expand-Archive AzCopy.zip -DestinationPath . -Force

# Move to a permanent location (optional)
Move-Item .\azcopy_windows_amd64_*\azcopy.exe C:\Tools\azcopy.exe

# Add to PATH or use full path
```

### 5.2 Generate SAS Token

```powershell
# Generate SAS token (valid for 2 hours)
$sasToken = az storage container generate-sas `
  --account-name photogallery2024storage `
  --name media `
  --permissions rwl `
  --expiry (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --output tsv

Write-Host "SAS Token: $sasToken"
```

### 5.3 Upload Photos and Videos

**Organize your files locally first:**

```
C:\MyMedia\
  ├── 2023\
  │   ├── IMG_001.jpg
  │   ├── IMG_002.jpg
  │   └── VID_001.mp4
  └── 2024\
      ├── IMG_100.jpg
      └── VID_050.mp4
```

**Upload using AzCopy:**

```powershell
# Upload 2023 media
azcopy copy "C:\MyMedia\2023\*" `
  "https://photogallery2024storage.blob.core.windows.net/media/2023/?$sasToken" `
  --recursive

# Upload 2024 media
azcopy copy "C:\MyMedia\2024\*" `
  "https://photogallery2024storage.blob.core.windows.net/media/2024/?$sasToken" `
  --recursive
```

**Alternative: Upload all at once**

```powershell
# Upload entire folder structure
azcopy copy "C:\MyMedia\*" `
  "https://photogallery2024storage.blob.core.windows.net/media/?$sasToken" `
  --recursive
```

### 5.4 Verify Upload

```powershell
az storage blob list `
  --container-name media `
  --account-name photogallery2024storage `
  --output table
```

## Step 6: Test Your Deployed Gallery

1. Open your gallery URL: `https://[your-app].azurestaticapps.net`
2. Login with password: `family2024`
3. Verify photos and videos appear
4. Test creating albums
5. Test year-based filtering
6. Test video playback

## Updating Your Gallery

### Update Application Code

```powershell
# Make your changes to HTML/CSS/JS
# Then redeploy
swa deploy `
  --app-location . `
  --api-location api `
  --deployment-token "YOUR_DEPLOYMENT_TOKEN"
```

### Add More Media

Just use AzCopy again with new files:

```powershell
# Generate new SAS token
$sasToken = az storage container generate-sas `
  --account-name photogallery2024storage `
  --name media `
  --permissions rwl `
  --expiry (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --output tsv

# Upload new media
azcopy copy "C:\NewPhotos\2025\*" `
  "https://photogallery2024storage.blob.core.windows.net/media/2025/?$sasToken" `
  --recursive
```

Then refresh the gallery in your browser.

## Changing the Password

### Update in Azure

```powershell
az staticwebapp appsettings set `
  --name PhotoGallery `
  --resource-group PhotoGalleryRG `
  --setting-names GALLERY_PASSWORD="new-password-here"
```

### Update in Code

Edit `js/config.js` and change:

```javascript
GALLERY_PASSWORD: 'new-password-here'
```

Then redeploy the application.

## Troubleshooting

### Media Not Loading

1. Check CORS configuration:
   ```powershell
   az storage cors list --account-name photogallery2024storage --services b
   ```

2. Verify container permissions:
   ```powershell
   az storage container show `
     --name media `
     --account-name photogallery2024storage
   ```

3. Check browser console for errors (F12)

### API Functions Not Working

1. Verify environment variables are set:
   ```powershell
   az staticwebapp appsettings list `
     --name PhotoGallery `
     --resource-group PhotoGalleryRG
   ```

2. Check function logs in Azure Portal

### Videos Not Playing

- Ensure videos are in MP4 format (H.264 codec recommended)
- Re-encode if needed:
  ```powershell
  # Using FFmpeg
  ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
  ```

## Cost Estimation

**Current Configuration (Free Tier):**
- Azure Static Web Apps: **Free** (100 GB bandwidth/month)
- Azure Blob Storage (100 GB): **~$2/month**
- Azure Functions: **Free** (1M executions/month included)

**Total: ~$2/month**

## Cleanup (if needed)

To delete all resources:

```powershell
az group delete --name PhotoGalleryRG --yes
```

## Next Steps

1. ✅ Test the gallery thoroughly
2. 📸 Upload your family photos and videos
3. 📁 Create albums to organize media
4. 🔒 Share the URL and password with family members
5. 🎉 Enjoy your personal photo gallery!

## Support Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [Azure Blob Storage Documentation](https://docs.microsoft.com/en-us/azure/storage/blobs/)
- [AzCopy Documentation](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-v10)
- [lightGallery Documentation](https://www.lightgalleryjs.com/)
