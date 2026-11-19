"""Gera relatório acadêmico de sete partes a partir do output.xml do Robot."""

from datetime import datetime
from pathlib import Path
import xml.etree.ElementTree as ET

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "robot-results" / "output.xml"
SAIDA = RAIZ / "relatorios" / "Relatorio_Robot_7_Testes.md"

CASOS = [
    ("RBT-CT01", "Autenticação e acesso", "Senha inválida recebe HTTP 401; usuário comum é bloqueado na URL e na API de gestor; gestor acessa seu painel.", "Login Inválido Retorna; Abrir Painel; Wait Until Location Contains; API De Gestão Como Usuário Retorna."),
    ("RBT-CT02", "Calendário e conflito", "Agenda anual tem 12 meses; pedido feito pela tela fica PENDENTE; repetição para o mesmo turno recebe HTTP 409.", "Contar Meses Da Agenda; Solicitar Reserva Pela Tela; Status Da Reserva Na Tela; Pedido Duplicado Retorna."),
    ("RBT-CT03", "Confirmação e e-mail", "Gestor confirma a reserva pela tela; usuário vê AGENDADO; capturador SMTP local recebe o aviso.", "Confirmar Reserva Pela Tela; Status Da Reserva Na Tela; Wait Until Keyword Succeeds."),
    ("RBT-CT04", "Cancelamento e turno livre", "Cancelamento retorna HTTP 200; calendário volta a BRANCO; usuário vê CANCELADA; capturador recebe aviso.", "Cancelar Reserva Como Gestor; Estado Da Data No Calendário; Mensagem De Cancelamento Deve Existir."),
    ("RBT-CT05", "Feriado", "Gestor cadastra feriado; reserva na data recebe HTTP 400; remoção apaga o feriado e libera a data.", "Preencher Data Do Feriado; Click Button; Reserva Em Feriado Retorna; Feriado Deve Estar Removido."),
    ("RBT-CT06", "Auditórios e salas", "Local criado, editado e removido pelo gestor aparece, muda e desaparece na lista do usuário.", "Input Text; Select From List By Value; Click Button; Wait Until Page Contains Element."),
    ("RBT-CT07", "Admin Geral e privacidade", "Gestor comum recebe HTTP 403 na API de perfis; Admin Geral acessa a área; resposta não expõe hash, CPF ou nascimento.", "Criar Admin Temporário; Abrir Painel; Wait Until Page Contains; API De Perfis Do Admin É Segura."),
]


def main():
    raiz_xml = ET.parse(ENTRADA).getroot()
    resultados = {teste.attrib["name"].split()[0]: teste.find("status") for teste in raiz_xml.iter("test")}
    if set(resultados) != {caso[0] for caso in CASOS}:
        raise SystemExit("A execução Robot não contém exatamente os sete casos previstos.")
    passaram = sum(status.attrib["status"] == "PASS" for status in resultados.values())
    data = datetime.fromisoformat(raiz_xml.attrib["generated"].replace("Z", "+00:00")).astimezone().strftime("%d/%m/%Y %H:%M") if "generated" in raiz_xml.attrib else "consulte output.xml"
    linhas = ["# Relatório dos sete testes automatizados em Robot Framework", "",
              "**Projeto:** SGE – Sistema de Gestão de Eventos e Espaços", "",
              "**Execução:** " + data + " (ambiente local)", "",
              "**Ferramentas:** Robot Framework, SeleniumLibrary, Chrome, PostgreSQL local e capturador SMTP local.", "",
              f"**Resultado geral:** 7 executados; {passaram} PASS; {7 - passaram} FAIL.", "",
              "Cada parte abaixo corresponde a um caso. O resultado é lido de `robot-results/output.xml`, sem alteração manual das falhas.", ""]
    for indice, (codigo, tema, esperado, recursos) in enumerate(CASOS, 1):
        status = resultados[codigo]
        situacao = status.attrib["status"]
        linhas += [f"## Parte {indice} — {codigo}: {tema}", "",
                   f"**Objetivo e resultado esperado:** {esperado}", "",
                   f"**Palavras-chave usadas:** {recursos}", "",
                   f"**Resultado obtido:** **{situacao}**." + ("" if situacao == "PASS" else " " + (status.text or "Falha registrada no log Robot.").splitlines()[0]), "",
                   f"**Evidência visual:** [captura {codigo}](../evidencias/{codigo}.png). A sequência de palavras-chave, asserções e respostas consta no [log Robot](../robot-results/log.html).", ""]
    linhas += ["**Conclusão:** a classificação se limita aos sete cenários executados contra o banco local. O SMTP local confirma a geração e o envio ao capturador; a entrega externa e o site publicado requerem homologação própria. A suíte Playwright anterior permanece disponível como referência independente.", ""]
    SAIDA.parent.mkdir(exist_ok=True)
    SAIDA.write_text("\n".join(linhas), encoding="utf-8")
    print(f"Relatório Robot: {passaram} PASS, {7 - passaram} FAIL -> {SAIDA}")


if __name__ == "__main__":
    main()
