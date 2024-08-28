import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { doc, getDoc } from "firebase/firestore";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");
  const fileId = searchParams.get("fileId");

  console.log("Received request with:", { leadId, fileId });

  if (!leadId || !fileId) {
    console.log("Missing leadId or fileId");
    return NextResponse.json(
      { error: "Lead ID and File ID are required" },
      { status: 400 }
    );
  }

  try {
    console.log("Attempting to fetch lead document");
    const leadDoc = await getDoc(
      doc(db, "uploadedFiles", fileId, "leads", leadId)
    );
    console.log("Fetched lead document:", leadDoc);

    if (!leadDoc.exists()) {
      console.log("Lead document not found");
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const lead = leadDoc.data();
    console.log("Lead data:", lead);

    if (!lead.screenshot) {
      return NextResponse.json(
        { error: "Screenshot not found for this lead" },
        { status: 404 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(lead.screenshot, "base64");

    // Set the appropriate headers for the response
    const headers = new Headers();
    headers.set(
      "Content-Disposition",
      `attachment; filename="screenshot_${leadId}.png"`
    );
    headers.set("Content-Type", "image/png");

    // Return the screenshot as a downloadable file
    return new NextResponse(buffer, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error("Error downloading screenshot:", error);
    return NextResponse.json(
      { error: "An error occurred while downloading the screenshot" },
      { status: 500 }
    );
  }
}
