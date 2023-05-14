"use client";

import axios, { CancelTokenSource } from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageType, TaskType } from "./types";

const Main = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const objectiveRef = useRef<HTMLTextAreaElement>(null);
  const iterationRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<CancelTokenSource | null>(null);

  //ボトムスクロール
  const scrollToBottom = useCallback(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //初回にボトムスクロール
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // メッセージ設定
  const messageHandler = (message: MessageType) => {
    setMessages((messages) => [...messages, message]);
  };

  //スタート
  const startHandler = async () => {
    //ローディング開始
    setLoading(true);

    //目的取得
    const objective = objectiveRef.current!.value;

    //目的チェック
    if (!objective) {
      setLoading(false);
      return;
    }

    //APIキャンセルトークン設定
    sourceRef.current = axios.CancelToken.source();

    //メッセージに目的を追加
    const messageObjective = { type: "objective", text: objective };
    messageHandler(messageObjective);

    let taskList: TaskType[] = [];

    //タスクリストに追加
    taskList.push({
      taskID: "1",
      taskName: "目的を達成するためのリストを作成してください",
    });

    //ループ回数
    let iteration = 0;

    //最大ループ回数
    const maxIteration = Number(iterationRef.current!.value);

    try {
      //最大ループ回数までループ
      while (maxIteration === 0 || iteration < maxIteration) {
        //タスクリスト確認
        if (taskList.length <= 0) {
          setLoading(false);
          return;
        }

        //タスクリストの文字列を作成
        const taskListString = taskList
          .map((task) => `${task.taskID}. ${task.taskName}`)
          .join("\n");

        //タスクリストをメッセージに追加
        const messageTaskList = { type: "task-lisk", text: taskListString };
        messageHandler(messageTaskList);

        //最初のタスクを取得して、タスクリストから削除
        const task = taskList.shift()!;

        //次のタスクをメッセージに追加
        const messageNextTask = {
          type: "next-task",
          text: `${task.taskID}. ${task.taskName}`,
        };
        messageHandler(messageNextTask);

        //chatGPTに質問
        const responseExecute = await axios.post(
          "/api/execute",
          {
            objective, //目的
            task: task.taskName, //タスク
          },
          {
            cancelToken: sourceRef.current.token, //キャンセルトークン設定
          }
        );

        //回答を取得
        const resultExecute = responseExecute?.data?.response;

        //回答をメッセージに追加
        const messageTaskResult = {
          type: "task-result",
          text: resultExecute.trim(),
        };
        messageHandler(messageTaskResult);

        //ChatGPTにタスク作成依頼
        const responseCreate = await axios.post(
          "/api/create",
          {
            objective, //目的
            taskList, //タスクリスト名
            task, //最後のタスク
            result: resultExecute, //回答
          },
          {
            cancelToken: sourceRef.current.token, //キャンセルトークン設定
          }
        );

        //新しいタスクリストに書き換え
        taskList = responseCreate?.data?.response;

        //ループ回数をカウントアップ
        iteration++;
      }

      //目的をクリア
      objectiveRef.current!.value = "";
    } catch (error) {
      //キャンセルされた場合
      if (axios.isCancel(error)) {
        console.log(`Canceled by the user.`);
      }
    } finally {
      setLoading(false);
    }
  };

  //ストップ
  const stopHandler = () => {
    if (sourceRef.current) {
      sourceRef.current.cancel("Operation canceled by the user.");
    }
  };

  //続きは、4:58から

  return (
    <div>
      <div className="grid grid-cols-4 h-[var(--adjusted-height)] mb-5 text-sm border rounded-lg">
        <div className="col-span-1 rounded-s-lg p-3 overflow-y-auto bg-gray-50 border-r">
          {/* タスクリスト */}
          <div className="font-bold mb-3">Tasks</div>
          {messages
            .filter((data) => data.type === "task-list")
            .slice(-1)
            .map((data, index) => (
              <div key={index}>
                <div className="leading-relaxed break-words whitespace-pre-wrap">
                  {data.text}
                </div>
              </div>
            ))}
        </div>
        <div className="col-span-3 rounded-e-lg overflow-y-auto bg-white">
          {/* メッセージ */}
          {messages.map((data, index) => (
            <div key={index}>
              {data.type === "objective" ? (
                <div className="text-center mb-4 font-bold text-lg border-b py-4 bg-gray-50">
                  <div>{data.text}</div>
                </div>
              ) : data.type === "task-result" ? (
                <div className="flex items-end justify-end mb-4">
                  <div className="bg-blue-500 text-white p-3 rounded-xl drop-shadow max-w-lg mr-4">
                    <div className="leading-relaxed break-words whitespace-pre-wrap">
                      {data.text}
                    </div>
                  </div>
                </div>
              ) : data.type === "next-task" ? (
                <div className="flex items-end mb-4">
                  <div className="bg-rray-50 p-3 rounded-xl drop-shadow max-w-lg ml-4 bg-gray-50">
                    <div className="leading-relaxed break-words whitespace-pre-wrap">
                      {data.text}
                    </div>
                  </div>
                </div>
              ) : (
                <></>
              )}
            </div>
          ))}

          {/* ローディング中 */}
          {loading && (
            <div>
              <div className="flex items-center justify-center my-3">
                <div className="px-5 py-2 text-white bg-blue-500 rounded-full animate-pulse">
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>
      </div>
      <div className="mb-3 grid grid-cols-12 gap-3">
        <div className="col-span-1">
          {/* ループ回数入力 */}
          <input
            className="w-full border rounded-lg py-2 px-3 focus:outline-none bg-gray-50 focus:bg-white"
            type="number"
            ref={iterationRef}
            id="iteration"
            defaultValue={5}
            disabled={loading}
          />
        </div>
        <div className="col-span-11">
          {/* 目的入力 */}
          <textarea
            className="w-full border rounded-lg py-2 px-3 focus:outline-none bg-gray-50 focus:bg-white"
            rows={1}
            placeholder="Your objective..."
            ref={objectiveRef}
            disabled={loading}
            id="objective"
          />
        </div>
      </div>
      <div className="flex items-center justify-center space-x-5">
        {/* スタート */}
        <button
          className={`p-3 border rounded-lg w-32 text-white font-bold ${
            loading ? "bg-gray-500" : "bg-blue-500"
          }`}
          onClick={startHandler}
          disabled={loading}
        >
          Start
        </button>
        {/* ストップ */}
        <button
          className={`p-3 border rounded-lg w-32 text-white font-bold ${
            loading ? "bg-red-500" : "bg-gray-500"
          }`}
          onClick={stopHandler}
          disabled={!loading}
        >
          Stop
        </button>
      </div>
    </div>
  );
};

export default Main;
