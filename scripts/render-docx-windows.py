"""Render a DOCX to page PNGs on Windows with LibreOffice and PDFium."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pypdfium2 as pdfium


def find_soffice() -> Path:
    candidates: list[Path] = []
    configured_path = os.environ.get("RP_SOFFICE_PATH")
    if configured_path:
        candidates.append(Path(configured_path))
    candidates.extend([
        Path(r"E:\CodexTools\LibreOffice-26.2.5\program\soffice.com"),
        Path(r"C:\Program Files\LibreOffice\program\soffice.com"),
        Path(r"C:\Program Files (x86)\LibreOffice\program\soffice.com"),
    ])
    for candidate in candidates:
        if candidate.exists():
            return candidate

    command = shutil.which("soffice")
    if command:
        return Path(command)
    raise FileNotFoundError("LibreOffice soffice를 찾을 수 없습니다.")


def convert_to_pdf(input_path: Path, output_dir: Path) -> Path:
    soffice = find_soffice()
    with tempfile.TemporaryDirectory(prefix="rp_soffice_profile_") as profile_dir:
        profile_uri = Path(profile_dir).resolve().as_uri()
        command = [
            str(soffice),
            f"-env:UserInstallation={profile_uri}",
            "--headless",
            "--invisible",
            "--nologo",
            "--nodefault",
            "--nolockcheck",
            "--norestore",
            "--convert-to",
            "pdf",
            "--outdir",
            str(output_dir),
            str(input_path),
        ]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "unknown error").strip()
            raise RuntimeError(f"LibreOffice PDF 변환 실패: {detail}")

    pdf_path = output_dir / f"{input_path.stem}.pdf"
    if not pdf_path.exists():
        raise RuntimeError("LibreOffice가 PDF 파일을 생성하지 않았습니다.")
    return pdf_path


def render_pages(pdf_path: Path, output_dir: Path, dpi: int) -> int:
    for stale_page in output_dir.glob("page-*.png"):
        stale_page.unlink()

    document = pdfium.PdfDocument(pdf_path)
    scale = dpi / 72
    try:
        for index in range(len(document)):
            page = document[index]
            bitmap = page.render(scale=scale)
            bitmap.to_pil().save(output_dir / f"page-{index + 1}.png")
            bitmap.close()
            page.close()
        return len(document)
    finally:
        document.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="렌더링할 DOCX 파일")
    parser.add_argument("--output-dir", required=True, type=Path, help="PDF와 PNG 출력 폴더")
    parser.add_argument("--dpi", type=int, default=144, help="페이지 이미지 해상도")
    parser.add_argument("--keep-pdf", action="store_true", help="중간 PDF를 출력 폴더에 유지")
    args = parser.parse_args()

    input_path = args.input.resolve()
    if input_path.suffix.lower() != ".docx" or not input_path.is_file():
        raise FileNotFoundError(f"유효한 DOCX 파일이 아닙니다: {input_path}")
    if not 72 <= args.dpi <= 300:
        raise ValueError("DPI는 72에서 300 사이여야 합니다.")

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = convert_to_pdf(input_path, output_dir)
    page_count = render_pages(pdf_path, output_dir, args.dpi)
    if not args.keep_pdf:
        pdf_path.unlink()
    print(f"Rendered {page_count} pages to {output_dir}")


if __name__ == "__main__":
    main()
