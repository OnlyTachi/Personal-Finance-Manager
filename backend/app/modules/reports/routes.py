from typing import Optional
from fastapi.responses import Response

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Body
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.reports import service, mailer, schemas, models
from app.modules.reports.schemas import CustomReportFilterInput
from app.core.templating import render_template
from app.modules.reports.services.webhook_service import send_discord_webhook

router = APIRouter()


@router.post("/preferences/test-webhook")
def test_discord_webhook(
    payload: dict = Body(...),
):
    url = payload.get("discord_webhook_url")
    if not url:
        raise HTTPException(status_code=400, detail="URL do Webhook não informada.")

    success = send_discord_webhook(
        webhook_url=url,
        title="🔔 Teste de Conexão do Webhook",
        description="Se você está lendo esta mensagem, o seu Webhook do Discord foi configurado com sucesso!",
        color_type="SUCCESS",
    )
    if not success:
        raise HTTPException(
            status_code=400, detail="Falha ao disparar mensagem para o Discord."
        )
    return {"message": "Webhook testado com sucesso!"}


@router.get("/annual-report/excel")
def download_annual_report_excel(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    excel_bytes = service.generate_annual_excel_report(db, current_user.username, year)
    filename = f"relatorio_anual_irpf_{year or 'passado'}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/custom-report/excel")
def download_custom_report_excel(
    payload: schemas.CustomReportFilterInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    excel_bytes = service.generate_custom_excel_report(
        db, current_user.username, payload
    )
    filename = (
        f"relatorio_personalizado_{payload.data_inicio}_a_{payload.data_fim}.xlsx"
    )

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/monthly-report/pdf")
def download_monthly_report_pdf(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = service.generate_monthly_pdf(db, current_user.username, month, year)
    filename = f"relatorio_mensal_{month or 'atual'}_{year or 'atual'}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/annual-report/pdf")
def download_annual_report_pdf(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = service.generate_annual_pdf(db, current_user.username, year)
    filename = f"informe_irpf_anual_{year or 'passado'}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/custom-report/pdf")
def download_custom_report_pdf(
    payload: schemas.CustomReportFilterInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pdf_bytes = service.generate_custom_pdf(db, current_user.username, payload)
    filename = f"relatorio_personalizado_{payload.data_inicio}_a_{payload.data_fim}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/custom-report/preview")
def preview_custom_report(
    payload: CustomReportFilterInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = service.get_custom_report_data(db, current_user.username, payload)

    if payload.formato_saida == "csv":
        csv_content = service.generate_custom_csv_report(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=relatorio_{payload.data_inicio}_{payload.data_fim}.csv"
            },
        )

    html = render_template("reports/custom_report.html", {"data": data})
    return {"data": data, "html_preview": html}


@router.post("/custom-report/send-now")
def send_custom_report_now(
    payload: CustomReportFilterInput,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = service.get_or_create_preferences(db, current_user.username)
    if not prefs.contact_email:
        raise HTTPException(
            status_code=400,
            detail="Nenhum e-mail de contato configurado para receber o relatório.",
        )
    data = service.get_custom_report_data(db, current_user.username, payload)
    html = render_template("reports/custom_report.html", {"data": data})

    background_tasks.add_task(
        mailer.send_email_html,
        to_email=prefs.contact_email,
        subject=f"Relatório Personalizado ({data['periodo']['inicio']} a {data['periodo']['fim']})",
        html_content=html,
    )
    return {
        "message": f"Relatório Personalizado agendado para envio em {prefs.contact_email}."
    }


@router.get("/annual-report/preview")
def preview_annual_report(
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = service.get_annual_report_data(db, current_user.username, year)
    html = render_template("reports/annual_report.html", {"data": data})
    return {"data": data, "html_preview": html}


@router.post("/annual-report/send-now")
def send_annual_report_now(
    background_tasks: BackgroundTasks,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = service.get_or_create_preferences(db, current_user.username)
    if not prefs.contact_email:
        raise HTTPException(
            status_code=400,
            detail="Nenhum e-mail de contato configurado para receber o relatório.",
        )
    data = service.get_annual_report_data(db, current_user.username, year)
    html = render_template("reports/annual_report.html", {"data": data})
    background_tasks.add_task(
        mailer.send_email_html,
        to_email=prefs.contact_email,
        subject=f"Relatório Anual e Informe IRPF ({data['ano']})",
        html_content=html,
    )
    return {"message": f"Relatório Anual agendado para envio em {prefs.contact_email}."}


@router.get("/monthly-report/preview")
def preview_monthly_report(
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = service.get_monthly_report_data(db, current_user.username, month, year)
    html = render_template("reports/monthly_report.html", {"data": data})
    return {"data": data, "html_preview": html}


@router.post("/monthly-report/send-now")
def send_monthly_report_now(
    background_tasks: BackgroundTasks,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    prefs = service.get_or_create_preferences(db, current_user.username)
    if not prefs.contact_email:
        raise HTTPException(
            status_code=400,
            detail="Nenhum e-mail de contato configurado para receber o relatório.",
        )
    data = service.get_monthly_report_data(db, current_user.username, month, year)
    html = render_template("reports/monthly_report.html", {"data": data})
    background_tasks.add_task(
        mailer.send_email_html,
        to_email=prefs.contact_email,
        subject=f"Relatório Mensal de Fechamento ({data['periodo']})",
        html_content=html,
    )
    return {
        "message": f"Relatório Mensal agendado para envio em {prefs.contact_email}."
    }


# --- RELATÓRIO SEMANAL ---


@router.get("/weekly-report/preview")
def preview_weekly_report(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Retorna os dados compilados e o HTML pré-visualizável do Relatório Semanal.
    """
    data = service.get_weekly_report_data(db, current_user.username)
    html = render_template("reports/weekly_report.html", {"data": data})
    return {"data": data, "html_preview": html}


@router.post("/weekly-report/send-now")
def send_weekly_report_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispara o envio do Relatório Semanal para o e-mail de contato cadastrado no banco.
    """
    prefs = service.get_or_create_preferences(db, current_user.username)
    if not prefs.contact_email:
        raise HTTPException(
            status_code=400,
            detail="Nenhum e-mail de contato configurado para receber o relatório.",
        )

    data = service.get_weekly_report_data(db, current_user.username)
    html = render_template("reports/weekly_report.html", {"data": data})

    background_tasks.add_task(
        mailer.send_email_html,
        to_email=prefs.contact_email,
        subject=f"🛣️ Relatório Semanal: Correção de Rota ({data['periodo_texto']})",
        html_content=html,
    )
    return {
        "message": f"Relatório Semanal agendado para envio em {prefs.contact_email}."
    }


# --- PREFERÊNCIAS E AGENDAMENTOS ---


@router.get("/preferences", response_model=schemas.ReportPreferenceResponse)
def get_report_preferences(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retorna as configurações de agendamento e e-mail de contato do usuário."""
    return service.get_or_create_preferences(db, current_user.username)


@router.put("/preferences", response_model=schemas.ReportPreferenceResponse)
def update_report_preferences(
    payload: schemas.ReportPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Atualiza o e-mail de contato e os horários/dias de agendamento."""
    return service.update_preferences(db, current_user.username, payload)


# --- CHECK-UP DIÁRIO ---


@router.get("/daily-checkup/preview")
def preview_daily_checkup(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Retorna os dados do Check-up e o HTML pré-visualizável."""
    data = service.get_daily_checkup_data(db, current_user.username)
    html = render_template("reports/daily_report.html", {"data": data})
    return {"data": data, "html_preview": html}


@router.post("/daily-checkup/send-now")
def send_daily_checkup_now(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dispara o envio do Check-up Diário para o e-mail de contato cadastrado no banco."""
    prefs = service.get_or_create_preferences(db, current_user.username)

    if not prefs.contact_email:
        raise HTTPException(
            status_code=400,
            detail="Nenhum e-mail de contato configurado para receber o relatório.",
        )

    data = service.get_daily_checkup_data(db, current_user.username)
    html = render_template("reports/daily_report.html", {"data": data})

    background_tasks.add_task(
        mailer.send_email_html,
        to_email=prefs.contact_email,
        subject=f"⚡ Check-up Diário: Resumo de {data['data_referencia']}",
        html_content=html,
    )
    return {"message": f"Check-up Diário agendado para envio em {prefs.contact_email}."}


@router.post("/daily-checkup/send")
def send_daily_checkup_to_target(
    target_email: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispara o envio do Check-up Diário para o e-mail informado.
    """
    data = service.get_daily_checkup_data(db, current_user.username)
    html = render_template("reports/daily_report.html", {"data": data})

    background_tasks.add_task(
        mailer.send_email_html,
        to_email=target_email,
        subject=f"⚡ Check-up Diário: Resumo de {data['data_referencia']}",
        html_content=html,
    )
    return {"message": "Envio do Check-up Diário agendado em segundo plano."}
