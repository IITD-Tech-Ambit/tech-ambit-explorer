Campus video: campus-research.mp4 (served at /videos/campus-research.mp4)

Production tips:
- Target 5–15 MB for web (720p H.264, CRF 23–28 in HandBrake or ffmpeg).
- Avoid committing very large files to git when possible; use CDN/S3/R2 or Git LFS.
- Keep preload="metadata" until the file is compressed.
