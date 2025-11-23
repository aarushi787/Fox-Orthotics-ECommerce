/**
 * Firebase Image Uploader Script
 * --------------------------------
 * Uploads your local images folder to Firebase Storage:
 *    products/<folderName>/<imageFile>
 * 
 * Supports:
 * - JPG / JPEG / PNG / SVG
 * - Nested folders
 * - Spaces in folder names
 */

import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from "fs";
import path from "path";

const firebaseConfig = {
  apiKey: "AIzaSyALBJNVW7q1m2rAc0HFONw4917m4cdWPT8",
  authDomain: "fox-orthotics-e-commerce.firebaseapp.com",
  projectId: "fox-orthotics-e-commerce",
  storageBucket: "fox-orthotics-e-commerce.appspot.com",  // FIXED
  messagingSenderId: "973947058376",
  appId: "1:973947058376:web:800777c04e4f3b374d4dfd",
  measurementId: "G-P2MYC12NQN"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Local folder to upload
const LOCAL_IMAGES_DIR = path.join(process.cwd(), "images");

// Allowed image extensions
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".svg"];

/**
 * Recursively finds all image files inside the local folder
 */
function getAllImageFiles(dir, base = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);

    if (entry.isDirectory()) {
      files = files.concat(getAllImageFiles(fullPath, relativePath));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        files.push(relativePath);
      }
    }
  }

  return files;
}

/**
 * Uploads each file to Firebase Storage
 */
async function uploadImages() {
  console.log("🚀 Scanning local images folder...");

  if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
    console.error("❌ ERROR: 'images' folder not found.");
    process.exit(1);
  }

  const imageFiles = getAllImageFiles(LOCAL_IMAGES_DIR);

  if (imageFiles.length === 0) {
    console.error("❌ No image files found to upload.");
    return;
  }

  console.log(`📸 Found ${imageFiles.length} files to upload.\n`);

  for (const fileRelPath of imageFiles) {
    const localPath = path.join(LOCAL_IMAGES_DIR, fileRelPath);

    // Firebase destination: products/<folderName>/<filename>
    const storagePath = path.join("products", fileRelPath).replace(/\\/g, "/");

    try {
      const fileBuffer = fs.readFileSync(localPath);
      const fileRef = ref(storage, storagePath);

      console.log(`⬆️ Uploading: ${storagePath}`);

      await uploadBytes(fileRef, fileBuffer);

      const url = await getDownloadURL(fileRef);

      console.log(`✔ Uploaded: ${url}\n`);

    } catch (err) {
      console.error(`❌ Failed to upload ${fileRelPath}:`, err.message);
    }
  }

  console.log("🎉 Upload complete!");
}

uploadImages();
