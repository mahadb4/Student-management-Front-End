import { Fragment, type ReactNode } from "react";

// Minimal, dependency-free Markdown renderer for the AI Assistant's
// Gemini answer text. Builds React elements directly (never an HTML
// string), so React escapes all text content automatically - no
// dangerouslySetInnerHTML, no XSS surface, regardless of what Gemini
// returns. Supports only what the assistant's prompt actually produces:
// **bold**, "- "/"* " bullet lists, "1. " numbered lists, "# " headings,
// paragraphs, and line breaks.

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(part => part.length > 0);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`${keyPrefix}-b-${i}`}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={`${keyPrefix}-t-${i}`}>{part}</Fragment>;
  });
}

export function renderMarkdown(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, blockIndex) => {
    const trimmed = block.trim();
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6) + 3; // h4..h6, stays small inside a chat bubble
      const HeadingTag = `h${level}` as "h4" | "h5" | "h6";
      return <HeadingTag key={blockIndex}>{renderInline(headingMatch[2], `${blockIndex}-h`)}</HeadingTag>;
    }

    const lines = block.split("\n").filter(line => line.trim().length > 0);
    const isBulletList = lines.length > 0 && lines.every(line => /^\s*[-*]\s+/.test(line));
    const isNumberedList = lines.length > 0 && lines.every(line => /^\s*\d+\.\s+/.test(line));

    if (isBulletList) {
      return (
        <ul key={blockIndex}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.replace(/^\s*[-*]\s+/, ""), `${blockIndex}-${i}`)}</li>
          ))}
        </ul>
      );
    }

    if (isNumberedList) {
      return (
        <ol key={blockIndex}>
          {lines.map((line, i) => (
            <li key={i}>{renderInline(line.replace(/^\s*\d+\.\s+/, ""), `${blockIndex}-${i}`)}</li>
          ))}
        </ol>
      );
    }

    const rawLines = block.split("\n");
    return (
      <p key={blockIndex}>
        {rawLines.map((line, i) => (
          <Fragment key={i}>
            {renderInline(line, `${blockIndex}-${i}`)}
            {i < rawLines.length - 1 && <br />}
          </Fragment>
        ))}
      </p>
    );
  });
}
