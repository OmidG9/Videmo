"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

interface Video {
  id: string;
  name: string;
  path: string;
  duration?: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Fetch videos list
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/videos");
        if (!response.ok) throw new Error("Failed to fetch videos");
        const data = await response.json();
        setVideos(data.videos || []);
        if (data.videos && data.videos.length > 0) {
          setSelectedVideo(data.videos[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchVideos();
    }
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <nav className="bg-gray-800 shadow-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-white">🎬 CodiH Hub</h1>
              <p className="text-sm text-gray-400">
                Welcome, {session.user?.email}
              </p>
            </div>
            <button
              onClick={() =>
                signOut({ redirect: true, callbackUrl: "/app/login" })
              }
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading videos...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              No videos found. Please add videos to the public/videos folder.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-2xl">
                {selectedVideo ? (
                  <div className="aspect-video bg-black">
                    <video
                      ref={videoRef}
                      controls
                      className="w-full h-full"
                      src={selectedVideo.path}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <p className="text-gray-500">No video selected</p>
                  </div>
                )}
                {selectedVideo && (
                  <div className="p-6 bg-gray-800">
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {selectedVideo.name}
                    </h2>
                    {selectedVideo.duration && (
                      <p className="text-gray-400 text-sm">
                        Duration: {selectedVideo.duration}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Playlist */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
                  <h3 className="text-lg font-semibold text-white">
                    Playlist ({videos.length})
                  </h3>
                </div>
                <div className="overflow-y-auto max-h-96">
                  {videos.map((video) => (
                    <button
                      key={video.id}
                      onClick={() => setSelectedVideo(video)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-700 transition-colors duration-150 ${
                        selectedVideo?.id === video.id
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      <p className="font-medium text-sm truncate">
                        {video.name}
                      </p>
                      {video.duration && (
                        <p className="text-xs text-gray-400 mt-1">
                          {video.duration}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
