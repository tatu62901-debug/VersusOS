\##	O que o sistema faz

O VersusOS é uma plataforma para gerenciar times e campeonatos de e-sports. Todos os dados (times, jogadores, campeonatos) são fictícios, criados só para demonstração.



Contas: cadastro, login e logout com e-mail e senha (a senha é guardada com hash bcrypt, nunca em texto puro). Cada pessoa pode editar o perfil, trocar a senha e excluir a própria conta. O login tem limite de tentativas contra tentativa de adivinhar senha.



Times e jogadores: qualquer pessoa logada cria um time (com logo) e cadastra jogadores (com foto). Quem quer entrar em um time envia um pedido usando o código de convite, e o dono do time aprova ou recusa. O dono também pode gerar um novo código e passar a liderança.



Campeonatos: a página inicial lista campeonatos de 18 jogos (VALORANT, CS2, League of Legends, Fortnite, Free Fire, Street Fighter 6, entre outros). Cada jogo tem seu mínimo e máximo de jogadores por time. O dono do time inscreve o time e a inscrição só vale depois da aprovação de um administrador, dentro do prazo de inscrição.



Chaveamento: quando as inscrições terminam, o administrador inicia o campeonato e o sistema sorteia o chaveamento de mata-mata. O admin lança os resultados, o vencedor avança sozinho e a final define o campeão e o vice-campeão (sem disputa de 3º lugar).



Área de administração (/admin): criar, editar e excluir campeonatos; aprovar ou recusar inscrições; remover jogadores e times; suspender contas; e ver o histórico de tudo o que os administradores fizeram (com o motivo). O dono do time vê um aviso quando a administração mexe no time dele.



Páginas públicas de times: qualquer visitante pode ver os times, o elenco e os campeonatos de cada um (sem mostrar idade nem código de convite).



Segurança: todas as permissões são checadas no servidor (só o dono edita o time, só o admin acessa /admin, ninguém mexe no que é de outra pessoa). O envio de imagens (Vercel Blob) valida o tipo (JPG, PNG ou WebP) e o tamanho (até 2 MB) no servidor.



\##	Páginas para testar

Pública: https://versus-dg653u4z7-tatu11.vercel.app/

Busca (exemplo que encontra algo): https://versus-dg653u4z7-tatu11.vercel.app/equipes?busca=Flamengada\&jogo=

Protegida (pede login): https://versus-dg653u4z7-tatu11.vercel.app/login





\##	Banco de dados

user: id, name, email (único), bannedAt, banReason



account: id, providerId, password (hash bcrypt), userId (Pertence a um user)



session: id, token (guardado em hash), expiresAt, userId (Pertence a um user)



teams: id, name (único), game, logoUrl, description, inviteCode (único), userId (Pertence a um user, o dono)



players: id, nickname, role, age, avatarUrl, teamId, userId (Pertence a um team; pode estar ligado a um user)



join\_requests: id, status (PENDENTE ou RECUSADO), nickname, role, age, teamId, userId (Pedido de um user para entrar em um team)



tournaments: id, name (único), game, prize, maxTeams, startDate, registrationDeadline, status, championName, runnerUpName, imageUrl (Tem várias inscrições e várias partidas)



registrations: id, status (PENDENTE ou APROVADA), teamId, tournamentId (Liga um team a um tournament)



matches: id, round, position, teamAId, teamBId, scoreA, scoreB, winnerSide, tournamentId (Partida do chaveamento de um tournament)



login\_attempts: id, email, ip, createdAt (Controle do limite de tentativas de login)



admin\_logs: id, action, targetName, reason, teamId, adminName, adminEmail, createdAt (Histórico das ações dos administradores)



\##	Como rodar no computador

Pré-requisitos: Node.js 20.9 ou mais novo (versão LTS), Git, um banco PostgreSQL no Neon (plano grátis) e, se quiser testar o envio de imagens, um Blob Store na Vercel.



Baixe o projeto e entre na pasta: git clone https://github.com/SEU-USUARIO/VersusOS.git cd VersusOS



Instale as dependências (isso também gera o Prisma Client): npm install



Crie o arquivo .env a partir do modelo e preencha os valores:



Windows (cmd)

copy .env.example .env



Mac ou Linux

cp .env.example .env



DATABASE\_URL Conexão do Neon com pooling (endereço com -pooler)



DATABASE\_URL\_UNPOOLED Conexão do Neon direta (sem -pooler), usada nas migrações



BETTER\_AUTH\_SECRET Um texto aleatório e secreto (veja o comando abaixo)



BETTER\_AUTH\_URL http://localhost:3000



BLOB\_READ\_WRITE\_TOKEN Token do Vercel Blob (só é preciso para enviar imagens)



Para gerar um BETTER\_AUTH\_SECRET:



node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

Crie as tabelas no banco:



npx prisma migrate deploy



Cadastre os dados de demonstração (campeonatos, times fictícios e as contas de administrador):



npx prisma db seed



Rode o projeto e abra http://localhost:3000:



npm run dev

Como usamos a IA

IA usada: Claude e Gemini



\## 	Os 3 pedidos (prompts) que mais ajudaram:



Agora mande APENAS as ideias em lista, ai a gente decide junto e depois implementa oque passar

Eu não acho que precisa colocar primeiro, segundo e terceiro lugar, mas só colocar tipo o chaveamento com os finalistas, ai o vice-campeao e o campeao ja ta bom

considerando essas coisas que o professor passou, pense se o site cumpre oque foi pedido, e responda sem alterar nada por enquanto

Um erro da IA que percebemos e como corrigimos (arquivo e o que mudou): ao adicionar times e campeonatos, a IA entregou o código novo e o prisma/schema.prisma atualizado, mas esqueceu a migration que cria as tabelas novas no banco (tournaments, registrations e a coluna inviteCode). A correção foi criar o arquivo prisma/migrations/20261020230000\_times\_campeonatos/migration.sql e aplicá-lo com npx prisma migrate deploy



O que aprendemos: Como funcionam migrations do Prisma e por que o código e o banco precisam andar juntos. Que a permissão tem que ser checada no servidor, e não só escondendo botões na tela. Guardar senha com hash (bcrypt) e nunca colocar o .env ou senhas no GitHub. Organização de um projeto em grupo usando git.

