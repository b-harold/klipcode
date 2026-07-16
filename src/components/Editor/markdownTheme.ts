import { vscodeDarkInit, vscodeLightInit } from "@uiw/codemirror-theme-vscode";
import { tags as t, Tag, styleTags } from "@lezer/highlight";

// --- VS Code-faithful Markdown highlighting -------------------------------
//
// There is no off-the-shelf "VS Code Markdown" highlighter for CodeMirror; the
// vscodeDark theme is the de-facto VS Code port, but it leaves Markdown flat for
// three reasons: its default foreground (#9cdcfe) tints all prose light-blue, it
// only styles the generic `heading` tag (Markdown emits heading1–6), and it
// paints `monospace`/punctuation in colors that don't match.
//
// This module is self-contained (only depends on the theme + @lezer/highlight)
// so it can later be published as a standalone package. Pair `vscodeDarkMarkdown`
// (the theme) with `markdownMarkTags` (passed as the `extensions` option of
// @codemirror/lang-markdown's `markdown()`), e.g.:
//
//   markdown({ base: markdownLanguage, extensions: markdownMarkTags })
//   <CodeMirror theme={vscodeDarkMarkdown} ... />
//
// Colors are the exact VS Code Dark+ palette
// (microsoft/vscode › extensions/theme-defaults/themes/dark_vs.json):
const VS = {
  text: "#d4d4d4", // editor.foreground / prose
  heading: "#569cd6", // markup.heading + markup.bold
  italic: "#c586c0", // markup.italic
  code: "#ce9178", // markup.inline.raw
  listMark: "#6796e6", // punctuation.definition.list.begin.markdown
  quoteMark: "#6a9955", // punctuation.definition.quote.begin.markdown
  punctuation: "#808080", // hr / link brackets
} as const;

type MdPalette = Record<keyof typeof VS, string>;

// The same roles in the VS Code Light+ palette (light_plus / light_vs.json),
// so Markdown stays legible — and recognizably "VS Code" — on a light surface.
const VS_LIGHT: MdPalette = {
  text: "#24292e", // editor.foreground / prose
  heading: "#0550ae", // markup.heading + markup.bold
  italic: "#af00db", // markup.italic
  code: "#a31515", // markup.inline.raw (light string red)
  listMark: "#0550ae", // list bullets / numbers
  quoteMark: "#116329", // blockquote >
  punctuation: "#6e7781", // hr / link brackets
} as const;

// Most punctuation marks already inherit the right color from their parent node
// (`#` from the heading, `*`/`**` from emphasis/strong, so they come out blue /
// purple for free) AS LONG AS we leave `processingInstruction` unstyled. The
// exceptions are list bullets, blockquote `>` and code backticks, whose color in
// VS Code differs from the surrounding prose — so we re-tag just those three
// mark nodes to dedicated tags. (Context selectors like "Blockquote/QuoteMark"
// do NOT work with @lezer/markdown's tree here, but a context-less re-tag of the
// mark node does reliably win over the grammar's default mapping.)
const mdMark = {
  list: Tag.define(),
  quote: Tag.define(),
  code: Tag.define(),
};

/**
 * Markdown extension that re-tags list/quote/code punctuation marks so they can
 * be colored independently of the surrounding prose. Pass as the `extensions`
 * option to `markdown()`.
 */
export const markdownMarkTags = {
  props: [
    styleTags({
      ListMark: mdMark.list,
      QuoteMark: mdMark.quote,
      CodeMark: mdMark.code,
    }),
  ],
};

// Builds the per-palette Markdown highlight rules. `processingInstruction` is
// intentionally left unstyled so heading/bold/italic marks inherit their
// content's color.
function markdownStyles(palette: MdPalette) {
  return [
    {
      tag: [
        t.heading1,
        t.heading2,
        t.heading3,
        t.heading4,
        t.heading5,
        t.heading6,
      ],
      color: palette.heading,
      fontWeight: "bold",
    },
    { tag: t.strong, color: palette.heading, fontWeight: "bold" },
    { tag: t.emphasis, color: palette.italic, fontStyle: "italic" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.monospace, color: palette.code }, // inline code + fenced code text
    { tag: t.list, color: palette.text }, // list item prose
    { tag: t.quote, color: palette.text }, // blockquote prose (VS Code keeps it plain)
    { tag: t.labelName, color: palette.text }, // code-fence language + link label
    { tag: t.link, color: palette.text }, // link text + brackets
    { tag: t.url, color: palette.text, textDecoration: "underline" }, // raw URL/autolink
    { tag: t.contentSeparator, color: palette.punctuation }, // horizontal rule
    // Mark overrides. These MUST come after the content rules above: a list/quote
    // mark also inherits the `list`/`quote` tag, and within one HighlightStyle the
    // later rule's class wins on equal CSS specificity.
    { tag: mdMark.code, color: palette.code }, // backticks / fences
    { tag: mdMark.list, color: palette.listMark }, // -, *, 1.
    { tag: mdMark.quote, color: palette.quoteMark }, // >
  ];
}

/**
 * VS Code Dark+ theme tuned for Markdown. Use as the editor `theme` for Markdown
 * documents; it still styles embedded (fenced) code via the base vscodeDark
 * rules, so nested languages keep their normal VS Code colors.
 */
export const vscodeDarkMarkdown = vscodeDarkInit({
  settings: { foreground: VS.text }, // prose in white-ish instead of light-blue
  styles: markdownStyles(VS),
});

/** VS Code Light+ counterpart, applied when the app is in light mode. */
export const vscodeLightMarkdown = vscodeLightInit({
  settings: { foreground: VS_LIGHT.text },
  styles: markdownStyles(VS_LIGHT),
});
