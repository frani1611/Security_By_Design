const cloudinary = require('cloudinary').v2;

// Konfiguration für Cloudinary
// Support two common configuration styles:
// 1) Explicit env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
// 2) Single URL env var: CLOUDINARY_URL (preferred in some deploy environments)
try {
  if (process.env.CLOUDINARY_URL) {
    // cloudinary accepts a single URL value
    cloudinary.config({ url: process.env.CLOUDINARY_URL });
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
} catch (cfgErr) {
  // Log and continue; uploadBuffer will report meaningful errors if config invalid
  console.error('Cloudinary config error:', cfgErr && (cfgErr.stack || cfgErr));
}

// Helper: upload a Buffer via upload_stream and return a Promise
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
};

module.exports = {
  cloudinary,
  uploadBuffer,
};