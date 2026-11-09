import assert from "node:assert/strict";
import test from "node:test";
import {
  REGRAS_SLA_MASC_PRO,
  alocarPrioridade,
  dataLimiteDiasUteis,
  decidirFrete,
  prazoExpedicao,
  totalConsolidado,
  totalDaOrigem,
  type Feriado,
} from "./forcaVendasRegras.ts";

const semFeriado: Feriado[] = [];
const feriados2026: Feriado[] = [
  { data: "2026-04-03" },
  { data: "2026-04-21" },
  { data: "2026-11-20" },
];

test("T01 distribuidor cobre o pedido inteiro", () => {
  assert.deepEqual(alocarPrioridade(10, 15, 20), {
    distribuidor: 10,
    empresa: 0,
    naoAtendida: 0,
  });
});

test("T02 sem estoque local, a MASC PRO cobre", () => {
  assert.deepEqual(alocarPrioridade(10, 0, 20), {
    distribuidor: 0,
    empresa: 10,
    naoAtendida: 0,
  });
});

test("T03 60% local e 40% central", () => {
  assert.deepEqual(alocarPrioridade(10, 6, 20), {
    distribuidor: 6,
    empresa: 4,
    naoAtendida: 0,
  });
});

test("T04 falta nas duas origens", () => {
  assert.deepEqual(alocarPrioridade(10, 3, 2), {
    distribuidor: 3,
    empresa: 2,
    naoAtendida: 5,
  });
});

test("saldo negativo de leitura não vira estoque", () => {
  assert.deepEqual(alocarPrioridade(4, -2, 1), {
    distribuidor: 0,
    empresa: 1,
    naoAtendida: 3,
  });
});

test("T07 fretes diferentes não se misturam e o consolidado é a soma", () => {
  const dist = totalDaOrigem(800, decidirFrete({ valorCalculado: 25, isencaoElegivel: false }));
  const masc = totalDaOrigem(400, decidirFrete({ valorCalculado: 48.9, isencaoElegivel: false }));
  assert.equal(dist.total, 825);
  assert.equal(masc.total, 448.9);
  assert.equal(totalConsolidado([dist.total, masc.total]), 1273.9);
});

test("T08 frete grátis do distribuidor não zera o frete da MASC PRO", () => {
  const dist = totalDaOrigem(
    800,
    decidirFrete({ valorCalculado: 30, isencaoElegivel: true, motivoIsencao: "faixa_distribuidor" })
  );
  const masc = totalDaOrigem(400, decidirFrete({ valorCalculado: 48.9, isencaoElegivel: false }));
  assert.equal(dist.frete, 0);
  assert.equal(dist.total, 800);
  assert.equal(masc.frete, 48.9);
  assert.equal(totalConsolidado([dist.total, masc.total]), 1248.9);
});

test("frete sem cotação fica pendente e impede o total", () => {
  const dist = totalDaOrigem(800, decidirFrete({ valorCalculado: null, isencaoElegivel: false }));
  assert.equal(dist.freteStatus, "pendente");
  assert.equal(dist.frete, null);
  assert.equal(dist.total, null);
  assert.equal(totalConsolidado([dist.total, 400]), null);
});

test("T09 São Paulo expede em até 3 dias úteis", () => {
  const prazo = prazoExpedicao({
    origem: "empresa",
    uf: "SP",
    liberadoEm: new Date("2026-11-09T13:00:00.000Z"),
    regras: REGRAS_SLA_MASC_PRO,
    feriados: semFeriado,
  });
  assert.equal(prazo.aplicado, true);
  assert.equal(prazo.diasUteis, 3);
  assert.equal(prazo.dataLimite, "2026-11-11");
  assert.equal(prazo.motivo, "expedicao");
});

test("T10 outro estado expede em até 7 dias úteis", () => {
  const prazo = prazoExpedicao({
    origem: "empresa",
    uf: "RJ",
    liberadoEm: new Date("2026-11-09T13:00:00.000Z"),
    regras: REGRAS_SLA_MASC_PRO,
    feriados: semFeriado,
  });
  assert.equal(prazo.diasUteis, 7);
  assert.equal(prazo.dataLimite, "2026-11-17");
});

test("T11 liberação na sexta atravessa o fim de semana", () => {
  const prazo = prazoExpedicao({
    origem: "empresa",
    uf: "SP",
    liberadoEm: new Date("2026-11-13T15:00:00.000Z"),
    regras: REGRAS_SLA_MASC_PRO,
    feriados: semFeriado,
  });
  assert.equal(prazo.dataLimite, "2026-11-17");
});

test("sábado começa a contar na segunda", () => {
  assert.equal(dataLimiteDiasUteis("2026-11-14", 3, "SP", semFeriado), "2026-11-18");
});

test("sexta-feira santa não conta como dia útil", () => {
  assert.equal(dataLimiteDiasUteis("2026-04-02", 3, "SP", feriados2026), "2026-04-07");
});

test("distribuidor sem regra própria não herda o prazo da MASC PRO", () => {
  const prazo = prazoExpedicao({
    origem: "distribuidor",
    uf: "SP",
    distribuidorId: "dist-1",
    liberadoEm: new Date("2026-11-09T13:00:00.000Z"),
    regras: REGRAS_SLA_MASC_PRO,
    feriados: semFeriado,
  });
  assert.equal(prazo.aplicado, false);
  assert.equal(prazo.diasUteis, null);
  assert.equal(prazo.dataLimite, null);
});

test("sem UF o prazo central não é escolhido", () => {
  const prazo = prazoExpedicao({
    origem: "empresa",
    uf: "",
    liberadoEm: new Date("2026-11-09T13:00:00.000Z"),
    regras: REGRAS_SLA_MASC_PRO,
    feriados: semFeriado,
  });
  assert.equal(prazo.motivo, "sem_uf");
  assert.equal(prazo.aplicado, false);
});
