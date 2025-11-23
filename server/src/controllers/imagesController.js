const fs = require('fs');
const path = require('path');

// Returns list of image URLs for a given product folder name
const getProductImages = async (req, res) => {
  try {
    const productName = req.params.productName;
    if (!productName)
      return res.status(400).json({ message: 'productName is required' });

    // Main images folder
    const imagesRoot =
      process.env.IMAGES_DIR_PATH ||
      path.join(__dirname, '..', '..', 'images');

    let productDir = path.join(imagesRoot, productName);

    // Debug
    console.log(`[imagesController] imagesRoot=${imagesRoot}`);
    console.log(
      `[imagesController] requested='${productName}' → path='${productDir}', exists=${fs.existsSync(productDir)}`
    );

    // If exact folder not found → try matching folder by normalization
    if (!fs.existsSync(productDir)) {
      const normalize = (str) =>
        (str || '')
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ''); // remove spaces, dashes, symbols

      const targetNorm = normalize(productName);

      const dirs = fs
        .readdirSync(imagesRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      let matched = null;

      for (const d of dirs) {
        const dirNorm = normalize(d.name);

        if (dirNorm === targetNorm) {
          matched = d.name;
          break;
        }

        if (dirNorm.startsWith(targetNorm) || targetNorm.startsWith(dirNorm)) {
          matched = d.name;
          break;
        }
      }

      if (matched) {
        productDir = path.join(imagesRoot, matched);
        console.log(
          `[imagesController] matched folder '${matched}' for request '${productName}'`
        );
      }
    }

    // Final check after matching
    if (!fs.existsSync(productDir)) {
      return res
        .status(404)
        .json({ message: `No images found for product '${productName}'` });
    }

    const files = fs.readdirSync(productDir).filter((file) => {
      const lower = file.toLowerCase();
      return (
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.svg')
      );
    });

    const actualFolder = path.basename(productDir);

    // Build URLs
    const urls = files.map(
      (file) =>
        `/images/${encodeURIComponent(
          actualFolder
        )}/${encodeURIComponent(file)}`
    );

    console.log(
      `[imagesController] returning ${urls.length} images from folder='${actualFolder}'`
    );

    return res.json({ images: urls });
  } catch (err) {
    console.error('Error reading product images:', err);
    return res.status(500).json({
      message: 'Failed to read images',
      details: err.message,
    });
  }
};

module.exports = { getProductImages };
