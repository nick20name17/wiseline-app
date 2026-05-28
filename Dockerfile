FROM public.ecr.aws/docker/library/node:20.19.2

# Install bun
RUN curl -fsSL https://bun.sh/install | bash

# Add bun to PATH
ENV PATH="/root/.bun/bin:/app/node_modules/.bin:${PATH}"

WORKDIR /app/frontend

COPY package.json bun.lockb* ./

RUN bun install

COPY . .

RUN bun run build

ENV NODE_ENV=development

EXPOSE 3000
