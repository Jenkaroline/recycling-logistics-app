import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

const CATEGORIES_STORAGE_KEY = "plastic-categories-v1";

export type PlasticCategory = {
  id: string;
  name: string;
  weightGrams: number;
  icon: string;
  isCustom: boolean;
};

type PlasticCategoriesContextValue = {
  categories: PlasticCategory[];
  addCategory: (category: Omit<PlasticCategory, "id">) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
};

const PlasticCategoriesContext =
  createContext<PlasticCategoriesContextValue | null>(null);

const DEFAULT_CATEGORIES: PlasticCategory[] = [
  {
    id: "1",
    name: "Sacola Plástica",
    weightGrams: 5,
    icon: "shopping-outline",
    isCustom: false,
  },
  {
    id: "2",
    name: "Garrafa PET",
    weightGrams: 30,
    icon: "bottle-water-outline",
    isCustom: false,
  },
  {
    id: "3",
    name: "Pote Yogurte",
    weightGrams: 20,
    icon: "bowl-outline",
    isCustom: false,
  },
  {
    id: "4",
    name: "Embalagem Comida",
    weightGrams: 15,
    icon: "package-variant-outline",
    isCustom: false,
  },
  {
    id: "5",
    name: "Canudo Plástico",
    weightGrams: 1,
    icon: "straw",
    isCustom: false,
  },
  {
    id: "6",
    name: "Garfo/Colher",
    weightGrams: 2,
    icon: "silverware-fork-knife",
    isCustom: false,
  },
  {
    id: "7",
    name: "Cd/DVD",
    weightGrams: 15,
    icon: "disc-outline",
    isCustom: false,
  },
  {
    id: "8",
    name: "Capa Fone",
    weightGrams: 3,
    icon: "headphones-outline",
    isCustom: false,
  },
];

export function PlasticCategoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] =
    useState<PlasticCategory[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    const loadCategories = async () => {
      const raw = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as PlasticCategory[];
          setCategories([
            ...DEFAULT_CATEGORIES,
            ...parsed.filter((c) => c.isCustom),
          ]);
        } catch {
          setCategories(DEFAULT_CATEGORIES);
        }
      }
    };

    void loadCategories();
  }, []);

  const persist = async (nextCategories: PlasticCategory[]) => {
    const customOnly = nextCategories.filter((c) => c.isCustom);
    await AsyncStorage.setItem(
      CATEGORIES_STORAGE_KEY,
      JSON.stringify(customOnly),
    );
    setCategories(nextCategories);
  };

  const addCategory = async (category: Omit<PlasticCategory, "id">) => {
    const newCategory: PlasticCategory = {
      ...category,
      id: `custom-${Date.now()}`,
    };
    await persist([...categories, newCategory]);
  };

  const deleteCategory = async (id: string) => {
    await persist(categories.filter((c) => c.id !== id));
  };

  return (
    <PlasticCategoriesContext.Provider
      value={{ categories, addCategory, deleteCategory }}
    >
      {children}
    </PlasticCategoriesContext.Provider>
  );
}

export function usePlasticCategories() {
  const context = useContext(PlasticCategoriesContext);
  if (!context) {
    throw new Error(
      "usePlasticCategories deve ser usado dentro do PlasticCategoriesProvider",
    );
  }
  return context;
}
