import { useState, useRef } from "react";
import "./App.css";

// Main App component
function App() {
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("French");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const controllerRef = useRef<AbortController | null>(null);

  // New state for settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKeyValue, setApiKeyValue] = useState(
    () => localStorage.getItem("apiKeyValue") || "YOUR_API_KEY_HERE"
  );
  const [apiUrlValue, setApiUrlValue] = useState(
    () =>
      localStorage.getItem("apiUrlValue") ||
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key="
  );

  const callAIApi = async (promptText: string) => {
    // Check if API key is set
    if (!apiKeyValue || apiKeyValue === "YOUR_API_KEY_HERE") {
      if (apiKeyValue === "YOUR_API_KEY_HERE") {
        setErrorMessage("You need to configure the AI API you want to use");
        setIsError(true);
        return;
      }
    }
    setIsLoading(true);
    setIsError(false);
    setOutputText("");

    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    const apiKey = apiKeyValue; // import.meta.env.VITE_API_AI_KEY || "";
    const urlAI = apiUrlValue; // import.meta.env.VITE_API_URL_AI || "";
    let apiUrl = "";
    let localLLM = false;
    if (urlAI.includes("localhost") || urlAI.includes("127.0.0.1")) {
      localLLM = true;
    }
    try {
      let payload;
      if (localLLM) {
        apiUrl = `${urlAI}`;
        payload = {
          model: apiKey, // Change this to your model's identifier if needed
          messages: [{ role: "user", content: promptText }],
          temperature: 0.7,
          max_tokens: -1,
          stream: false,
        };
      } else {
        apiUrl = `${urlAI}${apiKey}`;
        payload = {
          contents: [
            {
              role: "user",
              parts: [{ text: promptText }],
            },
          ],
        };
      }
      console.log("API URL:", apiUrl);

      const maxRetries = 5;
      let retryCount = 0;
      let response;

      while (retryCount < maxRetries) {
        try {
          console.log("Sending request to API:", JSON.stringify(payload));
          response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal,
          });

          if (response.status === 429) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            await new Promise((res) => setTimeout(res, delay));
            retryCount++;
            continue;
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          break;
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === "AbortError") {
              throw error;
            }
            console.error("Fetch error:", error);
            if (retryCount >= maxRetries - 1) {
              throw error;
            }
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            await new Promise((res) => setTimeout(res, delay));
            retryCount++;
          } else {
            // Handle non-Error exceptions
            setErrorMessage("An unknown error occurred.");
            setIsError(true);
          }
        }
      }

      if (!response || !response.ok) {
        throw new Error("Failed to fetch from API after multiple retries.");
      }

      const result = await response.json();

      if (localLLM) {
        if (
          result.choices &&
          result.choices.length > 0 &&
          result.choices[0].message
        ) {
          const text = result.choices[0].message.content;
          setOutputText(text);
        } else {
          throw new Error("Invalid API response structure.");
        }
      } else if (
        result.candidates &&
        result.candidates.length > 0 &&
        result.candidates[0].content &&
        result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0
      ) {
        const text = result.candidates[0].content.parts[0].text;
        setOutputText(text);
      } else {
        throw new Error("Invalid API response structure.");
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.log("API request aborted.");
        } else {
          console.error("Failed to fetch API response:", error);
          setErrorMessage(error.message);
          setIsError(true);
        }
      } else {
        // Handle non-Error exceptions
        setErrorMessage("An unknown error occurred.");
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
      controllerRef.current = null;
    }
  };

  const handleCorrect = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const prompt = `Please correct any grammar, spelling, or punctuation errors in the following text. Respond with only the corrected text, and nothing else.\n\nText to correct:\n"${inputText}"`;
    callAIApi(prompt);
  };

  const handleEnhance = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const prompt = `Please enhance the following text for a more professional and impressive impression. Respond with only the enhanced text, and nothing else.\n\nText to enhance:\n"${inputText}"`;
    callAIApi(prompt);
  };

  const handleTranslate = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const prompt = `Please translate the following text into ${targetLanguage}. Respond with only the translated text, and nothing else.\n\nText to translate:\n"${inputText}"`;
    callAIApi(prompt);
  };

  const handleExecute = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const prompt = `Please respond to the following request with only the result, and nothing else:\n"${inputText}"`;
    callAIApi(prompt);
  };
  // Save settings handler
  const handleSaveSettings = () => {
    localStorage.setItem("apiKeyValue", apiKeyValue);
    localStorage.setItem("apiUrlValue", apiUrlValue);
    setIsSettingsOpen(false);
  };

  const languageOptions = ["French", "English", "Spanish", "Hebrew"];

  return (
    <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <div className="w-full max-w-4xl p-6 md:p-8 bg-white dark:bg-gray-800 shadow-xl rounded-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300">
        {/* Settings button with a gear icon */}
        <div style={{ float: "right" }}>
          <button
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
            aria-label="Open settings"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-settings"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 3.09V3a2 2 0 0 1 4 0v.09c0 .66.42 1.25 1 1.51a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.66.26 1.25.84 1.51 1.51H21a2 2 0 0 1 0 4h-.09c-.26.66-.84 1.25-1.51 1.51z"></path>
            </svg>
          </button>
        </div>

        <h1 className="text-xl font-extrabold text-center mb-4 md:mb-6 text-gray-900 dark:text-white">
          Generate texte IA Tools
        </h1>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => setIsSettingsOpen((prev) => !prev)}
                  className="ml-4 p-1 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                  aria-label="Close settings"
                  style={{
                    backgroundColor: "transparent",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-x"
                  >
                    <path d="M18 6 6 18"></path>
                    <path d="m6 6 12 12"></path>
                  </svg>
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Paramètres API
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="items-center">
                    <label
                      htmlFor="apiUrl"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-3 mb-4 min-w-max"
                    >
                      URL :
                    </label>
                  </div>
                  <textarea
                    id="apiUrl"
                    value={apiUrlValue}
                    onChange={(e) => setApiUrlValue(e.target.value)}
                    className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    style={{ overflowX: "auto" }}
                  />
                </div>
                <div className="items-center ">
                  <label
                    htmlFor="apiKey"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mr-3 mb-4 min-w-max"
                  >
                    Clé API (or Model AI if using local server):
                  </label>
                  <input
                    type="text"
                    id="apiKey"
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    className="mb-4 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6 md:mb-8 text-sm">
          Entrez votre texte ci-dessous pour le corriger, l'améliorer, le
          traduire ou exécuter une demande.
        </p>

        <div className="mb-6">
          <label
            htmlFor="inputText"
            className="block text-base font-medium mb-2"
          >
            Votre texte
          </label>
          <textarea
            id="inputText"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 resize-none text-sm"
            placeholder="Écrivez ou collez votre texte ici..."
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <button
              onClick={handleCorrect}
              disabled={isLoading || inputText.trim() === ""}
              className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-cyan-300 dark:disabled:bg-cyan-800 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isLoading ? "Correction..." : "Corriger"}
            </button>

            <button
              onClick={handleEnhance}
              disabled={isLoading || inputText.trim() === ""}
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-emerald-300 dark:disabled:bg-emerald-800 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isLoading ? "Amélioration..." : "Améliorer"}
            </button>

            <button
              onClick={handleExecute}
              disabled={isLoading || inputText.trim() === ""}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-rose-300 dark:disabled:bg-rose-800 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isLoading ? "Exécution..." : "Exécuter"}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleTranslate}
                disabled={isLoading || inputText.trim() === ""}
                className="flex-1 px-4 py-2 mr-4 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transform hover:scale-105"
              >
                {isLoading ? "Traduction..." : "Traduire"}
              </button>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="relative">
          <label
            htmlFor="outputText"
            className="block text-base font-medium mb-2"
          >
            Résultat de l'IA
          </label>
          <textarea
            id="outputText"
            value={outputText}
            readOnly
            className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none resize-none text-sm"
            placeholder="La réponse de l'IA apparaîtra ici."
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 bg-opacity-75 dark:bg-opacity-75 z-10 rounded-xl">
              <svg
                className="animate-spin h-8 w-8 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          )}
          {isError && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100 dark:bg-red-900 bg-opacity-90 z-10 rounded-xl p-4">
              <div className="text-center text-red-700 dark:text-red-300">
                <p className="font-semibold text-base">Erreur !</p>
                <p className="text-sm">
                  La requête a échoué. Veuillez vérifier votre connexion IA et
                  réessayer (verifiez les Paramètres API)
                </p>
                <p className="text-xs mt-1 font-mono break-all">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
