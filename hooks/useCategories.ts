import { useState, useEffect, useCallback, useMemo } from "react";
import { Category } from "../types";
import { API_BASE_URL, checkResponse, optimisticMutate } from "./api";

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
  const handleError = useCallback((e: Error) => setError(e.message), []);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      checkResponse(response, true);
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
        checkResponse(response, true);
        const newCategory: Category = await response.json();

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
      const optimisticState = {
        ...categoriesById,
        [categoryId]: { ...categoriesById[categoryId], ...updates },
      };

      return optimisticMutate(
        categoriesById,
        setCategoriesById,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          }),
        handleError,
      );
    },
    [categoriesById, handleError],
  );

  const deleteCategory = useCallback(
    async (categoryId: string): Promise<boolean> => {
      const optimisticState = { ...categoriesById };
      delete optimisticState[categoryId];

      return optimisticMutate(
        categoriesById,
        setCategoriesById,
        optimisticState,
        () =>
          fetch(`${API_BASE_URL}/api/categories/${categoryId}`, {
            method: "DELETE",
          }),
        handleError,
      );
    },
    [categoriesById, handleError],
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
