import { Product } from "../types/Product";

export async function fetchRandomProduct(): Promise<Product> {
  try {
    const res = await fetch("https://dummyjson.com/products");
    const data = await res.json();

    const products: Product[] = data.products;
    const randomIndex = Math.floor(Math.random() * products.length);
    
    return {
      id: products[randomIndex].id,
      title: products[randomIndex].title,
      price: products[randomIndex].price,
      description: products[randomIndex].description,
      category: products[randomIndex].category,
      image: products[randomIndex].image,
    };
  } catch (error) {
    console.error("Failed to fetch product:", error);
    throw error;
  }
}
