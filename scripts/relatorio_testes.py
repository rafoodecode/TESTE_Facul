"""Gera relatório Markdown e Word a partir do JSON real do Playwright."""

import json
import os
import re
from datetime import datetime
from pathlib import Path

from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "test-results" / "resultados.json"
SAIDA = RAIZ / "relatorios"


def coletar(suites):
    casos = []
    for suite in suites:
        for spec in suite.get("specs", []):
            titulo = spec["title"]
            identificador = re.search(r"[A-Z]+\d*-CT\d+", titulo)
            if not identificador:
                continue
            resultados = [r for teste in spec.get("tests", []) for r in teste.get("results", [])]
            status = "PASS" if resultados and all(r.get("status") == "passed" for r in resultados) else "FAIL"
            erro = next((r.get("error", {}).get("message", "") for r in resultados if r.get("status") != "passed"), "")
            observacao = re.sub(r"\x1b\[[0-9;]*m", "", erro).splitlines()[0][:180] if erro else "Comportamento esperado confirmado."
            casos.append((identificador.group(), titulo.split(" @")[0], status, observacao))
        casos.extend(coletar(suite.get("suites", [])))
    return casos


def main():
    if not ENTRADA.exists():
        raise SystemExit("Execute a suíte Playwright antes de gerar o relatório.")
    dados = json.loads(ENTRADA.read_text(encoding="utf-8"))
    casos = coletar(dados.get("suites", []))
    if not casos:
        raise SystemExit("O JSON não contém casos executados com ID rastreável.")
    SAIDA.mkdir(exist_ok=True)
    pacote = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
    planejados = len(casos)
    passaram = sum(c[2] == "PASS" for c in casos)
    falharam = planejados - passaram
    autor = os.getenv("QA_AUTOR", "Equipe QA")
    data = datetime.now().strftime("%d/%m/%Y %H:%M")
    referencias_completas = os.getenv("QA_REFERENCIAS_COMPLETAS") == "1"
    decisao = ("Aprovada" if referencias_completas else "Aprovada com ressalvas") if falharam == 0 else ("Aprovada com ressalvas" if falharam <= 2 else "Reprovada")
    defeitos = [(f"DEF-{i:03}", c[0], c[3], "Alta" if c[0].startswith(("RF13", "RF14", "RN06")) else "Média") for i, c in enumerate((c for c in casos if c[2] == "FAIL"), 1)]

    linhas = ["# Relatório de Execução de Casos de Teste", "", "## I. Informações Gerais", "",
              f"- Projeto: SGE – Sistema de Gestão de Eventos e Espaços", f"- Versão: {pacote['version']}",
              f"- Autor: {autor}", f"- Data de execução: {data}", "",
              "## II. Resumo de Execução", "",
              "| Planejados | Executados | Passaram | Falharam | Percentual PASS | Percentual FAIL |",
              "|---:|---:|---:|---:|---:|---:|",
              f"| {planejados} | {len(casos)} | {passaram} | {falharam} | {passaram/planejados:.1%} | {falharam/planejados:.1%} |", "",
              "## III. Detalhamento dos Resultados", "",
              "| Caso de Teste | Resultado | Observações | Evidência |", "|---|---|---|---|"]
    for codigo, titulo, status, observacao in casos:
        evidencia = f"../evidencias/{codigo}.png"
        linhas.append(f"| {titulo} | {status} | {observacao.replace('|', '/')} | [Captura]({evidencia}) |")
    linhas += ["", "## IV. Lista de Defeitos", "", "| ID | Caso | Descrição | Severidade |", "|---|---|---|---|"]
    linhas += [f"| {codigo} | {caso} | {descricao.replace('|', '/')} | {sev} |" for codigo, caso, descricao, sev in defeitos]
    if not defeitos:
        linhas.append("| — | — | Nenhum defeito identificado nesta execução. | — |")
    recomendacao = "Revise cada falha e sua captura antes da entrega." if falharam else "Nenhuma falha foi identificada nos casos executados."
    linhas += ["", "## V. Conclusão e Recomendações", "", f"Resultado: **{decisao}**.",
              "", f"A classificação considera somente os casos executados. {recomendacao}",
              "Os dois RF novos e o template citado aguardam os documentos de referência para ampliar a matriz.", ""]
    (SAIDA / "Relatorio_Execucao_Casos_de_Teste.md").write_text("\n".join(linhas), encoding="utf-8")

    doc = Document()
    sec = doc.sections[0]; sec.top_margin = Cm(2); sec.bottom_margin = Cm(2)
    sec.left_margin = Cm(2); sec.right_margin = Cm(2)
    normal = doc.styles["Normal"]; normal.font.name = "Aptos"; normal.font.size = Pt(9)
    titulo = doc.styles["Title"]; titulo.font.color.rgb = RGBColor(0, 0, 0)
    titulo.font.name = "Aptos"; titulo.font.size = Pt(21)
    if titulo._element.pPr is not None:
        for borda in titulo._element.pPr.findall(qn("w:pBdr")):
            titulo._element.pPr.remove(borda)
    doc.add_paragraph("Relatório de Execução de Casos de Teste", style="Title")
    doc.add_paragraph("SGE Sistema de Gestão de Eventos e Espaços. Este relatório registra os resultados reais da suíte Playwright e suas evidências.")
    doc.add_heading("I Informações Gerais", level=1)
    for rotulo, valor in [("Projeto", "SGE – Sistema de Gestão de Eventos e Espaços"), ("Versão", pacote["version"]), ("Autor", autor), ("Data de execução", data)]:
        doc.add_paragraph(f"{rotulo}: {valor}")
    doc.add_heading("II Resumo de Execução", level=1)
    doc.add_paragraph(f"Planejados: {planejados}   Executados: {len(casos)}   PASS: {passaram} ({passaram/planejados:.1%})   FAIL: {falharam} ({falharam/planejados:.1%})")
    doc.add_heading("III Detalhamento dos Resultados", level=1)
    tabela = doc.add_table(rows=1, cols=4); tabela.style = "Table Grid"
    for celula, titulo in zip(tabela.rows[0].cells, ["Caso de Teste", "Resultado", "Observações", "Evidência"]): celula.text = titulo
    for codigo, titulo, status, observacao in casos:
        for celula, valor in zip(tabela.add_row().cells, [titulo, status, observacao, f"evidencias/{codigo}.png"]): celula.text = valor
    for linha in tabela.rows:
        linha._tr.get_or_add_trPr().append(OxmlElement("w:cantSplit"))
    doc.add_heading("IV Lista de Defeitos", level=1)
    tabela = doc.add_table(rows=1, cols=4); tabela.style = "Table Grid"
    for celula, titulo in zip(tabela.rows[0].cells, ["ID", "Caso", "Descrição", "Severidade"]): celula.text = titulo
    for defeito in defeitos:
        for celula, valor in zip(tabela.add_row().cells, defeito): celula.text = valor
    if not defeitos:
        for celula, valor in zip(tabela.add_row().cells, ["—", "—", "Nenhum defeito identificado nesta execução.", "—"]): celula.text = valor
    doc.add_heading("V Conclusão e Recomendações", level=1)
    doc.add_paragraph(f"Resultado: {decisao}. {recomendacao} Os dois RF novos e o template citado aguardam os documentos de referência.")
    doc.save(SAIDA / "Relatorio_Execucao_Casos_de_Teste.docx")
    print(f"Relatório gerado: {len(casos)} casos, {passaram} PASS, {falharam} FAIL.")


if __name__ == "__main__":
    main()
