const { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } = require('@azure/storage-blob');

/**
 * Azure Function to generate SAS token for blob storage access
 * This allows secure, time-limited access to media files
 */
module.exports = async function (context, req) {
    context.log('GetSasToken function triggered');

    try {
        // Get connection string from environment
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!connectionString) {
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Storage connection not configured' })
            };
            return;
        }

        // Parse connection string to get account name and key
        const matches = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/);
        if (!matches) {
            throw new Error('Invalid connection string format');
        }

        const accountName = matches[1];
        const accountKey = matches[2];

        // Create shared key credential
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

        // Set permissions (read only)
        const permissions = new BlobSASPermissions();
        permissions.read = true;

        // Set expiry time (1 hour from now)
        const expiryTime = new Date();
        expiryTime.setHours(expiryTime.getHours() + 1);

        // Generate SAS token for container
        const sasToken = generateBlobSASQueryParameters({
            containerName: 'pellergallery',
            permissions: permissions,
            expiresOn: expiryTime
        }, sharedKeyCredential).toString();

        // Construct SAS URL
        const sasUrl = `https://${accountName}.blob.core.windows.net/pellergallery?${sasToken}`;

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                sasToken: sasToken,
                sasUrl: sasUrl,
                expiresOn: expiryTime.toISOString()
            })
        };

    } catch (error) {
        context.log.error('Error generating SAS token:', error);

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to generate SAS token',
                message: error.message
            })
        };
    }
};
