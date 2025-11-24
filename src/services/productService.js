import { collection, doc, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// Fetch products + first Firestore image 
export async function getProductsWithImages() {
  const res = await fetch("http://localhost:5001/api/products");
  const products = await res.json();

  const updated = await Promise.all(
    products.map(async (product) => {
      try {
        const slug = product.slug;    // e.g. abdominal-belt
        const imagesRef = collection(doc(db, "products", slug), "images");
        const snap = await getDocs(imagesRef);
        const urls = snap.docs.map((doc) => doc.data().url);

        return {
          ...product,
          image: urls[0] || null   // first Firestore image
        };
      } catch (err) {
        console.error(`Image load failed for: ${product.slug}`, err);
        return {
          ...product,
          image: null
        };
      }
    })
  );

  return updated;
}
