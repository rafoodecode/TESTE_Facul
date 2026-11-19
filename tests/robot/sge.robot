*** Settings ***
Documentation       Sete fluxos integrados do SGE migrados para Robot Framework.
Library             SeleniumLibrary    timeout=10s    run_on_failure=Nothing
Library             Collections
Library             SgeSupport.py
Test Setup          Iniciar Caso    ${TEST NAME}
Test Teardown       Finalizar Caso

*** Variables ***
${BASE}             http://127.0.0.1:3100

*** Test Cases ***
RBT-CT01 Autenticação e bloqueio de acesso indevido
    [Tags]    smoke    regression
    ${invalido}=    Login Inválido Retorna
    Should Be Equal As Integers    ${invalido}    401
    Abrir Painel    usuario
    Go To    ${BASE}/gerente
    Wait Until Location Contains    /acesso
    ${negado}=    API De Gestão Como Usuário Retorna
    Should Be Equal As Integers    ${negado}    403
    Abrir Painel    gestor
    Page Should Contain    Painel de Gestão e Aprovação de Reservas

RBT-CT02 Calendário solicitação e conflito de turno
    [Tags]    smoke    regression
    ${local_id}    ${local_nome}=    Criar Local Temporário
    ${data}=    Próxima Data Útil
    Abrir Painel    gestor
    ${meses}=    Contar Meses Da Agenda
    Should Be Equal As Integers    ${meses}    12
    Abrir Painel    usuario
    ${evento}=    Solicitar Reserva Pela Tela    ${local_id}    ${data}
    ${historico}=    Status Da Reserva Na Tela    ${evento}
    Should Contain    ${historico}    PENDENTE
    ${conflito}=    Pedido Duplicado Retorna    ${local_id}    ${data}
    Should Be Equal As Integers    ${conflito}    409

RBT-CT03 Confirmação atualiza usuário e envia aviso local
    [Tags]    smoke    sanity    regression
    ${local_id}    ${local_nome}=    Criar Local Temporário
    ${data}=    Próxima Data Útil
    ${reserva_id}    ${evento}=    Criar Reserva Temporária    ${local_id}    ${data}    PENDENTE
    Abrir Painel    gestor
    Selecionar Local Do Gestor    ${local_id}
    Selecionar Mês Do Gestor    ${data}
    Confirmar Reserva Pela Tela    ${evento}
    Abrir Painel    usuario
    ${historico}=    Status Da Reserva Na Tela    ${evento}
    Should Contain    ${historico}    AGENDADO
    Wait Until Keyword Succeeds    10s    1s    Mensagem De Confirmação Deve Existir    ${evento}

RBT-CT04 Cancelamento libera turno e envia aviso local
    [Tags]    sanity    regression
    ${local_id}    ${local_nome}=    Criar Local Temporário
    ${data}=    Próxima Data Útil
    ${reserva_id}    ${evento}=    Criar Reserva Temporária    ${local_id}    ${data}    AGENDADO
    ${resposta}=    Cancelar Reserva Como Gestor    ${reserva_id}
    Should Be Equal As Integers    ${resposta}    200
    ${estado}=    Estado Da Data No Calendário    ${local_id}    ${data}
    Should Be Equal    ${estado}    BRANCO
    Abrir Painel    usuario
    ${historico}=    Status Da Reserva Na Tela    ${evento}
    Should Contain    ${historico}    CANCELADA
    Wait Until Keyword Succeeds    10s    1s    Mensagem De Cancelamento Deve Existir

RBT-CT05 Feriado bloqueia reserva e remoção libera data
    [Tags]    sanity    regression
    ${local_id}    ${local_nome}=    Criar Local Temporário
    ${data}=    Próxima Data Útil
    ${descricao}=    Nome Temporário    Feriado
    Abrir Painel    gestor
    Preencher Data Do Feriado    ${data}
    Input Text    css=#feriados input[name='descricao']    ${descricao}
    Click Button    xpath=//section[@id='feriados']//button[normalize-space()='Cadastrar feriado']
    Wait Until Page Contains    ${descricao}
    ${bloqueio}=    Reserva Em Feriado Retorna    ${local_id}    ${data}
    Should Be Equal As Integers    ${bloqueio}    400
    Click Button    xpath=//section[@id='feriados']//div[contains(.,'${descricao}')]//button[normalize-space()='Remover']
    Wait Until Keyword Succeeds    10s    1s    Feriado Deve Estar Removido
    ${estado}=    Estado Da Data No Calendário    ${local_id}    ${data}
    Should Be Equal    ${estado}    BRANCO

RBT-CT06 Gestão de locais atualiza a lista do usuário
    [Tags]    sanity    regression
    ${nome}=    Nome Temporário    Auditório
    ${editado}=    Nome Temporário    Editado
    Abrir Painel    gestor
    Input Text    css=#locais input[name='nome']    ${nome}
    Select From List By Value    css=#locais select[name='tipo']    AUDITORIO
    Click Button    xpath=//section[@id='locais']//button[normalize-space()='Cadastrar local']
    Wait Until Page Contains    ${nome}
    Abrir Painel    usuario
    Wait Until Page Contains Element    xpath=//select[@aria-label='Auditório ou sala']/option[contains(.,'${nome}')]
    Abrir Painel    gestor
    Wait Until Page Contains Element    css=input[aria-label='Nome de ${nome}']
    Input Text    css=input[aria-label='Nome de ${nome}']    ${editado}
    Click Button    xpath=//input[@aria-label='Nome de ${nome}']/following-sibling::button[normalize-space()='Salvar']
    Wait Until Page Contains    ${editado}
    Abrir Painel    usuario
    Wait Until Page Contains Element    xpath=//select[@aria-label='Auditório ou sala']/option[contains(.,'${editado}')]
    Abrir Painel    gestor
    Wait Until Page Contains Element    css=input[aria-label='Nome de ${editado}']
    Click Button    xpath=//input[@aria-label='Nome de ${editado}']/following-sibling::button[normalize-space()='Remover']
    Wait Until Page Does Not Contain Element    css=input[aria-label='Nome de ${editado}']
    Abrir Painel    usuario
    Page Should Not Contain Element    xpath=//select[@aria-label='Auditório ou sala']/option[contains(.,'${editado}')]

RBT-CT07 Admin Geral consulta perfis sem dados sensíveis
    [Tags]    sanity    regression
    ${email}=    Criar Admin Temporário
    ${negado}=    API De Perfis Como Gestor Retorna
    Should Be Equal As Integers    ${negado}    403
    Abrir Painel    admin
    Wait Until Page Contains    Administração geral · Perfis
    ${seguro}=    API De Perfis Do Admin É Segura    ${email}
    Should Be True    ${seguro}

*** Keywords ***
Mensagem De Confirmação Deve Existir
    [Arguments]    ${evento}
    ${mensagens}=    Mensagens Capturadas
    Length Should Be    ${mensagens}    1
    Should Contain    ${mensagens}[0]    ${evento}

Mensagem De Cancelamento Deve Existir
    ${mensagens}=    Mensagens Capturadas
    Length Should Be    ${mensagens}    1
    Should Contain    ${mensagens}[0]    cancelada

Feriado Deve Estar Removido
    ${removido}=    Feriado Do Caso Foi Removido
    Should Be True    ${removido}
