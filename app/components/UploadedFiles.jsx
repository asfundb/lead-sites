"use client";
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

const UploadedFilesList = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [expandedFile, setExpandedFile] = useState(null);
  const [leads, setLeads] = useState([]);

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
      setLeads(leadsSnapshot.docs.map((doc) => doc.data()));
    }
  };

  return (
    <div>
      <h3 class="">Uploaded Files</h3>
      <ul>
        {uploadedFiles.map((file) => (
          <li key={file.id}>
            <button onClick={() => handleFileClick(file.id)}>
              {file.fileName}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {leads.map((lead, index) => (
                      <tr key={index} className="hover:bg-gray-50">
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
                      </tr>
                    ))}
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
