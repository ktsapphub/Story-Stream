"""Exporters: produce downloadable files in HTML, Markdown, WordPress, CSV, PDF, TXT."""
import io
import csv
import json
import html as html_lib
import markdown as md_lib


def _tracked_url(url: str, campaign: str = "", cid: str = "") -> str:
    """Append UTM + click-id tracking params to an external Read More URL."""
    if not url:
        return url
    import urllib.parse
    params = {"utm_source": "newsletter", "utm_medium": "email"}
    if campaign:
        params["utm_campaign"] = campaign
    if cid:
        params["cs_cid"] = cid
    sep = "&" if "?" in url else "?"
    return url + sep + urllib.parse.urlencode(params)


def _campaign_slug(s: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in (s or "newsletter").lower()).strip("-")[:60] or "newsletter"


def content_to_markdown(content: dict) -> str:
    """Return a markdown representation for blog OR newsletter content."""
    title = content.get("title", "Untitled")
    if content.get("type") == "newsletter" and content.get("newsletter"):
        nl = content["newsletter"]
        brand = nl.get("brand_name") or "Story Stream"
        camp = _campaign_slug(nl.get("subject") or brand)
        parts = [f"# {nl.get('subject', title)}\n"]
        if nl.get("preheader"):
            parts.append(f"_{nl['preheader']}_\n")
        for sec in nl.get("sections", []):
            head = sec.get("subheader") or sec.get("heading")
            if head:
                parts.append(f"## {head}\n")
            media = sec.get("media") or {}
            if media.get("url"):
                parts.append(f"![]({media['url']})\n")
            body = sec.get("excerpt") or sec.get("content", "")
            parts.append(f"{body}\n")
            if sec.get("read_more_url"):
                label = sec.get("read_more_text") or "Read More"
                parts.append(f"[{label}]({_tracked_url(sec['read_more_url'], camp, sec.get('id',''))})\n")
        if nl.get("cta_text"):
            parts.append(f"\n[{nl['cta_text']}]({nl.get('cta_url', '#')})\n")
        if nl.get("footer_text"):
            parts.append(f"\n---\n_{nl['footer_text']}_\n")
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


def _render_branded_newsletter_html(content: dict) -> str:
    """Rich branded HTML for a builder-composed newsletter."""
    nl = content.get("newsletter", {}) or {}
    colors = nl.get("colors") or {}
    primary = colors.get("primary", "#835ef5")
    accent = colors.get("accent", "#5b3fd6")
    bg = colors.get("background", "#fffbf6")
    text = colors.get("text", "#24170f")
    hfont = nl.get("heading_font") or "Playfair Display"
    bfont = nl.get("body_font") or "Montserrat"
    brand = html_lib.escape(nl.get("brand_name") or "Story Stream")
    logo = nl.get("logo_url") or ""
    subject = html_lib.escape(nl.get("subject") or content.get("title") or "")
    preheader = html_lib.escape(nl.get("preheader") or "")
    camp = _campaign_slug(nl.get("subject") or brand)

    logo_html = (f'<img src="{html_lib.escape(logo)}" alt="{brand}" style="max-height:56px;margin:0 auto 10px;display:block"/>'
                 if logo else "")
    secs = []
    for sec in nl.get("sections", []):
        head = html_lib.escape(sec.get("subheader") or sec.get("heading") or "")
        body = html_lib.escape(sec.get("excerpt") or sec.get("content") or "").replace("\n", "<br/>")
        media = sec.get("media") or {}
        ratio = sec.get("media_ratio") or "landscape"
        ar = {"square": "1 / 1", "portrait": "3 / 4", "landscape": "16 / 9"}.get(ratio, "16 / 9")
        maxw = {"square": "300px", "portrait": "260px", "landscape": "100%"}.get(ratio, "100%")
        media_html = ""
        if media.get("url"):
            murl = html_lib.escape(media["url"])
            wrap_open = f'<div style="max-width:{maxw};margin:0 auto 4px">'
            if (media.get("type") or "image") == "video":
                media_html = f'{wrap_open}<a href="{murl}" style="display:block"><div style="position:relative;border-radius:12px;overflow:hidden;background:#000;aspect-ratio:{ar}"><img src="{murl}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;opacity:.85"/><span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:34px">&#9658;</span></div></a></div>'
            else:
                media_html = f'{wrap_open}<img src="{murl}" alt="" style="width:100%;aspect-ratio:{ar};object-fit:cover;border-radius:12px;display:block"/></div>'
        read_more = ""
        if sec.get("read_more_url"):
            label = html_lib.escape(sec.get("read_more_text") or "Read More")
            href = html_lib.escape(_tracked_url(sec["read_more_url"], camp, sec.get("id", "")))
            read_more = (f'<a href="{href}" style="display:inline-block;margin-top:12px;background:{primary};color:#fff;'
                         f'text-decoration:none;padding:10px 22px;border-radius:10px;font-weight:600">{label}</a>')
        secs.append(f"""
    <tr><td style="padding:22px 0;border-bottom:1px solid #ece7f7">
      {media_html}
      <h2 style="font-family:'{hfont}',Georgia,serif;color:{accent};font-size:22px;margin:14px 0 8px">{head}</h2>
      <p style="margin:0;color:{text};font-size:15px;line-height:1.7">{body}</p>
      {read_more}
    </td></tr>""")
    footer = html_lib.escape(nl.get("footer_text") or "")
    body_cta = ""
    if nl.get("cta_text"):
        body_cta = (f'<div style="text-align:center;margin:26px 0"><a href="{html_lib.escape(nl.get("cta_url","#"))}" '
                    f'style="background:{accent};color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700">{html_lib.escape(nl["cta_text"])}</a></div>')
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{subject}</title></head>
<body style="margin:0;padding:0;background:{bg};font-family:'{bfont}',Arial,sans-serif">
<span style="display:none;visibility:hidden;opacity:0;height:0;width:0">{preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{bg};padding:24px 0">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:16px;padding:28px 28px;border:1px solid #ece7f7">
  <tr><td style="text-align:center;border-bottom:2px solid {primary};padding-bottom:16px">
    {logo_html}
    <div style="font-family:'{hfont}',Georgia,serif;color:{primary};font-size:26px;font-weight:700">{brand}</div>
    <div style="color:{text};font-size:15px;margin-top:6px">{subject}</div>
  </td></tr>
  {''.join(secs)}
  <tr><td>{body_cta}</td></tr>
  <tr><td style="padding-top:18px;text-align:center;color:#8a839c;font-size:12px">{footer}</td></tr>
</table>
</td></tr></table>
</body></html>"""


def export_html(content: dict, standalone: bool = True):
    if content.get("type") == "newsletter" and (content.get("newsletter") or {}).get("builder"):
        return _render_branded_newsletter_html(content).encode("utf-8"), "text/html", "html"
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
