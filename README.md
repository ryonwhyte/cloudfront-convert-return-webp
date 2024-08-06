# Image Resizer Lambda

This Lambda edge will be invoked when a request is made to cloudfront for a webp file. If the web file is not available then the regular version of it is returned and cached in cloudfront. This code works along with https://github.com/ryonwhyte/cloudfront-point-to-webp to aid conversion to images to webp with cloudfront.

## Run Locally

Clone the project

```bash
  git clone https://github.com/ryonwhyte/cloudfront-convert-return-webp.git
```

Install Dependencies

```bash
# Install sharpand deps
npm install sharp
```

```bash
# You may need to install differently on mac
npm install --arch=x64 --platform=linux --target=16x sharp
```

## CONSTANT

Remember set the `BUCKET` constant

## Deployment

```bash
npm run package
```

Running the command above will zip your source code and dependencies. The zip can then be uploaded to your Lambda. In case you want to have the inlin code editor you can remove the index.js/index.mjs file from the archive and upload it as a layer. Then zip the index file by itself and upload it normally.
