"use client";
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import Papa from "papaparse";
import jsPDF from "jspdf";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const UploadedFilesList = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [processing, setProcessing] = useState({});
  const [csvData, setCsvData] = useState([]);

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

  const handleExportLeads = async (fileId) => {
    try {
      const leadsCollection = collection(db, "uploadedFiles", fileId, "leads");
      const leadsSnapshot = await getDocs(leadsCollection);

      const headers = [
        "Company",
        "First Name",
        "Last Name",
        "Email",
        "Website",
        "Analysis",
        "Screenshot URL",
        "PDF URL",
      ];

      const leadsData = leadsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return [
          data["Company"] || "",
          data["First Name"] || "",
          data["Last Name"] || "",
          data["Email"] || "",
          data["Website"] || "",
          data.analysis || "",
          data.screenshotURL || "",
          data["pdfURL"] || "",
        ];
      });

      const csvData = Papa.unparse({
        fields: headers,
        data: leadsData,
      });

      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `leads_${fileId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Error exporting leads:", error);
      alert("Failed to export leads");
    }
  };

  const handleExportPDF = async (fileId, leadId) => {
    try {
      const leadDoc = await getDoc(
        doc(db, "uploadedFiles", fileId, "leads", leadId)
      );
      if (!leadDoc.exists()) {
        throw new Error("Lead not found");
      }
      const data = leadDoc.data();

      const pdf = new jsPDF();
      let yOffset = 10;

      pdf.setFontSize(16);
      pdf.text("Lead Analysis", 10, yOffset);
      yOffset += 20;

      pdf.setFontSize(12);
      pdf.text(`Company: ${data["Company"] || "N/A"}`, 10, yOffset);
      yOffset += 10;
      pdf.text(
        `Name: ${data["First Name"] || ""} ${data["Last Name"] || ""}`,
        10,
        yOffset
      );
      yOffset += 10;
      pdf.text(`Email: ${data["Email"] || "N/A"}`, 10, yOffset);
      yOffset += 10;
      pdf.text(`Website: ${data["Website"] || "N/A"}`, 10, yOffset);
      yOffset += 20;

      pdf.setFontSize(14);
      pdf.text("Analysis:", 10, yOffset);
      yOffset += 10;

      pdf.setFontSize(10);
      const analysisLines = pdf.splitTextToSize(
        data.analysis || "No analysis available",
        180
      );
      pdf.text(analysisLines, 10, yOffset);

      pdf.save(`analysis_${data["Company"] || leadId}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF");
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

  const handleAnalyzeScreenshot = async (lead) => {
    if (!lead.screenshotURL) {
      alert("No screenshot available for this lead");
      return;
    }

    try {
      const response = await fetch("/api/analyze-screenshot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenshotURL: lead.screenshotURL,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update Firebase with the analysis
      const leadRef = doc(db, `uploadedFiles/${expandedFile}/leads`, lead.id);
      await updateDoc(leadRef, { analysis: data.analysis });

      // Update local state
      setLeads(
        leads.map((l) =>
          l.id === lead.id ? { ...l, analysis: data.analysis } : l
        )
      );

      alert("Analysis completed and saved successfully");
    } catch (error) {
      console.error("Error analyzing screenshot:", error);
      alert("Failed to analyze screenshot");
    }
  };

  const handleDownloadAnalysis = (lead) => {
    if (!lead.analysis) {
      alert("No analysis available for this lead");
      return;
    }

    const blob = new Blob([lead.analysis], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analysis_${lead.id || lead["Company"]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleGeneratePDFs = async (fileId) => {
    try {
      const leadsCollection = collection(db, "uploadedFiles", fileId, "leads");
      const leadsSnapshot = await getDocs(leadsCollection);
      const storage = getStorage();

      // Load the background image
      const backgroundImg = await loadImage("/template-bg.png");

      for (const leadDoc of leadsSnapshot.docs) {
        const leadData = leadDoc.data();
        if (leadData.analysis) {
          const pdf = new jsPDF();

          // Add background image
          pdf.addImage(backgroundImg, "JPEG", 0, 0, 210, 297); // A4 size: 210x297mm

          pdf.setFontSize(16);
          pdf.setTextColor(0, 0, 0); // Ensure text is visible on the background
          pdf.text("Lead Analysis", 20, 20);

          pdf.setFontSize(12);
          pdf.text(`Company: ${leadData["Company"] || "N/A"}`, 20, 40);
          pdf.text(
            `Name: ${leadData["First Name"] || ""} ${
              leadData["Last Name"] || ""
            }`,
            20,
            50
          );
          pdf.text(`Email: ${leadData["Email"] || "N/A"}`, 20, 60);
          pdf.text(`Website: ${leadData["Website"] || "N/A"}`, 20, 70);

          pdf.setFontSize(14);
          pdf.text("Analysis:", 20, 90);

          pdf.setFontSize(10);
          const analysisLines = pdf.splitTextToSize(leadData.analysis, 170);
          pdf.text(analysisLines, 20, 100);

          const pdfBlob = pdf.output("blob");
          const pdfRef = ref(storage, `pdfs/${fileId}/${leadDoc.id}.pdf`);
          await uploadBytes(pdfRef, pdfBlob);

          const pdfURL = await getDownloadURL(pdfRef);

          await updateDoc(
            doc(db, "uploadedFiles", fileId, "leads", leadDoc.id),
            {
              pdfURL: pdfURL,
            }
          );
        }
      }

      alert("PDFs generated and uploaded successfully!");
    } catch (error) {
      console.error("Error generating PDFs:", error);
      alert("Failed to generate PDFs");
    }
  };

  // Helper function to load image
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  return (
    <div>
      <h3 className="mt-20 text-2xl font-bold">Uploaded Files</h3>
      <ul className="w-full">
        {uploadedFiles.map((file) => (
          <li key={file.id} className="w-full gap-10 flex justify-between my-3">
            <div className="flex-col w-full">
              <div className="flex justify-between">
                <div onClick={() => handleFileClick(file.id)}>
                  {file.fileName}
                </div>
                <div>
                  <button
                    onClick={() => handleProcessLeads(file.id)}
                    disabled={processing[file.id]}
                    className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    {processing[file.id] ? "Processing..." : "Process Leads"}
                  </button>

                  <button
                    onClick={() => handleGeneratePDFs(file.id)}
                    className="ml-2 px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Generate PDFs
                  </button>
                  <button
                    onClick={() => handleExportLeads(file.id)}
                    className="ml-2 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              {expandedFile === file.id && (
                <div className="overflow-x-auto mt-4 mb-20 border-2 border-gray-300 rounded-lg">
                  <table className="max-w-full bg-white shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ">
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
                          <tr
                            key={lead["Company"]}
                            className="hover:bg-gray-50"
                          >
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
                                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
                                disabled={!lead.screenshotURL}
                              >
                                Download Screenshot
                              </button>
                              <button
                                onClick={() => handleAnalyzeScreenshot(lead)}
                                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
                                disabled={!lead.screenshotURL}
                              >
                                Analyze Screenshot
                              </button>
                              <button
                                onClick={() => handleDownloadAnalysis(lead)}
                                className="px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                                disabled={!lead.analysis}
                              >
                                Download Analysis
                              </button>
                              <button
                                onClick={() =>
                                  handleExportPDF(file.id, lead.id)
                                }
                                className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Export PDF
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
