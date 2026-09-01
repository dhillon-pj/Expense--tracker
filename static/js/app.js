const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];
const expenseCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Education', 'Other'];

let expenseChart = null;
let allTransactions = [];

const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const filterType = document.getElementById('filterType');
const filterCategory = document.getElementById('filterCategory');
const form = document.getElementById('transactionForm');
const tableBody = document.getElementById('transactionsBody');
const emptyState = document.getElementById('emptyState');

function updateCategoryOptions() {
    const type = typeSelect.value;
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    categorySelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function updateFilterCategories() {
    const type = filterType.value;
    let categories = [];
    if (type === 'income') categories = incomeCategories;
    else if (type === 'expense') categories = expenseCategories;
    else categories = [...incomeCategories, ...expenseCategories];
    
    const current = filterCategory.value;
    filterCategory.innerHTML = '<option value="">All</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    if (categories.includes(current)) filterCategory.value = current;
}

async function fetchTransactions() {
    const params = new URLSearchParams();
    if (filterType.value) params.append('type', filterType.value);
    if (filterCategory.value) params.append('category', filterCategory.value);
    
    const res = await fetch(`/api/transactions?${params}`);
    return res.json();
}

async function fetchSummary() {
    const res = await fetch('/api/summary');
    return res.json();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(amount);
}

function renderTransactions(transactions) {
    allTransactions = transactions;
    tableBody.innerHTML = '';
    
    if (transactions.length === 0) {
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    
    transactions.forEach(t => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${t.date}</td>
            <td>${t.description}</td>
            <td>${t.category}</td>
            <td><span class="type-badge ${t.type}">${t.type}</span></td>
            <td class="amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</td>
            <td><button class="delete-btn" data-id="${t.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
        `;
        tableBody.appendChild(row);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteTransaction(btn.dataset.id));
    });
}

function updateSummary(summary) {
    document.getElementById('totalIncome').textContent = formatCurrency(summary.total_income);
    document.getElementById('totalExpense').textContent = formatCurrency(summary.total_expense);
    document.getElementById('balance').textContent = formatCurrency(summary.balance);
    
    const balanceEl = document.getElementById('balance');
    balanceEl.className = 'card-value balance';
    if (summary.balance < 0) balanceEl.style.color = 'var(--expense-red)';
    else if (summary.balance > 0) balanceEl.style.color = 'var(--income-green)';
    
    renderChart(summary.category_data);
}

function renderChart(categoryData) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const legend = document.getElementById('chartLegend');
    
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);
    
    if (categories.length === 0) {
        if (expenseChart) expenseChart.destroy();
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        legend.innerHTML = '<p style="color: var(--text-secondary);">Add expenses to see chart</p>';
        return;
    }
    
    const colors = [
        'rgba(168, 85, 247, 0.8)',
        'rgba(6, 182, 212, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(20, 184, 166, 0.8)'
    ];
    
    const borderColors = colors.map(c => c.replace('0.8', '1'));
    
    if (expenseChart) expenseChart.destroy();
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: colors.slice(0, categories.length),
                borderColor: borderColors.slice(0, categories.length),
                borderWidth: 2,
                borderRadius: 8,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(18, 18, 38, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(168, 85, 247, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1000
            }
        }
    });
    
    legend.innerHTML = categories.map((cat, i) => `
        <div class="legend-item">
            <div class="legend-color" style="background: ${colors[i]}"></div>
            <span>${cat}: ${formatCurrency(amounts[i])}</span>
        </div>
    `).join('');
}

async function loadData() {
    const [transactions, summary] = await Promise.all([fetchTransactions(), fetchSummary()]);
    renderTransactions(transactions);
    updateSummary(summary);
}

async function addTransaction(e) {
    e.preventDefault();
    
    const data = {
        description: document.getElementById('description').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        type: typeSelect.value,
        category: categorySelect.value
    };
    
    if (!data.description || isNaN(data.amount)) return;
    
    const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (res.ok) {
        form.reset();
        updateCategoryOptions();
        loadData();
    }
}

async function deleteTransaction(id) {
    if (!confirm('Delete this transaction?')) return;
    
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
}

typeSelect.addEventListener('change', updateCategoryOptions);
filterType.addEventListener('change', () => {
    updateFilterCategories();
    loadData();
});
filterCategory.addEventListener('change', loadData);
form.addEventListener('submit', addTransaction);

document.addEventListener('DOMContentLoaded', () => {
    updateCategoryOptions();
    updateFilterCategories();
    loadData();
    initParticles();
});

function initParticles() {
    const container = document.getElementById('particles');
    const colors = ['#a855f7', '#06b6d4', '#ec4899'];
    
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 20 + 's';
        particle.style.animationDuration = (15 + Math.random() * 15) + 's';
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.width = particle.style.height = (2 + Math.random() * 3) + 'px';
        particle.style.boxShadow = `0 0 ${particle.style.width} ${particle.style.background}`;
        container.appendChild(particle);
    }
}