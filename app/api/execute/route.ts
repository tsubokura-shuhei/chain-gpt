import { NextRequest, NextResponse } from "next/server";
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
} from "langchain/prompts";

export async function POST(req: NextRequest) {
  try {
    //目的とタスクを取得
    const { objective, task } = await req.json();

    //OpenAIのモデル
    const chat = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
    });

    //プロンプト
    const chatPrompt = ChatPromptTemplate.fromPromptMessages([
      SystemMessagePromptTemplate.fromTemplate(
        "You are an AI who performs one task based on the following objective: {objective}. Please answer in Japanese."
      ),
      HumanMessagePromptTemplate.fromTemplate("Your task:{task}. Response:"),
    ]);

    //LLMChain
    const chain = new LLMChain({ llm: chat, prompt: chatPrompt });

    //実行
    const response = await chain.call({ objective, task });

    return NextResponse.json({ response: response.text });

    //チェーン
  } catch (error) {
    console.log("error", error);
    return NextResponse.error();
  }
}
