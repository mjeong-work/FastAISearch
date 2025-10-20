let allTools = [];
let selectedToolIds = new Set();

async function fetchTools(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.category) queryParams.append('category', params.category);
    if (params.pricing) queryParams.append('pricing', params.pricing);
    
    const url = `/api/tools${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    try {
        const response = await fetch(url);
        const tools = await response.json();
        allTools = tools;
        displayTools(tools);
    } catch (error) {
        console.error('Error fetching tools:', error);
        document.getElementById('toolsGrid').innerHTML = '<p>Error loading tools. Please try again.</p>';
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

function displayTools(tools) {
    const grid = document.getElementById('toolsGrid');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = tools.length;
    
    if (tools.length === 0) {
        grid.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No tools found matching your criteria.</p>';
        return;
    }
    
    grid.innerHTML = tools.map(tool => `
        <div class="tool-card ${selectedToolIds.has(tool.id) ? 'selected' : ''}" data-id="${tool.id}">
            <div class="compare-checkbox">
                <input type="checkbox" 
                       class="compare-check" 
                       data-id="${tool.id}" 
                       ${selectedToolIds.has(tool.id) ? 'checked' : ''}
                       ${selectedToolIds.size >= 3 && !selectedToolIds.has(tool.id) ? 'disabled' : ''}>
            </div>
            <h3 class="tool-name">${tool.name}</h3>
            <span class="tool-category">${tool.category}</span>
            <p class="tool-description">${tool.description}</p>
            <p class="tool-pricing">💰 ${tool.pricing_details}</p>
            <div class="tool-tags">
                ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="tool-features">
                <h4>Key Features:</h4>
                <ul>
                    ${tool.features.slice(0, 3).map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            <a href="${tool.website}" target="_blank" class="tool-link">Visit Website →</a>
        </div>
    `).join('');
    
    document.querySelectorAll('.compare-check').forEach(checkbox => {
        checkbox.addEventListener('change', handleCompareToggle);
    });
}

function handleCompareToggle(event) {
    const toolId = parseInt(event.target.dataset.id);
    
    if (event.target.checked) {
        if (selectedToolIds.size < 3) {
            selectedToolIds.add(toolId);
        } else {
            event.target.checked = false;
            return;
        }
    } else {
        selectedToolIds.delete(toolId);
    }
    
    updateCompareSection();
    displayTools(allTools);
}

function updateCompareSection() {
    const compareSection = document.getElementById('compareSection');
    const compareCount = document.getElementById('compareCount');
    
    compareCount.textContent = selectedToolIds.size;
    
    if (selectedToolIds.size > 0) {
        compareSection.style.display = 'block';
    } else {
        compareSection.style.display = 'none';
    }
}

async function showComparison() {
    if (selectedToolIds.size === 0) return;
    
    const ids = Array.from(selectedToolIds).join(',');
    
    try {
        const response = await fetch(`/api/tools/compare?ids=${ids}`);
        const tools = await response.json();
        
        const modal = document.getElementById('compareModal');
        const compareContent = document.getElementById('compareContent');
        
        compareContent.innerHTML = `
            <div class="compare-grid">
                ${tools.map(tool => `
                    <div class="compare-tool">
                        <h3>${tool.name}</h3>
                        <span class="tool-category">${tool.category}</span>
                        
                        <div class="section">
                            <h4>Description</h4>
                            <p>${tool.description}</p>
                        </div>
                        
                        <div class="section">
                            <h4>Pricing</h4>
                            <p>${tool.pricing_details}</p>
                        </div>
                        
                        <div class="section">
                            <h4>Tags</h4>
                            <div class="tool-tags">
                                ${tool.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div class="section">
                            <h4>Features</h4>
                            <ul>
                                ${tool.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <a href="${tool.website}" target="_blank" class="tool-link">Visit Website →</a>
                    </div>
                `).join('')}
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Error loading comparison:', error);
    }
}

function handleSearch() {
    const searchValue = document.getElementById('searchInput').value.trim();
    const categoryValue = document.getElementById('categoryFilter').value;
    const pricingValue = document.getElementById('pricingFilter').value;
    
    const params = {};
    if (searchValue) params.search = searchValue;
    if (categoryValue) params.category = categoryValue;
    if (pricingValue) params.pricing = pricingValue;
    
    fetchTools(params);
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('pricingFilter').value = '';
    fetchTools();
}

function clearCompare() {
    selectedToolIds.clear();
    updateCompareSection();
    displayTools(allTools);
}

document.getElementById('searchBtn').addEventListener('click', handleSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

document.getElementById('categoryFilter').addEventListener('change', handleSearch);
document.getElementById('pricingFilter').addEventListener('change', handleSearch);
document.getElementById('clearBtn').addEventListener('click', clearFilters);

document.getElementById('viewCompareBtn').addEventListener('click', showComparison);
document.getElementById('clearCompareBtn').addEventListener('click', clearCompare);

document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('compareModal').style.display = 'none';
});

window.addEventListener('click', (e) => {
    const modal = document.getElementById('compareModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

fetchCategories();
fetchTools();
