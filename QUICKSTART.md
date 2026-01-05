# Quick Start Guide

Get your Photo Gallery running in 5 minutes!

## Prerequisites

- Azure account ([Create free account](https://azure.microsoft.com/free/))
- Azure CLI installed
- Node.js 18+ installed

## Quick Setup

### 1. Clone/Download Project

You already have the project at: `c:\Workspace\_Own\PhotoGallery`

### 2. Install Dependencies

```powershell
cd c:\Workspace\_Own\PhotoGallery
npm install
cd api
npm install
cd ..
```

### 3. Create Azure Resources (5 minutes)

```powershell
# Login
az login

# Create everything at once
az group create --name rg-photogallery --location northeurope

# Create storage (replace 'yourname2024' with something unique)
az storage account create `
  --name saphotogallery `
  --resource-group rg-photogallery `
  --location northeurope `
  --sku Standard_LRS `
  --allow-blob-public-access true

# Get connection string (SAVE THIS!)
$connString = az storage account show-connection-string `
  --name saphotogallery `
  --resource-group rg-photogallery `
  --query connectionString `
  --output tsv

# Create container
az storage container create `
  --name media `
  --account-name pellergallery `
  --public-access blob

# Configure CORS
az storage cors add `
  --services b `
  --methods GET POST PUT OPTIONS `
  --origins "*" `
  --allowed-headers "*" `
  --exposed-headers "*" `
  --max-age 3600 `
  --account-name pellergallery

# Create Static Web App
az staticwebapp create `
  --name PhotoGallery `
  --resource-group rg-photogallery `
  --location westeurope `
  --sku Free

# Get deployment token (SAVE THIS!)
$deployToken = az staticwebapp secrets list `
  --name PhotoGallery `
  --resource-group rg-photogallery `
  --query "properties.apiKey" `
  --output tsv
```

### 4. Configure Local Settings

Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "PASTE_YOUR_CONNECTION_STRING_HERE",
    "GALLERY_PASSWORD": "family2024"
    "DEPLOYMENT_TOKEN": "fbbada0d07d236b0cf5091181d9b9e0963ae707ba17f769e2cda6a7c106bfd5102-e8f0f403-4207-4877-8a70-e26a3c63256300321170fc215d03"
  }
}
```

### 5. Test Locally

```powershell
swa start . --api-location api
```

Open http://localhost:4280 and login with password: `family2024`

### 6. Deploy to Azure

```powershell
# Set environment variables in Azure
az staticwebapp appsettings set `
  --name PhotoGallery `
  --resource-group rg-photogallery `
  --setting-names `
    AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;EndpointSuffix=core.windows.net;AccountName=saphotogallery;AccountKey=MagNxafb1aapGsyrnkt1g0RckagV7lNrZd7Q9G17n0TGUNvcnrChd/HSrUqtVYjd1pkFDp55nmEb+ASt/rR9oQ==;BlobEndpoint=https://saphotogallery.blob.core.windows.net/;FileEndpoint=https://saphotogallery.file.core.windows.net/;QueueEndpoint=https://saphotogallery.queue.core.windows.net/;TableEndpoint=https://saphotogallery.table.core.windows.net/" `
    GALLERY_PASSWORD="family2024"

# Deploy
swa deploy `
  --app-location . `
  --api-location api `
  --deployment-token "fbbada0d07d236b0cf5091181d9b9e0963ae707ba17f769e2cda6a7c106bfd5102-e8f0f403-4207-4877-8a70-e26a3c63256300321170fc215d03"
```

### 7. Get Your URL

```powershell
az staticwebapp show `
  --name PhotoGallery `
  --resource-group rg-photogallery `
  --query "defaultHostname" `
  --output tsv
```

Visit: `jolly-pebble-0fc215d03.2.azurestaticapps.net`

## Upload Photos/Videos

### Option 1: Azure Portal (Easy)
1. Go to Azure Portal → Storage Account → Containers → media
2. Create folder: `2024`
3. Upload files

### Option 2: AzCopy (Fast for bulk)

```powershell
# Install AzCopy
Invoke-WebRequest -Uri "https://aka.ms/downloadazcopy-v10-windows" -OutFile AzCopy.zip
Expand-Archive AzCopy.zip

# Generate SAS
$sas = az storage container generate-sas `
  --account-name yourname2024gallery `
  --name media `
  --permissions rwl `
  --expiry (Get-Date).AddHours(2).ToString("yyyy-MM-ddTHH:mm:ssZ") `
  --output tsv

# Upload
.\azcopy_windows_*\azcopy.exe copy "C:\MyPhotos\2024\*" `
  "https://yourname2024gallery.blob.core.windows.net/media/2024/?$sas" `
  --recursive
```

## Default Password

**Password:** `family2024`

**To change:**
1. Edit `js/config.js` → line 7
2. Update Azure setting: `az staticwebapp appsettings set ...`
3. Redeploy

## Troubleshooting

**Media not loading?**
- Check CORS: `az storage cors list --account-name yourname2024gallery --services b`
- Verify container is public: Should show `publicAccess: blob`

**API errors?**
- Check connection string is set in Azure
- View logs in Azure Portal → Static Web App → Functions

**Can't deploy?**
- Verify deployment token is correct
- Check you have Azure Static Web Apps CLI: `npm install -g @azure/static-web-apps-cli`

## Next Steps

✅ Upload your family photos  
✅ Create albums  
✅ Share URL with family  
✅ Enjoy your gallery!

---

For detailed documentation, see:
- [README.md](README.md) - Full project documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Complete deployment guide
- [walkthrough.md](C:\Users\csaba.peller\.gemini\antigravity\brain\855d9c5d-0161-4067-8f39-57abfc52ab87\walkthrough.md) - Implementation details
