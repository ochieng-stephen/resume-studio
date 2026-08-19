import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface MdNode {
  type: string;
  children?: MdNode[];
  value?: string;
  depth?: number;
  url?: string;
}

function inlineText(nodes: MdNode[] = []): string {
  return nodes
    .map((n) => (n.type === "text" ? (n.value ?? "") : inlineText(n.children)))
    .join("");
}

function textRunsFromInline(nodes: MdNode[] = [], bold = false, italics = false): TextRun[] {
  const runs: TextRun[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        runs.push(new TextRun({ text: node.value ?? "", bold, italics }));
        break;
      case "strong":
        runs.push(...textRunsFromInline(node.children, true, italics));
        break;
      case "emphasis":
        runs.push(...textRunsFromInline(node.children, bold, true));
        break;
      case "inlineCode":
        runs.push(new TextRun({ text: node.value ?? "", bold, italics, font: "Menlo" }));
        break;
      case "link":
        runs.push(
          new TextRun({ text: `${inlineText(node.children)} (${node.url ?? ""})`, bold, italics }),
        );
        break;
      case "break":
        runs.push(new TextRun({ text: "", break: 1 }));
        break;
      default:
        if (node.children) runs.push(...textRunsFromInline(node.children, bold, italics));
        else if (node.value) runs.push(new TextRun({ text: node.value, bold, italics }));
    }
  }
  return runs;
}

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function blockToParagraphs(node: MdNode): Paragraph[] {
  switch (node.type) {
    case "heading": {
      const level = Math.min(Math.max((node.depth ?? 1) - 1, 0), 5);
      return [
        new Paragraph({
          heading: HEADING_LEVELS[level],
          spacing: { before: 200, after: 100 },
          children: textRunsFromInline(node.children),
        }),
      ];
    }
    case "paragraph":
      return [new Paragraph({ spacing: { after: 120 }, children: textRunsFromInline(node.children) })];
    case "list": {
      const paragraphs: Paragraph[] = [];
      for (const item of node.children ?? []) {
        for (const child of item.children ?? []) {
          if (child.type === "paragraph") {
            paragraphs.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 60 },
                children: textRunsFromInline(child.children),
              }),
            );
          } else if (child.type === "list") {
            paragraphs.push(...blockToParagraphs(child));
          }
        }
      }
      return paragraphs;
    }
    case "thematicBreak":
      return [
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" } },
          spacing: { before: 100, after: 200 },
          children: [],
        }),
      ];
    case "blockquote":
      return (node.children ?? []).flatMap(blockToParagraphs);
    default:
      return node.children ? node.children.flatMap(blockToParagraphs) : [];
  }
}

/** Pure markdown -> docx Document conversion, with no Tauri dependency (unit-testable in Node). */
export function buildResumeDocument(markdown: string): Document {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as unknown as MdNode;
  const children = (tree.children ?? []).flatMap(blockToParagraphs);

  return new Document({
    sections: [{ properties: {}, children: children.length > 0 ? children : [new Paragraph("")] }],
  });
}

export async function exportMarkdownToDocx(markdown: string, suggestedName: string) {
  const doc = buildResumeDocument(markdown);
  const blob = await Packer.toBlob(doc);
  const buffer = await blob.arrayBuffer();
  const bytes = Array.from(new Uint8Array(buffer));

  const defaultPath = suggestedName.endsWith(".docx") ? suggestedName : `${suggestedName}.docx`;
  const targetPath = await save({
    defaultPath,
    filters: [{ name: "Word Document", extensions: ["docx"] }],
  });
  if (!targetPath) return;

  await invoke("write_binary_file", { path: targetPath, data: bytes });
}
