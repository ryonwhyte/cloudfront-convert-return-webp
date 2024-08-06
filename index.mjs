import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import Sharp from 'sharp';
import path from 'path';

// Constants
const BUCKET = 'bucketname';  // Your S3 bucket name
const QUALITY = 75;  // Quality setting for WebP conversion

// Initialize S3 client with region
const s3 = new S3Client({ region: 'us-east-2' }); //Must use region

export const handler = async (event, context, callback) => {
    const { request, response } = event.Records[0].cf;  // Extract request and response from CloudFront event
    const { uri } = request;  // Requested URI
    const headers = response.headers;  // Response headers

    // Check if the requested URI is for a WebP image
    if (path.extname(uri) === '.webp') {
        // Handle case where the WebP image is not found
        if (response.status === '404') {
            // Get the original image format from the request headers
            const format = request.headers['original-resource-type'] && request.headers['original-resource-type'][0]
                ? request.headers['original-resource-type'][0].value.replace('image/', '')
                : null;

            // Construct the key for the original image in S3
            const optimizedKey = uri.substring(1);  // Remove leading slash
            const originalKey = optimizedKey.replace('/optimized/', '/original/').replace('.webp', `.${format}`);

            try {
                // Get the original image from S3
                const bucketResource = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: originalKey }));
                // Convert the S3 stream to a buffer
                const originalImageBuffer = await streamToBuffer(bucketResource.Body);

                // Convert the original image buffer to WebP format
                const sharpImageBuffer = await Sharp(originalImageBuffer)
                    .webp({ quality: + QUALITY })
                    .toBuffer();

                // Upload the converted WebP image back to S3
                await s3.send(new PutObjectCommand({
                    Body: sharpImageBuffer,
                    Bucket: BUCKET,
                    ContentType: 'image/webp',
                    CacheControl: 'max-age=7884000',  // Cache the image for 90 days - seconds
                    Key: optimizedKey
                }));

                // Modify the response to return the WebP image
                response.status = '200';
                response.body = sharpImageBuffer.toString('base64');  // Encode the buffer as base64
                response.bodyEncoding = 'base64';  // Indicate the body is base64 encoded
                response.headers['content-type'] = [{ key: 'Content-Type', value: 'image/webp' }];
                response.headers['cache-control'] = [{ key: 'Cache-Control', value: 'max-age=7884000' }];
            } catch (error) {
                console.error('Error processing image:', error);
            }
        } else {
            // If WebP image is found, set the content-type header
            headers['content-type'] = [{
                'value': 'image/webp',
                'key': 'Content-Type'
            }];
        }
    }

    //Set content type for css// This may not be necessary
    if (path.extname(uri) === '.css') {
      console.log("Detected a CSS: ", response.headers);
      response.headers['content-type'] = [{ key: 'Content-Type', value: 'text/css' }];
      console.log("Updated css headers: ", response.headers);
    }
    //Set content type for .js
    if (path.extname(uri) === '.js') {
      response.headers['content-type'] = [{ key: 'Content-Type', value: 'text/javascript' }];
    }

    // Return the modified or original response
    callback(null, response)
};

// Helper function to convert a stream to a buffer
const streamToBuffer = (stream) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));  // Collect chunks of data
    stream.on('end', () => resolve(Buffer.concat(chunks)));  // Resolve with the concatenated buffer
    stream.on('error', reject);  // Reject the promise on error
});
