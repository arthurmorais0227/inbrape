# 🤖 Inbrape AI — Intelligent Business Platform

<p align="center">
  <strong>Plataforma web integrada para Inteligência Artificial, análise de dados, CRM, documentos e automação comercial.</strong>
</p>

<p align="center">
  <a href="https://inbrape.vercel.app">🌐 Aplicação</a> ·
  <a href="https://github.com/arthurmorais0227/inbrape">💻 Repositório</a>
</p>

---

## 📌 Sobre o projeto

O **Inbrape AI** é uma plataforma desenvolvida para centralizar ferramentas de **Inteligência Artificial, análise de informações, gestão comercial e automação de processos** em um único ambiente web.

A aplicação combina um frontend em **React** com uma API em **Node.js + Express**, banco de dados **PostgreSQL** e serviços de IA da **Groq**, permitindo trabalhar com textos, planilhas, imagens, documentos, PDFs e informações comerciais.

Além das ferramentas de IA, o sistema possui **CRM integrado à Gluo**, painel de inteligência comercial, registro de visitas por áudio, gerenciamento de usuários e biblioteca de PDFs padrão.

---

## ✨ Principais recursos

### 🧠 Inteligência Artificial

#### 💬 Assistente de IA para textos

- Conversação com contexto
- Resumos
- Extração de pontos principais
- Análise crítica
- Tradução
- Melhoria de redação
- Perguntas e respostas
- Geração de insights
- Sugestões de prompts rápidos
- Respostas formatadas em Markdown
- Histórico da conversa por usuário

#### 🖼️ Análise de imagens

- Descrição detalhada
- OCR / extração de texto
- Análise de gráficos
- Identificação de objetos e elementos
- Avaliação técnica da qualidade da imagem
- Perguntas personalizadas sobre a imagem
- Upload por seleção ou drag & drop
- Preview da imagem antes da análise
- Cópia do resultado gerado

#### 📄 Análise de documentos

Formatos suportados:

- PDF
- TXT
- Markdown
- CSV

Recursos:

- Perguntas e instruções em linguagem natural
- Resumos executivos
- Extração de métricas
- Extração de datas, prazos e compromissos
- Identificação de insights
- Criação de planos de ação
- Análise crítica
- Geração de perguntas e respostas
- Preview de arquivos de texto
- Cópia do resultado

#### 🎙️ Relatório de visita por áudio

- Gravação de áudio diretamente pelo navegador
- Upload de gravações existentes
- Transcrição automática com **Whisper Large v3**
- Estruturação automática do relatório pela IA
- Identificação da empresa/unidade visitada
- Pessoas e cargos envolvidos
- Objetivo da visita
- Resultado
- Oportunidades comerciais
- Concorrentes
- Estágio da oportunidade
- Próximo passo
- Responsável
- Data do próximo passo
- Necessidades de apoio comercial
- Sugestão de organizações já cadastradas no CRM
- Salvamento do relatório no PostgreSQL
- Histórico de visitas registradas

---

# 📊 Análise de planilhas

O módulo de planilhas permite transformar arquivos de dados em informações analisáveis por IA e em visualizações interativas.

### Funcionalidades

- Upload de planilhas
- Análise geral com IA
- Perguntas personalizadas sobre os dados
- Pré-visualização dos dados
- Filtros por colunas
- Agrupamento de informações
- Estatísticas automáticas
- Total
- Média
- Máximo
- Mínimo
- Geração de gráficos
- Gráfico de barras
- Gráfico de linha
- Gráfico de pizza
- Gráfico de rosca
- Gráfico de Pareto
- Geração de configuração de gráfico orientada por IA
- Filtros específicos para visualizações
- Exportação dos dados filtrados

### 📤 Formatos de exportação

- Excel (<code>.xlsx</code>)
- CSV (<code>.csv</code>)
- JSON (<code>.json</code>)

---

# 📑 Editor de PDF

O Editor de PDF permite realizar operações práticas sobre documentos diretamente pela plataforma.

### Recursos

- Upload de arquivos PDF
- Contagem de páginas
- Seleção individual de páginas
- Selecionar todas as páginas
- Limpar seleção
- Extração das páginas selecionadas
- Download do PDF original
- Mesclagem com PDFs padrão da empresa
- Inclusão de catálogos, fichas e outros documentos
- Busca de PDFs padrão por nome ou descrição
- Download do PDF processado

### 📚 PDFs padrão

Administradores podem cadastrar documentos que ficam disponíveis para anexação durante a edição de PDFs.

Isso permite manter uma biblioteca centralizada de materiais comerciais e técnicos, como:

- Catálogos
- Fichas técnicas
- Documentos institucionais
- Materiais comerciais

---

# 🏢 CRM

O módulo CRM centraliza informações comerciais sincronizadas com o **Gluo CRM**.

## Organizações

- Listagem de organizações
- Busca por nome
- Filtro por segmento
- Visualização detalhada
- Telefone
- E-mail
- Segmento
- CNPJ
- Paginação
- Exportação para Excel

## Cotações

- Listagem de cotações
- Busca
- Filtros por coluna
- Filtros por período
- Total da cotação
- Representante
- Estágio da cotação
- Organização
- Produto
- Complemento
- Código do representante
- Visualização detalhada
- Paginação
- Exportação para Excel

## Pedidos de venda

- Listagem de pedidos
- Busca
- Filtros por coluna
- Filtros por período
- Total
- Representante
- Status do pedido
- Organização
- Produto
- Complemento
- Código do representante
- Visualização detalhada
- Paginação
- Exportação para Excel

### 🔄 Sincronização com o CRM

A plataforma permite iniciar sincronizações por módulo:

- Todos
- Organizações
- Cotações
- Pedidos de venda

Durante a sincronização, o sistema apresenta o estado da operação e o progresso das páginas processadas.

---

# 📈 Painel de Inteligência

O Dashboard transforma os dados comerciais e de visitas em indicadores visuais.

## Pipeline comercial

- Valor e quantidade por estágio
- Oportunidades ganhas
- Oportunidades perdidas
- Taxa de conversão
- Valor em aberto
- Tendência mensal
- Principais contas por valor

## Visitas comerciais

- Total de visitas
- Visitas por semana
- Visitas por pessoa
- Visitas por estágio
- Próximos passos vencidos

## Saúde das contas

- Classificação ABC
- Contas em risco
- Dias sem venda
- Último faturamento
- Classificação da conta

Os gráficos do painel são construídos com **Recharts**.

---

# 👥 Autenticação e usuários

A plataforma possui um sistema próprio de autenticação e autorização.

## Login

- Login por usuário e senha
- Persistência da sessão com token
- Verificação do token
- Opção de lembrar o usuário
- Mostrar/ocultar senha
- Indicador de força da senha
- Detecção de Caps Lock
- Logout

## Cadastro

Novos usuários podem solicitar acesso informando:

- Nome
- Usuário
- E-mail
- Senha

A conta permanece pendente até a aprovação de um administrador.

## Perfis

O sistema possui níveis de acesso, incluindo:

- 👤 Usuário
- 🛡️ Administrador

---

# 🛡️ Painel administrativo

Administradores possuem recursos adicionais para gerenciamento da plataforma.

### Recursos

- Visualização de usuários
- Aprovação de solicitações de acesso
- Gerenciamento de contas
- Acompanhamento de usuários pendentes
- Gerenciamento dos PDFs padrão
- Acesso a recursos administrativos exclusivos

O sistema também exibe notificações quando existem solicitações aguardando aprovação.

---

# 🕒 Histórico

As análises realizadas nas ferramentas de IA podem ser armazenadas no navegador.

O histórico permite:

- Visualizar análises anteriores
- Abrir o resultado completo
- Identificar o tipo de análise
- Visualizar data e horário
- Copiar resultados
- Limpar todo o histórico

---

# 🔔 Sistema de notificações

A aplicação possui um sistema de notificações internas para informar o usuário sobre operações concluídas.

Exemplos:

- 💬 Resposta da IA
- 📊 Análise de planilha concluída
- 🖼️ Análise de imagem concluída
- 📄 Análise de documento concluída
- 📑 Operação em PDF concluída
- 🏢 Atualização do CRM
- 🎙️ Relatório de visita processado
- 👥 Solicitações administrativas pendentes

---

# 🧩 Arquitetura

O projeto é dividido em duas aplicações principais:

~~~text
inbrape/
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── package.json
│   └── ...
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── pages/
    │   ├── services/
    │   ├── App.js
    │   └── ...
    └── package.json
~~~

## Frontend

Responsável pela interface e experiência do usuário.

Principais tecnologias:

- React 18
- React DOM
- React Markdown
- Recharts
- CSS
- APIs do navegador para gravação de áudio e manipulação de arquivos

## Backend

Responsável por:

- Autenticação
- Autorização
- Comunicação com os modelos de IA
- Processamento de arquivos
- Manipulação de PDFs
- Processamento de planilhas
- Persistência no PostgreSQL
- Integração com o CRM
- Sincronização de dados
- Geração de relatórios
- APIs REST

---

# 🛠️ Stack tecnológica

| Tecnologia | Utilização |
|---|---|
| ⚛️ React 18 | Interface da aplicação |
| 🟢 Node.js | Runtime do backend |
| 🚂 Express | API REST |
| 🐘 PostgreSQL | Banco de dados |
| 🤖 Groq | Infraestrutura de IA |
| 🧠 LLaMA | Análise e geração de texto |
| 🎙️ Whisper Large v3 | Transcrição de áudio |
| 📊 Recharts | Visualização de dados |
| 📗 ExcelJS | Geração de planilhas |
| 📄 SheetJS / XLSX | Leitura e exportação de planilhas |
| 📑 PDF-Lib | Manipulação de PDFs |
| 📃 PDF2JSON | Processamento de PDFs |
| 🔐 JWT | Autenticação por token |
| 🔑 bcryptjs | Hash de senhas |
| 📤 Multer | Upload de arquivos |
| 🌐 CORS | Comunicação frontend/backend |
| ⚙️ dotenv | Variáveis de ambiente |

---

# 🚀 Como executar localmente

## Pré-requisitos

Tenha instalado:

- Node.js v18+
- PostgreSQL
- Chave da API da Groq

---

## 1. Clone o projeto

~~~bash
git clone https://github.com/arthurmorais0227/inbrape.git
cd inbrape
~~~

---

## 2. Configure o backend

~~~bash
cd backend
npm install
~~~

Crie um arquivo <code>.env</code>:

~~~env
PORT=3001
DATABASE_URL=sua_connection_string_postgresql
GROQ_API_KEY=sua_chave_groq
JWT_SECRET=uma_chave_secreta_forte
~~~

> Nunca envie o arquivo <code>.env</code> para o GitHub.

Execute o backend:

~~~bash
npm run dev
~~~

Ou, sem Nodemon:

~~~bash
npm start
~~~

Por padrão, a API fica disponível em:

~~~text
http://localhost:3001
~~~

---

## 3. Configure o frontend

Em outro terminal:

~~~bash
cd frontend
npm install
npm start
~~~

O frontend será iniciado em:

~~~text
http://localhost:3000
~~~

Se necessário, configure a URL da API:

~~~env
REACT_APP_API_URL=http://localhost:3001
~~~

---

# 🔐 Segurança

O projeto utiliza diferentes mecanismos para proteger autenticação e credenciais:

- Senhas armazenadas com hash utilizando bcrypt
- Autenticação baseada em JWT
- Tokens com validade definida
- Rotas protegidas por autenticação
- Rotas administrativas protegidas por nível de acesso
- Chaves de API mantidas no backend
- Variáveis sensíveis configuradas através de <code>.env</code>
- Validação de tipo e tamanho de arquivos em diferentes módulos
- CORS configurado no backend

**Importante:** nunca coloque chaves da Groq, credenciais do banco ou segredos JWT diretamente no código-fonte.

---

# 🌐 Deploy

A aplicação possui uma versão publicada:

**Frontend:** https://inbrape.vercel.app

O frontend pode ser hospedado em plataformas como Vercel, enquanto o backend pode ser executado em um serviço compatível com Node.js conectado a um banco PostgreSQL.

---

# 🔄 Fluxo geral

~~~text
                    ┌──────────────────────┐
                    │      INBRAPE AI      │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
        🤖 IA / Dados       🏢 CRM          ⚙️ Gestão
             │                 │                 │
      ┌──────┼──────┐      ┌───┼────┐       ┌────┼────┐
      │      │      │      │   │    │       │    │    │
      ▼      ▼      ▼      ▼   ▼    ▼       ▼    ▼    ▼
    Texto  Imagem  Excel  Org. Cot. Ped.   Usuários PDFs Dashboard
      │      │      │      │   │    │       │    │    │
      └──────┼──────┘      └───┼────┘       └────┼────┘
             │                 │                 │
             ▼                 ▼                 ▼
          Análise IA       Sincronização      Inteligência
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                       📊 Decisões e automação
~~~

---

# 🎯 Objetivo

O objetivo do projeto é reunir, em uma única plataforma, ferramentas que apoiem atividades administrativas, comerciais e analíticas, reduzindo tarefas manuais e tornando informações operacionais mais acessíveis.

A plataforma conecta:

**IA + Dados + CRM + Documentos + Processos Comerciais**

em um único fluxo de trabalho.

---

# 📌 Status

🟢 **Em desenvolvimento ativo**

Novas funcionalidades e melhorias podem ser adicionadas continuamente à plataforma.

---

## 👨‍💻 Desenvolvedor

**Arthur Morais**

Desenvolvimento Full Stack · React · Node.js · PostgreSQL · IA · Automação

---

<p align="center">
  Desenvolvido para a <strong>Inbrape</strong> com foco em automação, inteligência de dados e produtividade.
</p>
