import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalysis, emptyCard } from "../src/lib/task-assistant.ts";
import { createAIService, type AIProvider } from "../src/lib/ai/service.ts";
import { createOpenAIProvider, AI_PROMPT } from "../src/lib/ai/openai.ts";
import { parseAnalysis, parseStructure } from "../src/lib/ai/schemas.ts";
const raw = "Мы теряем клиентов интернет-магазина и хотим понять почему.";
const local = buildAnalysis(raw);
const analysis = {
  missingFields: local.missing,
  questions: local.questions.map(({ key, question }) => ({ key, question })),
};
const structured = {
  card: { ...emptyCard, title: "Причины ухода клиентов" },
  evidence: { ...emptyCard, title: raw },
};
const provider: AIProvider = {
  async analyzeDraft() {
    return analysis;
  },
  async structureTask() {
    return structured;
  },
};
test("both operations work without a key and keep unknown fields empty", async () => {
  const ai = createAIService();
  const a = await ai.analyzeDraft(raw, {});
  assert.equal(a.reason, "no_key");
  assert.ok(a.data.questions.length >= 3);
  const result = await ai.structureTask(raw, [
    {
      key: "dataMaterials",
      question: "Есть CRM с миллионом клиентов?",
      answer: "Не знаю",
    },
  ]);
  assert.equal(result.reason, "no_key");
  assert.ok(result.data.title);
  assert.equal(result.data.dataMaterials, "");
  assert.equal(result.data.businessContact, "");
});
test("validated provider responses are used for both operations", async () => {
  const ai = createAIService(provider);
  assert.equal((await ai.analyzeDraft(raw)).mode, "openai");
  assert.equal(
    (await ai.structureTask(raw, [])).data.title,
    structured.card.title,
  );
});
for (const [name, bad] of [
  [
    "too few questions",
    { ...analysis, questions: analysis.questions.slice(0, 2) },
  ],
  [
    "duplicate questions",
    {
      ...analysis,
      questions: [
        analysis.questions[0],
        analysis.questions[0],
        analysis.questions[1],
      ],
    },
  ],
  [
    "unknown key",
    {
      ...analysis,
      questions: [
        { key: "teamId", question: "Кого назначить исполнителем?" },
        ...analysis.questions,
      ],
    },
  ],
  ["additional property", { ...analysis, selectedTeam: "team-one" }],
  [
    "known field questioned",
    {
      ...analysis,
      questions: [
        { key: "context", question: "Какой бизнес у вашей компании?" },
        ...analysis.questions,
      ],
    },
  ],
  [
    "sensitive question",
    {
      ...analysis,
      questions: [
        { ...analysis.questions[0], question: "Какой пароль от вашей CRM?" },
        ...analysis.questions.slice(1),
      ],
    },
  ],
] as const)
  test(`reject ${name} and preserve demo flow`, async () => {
    const result = await createAIService({
      ...provider,
      async analyzeDraft() {
        return bad;
      },
    }).analyzeDraft(raw);
    assert.equal(result.reason, "invalid_response");
    assert.ok(result.data.questions.length >= 3);
  });
test("structuring rejects missing/extra/wrong-type fields and invented evidence", async () => {
  for (const bad of [
    { card: emptyCard },
    { ...structured, card: { ...emptyCard, users: 3 } },
    { ...structured, card: { ...structured.card, teamId: "x" } },
    { ...structured, evidence: { ...emptyCard, title: "Выдуманная компания" } },
  ]) {
    const result = await createAIService({
      ...provider,
      async structureTask() {
        return bad;
      },
    }).structureTask(raw, []);
    assert.equal(result.reason, "invalid_response");
    assert.equal(result.data.dataMaterials, "");
  }
});
test("question text cannot be used as evidence; answers can", () => {
  const answer = {
    key: "dataMaterials",
    question: "Есть ли выгрузка из CRM?",
    answer: "Есть CSV за шесть месяцев.",
  };
  assert.throws(() =>
    parseStructure(
      {
        card: { ...emptyCard, dataMaterials: "CRM" },
        evidence: { ...emptyCard, dataMaterials: answer.question },
      },
      raw,
      [answer],
    ),
  );
  assert.equal(
    parseStructure(
      {
        card: { ...emptyCard, dataMaterials: answer.answer },
        evidence: { ...emptyCard, dataMaterials: answer.answer },
      },
      raw,
      [answer],
    ).dataMaterials,
    answer.answer,
  );
  assert.throws(() => parseAnalysis({ ...analysis, questions: [] }));
});
test("empty AI fields preserve explicit input without filling unknown information", async () => {
  const result = await createAIService(provider).structureTask(raw, [{
    key: "users", question: "Кто использует результат?",
    answer: "Маркетолог магазина анализирует уход покупателей.",
  }]);
  assert.equal(result.mode, "openai");
  assert.equal(result.data.context, raw);
  assert.equal(result.data.users, "Маркетолог магазина анализирует уход покупателей.");
  assert.equal(result.data.dataMaterials, "");
});
test("a real but unrelated quote cannot fill an unknown factual field", async () => {
  const result = await createAIService({
    ...provider,
    async structureTask() {
      return {
        card: { ...structured.card, dataMaterials: "Есть CRM с 10000 клиентов" },
        evidence: { ...structured.evidence, dataMaterials: raw },
      };
    },
  }).structureTask(raw, []);
  assert.equal(result.reason, "invalid_response");
  assert.equal(result.data.dataMaterials, "");
});
test("verified factual quotes cannot acquire invented details in paraphrases", () => {
  const answer = {
    key: "dataMaterials", question: "Какие данные есть?",
    answer: "Есть обезличенная CSV-выгрузка заказов за шесть месяцев.",
  };
  const result = parseStructure({
    card: { ...structured.card, dataMaterials: "Есть CSV и CRM с 10000 клиентов." },
    evidence: { ...structured.evidence, dataMaterials: answer.answer },
  }, raw, [answer]);
  assert.equal(result.dataMaterials, answer.answer);
  assert.ok(!result.dataMaterials.includes("10000"));
});
test("both operations time out even when a replacement provider ignores abort", async () => {
  let aborted = false;
  const hanging: AIProvider = {
    analyzeDraft: async (_raw, _data, signal) => {
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      return new Promise(() => {});
    },
    structureTask: async () => new Promise(() => {}),
  };
  const ai = createAIService(hanging, 10);
  assert.equal((await ai.analyzeDraft(raw)).reason, "timeout");
  assert.ok(aborted);
  assert.equal((await ai.structureTask(raw, [])).reason, "timeout");
});
test("HTTP error, refusal, incomplete and invalid JSON fall back without leaking provider errors", async () => {
  const bodies = [
    new Response("SECRET TEST BODY", { status: 429 }),
    Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "refusal" }] }],
    }),
    Response.json({ status: "incomplete", output: [] }),
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "not JSON" }],
        },
      ],
    }),
  ];
  for (const response of bodies) {
    const fakeFetch = (async () => response.clone()) as typeof fetch;
    const ai = createAIService(
      createOpenAIProvider("test-key", "test-model", fakeFetch),
    );
    for (const result of [
      await ai.analyzeDraft(raw),
      await ai.structureTask(raw, []),
    ]) {
      assert.equal(result.mode, "fallback");
      assert.ok(!JSON.stringify(result).includes("SECRET TEST BODY"));
      assert.ok(!JSON.stringify(result).includes("test-key"));
    }
  }
});
test("OpenAI adapter sends strict JSON schema, server auth, no storage or tools", async () => {
  const fakeFetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(
      (init!.headers as Record<string, string>).Authorization,
      "Bearer test-key",
    );
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.model, "test-model");
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.equal(body.tools, undefined);
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(analysis) }],
        },
      ],
    });
  }) as typeof fetch;
  assert.equal(
    (
      await createAIService(
        createOpenAIProvider("test-key", "test-model", fakeFetch),
      ).analyzeDraft(raw)
    ).mode,
    "openai",
  );
  assert.ok(AI_PROMPT.includes("Не выбирай команды"));
  assert.ok(AI_PROMPT.includes("пустой строкой"));
});
