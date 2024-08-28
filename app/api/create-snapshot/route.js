import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import puppeteer from "puppeteer";

const storage = getStorage();

export async function POST(request) {
  console.log("API route hit");
  try {
    const { fileId } = await request.json();
    console.log("Received fileId:", fileId);

    if (!fileId) {
      throw new Error("File ID is required");
    }

    let browser;
    try {
      console.log("Launching browser");
      browser = await puppeteer.launch();
      console.log("Browser launched");
    } catch (error) {
      console.error("Error launching browser:", error);
      return NextResponse.json(
        { error: `Failed to launch browser: ${error.message}` },
        { status: 500 }
      );
    }

    const fileRef = doc(db, "uploadedFiles", fileId);
    const leadsCollection = collection(fileRef, "leads");
    let leadsQuerySnapshot;

    try {
      console.log("Fetching leads");
      leadsQuerySnapshot = await getDocs(leadsCollection);
      console.log(`Found ${leadsQuerySnapshot.size} leads`);
    } catch (error) {
      console.error("Error fetching leads:", error);
      return NextResponse.json(
        { error: `Failed to fetch leads: ${error.message}` },
        { status: 500 }
      );
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const leadDoc of leadsQuerySnapshot.docs) {
      try {
        const lead = leadDoc.data();
        console.log(`Processing lead: ${leadDoc.id}`);
        console.log(`Lead data: ${JSON.stringify(lead)}`);

        if (lead.Website && !lead.screenshot) {
          let websiteUrl = lead.Website;
          if (
            !websiteUrl.startsWith("http://") &&
            !websiteUrl.startsWith("https://")
          ) {
            websiteUrl = `https://${websiteUrl}`;
          }
          console.log(`Creating screenshot for ${websiteUrl}`);
          const page = await browser.newPage();
          try {
            await page.goto(websiteUrl, {
              waitUntil: "networkidle0",
              timeout: 120000, // Increase timeout to 120 seconds
            });

            // Set viewport to a large size
            await page.setViewport({
              width: 1920,
              height: 1080,
              deviceScaleFactor: 1,
            });

            // Scroll through the page to trigger lazy loading
            await autoScroll(page);

            // Take full page screenshot
            const screenshot = await page.screenshot({
              encoding: "base64",
              fullPage: true,
            });

            console.log(
              `Screenshot created for ${websiteUrl}. Size: ${screenshot.length} characters`
            );

            // Upload screenshot to Firebase Storage
            const storageRef = ref(
              storage,
              `screenshots/${fileId}/${leadDoc.id}.png`
            );
            await uploadString(storageRef, screenshot, "base64", {
              contentType: "image/png",
            });

            // Get the download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update Firestore with the screenshot URL
            await updateDoc(doc(leadsCollection, leadDoc.id), {
              screenshotURL: downloadURL,
            });

            console.log(`Lead ${leadDoc.id} updated with screenshot URL`);
            updatedCount++;
          } catch (error) {
            console.error(`Error processing lead ${leadDoc.id}:`, error);
            errorCount++;
          } finally {
            await page.close();
          }
        } else {
          console.log(
            `Skipping lead ${leadDoc.id}: Website=${
              lead.Website
            }, has screenshot=${!!lead.screenshot}`
          );
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error processing lead document ${leadDoc.id}:`, error);
        errorCount++;
      }
    }

    if (browser) {
      await browser.close();
      console.log("Browser closed");
    }

    console.log(`Updated ${updatedCount} leads with screenshots`);
    console.log(`Skipped ${skippedCount} leads`);
    console.log(`Encountered errors with ${errorCount} leads`);

    return NextResponse.json({
      message: `Leads processed. Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`,
    });
  } catch (error) {
    console.error("Error processing leads:", error);
    return NextResponse.json(
      { error: `An error occurred while processing leads: ${error.message}` },
      { status: 500 }
    );
  }
}

// Function to scroll through the page
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}
