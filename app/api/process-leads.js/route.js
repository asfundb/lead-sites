import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import puppeteer from "puppeteer";

export async function POST(request) {
  try {
    const { fileId } = await request.json();

    if (!fileId) {
      throw new Error("File ID is required");
    }

    const browser = await puppeteer.launch();
    const fileRef = doc(db, "uploadedFiles", fileId);
    const leadsCollection = collection(fileRef, "leads");
    const leadsQuerySnapshot = await getDocs(leadsCollection);
    let processedCount = 0;
    console.log("test 1");
    for (const leadDoc of leadsQuerySnapshot.docs) {
      console.log("test 2");
      const lead = leadDoc.data();
      if (lead.Website && !lead.screenshot) {
        const page = await browser.newPage();
        try {
          await page.goto(lead.Website, {
            waitUntil: "networkidle0",
            timeout: 30000,
          });
          const screenshot = await page.screenshot({ encoding: "base64" });
          await updateDoc(doc(leadsCollection, leadDoc.id), {
            screenshot: screenshot,
          });
          processedCount++;
        } catch (error) {
          console.error(`Error processing lead ${leadDoc.id}:`, error);
        } finally {
          await page.close();
        }
      }
    }

    await browser.close();

    return NextResponse.json({
      message: `Leads processed successfully. Processed ${processedCount} leads.`,
    });
  } catch (error) {
    console.error("Error processing leads:", error);
    return NextResponse.json(
      { error: `An error occurred while processing leads: ${error.message}` },
      { status: 500 }
    );
  }
}
