"""Knowledge base: URL scraping + document text extraction."""
import io
import logging
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def scrape_url(url: str) -> dict:
    """Fetch a URL and extract title + clean text."""
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ContentStudioBot/1.0)"}
    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "form"]):
        tag.decompose()
    title = soup.title.get_text(strip=True) if soup.title else url
    # Prefer article/main content
    main = soup.find("article") or soup.find("main") or soup.body or soup
    text = main.get_text(separator="\n", strip=True)
    lines = [ln.strip() for ln in text.splitlines() if len(ln.strip()) > 0]
    cleaned = "\n".join(lines)
    return {"title": title, "content": cleaned[:20000]}


def extract_document(filename: str, data: bytes) -> str:
    """Extract text from uploaded document bytes."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("txt", "md", "csv"):
        try:
            return data.decode("utf-8", errors="ignore")[:20000]
        except Exception:
            return ""
    if ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            parts = []
            for page in reader.pages[:30]:
                parts.append(page.extract_text() or "")
            return "\n".join(parts)[:20000]
        except Exception:
            logger.exception("PDF extract failed")
            return ""
    if ext == "docx":
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)[:20000]
        except Exception:
            logger.exception("DOCX extract failed")
            return ""
    return ""
