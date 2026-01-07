const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static');
const { promisify } = require('util');

// Configure ffmpeg and ffprobe
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath.path);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);

// Configuration
const CONFIG = {
    sourceDir: process.argv[2],
    outputDir: process.argv[3] || 'thumbnails',
    thumbWidth: 320,
    quality: 80,
    extensions: {
        images: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.avif', '.heif'],
        videos: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
    }
};

if (!CONFIG.sourceDir) {
    console.error('Usage: node generate-thumbnails.js <source-directory> [output-directory]');
    process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

async function processDirectory(dir, relativePath = '') {
    console.log(`Scanning: ${relativePath || '.'}`);
    try {
        const entries = await readdir(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const relPath = path.join(relativePath, entry);

            // Skip the output directory if it sits inside the source directory
            // We resolve absolute paths to be sure
            if (path.resolve(fullPath).toLowerCase() === path.resolve(CONFIG.outputDir).toLowerCase()) {
                console.log(`Skipping output directory: ${relPath}`);
                continue;
            }

            try {
                const stats = await stat(fullPath);

                if (stats.isDirectory()) {
                    // Create corresponding subdirectory in output
                    const outSubDir = path.join(CONFIG.outputDir, relPath);
                    if (!fs.existsSync(outSubDir)) {
                        await mkdir(outSubDir, { recursive: true });
                    }
                    await processDirectory(fullPath, relPath);
                } else {
                    await processFile(fullPath, relPath);
                }
            } catch (err) {
                console.error(`Error accessing ${fullPath}: ${err.message}`);
            }
        }
    } catch (err) {
        console.error(`Error scanning directory ${dir}: ${err.message}`);
    }
}

async function processFile(filePath, relativePath) {
    const ext = path.extname(filePath).toLowerCase();
    const isImage = CONFIG.extensions.images.includes(ext);
    const isVideo = CONFIG.extensions.videos.includes(ext);

    if (!isImage && !isVideo) return;

    // Output filename (always .jpg for thumbnails)
    let outFileName = relativePath;
    if (isVideo) {
        // Replace extension with .jpg
        const parsed = path.parse(relativePath);
        outFileName = path.join(parsed.dir, parsed.name + '.jpg');
    }

    const outPath = path.join(CONFIG.outputDir, outFileName);

    // Skip if exists
    if (fs.existsSync(outPath)) {
        return;
    }

    console.log(`Generating: ${relativePath} -> ${outFileName}`);

    try {
        if (isImage) {
            // Use sharp for fast image resizing
            // autoRequire is handled by require('sharp')
            await sharp(filePath)
                .rotate() // Auto-rotate based on EXIF
                .resize(CONFIG.thumbWidth) // Auto-height
                .jpeg({ quality: CONFIG.quality })
                .toFile(outPath);

        } else if (isVideo) {
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .screenshots({
                        timestamps: ['10%'],
                        filename: path.basename(outPath),
                        folder: path.dirname(outPath),
                        size: `${CONFIG.thumbWidth}x?`
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        }
    } catch (error) {
        console.error(`Failed to generate thumbnail for ${relativePath}:`, error.message);
    }
}

// Start processing
(async () => {
    try {
        console.log(`Starting thumbnail generation...`);
        console.log(`Source: ${CONFIG.sourceDir}`);
        console.log(`Output: ${CONFIG.outputDir}`);
        await processDirectory(CONFIG.sourceDir);
        console.log('Done!');
    } catch (error) {
        console.error('Fatal error:', error);
    }
})();
