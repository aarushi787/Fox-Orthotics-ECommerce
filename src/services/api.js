const API_URL = "http://localhost:5001/api"; // <-- Backend running on 5001

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
    this.token = localStorage.getItem("authToken") || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem("authToken", token);
    } else {
      localStorage.removeItem("authToken");
    }
  }

  async request(endpoint, method = "GET", body = null) {
    const headers = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || "API Error");
    }

    if (response.status === 204) return null;

    return response.json();
  }

  // 🔥 NEW: Fetch products + Firestore images
  async getProductsWithImages() {
    const products = await this.request("/products");

    const enhanced = await Promise.all(
      products.map(async (p) => {
        try {
          const images = await this.request(`/images/${encodeURIComponent(p.name)}`);
          return {
            ...p,
            imageUrls: images.urls || []
          };
        } catch (err) {
          console.warn("No images for", p.name);
          return { ...p, imageUrls: [] };
        }
      })
    );

    return enhanced;
  }

  async getProductByIdWithImages(id, name) {
    const product = await this.request(`/products/${id}`);

    try {
      const images = await this.request(`/images/${encodeURIComponent(product.name)}`);
      return {
        ...product,
        imageUrls: images.urls || []
      };
    } catch {
      return { ...product, imageUrls: [] };
    }
  }

  // ========== Normal API ==========

  async getProducts(category = null) {
    const endpoint = category ? `/products?category=${category}` : "/products";
    return this.request(endpoint);
  }

  async getProductById(id) {
    return this.request(`/products/${id}`);
  }
}

const api = new ApiClient();
export default api;
export const getProductsWithImages = api.getProductsWithImages.bind(api);
