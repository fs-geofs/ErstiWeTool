let parseMarkdown;

/**
 * Marked autolinks an email address that is used as a link label, and that
 * splits `[name@host](mailto:name@host)` into two broken anchors. Turn those
 * links into HTML first. The label and target are already escaped by
 * Handlebars, and the pattern rejects raw quotes and angle brackets.
 */
function protectEmailLinks(source) {
  return source.replace(/\[([^\]\n<>"]+)\]\(([^)\n<>"]+)\)/g, (match, label, href) => {
    if (!label.includes('@')) return match;
    return '<a href="' + href.replace(/ /g, '%20') + '">' + label + '</a>';
  });
}

/**
 * Renders Markdown to HTML. `marked` is ESM-only, so it is loaded with
 * dynamic import from this CommonJS module.
 */
async function renderMarkdown(source) {
  if (!parseMarkdown) {
    const { Marked } = await import('marked');
    const parser = new Marked({ async: false, gfm: true });
    parseMarkdown = (input) => parser.parse(input);
  }

  return parseMarkdown(protectEmailLinks(source));
}

module.exports = renderMarkdown;
