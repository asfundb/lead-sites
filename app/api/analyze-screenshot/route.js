import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

export async function POST(request) {
  try {
    const { screenshotURL } = await request.json();

    if (!screenshotURL) {
      return NextResponse.json(
        { error: "Screenshot URL is required" },
        { status: 400 }
      );
    }

    const base64Image = await fetchImageAsBase64(screenshotURL);

    const prompt = `Creating a Website Audit for a potential client. Analyze this website screenshot:

Please provide insights on the following aspects:
1. Scope of the website
3. Overall design quality and user experience 
5. Suggestions for improvement- go into detail on what is working and what is not working and why. Be heavy on improvements that are needed.

Be concise but thorough in your analysis and provide a compelling argument for why this website is or is not a good fit for the client's needs.`;

    const message = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/png",
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    return NextResponse.json({ analysis: message.content[0].text });
  } catch (error) {
    console.error("Error analyzing screenshot:", error);
    return NextResponse.json(
      { error: "Failed to analyze screenshot" },
      { status: 500 }
    );
  }
}
