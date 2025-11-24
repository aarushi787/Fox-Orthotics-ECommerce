/* ------------------------------------------------
   IMPORTS
-------------------------------------------------- */
const fs = require("fs");
const path = require("path");
const { db } = require("../firebase"); // Firestore initialized correctly

/* ------------------------------------------------
   IMAGE ROOT PATH
-------------------------------------------------- */
// const IMAGES_ROOT = path.join(__dirname, "..", "..", "images");
const IMAGES_ROOT = path.join(__dirname, "..", "..", "images");

/* ------------------------------------------------
   AUTO-LOAD IMAGES FROM FOLDER
-------------------------------------------------- */
function loadImagesForProduct(slug, req) {
  const folderPath = path.join(IMAGES_ROOT, slug);

  if (!fs.existsSync(folderPath)) {
    console.warn(`⚠ No image folder for slug: ${slug}`);
    return [];
  }

  const files = fs
    .readdirSync(folderPath)
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const baseUrl = `${req.protocol}://${req.get("host")}/images/${slug}`;

  return files.map((file) => `${baseUrl}/${encodeURIComponent(file)}`);
}

/* ------------------------------------------------
   GET ALL PRODUCTS (Firestore + Local Images)
-------------------------------------------------- */
exports.getAllProducts = async (req, res) => {
  try {
    const snapshot = await db.collection("products").get();

    const products = snapshot.docs.map((doc) => {
      const p = doc.data();
      const images = loadImagesForProduct(p.slug, req);

      return {
        id: doc.id,
        ...p,
        imageUrls: images,
      };
    });

    res.json(products);
  } catch (error) {
    console.error("❌ Firestore fetch error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ------------------------------------------------
   GET PRODUCT BY ID
-------------------------------------------------- */
exports.getProductById = async (req, res) => {
  try {
    const id = req.params.id;

    const doc = await db.collection("products").doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ message: "Product not found" });
    }

    const product = doc.data();
    const images = loadImagesForProduct(product.slug, req);

    res.json({
      id,
      ...product,
      imageUrls: images,
    });
  } catch (error) {
    console.error("❌ Product fetch error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ------------------------------------------------
   CREATE PRODUCT
-------------------------------------------------- */
exports.createProduct = async (req, res) => {
  try {
    const slug = req.body.slug;
    await db.collection("products").doc(slug).set({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Product created" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Create failed" });
  }
};

/* ------------------------------------------------
   UPDATE PRODUCT
-------------------------------------------------- */
exports.updateProduct = async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date(),
    });

    res.json({ message: "Product updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Update failed" });
  }
};

/* ------------------------------------------------
   DELETE PRODUCT
-------------------------------------------------- */
exports.deleteProduct = async (req, res) => {
  try {
    await db.collection("products").doc(req.params.id).delete();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};
