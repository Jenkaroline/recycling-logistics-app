import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../service/firebaseConfig";

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
    icon: "bottle-soda-outline",
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
    icon: "package-variant-closed",
    isCustom: false,
  },
  {
    id: "5",
    name: "Canudo Plástico",
    weightGrams: 1,
    icon: "cup-straw-outline",
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
    icon: "compact-disc",
    isCustom: false,
  },
  {
    id: "8",
    name: "Capa Fone",
    weightGrams: 3,
    icon: "headphones",
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
    let unsubscribeCategories = () => {};
    let isActive = true;

    const bindForUser = async (uid: string | null) => {
      unsubscribeCategories();
      setCategories(DEFAULT_CATEGORIES);

      if (!uid) {
        return;
      }

      const legacyRaw = await AsyncStorage.getItem(CATEGORIES_STORAGE_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw) as PlasticCategory[];
          await Promise.all(
            parsed
              .filter((category) => category.isCustom)
              .map((category) =>
                setDoc(
                  doc(db, "users", uid, "plasticCategories", category.id),
                  {
                    ...category,
                    createdAt: serverTimestamp(),
                  },
                  { merge: true },
                ),
              ),
          );
          await AsyncStorage.removeItem(CATEGORIES_STORAGE_KEY);
        } catch {
          // Ignore migration failures and fall back to Firestore state.
        }
      }

      if (!isActive) {
        return;
      }

      const categoriesQuery = query(
        collection(db, "users", uid, "plasticCategories"),
        orderBy("createdAt", "asc"),
      );

      unsubscribeCategories = onSnapshot(
        categoriesQuery,
        (snapshot) => {
          const customCategories = snapshot.docs.map((categorySnap) => {
            const data = categorySnap.data() as Partial<PlasticCategory>;
            return {
              id: categorySnap.id,
              name: data.name || "",
              weightGrams: Number(data.weightGrams || 0),
              icon: data.icon || "shape-outline",
              isCustom: true,
            };
          });

          setCategories([...DEFAULT_CATEGORIES, ...customCategories]);
        },
        (error) => {
          if (error.code === "permission-denied") {
            setCategories(DEFAULT_CATEGORIES);
            return;
          }
          console.warn("Plastic categories listener failed:", error);
        },
      );
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      void bindForUser(user?.uid || null);
    });

    void bindForUser(auth.currentUser?.uid || null);

    return () => {
      isActive = false;
      unsubscribeCategories();
      unsubscribeAuth();
    };
  }, []);

  const persist = async (nextCategories: PlasticCategory[]) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const existingCustomIds = new Set(
      categories.filter((category) => category.isCustom).map((category) => category.id),
    );
    const nextCustomIds = new Set(
      nextCategories.filter((category) => category.isCustom).map((category) => category.id),
    );

    await Promise.all(
      nextCategories
        .filter((category) => category.isCustom)
        .map((category) =>
          setDoc(
            doc(db, "users", uid, "plasticCategories", category.id),
            {
              ...category,
              createdAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
    );

    await Promise.all(
      [...existingCustomIds]
        .filter((id) => !nextCustomIds.has(id))
        .map((id) => deleteDoc(doc(db, "users", uid, "plasticCategories", id))),
    );

    setCategories(nextCategories);
  };

  const addCategory = async (category: Omit<PlasticCategory, "id">) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const newCategory: PlasticCategory = {
      ...category,
      id: `custom-${Date.now()}`,
    };
    await setDoc(
      doc(db, "users", uid, "plasticCategories", newCategory.id),
      {
        ...newCategory,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    setCategories([...categories, newCategory]);
  };

  const deleteCategory = async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const target = categories.find((c) => c.id === id);
    if (!target || !target.isCustom) return;
    await deleteDoc(doc(db, "users", uid, "plasticCategories", id));
    setCategories(categories.filter((c) => c.id !== id));
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
