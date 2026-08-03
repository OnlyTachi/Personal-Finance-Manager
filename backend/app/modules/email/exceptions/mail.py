from fastapi import HTTPException, status


class IMAPCredentialsMissingException(HTTPException):
    def __init__(
        self,
        detail: str = "Nenhuma conta de e-mail IMAP vinculada. Por favor, conecte seu e-mail nas Configurações.",
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMAIL_NOT_CONFIGURED",
                "message": detail,
                "action_required": "LINK_EMAIL_ACCOUNT",
            },
        )


class IMAPAuthenticationFailedException(HTTPException):
    def __init__(
        self,
        detail: str = "Falha ao autenticar no servidor de e-mail. Verifique seu e-mail e senha de aplicativo.",
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "EMAIL_AUTH_FAILED", "message": detail},
        )
