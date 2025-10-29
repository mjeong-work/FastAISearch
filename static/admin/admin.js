const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => escapeMap[char] || char);
}

function formatList(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return '—';
    }
    return values.join(', ');
}

function splitCommaSeparated(value) {
    if (!value) {
        return [];
    }
    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
}

function setFeedback(element, message, isError = false) {
    if (!element) {
        return;
    }
    element.textContent = message || '';
    element.classList.toggle('error', Boolean(message && isError));
}

async function fetchJSON(url, options = {}) {
    const opts = { ...options };
    opts.headers = opts.headers ? { ...opts.headers } : {};
    if (opts.body && !opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, opts);
    const text = await response.text();

    if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        if (text) {
            try {
                const errorData = JSON.parse(text);
                if (errorData && errorData.detail) {
                    message = errorData.detail;
                } else {
                    message = text;
                }
            } catch (err) {
                message = text;
            }
        }
        throw new Error(message);
    }

    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (err) {
        return null;
    }
}

function renderTools(tableBody, tools) {
    if (!tools || tools.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">No tools found. Create one to get started.</td>
            </tr>`;
        return;
    }

    const rows = tools.map((tool) => {
        const published = Boolean(tool.published);
        const statusClass = published ? 'published' : 'draft';
        const statusLabel = published ? 'Published' : 'Draft';
        const website = (tool.website || '').trim();
        const websiteCell = website
            ? `<a href="${escapeHtml(website)}" target="_blank" rel="noopener">Visit</a>`
            : '—';

        return `
            <tr data-id="${tool.id}" data-published="${published}">
                <td>${escapeHtml(tool.name)}</td>
                <td>${escapeHtml(tool.category)}</td>
                <td>${escapeHtml(tool.pricing)}</td>
                <td>${escapeHtml(formatList(tool.tags))}</td>
                <td>${escapeHtml(formatList(tool.features))}</td>
                <td>${websiteCell}</td>
                <td>
                    <span class="status-tag ${statusClass}">${statusLabel}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-button publish" data-action="toggle" data-id="${tool.id}" data-published="${published}">
                            ${published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button class="action-button delete" data-action="delete" data-id="${tool.id}">Delete</button>
                    </div>
                </td>
            </tr>`;
    });

    tableBody.innerHTML = rows.join('');
}

function initListPage() {
    const tableBody = document.getElementById('toolsTableBody');
    const messageEl = document.getElementById('tableMessage');

    if (!tableBody) {
        return;
    }

    async function loadTools() {
        setFeedback(messageEl, 'Loading tools...');
        try {
            const tools = await fetchJSON('/api/admin/tools');
            renderTools(tableBody, tools);
            setFeedback(messageEl, tools && tools.length > 0 ? '' : 'No tools available yet.');
        } catch (error) {
            setFeedback(messageEl, error.message, true);
        }
    }

    tableBody.addEventListener('click', async (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const toolId = Number(button.dataset.id);
        if (!Number.isFinite(toolId)) {
            return;
        }

        const action = button.dataset.action;

        if (action === 'toggle') {
            const isPublished = button.dataset.published === 'true';
            setFeedback(messageEl, `${isPublished ? 'Unpublishing' : 'Publishing'} tool...`);
            try {
                await fetchJSON(`/api/admin/tools/${toolId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ published: !isPublished })
                });
                setFeedback(messageEl, `Tool ${isPublished ? 'moved to drafts' : 'published'} successfully.`);
                await loadTools();
            } catch (error) {
                setFeedback(messageEl, error.message, true);
            }
            return;
        }

        if (action === 'delete') {
            const confirmDelete = window.confirm('Delete this tool? This cannot be undone.');
            if (!confirmDelete) {
                return;
            }
            setFeedback(messageEl, 'Deleting tool...');
            try {
                await fetchJSON(`/api/admin/tools/${toolId}`, {
                    method: 'DELETE'
                });
                setFeedback(messageEl, 'Tool deleted.');
                await loadTools();
            } catch (error) {
                setFeedback(messageEl, error.message, true);
            }
        }
    });

    loadTools();
}

function initNewPage() {
    const form = document.getElementById('toolForm');
    const publishBtn = document.getElementById('publishBtn');
    const draftBtn = document.getElementById('draftBtn');
    const messageEl = document.getElementById('formMessage');

    if (!form || !publishBtn || !draftBtn) {
        return;
    }

    form.addEventListener('submit', (event) => event.preventDefault());

    function buildPayload(published) {
        const formData = new FormData(form);
        return {
            name: (formData.get('name') || '').toString().trim(),
            description: (formData.get('description') || '').toString().trim(),
            category: (formData.get('category') || '').toString().trim(),
            pricing: (formData.get('pricing') || '').toString().trim(),
            website: (formData.get('website') || '').toString().trim(),
            tags: splitCommaSeparated(formData.get('tags')),
            features: splitCommaSeparated(formData.get('features')),
            published
        };
    }

    async function handleSubmit(published) {
        setFeedback(messageEl, 'Saving tool...');
        try {
            await fetchJSON('/api/admin/tools', {
                method: 'POST',
                body: JSON.stringify(buildPayload(published))
            });
            window.location.href = '/admin/tools';
        } catch (error) {
            setFeedback(messageEl, error.message, true);
        }
    }

    publishBtn.addEventListener('click', () => handleSubmit(true));
    draftBtn.addEventListener('click', () => handleSubmit(false));
}

window.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page;
    if (page === 'list') {
        initListPage();
    } else if (page === 'new') {
        initNewPage();
    }
});
