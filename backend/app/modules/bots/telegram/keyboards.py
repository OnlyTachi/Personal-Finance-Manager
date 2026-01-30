def build_categorization_prompt(description: str, value: float, context: str, history_examples: list) -> str:
    # Formata exemplos históricos para "ensinar" a IA o estilo do usuário (Few-Shot)
    examples_text = ""
    if history_examples:
        examples_text = "Exemplos de como este usuário categoriza:\n"
        for ex in history_examples:
            # ex deve ser um dicionário ou objeto Movimentacao
            detalhe = f" ({ex.observacao})" if hasattr(ex, 'observacao') and ex.observacao else ""
            desc = getattr(ex, 'descricao', '')
            val = getattr(ex, 'valor', 0)
            cat = getattr(ex, 'categoria', 'Outros')
            examples_text += f"- Entrada: '{desc}{detalhe}' (R$ {abs(val):.2f}) -> Categoria: {cat}\n"

    return f"""
    Você é um assistente financeiro especialista em categorização de despesas no Brasil.
    
    SUA MISSÃO: Classificar a transação financeira abaixo em uma categoria padrão.
    
    REGRA DE OURO: Responda APENAS um JSON válido. Não escreva markdown, não explique nada. Apenas JSON.
    
    Categorias Válidas: [Alimentação, Transporte, Moradia & Contas, Lazer & Assinaturas, Saúde, Compras, Investimentos, Salário & Renda, Transferências, Educação]

    {examples_text}
    
    ---
    NOVA TRANSAÇÃO PARA ANALISAR:
    Descrição: "{description}"
    Contexto Extra (Histórico/Detalhes): "{context}"
    Valor: R$ {value:.2f}
    
    Responda no formato: {{"categoria": "Sua Escolha"}}
    """