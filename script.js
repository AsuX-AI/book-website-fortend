// ==========================================
// SHARED GLOBALS
// ==========================================
const API_BASE_URL = "https://book-review-web-site.onrender.com";

// Merged Auth Headers (Compatible with both Index & Admin logic)
function getAuthHeaders(isFormData = false) {
    const token = localStorage.getItem('access_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    return headers;
}

// Scoped execution to prevent cross-page errors while retaining exact functionality
const isAuthPage = document.body.classList.contains('auth-page');
const isAdminPage = document.body.classList.contains('admin-page');
const isIndexPage = document.body.classList.contains('index-page');

// ==========================================
// AUTH PAGE LOGIC
// ==========================================
if (isAuthPage) {
    window.switchTab = function(tab) {
        document.getElementById('system-message').className = 'message-box';
        if (tab === 'login') {
            document.getElementById('btn-login').classList.add('active');
            document.getElementById('btn-signup').classList.remove('active');
            document.getElementById('form-login').classList.add('active');
            document.getElementById('form-signup').classList.remove('active');
        } else {
            document.getElementById('btn-signup').classList.add('active');
            document.getElementById('btn-login').classList.remove('active');
            document.getElementById('form-signup').classList.add('active');
            document.getElementById('form-login').classList.remove('active');
        }
    };

    window.showMessage = function(text, type) {
        const msgBox = document.getElementById('system-message');
        msgBox.textContent = text;
        msgBox.className = `message-box ${type}`;
    };

    window.handleLogin = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submit-login');
        btn.disabled = true; btn.textContent = "Authenticating...";

        const formData = new URLSearchParams();
        formData.append("username", document.getElementById('login-email').value);
        formData.append("password", document.getElementById('login-password').value);

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Invalid credentials");

            localStorage.setItem('access_token', data.access_token);
            showMessage("Login successful! Redirecting...", "success");
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        } catch (error) {
            showMessage(error.message, "error");
            btn.disabled = false; btn.textContent = "Sign In Access";
        }
    };

    window.handleSignup = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('submit-signup');
        btn.disabled = true; btn.textContent = "Creating Account...";
        const payload = {
            name: document.getElementById('signup-name').value,
            email: document.getElementById('signup-email').value,
            password: document.getElementById('signup-password').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Failed to create account");
            
            showMessage("Signup successful! Please log in.", "success");
            setTimeout(() => {
                document.getElementById('login-email').value = payload.email;
                document.getElementById('login-password').value = '';
                switchTab('login');
                showMessage("Signup successful! Please log in.", "success");
                btn.disabled = false; btn.textContent = "Create Account";
            }, 1500);
        } catch (error) {
            showMessage(error.message, "error");
            btn.disabled = false; btn.textContent = "Create Account";
        }
    };

    window.onload = () => {
        if (localStorage.getItem('access_token')) {
            window.location.href = 'index.html';
        }
    };
}

// ==========================================
// ADMIN PAGE LOGIC
// ==========================================
if (isAdminPage) {
    window.checkAdminAuth = async function() {
        const token = localStorage.getItem('access_token');
        if (!token) {
            document.getElementById('admin-login-overlay').style.display = 'flex';
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers: getAuthHeaders() });
            if (res.ok) {
                document.getElementById('admin-login-overlay').style.display = 'none';
                loadDashboardData(); 
            } else {
                document.getElementById('admin-login-overlay').style.display = 'flex';
            }
        } catch (e) {
            document.getElementById('admin-login-overlay').style.display = 'flex';
        }
    };

    window.handleAdminLogin = async function(e) {
        e.preventDefault();
        const btn = document.getElementById('admin-login-btn');
        const errorMsg = document.getElementById('admin-error-msg');
        btn.textContent = "Verifying..."; btn.disabled = true; errorMsg.style.display = 'none';
        
        const formData = new URLSearchParams();
        formData.append("username", document.getElementById('admin-email-input').value);
        formData.append("password", document.getElementById('admin-password-input').value);

        try {
            const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });
            if (!loginRes.ok) throw new Error("Invalid credentials");
            const data = await loginRes.json();
            localStorage.setItem('access_token', data.access_token);

            const statsRes = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers: getAuthHeaders() });
            if (!statsRes.ok) {
                localStorage.removeItem('access_token');
                throw new Error("Access Denied: Admin required");
            }
            document.getElementById('admin-login-overlay').style.display = 'none';
            document.getElementById('admin-login-form').reset();
            loadDashboardData();
        } catch (error) {
            errorMsg.textContent = error.message; errorMsg.style.display = 'block';
        } finally {
            btn.textContent = "Authenticate"; btn.disabled = false;
        }
    };

    window.switchTab = function(targetId, element) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        document.getElementById('current-tab-title').textContent = element.innerText.substring(3);
        document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
        document.getElementById(`view-${targetId}`).classList.add('active');
    };

    window.handleLogout = function() {
        localStorage.removeItem('access_token');
        document.getElementById('admin-login-overlay').style.display = 'flex';
    };

    window.loadDashboardData = async function() {
        try {
            const statsRes = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers: getAuthHeaders() });
            if (statsRes.ok) {
                const stats = await statsRes.json();
                document.getElementById('stat-users').textContent = stats.total_users;
                document.getElementById('stat-chapters').textContent = stats.total_chapters;
                document.getElementById('stat-feedback').textContent = stats.total_feedback_submissions || stats.total_feedback || 0;
            }
            const chaptersRes = await fetch(`${API_BASE_URL}/api/chapters/`, { headers: getAuthHeaders() });
            let allFeedback = [];
            if (chaptersRes.ok) {
                const chapters = await chaptersRes.json();
                for (const chapter of chapters) {
                    const feedbackRes = await fetch(`${API_BASE_URL}/api/chapters/${chapter.id}/feedback`, { headers: getAuthHeaders() });
                    if (feedbackRes.ok) {
                        const chapterFeedback = await feedbackRes.json();
                        chapterFeedback.forEach(f => { f.chapter_title = chapter.title; allFeedback.push(f); });
                    }
                }
            }
            allFeedback.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
            const tbody = document.getElementById('feedback-table-body');
            if (allFeedback.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No feedback records found.</td></tr>';
            } else {
                tbody.innerHTML = allFeedback.map(f => `
                    <tr>
                        <td>${new Date(f.submitted_at).toLocaleDateString()}</td>
                        <td style="font-weight: 500;">${f.user_name}</td>
                        <td>${f.chapter_title}</td>
                        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.takeaways || 'No text provided'}</td>
                        <td><span class="badge badge-pending">New</span></td>
                        <td><button class="action-btn" onclick='openModal(${JSON.stringify(f).replace(/'/g, "&apos;")})'>Read Full</button></td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error(error);
            document.getElementById('feedback-table-body').innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Failed to connect to API.</td></tr>';
        }
    };

    window.refreshData = function() {
        document.getElementById('feedback-table-body').innerHTML = '<tr><td colspan="6" style="text-align: center;">Refreshing data...</td></tr>';
        loadDashboardData();
    };

    window.openModal = function(feedbackData) {
        document.getElementById('modal-username-title').textContent = feedbackData.user_name;
        document.getElementById('modal-feedback-content').innerHTML = `
            <div class="feedback-item">
                <div class="feedback-meta">
                    <span><strong>Chapter:</strong> ${feedbackData.chapter_title}</span>
                    <span>${new Date(feedbackData.submitted_at).toLocaleString()}</span>
                </div>
                <div class="feedback-qa"><div class="qa-q">Q1: মূল্যবান মতামত</div><div class="qa-a">${feedbackData.takeaways || 'N/A'}</div></div>
                <div class="feedback-qa"><div class="qa-q">Q2: কোনো concept বুঝতে অসুবিধা</div><div class="qa-a">${feedbackData.unclear_concepts || 'N/A'}</div></div>
                <div class="feedback-qa"><div class="qa-q">Q3: formatting সমস্যা / General Feedback</div><div class="qa-a">${feedbackData.general_feedback || 'N/A'}</div></div>
            </div>`;
        document.getElementById('feedback-modal').classList.add('show');
    };

    window.closeModal = function() { document.getElementById('feedback-modal').classList.remove('show'); };
    document.getElementById('feedback-modal').addEventListener('click', function (e) { if (e.target === this) closeModal(); });

    window.updateFileName = function(input) {
        const display = document.getElementById('file-name-display');
        if (input.files.length > 0) { display.textContent = input.files.name; display.style.color = 'var(--success)'; }
        else { display.textContent = 'No file selected'; display.style.color = 'var(--text-muted)'; }
    };

    window.handleChapterUpload = async function(event) {
        event.preventDefault();
        const btn = document.getElementById('upload-btn');
        btn.textContent = "⏳ Processing..."; btn.disabled = true;
        const chapterNum = parseInt(document.getElementById('chap-number').value);
        const chapterTitle = document.getElementById('chap-title').value;
        const fileInput = document.getElementById('file-input');

        try {
            const formData = new FormData();
            formData.append('file', fileInput.files);
            const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', headers: getAuthHeaders(true), body: formData });
            if (!uploadRes.ok) throw new Error("PDF File upload failed");
            const uploadData = await uploadRes.json();

            const chapterRes = await fetch(`${API_BASE_URL}/api/chapters/`, {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ chapter_number: chapterNum, title: chapterTitle, pdf_url: uploadData.file_url })
            });
            if (!chapterRes.ok) throw new Error("Failed to save chapter to database");
            
            alert(`Success: Chapter ${chapterNum} uploaded and published!`);
            document.getElementById('upload-chapter-form').reset();
            updateFileName(fileInput);
            switchTab('dashboard', document.querySelectorAll('.nav-item'));
            loadDashboardData();
        } catch (error) {
            console.error("Upload failed", error); alert("Upload failed: " + error.message);
        } finally { btn.textContent = "🚀 Upload & Publish"; btn.disabled = false; }
    };

    window.onload = checkAdminAuth;
}

// ==========================================
// INDEX PAGE LOGIC
// ==========================================
if (isIndexPage) {
    if (!localStorage.getItem('access_token')) { window.location.href = 'auth.html'; }

    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'p' || event.key === 'P')) {
            event.preventDefault(); alert('Printing and saving this document is disabled.');
        }
    });

    const ENDPOINTS = {
        logout: `${API_BASE_URL}/api/auth/logout`,
        getAllChapters: `${API_BASE_URL}/api/chapters/`,
        getChapterByNumber: (chapterNumber) => `${API_BASE_URL}/api/chapters/number/${chapterNumber}`,
        postFeedback: (chapterId) => `${API_BASE_URL}/api/chapters/${chapterId}/feedback`
    };

    let currentChapterId = null;
    let pdfDoc = null;
    let scale = 1.2;

    window.fetchChapters = async function() {
        const container = document.getElementById('chapters-container');
        try {
            const response = await fetch(ENDPOINTS.getAllChapters, { method: 'GET', headers: getAuthHeaders() });
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('access_token'); window.location.href = 'auth.html'; return;
            }
            if (!response.ok) throw new Error("Failed to fetch chapters");
            const chapterList = await response.json();
            container.innerHTML = '';
            
            if (chapterList.length === 0) {
                container.innerHTML = `<div style="color: var(--text-muted); text-align:center;">No chapters available.</div>`; return;
            }
            chapterList.forEach((chapter, index) => {
                const btn = document.createElement('button');
                btn.className = `chapter-btn ${index === 0 ? 'active' : ''}`;
                btn.textContent = chapter.title || `Chapter ${chapter.chapter_number}`;
                btn.onclick = (e) => loadChapterFromAPI(chapter.chapter_number, chapter.id, e.target);
                container.appendChild(btn);
                if (index === 0) loadChapterFromAPI(chapter.chapter_number, chapter.id, btn);
            });
        } catch (error) {
            console.error(error); container.innerHTML = `<div style="color:var(--danger-red); text-align:center;">Failed to load chapters.</div>`;
        }
    };

    window.loadChapterFromAPI = async function(chapterNumber, chapterId, element) {
        currentChapterId = chapterId;
        document.querySelectorAll('.chapter-btn').forEach(btn => btn.classList.remove('active'));
        if (element) element.classList.add('active');

        try {
            const response = await fetch(ENDPOINTS.getChapterByNumber(chapterNumber), { method: 'GET', headers: getAuthHeaders() });
            if (!response.ok) throw new Error("Failed to fetch chapter");
            const chapterData = await response.json();
            let pdfUrlToLoad = chapterData.pdf_url;
            if (!pdfUrlToLoad.startsWith('http')) {
                if (pdfUrlToLoad.startsWith('/')) pdfUrlToLoad = pdfUrlToLoad.substring(1);
                pdfUrlToLoad = `${API_BASE_URL}/${pdfUrlToLoad}`;
            }
            document.getElementById('pdf-container').scrollTop = 0;
            loadPdfViewer(pdfUrlToLoad);
        } catch (error) {
            console.error("PDF ERROR:", error);
            document.getElementById('pdf-container').innerHTML = `<div style="color:var(--danger-red); margin-top:2rem;">Error loading chapter PDF.</div>`;
        }
    };

    window.handleLogout = async function() {
        const btn = document.getElementById('logout-btn');
        btn.disabled = true; btn.textContent = "Logging out...";
        try { await fetch(ENDPOINTS.logout, { method: 'POST', headers: getAuthHeaders() }); } 
        catch (error) { console.error(error); } 
        finally { localStorage.removeItem('access_token'); window.location.href = 'auth.html'; }
    };

    window.submitFeedback = async function() {
        if (!currentChapterId) { alert("Please select a chapter first."); return; }
        const btn = document.getElementById('submit-feedback-btn');
        const btnText = document.getElementById('btn-text');
        const payload = {
            takeaways: document.getElementById('note-q1').value,
            unclear_concepts: document.getElementById('note-q2').value,
            general_feedback: document.getElementById('note-q3').value
        };

        btn.disabled = true; btnText.textContent = "Sending...";
        try {
            const response = await fetch(ENDPOINTS.postFeedback(currentChapterId), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
            if (!response.ok) throw new Error("Feedback failed");
            
            document.getElementById('note-q1').value = ''; document.getElementById('note-q2').value = ''; document.getElementById('note-q3').value = '';
            btnText.textContent = "Saved!";
            setTimeout(() => { btn.disabled = false; btnText.textContent = "Save Notes & Send"; }, 2000);
        } catch (error) {
            console.error(error); alert("Failed to send feedback.");
            btn.disabled = false; btnText.textContent = "Save Notes & Send";
        }
    };

    window.toggleProfile = function() { document.getElementById('menu-card').classList.toggle('show'); };
    window.toggleFeedback = function() { document.getElementById('feedback-panel').classList.toggle('minimized'); };

    document.addEventListener('click', function (event) {
        const container = document.querySelector('.profile-container');
        if (container && !container.contains(event.target)) document.getElementById('menu-card').classList.remove('show');
    });

    const pdfjsLib = window['pdfjs-dist/build/pdf'];
    if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    const pdfContainer = document.getElementById('pdf-container');

    window.renderAllPages = async function() {
        const scrollRatio = pdfContainer.scrollHeight > 0 ? pdfContainer.scrollTop / pdfContainer.scrollHeight : 0;
        pdfContainer.innerHTML = '';
        for (let num = 1; num <= pdfDoc.numPages; num++) {
            const page = await pdfDoc.getPage(num);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.height = viewport.height; canvas.width = viewport.width;
            pdfContainer.appendChild(canvas);
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        }
        pdfContainer.scrollTop = pdfContainer.scrollHeight * scrollRatio;
    };

    document.getElementById('zoom-in')?.addEventListener('click', () => { scale += 0.2; renderAllPages(); });
    document.getElementById('zoom-out')?.addEventListener('click', () => { if (scale > 0.6) { scale -= 0.2; renderAllPages(); } });

    window.loadPdfViewer = function(url) {
        pdfContainer.innerHTML = `<div style="color:var(--text-muted); margin-top:2rem;">Loading PDF...</div>`;
        pdfjsLib.getDocument(url).promise.then(pdfDoc_ => {
            pdfDoc = pdfDoc_; renderAllPages();
        }).catch(error => {
            console.error(error); pdfContainer.innerHTML = `<div style="color:var(--danger-red); margin-top:2rem;">Error loading PDF.</div>`;
        });
    };

    window.onload = () => fetchChapters();
}