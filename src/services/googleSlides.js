// Google Slides API service

/**
 * Extract presentation ID from a Google Slides URL
 */
export function extractPresentationId(url) {
  if (!url) return null;

  // Match patterns like:
  // https://docs.google.com/presentation/d/PRESENTATION_ID/edit
  // https://docs.google.com/presentation/d/PRESENTATION_ID/embed
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Upload image to Google Drive and return the file ID
 */
export async function uploadImageToDrive(
  accessToken,
  imageBlob,
  filename = "chart.png",
) {
  const metadata = {
    name: filename,
    mimeType: "image/png",
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", imageBlob);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to upload image to Drive");
  }

  const data = await response.json();

  // Make the file publicly accessible so Slides can use it
  await fetch(
    `https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    },
  );

  return data.id;
}

/**
 * Get the current slide ID from a presentation
 */
export async function getFirstSlideId(accessToken, presentationId) {
  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to get presentation");
  }

  const data = await response.json();

  // Return the last slide ID (most likely where user wants to add)
  const slides = data.slides || [];
  return slides.length > 0 ? slides[slides.length - 1].objectId : null;
}

/**
 * Create a new slide and return its ID
 */
export async function createNewSlide(accessToken, presentationId) {
  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            createSlide: {
              slideLayoutReference: {
                predefinedLayout: "BLANK",
              },
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to create slide");
  }

  const data = await response.json();
  return data.replies[0].createSlide.objectId;
}

/**
 * Add an image to a slide
 */
export async function addImageToSlide(
  accessToken,
  presentationId,
  slideId,
  driveFileId,
) {
  // Construct the Drive URL for the image
  const imageUrl = `https://drive.google.com/uc?id=${driveFileId}`;

  const response = await fetch(
    `https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            createImage: {
              url: imageUrl,
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: { magnitude: 500, unit: "PT" },
                  height: { magnitude: 300, unit: "PT" },
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: 100,
                  translateY: 100,
                  unit: "PT",
                },
              },
            },
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to add image to slide");
  }

  return await response.json();
}

/**
 * Main function to add a chart to Google Slides
 */
export async function addChartToPresentation(
  accessToken,
  presentationId,
  imageBlob,
  options = {},
) {
  const { createNewSlideFirst = false } = options;

  // 1. Upload image to Drive
  const driveFileId = await uploadImageToDrive(
    accessToken,
    imageBlob,
    `chart-${Date.now()}.png`,
  );

  // 2. Get or create slide
  let slideId;
  if (createNewSlideFirst) {
    slideId = await createNewSlide(accessToken, presentationId);
  } else {
    slideId = await getFirstSlideId(accessToken, presentationId);
    if (!slideId) {
      slideId = await createNewSlide(accessToken, presentationId);
    }
  }

  // 3. Add image to slide
  await addImageToSlide(accessToken, presentationId, slideId, driveFileId);

  return { success: true, slideId, driveFileId };
}
