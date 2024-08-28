"use client";
import React, { useState } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { db } from "../../firebase";
import { collection, addDoc, writeBatch, doc } from "firebase/firestore";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";

const LeadUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const processedData = results.data
            .filter((row) =>
              Object.values(row).some((value) => value.trim() !== "")
            )
            .map((row) => ({
              ...row,
              leadId: uuidv4(), // Add a UUID for each lead
            }));
          resolve(processedData);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const storage = getStorage();
      const storageRef = ref(storage, `csv_uploads/${file.name}`);

      // Upload file to Firebase Storage
      await uploadBytes(storageRef, file);

      // Parse CSV file
      const leads = await parseCSV(file);

      if (leads.length === 0) {
        throw new Error("No valid leads found in the CSV file");
      }

      // Add a record to uploadedFiles collection
      const uploadedFileRef = await addDoc(collection(db, "uploadedFiles"), {
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        leadCount: leads.length,
      });

      // Add leads as a subcollection of the uploaded file
      const batch = writeBatch(db);
      const leadsCollection = collection(uploadedFileRef, "leads");

      leads.forEach((lead) => {
        const docRef = doc(leadsCollection, lead.leadId); // Use the leadId as the document ID
        const leadData = { ...lead };
        // Remove any empty fields
        Object.keys(leadData).forEach(
          (key) =>
            (leadData[key] === undefined ||
              leadData[key] === null ||
              leadData[key].trim() === "") &&
            delete leadData[key]
        );
        batch.set(docRef, leadData);
      });

      await batch.commit();

      setSuccess(true);
      setFile(null);
    } catch (err) {
      console.error("Error uploading file:", err);
      setError(`Failed to upload file: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h2>Upload CSV File</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" disabled={uploading || !file}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>File uploaded successfully!</p>}
    </div>
  );
};

export default LeadUpload;
