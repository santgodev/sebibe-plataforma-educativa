export interface AssignmentPdf {
  name: string;
  url: string;
}

export interface AssignmentLink {
  label: string;
  url: string;
}

export interface AssignmentData {
  instructions: string;
  pdfs: AssignmentPdf[];
  links: AssignmentLink[];
  videos: string[];
}

export function parseAssignmentContent(
  rawContent?: string | null,
  fallbackVideoUrl?: string | null,
): AssignmentData {
  const empty: AssignmentData = {
    instructions: '',
    pdfs: [],
    links: [],
    videos: fallbackVideoUrl ? [fallbackVideoUrl] : [],
  };

  if (!rawContent) return empty;

  try {
    const parsed = JSON.parse(rawContent);
    if (
      parsed &&
      typeof parsed === 'object' &&
      ('instructions' in parsed ||
        'pdfs' in parsed ||
        'links' in parsed ||
        'videos' in parsed)
    ) {
      return {
        instructions:
          typeof parsed.instructions === 'string' ? parsed.instructions : '',
        pdfs: Array.isArray(parsed.pdfs) ? parsed.pdfs : [],
        links: Array.isArray(parsed.links) ? parsed.links : [],
        videos: Array.isArray(parsed.videos)
          ? parsed.videos
          : fallbackVideoUrl
            ? [fallbackVideoUrl]
            : [],
      };
    }
  } catch {
    // Fallback if content was plain text or a direct PDF URL
  }

  return {
    instructions: rawContent.startsWith('http') ? '' : rawContent,
    pdfs: rawContent.startsWith('http')
      ? [{ name: 'Documento PDF', url: rawContent }]
      : [],
    links: [],
    videos: fallbackVideoUrl ? [fallbackVideoUrl] : [],
  };
}
