from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.config import settings

template_dir = settings.BASE_DIR / "app" / "templates"

env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_template(template_name: str, context: dict) -> str:
    """
    Renderiza um template HTML puro injetando o dicionário de contexto.
    Ex: render_template("reports/daily_report.html", {"data": dados})
    """
    template = env.get_template(template_name)
    return template.render(**context)
