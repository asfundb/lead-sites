import { NextResponse } from "next/server";
import { db } from "../../../firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

export async function GET() {
  try {
    const uploadedFilesRef = collection(db, "uploadedFiles");
    const q = query(uploadedFilesRef, orderBy("uploadedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const uploadedFiles = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(uploadedFiles);
  } catch (error) {
    console.error("Error fetching uploaded files:", error);
    return NextResponse.json(
      { error: "Unable to fetch uploaded files" },
      { status: 500 }
    );
  }
}
