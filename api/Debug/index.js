const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('Debug function triggered');

    const status = {
        nodeVersion: process.version,
        envVarPresent: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: 'pellergallery', // Hardcoded for now
        connectivity: 'pending',
        error: null
    };

    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

        if (!connectionString) {
            throw new Error('AZURE_STORAGE_CONNECTION_STRING is missing');
        }

        // Test connectivity
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('pellergallery');

        const exists = await containerClient.exists();
        status.containerExists = exists;
        status.connectivity = 'success';

    } catch (error) {
        status.connectivity = 'failed';
        status.error = {
            message: error.message,
            stack: error.stack
        };
    }

    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status, null, 2)
    };
};
