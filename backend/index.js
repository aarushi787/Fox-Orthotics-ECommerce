import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Load Firebase service account from environment on Render
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const app = express();
app.use(cors());
app.use(express.json());

// Multer memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ================== IMAGE UPLOAD (LOCAL + STATIC SERVE) ==================
app.post("/uploadImage", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No image uploaded");

    const file = req.file;
    const productName = req.body.productName || "unknown";

    const uploadDir = path.join("uploads", productName);
    fs.mkdirSync(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    fs.writeFileSync(filepath, file.buffer);

    const publicUrl = `${process.env.RENDER_EXTERNAL_URL}/uploads/${productName}/${filename}`;

    res.json({ url: publicUrl });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Serve uploaded images
app.use("/uploads", express.static("uploads"));

// ================== GET PRODUCTS ==================
app.get("/products", async (req, res) => {
  const snap = await db.collection("products").get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

// ================== ADD PRODUCT ==================
app.post("/addProduct", async (req, res) => {
  await db.collection("products").add(req.body);
  res.send("Product added");
});

// ================== TEST API ==================
app.get("/test", (req, res) => {
  res.send("API is LIVE on Render!");
});

app.listen(3000, () => {
  console.log("Backend running on port 3000");
});
