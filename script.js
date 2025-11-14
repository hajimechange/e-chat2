// 【重要】
// 開発のためにここに直接記述していますが、本番環境では絶対に避けてください。
// 環境変数やバックエンドサーバーを使ってキーを秘匿する必要があります。
const GEMINI_API_KEY = "AIzaSyA8sUHrIX8Hpno-g2-v4rbuaTROAYobXeI";

// Google Gen AI SDKをインポート (npm install @google/genai が必要)
// 開発サーバーで動作させる必要があります (例: `npx http-server` など)
import { GoogleGenAI } from '@google/genai';

// APIクライアントの初期化
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const model = "gemini-2.5-flash"; // 応答速度と会話に適したモデルを選択

// DOM要素の取得
const chatBox = document.getElementById('chatBox');
const micButton = document.getElementById('micButton');
const statusText = document.getElementById('statusText');

// Web Speech API の初期化
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
const synth = window.speechSynthesis;

// 認識設定
if (recognition) {
    recognition.lang = 'ja-JP'; // 日本語を設定
    recognition.interimResults = false; // 途中結果は不要
    recognition.maxAlternatives = 1; // 最も可能性の高い結果のみ
}

// ----------------------------------------------------
// UI操作とメッセージ表示
// ----------------------------------------------------

/**
 * チャットボックスにメッセージを追加する
 * @param {string} text - メッセージの内容
 * @param {'user' | 'ai' | 'system'} type - メッセージの種類
 */
function appendMessage(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    chatBox.appendChild(messageDiv);
    
    // スクロールを一番下へ
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------------------------------------
// 音声認識 (Speech-to-Text)
// ----------------------------------------------------

if (!recognition) {
    statusText.textContent = "お使いのブラウザは音声認識をサポートしていません。";
    micButton.disabled = true;
} else {
    micButton.addEventListener('click', () => {
        if (micButton.classList.contains('recording')) {
            // 録音停止
            recognition.stop();
        } else {
            // 録音開始
            startRecognition();
        }
    });

    function startRecognition() {
        try {
            recognition.start();
            micButton.classList.add('recording');
            statusText.textContent = "録音中...話してください";
        } catch (e) {
            console.error(e);
            statusText.textContent = "マイクの起動に失敗しました。";
        }
    }

    // 認識結果が出たとき
    recognition.onresult = async (event) => {
        const last = event.results.length - 1;
        const transcript = event.results[last][0].transcript;
        
        appendMessage(transcript, 'user');
        statusText.textContent = "AIが応答中...";
        
        // Gemini APIにテキストを送信
        await getGeminiResponse(transcript);
    };

    // 認識が終了したとき (結果の有無に関わらず)
    recognition.onend = () => {
        micButton.classList.remove('recording');
        if (statusText.textContent.includes("録音中")) {
             statusText.textContent = "待機中... (処理中)";
        }
    };

    // エラー発生時
    recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        statusText.textContent = `エラー: ${event.error}`;
        micButton.classList.remove('recording');
    };
}


// ----------------------------------------------------
// Gemini API 連携
// ----------------------------------------------------

/**
 * Gemini APIにリクエストを送信し、応答を取得する
 * @param {string} userText - ユーザーの入力テキスト
 */
async function getGeminiResponse(userText) {
    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: userText,
            config: {
                // 会話に適した設定をここで追加可能
            }
        });

        const aiResponseText = response.text.trim();
        appendMessage(aiResponseText, 'ai');
        
        // AIの応答を音声化
        speakResponse(aiResponseText);

    } catch (error) {
        console.error("Gemini API Error:", error);
        const errorMsg = "AIとの通信中にエラーが発生しました。";
        appendMessage(errorMsg, 'system');
        speakResponse(errorMsg);
    } finally {
        statusText.textContent = "待機中...";
    }
}

// ----------------------------------------------------
// 音声合成 (Text-to-Speech)
// ----------------------------------------------------

/**
 * テキストを音声で読み上げる
 * @param {string} text - 読み上げるテキスト
 */
function speakResponse(text) {
    if (!synth) {
        console.warn("お使いのブラウザは音声合成をサポートしていません。");
        return;
    }
    
    // 読み上げ中の場合はキャンセル
    if (synth.speaking) {
        synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; // 日本語を設定
    
    // 読み上げ開始
    synth.speak(utterance);
}