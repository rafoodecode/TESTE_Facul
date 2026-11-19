"""Converte o relatório didático em Word com uma página por caso de teste."""

import re
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor
from docx.oxml.ns import qn
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / "relatorios" / "Relatorio_Academico_7_Testes.md"
DESTINO = ORIGEM.with_suffix(".docx")


def limpar(texto):
    texto = re.sub(r"\[([^]]+)\]\([^)]+\)", r"\1", texto)
    return texto.replace("**", "").replace("`", "")


def adicionar_rotulo(documento, linha):
    rotulo, conteudo = linha.split(":**", 1)
    paragrafo = documento.add_paragraph()
    paragrafo.paragraph_format.space_after = Pt(9)
    parte = paragrafo.add_run(rotulo.replace("**", "") + ":")
    parte.bold = True
    paragrafo.add_run(" " + limpar(conteudo.strip()))


def main():
    texto = ORIGEM.read_text(encoding="utf-8")
    blocos = re.split(r"(?=^## Parte \d+)", texto, flags=re.MULTILINE)
    if len(blocos) != 8:
        raise SystemExit("O relatório deve conter exatamente sete partes.")

    doc = Document()
    secao = doc.sections[0]
    secao.top_margin = secao.bottom_margin = Cm(1.8)
    secao.left_margin = secao.right_margin = Cm(2)
    normal = doc.styles["Normal"]
    normal.font.name = "Aptos"
    normal.font.size = Pt(10)
    for estilo in ("Title", "Subtitle", "Heading 1", "Heading 2"):
        doc.styles[estilo].font.color.rgb = RGBColor(0, 0, 0)
    propriedades = doc.styles["Title"]._element.pPr
    if propriedades is not None:
        for borda in propriedades.findall(qn("w:pBdr")):
            propriedades.remove(borda)

    titulo = doc.add_paragraph(style="Title")
    titulo.add_run("Relatório dos sete testes automatizados do SGE")
    titulo.paragraph_format.space_after = Pt(12)
    doc.add_paragraph("Apresentação acadêmica dos resultados obtidos em 18 de novembro de 2026 no ambiente local.")
    doc.add_paragraph("7 casos executados  |  7 aprovados  |  0 reprovados", style="Subtitle")
    doc.add_paragraph("Ferramentas: Playwright, TypeScript, Chrome, PostgreSQL local e capturador SMTP local.")
    doc.add_paragraph("Cada parte descreve a pergunta, o procedimento, o resultado esperado e a evidência. Os dados temporários foram removidos após cada caso.")
    doc.add_paragraph("Escopo: a aprovação vale para os sete cenários locais. Não comprova a entrega externa de e-mail nem a homologação do site publicado.")

    for indice, bloco in enumerate(blocos[1:], 1):
        doc.add_page_break()
        linhas = [linha.strip() for linha in bloco.splitlines() if linha.strip()]
        doc.add_heading(limpar(linhas[0][3:]), level=1)
        for linha in linhas[1:]:
            if linha.startswith("**Conclusão para apresentação:"):
                continue
            if linha.startswith("**") and ":**" in linha:
                adicionar_rotulo(doc, linha)
        codigo = f"SGE-CT{indice:02}"
        imagem = RAIZ / "evidencias" / f"{codigo}.png"
        if imagem.exists():
            doc.add_paragraph("Captura da execução", style="Heading 2")
            with Image.open(imagem) as foto:
                largura, altura = foto.size
            escala = min(15.8 / largura, 10.0 / altura)
            paragrafo = doc.add_paragraph()
            paragrafo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            paragrafo.add_run().add_picture(str(imagem), width=Cm(largura * escala), height=Cm(altura * escala))
            doc.add_paragraph(f"Evidência {codigo}. As respostas HTTP e o e-mail local são confirmados pelas asserções do código.")

    rodape = secao.footer.paragraphs[0]
    rodape.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rodape.add_run("SGE  •  Relatório acadêmico  •  18/11/2026")
    doc.save(DESTINO)
    print(DESTINO)


if __name__ == "__main__":
    main()
