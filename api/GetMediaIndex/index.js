const { BlobServiceClient } = require('@azure/storage-blob');

/**
 * Azure Function to list all media files from Blob Storage
 * Returns organized media index with metadata
 */
module.exports = async function (context, req) {
    context.log('GetMediaIndex function triggered');

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

        // Create BlobServiceClient
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('pellergallery');

        // Check if container exists
        const exists = await containerClient.exists();
        if (!exists) {
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ media: [] })
            };
            return;
        }

        // List all blobs
        const media = [];
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const videoExtensions = ['.mp4', '.webm', '.ogg'];

        for await (const blob of containerClient.listBlobsFlat()) {
            const blobName = blob.name;
            const extension = blobName.substring(blobName.lastIndexOf('.')).toLowerCase();

            // Skip non-media files and thumbnails folder
            if ((!imageExtensions.includes(extension) && !videoExtensions.includes(extension)) || blobName.startsWith('thumbnails/')) {
                continue;
            }

            // Determine media type
            const type = imageExtensions.includes(extension) ? 'image' : 'video';

            // Extract year from path (assumes format: YYYY/...)
            const pathParts = blobName.split('/');
            let year = 'Unknown';
            if (pathParts.length > 0 && /^\d{4}$/.test(pathParts[0])) {
                year = pathParts[0];
            }

            // Get blob URL
            const blobClient = containerClient.getBlobClient(blobName);
            const url = blobClient.url;

            // Create media object
            media.push({
                id: blobName,
                name: blobName.substring(blobName.lastIndexOf('/') + 1),
                url: url,
                thumbnailUrl: `/api/GetThumbnail?file=${encodeURIComponent(blobName)}`,
                type: type,
                year: year,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified
            });
        }

        // Sort by lastModified descending (newest first)
        media.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ media })
        };

    } catch (error) {
        context.log.error('Error in GetMediaIndex:', error);

        context.res = {
            status: 200, // Return 200 even on error to see the body in simple HTTP clients
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Failed to retrieve media',
                message: error.message
            })
        };
    }
};
