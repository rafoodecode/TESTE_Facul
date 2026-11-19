"""Gera relatórios acadêmico e técnico em Word a partir da execução Robot real."""

import json
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from PIL import Image

from relatorio_robot import CASOS

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "relatorios"
XML = RAIZ / "robot-results" / "output.xml"


def dados_execucao():
    raiz_xml = ET.parse(XML).getroot()
    testes = {teste.attrib["name"].split()[0]: teste for teste in raiz_xml.iter("test")}
    if set(testes) != {caso[0] for caso in CASOS}:
        raise SystemExit("Execute a suíte Robot completa antes de gerar os documentos.")
    data = datetime.fromisoformat(raiz_xml.attrib["generated"]).strftime("%d/%m/%Y %H:%M")
    return testes, data


def preparar_doc(titulo):
    doc = Document()
    secao = doc.sections[0]
    secao.top_margin = secao.bottom_margin = Cm(1.8)
    secao.left_margin = secao.right_margin = Cm(2)
    normal = doc.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10)
    for nome in ("Title", "Subtitle", "Heading 1", "Heading 2"):
        doc.styles[nome].font.color.rgb = RGBColor(0, 0, 0)
    propriedades = doc.styles["Title"]._element.pPr
    if propriedades is not None:
        for borda in propriedades.findall(qn("w:pBdr")):
            propriedades.remove(borda)
    doc.add_paragraph(titulo, style="Title")
    rodape = secao.footer.paragraphs[0]
    rodape.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rodape.add_run("SGE  •  Testes automatizados em Robot Framework")
    return doc


def rotulo(doc, nome, valor):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(9)
    p.add_run(nome + ": ").bold = True
    p.add_run(valor)


def relatorio_academico(testes, data):
    passou = sum(teste.find("status").attrib["status"] == "PASS" for teste in testes.values())
    doc = preparar_doc("Relatório acadêmico dos sete testes em Robot Framework")
    doc.add_paragraph("Sistema de Gestão de Eventos e Espaços. Este documento apresenta um caso por parte, com objetivo, palavras-chave, resultado e captura da execução local.")
    doc.add_paragraph(f"Execução em {data}  |  {passou} PASS  |  {7 - passou} FAIL", style="Subtitle")
    doc.add_paragraph("Ferramentas: Robot Framework, SeleniumLibrary, Chrome, PostgreSQL local e capturador SMTP local.")
    doc.add_paragraph("O grupo pode apresentar cada parte separadamente. As respostas HTTP e as notificações são verificadas pelas palavras-chave e registradas no log Robot; uma captura isolada não demonstra essas respostas.")
    doc.add_paragraph("Os resultados se limitam aos sete cenários locais. Entrega externa de e-mail e site publicado precisam de homologação própria.")

    for indice, (codigo, tema, esperado, recursos) in enumerate(CASOS, 1):
        doc.add_page_break()
        doc.add_heading(f"Parte {indice}  {codigo}  {tema}", level=1)
        rotulo(doc, "O que o teste verifica", esperado)
        rotulo(doc, "Como foi automatizado", recursos)
        status = testes[codigo].find("status")
        resultado = status.attrib["status"]
        rotulo(doc, "Resultado observado", resultado + (". O comportamento esperado foi confirmado." if resultado == "PASS" else ". " + (status.text or "Consulte o log Robot.").splitlines()[0]))
        doc.add_paragraph("Evidência da tela", style="Heading 2")
        arquivo = RAIZ / "evidencias" / f"{codigo}.png"
        if arquivo.exists():
            with Image.open(arquivo) as imagem:
                largura, altura = imagem.size
            escala = min(15.7 / largura, 14.0 / altura)
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.add_run().add_picture(str(arquivo), width=Cm(largura * escala), height=Cm(altura * escala))
        doc.add_paragraph(f"Captura: evidencias/{codigo}.png. Passos e asserções: robot-results/log.html.")
    destino = SAIDA / "Relatorio_Academico_Robot_7_Testes.docx"
    doc.save(destino)
    return destino


def relatorio_tecnico(testes, data):
    passou = sum(teste.find("status").attrib["status"] == "PASS" for teste in testes.values())
    pacote = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
    linhas = ["# Relatório técnico de execução Robot Framework", "",
              "## I. Informações gerais", "",
              f"- Projeto: SGE – Sistema de Gestão de Eventos e Espaços", f"- Versão: {pacote['version']}",
              "- Responsável: equipe do projeto (nomes não informados)", f"- Execução: {data}",
              "- Ambiente: Next.js e PostgreSQL locais; Chrome; capturador SMTP local", "",
              "## II. Resumo de execução", "",
              f"7 casos planejados e executados; {passou} PASS ({passou/7:.0%}); {7-passou} FAIL ({(7-passou)/7:.0%}).", "",
              "## III. Detalhamento", "",
              "| Caso | Categoria | Resultado | Evidência |", "|---|---|---|---|"]
    for codigo, tema, _, _ in CASOS:
        teste = testes[codigo]
        tags = ", ".join(tag.text for tag in teste.findall("tag"))
        linhas.append(f"| {codigo} — {tema} | {tags} | {teste.find('status').attrib['status']} | [captura](../evidencias/{codigo}.png) |")
    linhas += ["", "## IV. Defeitos observados", "",
              "Nenhum defeito do SGE foi identificado nos sete casos desta execução." if passou == 7 else "Consulte as falhas em `robot-results/log.html` e classifique cada defeito após análise.", "",
              "## V. Conclusão e recomendações", "",
              "Aprovada com ressalvas para os sete fluxos locais." if passou == 7 else "Requer correção e nova execução dos casos que falharam.",
              "O resultado não representa cobertura integral dos requisitos. O capturador SMTP confirma o aviso local, mas não a entrega em caixa externa. O site publicado não foi avaliado nesta rodada.", "",
              "Artefatos de auditoria: `robot-results/output.xml`, `robot-results/report.html`, `robot-results/log.html` e sete capturas `evidencias/RBT-CTxx.png`.", ""]
    md = SAIDA / "Relatorio_Tecnico_Robot_7_Testes.md"
    md.write_text("\n".join(linhas), encoding="utf-8")

    doc = preparar_doc("Relatório técnico de execução Robot Framework")
    doc.add_paragraph(f"Sete fluxos do SGE foram executados em {data} no ambiente local. {passou} passaram e {7-passou} falharam.")
    doc.add_heading("I Informações gerais", level=1)
    for nome, valor in (("Projeto", "SGE – Sistema de Gestão de Eventos e Espaços"), ("Versão", pacote["version"]), ("Responsável", "Equipe do projeto (nomes não informados)"), ("Ambiente", "Next.js, PostgreSQL e SMTP locais; Chrome")):
        rotulo(doc, nome, valor)
    doc.add_heading("II Resumo de execução", level=1)
    doc.add_paragraph(f"Planejados: 7    Executados: 7    PASS: {passou} ({passou/7:.0%})    FAIL: {7-passou} ({(7-passou)/7:.0%})")
    doc.add_heading("III Detalhamento dos resultados", level=1)
    tabela = doc.add_table(rows=1, cols=4)
    tabela.style = "Table Grid"
    for coluna, largura in zip(tabela.columns, (6.0, 4.0, 2.0, 3.5)):
        coluna.width = Cm(largura)
    for celula, texto in zip(tabela.rows[0].cells, ("Caso", "Categoria", "Resultado", "Evidência")):
        celula.text = texto
    for codigo, tema, _, _ in CASOS:
        teste = testes[codigo]
        valores = (f"{codigo} {tema}", ", ".join(tag.text for tag in teste.findall("tag")), teste.find("status").attrib["status"], f"{codigo}.png")
        for celula, valor in zip(tabela.add_row().cells, valores):
            celula.text = valor
    doc.add_heading("IV Defeitos observados", level=1)
    doc.add_paragraph("Nenhum defeito do SGE foi identificado nos sete casos desta execução." if passou == 7 else "As falhas devem ser analisadas no log Robot antes da classificação dos defeitos.")
    doc.add_heading("V Conclusão e recomendações", level=1)
    doc.add_paragraph("Aprovada com ressalvas para os sete fluxos locais." if passou == 7 else "Requer correção e nova execução.")
    doc.add_paragraph("A execução não cobre todos os requisitos. O SMTP local valida o aviso até o capturador; entrega externa e site publicado requerem homologação própria.")
    doc.add_paragraph("Auditoria: output.xml, report.html, log.html e capturas RBT-CT01 a RBT-CT07.")
    destino = SAIDA / "Relatorio_Tecnico_Robot_7_Testes.docx"
    doc.save(destino)
    return md, destino


if __name__ == "__main__":
    testes, data = dados_execucao()
    print(relatorio_academico(testes, data))
    print(*relatorio_tecnico(testes, data), sep="\n")
