# AutoControl 🚗💨

App de gestão para motoristas de aplicativo (Uber/99).

## 🚀 Como Rodar Localmente

1. Clone o repositório.
2. Instale as dependências: `npm install`.
3. Crie um arquivo `.env.local` baseado no `.env.example` e adicione sua URL do MongoDB.
4. Rode o servidor de desenvolvimento: `npm run dev`.

## 🛠️ Deploy na Vercel

1. Crie um projeto na Vercel e conecte este repositório.
2. Adicione a variável de ambiente `MONGODB_URI` nas configurações do projeto na Vercel.
3. A Vercel detectará automaticamente o Next.js e fará o build.

## ✨ Funcionalidades

- Registro de corridas por plataforma (Uber/99).
- Cálculo automático de KM e ganhos líquidos.
- Monitoramento de consumo médio de combustível.
- Gestão de informações do veículo.
- Histórico persistente no MongoDB.
