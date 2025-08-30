import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

        // Your web app's Firebase configuration (same as login.html)
        const firebaseConfig = {
            apiKey: "AIzaSyCxd1eEj4mET0tzasD12lNfno054f6ZN-0",
            authDomain: "xbuilder-64c36.firebaseapp.com",
            projectId: "xbuilder-64c36",
            storageBucket: "xbuilder-64c36.firebasestorage.app",
            messagingSenderId: "652300372081",
            appId: "1:652300372081:web:df1f6f8ea8b537e19133d0"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        // Default profile picture URL (you should put a default image file here)
        const DEFAULT_PROFILE_PIC_URL = 'default-profile.png'; 

        // Elements for profile widget
        const userProfilePic = document.getElementById('userProfilePic');
        const userNameDisplay = document.getElementById('userNameDisplay');
        const userEmailDisplay = document.getElementById('userEmailDisplay');
        const logoutBtn = document.getElementById('logoutBtn');
        const userProfileWidget = document.getElementById('userProfileWidget');

        // Handle user authentication state
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                userNameDisplay.textContent = user.displayName || 'User'; // Use display name or generic 'User'
                userEmailDisplay.textContent = user.email;
                // Set profile picture, fallback to default if not available
                userProfilePic.src = user.photoURL || DEFAULT_PROFILE_PIC_URL;
                // Add onerror handler to revert to default if the loaded photoURL is broken
                userProfilePic.onerror = () => {
                    userProfilePic.src = DEFAULT_PROFILE_PIC_URL;
                };

                // Show the widget
                userProfileWidget.style.display = 'flex'; 
            } else {
                // User is signed out, redirect to login page
                console.log('No user signed in. Redirecting to login.html');
                window.location.href = 'login.html';
            }
        });

        // Handle logout
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                console.log('User signed out.');
                // Redirection is handled by onAuthStateChanged listener
            } catch (error) {
                console.error('Error signing out:', error.message);
                // Optionally show an error message on the page
            }
        });


        const DB_NAME = 'Gen1DB';
        const DB_VERSION = 1;
        const PROJECTS_STORE_NAME = 'projects';
        const FILES_STORE_NAME = 'projectFiles';
        const CURRENT_PROJECT_ID_LS_KEY = 'gen1_current_project_id';
        const THEME_STORAGE_KEY = 'gen1_theme';
        const PROJECT_SORT_KEY = 'gen1_project_sort_order'; // New constant for sort order

        const body = document.body;
        const themeSwitch = document.getElementById('themeSwitch');
        const lightIcon = document.getElementById('lightIcon');
        const moonIcon = document.getElementById('moonIcon');
        const themeText = document.getElementById('themeText');
        const projectsGrid = document.getElementById('projectsGrid');
        const createNewProjectBtn = document.getElementById('createNewProjectBtn');
        const statusMessage = document.getElementById('statusMessage');
        const settingsBtn = document.getElementById('settingsBtn');

        let db;

        function openGen1DB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);

                request.onupgradeneeded = (event) => {
                    db = event.target.result;
                    if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
                        db.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
                    }
                    if (!db.objectStoreNames.contains(FILES_STORE_NAME)) {
                        db.createObjectStore(FILES_STORE_NAME, { keyPath: 'projectId' });
                    }
                    showStatus('Database setup complete!', 'info');
                };

                request.onsuccess = (event) => {
                    db = event.target.result;
                    showStatus('Database opened successfully.', 'info');
                    resolve(db);
                };

                request.onerror = (event) => {
                    console.error('IndexedDB error:', event.target.error);
                    showStatus(`IndexedDB error: ${event.target.error.message}`, 'error');
                    reject(event.target.error);
                };
            });
        }

        function getAllItemsFromStore(storeName) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }

        function deleteItemFromStore(storeName, key) {
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => {
                    resolve();
                };

                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }

        function loadTheme() {
            const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
            if (savedTheme === 'dark') {
                body.classList.add('dark-theme');
                themeText.textContent = 'Dark Mode';
                lightIcon.style.display = 'none';
                moonIcon.style.display = 'inline-block';
            } else {
                body.classList.remove('dark-theme');
                themeText.textContent = 'Light Mode';
                lightIcon.style.display = 'inline-block';
                moonIcon.style.display = 'none';
            }
        }

        async function exportProjectAsZip(projectId) {
            async function getItemFromStoreById(storeName, key) {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction([storeName], 'readonly');
                    const store = transaction.objectStore(storeName);
                    const request = store.get(key);
                    request.onsuccess = (event) => {
                        resolve(event.target.result);
                    };
                    request.onerror = (event) => {
                        reject(event.target.error);
                    };
                });
            }

            try {
                const project = await getItemFromStoreById(PROJECTS_STORE_NAME, projectId);
                if (!project) {
                    throw new Error('Project not found');
                }

                const files = await getItemFromStoreById(FILES_STORE_NAME, projectId);
                if (!files) {
                    throw new Error('No files found for this project');
                }

                const zip = new JSZip();
                zip.file('project.json', JSON.stringify(project, null, 2));

                if (typeof files === 'object' && files.files) {
                    Object.keys(files.files).forEach((filePath) => {
                        const content = files.files[filePath];
                        zip.file(filePath, content);
                    });
                }

                const zipBlob = await zip.generateAsync({ type: 'blob' });

                if (window.navigator.msSaveBlob) {
                    window.navigator.msSaveBlob(zipBlob, `${project.name}.zip`);
                } else if (window.URL && window.URL.createObjectURL) {
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(zipBlob);
                    link.download = `${project.name}.zip`;
                    link.click();
                } else {
                    showStatus('Your browser does not support file downloading.', 'error');
                }
                showStatus('Project exported successfully!', 'success');
            } catch (error) {
                console.error('Error exporting project:', error);
                showStatus(`Failed to export project: ${error.message}`, 'error');
            }
        }

        function toggleTheme() {
            if (body.classList.contains('dark-theme')) {
                body.classList.remove('dark-theme');
                localStorage.setItem(THEME_STORAGE_KEY, 'light');
                themeText.textContent = 'Light Mode';
                lightIcon.style.display = 'inline-block';
                moonIcon.style.display = 'none';
            } else {
                body.classList.add('dark-theme');
                localStorage.setItem(THEME_STORAGE_KEY, 'dark');
                themeText.textContent = 'Dark Mode';
                lightIcon.style.display = 'none';
                moonIcon.style.display = 'inline-block';
            }
        }
        themeSwitch.addEventListener('click', toggleTheme);

        function showStatus(message, type = 'info') {
            statusMessage.style.display = 'flex';
            statusMessage.className = 'message-area';
            statusMessage.classList.add(type);
            
            let iconClass = 'fas fa-info-circle';
            if (type === 'error') iconClass = 'fas fa-times-circle';
            if (type === 'success') iconClass = 'fas fa-check-circle';

            statusMessage.innerHTML = `<i class="${iconClass}"></i> <p>${message}</p>`;
            setTimeout(() => { hideStatus(); }, 3000);
        }

        function hideStatus() {
            statusMessage.style.display = 'none';
        }

        async function renderProjects() {
            projectsGrid.innerHTML = `
                <p style="text-align: center; color: var(--text-secondary); padding: 30px; font-weight: 400;">
                    <i class="fas fa-sync fa-spin"></i> Loading projects from database...
                </p>
            `;

            try {
                if (!db) {
                    await openGen1DB();
                }

                let projects = await getAllItemsFromStore(PROJECTS_STORE_NAME);
                const sortOrder = localStorage.getItem(PROJECT_SORT_KEY) || 'newest'; // Get sort order

                // Populate open counts and find max for bar width calculation
                let maxOpenCount = 0;
                projects = projects.map(project => {
                    const openCountKey = `gen1_project_open_count_${project.id}`;
                    const openCount = parseInt(localStorage.getItem(openCountKey) || '0', 10);
                    if (openCount > maxOpenCount) {
                        maxOpenCount = openCount;
                    }
                    return { ...project, openCount };
                });

                // Apply sorting based on preference
                switch (sortOrder) {
                    case 'newest':
                        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        break;
                    case 'oldest':
                        projects.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        break;
                    case 'mostOpened':
                        projects.sort((a, b) => b.openCount - a.openCount);
                        break;
                    case 'leastOpened':
                        projects.sort((a, b) => a.openCount - b.openCount);
                        break;
                    case 'az':
                        projects.sort((a, b) => a.name.localeCompare(b.name));
                        break;
                    case 'za':
                        projects.sort((a, b) => b.name.localeCompare(a.name));
                        break;
                    default:
                        projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Default to newest
                        break;
                }

                projectsGrid.innerHTML = '';

                if (projects.length === 0) {
                    projectsGrid.innerHTML = `
                        <p style="text-align: center; color: var(--text-secondary); padding: 30px; font-weight: 400;">
                            No projects found. Tap the <i class="fas fa-plus fa-lg" style="color: var(--accent-main);"></i> button to create your first project.
                        </p>
                    `;
                } else {
                    projects.forEach((project) => {
                        const openCount = project.openCount;
                        const barWidth = maxOpenCount > 0 ? (openCount / maxOpenCount) * 100 : 0;

                        const projectCard = document.createElement('div');
                        projectCard.classList.add('project-card');
                        projectCard.dataset.projectId = project.id;
                        projectCard.innerHTML = `
                            <h3><i class="fas fa-folder"></i> ${project.name}</h3>
                            <p>Created: ${new Date(project.createdAt).toLocaleDateString()}</p>
                            <div class="project-stats">
                                <span class="stat-label">Opens: <span class="open-count">${openCount}</span></span>
                                <div class="open-count-bar-container">
                                    <div class="open-count-bar" style="width: ${barWidth}%;"></div>
                                </div>
                            </div>
                            <div class="card-actions">
                                <button class="open-btn"><i class="fas fa-edit"></i> Open</button>
                                <button class="export-btn"><i class="fas fa-download"></i> Export</button>
                                <button class="delete-btn"><i class="fas fa-trash-alt"></i> Delete</button>
                            </div>
                        `;

                        projectCard.querySelector('.export-btn').addEventListener('click', (event) => {
                            event.stopPropagation();
                            exportProjectAsZip(project.id);
                        });
                        projectCard.querySelector('.open-btn').addEventListener('click', (event) => {
                            event.stopPropagation();
                            openProject(project.id);
                        });
                        projectCard.querySelector('.delete-btn').addEventListener('click', (event) => {
                            event.stopPropagation();
                            deleteProject(project.id);
                        });
                        projectCard.addEventListener('click', () => openProject(project.id));

                        projectsGrid.appendChild(projectCard);
                    });
                }
            } catch (error) {
                console.error('Error rendering projects:', error);
                projectsGrid.innerHTML = `
                    <p style="text-align: center; color: var(--error-color); padding: 30px; font-weight: 400;">
                        <i class="fas fa-exclamation-triangle"></i> Failed to load projects. Please refresh or check console.
                    </p>
                `;
                showStatus(`Failed to load projects: ${error.message}`, 'error');
            }
        }

        function openProject(projectId) {
            const key = `gen1_project_open_count_${projectId}`;
            let count = parseInt(localStorage.getItem(key) || '0', 10);
            count++;
            localStorage.setItem(key, count.toString());
            localStorage.setItem(CURRENT_PROJECT_ID_LS_KEY, projectId);
            window.location.href = 'Pe.html';
        }

        async function deleteProject(projectIdToDelete) {
            if (confirm(`Are you sure you want to delete this project permanently? This action cannot be undone.`)) {
                showStatus('Deleting project...', 'info');
                try {
                    const transaction = db.transaction([PROJECTS_STORE_NAME, FILES_STORE_NAME], 'readwrite');
                    const projectsStore = transaction.objectStore(PROJECTS_STORE_NAME);
                    const filesStore = transaction.objectStore(FILES_STORE_NAME);

                    await Promise.all([
                        new Promise((resolve, reject) => {
                            const req1 = projectsStore.delete(projectIdToDelete);
                            req1.onsuccess = () => resolve();
                            req1.onerror = (e) => reject(e.target.error);
                        }),
                        new Promise((resolve, reject) => {
                            const req2 = filesStore.delete(projectIdToDelete);
                            req2.onsuccess = () => resolve();
                            req2.onerror = (e) => reject(e.target.error);
                        })
                    ]);
                    localStorage.removeItem(`gen1_project_open_count_${projectIdToDelete}`);

                    showStatus('Project deleted successfully!', 'success');
                    renderProjects();
                } catch (error) {
                    console.error('Error deleting project:', error);
                    showStatus(`Failed to delete project: ${error.message}`, 'error');
                }
            }
        }

        createNewProjectBtn.addEventListener('click', () => {
            window.location.href = 'Np.html';
        });

        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });

        document.addEventListener('DOMContentLoaded', async () => {
            loadTheme();
            // Open IndexedDB only after Firebase auth is checked/user is present
            // The renderProjects will be called from the onAuthStateChanged if a user is found.
        });

        // Initialize IndexedDB and render projects only if user is authenticated.
        // This ensures data is loaded for the correct user.
        auth.onAuthStateChanged(user => {
            if (user) {
                openGen1DB().then(() => {
                    renderProjects();
                });
            }
        });