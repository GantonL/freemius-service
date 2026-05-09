FROM denoland/deno:2.6.3 AS deps

WORKDIR /app

COPY deno.json deno.lock ./

RUN deno install

COPY . .

RUN deno cache src/main.ts

EXPOSE 8000

CMD ["deno", "task", "start"]
