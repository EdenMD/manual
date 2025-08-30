// Remove this line if you had it in your HTML:
// <script src="https://cdn.jsdelivr.net/npm/@octokit/rest@18.12.0/dist/octokit-rest.min.js"></script>
// This file no longer uses the Octokit.js library.

const DB_NAME = 'Gen1DB';
const DB_VERSION = 1;
const PROJECTS_STORE_NAME = 'projects';
const FILES_STORE_NAME = 'projectFiles';

const CURRENT_PROJECT_ID_LS_KEY = 'gen1_current_project_id';
const THEME_STORAGE_KEY = 'gen1_theme';
const CONVERSATION_FILENAME = 'conversations.json';
const FILE_OPS_ENABLED_KEY = 'gen1_file_ops_enabled';
const CUSTOM_MARKDOWN_INSTRUCTION_KEY = 'gen1_custom_markdown_instruction';
const DIRECTORY_MARKER = '__GEN1_DIRECTORY__'; // New: Marker for explicit empty directories

// AI Model Keys
const AI_MODEL_STORAGE_KEY = 'gen1_ai_model';
const GEMINI_API_KEY_STORAGE = 'gen1_gemini_api_key';
const GEMINI_API_ENDPOINT_KEY = 'gen1_gemini_api_endpoint';
const GROK_API_KEY_STORAGE = 'gen1_grok_api_key';
const GROK_API_ENDPOINT_KEY = 'gen1_grok_api_endpoint';
const DEEPSEEK_API_KEY_STORAGE = 'gen1_deepseek_api_key';
const DEEPSEEK_API_ENDPOINT_KEY = 'gen1_deepseek_api_endpoint';
const CLAUDE_API_KEY_STORAGE = 'gen1_claude_api_key';
const CLAUDE_API_ENDPOINT_KEY = 'gen1_claude_api_endpoint';
const CLAUDE_MODEL_NAME_KEY = 'gen1_claude_model_name';
const LLAMA_API_KEY_STORAGE = 'gen1_llama_api_key';
const LLAMA_API_ENDPOINT_KEY = 'gen1_llama_api_endpoint';
const LLAMA_MODEL_NAME_KEY = 'gen1_llama_model_name';
const MISTRAL_API_KEY_STORAGE = 'gen1_mistral_api_key';
const MISTRAL_API_ENDPOINT_KEY = 'gen1_mistral_api_endpoint';
const MISTRAL_MODEL_NAME_KEY = 'gen1_mistral_model_name';

// GitHub Integration Keys
const GITHUB_REPO_URL_KEY = 'gen1_github_repo_url';
const GITHUB_BRANCH_KEY = 'gen1_github_branch';
const GITHUB_PAT_KEY = 'gen1_github_pat'; // Security Warning: Storing PATs client-side

let defaultGeminiApiKey = "AIzaSyA1OUlNY-9DX-FOtqfkGK3F_e2W10We_I4"; // User provided this hardcoded key
let defaultGeminiEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"; // User provided this hardcoded endpoint
let defaultGrokEndpoint = "https://api.grok.com/v1/chat/completions";
let defaultDeepseekEndpoint = "https://api.deepseek.com/chat/completions";
let defaultClaudeEndpoint = "https://api.anthropic.com/v1/messages";
let defaultClaudeModel = "claude-3-opus-20240229"; // Or claude-3-sonnet-20240229, claude-3-haiku-20240229
let defaultLlamaEndpoint = "https://api.perplexity.ai/chat/completions"; // Example: Perplexity AI's API for LLaMA
let defaultLlamaModel = "llama-3-8b-instruct"; // Example LLaMA model
let defaultMistralEndpoint = "https://api.mistral.ai/v1/chat/completions";
let defaultMistralModel = "mistral-large-latest"; // Or open-mixtral-8x7b-v0.1, mistral-small-latest, codestral-latest

let currentAIModel = 'gemini';
let currentApiKey = defaultGeminiApiKey;
let currentApiEndpoint = defaultGeminiEndpoint;
let currentApiModelName = ''; // For models that require explicit model name in API body

// Updated AI Markdown Instruction for new file operations AND GitHub operations
let defaultAIMarkdownInstruction = `You are an AI assistant for a code editor named Anesha. Your goal is to help the user with their coding projects by generating code, refactoring, or creating/updating files.

**Crucial Instruction: When a file or GitHub operation (create, update, delete, mkdir, rmdir, mvfile, mvdir, github_push, github_pull) is requested by the user, your direct and immediate response for that specific turn MUST ONLY be the specified JSON markdown block, enclosed by °°°° delimiters.** Do not precede the JSON block with conversational text like "Okay, I will create the file." You may provide a brief conversational acknowledgment *after* the JSON block if necessary, but the action block itself must be the primary and immediate output.

The required markdown block format is EXACTLY as follows:

°°°°
\`\`\`json
{
  "action": "create" | "update" | "delete" | "mkdir" | "rmdir" | "mvfile" | "mvdir" | "github_push" | "github_pull",
  "path": "path/to/filename.ext" | "path/to/directory/", // for create, update, delete, mkdir, rmdir
  "content": "Full file content, escaped for JSON if needed (e.g., \\n for newline, \\" for double quote, \\\\ for backslash, \\r for carriage return)", // only for create/update
  "old_path": "old/path/file.ext" | "old/directory/path/", // for mvfile, mvdir
  "new_path": "new/path/file.ext" | "new/directory/path/", // for mvfile, mvdir
  "message": "Optional commit message (string)" // only for github_push
}
\`\`\`
°°°°

-   \`action\`: MUST be one of "create", "update", "delete", "mkdir", "rmdir", "mvfile", "mvdir", "github_push", "github_pull".
    -   'create': Creates a new file. If file exists, it will update.
    -   'update': Updates an existing file. If file doesn't exist, it will create.
    -   'delete': Deletes a file.
    -   'mkdir': Creates a new directory. It should end with '/'.
    -   'rmdir': Deletes a directory and all its contents. It should end with '/'.
    -   'mvfile': Renames or moves a file.
    -   'mvdir': Renames or moves a directory and all its contents.
    -   'github_push': Pushes all local changes in the current project to the configured GitHub repository and branch.
    -   'github_pull': Pulls the latest changes from the configured GitHub repository and branch, updating local files.
-   \`path\`: The full relative path to the file or directory. Used with 'create', 'update', 'delete', 'mkdir', 'rmdir'.
-   \`content\`: The full content of the file as a JSON string. ONLY for 'create' and 'update' actions. Literal double quotes (") MUST be escaped as \\". Literal backslashes (\\\\) MUST be escaped as \\\\\\\\. Literal newline characters (line breaks) MUST be escaped as \\n. Literal carriage returns (\\r) MUST be escaped as \\r.
-   \`old_path\`: The current full relative path to the file or directory being moved/renamed. ONLY for 'mvfile' and 'mvdir' actions.
-   \`new_path\`: The new full relative path to the file or directory. ONLY for 'mvfile' and 'mvdir' actions.
-   \`message\`: An optional commit message string. ONLY for 'github_push' action.

**Strict Adherence to Format:** The entire JSON block, including the \`\`\`json and \`\`\`, MUST be enclosed within the °°°° delimiters. **Absolutely no other text, characters, or conversational elements are allowed immediately before or after the °°°° delimiters within the file operation block.**

You can include regular conversational text before or after these markdown blocks. If you want a specific short message to be spoken by the AI, enclose it in <message>. The AI will only speak this marked part, not the whole message. Use standard markdown for formatting your conversational text (e.g., **bold**, *italic*, \`inline code\`, \`\`\`code block\`\`\`, # Headings, - Lists, > Blockquotes, | Tables | etc.). If the user references a file using 'x@filename', its content will be provided to you. If the user references multiple files using 'x@filename1 x@filename2', all their contents will be provided. Be concise and helpful. When a file or GitHub action is successfully performed, a simple <message>Acknowledged.</message> or <message>Done.</message> is sufficient.`;

const body = document.body;
const backButton = document.getElementById('backButton');
const fileMenuButton = document.getElementById('fileMenuButton');
const newChatButton = document.getElementById('newChatButton');
const toggleFileOpsButton = document.getElementById('toggleFileOpsButton');
const settingsButton = document.getElementById('settingsButton');
const messageDisplayArea = document.getElementById('messageDisplayArea');
const messageInput = document.getElementById('messageInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const fileReferenceDrawer = document.getElementById('fileReferenceDrawer');
const fileListReference = document.getElementById('fileListReference');
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsOverlay = document.getElementById('drawerOverlay');

const aiModelSelect = document.getElementById('aiModelSelect');
const geminiSettings = document.getElementById('geminiSettings');
const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
const geminiEndpointInput = document.getElementById('geminiEndpointInput');
const grokSettings = document.getElementById('grokSettings');
const grokApiKeyInput = document.getElementById('grokApiKeyInput');
const grokEndpointInput = document.getElementById('grokEndpointInput');
const deepseekSettings = document.getElementById('deepseekSettings');
const deepseekApiKeyInput = document.getElementById('deepseekApiKeyInput');
const deepseekEndpointInput = document.getElementById('deepseekEndpointInput');
const claudeSettings = document.getElementById('claudeSettings');
const claudeApiKeyInput = document.getElementById('claudeApiKeyInput');
const claudeEndpointInput = document.getElementById('claudeEndpointInput');
const claudeModelNameInput = document.getElementById('claudeModelNameInput');
const llamaSettings = document.getElementById('llamaSettings');
const llamaApiKeyInput = document.getElementById('llamaApiKeyInput');
const llamaEndpointInput = document.getElementById('llamaEndpointInput');
const llamaModelNameInput = document.getElementById('llamaModelNameInput');
const mistralSettings = document.getElementById('mistralSettings');
const mistralApiKeyInput = document.getElementById('mistralApiKeyInput');
const mistralEndpointInput = document.getElementById('mistralEndpointInput');
const mistralModelNameInput = document.getElementById('mistralModelNameInput');

const githubRepoUrlInput = document.getElementById('githubRepoUrlInput');
const githubBranchInput = document.getElementById('githubBranchInput');
const githubPatInput = document.getElementById('githubPatInput');
const pushToGithubButton = document.getElementById('pushToGithubButton');
const pullFromGithubButton = document.getElementById('pullFromGithubButton');

const markdownInstructionInput = document.getElementById('markdownInstructionInput');
const saveSettingsButton = document.getElementById('saveSettingsButton');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const statusMessageElement = document.getElementById('statusMessage');

// Elements for image attachment
const imageUploadInput = document.getElementById('imageUploadInput');
const attachImageButton = document.getElementById('attachImageButton');
const attachedImagePreview = document.getElementById('attachedImagePreview');
const imagePreview = document.getElementById('imagePreview');
const previewFileName = document.getElementById('previewFileName');
const previewFileSize = document.getElementById('previewFileSize');
const clearAttachedFileButton = document.getElementById('clearAttachedFile');

// Elements for Audio Chat Mode
const toggleSpeechButton = document.getElementById('toggleSpeechButton');
const audioModeOverlay = document.getElementById('audioModeOverlay');
const exitAudioModeButton = document.getElementById('exitAudioModeButton');
const audioStatusText = document.getElementById('audioStatusText');
const audioVisualizer = document.getElementById('audioVisualizer');


let db;
let currentProjectId = null;
let projectFilesData = {};
let expandedFolders = new Set();
let currentChatHistory = [];
let fileOperationsEnabled = true; // Default to ON as requested
let attachedImageData = null; // { base64: string, mimeType: string, filename: string, size: string }

// Speech Recognition and Synthesis instances
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;
let currentUtterance = null; // The current speechSynthesisUtterance being spoken
let audioChatModeActive = false;
let lastSpokenTranscript = ''; // Stores the full transcript from STT before sending

function openGen1DB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = event => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
                db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
                db.createObjectStore(FILES_STORE_NAME, { keyPath: 'projectId' });
            }
        };

        request.onsuccess = event => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = event => {
            showStatus('IndexedDB error: ' + event.target.error.message, 'error');
            reject(event.target.error);
        };
    });
}

function getItemFromStore(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.error);
    });
}

function putItemInStore(storeName, item) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.error);
    });
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'dark') {
        body.classList.add('dark-theme');
    } else {
        body.classList.remove('dark-theme');
    }
}

let statusMessageTimeout;
function showStatus(message, type, duration = 3000) {
    clearTimeout(statusMessageTimeout);
    statusMessageElement.style.display = 'flex';
    statusMessageElement.className = 'status-message show';
    statusMessageElement.classList.add(type);

    let iconClass = 'fas fa-info-circle';
    if (type === 'error') {
        iconClass = 'fas fa-times-circle';
    }
    if (type === 'success') {
        iconClass = 'fas fa-check-circle';
    }

    statusMessageElement.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
    if (duration > 0) {
        statusMessageTimeout = setTimeout(() => hideStatus(), duration);
    }
}

function hideStatus() {
    statusMessageElement.classList.remove('show');
}

const escapeHtml = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": `&#39;`
    };
    return text.replace(/[&<>"']/g, function(m) {
        return map[m];
    });
};

const processInlineMarkdown = (rawText) => {
    let processedText = rawText;

    // Handle inline code: `code` -> <code>escaped_code</code>
    processedText = processedText.replace(/`([^`]+)`/g, (match, p1) => `<code>${escapeHtml(p1)}</code>`);

    // Handle bold (must not touch content within already generated `<code>` tags or other HTML)
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processedText = processedText.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Handle italic
    processedText = processedText.replace(/_([^_]+)_/g, '<em>$1</em>');
    processedText = processedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return processedText;
};

function renderMarkdown(text) {
    let lines = text.split('\n');
    let html = [];
    let i = 0;

    while (i < lines.length) {
        let currentLine = lines[i].trim();

        // Fenced Code Blocks
        if (currentLine.startsWith('```')) {
            const startLine = i;
            const lang = currentLine.substring(3).trim();
            i++;
            let codeContent = [];
            while (i < lines.length && !lines[i].trim().startsWith('```')) {
                codeContent.push(lines[i]);
                i++;
            }
            if (i < lines.length && lines[i].trim().startsWith('```')) {
                html.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(codeContent.join('\n'))}</code><div class="code-action-buttons"><button class="copy-button" onclick="copyCode(this)"><i class="fa fa-copy"></i></button><button class="create-file-button" onclick="createFileFromCode(this)"><i class="fa fa-file-code"></i></button></div></pre>`);
                i++;
                continue;
            } else {
                i = startLine;
            }
        }

        // Horizontal Rule
        if (currentLine.match(/^[ \t]*([*_-])\1{2,}[ \t]*$/)) {
            html.push('<hr>');
            i++;
            continue;
        }

        // Headings
        let headingMatch = currentLine.match(/^(#){1,6}\s+(.*)$/);
        if (headingMatch) {
            let level = headingMatch[1].length;
            let content = headingMatch[2].trim();
            html.push(`<h${level}>${processInlineMarkdown(content)}</h${level}>`);
            i++;
            continue;
        }

        // Blockquotes
        if (currentLine.startsWith('>')) {
            let blockquoteContent = [];
            while (i < lines.length && lines[i].trim().startsWith('>')) {
                blockquoteContent.push(lines[i].trim().substring(1).trim());
                i++;
            }
            html.push(`<blockquote><p>${processInlineMarkdown(blockquoteContent.join('\n'))}</p></blockquote>`);
            continue;
        }

        // Lists (Unordered and Ordered)
        let listItemMatch = currentLine.match(/^[ \t]*([-*+]|\d+\.)\s+(.*)$/);
        if (listItemMatch) {
            let listType = listItemMatch[1].match(/^\d+\./) ? 'ol' : 'ul';
            html.push(`<${listType}>`);
            while (i < lines.length) {
                let currentListItem = lines[i].trim();
                let itemMatch = currentListItem.match(/^[ \t]*([-*+]|\d+\.)\s+(.*)$/);
                if (itemMatch && (itemMatch[1].match(/^\d+\./) ? listType === 'ol' : listType === 'ul')) {
                    html.push(`<li>${processInlineMarkdown(itemMatch[2].trim())}</li>`);
                    i++;
                } else if (currentListItem === '' && i + 1 < lines.length && lines[i+1].trim().match(/^[ \t]*([-*+]|\d+\.)\s+(.*)$/)) {
                    i++;
                }
                else {
                    break;
                }
            }
            html.push(`</${listType}>`);
            continue;
        }

        // Tables
        let headerLine = lines[i];
        if (headerLine.trim().startsWith('|') && headerLine.trim().endsWith('|')) {
            let separatorLine = lines[i + 1];
            if (separatorLine && separatorLine.trim().match(/^\|[-: ]+\|[-: |]+$/)) {
                let headers = headerLine.split('|').map(s => s.trim()).filter(s => s !== '');
                html.push('<table><thead><tr>');
                headers.forEach(header => html.push(`<th>${processInlineMarkdown(header)}</th>`));
                html.push('</tr></thead><tbody>');
                i += 2;
                while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
                    let dataCells = lines[i].split('|').map(s => s.trim()).filter(s => s !== '');
                    html.push('<tr>');
                    dataCells.forEach(cell => html.push(`<td>${processInlineMarkdown(cell)}</td>`));
                    html.push('</tr>');
                    i++;
                }
                html.push('</tbody></table>');
                continue;
            }
        }

        // Default: Paragraph
        let paragraphContent = [];
        while (i < lines.length && !lines[i].trim().startsWith('```') && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('>') && !lines[i].trim().match(/^[-*+]\s+/) && !lines[i].trim().match(/^\d+\.\s+/) && !lines[i].trim().match(/^[*-]{3,}$/) && !lines[i].trim().startsWith('|')) {
            paragraphContent.push(lines[i]);
            i++;
        }
        if (paragraphContent.length > 0) {
            html.push(`<p>${processInlineMarkdown(paragraphContent.join(' '))}</p>`);
        } else {
            i++;
        }
    }
    return html.join('');
}

function copyCode(button) {
    const code = button.closest('.code-action-buttons').previousElementSibling.textContent;
    navigator.clipboard.writeText(code).then(() => {
        button.innerHTML = '<i class="fa fa-check" style="color: var(--info-color);"></i>';
        setTimeout(() => {
            button.innerHTML = '<i class="fa fa-copy" style="color: #ADD8E6;"></i>';
        }, 2000);
    }, err => {
        console.error('Could not copy text: ', err);
        showStatus('Failed to copy code.', 'error');
    });
}

async function createFileFromCode(button) {
    const codeContent = button.closest('.code-action-buttons').previousElementSibling.textContent;

    const fullPath = prompt('Enter file name/path (e.g., index.html, src/components/MyComponent.js):');
    if (!fullPath) {
        showStatus('File creation cancelled.', 'info');
        return;
    }

    if (!fileOperationsEnabled) {
        showStatus('AI file operations are currently disabled. Enable them in settings.', 'error');
        return;
    }

    showStatus(`Creating file: ${fullPath}...`, 'info', 0);

    const op = {
        action: 'create',
        path: fullPath,
        content: codeContent
    };

    const success = await performFileOperation(op, true); // User initiated

    if (success) {
        const fileActionMsgObj = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            sender: 'user', // This is user-initiated action
            displayContent: '',
            contentForAI: `User created file "${fullPath}".`,
            type: 'ai-file-op', // Re-use this type for display consistency
            extraData: {
                action: 'created', // For display text
                filename: fullPath,
                size: getSizeString(codeContent),
                success: true
            },
            isHtml: false,
            timestamp: new Date().toISOString(),
        };
        currentChatHistory.push(fileActionMsgObj);
        displayMessage(fileActionMsgObj);
        await saveChatHistory();
    }
}

function getFileIconClass(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    // Special handling for directory marker
    if (filename.endsWith('/') && filename.includes(DIRECTORY_MARKER)) return 'fas fa-folder';

    switch (ext) {
        case 'js':
        case 'jsx': return 'fab fa-js';
        case 'ts':
        case 'tsx': return 'fas fa-file-code';
        case 'html':
        case 'htm': return 'fab fa-html5';
        case 'css': return 'fab fa-css3-alt';
        case 'json': return 'fas fa-file-alt';
        case 'md':
        case 'markdown': return 'fab fa-markdown';
        case 'py': return 'fab fa-python';
        case 'java': return 'fab fa-java';
        case 'c': return 'fas fa-file-code';
        case 'cpp': return 'fas fa-file-code';
        case 'go': return 'fab fa-go';
        case 'xml': return 'fas fa-code';
        case 'yaml':
        case 'yml': return 'fas fa-file-alt';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'svg':
        case 'ico': return 'fas fa-image';
        case 'txt': return 'fas fa-file-alt';
        default: return 'fas fa-file';
    }
}

function getSizeString(content) {
    if (!content) return '0 B';
    if (content.startsWith('data:')) {
        const base64Part = content.split(',')[1];
        const bytes = Math.ceil(base64Part.length * 0.75);
        if (bytes < 1024) return bytes + ' B';
        const kbs = bytes / 1024;
        if (kbs < 1024) return kbs.toFixed(1) + ' KB';
        const mbs = kbs / 1024;
        return mbs.toFixed(1) + ' MB';
    }
    const bytes = new TextEncoder().encode(content).length;
    if (bytes < 1024) return bytes + ' B';
    const kbs = bytes / 1024;
    if (kbs < 1024) return kbs.toFixed(1) + ' KB';
    const mbs = kbs / 1024;
    return mbs.toFixed(1) + ' MB';
}

async function saveChatHistory() {
    if (currentProjectId) {
        try {
            projectFilesData[CONVERSATION_FILENAME] = JSON.stringify(currentChatHistory);
            await putItemInStore(FILES_STORE_NAME, {
                projectId: currentProjectId,
                files: projectFilesData
            });
        } catch (error) {
            console.error('Error saving chat history:', error);
            showStatus('Failed to save chat history.', 'error', 2000);
        }
    }
}

async function loadProjectFilesDataOnly() {
    try {
        if (!db) {
            await openGen1DB();
        }
        const projectFiles = await getItemFromStore(FILES_STORE_NAME, currentProjectId);
        if (projectFiles && projectFiles.files) {
            projectFilesData = projectFiles.files;
        } else {
            projectFilesData = {};
        }
    } catch (error) {
        console.error('Error loading project files data:', error);
        showStatus('Failed to load project files data.', 'error', 2000);
        projectFilesData = {};
    }
}

async function loadChatHistory() {
    if (currentProjectId && projectFilesData[CONVERSATION_FILENAME]) {
        try {
            const chatHistoryJson = projectFilesData[CONVERSATION_FILENAME];
            currentChatHistory = JSON.parse(chatHistoryJson);
            messageDisplayArea.innerHTML = '';
            currentChatHistory.forEach(msg => displayMessage(msg));
        } catch (error) {
            console.error('Error loading chat history from file:', error);
            showStatus('Failed to load chat history from conversations.json. Starting fresh.', 'error', 3000);
            currentChatHistory = [];
        }
    } else {
        currentChatHistory = [];
    }
}

async function startNewConversation() {
    if (confirm('Are you sure you want to start a new conversation? This will clear the current chat history.')) {
        messageDisplayArea.innerHTML = '';
        currentChatHistory = [];
        const initialMessage = {
            id: 'initial-ai-message',
            sender: 'ai',
            displayContent: renderMarkdown('Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.'),
            contentForAI: 'Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.',
            type: 'text',
            extraData: null,
            isHtml: true,
            timestamp: new Date().toISOString()
        };
        currentChatHistory.push(initialMessage);
        displayMessage(initialMessage);
        await saveChatHistory();
        showStatus('New conversation started.', 'info', 2000);
    }
}

async function deleteMessage(messageId) {
    if (messageId === 'initial-ai-message' && currentChatHistory.length > 1) {
        showStatus('Cannot delete initial AI message unless it is the only message.', 'error', 3000);
        return;
    }
    if (!confirm('Are you sure you want to delete this message?')) {
        return;
    }
    currentChatHistory = currentChatHistory.filter(msg => msg.id !== messageId);
    await saveChatHistory();

    messageDisplayArea.innerHTML = '';
    if (currentChatHistory.length === 0) {
        const initialMessage = {
            id: 'initial-ai-message',
            sender: 'ai',
            displayContent: renderMarkdown('Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.'),
            contentForAI: 'Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.',
            type: 'text',
            extraData: null,
            isHtml: true,
            timestamp: new Date().toISOString()
        };
        currentChatHistory.push(initialMessage);
        displayMessage(initialMessage);
    } else {
        currentChatHistory.forEach(msg => displayMessage(msg));
    }
    showStatus('Message deleted.', 'info', 1500);
}

async function sendMessage(fromAudioMode = false, audioTranscript = '') {
    let userMessageRaw = fromAudioMode ? audioTranscript : messageInput.value.trim();

    // If in audio mode and no transcript was captured, don't send message
    if (fromAudioMode && audioTranscript === '') {
        return;
    }

    messageInput.value = ''; // Clear input immediately
    sendMessageButton.disabled = true;
    if (toggleSpeechButton) toggleSpeechButton.disabled = true;

    let displayContentForUser = userMessageRaw;
    let messageType = 'text';
    let extraMessageData = null;
    let messagePartsForAI = [];
    let contentForAiPromptText = userMessageRaw; // Default to raw message

    // --- MULTIPLE FILE REFERENCE LOGIC ---
    const fileRefRegex = /x@([^\s]+)/g;
    const referencedFiles = []; // To store details for display
    let combinedFileContentForAI = []; // For AI prompt
    let remainingUserMessage = userMessageRaw;

    // Extract all file references and their content
    let match;
    while ((match = fileRefRegex.exec(userMessageRaw)) !== null) {
        const referencedFilename = match[1];
        const fileContent = projectFilesData[referencedFilename];

        if (fileContent !== undefined && fileContent !== DIRECTORY_MARKER) {
            referencedFiles.push({
                filename: referencedFilename,
                size: getSizeString(fileContent)
            });
            combinedFileContentForAI.push(
                `User's request referencing file: \`${referencedFilename}\`\nFile Content:\n\`\`\`\n${fileContent}\n\`\`\`\n`
            );
            // Remove the 'x@filename' part from the user's message that will be displayed
            remainingUserMessage = remainingUserMessage.replace(match[0], '').trim();
        } else {
            showStatus('File not found or is a directory: ' + referencedFilename + '. Skipping reference.', 'error');
        }
    }

    if (referencedFiles.length > 0) {
        // If any files were successfully referenced
        messageType = 'file-ref-display';
        extraMessageData = { referencedFiles: referencedFiles };
        displayContentForUser = remainingUserMessage; // Display only the non-file-ref part

        // Prepend combined file content to the AI prompt text
        contentForAiPromptText = combinedFileContentForAI.join('\n\n') + `\n\nAdditional Message: ${remainingUserMessage}`;
    } else {
        // No files referenced, or only invalid ones, so revert to original user message
        displayContentForUser = userMessageRaw;
        contentForAiPromptText = userMessageRaw;
    }
    // --- END MULTIPLE FILE REFERENCE LOGIC ---


    // Construct message parts for AI (Gemini specific, or plain text for others)
    // This part is crucial for multimodal models (like Gemini with images)
    // And also for ensuring text is passed correctly.
    if (contentForAiPromptText) {
        messagePartsForAI.push({ text: contentForAiPromptText });
    }
    if (attachedImageData) {
        if (currentAIModel !== 'gemini') {
            showStatus('Image attachments are currently only supported for the Google Gemini model. Please switch AI Model in settings.', 'error', 5000);
            sendMessageButton.disabled = false;
            if (toggleSpeechButton) toggleSpeechButton.disabled = false;
            await saveChatHistory();
            clearAttachedImage();
            return;
        }
        messagePartsForAI.push({
            inlineData: {
                mimeType: attachedImageData.mimeType,
                data: attachedImageData.base64
            }
        });
        // Ensure messageType reflects image if it wasn't already file-ref-display with content
        if (messageType === 'text') { // Only change to text-and-image if it's purely text so far
            messageType = 'text-and-image';
        } else if (messageType === 'file-ref-display') {
            messageType = 'file-ref-and-image-display'; // New type to indicate both
        }
        // Add image data to extraMessageData for display purposes
        extraMessageData = {
            ...extraMessageData,
            image: {
                src: imagePreview.src,
                filename: attachedImageData.filename,
                size: attachedImageData.size
            }
        };
    }

    // CRITICAL FIX: Add instruction for AI audio response when in audio mode
    if (fromAudioMode) {
        const audioRequestInstruction = "\n\n(User sent this via voice. Please ensure your response includes a short spoken summary of your main point using the __{audio: \"SUMMARY TEXT\"}__ markdown tag. Example: `__{audio: \"Your summary here.\"}`)";

        // If the last part is text, append to it. Otherwise, add a new text part.
        if (messagePartsForAI.length > 0 && typeof messagePartsForAI[messagePartsForAI.length - 1].text === 'string') {
            messagePartsForAI[messagePartsForAI.length - 1].text += audioRequestInstruction;
        } else {
            messagePartsForAI.push({ text: audioRequestInstruction });
        }
    }


    // Create the user message object for chat history
    const userMessageObj = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        sender: 'user',
        displayContent: displayContentForUser,
        // For Gemini, contentForAI will be an array of parts (text + image).
        // For other models (non-multimodal), it's just plain text.
        contentForAI: (currentAIModel === 'gemini' && messagePartsForAI.length > 0) ? messagePartsForAI : contentForAiPromptText,
        type: messageType, // Can now be 'text', 'file-ref-display', 'text-and-image', 'file-ref-and-image-display'
        extraData: extraMessageData,
        isHtml: true,
        timestamp: new Date().toISOString()
    };
    currentChatHistory.push(userMessageObj);
    displayMessage(userMessageObj);

    clearAttachedImage();

    // --- Audio Mode Logic: After user message is displayed and before AI call ---
    if (audioChatModeActive) {
        stopSpeech();
        stopListening();

        audioStatusText.textContent = "Anesha is thinking...";
        audioVisualizer.classList.add('processing');
        audioVisualizer.classList.remove('listening', 'speaking');
        audioVisualizer.style.display = 'flex';

        speakText("Please wait. I am processing.", 'internal');
    } else {
        showStatus('Anesha is typing...', 'info', 0);
    }
    // --- End Audio Mode Logic ---

    try {
        let api_url = currentApiEndpoint;
        let api_key = currentApiKey;
        let model_name = currentApiModelName;
        let requestBody = {};
        let headers = { 'Content-Type': 'application/json' };

        const customInstruction = localStorage.getItem(CUSTOM_MARKDOWN_INSTRUCTION_KEY);
        const systemInstruction = customInstruction || defaultAIMarkdownInstruction;

        const messagesForApi = [];

        // Initialize system/assistant context based on model type
        if (currentAIModel === 'gemini') {
            messagesForApi.push({
                role: "user",
                parts: [{ text: systemInstruction }]
            });
            messagesForApi.push({
                role: "model",
                parts: [{ text: "Understood. I am ready to assist you. What can I do for you?" }]
            });
        } else if (currentAIModel === 'claude') {
            messagesForApi.push({
                role: "user",
                content: "Hello! How can I help you with your project today?"
            });
            messagesForApi.push({
                role: "assistant",
                content: "Understood. I am ready to assist you. What can I help you with?"
            });
            headers['x-api-key'] = api_key;
            headers['anthropic-version'] = '2023-06-01';
        }
         else { // Grok, DeepSeek, LLaMA, Mistral (OpenAI compatible)
            messagesForApi.push({
                role: "system",
                content: systemInstruction
            });
            messagesForApi.push({
                role: "assistant",
                content: "Understood. I am ready to assist you. What can I help you with?"
            });
            headers['Authorization'] = `Bearer ${api_key}`;
        }

        // Append past chat history messages to messagesForApi
        const startHistoryIndex = (currentChatHistory.length > 0 && currentChatHistory[0].id === 'initial-ai-message') ? 1 : 0;
        for (let i = startHistoryIndex; i < currentChatHistory.length; i++) {
            const msg = currentChatHistory[i];
            let contentForHistory;

            if (msg.sender === 'user') {
                if (currentAIModel === 'gemini' && Array.isArray(msg.contentForAI)) {
                    // If it's a Gemini multimodal message (text + image), send parts
                    messagesForApi.push({ role: 'user', parts: msg.contentForAI });
                    continue; // Skip the rest of this loop iteration for Gemini parts
                } else {
                    // For other models or simple text for Gemini, use the text content
                    contentForHistory = typeof msg.contentForAI === 'string' ? msg.contentForAI : msg.displayContent;
                    // Clean up referenced files display from user messages for AI context
                    if (msg.type === 'file-ref-display' || msg.type === 'file-ref-and-image-display') {
                        const fileRefsString = msg.extraData.referencedFiles.map(f => `File: ${f.filename}, Size: ${f.size}`).join('\n');
                        contentForHistory = `User referenced files:\n${fileRefsString}\n\nUser message: ${contentForHistory}`;
                    }
                }
            } else { // AI message
                if (msg.type === 'ai-file-op' && msg.extraData) {
                    // Reconstruct the AI's file operation for its own memory
                    let opDetails = `AI previously performed action "${msg.extraData.action}" on file "${msg.extraData.filename}".`;
                    if (msg.extraData.old_path && msg.extraData.new_path) {
                        opDetails = `AI previously performed action "${msg.extraData.action}" from "${msg.extraData.old_path}" to "${msg.extraData.new_path}".`;
                    }
                    contentForHistory = opDetails;
                } else if (msg.type === 'ai-file-op-error') {
                    contentForHistory = `AI previously encountered an error with file operation: ${msg.displayContent}.`;
                }
                else {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = msg.displayContent;
                    contentForHistory = tempDiv.textContent || tempDiv.innerText || '';
                }
            }

            if (currentAIModel === 'gemini') {
                messagesForApi.push({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: contentForHistory }]
                });
            } else if (currentAIModel === 'claude') {
                 messagesForApi.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: contentForHistory
                });
            }
            else { // Grok, DeepSeek, LLaMA, Mistral
                messagesForApi.push({
                    role: msg.sender === 'user' ? 'user' : 'assistant',
                    content: contentForHistory
                });
            }
        }

        if (currentAIModel === 'gemini') {
            headers['x-goog-api-key'] = api_key;
            requestBody = { contents: messagesForApi };
        } else if (currentAIModel === 'claude') {
            requestBody = {
                model: model_name,
                messages: messagesForApi,
                system: systemInstruction, // Claude specific system prompt location
                max_tokens: 2048
            };
        }
        else { // Grok, DeepSeek, LLaMA, Mistral (OpenAI compatible)
            requestBody = {
                messages: messagesForApi,
                model: model_name || "default",
                temperature: 0.7,
                max_tokens: 2048
            };
        }

        const response = await fetch(api_url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });

               const responseData = await response.json();

        let aiResponseText = '';
        if (response.ok) {
            if (currentAIModel === 'gemini') {
                aiResponseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else if (currentAIModel === 'claude') {
                aiResponseText = responseData.content?.[0]?.text || '';
            } else { // Grok, DeepSeek, LLaMA, Mistral
                aiResponseText = responseData.choices?.[0]?.message?.content || '';
            }
        }
 // --- Audio Mode Logic: After AI response is received, stop "Please wait" ---
        if (audioChatModeActive) {
            stopSpeech(); // Stop the "Please wait" utterance if it's still playing
            audioVisualizer.classList.remove('processing'); // Stop processing animation
            audioStatusText.textContent = "Generating response..."; // Intermediate status before speaking
        } else {
            hideStatus(); // Hide general status message if not in audio mode
        }
        // --- End Audio Mode Logic ---

        if (aiResponseText) {
            // parseAndDisplayAiResponse will handle displaying messages and triggering speech if  is found
            await parseAndDisplayAiResponse(aiResponseText);

            // --- Audio Mode Logic: Fallback for starting listening if no AI speech ---
            // Check if the AI's response explicitly contained an audio tag.
            // If not, and we are in audio chat mode, immediately re-enable listening for user.
            // If an audio tag was found, startListening() will be triggered by speakText's onend for 'user_response' type.
            const audioTagFound = aiResponseText.includes('__{audio:');
            if (audioChatModeActive && !audioTagFound) {
                audioStatusText.textContent = "Ready to speak...";
                startListening(); // Re-enable microphone for user's turn
            }
            // --- End Audio Mode Logic ---

        } else {
            console.error('AI response error:', responseData);
            const errorMessage = 'Error: Could not get a response from AI. ' + (responseData.error ? responseData.error.message : JSON.stringify(responseData));
            const aiErrorMsgObj = {
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
                sender: 'ai',
                displayContent: errorMessage,
                contentForAI: errorMessage,
                type: 'error',
                extraData: null,
                isHtml: false,
                timestamp: new Date().toISOString()
            };
            currentChatHistory.push(aiErrorMsgObj);
            displayMessage(aiErrorMsgObj);

            // --- Audio Mode Logic: Handle error during AI response ---
            if (audioChatModeActive) {
                stopSpeech(); // Ensure any internal speech is stopped
                audioStatusText.textContent = "Error. Please try again.";
                audioVisualizer.classList.remove('speaking', 'listening', 'processing'); // Clear visualizer
                startListening(); // Allow user to try again
            }
            // --- End Audio Mode Logic ---
        }
    } catch (error) {
        console.error('Fetch error:', error);
        const networkErrorMsg = 'Network error or problem connecting to AI: ' + error.message;
        const aiNetworkErrorObj = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            sender: 'ai',
            displayContent: networkErrorMsg,
            contentForAI: networkErrorMsg,
            type: 'error',
            extraData: null,
            isHtml: false,
            timestamp: new Date().toISOString()
        };
        currentChatHistory.push(aiNetworkErrorObj);
        displayMessage(aiNetworkErrorObj);

        // --- Audio Mode Logic: Handle network error ---
        if (audioChatModeActive) {
            stopSpeech();
            audioStatusText.textContent = "Network error. Try again.";
            audioVisualizer.classList.remove('speaking', 'listening', 'processing');
            startListening();
        } else {
            hideStatus();
        }
        // --- End Audio Mode Logic ---
    } finally {
        sendMessageButton.disabled = false;
        if (toggleSpeechButton) toggleSpeechButton.disabled = false;
        await saveChatHistory();
    }
}

function displayMessage(messageObj) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble', messageObj.sender);
    if (messageObj.type === 'error' || (messageObj.type === 'ai-file-op' && messageObj.extraData && messageObj.extraData.success === false) || messageObj.type === 'github-op-error') {
        messageBubble.classList.add('error');
    }
    messageBubble.dataset.messageId = messageObj.id;
    messageBubble.dataset.timestamp = messageObj.timestamp;

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('delete-message-btn');
    deleteBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
    deleteBtn.title = 'Delete message';
    deleteBtn.addEventListener('click', () => deleteMessage(messageObj.id));
    messageBubble.appendChild(deleteBtn);

    // Handle file reference/operation header
    if (['file-ref-display', 'ai-file-op', 'ai-file-op-error', 'github-op-display', 'github-op-error'].includes(messageObj.type)) {
        const fileHeader = document.createElement('div');
        fileHeader.classList.add('file-attachment-header');
        if (messageObj.type === 'ai-file-op-error' || (messageObj.type === 'ai-file-op' && messageObj.extraData && messageObj.extraData.success === false) || messageObj.type === 'github-op-error') {
            fileHeader.classList.add('error');
        }

        const icon = document.createElement('i');
        const actionTextSpan = document.createElement('span');
        actionTextSpan.classList.add('file-action-text');

        // Specific logic for file-ref-display (user message)
        if (messageObj.type === 'file-ref-display' || messageObj.type === 'file-ref-and-image-display') {
            if (messageObj.extraData && messageObj.extraData.referencedFiles && messageObj.extraData.referencedFiles.length > 0) {
                // Multiple files referenced
                icon.className = 'fas fa-file-invoice'; // Generic multiple files icon
                actionTextSpan.textContent = 'Referenced Multiple Files:';
                fileHeader.appendChild(icon);
                fileHeader.appendChild(actionTextSpan);

                const fileListUl = document.createElement('ul');
                fileListUl.classList.add('referenced-file-list');
                messageObj.extraData.referencedFiles.forEach(file => {
                    const li = document.createElement('li');
                    li.innerHTML = `<i class="${getFileIconClass(file.filename)}"></i> ${file.filename} (${file.size})`;
                    fileListUl.appendChild(li);
                });
                fileHeader.appendChild(fileListUl);
            }
        }
        // Specific logic for AI file operation messages
        else if (messageObj.type === 'ai-file-op') {
            const action = messageObj.extraData.action;
            let iconClass;
            // Determine icon based on action
            if (action.includes('created directory')) iconClass = 'fas fa-folder-plus';
            else if (action.includes('deleted directory')) iconClass = 'fas fa-folder-minus';
            else if (action.includes('renamed/moved')) iconClass = 'fas fa-exchange-alt';
            else if (action === 'created' || action === 'updated') iconClass = getFileIconClass(messageObj.extraData.filename);
            else if (action === 'deleted') iconClass = 'fas fa-trash-alt';
            else iconClass = 'fas fa-file-code'; // Default for other ops

            icon.className = iconClass;
            actionTextSpan.textContent = action.charAt(0).toUpperCase() + action.slice(1);

            const fileNameSpan = document.createElement('span');
            fileNameSpan.classList.add('file-name-text');
            fileNameSpan.textContent = messageObj.extraData.filename || 'Unknown';
            const fileSizeSpan = document.createElement('span');
            fileSizeSpan.classList.add('file-size-text');
            if (messageObj.extraData && messageObj.extraData.size) {
                fileSizeSpan.textContent = '(' + messageObj.extraData.size + ')';
            }

            fileHeader.appendChild(icon);
            fileHeader.appendChild(actionTextSpan);
            fileHeader.appendChild(fileNameSpan);
            if (messageObj.extraData && messageObj.extraData.size) {
                fileHeader.appendChild(fileSizeSpan);
            }

        } else if (messageObj.type === 'ai-file-op-error') {
            icon.className = 'fas fa-exclamation-triangle';
            actionTextSpan.textContent = 'File Op Error';
            const fileNameSpan = document.createElement('span');
            fileNameSpan.classList.add('file-name-text');
            fileNameSpan.textContent = messageObj.extraData.filename || 'Unknown';
            fileHeader.appendChild(icon);
            fileHeader.appendChild(actionTextSpan);
            fileHeader.appendChild(fileNameSpan);
        } else if (messageObj.type === 'github-op-display') {
            icon.className = 'fab fa-github';
            actionTextSpan.textContent = messageObj.extraData.action;

            const repoBranchSpan = document.createElement('span');
            repoBranchSpan.classList.add('file-name-text');
            repoBranchSpan.textContent = ` ${messageObj.extraData.repo}/${messageObj.extraData.branch}`;

            fileHeader.appendChild(icon);
            fileHeader.appendChild(actionTextSpan);
            fileHeader.appendChild(repoBranchSpan);

            if (messageObj.extraData.message) {
                const commitMessageSpan = document.createElement('span');
                commitMessageSpan.classList.add('file-size-text'); // Reusing class for small text
                commitMessageSpan.textContent = ` ("${messageObj.extraData.message}")`;
                fileHeader.appendChild(commitMessageSpan);
            }
            if (messageObj.extraData.changesCount !== undefined) {
                 const changesCountSpan = document.createElement('span');
                 changesCountSpan.classList.add('file-size-text');
                 changesCountSpan.textContent = ` (${messageObj.extraData.changesCount} change(s))`;
                 fileHeader.appendChild(changesCountSpan);
             }


        } else if (messageObj.type === 'github-op-error') {
            icon.className = 'fas fa-exclamation-triangle';
            actionTextSpan.textContent = `GitHub Error (${messageObj.extraData.action})`;
            const repoBranchSpan = document.createElement('span');
            repoBranchSpan.classList.add('file-name-text');
            repoBranchSpan.textContent = ` ${messageObj.extraData.repo}/${messageObj.extraData.branch}`;
            fileHeader.appendChild(icon);
            fileHeader.appendChild(actionTextSpan);
            fileHeader.appendChild(repoBranchSpan);
        }

        messageBubble.appendChild(fileHeader);
        messageBubble.classList.add('has-file-header');
    }

    const messageContentDiv = document.createElement('div');
    messageContentDiv.classList.add('message-content');

    if (messageObj.sender === 'user' && messageObj.extraData && messageObj.extraData.image) {
        const imgContainer = document.createElement('div');
        imgContainer.style.marginBottom = '10px';
        imgContainer.style.maxWidth = '100%';
        imgContainer.style.textAlign = 'center';
        const imgElement = document.createElement('img');
        imgElement.src = messageObj.extraData.image.src;
        imgElement.alt = messageObj.extraData.image.filename;
        imgElement.style.maxWidth = '200px';
        imgElement.style.maxHeight = '200px';
        imgElement.style.borderRadius = '8px';
        imgElement.style.objectFit = 'contain';
        imgElement.style.display = 'block';
        imgElement.style.margin = '0 auto';

        imgContainer.appendChild(imgElement);

        const imgInfo = document.createElement('div');
        imgInfo.style.fontSize = '0.8em';
        imgInfo.style.color = 'var(--text-secondary)';
        imgInfo.style.marginTop = '5px';
        imgInfo.textContent = `${messageObj.extraData.image.filename} (${messageObj.extraData.image.size})`;
        imgContainer.appendChild(imgInfo);

        messageContentDiv.appendChild(imgContainer);
    }

    if (messageObj.isHtml) {
        // Ensure text content is always displayed for user messages, regardless of attachments
        if (messageObj.displayContent.trim() !== '') {
            const textP = document.createElement('p');
            textP.innerHTML = messageObj.displayContent; // This already has markdown processed
            messageContentDiv.appendChild(textP);
        }
    } else { // Fallback for non-HTML (e.g., error messages direct text)
        const p = document.createElement('p');
        p.textContent = messageObj.displayContent;
        messageContentDiv.appendChild(p);
    }

    messageBubble.appendChild(messageContentDiv);
    messageDisplayArea.appendChild(messageBubble);

    messageDisplayArea.scrollTop = messageDisplayArea.scrollHeight;
}

// Helper function to normalize paths
function normalizePath(path) {
    if (!path) return '';
    let normalized = path.trim().replace(/\/+/g, '/'); // Remove duplicate slashes
    if (normalized.startsWith('/')) normalized = normalized.substring(1); // Remove leading slash
    return normalized;
}

// New Centralized File Operation Function
async function performFileOperation(op, isUserInitiated = false) {
    if (!fileOperationsEnabled && !isUserInitiated && !['github_push', 'github_pull'].includes(op.action)) {
        showStatus('AI file operations are currently disabled. Enable them using the toggle button.', 'error');
        return false;
    }

    let success = false;
    let actionText = op.action.charAt(0).toUpperCase() + op.action.slice(1);
    let displayPath = op.path || op.new_path || op.old_path; // For file operations
    let githubRepoDetails = null; // For GitHub operations

    // Extract GitHub specific details for status messages
    if (op.action === 'github_push' || op.action === 'github_pull') {
        const repoUrl = localStorage.getItem(GITHUB_REPO_URL_KEY);
        const branch = localStorage.getItem(GITHUB_BRANCH_KEY);
        const { owner, repo } = parseGithubRepoUrl(repoUrl);
        githubRepoDetails = { owner, repo, branch };

        if (!owner || !repo || !branch || !localStorage.getItem(GITHUB_PAT_KEY)) {
            showStatus('GitHub settings incomplete. Configure Repo URL, Branch, and PAT.', 'error', 5000);
            return false;
        }
        showStatus(`Processing GitHub ${actionText} for ${owner}/${repo}...`, 'info', 0);
    } else {
        showStatus(`Processing ${actionText} operation for ${displayPath}...`, 'info', 0);
    }


    try {
        switch (op.action) {
            case 'create':
            case 'update':
                success = await handleCreateUpdateFile(op.path, op.content, op.action);
                break;
            case 'delete':
                success = await handleDeleteFile(op.path);
                break;
            case 'mkdir':
                success = await handleCreateDirectory(op.path);
                break;
            case 'rmdir':
                success = await handleDeleteDirectory(op.path);
                break;
            case 'mvfile':
                success = await handleRenameFile(op.old_path, op.new_path);
                break;
            case 'mvdir':
                success = await handleRenameDirectory(op.old_path, op.new_path);
                break;
            case 'github_push':
                success = await pushChangesToGitHub(op.message || `Gen1 AI Assist: AI-initiated push on ${new Date().toLocaleString()}`);
                break;
            case 'github_pull':
                success = await pullChangesFromGitHub();
                break;
            default:
                throw new Error(`Unknown operation action: ${op.action}`);
        }

        if (success) {
            if (op.action.startsWith('github_')) {
                showStatus(`GitHub ${actionText} successful for ${githubRepoDetails.repo}/${githubRepoDetails.branch}.`, 'success');
            } else {
                showStatus(`${actionText} ${displayPath} successful.`, 'success');
            }
        } else {
            // Specific handlers will set their own error messages if they return false
            if (op.action.startsWith('github_')) {
                // Error message already handled by push/pull functions, just update status
            } else {
                showStatus(`${actionText} ${displayPath} failed.`, 'error');
            }
        }

        if (fileReferenceDrawer.classList.contains('open')) {
            loadProjectFilesForReference();
        }
        return success;

    } catch (error) {
        console.error('Error performing operation:', error);
        let errorMsg = error.message;

        if (op.action.startsWith('github_')) {
            showStatus(`GitHub ${actionText} for ${githubRepoDetails.repo}/${githubRepoDetails.branch} Failed: ${errorMsg}`, 'error');
        } else {
            showStatus(`Failed to ${op.action} ${displayPath}: ${errorMsg}`, 'error');
        }
        return false;
    }
}

// Helper functions for specific file operations
async function handleCreateUpdateFile(path, content, action) {
    path = normalizePath(path);
    if (!path) {
        showStatus('File path cannot be empty.', 'error');
        return false;
    }

    // If path implies a directory that was explicitly created empty, remove that marker
    // Example: path = 'folder/file.txt', and 'folder/' exists as DIRECTORY_MARKER
    const pathParts = path.split('/');
    if (pathParts.length > 1) {
        let currentDirPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
            currentDirPath += pathParts[i] + '/';
            if (projectFilesData[currentDirPath] === DIRECTORY_MARKER) {
                delete projectFilesData[currentDirPath]; // Directory is now implicitly defined by the file
            }
        }
    }

    const fileExists = projectFilesData[path] !== undefined && projectFilesData[path] !== DIRECTORY_MARKER;
    // For display, the actual action is what matters, not the AI's initial 'create' vs 'update' intent
    // The `parseAndDisplayAiResponse` function determines the display action based on `success`

    projectFilesData[path] = content;
    await putItemInStore(FILES_STORE_NAME, {
        projectId: currentProjectId,
        files: projectFilesData
    });

    return true; // Indicate success for the operation
}

async function handleDeleteFile(path) {
    path = normalizePath(path);
    if (!path) {
        showStatus('File path cannot be empty.', 'error');
        return false;
    }

    if (projectFilesData[path] === undefined) {
        showStatus(`Cannot delete file '${path}': Not found.`, 'error');
        return false;
    }
    if (projectFilesData[path] === DIRECTORY_MARKER || path.endsWith('/')) { // Explicitly check if it's a directory marker or ends with '/'
        showStatus(`Cannot delete file '${path}': It is a directory, not a file. Use 'rmdir' instead.`, 'error');
        return false;
    }

    delete projectFilesData[path];

    // Clean up old implied directory if it becomes empty
    const oldDirPath = path.substring(0, path.lastIndexOf('/') + 1);
    if (oldDirPath) { // Only if it was in a sub-directory
        // Check if any actual files or directory markers remain in the old parent directory
        const hasRemainingContent = Object.keys(projectFilesData).some(p => p.startsWith(oldDirPath) && p !== oldDirPath);
        if (!hasRemainingContent) { // If the directory is now completely empty
             if (projectFilesData[oldDirPath] === DIRECTORY_MARKER) {
                 delete projectFilesData[oldDirPath]; // Remove explicit marker
             }
             // No need to add new DIRECTORY_MARKER, as it's truly empty and now implicitly removed.
        }
    }

    await putItemInStore(FILES_STORE_NAME, {
        projectId: currentProjectId,
        files: projectFilesData
    });
    return true;
}

async function handleCreateDirectory(path) {
    let dirPath = normalizePath(path);
    if (!dirPath.endsWith('/')) dirPath += '/';
    if (!dirPath) {
        showStatus('Directory path cannot be empty.', 'error');
        return false;
    }

    if (projectFilesData[dirPath] === DIRECTORY_MARKER) {
        // Directory explicitly exists as an empty marker
        showStatus(`Directory '${dirPath}' already exists.`, 'info');
        return true;
    }

    // Check if there are already files/directories nested under this path
    // that imply the directory exists, or if it exists as a file (conflict)
    const existingKeysUnderPath = Object.keys(projectFilesData).filter(p => p.startsWith(dirPath));
    if (existingKeysUnderPath.length > 0) {
        const hasActualFiles = existingKeysUnderPath.some(p => projectFilesData[p] !== DIRECTORY_MARKER);
        if (hasActualFiles) {
            showStatus(`Directory '${dirPath}' already implicitly exists due to nested files.`, 'info');
            return true;
        }
    }

    // Check for conflict: if a file exists with the exact name as the directory
    if (projectFilesData[dirPath.slice(0, -1)] !== undefined && projectFilesData[dirPath.slice(0, -1)] !== DIRECTORY_MARKER) {
        showStatus(`Cannot create directory '${dirPath}': A file with the same name already exists.`, 'error');
        return false;
    }

    // Create intermediate directories if they don't exist
    const parts = dirPath.split('/').filter(p => p);
    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
        currentPath += parts[i] + '/';
        // Only add DIRECTORY_MARKER if it doesn't implicitly exist by nested files or another explicit marker
        const isImplied = Object.keys(projectFilesData).some(p => p.startsWith(currentPath) && p !== currentPath && projectFilesData[p] !== DIRECTORY_MARKER);
        if (projectFilesData[currentPath] === undefined && !isImplied) {
            projectFilesData[currentPath] = DIRECTORY_MARKER;
        }
    }

    await putItemInStore(FILES_STORE_NAME, {
        projectId: currentProjectId,
        files: projectFilesData
    });
    return true;
}

async function handleDeleteDirectory(path) {
    let dirPath = normalizePath(path);
    if (!dirPath.endsWith('/')) dirPath += '/';
    if (!dirPath) {
        showStatus('Directory path cannot be empty.', 'error');
        return false;
    }

    let foundAnything = false;
    const filesToDelete = Object.keys(projectFilesData).filter(p => p.startsWith(dirPath));

    if (filesToDelete.length === 0 && projectFilesData[dirPath] !== DIRECTORY_MARKER) {
         showStatus(`Directory '${dirPath}' not found or is already empty.`, 'info');
         return false; // Nothing to delete
    }

    for (const p of filesToDelete) {
        delete projectFilesData[p];
        foundAnything = true;
    }
    // Also delete the explicit directory marker if it exists
    if (projectFilesData[dirPath] === DIRECTORY_MARKER) {
        delete projectFilesData[dirPath];
        foundAnything = true;
    }

    if (foundAnything) {
        await putItemInStore(FILES_STORE_NAME, {
            projectId: currentProjectId,
            files: projectFilesData
        });
    }
    return foundAnything;
}

async function handleRenameFile(old_path, new_path) {
    old_path = normalizePath(old_path);
    new_path = normalizePath(new_path);

    if (!old_path || !new_path) {
        showStatus('Old path and new path cannot be empty.', 'error');
        return false;
    }

    if (projectFilesData[old_path] === undefined) {
        showStatus(`Cannot rename file '${old_path}': Source file not found.`, 'error');
        return false;
    }
    if (projectFilesData[old_path] === DIRECTORY_MARKER || old_path.endsWith('/')) {
        showStatus(`Cannot rename file '${old_path}': Source is a directory, not a file. Use 'mvdir' instead.`, 'error');
        return false;
    }
    if (projectFilesData[new_path] !== undefined) { // Check for existing file OR explicit directory marker
        showStatus(`Cannot rename to '${new_path}': A file or directory with this name already exists.`, 'error');
        return false;
    }
    if (new_path.endsWith('/')) {
        showStatus(`Cannot rename to '${new_path}': Target name must be a file path, not a directory.`, 'error');
        return false;
    }

    projectFilesData[new_path] = projectFilesData[old_path];
    delete projectFilesData[old_path];

    // Clean up old implied directory if it becomes empty
    const oldDirPath = old_path.substring(0, old_path.lastIndexOf('/') + 1);
    if (oldDirPath) { // Only if it was in a sub-directory
        // Check if any actual files or directory markers remain in the old parent directory
        const hasRemainingContent = Object.keys(projectFilesData).some(p => p.startsWith(oldDirPath) && p !== oldDirPath);
        if (!hasRemainingContent) { // If the directory is now completely empty
             if (projectFilesData[oldDirPath] === DIRECTORY_MARKER) {
                 delete projectFilesData[oldDirPath]; // Remove explicit marker
             }
             // No need to add new DIRECTORY_MARKER, as it's truly empty and now implicitly removed.
        }
    }

    // Ensure new parent directory is implicitly created if it doesn't exist explicitly
    const newDirPath = new_path.substring(0, new_path.lastIndexOf('/') + 1);
    if (newDirPath && projectFilesData[newDirPath] === DIRECTORY_MARKER) {
        delete projectFilesData[newDirPath]; // Remove marker as it's now implicitly defined by the new file
    }

    await putItemInStore(FILES_STORE_NAME, {
        projectId: currentProjectId,
        files: projectFilesData
    });
    return true;
}

async function handleRenameDirectory(old_path, new_path) {
    let oldDirPath = normalizePath(old_path);
    if (!oldDirPath.endsWith('/')) oldDirPath += '/';
    let newDirPath = normalizePath(new_path);
    if (!newDirPath.endsWith('/')) newDirPath += '/';

    if (!oldDirPath || !newDirPath) {
        showStatus('Old directory path and new directory path cannot be empty.', 'error');
        return false;
    }

    if (oldDirPath === newDirPath) {
        showStatus(`Old path and new path are the same for directory rename: ${old_path}`, 'info');
        return true;
    }

    let foundAnything = false;
    const pathsToUpdate = Object.keys(projectFilesData).filter(p => p.startsWith(oldDirPath));

    // If the old path was an explicit empty directory, include it if no other files exist within it
    if (projectFilesData[oldDirPath] === DIRECTORY_MARKER && pathsToUpdate.length === 0) {
        pathsToUpdate.push(oldDirPath);
    }

    if (pathsToUpdate.length === 0) {
        showStatus(`Directory '${old_path}' not found.`, 'error');
        return false;
    }

    // Check for conflicts with existing files/directories at new path
    // A conflict occurs if any item in the new path already exists, unless it's the target itself (if mvdir is used to just rename)
    const conflict = Object.keys(projectFilesData).some(p => p.startsWith(newDirPath) && !p.startsWith(oldDirPath));
    if (conflict) {
         showStatus(`Cannot rename to '${new_path}': Conflicts with existing files or directories.`, 'error');
         return false;
    }
    // Also check if moving 'a/b/' to 'a/b/c/' (moving directory into itself)
    if (newDirPath.startsWith(oldDirPath) && newDirPath.length > oldDirPath.length) {
        showStatus(`Cannot move directory '${old_path}' into a subdirectory of itself: '${new_path}'., 'error`);
        return false;
    }

    const changes = {};
    for (const p of pathsToUpdate) {
        const newP = p.replace(oldDirPath, newDirPath);
        changes[newP] = projectFilesData[p];
        foundAnything = true;
    }

    // Apply changes (delete old paths, add new paths)
    for (const p of pathsToUpdate) {
        delete projectFilesData[p];
    }
    Object.assign(projectFilesData, changes);

    // Clean up empty parent directories after move, if any of the old paths became empty parent directories
    const oldDirParts = oldDirPath.split('/').filter(p => p);
    let currentOldPath = '';
    for (let i = 0; i < oldDirParts.length; i++) {
        currentOldPath += oldDirParts[i] + '/';
        const hasRemainingContent = Object.keys(projectFilesData).some(p => p.startsWith(currentOldPath));
        if (!hasRemainingContent && projectFilesData[currentOldPath] === DIRECTORY_MARKER) {
            delete projectFilesData[currentOldPath];
        }
    }
    // Ensure new parent directory is implicitly created if it doesn't exist explicitly
    const newDirParentPath = newDirPath.substring(0, newDirPath.lastIndexOf('/', newDirPath.length - 2) + 1); // Get parent of newDirPath
    if (newDirParentPath && projectFilesData[newDirParentPath] === DIRECTORY_MARKER) {
        delete projectFilesData[newDirParentPath]; // Remove marker as it's now implicitly defined
    }

    if (foundAnything) {
        await putItemInStore(FILES_STORE_NAME, {
            projectId: currentProjectId,
            files: projectFilesData
        });
    }
    return foundAnything;
}


async function parseAndDisplayAiResponse(response) {
    const fileActionRegex = /°°°°\s*```json\s*({[\s\S]*?})\s*```\s*°°°°/g;
    const audioSpeechRegex = /__{audio:\s*"(.*?)"}__/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    // First, extract audio speech segments to remove them from the main text
    let speechContentToPlay = '';
    let cleanedResponse = response.replace(audioSpeechRegex, (match, p1) => {
        speechContentToPlay = p1; // Capture the last audio segment for playback
        return ''; // Remove from the main text that gets displayed/parsed for file ops
    });

    // Now, parse file actions from the cleaned response
    while ((match = fileActionRegex.exec(cleanedResponse)) !== null) {
        if (match.index > lastIndex) {
            segments.push({
                type: 'text',
                content: cleanedResponse.substring(lastIndex, match.index),
            });
        }

        try {
            let jsonString = match[1];
            let parsedJson;
            try {
                parsedJson = JSON.parse(jsonString);
            } catch (e) {
                // More robust attempt to clean JSON if it starts/ends incorrectly or has common AI errors
                jsonString = jsonString.trim();
                // Attempt to strip common markdown code block markers if present
                if (jsonString.startsWith('```json')) jsonString = jsonString.substring('```json'.length).trim();
                if (jsonString.endsWith('```')) jsonString = jsonString.substring(0, jsonString.length - '```'.length).trim();
                // Attempt to strip the custom delimiters if the AI incorrectly included them inside the JSON block
                if (jsonString.startsWith('°°°°')) jsonString = jsonString.substring('°°°°'.length).trim();
                if (jsonString.endsWith('°°°°')) jsonString = jsonString.substring(0, jsonString.length - '°°°°'.length).trim();

                // Remove BOM if present (rare but can happen with some text encodings)
                if (jsonString.charCodeAt(0) === 0xFEFF) {
                    jsonString = jsonString.substring(1);
                }

                try {
                    parsedJson = JSON.parse(jsonString);
                } catch (retryError) {
                    console.error("Second attempt at JSON parsing failed:", retryError, "Raw string:", jsonString);
                    throw new Error(`Invalid JSON format after retry: ${retryError.message}\nRaw: ${match[1]}`);
                }
            }

            // Validate required fields based on action type
            const action = parsedJson.action;
            let isValidAction = false;
            switch(action) {
                case 'create':
                case 'update':
                    isValidAction = parsedJson.path && parsedJson.content !== undefined;
                    // Additional check for content type - ensure it's a string
                    if (parsedJson.content !== undefined && typeof parsedJson.content !== 'string') {
                         throw new Error(`'content' field for '${action}' action must be a string.`);
                    }
                    break;
                case 'delete':
                case 'mkdir':
                case 'rmdir':
                    isValidAction = parsedJson.path !== undefined;
                    // Additional check for path type - ensure it's a string
                    if (parsedJson.path !== undefined && typeof parsedJson.path !== 'string') {
                        throw new Error(`'path' field for '${action}' action must be a string.`);
                    }
                    break;
                case 'mvfile':
                case 'mvdir':
                    isValidAction = parsedJson.old_path !== undefined && parsedJson.new_path !== undefined;
                    // Additional check for path types - ensure they are strings
                    if (parsedJson.old_path !== undefined && typeof parsedJson.old_path !== 'string') {
                        throw new Error(`'old_path' field for '${action}' action must be a string.`);
                    }
                    if (parsedJson.new_path !== undefined && typeof parsedJson.new_path !== 'string') {
                        throw new Error(`'new_path' field for '${action}' action must be a string.`);
                    }
                    break;
                case 'github_push':
                    isValidAction = true; // Message is optional
                    if (parsedJson.message !== undefined && typeof parsedJson.message !== 'string') {
                        throw new Error(`'message' field for 'github_push' action must be a string if provided.`);
                    }
                    break;
                case 'github_pull':
                    isValidAction = true; // No specific fields required
                    break;
            }

            if (isValidAction) {
                segments.push({
                    type: (action.startsWith('github_') ? 'github-action' : 'file-action'),
                    parsedOp: parsedJson // Pass the whole parsed object
                });
            } else {
                throw new Error(`Missing or invalid required fields for action '${action}'.\nRaw: ${match[1]}`);
            }
        } catch (jsonError) {
            segments.push({
                type: 'file-action-error', // General error for any operation JSON parsing
                errorMessage: `Error parsing AI operation: ${jsonError.message}`,
                rawContent: match[1],
            });
        }
        lastIndex = fileActionRegex.lastIndex;
    }

    if (lastIndex < cleanedResponse.length) {
        segments.push({
            type: 'text',
            content: cleanedResponse.substring(lastIndex),
        });
    }

    for (const segment of segments) {
        if (segment.type === 'text') {
            const textMsgObj = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                sender: 'ai',
                displayContent: renderMarkdown(segment.content),
                contentForAI: segment.content, // Store original for AI context
                type: 'text',
                extraData: null,
                isHtml: true, // Indicates displayContent contains HTML generated by renderMarkdown
                timestamp: new Date().toISOString(),
            };
            currentChatHistory.push(textMsgObj);
            displayMessage(textMsgObj);
        } else if (segment.type === 'file-action') {
            const parsedOp = segment.parsedOp;
            const success = await performFileOperation(parsedOp, false); // AI initiated

            let displayPath = parsedOp.path || parsedOp.new_path || parsedOp.old_path;
            let displayAction = parsedOp.action;

            // Determine the display action text more precisely
            if (parsedOp.action === 'create' || parsedOp.action === 'update') {
                const fileExistsAfterOp = projectFilesData[parsedOp.path] !== undefined && projectFilesData[parsedOp.path] !== DIRECTORY_MARKER;
                // This logic is tricky if the 'action' field in the AI's JSON is 'create' but it caused an 'update'
                // The handleCreateUpdateFile already determines the finalAction.
                // Let's rely on the AI's stated intention, unless it was truly an overwrite.
                displayAction = parsedOp.action + 'd'; // created, updated
            } else if (parsedOp.action === 'delete') {
                displayAction = 'deleted';
            } else if (parsedOp.action === 'mkdir') {
                displayAction = 'created directory';
            } else if (parsedOp.action === 'rmdir') {
                displayAction = 'deleted directory';
            } else if (parsedOp.action === 'mvfile') {
                displayAction = `renamed/moved file from ${parsedOp.old_path} to`;
                displayPath = parsedOp.new_path;
            } else if (parsedOp.action === 'mvdir') {
                displayAction = `renamed/moved directory from ${parsedOp.old_path} to`;
                displayPath = parsedOp.new_path;
            }

            const fileActionMsgObj = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                sender: 'ai',
                displayContent: '', // No direct text content for display for file ops
                contentForAI: `AI performed action "${parsedOp.action}" on "${displayPath}".`,
                type: 'ai-file-op',
                extraData: {
                    action: displayAction, // Use calculated display action
                    filename: displayPath, // Use calculated display path
                    size: parsedOp.content ? getSizeString(parsedOp.content) : null, // Only for file content
                    success: success, // Indicate if operation was successful
                    old_path: parsedOp.old_path, // For mvfile/mvdir display
                    new_path: parsedOp.new_path // For mvfile/mvdir display
                },
                isHtml: false,
                timestamp: new Date().toISOString(),
            };
            currentChatHistory.push(fileActionMsgObj);
            displayMessage(fileActionMsgObj);
        } else if (segment.type === 'github-action') {
            const parsedOp = segment.parsedOp;
            const success = await performFileOperation(parsedOp, false); // AI initiated, but this is a GitHub op
            const { owner, repo, branch } = parseGithubRepoUrl(localStorage.getItem(GITHUB_REPO_URL_KEY));

            const githubOpMsgObj = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                sender: 'ai',
                displayContent: '',
                contentForAI: `AI requested GitHub ${parsedOp.action}.`,
                type: 'github-op-display',
                extraData: {
                    action: (parsedOp.action === 'github_push' ? 'Pushed' : 'Pulled'),
                    repo: repo,
                    branch: branch,
                    message: parsedOp.message || null, // For push
                    success: success,
                    changesCount: success ? (parsedOp.action === 'github_pull' ? window._lastPullChangesCount : null) : null // Track changes for pull
                },
                isHtml: false,
                timestamp: new Date().toISOString(),
            };
            currentChatHistory.push(githubOpMsgObj);
            displayMessage(githubOpMsgObj);
            window._lastPullChangesCount = 0; // Reset after use

        }
        else if (segment.type === 'file-action-error') { // This type now handles general AI operation JSON errors
            const errorMsgObj = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                sender: 'ai',
                displayContent: `AI attempted an operation but the JSON was invalid or corrupted:\n\n**Error:** ${escapeHtml(segment.errorMessage)}\n\n**Raw Output:**\n\`\`\`\n${escapeHtml(segment.rawContent)}\n\`\`\``,
                contentForAI: `AI generated invalid operation JSON: ${segment.errorMessage}. Raw: ${segment.rawContent}`,
                type: 'ai-file-op-error', // Reusing this type, implies a JSON parsing error
                extraData: {
                    filename: 'JSON Error',
                    action: 'Failed',
                },
                isHtml: true,
                timestamp: new Date().toISOString(),
            };
            currentChatHistory.push(errorMsgObj);
            displayMessage(errorMsgObj);
            showStatus('AI generated invalid operation JSON.', 'error', 5000);
        }
    }
    // Trigger speech for the AI's response if an audio segment was found
    if (speechContentToPlay) {
        speakText(speechContentToPlay, 'user_response'); // Mark as user_response type
    }
}


function buildFileTree(filesData) {
    const root = { name: '', type: 'folder', children: [], path: '' };
    const folders = new Set(); // To keep track of all implied and explicit folders

    // First, process all files and implied directories
    Object.keys(filesData).sort().forEach(fullPath => {
        if (fullPath === CONVERSATION_FILENAME || filesData[fullPath] === DIRECTORY_MARKER) {
            return;
        }
        const parts = fullPath.split('/');
        let currentNode = root;
        let currentPathAccumulator = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            currentPathAccumulator += (i > 0 ? '/' : '') + part;

            if (i === parts.length - 1) { // It's a file
                currentNode.children.push({
                    name: part,
                    type: 'file',
                    path: fullPath
                });
            } else { // It's a directory part
                let folderPath = currentPathAccumulator + '/'; // Ensure folder path ends with slash
                folders.add(folderPath); // Mark this path as an existing folder

                let folderNode = currentNode.children.find(
                    child => child.name === part && child.type === 'folder'
                );

                if (!folderNode) {
                    folderNode = { name: part, type: 'folder', children: [], path: folderPath };
                    currentNode.children.push(folderNode);
                }
                currentNode = folderNode;
            }
        }
    });

    // Now, add explicitly created empty directories (DIRECTORY_MARKER)
    Object.keys(filesData).forEach(fullPath => {
        if (filesData[fullPath] === DIRECTORY_MARKER) {
            const dirPath = fullPath; // This path already ends with '/'
            if (!folders.has(dirPath)) { // Add only if not already implied by existing files
                const parts = dirPath.split('/').filter(p => p); // Remove trailing empty string from split
                if (parts.length === 0) return; // Root directory case, ignore

                let currentNode = root;
                let currentPathAccumulator = '';

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    currentPathAccumulator += (i > 0 ? '/' : '') + part;
                    let folderPath = currentPathAccumulator + '/';

                    let folderNode = currentNode.children.find(
                        child => child.name === part && child.type === 'folder'
                    );

                    if (!folderNode) {
                        folderNode = { name: part, type: 'folder', children: [], path: folderPath };
                        currentNode.children.push(folderNode);
                    }
                    currentNode = folderNode;
                }
            }
        }
    });

    // Recursive sort function
    function sortChildren(node) {
        if (!node.children) {
            return;
        }
        node.children.forEach(sortChildren);
        node.children.sort((a, b) => {
            // Folders first, then files
            if (a.type === 'folder' && b.type === 'file') {
                return -1;
            }
            if (a.type === 'file' && b.type === 'folder') {
                return 1;
            }
            // Then alphabetical by name
            return a.name.localeCompare(b.name);
        });
    }

    sortChildren(root);
    return root.children;
}

function renderTreeNodes(nodes, parentUl) {
    nodes.forEach(node => {
        const li = document.createElement('li');

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('content-wrapper');

        const nameSpan = document.createElement('span');
        nameSpan.textContent = node.name;

        if (node.type === 'folder') {
            li.classList.add('folder-item');

            const toggleIcon = document.createElement('i');
            toggleIcon.classList.add('fas', 'toggle-icon');

            const folderIcon = document.createElement('i');
            folderIcon.classList.add('fas', 'fa-folder', 'folder-icon');

            contentWrapper.appendChild(toggleIcon);
            contentWrapper.appendChild(folderIcon);
            nameSpan.classList.add('folder-name');
            contentWrapper.appendChild(nameSpan);

            const nestedUl = document.createElement('ul');
            nestedUl.classList.add('nested-file-list');

            if (expandedFolders.has(node.path)) {
                li.classList.add('open');
                toggleIcon.classList.add('fa-caret-down');
                toggleIcon.classList.remove('fa-caret-right');
                nestedUl.style.display = 'block';
            } else {
                toggleIcon.classList.add('fa-caret-right');
                toggleIcon.classList.remove('fa-caret-down');
                nestedUl.style.display = 'none';
            }

            li.addEventListener('click', e => {
                e.stopPropagation();
                li.classList.toggle('open');
                if (li.classList.contains('open')) {
                    toggleIcon.classList.remove('fa-caret-right');
                    toggleIcon.classList.add('fa-caret-down');
                    nestedUl.style.display = 'block';
                    expandedFolders.add(node.path);
                } else {
                    toggleIcon.classList.remove('fa-caret-down');
                    toggleIcon.classList.add('fa-caret-right');
                    nestedUl.style.display = 'none';
                    expandedFolders.delete(node.path);
                }
            });

            li.appendChild(contentWrapper);

            if (node.children && node.children.length > 0) {
                renderTreeNodes(node.children, nestedUl);
            } else {
                const emptyMsg = document.createElement('li');
                const emptyMsgContent = document.createElement('div');
                emptyMsgContent.classList.add('content-wrapper');
                const emptyText = document.createElement('span');
                emptyText.textContent = 'Empty folder';
                emptyMsgContent.appendChild(emptyText);
                emptyMsg.appendChild(emptyMsgContent);

                emptyMsg.style.color = 'var(--text-secondary)';
                emptyMsg.style.fontStyle = 'italic';
                nestedUl.appendChild(emptyMsg);
            }
            li.appendChild(nestedUl);

        } else {
            li.classList.add('file-item');

            const fileTypeIcon = document.createElement('i');
            fileTypeIcon.classList.add('file-type-icon');
            fileTypeIcon.className += ' ' + getFileIconClass(node.name);

            const iconPlaceholder = document.createElement('span');
            iconPlaceholder.classList.add('toggle-icon');

            contentWrapper.appendChild(iconPlaceholder);
            contentWrapper.appendChild(fileTypeIcon);
            nameSpan.classList.add('file-name');
            contentWrapper.appendChild(nameSpan);

            li.dataset.filename = node.path;

            li.addEventListener('click', e => {
                e.stopPropagation();
                handleFileReferenceClick(node.path);
            });
            li.appendChild(contentWrapper);
        }
        parentUl.appendChild(li);
    });
}

async function loadProjectFilesForReference() {
    fileListReference.innerHTML = '<li><div class="content-wrapper"><span><i class="fas fa-sync fa-spin"></i> Loading files...</span></div></li>';
    try {
        renderFileReferenceList();
    } catch (error) {
        console.error('Error loading project files for reference:', error);
        fileListReference.innerHTML = '<li><div class="content-wrapper"><span style="color: var(--error-color);">Failed to load files.</span></div></li>';
        showStatus('Failed to load project files: ' + error.message, 'error');
    }
}

function renderFileReferenceList() {
    fileListReference.innerHTML = '';
    const fileTree = buildFileTree(projectFilesData);

    if (fileTree.length === 0) {
        fileListReference.innerHTML = '<li><div class="content-wrapper"><span style="color: var(--text-secondary); font-style: italic;">No files in project.</span></div></li>';
        return;
    }
    renderTreeNodes(fileTree, fileListReference);
}

function handleFileReferenceClick(filename) {
    const fileContent = projectFilesData[filename];
    if (fileContent !== undefined && fileContent !== DIRECTORY_MARKER) {
        const currentMessage = messageInput.value.trim();
        let newPrompt = currentMessage;
        // Add x@filename if it's not already there, or ensure it's added properly
        if (!newPrompt.includes(`x@${filename}`)) {
            newPrompt = `x@${filename} ` + newPrompt;
        }
        messageInput.value = newPrompt.trim();
        messageInput.focus();
        showStatus(`File "${filename}" referenced in input.`, 'info', 2000);
    } else {
        showStatus('Could not find content for file or it is a directory: ' + filename, 'error');
    }
    closeDrawer('file');
}

function toggleDrawer(drawerType) {
    if (drawerType === 'file') {
        fileReferenceDrawer.classList.toggle('open');
        settingsDrawer.classList.remove('open');
    } else if (drawerType === 'settings') {
        settingsDrawer.classList.toggle('open');
        fileReferenceDrawer.classList.remove('open');
        if (settingsDrawer.classList.contains('open')) {
            loadSettings();
        }
    }
    settingsOverlay.classList.toggle('visible', fileReferenceDrawer.classList.contains('open') || settingsDrawer.classList.contains('open'));

    if (fileReferenceDrawer.classList.contains('open')) {
        loadProjectFilesForReference();
    }
}

function closeDrawer(drawerType) {
    if (drawerType === 'file' || drawerType === 'all') {
        fileReferenceDrawer.classList.remove('open');
    }
    if (drawerType === 'settings' || drawerType === 'all') {
        settingsDrawer.classList.remove('open');
    }
    settingsOverlay.classList.remove('visible');
}

function toggleFileOperations() {
    fileOperationsEnabled = !fileOperationsEnabled;
    localStorage.setItem(FILE_OPS_ENABLED_KEY, fileOperationsEnabled);
    updateFileOpsButton();
    showStatus(`AI file operations ${fileOperationsEnabled ? 'enabled' : 'disabled'}.`, 'info', 2000);
}

function updateFileOpsButton() {
    if (fileOperationsEnabled) {
        toggleFileOpsButton.innerHTML = '<i class="fas fa-toggle-on"></i>';
        toggleFileOpsButton.style.color = 'var(--info-color)';
    } else {
        toggleFileOpsButton.innerHTML = '<i class="fas fa-toggle-off"></i>';
        toggleFileOpsButton.style.color = 'var(--text-secondary)';
    }
}

function loadSettings() {
    currentAIModel = localStorage.getItem(AI_MODEL_STORAGE_KEY) || 'gemini';
    aiModelSelect.value = currentAIModel;
    updateApiSettingsVisibility();

    geminiApiKeyInput.value = localStorage.getItem(GEMINI_API_KEY_STORAGE) || defaultGeminiApiKey;
    geminiEndpointInput.value = localStorage.getItem(GEMINI_API_ENDPOINT_KEY) || defaultGeminiEndpoint;
    grokApiKeyInput.value = localStorage.getItem(GROK_API_KEY_STORAGE) || '';
    grokEndpointInput.value = localStorage.getItem(GROK_API_ENDPOINT_KEY) || defaultGrokEndpoint;
    deepseekApiKeyInput.value = localStorage.getItem(DEEPSEEK_API_KEY_STORAGE) || '';
    deepseekEndpointInput.value = localStorage.getItem(DEEPSEEK_API_ENDPOINT_KEY) || defaultDeepseekEndpoint;
    claudeApiKeyInput.value = localStorage.getItem(CLAUDE_API_KEY_STORAGE) || '';
    claudeEndpointInput.value = localStorage.getItem(CLAUDE_API_ENDPOINT_KEY) || defaultClaudeEndpoint;
    claudeModelNameInput.value = localStorage.getItem(CLAUDE_MODEL_NAME_KEY) || defaultClaudeModel;
    llamaApiKeyInput.value = localStorage.getItem(LLAMA_API_KEY_STORAGE) || '';
    llamaEndpointInput.value = localStorage.getItem(LLAMA_API_ENDPOINT_KEY) || defaultLlamaEndpoint;
    llamaModelNameInput.value = localStorage.getItem(LLAMA_MODEL_NAME_KEY) || defaultLlamaModel;
    mistralApiKeyInput.value = localStorage.getItem(MISTRAL_API_KEY_STORAGE) || '';
    mistralEndpointInput.value = localStorage.getItem(MISTRAL_API_ENDPOINT_KEY) || defaultMistralEndpoint;
    mistralModelNameInput.value = localStorage.getItem(MISTRAL_MODEL_NAME_KEY) || defaultMistralModel;

    githubRepoUrlInput.value = localStorage.getItem(GITHUB_REPO_URL_KEY) || '';
    githubBranchInput.value = localStorage.getItem(GITHUB_BRANCH_KEY) || 'main';
    githubPatInput.value = localStorage.getItem(GITHUB_PAT_KEY) || '';

    markdownInstructionInput.value = localStorage.getItem(CUSTOM_MARKDOWN_INSTRUCTION_KEY) || '';
}

function updateApiSettingsVisibility() {
    geminiSettings.style.display = 'none';
    grokSettings.style.display = 'none';
    deepseekSettings.style.display = 'none';
    claudeSettings.style.display = 'none';
    llamaSettings.style.display = 'none';
    mistralSettings.style.display = 'none';

    if (aiModelSelect.value === 'gemini') {
        geminiSettings.style.display = 'block';
    } else if (aiModelSelect.value === 'grok') {
        grokSettings.style.display = 'block';
    } else if (aiModelSelect.value === 'deepseek') {
        deepseekSettings.style.display = 'block';
    } else if (aiModelSelect.value === 'claude') {
        claudeSettings.style.display = 'block';
    } else if (aiModelSelect.value === 'llama') {
        llamaSettings.style.display = 'block';
    } else if (aiModelSelect.value === 'mistral') {
        mistralSettings.style.display = 'block';
    }
}

function saveSettings() {
    currentAIModel = aiModelSelect.value;
    localStorage.setItem(AI_MODEL_STORAGE_KEY, currentAIModel);

    localStorage.setItem(GEMINI_API_KEY_STORAGE, geminiApiKeyInput.value.trim());
    localStorage.setItem(GEMINI_API_ENDPOINT_KEY, geminiEndpointInput.value.trim());
    localStorage.setItem(GROK_API_KEY_STORAGE, grokApiKeyInput.value.trim());
    localStorage.setItem(GROK_API_ENDPOINT_KEY, grokEndpointInput.value.trim());
    localStorage.setItem(DEEPSEEK_API_KEY_STORAGE, deepseekApiKeyInput.value.trim());
    localStorage.setItem(DEEPSEEK_API_ENDPOINT_KEY, deepseekEndpointInput.value.trim());
    localStorage.setItem(CLAUDE_API_KEY_STORAGE, claudeApiKeyInput.value.trim());
    localStorage.setItem(CLAUDE_API_ENDPOINT_KEY, claudeEndpointInput.value.trim());
    localStorage.setItem(CLAUDE_MODEL_NAME_KEY, claudeModelNameInput.value.trim());
    localStorage.setItem(LLAMA_API_KEY_STORAGE, llamaApiKeyInput.value.trim());
    localStorage.setItem(LLAMA_API_ENDPOINT_KEY, llamaEndpointInput.value.trim());
    localStorage.setItem(LLAMA_MODEL_NAME_KEY, llamaModelNameInput.value.trim());
    localStorage.setItem(MISTRAL_API_KEY_STORAGE, mistralApiKeyInput.value.trim());
    localStorage.setItem(MISTRAL_API_ENDPOINT_KEY, mistralEndpointInput.value.trim());
    localStorage.setItem(MISTRAL_MODEL_NAME_KEY, mistralModelNameInput.value.trim());

    localStorage.setItem(GITHUB_REPO_URL_KEY, githubRepoUrlInput.value.trim());
    localStorage.setItem(GITHUB_BRANCH_KEY, githubBranchInput.value.trim());
    localStorage.setItem(GITHUB_PAT_KEY, githubPatInput.value.trim());

    localStorage.setItem(CUSTOM_MARKDOWN_INSTRUCTION_KEY, markdownInstructionInput.value.trim());

    updateActiveApiConfig();

    showStatus('Settings saved successfully.', 'success', 2000);
    closeDrawer('settings');
}

function updateActiveApiConfig() {
    currentAIModel = localStorage.getItem(AI_MODEL_STORAGE_KEY) || 'gemini';
    switch (currentAIModel) {
        case 'gemini':
            currentApiKey = localStorage.getItem(GEMINI_API_KEY_STORAGE) || defaultGeminiApiKey;
            currentApiEndpoint = localStorage.getItem(GEMINI_API_ENDPOINT_KEY) || defaultGeminiEndpoint;
            currentApiModelName = ''; // Not typically used for Gemini direct API calls this way
            break;
        case 'grok':
            currentApiKey = localStorage.getItem(GROK_API_KEY_STORAGE) || '';
            currentApiEndpoint = localStorage.getItem(GROK_API_ENDPOINT_KEY) || defaultGrokEndpoint;
            currentApiModelName = 'grok-1'; // Example model name
            break;
        case 'deepseek':
            currentApiKey = localStorage.getItem(DEEPSEEK_API_KEY_STORAGE) || '';
            currentApiEndpoint = localStorage.getItem(DEEPSEEK_API_ENDPOINT_KEY) || defaultDeepseekEndpoint;
            currentApiModelName = 'deepseek-coder'; // Example model name
            break;
        case 'claude':
            currentApiKey = localStorage.getItem(CLAUDE_API_KEY_STORAGE) || '';
            currentApiEndpoint = localStorage.getItem(CLAUDE_API_ENDPOINT_KEY) || defaultClaudeEndpoint;
            currentApiModelName = localStorage.getItem(CLAUDE_MODEL_NAME_KEY) || defaultClaudeModel;
            break;
        case 'llama':
            currentApiKey = localStorage.getItem(LLAMA_API_KEY_STORAGE) || '';
            currentApiEndpoint = localStorage.getItem(LLAMA_API_ENDPOINT_KEY) || defaultLlamaEndpoint;
            currentApiModelName = localStorage.getItem(LLAMA_MODEL_NAME_KEY) || defaultLlamaModel;
            break;
        case 'mistral':
            currentApiKey = localStorage.getItem(MISTRAL_API_KEY_STORAGE) || '';
            currentApiEndpoint = localStorage.getItem(MISTRAL_API_ENDPOINT_KEY) || defaultMistralEndpoint;
            currentApiModelName = localStorage.getItem(MISTRAL_MODEL_NAME_KEY) || defaultMistralModel;
            break;
        default:
            currentApiKey = defaultGeminiApiKey;
            currentApiEndpoint = defaultGeminiEndpoint;
            currentAIModel = 'gemini';
            currentApiModelName = '';
    }
}

// --- GitHub Integration Functions (using Fetch API) ---

// Helper function to get standardized GitHub API headers
function getGitHubAuthHeaders() {
    const pat = localStorage.getItem(GITHUB_PAT_KEY);
    if (!pat) {
        throw new Error("GitHub Personal Access Token is missing. Please configure it in settings.");
    }
    return {
        'Accept': 'application/vnd.github.v3+json', // Recommended GitHub API header
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json'
    };
}

function parseGithubRepoUrl(url) {
    try {
        const urlObj = new URL(url);
        const parts = urlObj.pathname.split('/').filter(p => p);
        if (urlObj.hostname === 'github.com' && parts.length >= 2) {
            return { owner: parts[0], repo: parts[1] };
        }
    } catch (e) { /* Invalid URL */ }
    return { owner: null, repo: null };
}

// Helper to convert UTF-8 string to Base64 (safe for btoa)
function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}

// Helper to convert Base64 to UTF-8 string
function base64ToUtf8(str) {
    return decodeURIComponent(escape(atob(str)));
}

async function pushChangesToGitHub(commitMessage = `Gen1 AI Assist: Manual push on ${new Date().toLocaleString()}`) {
    const repoUrl = localStorage.getItem(GITHUB_REPO_URL_KEY);
    const branch = localStorage.getItem(GITHUB_BRANCH_KEY);

    if (!repoUrl || !branch) {
        showStatus('GitHub settings are incomplete. Please configure repository URL and branch.', 'error', 5000);
        return false;
    }

    const { owner, repo } = parseGithubRepoUrl(repoUrl);
    if (!owner || !repo) {
        showStatus('Invalid GitHub Repository URL. Please use format like https://github.com/username/repo', 'error', 5000);
        return false;
    }

    showStatus('Pushing changes to GitHub...', 'info', 0);

    try {
        const headers = getGitHubAuthHeaders();

        // 1. Get the latest commit SHA on the target branch
        const refResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
        if (!refResponse.ok) {
            const errorBody = await refResponse.text();
            throw new Error(`Failed to get ref (${refResponse.status} ${refResponse.statusText}): ${errorBody}`);
        }
        const refData = await refResponse.json();
        const latestCommitSha = refData.object.sha;

        // 2. Get the tree SHA associated with the latest commit
        const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
        if (!commitResponse.ok) {
            const errorBody = await commitResponse.text();
            throw new Error(`Failed to get commit (${commitResponse.status} ${commitResponse.statusText}): ${errorBody}`);
        }
        const commitData = await commitResponse.json();
        const baseTreeSha = commitData.tree.sha;

        // 3. Prepare new tree entries by creating blobs for changed/new files
        const treeEntries = [];
        for (const filePath in projectFilesData) {
            if (filePath === CONVERSATION_FILENAME) continue;
            if (projectFilesData[filePath] === DIRECTORY_MARKER) continue; // Skip explicit directory markers for pushing

            const fileContent = projectFilesData[filePath];
            const contentBase64 = utf8ToBase64(fileContent);

            const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    content: contentBase64,
                    encoding: 'base64'
                })
            });
            if (!blobResponse.ok) {
                const errorBody = await blobResponse.text();
                throw new Error(`Failed to create blob for ${filePath} (${blobResponse.status} ${blobResponse.statusText}): ${errorBody}`);
            }
            const blobData = await blobResponse.json();
            const blobSha = blobData.sha;

            treeEntries.push({
                path: filePath,
                mode: '100644', // File mode for normal file (regular file)
                type: 'blob',
                sha: blobSha
            });
        }

        // 4. Create a new tree
        const newTreeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: baseTreeSha,
                tree: treeEntries
            })
        });
        if (!newTreeResponse.ok) {
            const errorBody = await newTreeResponse.text();
            throw new Error(`Failed to create new tree (${newTreeResponse.status} ${newTreeResponse.statusText}): ${errorBody}`);
        }
        const newTreeData = await newTreeResponse.json();
        const newTreeSha = newTreeData.sha;

        // 5. Create a new commit
        const newCommitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: commitMessage,
                tree: newTreeSha,
                parents: [latestCommitSha]
            })
        });
        if (!newCommitResponse.ok) {
            const errorBody = await newCommitResponse.text();
            throw new Error(`Failed to create new commit (${newCommitResponse.status} ${newCommitResponse.statusText}): ${errorBody}`);
        }
        const newCommitData = await newCommitResponse.json();
        const newCommitSha = newCommitData.sha;

        // 6. Update the branch reference
        const updateRefResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                sha: newCommitSha,
                force: false // Set to true to force push, but use with extreme caution!
            })
        });
        if (!updateRefResponse.ok) {
            const errorBody = await updateRefResponse.text();
            throw new Error(`Failed to update branch reference (${updateRefResponse.status} ${updateRefResponse.statusText}): ${errorBody}`);
        }

        showStatus('Changes pushed to GitHub successfully!', 'success', 3000);
        return true;

    } catch (error) {
        console.error('GitHub Push Error:', error);
        let errorMessage = error.message;
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
            errorMessage = 'Authentication failed. Check your Personal Access Token and permissions.';
        } else if (errorMessage.includes("non-fast-forward")) { // Specific error for Git conflicts
             errorMessage = 'Push rejected: Remote branch has new commits. Please pull changes first to avoid overwriting.';
        }
        showStatus(`GitHub Push Failed: ${errorMessage}`, 'error', 8000);
        return false;
    }
}

let _lastPullChangesCount = 0; // Global to pass changes count to display message

async function pullChangesFromGitHub() {
    const repoUrl = localStorage.getItem(GITHUB_REPO_URL_KEY);
    const branch = localStorage.getItem(GITHUB_BRANCH_KEY);

    if (!repoUrl || !branch) {
        showStatus('GitHub settings are incomplete. Please configure repository URL and branch.', 'error', 5000);
        return false;
    }

    const { owner, repo } = parseGithubRepoUrl(repoUrl);
    if (!owner || !repo) {
        showStatus('Invalid GitHub Repository URL. Please use format like https://github.com/username/repo', 'error', 5000);
        return false;
    }

    showStatus('Pulling changes from GitHub...', 'info', 0);
    _lastPullChangesCount = 0; // Reset counter for this pull operation

    try {
        const headers = getGitHubAuthHeaders();

        // 1. Get the latest commit SHA from the branch
        const refResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
        if (!refResponse.ok) {
            const errorBody = await refResponse.text();
            throw new Error(`Failed to get ref (${refResponse.status} ${refResponse.statusText}): ${errorBody}`);
        }
        const refData = await refResponse.json();
        const latestCommitSha = refData.object.sha;

        const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
        if (!commitResponse.ok) {
            const errorBody = await commitResponse.text();
            throw new Error(`Failed to get commit (${commitResponse.status} ${commitResponse.statusText}): ${errorBody}`);
        }
        const commitData = await commitResponse.json();
        const latestTreeSha = commitData.tree.sha;

        // 2. Get the full tree (recursive)
        const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${latestTreeSha}?recursive=1`, { headers });
        if (!treeResponse.ok) {
            const errorBody = await treeResponse.text();
            throw new Error(`Failed to get tree (${treeResponse.status} ${treeResponse.statusText}): ${errorBody}`);
        }
        const treeData = await treeResponse.json();

        // Preserve local conversation history and prepare new project files data
        const newProjectFilesData = { [CONVERSATION_FILENAME]: projectFilesData[CONVERSATION_FILENAME] };
        const remotePaths = new Set(); // To track all paths (files and explicit directories) that exist remotely

        // Process files and explicit directories from GitHub tree
        for (const item of treeData.tree) {
            // Add file path (e.g., 'src/index.js')
            remotePaths.add(item.path);
            if (item.type === 'tree') {
                // Also add directory path with trailing slash (e.g., 'src/') for later comparison
                // GitHub tree API typically provides directory paths without trailing slashes, so add it here.
                remotePaths.add(item.path + '/');
            }

            if (item.path === CONVERSATION_FILENAME) continue;

            if (item.type === 'blob') { // It's a file
                // Fetch blob content
                const blobResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${item.sha}`, { headers });
                if (!blobResponse.ok) {
                    const errorBody = await blobResponse.text();
                    throw new Error(`Failed to get blob content for ${item.path} (${blobResponse.status} ${blobResponse.statusText}): ${errorBody}`);
                }
                const blobData = await blobResponse.json();
                const content = blobData.encoding === 'base64' ? base64ToUtf8(blobData.content) : blobData.content;

                if (projectFilesData[item.path] !== content) {
                    newProjectFilesData[item.path] = content;
                    _lastPullChangesCount++;
                } else {
                    newProjectFilesData[item.path] = projectFilesData[item.path]; // Keep existing reference if content identical
                }

            } else if (item.type === 'tree') { // It's a directory
                const dirPath = item.path.endsWith('/') ? item.path : item.path + '/';
                // Add explicit directory marker only if it's truly an empty directory
                // (i.e., no files exist under this exact path in the *remote* tree)
                // We're checking if any 'blob' items start with this dirPath.
                const isDirEmptyInRemote = !treeData.tree.some(p => p.path.startsWith(dirPath) && p.path !== item.path && p.type === 'blob');

                if (isDirEmptyInRemote && newProjectFilesData[dirPath] === undefined) {
                    newProjectFilesData[dirPath] = DIRECTORY_MARKER;
                    // Count as a change if we're adding this marker and it wasn't there before
                    if (projectFilesData[dirPath] !== DIRECTORY_MARKER) {
                        _lastPullChangesCount++;
                    }
                } else if (newProjectFilesData[dirPath] === undefined && !isDirEmptyInRemote) {
                    // If directory is not empty in remote but no marker exists locally, it's implicitly defined.
                    // Do nothing here, as files inside it will define it.
                }
            }
        }

        // Identify files/directories that exist locally but not on GitHub (for deletion)
        for (const localPath in projectFilesData) {
            if (localPath === CONVERSATION_FILENAME) continue; // Always preserve local conversation history

            // Check if the local path is present in the set of remote paths (both files and explicit dirs).
            // This covers files and explicitly marked empty directories.
            if (!remotePaths.has(localPath)) {
                // If the localPath doesn't exist remotely (or is an implied folder that's now empty remotely)
                // and it's not explicitly marked as a directory in newProjectFilesData
                if (newProjectFilesData[localPath] !== undefined) { // Only delete if it was in the new (pre-filter) projectFilesData
                     delete newProjectFilesData[localPath];
                     _lastPullChangesCount++;
                }
            }
        }

        // Final cleanup for DIRECTORY_MARKERs: remove if a file now exists in that directory after pull
        // (This handles cases where a remote directory implicitly got files, making the local marker redundant)
        Object.keys(newProjectFilesData).forEach(p => {
            if (newProjectFilesData[p] === DIRECTORY_MARKER) {
                const dirPath = p; // This path ends with '/'
                // Check if any actual files now exist under this directory path
                const hasActualFiles = Object.keys(newProjectFilesData).some(file =>
                    file.startsWith(dirPath) && file !== dirPath && newProjectFilesData[file] !== DIRECTORY_MARKER
                );
                if (hasActualFiles) {
                    // Only count as a change if the marker was actually there and we are removing it.
                    if (projectFilesData[dirPath] === DIRECTORY_MARKER) {
                        _lastPullChangesCount++;
                    }
                    delete newProjectFilesData[dirPath];
                }
            }
        });


        projectFilesData = newProjectFilesData;
        await putItemInStore(FILES_STORE_NAME, {
            projectId: currentProjectId,
            files: projectFilesData
        });

        showStatus(`Pull complete! ${_lastPullChangesCount} file(s)/directory(s) updated/deleted.`, 'success', 3000);
        if (fileReferenceDrawer.classList.contains('open')) {
            loadProjectFilesForReference();
        }
        await loadChatHistory();
        return true;

    } catch (error) {
        console.error('GitHub Pull Error:', error);
        let errorMessage = error.message;
        if (errorMessage.includes('401') || errorMessage.includes('403')) {
            errorMessage = 'Authentication failed. Check your Personal Access Token and permissions.';
        }
        showStatus(`GitHub Pull Failed: ${errorMessage}`, 'error', 8000);
        return false;
    }
}
// --- End GitHub Integration Functions ---


// --- Image Attachment Logic ---
attachImageButton.addEventListener('click', () => {
    imageUploadInput.click();
});

imageUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            showStatus('Please select an image file.', 'error', 3000);
            clearAttachedImage();
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            attachedImageData = {
                base64: reader.result.split(',')[1],
                mimeType: file.type,
                filename: file.name,
                size: getSizeString(reader.result)
            };
            imagePreview.src = reader.result;
            previewFileName.textContent = file.name;
            previewFileSize.textContent = attachedImageData.size;
            attachedImagePreview.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        clearAttachedImage();
    }
});

clearAttachedFileButton.addEventListener('click', clearAttachedImage);

function clearAttachedImage() {
    attachedImageData = null;
    imageUploadInput.value = '';
    attachedImagePreview.style.display = 'none';
    imagePreview.src = '#';
    previewFileName.textContent = '';
    previewFileSize.textContent = '';
}
// --- End Image Attachment Logic ---


// --- Speech-to-Text (STT) and Text-to-Speech (TTS) Logic ---
function initializeSpeechRecognition() {
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; // Set to false to capture one utterance at a time
        recognition.interimResults = false; // Only get final results for better control
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('Speech recognition started.');
            isListening = true;
            if (audioChatModeActive) {
                audioStatusText.textContent = "Listening...";
                audioVisualizer.classList.add('listening');
                audioVisualizer.classList.remove('speaking', 'processing');
                // Clear input visually at the start of a new listening phase in audio mode
                messageInput.value = '';
            }
            messageInput.focus(); // Keep focus on input for visual feedback of typing cursor
        };

        recognition.onresult = (event) => {
            // When continuous is false, onresult usually fires once for the final result
            // For interim results, one would use continuous: true and handle partial results
            // but for this flow, we want the full utterance.
            const finalTranscript = event.results[0][0].transcript;
            lastSpspokenTranscript = finalTranscript; // Store the transcript internally
            console.log('Final transcript captured:', finalTranscript);

            // Do NOT update messageInput directly here, it will be used in onend to call sendMessage
        };

        recognition.onend = () => {
            console.log('Speech recognition ended.');
            isListening = false;

            if (audioChatModeActive) {
                audioVisualizer.classList.remove('listening', 'speaking'); // Clear visualizer state
                audioStatusText.textContent = "Processing your message..."; // Interim state visually
                audioVisualizer.classList.add('processing'); // Show processing animation

                // Automatically send the message using the captured transcript
                // Only send if there was actual speech captured.
                if (lastSpokenTranscript.trim() !== '') {
                    sendMessage(true, lastSpokenTranscript);
                    lastSpokenTranscript = ''; // Reset after sending
                } else {
                    // If onend fired but no speech was recognized (e.g., silence), stay in audio mode
                    // and allow user to try speaking again.
                    audioStatusText.textContent = "No speech detected. Try again.";
                    startListening(); // Re-enable listening immediately
                }
            } else {
                // If not in audio chat mode, this is a one-off STT, just update input and hide status
                hideStatus();
            }
        };

        recognition.onerror = (event) => {
            isListening = false;
            audioVisualizer.classList.remove('listening', 'speaking', 'processing');
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Speech recognition error.';
            if (event.error === 'not-allowed') {
                errorMessage = 'Microphone access denied. Please allow microphone in browser settings.';
                showStatus(errorMessage, 'error', 5000);
                if (audioChatModeActive) {
                    audioStatusText.textContent = "Microphone access denied. Exiting audio mode.";
                    setTimeout(exitAudioMode, 1500); // Exit audio mode after error
                }
            } else if (event.error === 'no-speech') {
                // This case is handled in onend if lastSpokenTranscript is empty
                // It generally means too quiet or no clear speech for a duration.
                // We avoid showing a disruptive status message for this specific error here,
                // as onend will manage it or we re-listen automatically.
                if (audioChatModeActive) {
                     audioStatusText.textContent = "No speech detected. Try again.";
                     startListening(); // Try listening again if in audio mode
                } else {
                    showStatus('No speech detected.', 'info', 1500);
                }
                return; // Don't fall through to generic error handling
            } else if (event.error === 'network') {
                errorMessage = 'Network error during speech recognition.';
                showStatus(errorMessage, 'error', 5000);
                if (audioChatModeActive) {
                    audioStatusText.textContent = "Network error. Exiting audio mode.";
                    setTimeout(exitAudioMode, 1500); // Exit audio mode after error
                }
            } else {
                 showStatus(errorMessage + ': ' + event.error, 'error', 5000);
                 if (audioChatModeActive) {
                    audioStatusText.textContent = "Microphone error. Try again.";
                    startListening(); // Try listening again after other errors
                 }
            }
        };
    } else {
        console.warn('Web Speech API (SpeechRecognition) not supported in this browser.');
        showStatus('Speech-to-Text not supported in your browser.', 'error', 3000);
        if (toggleSpeechButton) {
            toggleSpeechButton.disabled = true;
            toggleSpeechButton.style.opacity = '0.5';
            toggleSpeechButton.style.cursor = 'not-allowed';
        }
    }
}

function speakText(textToSpeak, type = 'user_response') { // 'user_response' for AI's regular speech, 'internal' for "Please wait"
    if (!('speechSynthesis' in window)) {
        console.warn('Text-to-Speech not supported in your browser.');
        if (type === 'user_response') { // Only show status for user-facing speech
            showStatus('Text-to-Speech not supported in your browser.', 'error', 3000);
        }
        return;
    }

    stopSpeech(); // Stop any currently speaking utterance to allow new one

    currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
    currentUtterance.pitch = 1;
    currentUtterance.rate = 1.1;

    currentUtterance.onstart = () => {
        if (audioChatModeActive) {
            audioVisualizer.classList.add('speaking');
            audioVisualizer.classList.remove('listening', 'processing');
            if (type === 'internal') {
                audioStatusText.textContent = "Anesha is thinking..."; // Keep processing text if 'Please wait'
            } else { // user_response
                audioStatusText.textContent = "Anesha is speaking...";
            }
        }
    };

    currentUtterance.onend = () => {
        console.log('AI finished speaking (type: ' + type + ').');
        currentUtterance = null;
        if (audioChatModeActive) {
            audioVisualizer.classList.remove('speaking', 'processing'); // Clear speaking/processing animation

            if (type === 'user_response') { // This is the AI's actual response, so user's turn starts
                audioStatusText.textContent = "Ready to speak...";
                startListening(); // Re-enable microphone for user's turn
            } else { // This was an 'internal' message like "Please wait"
                // Do NOT start listening here. The AI's response is still pending.
                // The status ("Anesha is thinking...") should remain until AI response is received and parsed.
            }
        }
    };

    currentUtterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror (type: ' + type + ')', event);
        if (type === 'user_response') {
            showStatus('Text-to-Speech error.', 'error');
        }
        currentUtterance = null;
        if (audioChatModeActive) {
            audioVisualizer.classList.remove('speaking', 'processing');
            audioStatusText.textContent = "Error speaking."; // Generic error, might need refinement
            if (type === 'user_response') {
                 startListening(); // Fallback: allow user to speak if AI couldn't
            }
        }
    };

    window.speechSynthesis.speak(currentUtterance);
}

function stopSpeech() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) { // Added check for window.speechSynthesis
        window.speechSynthesis.cancel();
    }
    currentUtterance = null;
}

function startListening() {
    if (recognition && !isListening) {
        try {
            recognition.start();
        } catch (e) {
            console.error("Error starting speech recognition:", e);
            // AbortError means it was already listening, so ignore it unless actively trying to stop
            if (e.name === 'AbortError' && isListening) {
                // Already listening, ignore, but set state correctly
                audioStatusText.textContent = "Listening...";
                audioVisualizer.classList.add('listening');
                audioVisualizer.classList.remove('speaking', 'processing');
            } else {
                showStatus('Failed to start microphone. Please check permissions.', 'error', 3000);
                audioStatusText.textContent = "Microphone error. Exiting audio mode.";
                audioVisualizer.classList.remove('listening', 'speaking', 'processing');
                setTimeout(exitAudioMode, 1500); // Exit audio mode after a short delay
            }
        }
    } else if (!recognition) {
        showStatus('Speech-to-Text not supported or initialized.', 'error', 3000);
        exitAudioMode();
    }
}

function stopListening() {
     if (recognition && isListening) {
        recognition.stop();
    }
    isListening = false;
}

function toggleAudioChatMode() {
    audioChatModeActive = !audioChatModeActive;
    if (audioChatModeActive) {
        audioModeOverlay.classList.add('active');
        audioStatusText.textContent = "Initializing microphone...";
        messageInput.value = ''; // Clear input field when entering audio mode
        startListening();
    } else {
        exitAudioMode();
    }
}

function exitAudioMode() {
    audioChatModeActive = false;
    stopSpeech();
    stopListening(); // Ensure microphone is stopped explicitly
    audioModeOverlay.classList.remove('active');
    audioStatusText.textContent = "";
    audioVisualizer.classList.remove('listening', 'speaking', 'processing');
    messageInput.focus();
    hideStatus(); // Clear any ongoing status messages from the main app
}
// --- End STT/TTS Logic ---


backButton.addEventListener('click', () => {
    window.location.href = 'Pe.html';
});
fileMenuButton.addEventListener('click', () => toggleDrawer('file'));
newChatButton.addEventListener('click', startNewConversation);
toggleFileOpsButton.addEventListener('click', toggleFileOperations);
settingsButton.addEventListener('click', () => toggleDrawer('settings'));
settingsOverlay.addEventListener('click', () => closeDrawer('all'));
// Listener for the Send Message Button
sendMessageButton.addEventListener('click', () => {
    sendMessage(); // Call the sendMessage function
});

// Listener for the Message Input field (handles Enter key)
messageInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
aiModelSelect.addEventListener('change', updateApiSettingsVisibility);
saveSettingsButton.addEventListener('click', saveSettings);
closeSettingsButton.addEventListener('click', () => closeDrawer('settings'));

// New GitHub buttons (now call centralized performFileOperation for consistency)
pushToGithubButton.addEventListener('click', () => performFileOperation({ action: 'github_push' }, true)); // User initiated
pullFromGithubButton.addEventListener('click', () => performFileOperation({ action: 'github_pull' }, true)); // User initiated

// New Audio Chat buttons
toggleSpeechButton.addEventListener('click', toggleAudioChatMode);
exitAudioModeButton.addEventListener('click', exitAudioMode);

document.addEventListener('DOMContentLoaded', async () => {
    loadTheme();

    fileOperationsEnabled = localStorage.getItem(FILE_OPS_ENABLED_KEY) !== 'false'; // Default to true if not set
    updateFileOpsButton();

    updateActiveApiConfig();
    initializeSpeechRecognition(); // Initialize STT on page load

    await openGen1DB();

    currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID_LS_KEY);

    if (!currentProjectId) {
        showStatus('No project selected. Returning to editor...', 'error', 4000);
        setTimeout(() => {
            window.location.href = 'Pe.html';
        }, 4000);
        return;
    }

    try {
        const projectMetadata = await getItemFromStore(PROJECTS_STORE_NAME, currentProjectId);
        if (projectMetadata && projectMetadata.name) {
            document.querySelector('.page-title').textContent = 'AI Assist - ' + projectMetadata.name;
        } else {
            document.querySelector('.page-title').textContent = 'AI Assist';
            showStatus('Project metadata not found.', 'error');
        }
    } catch (error) {
        console.error('Error loading project metadata:', error);
        showStatus('Failed to load project metadata: ' + error.message, 'error');
    }

    await loadProjectFilesDataOnly();
    await loadChatHistory();

    if (currentChatHistory.length === 0) {
        const initialMessage = {
            id: 'initial-ai-message',
            sender: 'ai',
            displayContent: renderMarkdown('Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.'),
            contentForAI: 'Hello! How can I help you with your project today? You can ask me to generate code, refactor, or even create new files. I can respond using markdown (e.g., **bold**, *italic*, `inline code`), and I can perform file operations in your project using a special markdown format. Use `x@filename` in your input to reference a file\'s content. For a spoken response, I will include  in my message.',
            type: 'text',
            extraData: null,
            isHtml: true,
            timestamp: new Date().toISOString()
        };
        currentChatHistory.push(initialMessage);
        displayMessage(initialMessage);
        await saveChatHistory();
    }
});
