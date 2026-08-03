from weasyprint import HTML, CSS


def convert_html_to_pdf(html_content: str) -> bytes:
    """
    Recebe uma string HTML e converte diretamente para um buffer de bytes PDF.
    Aplica estilos extras para formatação de página A4 e margens.
    """
    extra_css = CSS(string="""
        @page {
            size: A4;
            margin: 15mm 15mm 20mm 15mm;
            @bottom-right {
                content: "Página " counter(page) " de " counter(pages);
                font-size: 9pt;
                color: #64748b;
                font-family: 'Segoe UI', Arial, sans-serif;
            }
        }
        body {
            background-color: #ffffff !important;
            color: #0f172a !important;
        }
        div, table {
            page-break-inside: avoid;
        }
    """)

    pdf_bytes = HTML(string=html_content).write_pdf(stylesheets=[extra_css])
    return pdf_bytes
