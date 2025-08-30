const DB_NAME = 'Gen1DB';
        const DB_VERSION = 1;
        const PROJECTS_STORE_NAME = 'projects';
        const FILES_STORE_NAME = 'projectFiles';

        const CURRENT_PROJECT_ID_LS_KEY = 'gen1_current_project_id';
        const THEME_STORAGE_KEY = 'gen1_theme';

        const body = document.body;
        const backButton = document.getElementById('backButton');
        const drawerButton = document.getElementById('drawerButton');
        const runButton = document.getElementById('runButton');
        const projectTitleElement = document.getElementById('projectTitle');
        const editorContainer = document.getElementById('editor-container');
        const fileDrawer = document.getElementById('fileDrawer');
        const fileListDrawer = document.getElementById('fileListDrawer');
        const drawerOverlay = document.getElementById('drawerOverlay');
        const aiButton = document.getElementById('aiButton');
        const formatterButton = document.getElementById('formatterButton');
        const obfuscateButton = document.getElementById('obfuscateButton'); // NEW ELEMENT
        const saveButton = document.getElementById('saveButton');
        const copyCodeButton = document.getElementById('copyCodeButton');
        const howToUseButton = document.getElementById('howToUseButton');
        const statusMessageElement = document.getElementById('statusMessage');
        const themeToggleButton = document.getElementById('themeToggleButton');

        const newFileButton = document.getElementById('newFileButton');
        const newFolderButton = document.getElementById('newFolderButton');
        const uploadFileButton = document.getElementById('uploadFileButton');
        const fileInput = document.getElementById('fileInput');

        const genericModal = document.getElementById('genericModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalInput = document.getElementById('modalInput');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');

        let db;
        let editor;
        let currentProjectId = null;
        let projectFilesData = {};
        let currentOpenFile = null;
        let currentMonacoModel = null;
        let expandedFolders = new Set();
        // let prettierPlugins = []; // REMOVED: No longer needed for Prettier fix

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

        function deleteItemFromStore(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = event => resolve(event.target.result);
                request.onerror = event => reject(event.target.error);
            });
        }

        function loadTheme() {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme === 'dark') {
                body.classList.add('dark-theme');
                themeToggleButton.querySelector('i').className = 'fas fa-sun';
                setMonacoTheme('vs-dark');
            } else {
                body.classList.remove('dark-theme');
                themeToggleButton.querySelector('i').className = 'fas fa-moon';
                setMonacoTheme('vs-light');
            }
        }

        function toggleTheme() {
            if (body.classList.contains('dark-theme')) {
                body.classList.remove('dark-theme');
                localStorage.setItem(THEME_STORAGE_KEY, 'light');
                themeToggleButton.querySelector('i').className = 'fas fa-moon';
                setMonacoTheme('vs-light');
            } else {
                body.classList.add('dark-theme');
                localStorage.setItem(THEME_STORAGE_KEY, 'dark');
                themeToggleButton.querySelector('i').className = 'fas fa-sun';
                setMonacoTheme('vs-dark');
            }
        }

        function setMonacoTheme(theme) {
            if (editor) {
                monaco.editor.setTheme(theme);
            }
        }

        let statusMessageTimeout;
        function showStatus(message, type = 'info', duration = 3000) {
            clearTimeout(statusMessageTimeout);
            statusMessageElement.style.display = 'flex';
            statusMessageElement.className = 'status-message show';
            statusMessageElement.classList.add(type);
            
            let iconClass = 'fas fa-info-circle';
            if (type === 'error') {
                iconClass = 'fas fa-times-circle';
            } else if (type === 'success') {
                iconClass = 'fas fa-check-circle';
            } else if (type === 'warning') {
                iconClass = 'fas fa-exclamation-triangle';
            }

            statusMessageElement.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
            statusMessageTimeout = setTimeout(() => hideStatus(), duration);
        }

        function hideStatus() {
            statusMessageElement.classList.remove('show');
        }

        function getLanguageFromFilename(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch (ext) {
                case 'js':
                case 'jsx':
                    return 'javascript';
                case 'ts':
                case 'tsx':
                    return 'typescript';
                case 'html':
                case 'htm':
                    return 'html';
                case 'css':
                    return 'css';
                case 'json':
                    return 'json';
                case 'md':
                case 'markdown':
                    return 'markdown';
                case 'py':
                    return 'python';
                case 'java':
                    return 'java';
                case 'c':
                    return 'c';
                case 'cpp':
                    return 'cpp';
                case 'go':
                    return 'go';
                case 'xml':
                    return 'xml';
                case 'yaml':
                case 'yml':
                    return 'yaml';
                default:
                    return 'plaintext';
            }
        }

        function getPrettierParserFromFilename(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch (ext) {
                case 'js':
                case 'jsx':
                case 'ts':
                case 'tsx':
                    return 'babel'; // uses @babel/parser, which is included in parser-babel.js
                case 'html':
                case 'htm':
                    return 'html';
                case 'css':
                case 'scss':
                case 'less':
                    return 'css';
                case 'json':
                    return 'json';
                case 'md':
                case 'markdown':
                    return 'markdown';
                case 'yml':
                case 'yaml':
                    return 'yaml';
                case 'graphql':
                    return 'graphql';
                default:
                    return null;
            }
        }

        function getFileIconClass(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            switch (ext) {
                case 'js':
                case 'jsx':
                    return 'fab fa-js';
                case 'ts':
                case 'tsx':
                    return 'fas fa-file-code';
                case 'html':
                case 'htm':
                    return 'fab fa-html5';
                case 'css':
                    return 'fab fa-css3-alt';
                case 'json':
                    return 'fas fa-file-alt';
                case 'md':
                case 'markdown':
                    return 'fab fa-markdown';
                case 'py':
                    return 'fab fa-python';
                case 'java':
                    return 'fab fa-java';
                case 'c':
                case 'cpp':
                    return 'fas fa-file-code';
                case 'go':
                    return 'fab fa-go';
                case 'xml':
                    return 'fas fa-code';
                case 'yaml':
                case 'yml':
                    return 'fas fa-file-alt';
                case 'jpg':
                case 'jpeg':
                case 'png':
                case 'gif':
                case 'svg':
                case 'ico':
                    return 'fas fa-image';
                case 'txt':
                    return 'fas fa-file-alt';
                default:
                    return 'fas fa-file';
            }
        }

        function initializeMonacoEditor() {
            return new Promise(resolve => {
                require(['vs/editor/editor.main'], () => {
                    editor = monaco.editor.create(editorContainer, {
                        value: '',
                        language: 'plaintext',
                        theme: localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'vs-dark' : 'vs-light',
                        automaticLayout: true,
                        fontSize: 14,
                        minimap: { enabled: false },
                        tabSize: 4,
                        insertSpaces: true
                    });

                    editor.onDidChangeModelContent(() => {
                        // Optional: Could trigger an auto-save or dirty state indicator here
                    });
                    resolve();
                });
            });
        }

        function buildFileTree(filesMap) {
            const root = { name: '', type: 'folder', children: [], path: '' };

            Object.keys(filesMap).forEach(fullPath => {
                const parts = fullPath.split('/');
                let currentNode = root;
                let currentPathAccumulator = '';

                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    currentPathAccumulator += (i > 0 ? '/' : '') + part;

                    if (i === parts.length - 1) {
                        if (fullPath.endsWith('/')) {
                            // This part ensures empty folders explicitly saved in projectFilesData (e.g., as 'folderName/': null) are included
                            let folderNode = currentNode.children.find(
                                child => child.name === part && child.type === 'folder'
                            );
                            if (!folderNode) {
                                folderNode = { name: part, type: 'folder', children: [], path: currentPathAccumulator };
                                currentNode.children.push(folderNode);
                            }
                            currentNode = folderNode;
                        } else {
                             currentNode.children.push({
                                name: part,
                                type: 'file',
                                path: fullPath
                            });
                        }
                    } else {
                        let folderNode = currentNode.children.find(
                            child => child.name === part && child.type === 'folder'
                        );

                        if (!folderNode) {
                            folderNode = { name: part, type: 'folder', children: [], path: currentPathAccumulator };
                            currentNode.children.push(folderNode);
                        }
                        currentNode = folderNode;
                    }
                }
            });

            // Post-processing to ensure all paths saved as folders are represented, even if empty,
            // and to remove any interim, truly empty folders if not explicitly saved.
            function cleanupAndAddEmptyFolders(node) {
                if (!node.children) return;

                const newChildren = [];
                const pathsPresentInTree = new Set(); // Keep track of paths already added or processed

                // Add existing children
                node.children.forEach(child => {
                    if (child.type === 'folder') {
                        cleanupAndAddEmptyFolders(child); // Recurse for nested folders
                    }
                    newChildren.push(child);
                    pathsPresentInTree.add(child.path + (child.type === 'folder' ? '/' : ''));
                });

                // Add explicitly stored empty folders that might not have children processed yet
                Object.keys(projectFilesData).forEach(storedPath => {
                    if (storedPath.endsWith('/') && projectFilesData[storedPath] === null) { // It's an empty folder marker
                        const normalizedStoredPath = normalizePath(storedPath.slice(0, -1));
                        if (normalizedStoredPath === node.path || 
                           (node.path === '' && normalizedStoredPath.indexOf('/') === -1 && storedPath.length === normalizedStoredPath.length + 1)) {
                            // This condition checks if the stored empty folder is a direct child of 'node'
                            const folderName = normalizedStoredPath.split('/').pop();
                            if (!pathsPresentInTree.has(storedPath)) { // Avoid duplicates
                                newChildren.push({ name: folderName, type: 'folder', children: [], path: normalizedStoredPath });
                                pathsPresentInTree.add(storedPath);
                            }
                        } else if (storedPath.startsWith(node.path + '/') && storedPath.length > (node.path + '/').length) {
                             // Handle nested empty folders that might still be missing after initial tree build
                             const relativePath = storedPath.substring((node.path ? node.path + '/' : '').length);
                             const firstSegment = relativePath.split('/')[0];
                             const fullSegmentPath = (node.path ? node.path + '/' : '') + firstSegment;
                             if (!pathsPresentInTree.has(fullSegmentPath + '/')) {
                                // If the direct parent folder in the tree doesn't exist for this empty folder, add it
                                if (relativePath.indexOf('/') === relativePath.length - 1) { // It's a direct empty folder
                                     newChildren.push({ name: firstSegment, type: 'folder', children: [], path: fullSegmentPath });
                                     pathsPresentInTree.add(fullSegmentPath + '/');
                                }
                            }
                        }
                    }
                });

                node.children = newChildren;
            }

            cleanupAndAddEmptyFolders(root);

            function sortChildren(node) {
                if (!node.children) {
                    return;
                }
                node.children.forEach(sortChildren);
                node.children.sort((a, b) => {
                    // Sort folders before files
                    if (a.type === 'folder' && b.type === 'file') {
                        return -1;
                    }
                    if (a.type === 'file' && b.type === 'folder') {
                        return 1;
                    }
                    // Then sort alphabetically by name
                    return a.name.localeCompare(b.name);
                });
            }

            sortChildren(root);
            return root.children;
        }

        function renderTreeNodes(nodes, parentUl, depth = 0) {
            if (nodes.length === 0 && depth === 0) {
                fileListDrawer.innerHTML = '<li style="color: var(--text-secondary); padding: 10px 15px;"><div class="content-wrapper"><span>No files in project. Create one!</span></div></li>';
                return;
            }

            nodes.forEach(node => {
                const li = document.createElement('li');
                
                const contentWrapper = document.createElement('div');
                contentWrapper.classList.add('content-wrapper');
                contentWrapper.style.paddingLeft = `${15 + depth * 15}px`;

                const nameSpan = document.createElement('span');
                nameSpan.textContent = node.name;
                
                const itemActions = document.createElement('div');
                itemActions.classList.add('item-actions');

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

                    const renameFolderButton = document.createElement('button');
                    renameFolderButton.classList.add('icon-button');
                    renameFolderButton.innerHTML = '<i class="fas fa-edit"></i>';
                    renameFolderButton.title = 'Rename folder';
                    renameFolderButton.onclick = (e) => { e.stopPropagation(); renameFileEntry(node.path + '/', 'folder'); };
                    itemActions.appendChild(renameFolderButton);

                    const deleteFolderButton = document.createElement('button');
                    deleteFolderButton.classList.add('icon-button');
                    deleteFolderButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteFolderButton.title = 'Delete folder';
                    deleteFolderButton.onclick = (e) => { e.stopPropagation(); deleteFileEntry(node.path + '/', 'folder'); };
                    itemActions.appendChild(deleteFolderButton);

                    contentWrapper.appendChild(itemActions);
                    
                    const nestedUl = document.createElement('ul');
                    nestedUl.classList.add('nested-file-list');

                    const folderFullPath = node.path;
                    // Check if folder is expanded OR if the currently open file is INSIDE this folder
                    if (expandedFolders.has(folderFullPath) || (currentOpenFile && currentOpenFile.startsWith(folderFullPath + '/'))) {
                        li.classList.add('open');
                        toggleIcon.classList.add('fa-caret-down');
                        toggleIcon.classList.remove('fa-caret-right');
                        nestedUl.style.display = 'block';
                        expandedFolders.add(folderFullPath); // Ensure it's in set if opened via file selection
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
                            expandedFolders.add(folderFullPath);
                        } else {
                            toggleIcon.classList.remove('fa-caret-down');
                            toggleIcon.classList.add('fa-caret-right');
                            nestedUl.style.display = 'none';
                            expandedFolders.delete(folderFullPath);
                        }
                    });

                    li.appendChild(contentWrapper);

                    if (node.children && node.children.length > 0) {
                        renderTreeNodes(node.children, nestedUl, depth + 1);
                    } else {
                        const emptyMsg = document.createElement('li');
                        const emptyMsgContent = document.createElement('div');
                        emptyMsgContent.classList.add('content-wrapper');
                        emptyMsgContent.style.paddingLeft = `${15 + (depth + 1) * 15}px`;
                        const emptyText = document.createElement('span');
                        emptyText.textContent = 'Empty';
                        emptyMsgContent.appendChild(emptyText);
                        emptyMsg.appendChild(emptyMsgContent);

                        emptyMsg.style.color = 'var(--text-secondary)';
                        emptyMsg.style.fontStyle = 'italic';
                        emptyMsg.style.cursor = 'default';
                        emptyMsg.style.borderBottom = 'none';
                        emptyMsg.style.padding = '0';
                        emptyMsg.onmouseover = emptyMsg.onmouseout = null;
                        emptyMsg.onclick = null;
                        nestedUl.appendChild(emptyMsg);
                    }
                    li.appendChild(nestedUl);

                } else {
                    li.classList.add('file-item');
                    
                    const fileTypeIcon = document.createElement('i');
                    fileTypeIcon.classList.add('file-type-icon');
                    fileTypeIcon.className += ' ' + getFileIconClass(node.name);

                    const iconPlaceholder = document.createElement('span'); // Invisible placeholder for alignment
                    iconPlaceholder.classList.add('toggle-icon');

                    contentWrapper.appendChild(iconPlaceholder);
                    contentWrapper.appendChild(fileTypeIcon);
                    nameSpan.classList.add('file-name');
                    contentWrapper.appendChild(nameSpan);

                    const renameFileButton = document.createElement('button');
                    renameFileButton.classList.add('icon-button');
                    renameFileButton.innerHTML = '<i class="fas fa-edit"></i>';
                    renameFileButton.title = 'Rename file';
                    renameFileButton.onclick = (e) => { e.stopPropagation(); renameFileEntry(node.path, 'file'); };
                    itemActions.appendChild(renameFileButton);

                    const deleteFileButton = document.createElement('button');
                    deleteFileButton.classList.add('icon-button');
                    deleteFileButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteFileButton.title = 'Delete file';
                    deleteFileButton.onclick = (e) => { e.stopPropagation(); deleteFileEntry(node.path, 'file'); };
                    itemActions.appendChild(deleteFileButton);

                    contentWrapper.appendChild(itemActions);
                    
                    li.dataset.filename = node.path;
                    li.classList.toggle('active', node.path === currentOpenFile);
                    
                    li.addEventListener('click', e => {
                        e.stopPropagation();
                        openFileInEditor(node.path);
                    });
                    li.appendChild(contentWrapper);
                }
                parentUl.appendChild(li);
            });
        }

        async function loadProjectData(projectId) {
            try {
                const projectFiles = await getItemFromStore(FILES_STORE_NAME, projectId);
                if (projectFiles && projectFiles.files) {
                    projectFilesData = projectFiles.files;
                    renderFileListDrawer();
                    const firstFile = Object.keys(projectFilesData).filter(path => !path.endsWith('/'))[0];
                    if (firstFile) {
                        openFileInEditor(firstFile);
                    } else {
                        editor.setValue('');
                        projectTitleElement.textContent = 'No File Open - Gen1 Editor';
                        runButton.style.display = 'none';
                        showStatus('No files found in this project. Create a new one!', 'info');
                    }
                } else {
                    showStatus('Project files not found or empty for this project ID. Starting fresh.', 'info');
                    projectFilesData = {};
                    renderFileListDrawer();
                    editor.setValue('');
                    projectTitleElement.textContent = 'No File Open - Gen1 Editor';
                    runButton.style.display = 'none';
                }
            } catch (error) {
                showStatus('Failed to load project files: ' + error.message, 'error');
            }
        }

        function renderFileListDrawer() {
            fileListDrawer.innerHTML = '';
            const fileTree = buildFileTree(projectFilesData);
            renderTreeNodes(fileTree, fileListDrawer);
        }

        function openFileInEditor(filename) {
            // If already active and it's a file, do nothing. If it's a folder path, alert.
            if (filename.endsWith('/')) {
                showStatus('Cannot open folders in editor.', 'warning');
                return;
            }
            if (currentOpenFile === filename) {
                showStatus('File already open.', 'info', 1500);
                return;
            }

            // Save content of previously open file
            if (currentOpenFile && editor) {
                projectFilesData[currentOpenFile] = editor.getValue();
            }

            currentOpenFile = filename;
            const content = projectFilesData[filename] || '';
            const language = getLanguageFromFilename(filename);

            if (editor) {
                if (currentMonacoModel) {
                    currentMonacoModel.dispose(); // Dispose previous model to free memory
                }
                currentMonacoModel = monaco.editor.createModel(content, language);
                editor.setModel(currentMonacoModel);
            } else {
                showStatus('Editor not ready. Please refresh.', 'error');
                return;
            }

            const fileNameOnly = filename.split('/').pop();
            projectTitleElement.textContent = fileNameOnly + ' - Gen1 Editor';

            const fileExtension = fileNameOnly.split('.').pop().toLowerCase();
            if (fileExtension === 'html' || fileExtension === 'htm') {
                runButton.style.display = 'flex';
            } else {
                runButton.style.display = 'none';
            }

            // Ensure parent folders are expanded when opening a file
            const pathParts = filename.split('/');
            let currentAccumulatedPath = '';
            for (let i = 0; i < pathParts.length - 1; i++) {
                currentAccumulatedPath += (i > 0 ? '/' : '') + pathParts[i];
                if (currentAccumulatedPath) {
                    expandedFolders.add(currentAccumulatedPath);
                }
            }
            
            renderFileListDrawer(); // Re-render to update active state and folder expansions
            closeDrawer();
            showStatus('Opened: ' + fileNameOnly, 'info', 1500);
        }

        async function saveCurrentFile() {
            if (!currentOpenFile || !editor) {
                showStatus('No file open to save.', 'error');
                return;
            }

            showStatus('Saving file...', 'info');
            projectFilesData[currentOpenFile] = editor.getValue();

            try {
                await putItemInStore(FILES_STORE_NAME, {
                    projectId: currentProjectId,
                    files: projectFilesData
                });
                showStatus('File saved successfully!', 'success');
            } catch (error) {
                showStatus('Failed to save file: ' + error.message, 'error');
            }
        }

        async function formatCurrentFile() {
            if (!currentOpenFile || !editor || !window.prettier) {
                showStatus('Formatter not ready or no file open.', 'error');
                return;
            }

            const parser = getPrettierParserFromFilename(currentOpenFile);
            if (!parser) {
                showStatus('No formatter available for this file type.', 'info');
                return;
            }

            showStatus('Formatting code...', 'info');
            const code = editor.getValue();

            try {
                // FIX: Removed the `plugins` array as parsers loaded via CDN are usually self-registered.
                const formattedCode = await prettier.format(code, {
                    parser: parser,
                    tabWidth: 4,
                    useTabs: false,
                    semi: true,
                    singleQuote: true,
                    printWidth: 80,
                    trailingComma: 'es5',
                    arrowParens: 'always'
                });
                editor.setValue(formattedCode);
                showStatus('Code formatted successfully!', 'success');
                saveCurrentFile(); // Auto-save after formatting
            } catch (error) {
                showStatus('Failed to format: ' + error.message, 'error');
            }
        }

        // NEW FUNCTION: Obfuscate JavaScript code
        async function obfuscateCurrentJsFile() {
            if (!currentOpenFile || !editor) {
                showStatus('No file open to obfuscate.', 'error');
                return;
            }

            const filename = currentOpenFile;
            const ext = filename.split('.').pop().toLowerCase();
            // Allow obfuscation for JS and TS files
            if (ext !== 'js' && ext !== 'jsx' && ext !== 'ts' && ext !== 'tsx') {
                showStatus('Obfuscation is only for JavaScript/TypeScript files.', 'warning');
                return;
            }
            
            if (!window.JavaScriptObfuscator) {
                showStatus('JavaScript Obfuscator library not loaded.', 'error');
                return;
            }

            confirmModal('Obfuscate Code?', `Are you sure you want to obfuscate the current file "${filename.split('/').pop()}"? This operation is generally irreversible and makes code difficult to read.`, async (confirmed) => {
                if (!confirmed) {
                    showStatus('Obfuscation cancelled.', 'info');
                    return;
                }

                showStatus('Obfuscating code...', 'info');
                const code = editor.getValue();

                try {
                    // Customize obfuscation options as needed
                    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
                        compact: true,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1,
                        deadCodeInjection: true,
                        deadCodeInjectionThreshold: 1,
                        debugProtection: false,
                        debugProtectionInterval: 0,
                        disableConsoleOutput: true,
                        identifierNamesGenerator: 'hexadecimal', // Makes variable names unreadable
                        log: false,
                        numbersToExpressions: true,
                        renameGlobals: false,
                        selfDefending: true, // Prevents code from being prettified
                        simplifyFactorialExpressions: true,
                        splitStrings: true,
                        splitStringsChunkLength: 10,
                        stringArray: true,
                        stringArrayEncoding: ['base64'], // Encodes strings
                        stringArrayIndexShift: true,
                        stringArrayRotate: true,
                        stringArrayShuffle: true,
                        stringArrayWrappersCount: 5,
                        stringArrayWrappersType: 'variable',
                        stringArrayThreshold: 1,
                        transformObjectKeys: true,
                        unicodeEscapeSequence: false // Can make code slightly larger but harder to reverse
                    });
                    const obfuscatedCode = obfuscationResult.getObfuscatedCode();
                    editor.setValue(obfuscatedCode);
                    await saveCurrentFile(); // Auto-save after obfuscation
                    showStatus('Code obfuscated and saved successfully!', 'success');
                } catch (error) {
                    showStatus('Failed to obfuscate: ' + error.message, 'error');
                }
            });
        }


        function toggleDrawer() {
            fileDrawer.classList.toggle('open');
            drawerOverlay.classList.toggle('visible');
        }

        function closeDrawer() {
            fileDrawer.classList.remove('open');
            drawerOverlay.classList.remove('visible');
        }

        function normalizePath(path) {
            let normalized = path.replace(/\\/g, '/').replace(/^\//, ''); // Replace backslashes, remove leading slash
            const parts = normalized.split('/').filter(p => p !== ''); // Remove empty segments
            return parts.join('/');
        }

        // This function might not be strictly needed with current `createFileEntry` logic,
        // but useful if name collision detection becomes more complex.
        function findUniqueName(basePath, isFolder) {
            const separator = isFolder ? '/' : '.';
            const folderPath = basePath.includes('/') ? basePath.substring(0, basePath.lastIndexOf('/')) : '';
            const baseName = isFolder ? basePath.split('/').pop() : basePath.substring(basePath.lastIndexOf('/') + 1, basePath.lastIndexOf('.'));
            const extension = isFolder ? '' : basePath.substring(basePath.lastIndexOf('.'));

            let counter = 1;
            let newName = baseName;
            let fullPath = (folderPath ? folderPath + '/' : '') + newName + (isFolder ? '/' : extension);

            while (projectFilesData.hasOwnProperty(fullPath)) {
                newName = `${baseName} (${counter})`;
                fullPath = (folderPath ? folderPath + '/' : '') + newName + (isFolder ? '/' : extension);
                counter++;
            }
            return newName + (isFolder ? '' : extension);
        }

        async function createFileEntry(type) {
            // Determine parent path for new file/folder. If a file is open, use its directory. Else, root.
            let parentDir = '';
            if (currentOpenFile) {
                if (currentOpenFile.endsWith('/')) { // If current "open file" is actually a folder, use it
                    parentDir = currentOpenFile;
                } else { // If a file is open, use its parent directory
                    parentDir = currentOpenFile.substring(0, currentOpenFile.lastIndexOf('/') + 1);
                }
            }
            
            const title = type === 'file' ? 'Create New File' : 'Create New Folder';
            const message = type === 'file' ? 'Enter file name (e.g., index.html):' : 'Enter folder name:';
            const placeholder = type === 'file' ? 'new-file.txt' : 'new-folder';
            
            promptModal(title, message, placeholder, async (name) => {
                if (!name) {
                    showStatus('Name cannot be empty.', 'error');
                    return;
                }

                let fullPath = '';
                if (type === 'file') {
                    fullPath = normalizePath(parentDir + name);
                    if (fullPath.endsWith('/')) {
                         showStatus('File name cannot end with a slash.', 'error');
                         return;
                    }
                } else { // type === 'folder'
                    fullPath = normalizePath(parentDir + name);
                    if (!fullPath.endsWith('/')) { // Ensure folder paths end with a slash
                        fullPath += '/';
                    }
                }
                
                if (projectFilesData.hasOwnProperty(fullPath)) {
                    showStatus(`A ${type} with that name already exists.`, 'error');
                    return;
                }

                if (type === 'file') {
                    projectFilesData[fullPath] = ''; // Initialize file content as empty string
                    openFileInEditor(fullPath); // Open the new file
                } else { // type === 'folder'
                    projectFilesData[fullPath] = null; // Mark as an empty folder (value is null)
                    expandedFolders.add(normalizePath(fullPath.slice(0, -1))); // Expand new folder's parent
                    renderFileListDrawer();
                }
                await saveProjectFiles();
                showStatus(`${type === 'file' ? 'File' : 'Folder'} created: ${name}`, 'success');
            });
        }

        async function uploadFiles(files) {
            if (!files || files.length === 0) {
                return;
            }

            showStatus('Uploading files...', 'info');
            let firstUploadedFile = null;

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const content = e.target.result;
                    let fullPath = normalizePath(file.name);
                    
                    if (projectFilesData.hasOwnProperty(fullPath)) {
                        const newName = findUniqueName(file.name, false);
                        showStatus(`File "${file.name}" already exists. Uploaded as "${newName}" instead.`, 'warning', 3000);
                        fullPath = normalizePath(newName);
                    }
                    projectFilesData[fullPath] = content;

                    if (!firstUploadedFile) {
                        firstUploadedFile = fullPath;
                    }

                    await saveProjectFiles();
                    renderFileListDrawer();
                    showStatus(`Uploaded: ${file.name}`, 'success', 1500);
                };
                reader.onerror = () => {
                    showStatus(`Failed to read file: ${file.name}`, 'error');
                };
                reader.readAsText(file); // Reads as text, assumes text-based files
            }
            
            // Open the first uploaded file after a short delay to ensure processing
            setTimeout(() => {
                if (firstUploadedFile) {
                    openFileInEditor(firstUploadedFile);
                }
            }, 500); // Give a bit of time for file processing/saving
        }

        async function deleteFileEntry(path, type) {
            const name = path.split('/').filter(Boolean).pop(); // Handle both 'folder/' and 'file' paths
            const message = type === 'file' 
                ? `Are you sure you want to delete the file "${name}"? This action cannot be undone.`
                : `Are you sure you want to delete the folder "${name}" and all its contents? This action cannot be undone.`;

            confirmModal('Delete Confirmation', message, async (confirmed) => {
                if (confirmed) {
                    if (type === 'file') {
                        if (projectFilesData.hasOwnProperty(path)) {
                            delete projectFilesData[path];
                            if (currentOpenFile === path) {
                                currentOpenFile = null;
                                editor.setValue('');
                                projectTitleElement.textContent = 'No File Open - Gen1 Editor';
                                runButton.style.display = 'none';
                            }
                        }
                    } else { // type === 'folder'
                        const folderPathPrefix = path.endsWith('/') ? path : path + '/';
                        for (const key in projectFilesData) {
                            if (key.startsWith(folderPathPrefix)) {
                                delete projectFilesData[key];
                                if (currentOpenFile === key) {
                                    currentOpenFile = null;
                                    editor.setValue('');
                                    projectTitleElement.textContent = 'No File Open - Gen1 Editor';
                                    runButton.style.display = 'none';
                                }
                            }
                        }
                        // Also delete the explicit folder entry itself if it existed (e.g., 'myfolder/': null)
                        if (projectFilesData.hasOwnProperty(folderPathPrefix)) {
                            delete projectFilesData[folderPathPrefix];
                        }
                        expandedFolders.delete(normalizePath(path.slice(0, -1))); // Remove from expanded list
                    }
                    await saveProjectFiles();
                    renderFileListDrawer();
                    showStatus(`${type === 'file' ? 'File' : 'Folder'} deleted: ${name}`, 'success');
                }
            });
        }

        async function renameFileEntry(oldPath, type) {
            // Filter(Boolean) handles cases like "folder/" => ["folder"]
            const oldName = oldPath.split('/').filter(Boolean).pop();
            const title = type === 'file' ? 'Rename File' : 'Rename Folder';
            const message = type === 'file' ? `Enter new name for "${oldName}":` : `Enter new name for folder "${oldName}":`;
            const defaultName = oldName; // Pre-fill with old name

            promptModal(title, message, defaultName, async (newName) => {
                if (!newName || newName === oldName) {
                    showStatus('Rename cancelled or new name is the same.', 'info');
                    return;
                }

                let newPath = '';
                // Calculate parent path for both files and folders correctly
                const parentPathEndIndex = oldPath.lastIndexOf(oldName) > 0 ? oldPath.lastIndexOf(oldName) : 0;
                const parentPath = oldPath.substring(0, parentPathEndIndex);
                
                if (type === 'file') {
                    newPath = normalizePath(parentPath + newName);
                    if (newPath.endsWith('/')) {
                         showStatus('File name cannot end with a slash.', 'error');
                         return;
                    }
                } else { // type === 'folder'
                    newPath = normalizePath(parentPath + newName);
                    if (!newPath.endsWith('/')) {
                        newPath += '/'; // Ensure folder path ends with a slash
                    }
                }

                if (projectFilesData.hasOwnProperty(newPath) && newPath !== oldPath) {
                    showStatus(`A ${type} with name "${newName}" already exists.`, 'error');
                    return;
                }

                if (type === 'file') {
                    const content = projectFilesData[oldPath];
                    delete projectFilesData[oldPath];
                    projectFilesData[newPath] = content;
                    if (currentOpenFile === oldPath) {
                        currentOpenFile = newPath;
                    }
                } else { // type === 'folder'
                    const oldFolderPathPrefix = oldPath.endsWith('/') ? oldPath : oldPath + '/';
                    const newFolderPathPrefix = newPath.endsWith('/') ? newPath : newPath + '/';

                    // Move all children files/folders
                    const keysToMove = Object.keys(projectFilesData).filter(key => key.startsWith(oldFolderPathPrefix));
                    
                    for (const key of keysToMove) {
                        const newKey = newFolderPathPrefix + key.substring(oldFolderPathPrefix.length);
                        projectFilesData[newKey] = projectFilesData[key];
                        delete projectFilesData[key];
                        if (currentOpenFile === key) {
                            currentOpenFile = newKey;
                        }
                    }
                    // If the old path itself was an empty folder marker, move it
                    if (projectFilesData.hasOwnProperty(oldFolderPathPrefix)) {
                        projectFilesData[newFolderPathPrefix] = projectFilesData[oldFolderPathPrefix];
                        delete projectFilesData[oldFolderPathPrefix];
                    }

                    // Update expanded folders list
                    const oldNormalizedFolder = normalizePath(oldPath.slice(0, -1));
                    const newNormalizedFolder = normalizePath(newPath.slice(0, -1));
                    if (expandedFolders.has(oldNormalizedFolder)) {
                        expandedFolders.delete(oldNormalizedFolder);
                        expandedFolders.add(newNormalizedFolder);
                    }
                }

                await saveProjectFiles();
                renderFileListDrawer();
                if (currentOpenFile) {
                    openFileInEditor(currentOpenFile); // Re-open the file if it was renamed/its parent folder was renamed
                } else {
                    projectTitleElement.textContent = 'No File Open - Gen1 Editor';
                }
                showStatus(`${type === 'file' ? 'File' : 'Folder'} renamed to ${newName}`, 'success');
            });
        }


        async function saveProjectFiles() {
            return putItemInStore(FILES_STORE_NAME, {
                projectId: currentProjectId,
                files: projectFilesData
            });
        }

        function showModal(title, message, inputVisible, defaultValue, confirmCallback) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalInput.style.display = inputVisible ? 'block' : 'none';
            modalInput.value = defaultValue || '';
            
            modalConfirm.onclick = null;
            modalCancel.onclick = null;

            modalConfirm.onclick = () => {
                genericModal.classList.remove('visible');
                confirmCallback(inputVisible ? modalInput.value.trim() : true);
            };
            modalCancel.onclick = () => {
                genericModal.classList.remove('visible');
                confirmCallback(false);
            };

            genericModal.classList.add('visible');
            if (inputVisible) {
                modalInput.focus();
                modalInput.select();
            }
        }

        function promptModal(title, message, defaultValue, callback) {
            showModal(title, message, true, defaultValue, callback);
        }

        function confirmModal(title, message, callback) {
            showModal(title, message, false, null, callback);
        }

        // Event Listeners
        backButton.addEventListener('click', () => {
            window.location.href = 'Welcome.html';
        });
        drawerButton.addEventListener('click', toggleDrawer);
        drawerOverlay.addEventListener('click', closeDrawer);
        themeToggleButton.addEventListener('click', toggleTheme);

        runButton.addEventListener('click', () => {
            if (currentOpenFile && (currentOpenFile.endsWith('.html') || currentOpenFile.endsWith('.htm'))) {
                const htmlContent = editor.getValue();
                const blob = new Blob([htmlContent], { type: 'text/html' });
                const blobUrl = URL.createObjectURL(blob);
                const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
                if (!previewWindow) {
                    showStatus('Pop-up blocked! Please allow pop-ups for live preview.', 'error', 5000);
                }
            } else {
                showStatus('Cannot run non-HTML files directly as a live preview.', 'error');
            }
        });

        aiButton.addEventListener('click', () => {
            window.location.href = 'Ai.html';
        });
        formatterButton.addEventListener('click', formatCurrentFile);
        obfuscateButton.addEventListener('click', obfuscateCurrentJsFile); // NEW EVENT LISTENER
        saveButton.addEventListener('click', saveCurrentFile);
        copyCodeButton.addEventListener('click', async () => {
            if (!currentOpenFile || !editor) {
                showStatus('No file open to copy.', 'error');
                return;
            }

            const codeToCopy = editor.getValue();
            try {
                await navigator.clipboard.writeText(codeToCopy);
                showStatus('Code copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showStatus('Failed to copy code. Please try again or copy manually.', 'error');
            }
        });
        howToUseButton.addEventListener('click', () => {
            window.location.href = 'Htu.html';
        });

        newFileButton.addEventListener('click', () => createFileEntry('file'));
        newFolderButton.addEventListener('click', () => createFileEntry('folder'));
        uploadFileButton.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (event) => uploadFiles(event.target.files));

        document.addEventListener('DOMContentLoaded', async () => {
            loadTheme();
            await openGen1DB();
            await initializeMonacoEditor();

            // REMOVED: Prettier plugins are usually self-registered when loaded via script tags
            /*
            if (window.prettierPlugins) {
                for (const key in window.prettierPlugins) {
                    if (Object.prototype.hasOwnProperty.call(window.prettierPlugins, key) && window.prettierPlugins[key]) {
                        prettierPlugins.push(window.prettierPlugins[key]);
                    }
                }
            } else {
                showStatus('Prettier plugins not fully loaded.', 'warning', 5000);
            }
            */

            currentProjectId = localStorage.getItem(CURRENT_PROJECT_ID_LS_KEY);

            if (!currentProjectId) {
                showStatus('No project selected. Returning to projects...', 'error', 4000);
                setTimeout(() => {
                    window.location.href = 'Welcome.html';
                }, 4000);
                return;
            }

            try {
                const projectMetadata = await getItemFromStore(PROJECTS_STORE_NAME, currentProjectId);
                if (projectMetadata && projectMetadata.name) {
                    projectTitleElement.textContent = projectMetadata.name + ' - Gen1 Editor';
                } else {
                    projectTitleElement.textContent = 'Untitled Project - Gen1 Editor';
                    showStatus('Project metadata not found.', 'error');
                }
            } catch (error) {
                projectTitleElement.textContent = 'Error Loading Project';
                showStatus('Failed to load project metadata: ' + error.message, 'error');
            }
            
            await loadProjectData(currentProjectId);
        });