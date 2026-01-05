const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Azure Function to save albums configuration to blob storage
 * This persists album data to albums.json in the metadata container
 */
module.exports = async function (context, req) {
    context.log('SaveAlbums function triggered');

    try {
        // Validate request body
        if (!req.body || !req.body.albums) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Albums data is required' })
            };
            return;
        }

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

        // Create BlobServiceClient
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

        // Use 'media' container for metadata
        const containerClient = blobServiceClient.getContainerClient('pellergallery');

        // Ensure container exists
        await containerClient.createIfNotExists();

        // Get blob client for albums.json
        const blobClient = containerClient.getBlockBlobClient('metadata/albums.json');

        // Convert albums to JSON
        const albumsData = JSON.stringify(req.body.albums, null, 2);

        // Upload to blob storage
        await blobClient.upload(albumsData, albumsData.length, {
            blobHTTPHeaders: {
                blobContentType: 'application/json'
            }
        });

        context.log('Albums saved successfully');

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                success: true,
                message: 'Albums saved successfully'
            })
        };

    } catch (error) {
        context.log.error('Error saving albums:', error);

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to save albums',
                message: error.message
            })
        };
    }
};
