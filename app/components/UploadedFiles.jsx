"use client";
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

const UploadedFilesList = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    const fetchUploadedFiles = async () => {
      const q = query(
        collection(db, "uploadedFiles"),
        orderBy("uploadedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      setUploadedFiles(
        querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchUploadedFiles();
  }, []);

  const handleFileClick = async (fileId) => {
    if (expandedFile === fileId) {
      setExpandedFile(null);
      setLeads([]);
    } else {
      setExpandedFile(fileId);
      const leadsSnapshot = await getDocs(
        collection(db, `uploadedFiles/${fileId}/leads`)
      );
      const leadsData = leadsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Fetched leads:", leadsData);
      setLeads(leadsData);
    }
  };

  const handleProcessLeads = async (fileId) => {
    setProcessing((prev) => ({ ...prev, [fileId]: true }));
    try {
      console.log(`Processing leads for file: ${fileId}`);
      const response = await fetch("/api/create-snapshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      console.log(`Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`Response body: ${responseText}`);

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);
      alert(data.message);
    } catch (error) {
      console.error("Error processing leads:", error);
      alert(`Failed to process leads: ${error.message}`);
    } finally {
      setProcessing((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleDownloadScreenshot = async (lead) => {
    if (!lead.screenshotURL) {
      console.error("No screenshot URL available for this lead");
      alert("Screenshot not available for this lead");
      return;
    }

    try {
      const response = await fetch(
        `/api/proxy-download?url=${encodeURIComponent(lead.screenshotURL)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `screenshot_${lead.id || lead.leadId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading screenshot:", error);
      alert("Failed to download screenshot");
    }
  };

  const fetchLeadsForFile = async (fileId) => {
    const leadsCollection = collection(db, "uploadedFiles", fileId, "leads");
    const leadsSnapshot = await getDocs(leadsCollection);
    const leadsData = leadsSnapshot.docs.map((doc) => {
      const data = doc.data();
      console.log("Fetched lead data:", { id: doc.id, ...data });
      return { id: doc.id, ...data };
    });
    setLeads(leadsData);
  };

  return (
    <div>
      <h3 className="">Uploaded Files</h3>
      <ul>
        {uploadedFiles.map((file) => (
          <li key={file.id}>
            <button onClick={() => handleFileClick(file.id)}>
              {file.fileName}
            </button>
            <button
              onClick={() => handleProcessLeads(file.id)}
              disabled={processing[file.id]}
              className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {processing[file.id] ? "Processing..." : "Process Leads"}
            </button>
            {expandedFile === file.id && (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white shadow-sm rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        First Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead) => {
                      return (
                        <tr key={lead["Company"]} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead["Company"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead["First Name"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead["Last Name"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead["Email"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead["Website"]}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleDownloadScreenshot(lead)}
                              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              disabled={!lead.screenshotURL}
                            >
                              Download Screenshot
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const FullList = () => {
  return (
    <div>
      <UploadedFilesList />
    </div>
  );
};

export default FullList;
