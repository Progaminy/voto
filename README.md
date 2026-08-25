# Voto — Comissão Eleitoral AXINENE

Plataforma web para votação interna, com página pública para eleitores e painel administrativo ligado ao Supabase.

## Funcionalidades

### Eleitor
- Consulta das vagas, candidatos e respetivos manifestos.
- Verificação prévia por **nome**, **número de membro** ou **telefone** já registado pela comissão.
- Apenas pessoas da lista autorizada recebem acesso à votação.
- **Um voto por vaga**. Depois da confirmação, o voto daquela vaga não pode ser alterado.
- O eleitor visualiza apenas os seus próprios votos durante a sessão.
- A lista de eleitores e os resultados globais não ficam expostos na página pública.

### Administrador
- Login usando a conta administrativa já registada no Supabase.
- Criação de vagas.
- Cadastro de candidato com nome, foto e manifesto.
- Cadastro individual ou importação rápida de eleitores no formato `Nome; Número; Telefone`.
- Abertura e encerramento da votação.
- Resultados agregados em tempo real por candidato e vaga.
- Estado de participação por eleitor, sem mostrar ao administrador em quem cada pessoa votou.

## Privacidade do voto

Os votos individuais ficam numa tabela sem acesso direto pelo navegador. O frontend usa funções controladas do banco para:

1. verificar o direito de voto;
2. emitir uma sessão temporária de eleitor;
3. registar somente um voto por vaga;
4. devolver ao eleitor apenas os próprios votos;
5. devolver ao administrador somente resultados agregados e estado de participação.

O painel administrativo não recebe a relação `eleitor -> candidato`, preservando o sigilo da escolha individual.

## Tecnologia

- HTML, CSS e JavaScript sem framework.
- Supabase Auth para o administrador.
- PostgreSQL + RLS para dados eleitorais.
- Supabase Storage para fotos dos candidatos.
- Supabase Realtime para atualização do painel.

## Estrutura

- `index.html` — página pública e painel administrativo.
- `styles.css` — interface responsiva nas cores azul, branco e verde.
- `app.js` — votação, autenticação, administração e atualização em tempo real.
- `assets/axinene-eleitoral.jpg` — imagem oficial usada no cabeçalho e destaque da plataforma.

## Estado inicial

A eleição **Comissão Eleitoral Interna — AXINENE** é criada como `draft`. O administrador deve cadastrar as vagas, candidatos e eleitores antes de clicar em **Abrir votação**.

---

Criado por **Pensador Sem Fronteiras**.
