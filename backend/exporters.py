"""Exporters: produce downloadable files in HTML, Markdown, WordPress, CSV, PDF, TXT."""
import io
import csv
import json
import html as html_lib
import markdown as md_lib


def content_to_markdown(content: dict) -> str:
    """Return a markdown representation for blog OR newsletter content."""
    title = content.get("title", "Untitled")
    if content.get("type") == "newsletter" and content.get("newsletter"):
        nl = content["newsletter"]
        parts = [f"# {nl.get('subject', title)}\n"]
        if nl.get("preheader"):
            parts.append(f"_{nl['preheader']}_\n")
        for sec in nl.get("sections", []):
            if sec.get("heading"):
                parts.append(f"## {sec['heading']}\n")
            parts.append(f"{sec.get('content', '')}\n")
        if nl.get("cta_text"):
            parts.append(f"\n[{nl['cta_text']}]({nl.get('cta_url', '#')})\n")
        return "\n".join(parts)
    # blog
    body = content.get("body_markdown", "")
    return f"# {title}\n\n{body}"


def _frontmatter(content: dict) -> str:
    tags = content.get("tags", []) or []
    fm = [
        "---",
        f"title: \"{content.get('title', '')}\"",
        f"slug: \"{content.get('slug', '')}\"",
        f"description: \"{content.get('meta_description', '')}\"",
        f"tags: [{', '.join(json.dumps(t) for t in tags)}]",
        f"excerpt: \"{(content.get('excerpt', '') or '').replace(chr(34), chr(39))}\"",
        "---",
    ]
    return "\n".join(fm)


def export_markdown(content: dict):
    body = f"{_frontmatter(content)}\n\n{content_to_markdown(content)}"
    return body.encode("utf-8"), "text/markdown", "md"


def _render_html_body(content: dict) -> str:
    md = content_to_markdown(content)
    return md_lib.markdown(md, extensions=["extra", "sane_lists"])


def export_html(content: dict, standalone: bool = True):
    inner = _render_html_body(content)
    header_img = ""
    if content.get("header_image") and content["header_image"].get("url"):
        header_img = f'<img src="{html_lib.escape(content["header_image"]["url"])}" alt="header" style="width:100%;border-radius:12px;margin-bottom:24px"/>'
    title = html_lib.escape(content.get("title", ""))
    meta = html_lib.escape(content.get("meta_description", ""))
    if not standalone:
        return (header_img + inner).encode("utf-8"), "text/html", "html"
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="description" content="{meta}"/>
<title>{title}</title>
<style>
  body {{ font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1c1430; line-height: 1.7; }}
  h1,h2,h3 {{ font-family: Georgia, serif; color: #5b3fd6; }}
  a {{ color: #835ef5; }}
  img {{ max-width: 100%; border-radius: 12px; }}
  blockquote {{ border-left: 3px solid #e4ddf7; margin-left:0; padding-left:16px; color:#5a5470; }}
</style>
</head>
<body>
{header_img}
{inner}
</body>
</html>"""
    return doc.encode("utf-8"), "text/html", "html"


def export_wordpress(content: dict):
    """WordPress-ready bundle: HTML content body + a meta JSON header comment."""
    inner = _render_html_body(content)
    meta = {
        "title": content.get("title", ""),
        "slug": content.get("slug", ""),
        "excerpt": content.get("excerpt", ""),
        "meta_description": content.get("meta_description", ""),
        "tags": content.get("tags", []),
        "status": "draft",
        "featured_image": (content.get("header_image") or {}).get("url", ""),
    }
    out = (
        "<!-- wp:content-studio meta -->\n"
        f"<!-- {json.dumps(meta)} -->\n"
        "<!-- /wp:content-studio meta -->\n\n"
        + inner
    )
    return out.encode("utf-8"), "text/html", "html"


def export_txt(content: dict):
    md = content_to_markdown(content)
    # strip basic markdown markers
    import re
    text = re.sub(r"[#*_`>]", "", md)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1 (\2)", text)
    return text.encode("utf-8"), "text/plain", "txt"


def export_csv(content: dict):
    buf = io.StringIO()
    writer = csv.writer(buf)
    if content.get("type") == "newsletter" and content.get("newsletter"):
        nl = content["newsletter"]
        writer.writerow(["subject", "preheader", "section_heading", "section_content", "cta_text", "cta_url"])
        for sec in nl.get("sections", []) or [{}]:
            writer.writerow([
                nl.get("subject", ""), nl.get("preheader", ""),
                sec.get("heading", ""), sec.get("content", ""),
                nl.get("cta_text", ""), nl.get("cta_url", ""),
            ])
    else:
        writer.writerow(["title", "slug", "meta_description", "tags", "excerpt", "body_markdown"])
        writer.writerow([
            content.get("title", ""), content.get("slug", ""),
            content.get("meta_description", ""), ", ".join(content.get("tags", []) or []),
            content.get("excerpt", ""), content.get("body_markdown", ""),
        ])
    return buf.getvalue().encode("utf-8"), "text/csv", "csv"


def _latin(s: str) -> str:
    return (s or "").encode("latin-1", "replace").decode("latin-1")


def _break_long_words(s: str, max_len: int = 40) -> str:
    """Insert spaces into very long unbreakable tokens so word-wrap can handle them."""
    out = []
    for word in (s or "").split(" "):
        while len(word) > max_len:
            out.append(word[:max_len])
            word = word[max_len:]
        out.append(word)
    return " ".join(out)


def _cell(pdf, h, text):
    from fpdf.enums import XPos, YPos
    pdf.multi_cell(0, h, _break_long_words(_latin(text)), new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def export_pdf(content: dict):
    from fpdf import FPDF
    import re
    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.set_margins(20, 20, 20)

    title = content.get("title", "Untitled")
    pdf.set_font("Helvetica", "B", 20)
    _cell(pdf, 9, title)
    pdf.ln(2)

    if content.get("meta_description"):
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(120, 100, 80)
        _cell(pdf, 6, content.get("meta_description"))
        pdf.set_text_color(36, 26, 18)
        pdf.ln(2)

    md = content_to_markdown(content)
    for raw in md.split("\n"):
        line = raw.rstrip()
        if not line:
            pdf.ln(3)
            continue
        if line.startswith("## "):
            pdf.set_font("Helvetica", "B", 15)
            _cell(pdf, 8, line[3:])
        elif line.startswith("# "):
            continue  # already have title
        elif line.startswith("### "):
            pdf.set_font("Helvetica", "B", 13)
            _cell(pdf, 7, line[4:])
        elif line.startswith("- ") or line.startswith("* "):
            pdf.set_font("Helvetica", "", 11)
            clean = re.sub(r"[*_`]", "", line[2:])
            _cell(pdf, 6, "  - " + clean)
        else:
            pdf.set_font("Helvetica", "", 11)
            clean = re.sub(r"[*_`#]", "", line)
            clean = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", clean)
            _cell(pdf, 6, clean)
    out = pdf.output()
    return bytes(out), "application/pdf", "pdf"


EXPORTERS = {
    "markdown": export_markdown,
    "html": export_html,
    "wordpress": export_wordpress,
    "csv": export_csv,
    "pdf": export_pdf,
    "txt": export_txt,
}


def export_content(content: dict, fmt: str):
    fn = EXPORTERS.get(fmt)
    if not fn:
        raise ValueError(f"Unknown export format: {fmt}")
    return fn(content)
