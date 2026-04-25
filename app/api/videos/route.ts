import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const VIDEOS_DIR = path.join(process.cwd(), "public", "videos");

// Supported video formats
const SUPPORTED_FORMATS = [".mp4", ".webm", ".ogv", ".mov"];

export async function GET(request: NextRequest) {
  try {
    // Check if videos directory exists
    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
      return NextResponse.json({ videos: [] });
    }

    // Read all files in the videos directory
    const files = fs.readdirSync(VIDEOS_DIR);

    // Filter video files
    const videos = files
      .filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return SUPPORTED_FORMATS.includes(ext);
      })
      .map((file, index) => ({
        id: `video-${index}`,
        name: path.basename(file, path.extname(file)),
        path: `/videos/${file}`,
      }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error fetching videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 },
    );
  }
}
