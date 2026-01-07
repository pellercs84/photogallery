const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'pellergallery'; // Assuming same container
// Note: If container name is dynamic or different, it should be in settings, but 'pellergallery' is used in other functions.

module.exports = async function (context, req) {
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    };

    if (req.method === 'OPTIONS') {
        context.res.status = 204;
        return;
    }

    const { id } = req.query; // Expecting blob name as 'id'

    if (!id) {
        context.res = {
            status: 400,
            body: "Please pass an id (blob name) on the query string"
        };
        return;
    }

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Delete original blob
        const blockBlobClient = containerClient.getBlockBlobClient(id);
        const deleteResponse = await blockBlobClient.deleteIfExists();

        // Delete thumbnail
        // Try both raw name and .jpg for video logic
        let thumbName = id;
        if (id.toLowerCase().match(/\.(mp4|mov|webm|avi|mkv)$/)) {
            const ext = id.substring(id.lastIndexOf('.'));
            thumbName = id.replace(ext, '.jpg');
        }

        const thumbPath = `thumbnails/${thumbName}`;
        const thumbClient = containerClient.getBlockBlobClient(thumbPath);
        await thumbClient.deleteIfExists();

        context.res = {
            status: 200,
            body: { message: `Successfully deleted ${id}` }
        };

    } catch (error) {
        context.log.error(`Error deleting ${id}:`, error);
        context.res = {
            status: 500,
            body: { error: error.message }
        };
    }
};
