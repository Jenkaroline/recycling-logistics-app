import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../service/firebaseConfig";

const STORAGE_KEY = "recycling-types-v1";

export type RecyclingDifficulty = "facil" | "medio" | "dificil";

const XP_BY_DIFFICULTY: Record<RecyclingDifficulty, number> = {
  facil: 10,
  medio: 20,
  dificil: 35,
};

export type RecyclingType = {
  id: string;
  type: string;
  icon: string;
  hint?: string;
  isCustom: boolean;
  difficulty: RecyclingDifficulty;
  xp: number;
};

type RecyclingTypesContextValue = {
  types: RecyclingType[];
  addType: (
    t: Omit<RecyclingType, "id" | "difficulty" | "xp"> & {
      difficulty?: RecyclingDifficulty;
      xp?: number;
    },
  ) => Promise<void>;
  deleteType: (id: string) => Promise<void>;
};

const RecyclingTypesContext = createContext<RecyclingTypesContextValue | null>(null);

const DEFAULT_TYPES: RecyclingType[] = [
  { id: "r-1", type: "Coletar", icon: "bottle-soda-outline", hint: "Colete latinhas, garrafas PETs e outros materiais.", isCustom: false, difficulty: "facil", xp: XP_BY_DIFFICULTY.facil },
  { id: "r-2", type: "Separar recicláveis", icon: "recycle", hint: "Separe plástico, metal, vidro e papel corretamente.", isCustom: false, difficulty: "medio", xp: XP_BY_DIFFICULTY.medio },
  { id: "r-3", type: "Doações", icon: "gift-outline", hint: "Doar eletrônicos, roupas e outros itens em bom estado promove a sustentabilidade.", isCustom: false, difficulty: "medio", xp: XP_BY_DIFFICULTY.medio },
  { id: "r-4", type: "Escolher copo de papel", icon: "cup-water", hint: "Prefira copos biodegradáveis em lojas parceiras.", isCustom: false, difficulty: "facil", xp: XP_BY_DIFFICULTY.facil },
  { id: "r-5", type: "Usar ecobag", icon: "shopping-outline", hint: "Leve sua própria sacola reutilizável nas compras.", isCustom: false, difficulty: "facil", xp: XP_BY_DIFFICULTY.facil },
  { id: "r-6", type: "Descartar eletrônicos", icon: "cellphone-link", hint: "Leve pilhas e eletrônicos para ecopontos.", isCustom: false, difficulty: "dificil", xp: XP_BY_DIFFICULTY.dificil },
];

export function RecyclingTypesProvider({ children }: { children: React.ReactNode }) {
  const [types, setTypes] = useState<RecyclingType[]>(DEFAULT_TYPES);

  useEffect(() => {
    let unsubscribeTypes = () => {};
    let isActive = true;

    const bindForUser = async (uid: string | null) => {
      unsubscribeTypes();
      setTypes(DEFAULT_TYPES);

      if (!uid) {
        return;
      }

      const legacyRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        try {
          const parsed = JSON.parse(legacyRaw) as Array<
            Omit<RecyclingType, "difficulty" | "xp"> & {
              difficulty?: RecyclingDifficulty;
              xp?: number;
            }
          >;
          await Promise.all(
            parsed
              .filter((type) => type.isCustom)
              .map((type) => {
                const difficulty = type.difficulty || "medio";
                return setDoc(
                  doc(db, "users", uid, "recyclingTypes", type.id),
                  {
                    ...type,
                    difficulty,
                    xp: Number(type.xp || XP_BY_DIFFICULTY[difficulty]),
                    createdAt: serverTimestamp(),
                  },
                  { merge: true },
                );
              }),
          );
          await AsyncStorage.removeItem(STORAGE_KEY);
        } catch {
          // Ignore migration failures and fall back to Firestore state.
        }
      }

      if (!isActive) {
        return;
      }

      const typesQuery = query(
        collection(db, "users", uid, "recyclingTypes"),
        orderBy("createdAt", "asc"),
      );

      unsubscribeTypes = onSnapshot(typesQuery, (snapshot) => {
        const customTypes: RecyclingType[] = snapshot.docs.map((typeSnap) => {
          const data = typeSnap.data() as Partial<RecyclingType>;
          const difficulty = data.difficulty || "medio";
          return {
            id: typeSnap.id,
            type: data.type || "",
            icon: data.icon || "recycle",
            hint: data.hint,
            isCustom: true,
            difficulty,
            xp: Number(data.xp || XP_BY_DIFFICULTY[difficulty]),
          };
        });

        setTypes([...DEFAULT_TYPES, ...customTypes]);
      });
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      void bindForUser(user?.uid || null);
    });

    void bindForUser(auth.currentUser?.uid || null);

    return () => {
      isActive = false;
      unsubscribeTypes();
      unsubscribeAuth();
    };
  }, []);

  const persist = async (next: RecyclingType[]) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const existingCustomIds = new Set(types.filter((type) => type.isCustom).map((type) => type.id));
    const nextCustomIds = new Set(next.filter((type) => type.isCustom).map((type) => type.id));

    await Promise.all(
      next
        .filter((type) => type.isCustom)
        .map((type) =>
          setDoc(
            doc(db, "users", uid, "recyclingTypes", type.id),
            {
              ...type,
              createdAt: serverTimestamp(),
            },
            { merge: true },
          ),
        ),
    );

    await Promise.all(
      [...existingCustomIds]
        .filter((id) => !nextCustomIds.has(id))
        .map((id) => deleteDoc(doc(db, "users", uid, "recyclingTypes", id))),
    );

    setTypes(next);
  };

  const addType = async (
    t: Omit<RecyclingType, "id" | "difficulty" | "xp"> & {
      difficulty?: RecyclingDifficulty;
      xp?: number;
    },
  ) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const difficulty = t.difficulty || "medio";
    const newType: RecyclingType = {
      ...t,
      id: `custom-r-${Date.now()}`,
      difficulty,
      xp: Number(t.xp || XP_BY_DIFFICULTY[difficulty]),
    };
    await setDoc(
      doc(db, "users", uid, "recyclingTypes", newType.id),
      {
        ...newType,
        createdAt: serverTimestamp(),
      },
      { merge: true },
    );
    setTypes([...types, newType]);
  };

  const deleteType = async (id: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("Usuário não autenticado.");
    }

    const target = types.find((x) => x.id === id);
    if (!target || !target.isCustom) return;
    await deleteDoc(doc(db, "users", uid, "recyclingTypes", id));
    setTypes(types.filter((x) => x.id !== id));
  };

  return (
    <RecyclingTypesContext.Provider value={{ types, addType, deleteType }}>
      {children}
    </RecyclingTypesContext.Provider>
  );
}

export function useRecyclingTypes() {
  const ctx = useContext(RecyclingTypesContext);
  if (!ctx) throw new Error("useRecyclingTypes must be used within RecyclingTypesProvider");
  return ctx;
}
