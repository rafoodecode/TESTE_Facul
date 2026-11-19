"""Dados isolados e consultas auxiliares para os casos Robot do SGE."""

import base64
import os
import re
import time
import uuid
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse

import bcrypt
import psycopg
import requests
from robot.api.deco import keyword
from robot.libraries.BuiltIn import BuiltIn
from selenium.webdriver import ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


RAIZ = Path(__file__).resolve().parents[2]
BASE = "http://127.0.0.1:3100"
SMTP = "http://127.0.0.1:1026"
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def ambiente_local():
    valores = {}
    for linha in (RAIZ / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.lstrip().startswith("#"):
            chave, valor = linha.split("=", 1)
            valores[chave.strip()] = valor.strip().strip('"')
    valores.update({chave: os.environ[chave] for chave in ("DATABASE_URL", "SEED_PASSWORD") if chave in os.environ})
    banco = valores["DATABASE_URL"]
    if urlparse(banco).hostname not in ("localhost", "127.0.0.1"):
        raise RuntimeError("Os testes Robot só podem alterar PostgreSQL local.")
    return banco.split("?", 1)[0], valores.get("SEED_PASSWORD", "TroqueEstaSenha123!")


class SgeSupport:
    ROBOT_LIBRARY_SCOPE = "TEST"

    def __init__(self):
        self.dsn, self.senha = ambiente_local()
        self.prefixo = ""
        self.sessoes = {}
        self.ultimo_local = None
        self.ultima_reserva = None

    @property
    def selenium(self):
        return BuiltIn().get_library_instance("SeleniumLibrary")

    def consulta(self, comando, parametros=(), resultado=False):
        with psycopg.connect(self.dsn) as conexao:
            with conexao.cursor() as cursor:
                cursor.execute(comando, parametros)
                return cursor.fetchone()[0] if resultado else None

    def requisicao(self, perfil, metodo, caminho, dados=None):
        sessao = self.sessoes[perfil]
        return sessao.request(metodo, BASE + caminho, json=dados, timeout=15)

    @keyword("Iniciar Caso")
    def iniciar_caso(self, nome):
        codigo = re.search(r"RBT-CT\d+", nome)
        if not codigo:
            raise AssertionError("O caso precisa de ID RBT-CTxx.")
        self.codigo = codigo.group()
        self.prefixo = f"QA-{self.codigo}-{int(time.time() * 1000)}"
        hash_senha = bcrypt.hashpw(self.senha.encode(), bcrypt.gensalt(12)).decode()
        for perfil, email, papel, cpf in (
            ("usuario", "qa-usuario@instituicao.edu.br", "USUARIO", None),
            ("gestor", "qa-gestor@instituicao.edu.br", "GERENTE", "12345678909"),
        ):
            self.consulta('INSERT INTO "User" (id,nome,email,matricula,"dataNascimento","senhaHash",papel,cpf) VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (email) DO UPDATE SET "senhaHash"=EXCLUDED."senhaHash",papel=EXCLUDED.papel',
                          (uuid.uuid4().hex, perfil.title() + " QA", email, "QA-" + perfil.upper(), date(1990, 1, 1), hash_senha, papel, cpf))
            sessao = requests.Session()
            resposta = sessao.post(BASE + "/api/auth/login", json={"email": email, "senha": self.senha}, timeout=15)
            assert resposta.status_code == 200, f"Login {perfil}: HTTP {resposta.status_code}"
            self.sessoes[perfil] = sessao
        requests.delete(SMTP + "/messages", timeout=5)

    @keyword("Finalizar Caso")
    def finalizar_caso(self):
        try:
            caminho = RAIZ / "evidencias" / f"{self.codigo}.png"
            caminho.parent.mkdir(exist_ok=True)
            try:
                captura = self.selenium.driver.execute_cdp_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                caminho.write_bytes(base64.b64decode(captura["data"]))
            except Exception:
                try:
                    self.selenium.capture_page_screenshot(str(caminho))
                except Exception:
                    pass
            try:
                self.selenium.close_all_browsers()
            except Exception:
                pass
        finally:
            if self.prefixo:
                like = self.prefixo + "%"
                self.consulta('DELETE FROM "Reserva" WHERE "nomeEvento" LIKE %s', (like,))
                self.consulta('DELETE FROM "Feriado" WHERE descricao LIKE %s', (like,))
                self.consulta('DELETE FROM "Local" WHERE nome LIKE %s', (like,))
                self.consulta('DELETE FROM "User" WHERE matricula LIKE %s', (like,))
                for sessao in self.sessoes.values():
                    sessao.close()

    @keyword("Abrir Painel")
    def abrir_painel(self, perfil):
        self.selenium.close_all_browsers()
        opcoes = ChromeOptions()
        opcoes.add_argument("--headless=new")
        opcoes.add_argument("--window-size=1365,900")
        driver_local = RAIZ / ".robot-bin" / "chromedriver-win64" / "chromedriver.exe"
        servico = ChromeService(str(driver_local)) if driver_local.exists() else None
        self.selenium.open_browser(BASE + "/acesso", "chrome", options=opcoes, service=servico)
        cookie = self.sessoes[perfil].cookies.get("eventos_session")
        self.selenium.driver.add_cookie({"name": "eventos_session", "value": cookie, "path": "/"})
        self.selenium.go_to(BASE + ("/usuario" if perfil == "usuario" else "/gerente"))
        WebDriverWait(self.selenium.driver, 10).until(lambda d: "/usuario" in d.current_url or "/gerente" in d.current_url)

    @keyword("Login Inválido Retorna")
    def login_invalido_retorna(self):
        return requests.post(BASE + "/api/auth/login", json={"email": "qa-gestor@instituicao.edu.br", "senha": "incorreta"}, timeout=15).status_code

    @keyword("API De Gestão Como Usuário Retorna")
    def api_de_gestao_como_usuario_retorna(self):
        return self.requisicao("usuario", "GET", "/api/manage/bookings?month=2026-11").status_code

    @keyword("Criar Local Temporário")
    def criar_local_temporario(self, tipo="SALA"):
        identificador = uuid.uuid4().hex
        nome = self.prefixo + " " + ("Sala" if tipo == "SALA" else "Auditório")
        self.consulta('INSERT INTO "Local" (id,nome,tipo) VALUES (%s,%s,%s)', (identificador, nome, tipo))
        self.ultimo_local = identificador
        return identificador, nome

    @keyword("Nome Temporário")
    def nome_temporario(self, sufixo):
        return f"{self.prefixo} {sufixo}"

    @keyword("Próxima Data Útil")
    def proxima_data_util(self):
        dia = date.today() + timedelta(days=16)
        while dia.weekday() >= 5:
            dia += timedelta(days=1)
        return dia.isoformat()

    @keyword("Criar Reserva Temporária")
    def criar_reserva_temporaria(self, local_id, data, status):
        identificador = uuid.uuid4().hex
        nome = self.prefixo + " Encontro"
        usuario = self.consulta('SELECT id FROM "User" WHERE email=%s', ("qa-usuario@instituicao.edu.br",), True)
        self.consulta('INSERT INTO "Reserva" (id,"usuarioId","localId","nomeEvento",data,turno,status,"atualizadoEm") VALUES (%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP)',
                      (identificador, usuario, local_id, nome, data, "MANHA", status))
        self.ultima_reserva = identificador
        return identificador, nome

    @keyword("Selecionar Mês Do Gestor")
    def selecionar_mes_do_gestor(self, data):
        ano, mes = map(int, data[:7].split("-"))
        nome = f"{MESES[mes - 1]} de {ano}"
        self.selenium.click_element(f"xpath=//button[normalize-space()='{nome}']")

    @keyword("Selecionar Local Do Gestor")
    def selecionar_local_do_gestor(self, local_id):
        WebDriverWait(self.selenium.driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, f"select option[value='{local_id}']"))
        self.selenium.select_from_list_by_value("xpath=//label[contains(.,'Filtrar local')]/select", local_id)

    @keyword("Solicitar Reserva Pela Tela")
    def solicitar_reserva_pela_tela(self, local_id, data):
        driver = self.selenium.driver
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, "select[aria-label='Auditório ou sala'] option[value='" + local_id + "']"))
        self.selenium.select_from_list_by_value("css=select[aria-label='Auditório ou sala']", local_id)
        self.selenium.input_text("css=input[aria-label='Nome do evento']", self.prefixo + " Encontro")
        alvo = date.fromisoformat(data)
        hoje = date.today()
        saltos = (alvo.year - hoje.year) * 12 + alvo.month - hoje.month
        for _ in range(saltos):
            antes = driver.find_element(By.XPATH, "//h2[normalize-space()='Calendário Mensal de Ocupação']/../..//strong[contains(@class,'capitalize')]").text
            self.selenium.click_button("css=button[aria-label='Próximo mês']")
            WebDriverWait(driver, 10).until(lambda d: d.find_element(By.XPATH, "//h2[normalize-space()='Calendário Mensal de Ocupação']/../..//strong[contains(@class,'capitalize')]").text != antes)
        WebDriverWait(driver, 10).until(lambda d: d.find_elements(By.CSS_SELECTOR, f"button[aria-label='{data} BRANCO']"))
        self.selenium.click_button(f"css=button[aria-label='{data} BRANCO']")
        self.selenium.click_button("xpath=//button[.//strong[normalize-space()='Manhã']]")
        self.selenium.click_button("css=button[aria-label='Enviar']")
        self.selenium.wait_until_page_contains("Aguarde a confirmação", timeout="10s")
        return self.prefixo + " Encontro"

    @keyword("Contar Meses Da Agenda")
    def contar_meses_da_agenda(self):
        secao = self.selenium.driver.find_element(By.XPATH, "//h2[normalize-space()='Agenda anual']/..")
        return sum(any(mes in botao.text.lower() for mes in MESES) for botao in secao.find_elements(By.TAG_NAME, "button"))

    @keyword("Status Da Reserva Na Tela")
    def status_da_reserva_na_tela(self, nome):
        item = WebDriverWait(self.selenium.driver, 10).until(lambda d: d.find_element(By.XPATH, f"//li[contains(.,'{nome}')]"))
        return item.text

    @keyword("Preencher Data Do Feriado")
    def preencher_data_do_feriado(self, data):
        campo = self.selenium.driver.find_element(By.CSS_SELECTOR, "#feriados input[name='data']")
        self.selenium.driver.execute_script("arguments[0].value = arguments[1]", campo, data)

    @keyword("Pedido Duplicado Retorna")
    def pedido_duplicado_retorna(self, local_id, data):
        resposta = self.requisicao("usuario", "POST", "/api/bookings", {"localId": local_id, "data": data, "turno": "MANHA", "nomeEvento": self.prefixo + " Duplicada"})
        return resposta.status_code

    @keyword("Confirmar Reserva Pela Tela")
    def confirmar_reserva_pela_tela(self, nome):
        alvo = f"xpath=//article[contains(.,'{nome}')]//button[normalize-space()='Confirmar']"
        self.selenium.wait_until_page_contains_element(alvo, timeout="10s")
        self.selenium.click_button(alvo)
        self.selenium.wait_until_page_contains_element(f"xpath=//article[contains(.,'{nome}') and contains(.,'AGENDADO')]", timeout="10s")

    @keyword("Cancelar Reserva Como Gestor")
    def cancelar_reserva_como_gestor(self, reserva_id):
        return self.requisicao("gestor", "PATCH", f"/api/manage/bookings/{reserva_id}", {"status": "CANCELADA"}).status_code

    @keyword("Estado Da Data No Calendário")
    def estado_da_data_no_calendario(self, local_id, data):
        resposta = self.requisicao("usuario", "GET", f"/api/calendar?localId={local_id}&month={data[:7]}")
        assert resposta.status_code == 200
        return next(dia["state"] for dia in resposta.json() if dia["date"] == data)

    @keyword("Mensagens Capturadas")
    def mensagens_capturadas(self):
        return requests.get(SMTP + "/messages", timeout=5).json()

    @keyword("Reserva Em Feriado Retorna")
    def reserva_em_feriado_retorna(self, local_id, data):
        return self.requisicao("usuario", "POST", "/api/bookings", {"localId": local_id, "data": data, "turno": "MANHA", "nomeEvento": self.prefixo + " Evento"}).status_code

    @keyword("Feriado Do Caso Foi Removido")
    def feriado_do_caso_foi_removido(self):
        return self.consulta('SELECT COUNT(*) FROM "Feriado" WHERE descricao LIKE %s', (self.prefixo + "%",), True) == 0

    @keyword("Criar Admin Temporário")
    def criar_admin_temporario(self):
        email = f"{self.prefixo.lower()}@instituicao.edu.br"
        hash_senha = bcrypt.hashpw(self.senha.encode(), bcrypt.gensalt(12)).decode()
        self.consulta('INSERT INTO "User" (id,nome,email,matricula,"dataNascimento","senhaHash",papel) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                      (uuid.uuid4().hex, "Admin Robot", email, self.prefixo, date(1985, 1, 1), hash_senha, "ADMIN_GERAL"))
        sessao = requests.Session()
        resposta = sessao.post(BASE + "/api/auth/login", json={"email": email, "senha": self.senha}, timeout=15)
        assert resposta.status_code == 200
        self.sessoes["admin"] = sessao
        return email

    @keyword("API De Perfis Como Gestor Retorna")
    def api_de_perfis_como_gestor_retorna(self):
        return self.requisicao("gestor", "GET", "/api/admin/users").status_code

    @keyword("API De Perfis Do Admin É Segura")
    def api_de_perfis_do_admin_e_segura(self, email):
        resposta = self.requisicao("admin", "GET", "/api/admin/users")
        assert resposta.status_code == 200
        contas = resposta.json()
        return any(conta.get("email") == email for conta in contas) and all(not ({"senhaHash", "cpf", "dataNascimento"} & conta.keys()) for conta in contas)
