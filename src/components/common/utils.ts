import {
   ref,
   deleteObject,
   listAll,
   uploadBytesResumable,
   getDownloadURL,
   StorageReference,
   FirebaseStorage,
} from "firebase/storage";

export const getFileExtension = (file: File) => {
   return file.type.split("/").pop();
};

export const extractStoragePath = (url: string) => {
   const baseUrl = "https://firebasestorage.googleapis.com/v0/b/";
   const firstPart = url.split(baseUrl)[1];
   const secondPart = firstPart.split("/o/")[1];
   const decodedPath = decodeURIComponent(secondPart);
   const path = decodedPath.split("?")[0];

   return path;
};
export const deleteFolderContents = async (folderRef: StorageReference) => {
   const listResults = await listAll(folderRef);
   console.log(listResults);
   console.log(listResults.prefixes);
   // Delete files in the current folder
   const fileDeletions = listResults.items.map((itemRef) => {
      return deleteObject(itemRef);
   });
   // Recursively delete files in subfolders
   const folderDeletions = listResults.prefixes.map((subfolderRef) => {
      return deleteFolderContents(subfolderRef);
   });
   // Wait for all deletions to complete
   await Promise.all([...fileDeletions, ...folderDeletions]);
};

export const deleteFolder = async (folderPath: string, storage: FirebaseStorage) => {
   const folderRef = ref(storage, folderPath);

   try {
      await deleteFolderContents(folderRef);
      console.log(`All files in '${folderPath}' and its subfolders deleted successfully.`);
   } catch (error) {
      console.error("Error deleting files in folder:", error);
   }
};

export const uploadFileAndGetURL = (
   file: File,
   storagePath: string,
   progressWeight: number,
   updateProgress: (a: number) => void,
   storage: FirebaseStorage
) => {
   return new Promise((resolve, reject) => {
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file, {
         contentType: file.type,
         cacheControl: "public,max-age=3600",
      });

      uploadTask.on(
         "state_changed",
         (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            updateProgress((progress * progressWeight) / 100);
         },
         (error) => {
            reject(error);
         },
         async () => {
            const downloadURL = await getDownloadURL(fileRef);
            updateProgress(progressWeight);
            resolve(downloadURL);
         }
      );
   });
};

export const arraysHaveSameElements = (arr1: [], arr2: []) => {
   if (arr1.length !== arr2.length) {
      return false; // Arrays of different lengths are not equal
   }

   // Sort both arrays
   const sortedArr1 = arr1.slice().sort();
   const sortedArr2 = arr2.slice().sort();

   // Compare sorted arrays
   for (let i = 0; i < sortedArr1.length; i++) {
      if (sortedArr1[i] !== sortedArr2[i]) {
         return false; // Found elements that are different
      }
   }

   return true; // All elements are equal
};

export const getRidOfExt = (str: string) => {
   const lastDotIndex = str.lastIndexOf(".");
   const newFilename = str.substring(0, lastDotIndex);
   return newFilename;
};

export const formatDateFromTimestamp = (timestampInSeconds: number) => {
   const date = new Date(timestampInSeconds * 1000); // Convert seconds to milliseconds
   const day = ("0" + date.getDate()).slice(-2); // Ensure two digits
   const month = ("0" + (date.getMonth() + 1)).slice(-2); // Month is 0-indexed, ensure two digits
   const year = date.getFullYear();
   return `${day}/${month}/${year}`;
};
// Helper function to convert a date string in DD/MM/YYYY format to a Date object
export const convertToDate = (dateString: string) => {
   const parts = dateString.split("/");
   // Note: months are 0-based in JavaScript Date
   return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
};

export const generateColors = (nr: number) => {
   const colors = [];

   for (let i = 0; i < nr; i++) {
      // Adjust these minimum values to avoid dark colors
      const minColorValue = 100; // Set minimum color value to avoid dark colors
      const range = 230 - minColorValue;

      // Generate colors within the specified range
      const red = minColorValue + Math.floor(Math.random() * range);
      const green = minColorValue + Math.floor(Math.random() * range);
      const blue = minColorValue + Math.floor(Math.random() * range);

      // Convert RGB values to hex and pad with leading zeros if necessary
      const hex = `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue
         .toString(16)
         .padStart(2, "0")}`;

      colors.push(hex);
   }

   return colors;
};
