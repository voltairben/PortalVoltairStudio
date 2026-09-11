/**
 * Client-side only — call from a browser event handler, not during SSR.
 * Never throws: a video that fails to decode (unsupported codec, corrupt
 * file) resolves `null` and the deliverable simply ships without a cover.
 */
export function captureVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.addEventListener("error", fail, { once: true });

    video.addEventListener(
      "loadedmetadata",
      () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return fail();
        video.currentTime = Math.min(1, video.duration * 0.1);
      },
      { once: true },
    );

    video.addEventListener(
      "seeked",
      () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || canvas.width === 0 || canvas.height === 0) return fail();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            resolve(blob);
          },
          "image/jpeg",
          0.85,
        );
      },
      { once: true },
    );
  });
}
