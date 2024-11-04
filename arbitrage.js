
const MATCH_TYPES = {
    '1x2': {
        name: '1x2（ホーム/引分/アウェイ）',
        outcomes: ['ホーム勝利', '引分', 'アウェイ勝利']
    },
    'win_lose': {
        name: 'ホーム/アウェイ',
        outcomes: ['ホーム勝利', 'アウェイ勝利']
    }
};
//ブックメーカー既存
let bookmakers = [
    { name: 'bet365', odds: [2.05, 1.80] },
    { name: 'Pinnacle', odds: [2.10, 1.75] },
    { name: 'William Hill', odds: [2.08, 1.78] }
];

let oddsChart = null;

// テーブルの初期化
function initializeTable() {
    const matchType = document.getElementById('matchType').value;
    const thead = document.querySelector('#bookmakerTable thead tr');
    thead.innerHTML = `
        <th>ブックメーカー</th>
        ${MATCH_TYPES[matchType].outcomes.map(outcome => 
            `<th>${outcome}</th>`
        ).join('')}
        <th></th>
    `;
    
    refreshBookmakerTable();
}

// ブックメーカーテーブルの更新
function refreshBookmakerTable() {
    const tbody = document.querySelector('#bookmakerTable tbody');
    tbody.innerHTML = bookmakers.map((bm, index) => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <input type="text" value="${bm.name}" 
                    onchange="updateBookmakerName(${index}, this.value)"
                    class="w-full p-1 border rounded">
            </td>
            ${bm.odds.map((odd, oddIndex) => `
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <input type="number" step="0.01" value="${odd}"
                        onchange="updateOdds(${index}, ${oddIndex}, this.value)"
                        class="w-20 p-1 border rounded text-center">
                </td>
            `).join('')}
            <td class="px-6 py-4 whitespace-nowrap">
                <button onclick="removeBookmaker(${index})"
                    class="text-red-500 hover:text-red-700">×</button>
            </td>
        </tr>
    `).join('');
}

// ブックメーカー名の更新
function updateBookmakerName(index, newName) {
    bookmakers[index].name = newName;
}

// オッズの更新
function updateOdds(bookmakerIndex, outcomeIndex, value) {
    bookmakers[bookmakerIndex].odds[outcomeIndex] = parseFloat(value) || 0;
}

// ブックメーカーの追加
function addBookmaker() {
    const matchType = document.getElementById('matchType').value;
    const defaultOdds = matchType === 'win_lose' ? [2.05, 1.80] : [2.05, 3.40, 1.80];
    bookmakers.push({
        name: `ブックメーカー${bookmakers.length + 1}`,
        odds: defaultOdds
    });
    refreshBookmakerTable();
}

// ブックメーカーの削除
function removeBookmaker(index) {
    bookmakers = bookmakers.filter((_, i) => i !== index);
    refreshBookmakerTable();
}

// アービトラージ計算
function calculateArbitrage() {
    const matchType = document.getElementById('matchType').value;
    const outcomes = MATCH_TYPES[matchType].outcomes;

    // 最適なオッズと対応するブックメーカーを見つける
    const bestOdds = [];
    const bestSites = [];
    
    for (let i = 0; i < bookmakers[0].odds.length; i++) {
        let maxOdd = Math.max(...bookmakers.map(bm => bm.odds[i]));
        let maxSiteIndex = bookmakers.findIndex(bm => bm.odds[i] === maxOdd);
        bestOdds.push(maxOdd);
        bestSites.push(bookmakers[maxSiteIndex].name);
    }

    // 理論上の確率と利益率を計算
    const impliedProb = bestOdds.map(odd => 1/odd);
    const totalImpliedProb = impliedProb.reduce((a, b) => a + b, 0);
    const maxProfitRate = 1 - totalImpliedProb;

    // 投資配分を計算
    const baseInvestment = 100;
    const totalInvestment = baseInvestment / (1 - totalImpliedProb);
    const stakes = impliedProb.map(prob => (prob * totalInvestment).toFixed(2));

    displayResults({
        bestOdds,
        bestSites,
        stakes,
        totalInvestment: totalInvestment.toFixed(2),
        profitRate: (maxProfitRate * 100).toFixed(2),
        hasArbitrage: totalImpliedProb < 1,
        outcomes
    });
}

// 結果の表示
function displayResults(analysis) {
    const resultsDiv = document.getElementById('analysisResults');
    resultsDiv.style.display = 'block';

    // アラートの表示
    const alertDiv = document.getElementById('arbitrageAlert');
    if (!analysis.hasArbitrage) {
        alertDiv.innerHTML = `
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div class="flex">
                    <p class="text-yellow-700">
                        裁定取引の機会は見つかりませんでした
                    </p>
                </div>
            </div>
        `;
        return;
    }else {
        alertDiv.innerHTML = '';
    }

    // 結果テーブルの更新
    const resultsTable = document.getElementById('resultsTable');
    resultsTable.innerHTML = `
    <thead class="bg-gray-50">
        <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">結果</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">配分額</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">使用サイト</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">オッズ</th>
        </tr>
    </thead>
    <tbody class="divide-y divide-gray-200">
        ${analysis.outcomes.map((outcome, i) => `
            <tr>
                <td class="px-4 py-2">${outcome}</td>
                <td class="px-4 py-2">${analysis.stakes[i]}円</td>
                <td class="px-4 py-2">${analysis.bestSites[i]}</td>
                <td class="px-4 py-2">${analysis.bestOdds[i].toFixed(2)}</td>
            </tr>
        `).join('')}
    </tbody>
`;

    // 収益性分析の更新
    document.getElementById('totalInvestment').textContent = 
        `総投資額: ${analysis.totalInvestment}円`;
    document.getElementById('profitRate').textContent = 
        `期待利益率: ${analysis.profitRate}%`;

    // グラフの更新
    updateChart(analysis.outcomes);
}

// グラフの更新
function updateChart(outcomes) {
    const ctx = document.getElementById('oddsChart').getContext('2d');
    
    if (oddsChart) {
        oddsChart.destroy();
    }

    const datasets = bookmakers.map((bm, index) => ({
        label: bm.name,
        data: bm.odds,
        borderColor: `hsl(${index * 360 / bookmakers.length}, 70%, 50%)`,
        fill: false
    }));

    oddsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: outcomes,
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// 試合形式変更時の処理
document.getElementById('matchType').addEventListener('change', function(e) {
    const type = e.target.value;
    bookmakers = bookmakers.map(bm => ({
        name: bm.name,
        odds: type === 'win_lose' 
            ? [2.05, 1.80] 
            : [2.05, 3.40, 1.80]
    }));
    initializeTable();
    document.getElementById('analysisResults').style.display = 'none';
});

// 初期化
initializeTable();
