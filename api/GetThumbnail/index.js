const { BlobServiceClient } = require('@azure/storage-blob');
const { Jimp } = require('jimp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const streamPipeline = promisify(require('stream').pipeline);

// Configure ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Azure Function to get or generate thumbnails on demand
 */
module.exports = async function (context, req) {
    // Enable for debugging
    // context.log('GetThumbnail function triggered');

    try {
        const fileName = req.query.file;

        if (!fileName) {
            context.res = {
                status: 400,
                body: "Please pass a file name on the query string"
            };
            return;
        }

        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error('Storage connection not configured');
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient('pellergallery');

        // 1. Check if thumbnail already exists
        const thumbnailPath = `thumbnails/${fileName}.jpg`;
        const thumbnailBlockBlobClient = containerClient.getBlockBlobClient(thumbnailPath);

        const thumbnailExists = await thumbnailBlockBlobClient.exists();

        if (thumbnailExists) {
            // Redirect to existing thumbnail
            context.res = {
                status: 302,
                headers: {
                    'Location': thumbnailBlockBlobClient.url,
                    'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
                },
                body: null
            };
            return;
        }

        // 2. Generate Thumbnail
        context.log(`Generating thumbnail for ${fileName}...`);

        // Check if source file exists
        const sourceBlobClient = containerClient.getBlobClient(fileName);
        if (!await sourceBlobClient.exists()) {
            context.res = {
                status: 404,
                body: "Source file not found"
            };
            return;
        }

        // Determine if image or video
        const extension = path.extname(fileName).toLowerCase();
        const isVideo = ['.mp4', '.webm', '.ogg', '.mov'].includes(extension);

        // Download source to temp file
        const tempFilePath = path.join(os.tmpdir(), `source-${Date.now()}${extension}`);
        const tempThumbnailPath = path.join(os.tmpdir(), `thumb-${Date.now()}.jpg`);

        try {
            // Download
            const downloadResponse = await sourceBlobClient.download();
            const writeStream = fs.createWriteStream(tempFilePath);
            await streamPipeline(downloadResponse.readableStreamBody, writeStream);

            // Process
            if (isVideo) {
                // Extract frame
                await new Promise((resolve, reject) => {
                    ffmpeg(tempFilePath)
                        .screenshots({
                            timestamps: ['10%'], // Take screenshot at 10% mark
                            filename: path.basename(tempThumbnailPath),
                            folder: path.dirname(tempThumbnailPath),
                            size: '320x?'
                        })
                        .on('end', resolve)
                        .on('error', reject);
                });
            } else {
                // Resize image
                const image = await Jimp.read(tempFilePath);
                await image
                    .resize(320, Jimp.AUTO) // Resize to 320px width, auto height
                    .quality(80) // JPEG quality
                    .writeAsync(tempThumbnailPath);
            }

            // Upload thumbnail
            const fileContent = await fs.promises.readFile(tempThumbnailPath);
            await thumbnailBlockBlobClient.upload(fileContent, fileContent.length, {
                blobHTTPHeaders: {
                    blobContentType: 'image/jpeg',
                    blobCacheControl: 'public, max-age=31536000'
                }
            });

            // Return success/redirect
            context.res = {
                status: 302,
                headers: {
                    'Location': thumbnailBlockBlobClient.url,
                    'Cache-Control': 'public, max-age=31536000'
                },
                body: null
            };

        } finally {
            // Cleanup temp files
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (fs.existsSync(tempThumbnailPath)) fs.unlinkSync(tempThumbnailPath);
        }

    } catch (error) {
        context.log.error('Error in GetThumbnail:', error);
        context.res = {
            status: 500,
            body: `Error generating thumbnail: ${error.message}`
        };
    }
};
