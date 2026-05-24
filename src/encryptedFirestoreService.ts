/**
 * Serviço Firestore com criptografia opcional
 * Fornece camada de abstração para operações no Firestore com dados criptografados
 */

import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    setDoc,
    updateDoc,
    where,
    Query,
    DocumentData,
    FirestoreError,
} from 'firebase/firestore';
import { db } from '../service/firebaseConfig';
import { encryptObject, decryptObject } from './encryptionService';

type CollectionReference = ReturnType<typeof collection>;
type DocumentReference = ReturnType<typeof doc>;

/**
 * Interface para operações de dados com criptografia opcional
 */
export interface EncryptedDocument {
    id: string;
    data: any;
    encrypted: boolean;
}

/**
 * Adiciona um documento ao Firestore com criptografia opcional
 */
export async function addEncryptedDoc(
    collectionName: string,
    data: any,
    encryptFields: string[] = []
): Promise<string> {
    try {
        let processedData = { ...data };

        // Criptografa campos específicos se necessário
        if (encryptFields.length > 0) {
            encryptFields.forEach((field) => {
                if (processedData[field]) {
                    processedData[field] = encryptObject({
                        value: processedData[field],
                    });
                }
            });
        }

        const colRef = collection(db, collectionName);
        const docRef = await addDoc(colRef, processedData);
        return docRef.id;
    } catch (error) {
        console.error(`Erro ao adicionar documento em ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Define um documento no Firestore com criptografia opcional
 */
export async function setEncryptedDoc(
    collectionName: string,
    docId: string,
    data: any,
    encryptFields: string[] = [],
    merge = true
): Promise<void> {
    try {
        let processedData = { ...data };

        // Criptografa campos específicos se necessário
        if (encryptFields.length > 0) {
            encryptFields.forEach((field) => {
                if (processedData[field]) {
                    processedData[field] = encryptObject({
                        value: processedData[field],
                    });
                }
            });
        }

        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, processedData, { merge });
    } catch (error) {
        console.error(`Erro ao definir documento em ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Atualiza um documento no Firestore com criptografia opcional
 */
export async function updateEncryptedDoc(
    collectionName: string,
    docId: string,
    data: any,
    encryptFields: string[] = []
): Promise<void> {
    try {
        let processedData = { ...data };

        // Criptografa campos específicos se necessário
        if (encryptFields.length > 0) {
            encryptFields.forEach((field) => {
                if (processedData[field]) {
                    processedData[field] = encryptObject({
                        value: processedData[field],
                    });
                }
            });
        }

        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, processedData);
    } catch (error) {
        console.error(`Erro ao atualizar documento em ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Obtém um documento do Firestore e descriptografa campos se necessário
 */
export async function getEncryptedDoc(
    collectionName: string,
    docId: string,
    encryptFields: string[] = []
): Promise<EncryptedDocument | null> {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return null;
        }

        let data = docSnap.data();

        // Descriptografa campos específicos se necessário
        if (encryptFields.length > 0) {
            encryptFields.forEach((field) => {
                if (data[field]) {
                    const decrypted = decryptObject(data[field]);
                    data[field] = decrypted?.value || data[field];
                }
            });
        }

        return {
            id: docSnap.id,
            data,
            encrypted: encryptFields.length > 0,
        };
    } catch (error) {
        console.error(`Erro ao obter documento de ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Obtém todos os documentos de uma coleção
 */
export async function getAllEncryptedDocs(
    collectionName: string,
    encryptFields: string[] = []
): Promise<EncryptedDocument[]> {
    try {
        const colRef = collection(db, collectionName);
        const querySnap = await getDocs(colRef);

        return querySnap.docs.map((docSnap) => {
            let data = docSnap.data();

            // Descriptografa campos específicos se necessário
            if (encryptFields.length > 0) {
                encryptFields.forEach((field) => {
                    if (data[field]) {
                        const decrypted = decryptObject(data[field]);
                        data[field] = decrypted?.value || data[field];
                    }
                });
            }

            return {
                id: docSnap.id,
                data,
                encrypted: encryptFields.length > 0,
            };
        });
    } catch (error) {
        console.error(`Erro ao obter documentos de ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Consulta documentos com filtro
 */
export async function queryEncryptedDocs(
    collectionName: string,
    constraints: Array<any>,
    encryptFields: string[] = []
): Promise<EncryptedDocument[]> {
    try {
        const colRef = collection(db, collectionName);
        const q = query(colRef, ...constraints);
        const querySnap = await getDocs(q);

        return querySnap.docs.map((docSnap) => {
            let data = docSnap.data();

            // Descriptografa campos específicos se necessário
            if (encryptFields.length > 0) {
                encryptFields.forEach((field) => {
                    if (data[field]) {
                        const decrypted = decryptObject(data[field]);
                        data[field] = decrypted?.value || data[field];
                    }
                });
            }

            return {
                id: docSnap.id,
                data,
                encrypted: encryptFields.length > 0,
            };
        });
    } catch (error) {
        console.error(`Erro ao consultar documentos de ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Deleta um documento do Firestore
 */
export async function deleteEncryptedDoc(
    collectionName: string,
    docId: string
): Promise<void> {
    try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error(`Erro ao deletar documento de ${collectionName}:`, error);
        throw error;
    }
}

/**
 * Verifica se um documento existe
 */
export async function docExists(
    collectionName: string,
    docId: string
): Promise<boolean> {
    try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } catch (error) {
        console.error(`Erro ao verificar existência de documento:`, error);
        return false;
    }
}
