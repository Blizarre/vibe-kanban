import { useState, useEffect, useCallback, useMemo } from "react";
import { Category } from "../types";

// Use environment variable for API base URL, fallback to current origin or localhost
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:8000");

export interface UseCategoriesResult {
  categories: Category[];
  categoriesById: Record<string, Category>;
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (name: string, color: string) => Promise<Category | null>;
  updateCategory: (
    categoryId: string,
    updates: Partial<Omit<Category, "id">>,
  ) => Promise<boolean>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
}

export const useCategories = (): UseCategoriesResult => {
  const [categoriesById, setCategoriesById] = useState<
    Record<string, Category>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => Object.values(categoriesById),
    [categoriesById],
  );

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Record<string, Category> = await response.json();
      setCategoriesById(data);
    } catch (e) {
      console.error("Failed to fetch categories:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setCategoriesById({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = useCallback(
    async (name: string, color: string): Promise<Category | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newCategory: Category = await response.json();

        // Add to state
        setCategoriesById((prev) => ({
          ...prev,
          [newCategory.id]: newCategory,
        }));

        return newCategory;
      } catch (e) {
        console.error("Failed to create category:", e);
        setError(e instanceof Error ? e.message : "Failed to create category");
        return null;
      }
    },
    [],
  );

  const updateCategory = useCallback(
    async (
      categoryId: string,
      updates: Partial<Omit<Category, "id">>,
    ): Promise<boolean> => {
      // Store original state for rollback
      const originalState = categoriesById;

      // Apply optimistic update
      setCategoriesById((prev) => ({
        ...prev,
        [categoryId]: { ...prev[categoryId], ...updates },
      }));

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/categories/${categoryId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
      } catch (e) {
        console.error("Failed to update category:", e);
        setError(e instanceof Error ? e.message : "Failed to update category");
        setCategoriesById(originalState);
        return false;
      }
    },
    [categoriesById],
  );

  const deleteCategory = useCallback(
    async (categoryId: string): Promise<boolean> => {
      // Store original state for rollback
      const originalState = categoriesById;

      // Apply optimistic update
      setCategoriesById((prev) => {
        const updated = { ...prev };
        delete updated[categoryId];
        return updated;
      });

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/categories/${categoryId}`,
          {
            method: "DELETE",
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return true;
      } catch (e) {
        console.error("Failed to delete category:", e);
        setError(e instanceof Error ? e.message : "Failed to delete category");
        setCategoriesById(originalState);
        return false;
      }
    },
    [categoriesById],
  );

  return {
    categories,
    categoriesById,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
