import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, addDoc } from "firebase/firestore";
import puppeteer from "puppeteer";

export async function POST(request) {
  try {
    const { leads, fileName } = await request.json();

    const browser = await puppeteer.launch();

    for (const lead of leads) {
      const page = await browser.newPage();
      await page.goto(lead.website);
      const screenshot = await page.screenshot({ encoding: "base64" });

      await addDoc(collection(db, "leads"), {
        companyName: lead.companyName,
        website: lead.website,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        screenshot,
      });

      await page.close();
    }

    await browser.close();

    await addDoc(collection(db, "uploadedFiles"), {
      fileName,
      uploadedAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Leads processed successfully" });
  } catch (error) {
    console.error("Error processing leads:", error);
    return NextResponse.json(
      { error: "An error occurred while processing leads" },
      { status: 500 }
    );
  }
}
