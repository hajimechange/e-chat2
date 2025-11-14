// 【重要】APIキーは必ずご自身のキーに置き換えてください。
// 本番環境ではこの方法は推奨されません。
const GEMINI_API_KEY = "AIzaSyA8sUHrIX8Hpno-g2-v4rbuaTROAYobXeI";

// 💡 【修正点】外部CDNで読み込まれたグローバル変数 'googleGenerativeAI' を使用して初期化します。
// import文はブラウザではエラーになるため、削除しています。
const ai = new googleGenerativeAI.GoogleGenAI({ apiKey: GEMINI_API_KEY });
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
    // 💡 イベントリスナーがここで設定されます。スクリプトが停止していなければ動作します。
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
            // 既に認識が開始されている場合など、エラーをコンソールに出力
            console.error("Recognition start error:", e);
            // エラー時もボタンの状態をリセット
            micButton.classList.remove('recording');
            statusText.textContent = "待機中... (マイクエラー)";
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
        // AI応答中の場合はステータスを変更しない
        if (!statusText.textContent.includes("応答中")) {
             statusText.textContent = "待機中...";
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
                // 会話の性質を定義するためのシステム指示
                systemInstruction: "あなたはLINEのようなチャットインターフェースで動作する、親しみやすいAIです。ユーザーの音声入力に対して、文字で応答し、簡潔に返答してください。"
            }
        });

        const aiResponseText = response.text.trim();
        appendMessage(aiResponseText, 'ai');
        
        // AIの応答を音声化
        speakResponse(aiResponseText);

    } catch (error) {
        console.error("Gemini API Error:", error);
        const errorMsg = "AIとの通信中にエラーが発生しました。APIキーまたはネットワーク接続を確認してください。";
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
    // 日本語の音声を優先的に選択
    utterance.lang = 'ja-JP'; 
    
    // 読み上げ開始
    synth.speak(utterance);
}