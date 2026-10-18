import { Fragment, type ReactNode } from "react";

/**
 * Renderiza marcação simples (## título, - lista, **negrito**) como elementos React.
 * Nunca usa dangerouslySetInnerHTML: qualquer HTML no texto aparece como texto (proteção contra XSS).
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: ReactNode[] = [];
  blocks.forEach((block, i) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (!lines.length) return;
    if (lines.every((l) => /^\s*-\s+/.test(l))) {
      out.push(
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{inline(l.replace(/^\s*-\s+/, ""))}</li>
          ))}
        </ul>,
      );
    } else if (lines.length === 1 && lines[0].startsWith("## ")) {
      out.push(<h2 key={i}>{inline(lines[0].slice(3))}</h2>);
    } else {
      out.push(
        <p key={i}>
          {lines.map((l, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(l)}
            </Fragment>
          ))}
        </p>,
      );
    }
  });
  return <div className={className ?? "prose-rs"}>{out}</div>;
}
