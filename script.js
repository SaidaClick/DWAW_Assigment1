let rawData = [];
let filteredData = [];
let currentDecade = 'all';

const formatMoney = n => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : `$${(n/1e6).toFixed(0)}M`;
const palettes = ['#ECA82B', '#42C0E2', '#E13B3B', '#3CA35A', '#B565E8', '#FFFFFF'];

async function loadData() {
    try {
        const response = await fetch('films.json');
        if (!response.ok) throw new Error('Network response was not ok');
        rawData = await response.json();
        
        rawData.forEach(f => {
            f.box_office = Number(f.box_office) || 0;
            f.year = Number(f.year) || 0;
        });

        filteredData = [...rawData];
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        applyFilters();
        
    } catch (error) {
        console.error("Fetch error:", error);
        document.getElementById('error-msg').style.display = 'block';
    }
}

function renderStats() {
    if(!filteredData.length) {
        document.getElementById('statsRow').innerHTML = '';
        return;
    }
    const total = filteredData.reduce((s,f) => s + f.box_office, 0);
    const countries = new Set(filteredData.map(f => (f.country || '').split(',')[0].trim()));
    
    const stats = [
        { label: 'Films Found', value: filteredData.length },
        { label: 'Total Box Office', value: formatMoney(total) },
        { label: 'Top Film', value: filteredData[0]?.title.split(':')[0] || 'N/A' },
        { label: 'Unique Countries', value: countries.size }
    ];

    document.getElementById('statsRow').innerHTML = stats.map(s => `
        <div class="stat-block">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value}</div>
        </div>
    `).join('');
}

function renderDirectorBars() {
    const dirs = {};
    filteredData.forEach(f => {
        (f.director || 'Unknown').split(',').forEach(d => {
            d = d.trim();
            if(d) dirs[d] = (dirs[d] || 0) + f.box_office;
        });
    });
    
    const sorted = Object.entries(dirs).sort((a,b)=>b[1]-a[1]).slice(0, 6);
    if(!sorted.length) {
        document.getElementById('directorBars').innerHTML = "<p style='color: var(--text-dim)'>No data found for this filter.</p>";
        return;
    }
    const max = sorted[0][1];

    document.getElementById('directorBars').innerHTML = sorted.map(([name, rev], i) => `
        <div class="bar-row">
            <div class="bar-name" title="${name}">${name}</div>
            <div class="bar-track">
                <div class="bar-fill" style="width: ${(rev/max*100)}%; background: ${palettes[i%palettes.length]}">
                    ${formatMoney(rev)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderTopFilms() {
    const top = [...filteredData].sort((a,b)=>b.box_office-a.box_office).slice(0,5);
    
    if(!top.length) {
        document.getElementById('topFilmsBody').innerHTML = "<tr><td style='color: var(--text-dim)'>No data found.</td></tr>";
        return;
    }

    document.getElementById('topFilmsBody').innerHTML = top.map((f, i) => {
        const cls = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-n';
        return `
            <tr>
                <td style="width: 50px"><span class="rank-badge ${cls}">#${i+1}</span></td>
                <td>
                    <div style="font-weight: 800; font-size: 1.1rem">${f.title}</div>
                    <div style="color: var(--text-dim); font-size: 0.85rem">${f.year} | ${f.director}</div>
                </td>
                <td class="revenue-text" style="text-align: right; font-size: 1.2rem">${formatMoney(f.box_office)}</td>
            </tr>
        `;
    }).join('');
}

function renderDonut() {
    const counts = {};
    filteredData.forEach(f => {
        const c = (f.country || 'Unknown').split(',')[0].trim();
        counts[c] = (counts[c] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
    const total = sorted.reduce((s,[,v])=>s+v, 0);

    if(total === 0) {
        document.getElementById('donutWrap').innerHTML = "<p style='color: var(--text-dim)'>No data found.</p>";
        return;
    }

    let startAngle = -Math.PI/2;
    let paths = '';
    sorted.forEach(([name, count], i) => {
        const angle = (count/total)*2*Math.PI;
        const endAngle = startAngle + angle;
        
        const x1 = 70 + 60 * Math.cos(startAngle), y1 = 70 + 60 * Math.sin(startAngle);
        const x2 = 70 + 60 * Math.cos(endAngle),   y2 = 70 + 60 * Math.sin(endAngle);
        const xi1 = 70 + 35 * Math.cos(startAngle), yi1 = 70 + 35 * Math.sin(startAngle);
        const xi2 = 70 + 35 * Math.cos(endAngle),   yi2 = 70 + 35 * Math.sin(endAngle);
        const large = angle > Math.PI ? 1 : 0;
        
        paths += `<path d="M${xi1},${yi1} L${x1},${y1} A60,60 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A35,35 0 ${large},0 ${xi1},${yi1}Z" 
                        fill="${palettes[i % palettes.length]}" stroke="#111" stroke-width="2"/>`;
        startAngle = endAngle;
    });

    const svg = `
        <svg viewBox="0 0 140 140" width="160" height="160">
            <circle cx="70" cy="70" r="33" fill="#2B2D33" />
            <text x="70" y="75" text-anchor="middle" fill="#FFF" font-weight="900" font-size="20">${total}</text>
            ${paths}
        </svg>
    `;

    const legend = sorted.slice(0,5).map(([name, count], i) => `
        <div class="legend-item">
            <div class="legend-dot" style="background: ${palettes[i % palettes.length]}"></div>
            <div>${name} <span style="color: var(--text-dim)">(${((count/total)*100).toFixed(0)}%)</span></div>
        </div>
    `).join('');

    document.getElementById('donutWrap').innerHTML = `${svg}<div class="donut-legend">${legend}</div>`;
}

function renderTimeline() {
    const byYear = {};
    filteredData.forEach(f => { byYear[f.year] = (byYear[f.year]||0) + 1; });
    const years = Object.keys(byYear).map(Number).sort((a,b)=>a-b);
    
    if(!years.length) {
        document.getElementById('timelineChart').innerHTML = "<p style='color: var(--text-dim)'>No data found.</p>";
        return;
    }
    
    const maxCount = Math.max(...Object.values(byYear));

    const bars = years.map(y => `
        <div class="t-bar-wrap">
            <div class="t-bar" title="${y}: ${byYear[y]} films" style="height: ${Math.max(10, (byYear[y]/maxCount)*140)}px"></div>
            <span class="t-bar-year">${y}</span>
        </div>
    `).join('');

    document.getElementById('timelineChart').innerHTML = bars;
}

function applyFilters() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    filteredData = rawData.filter(f => {
        const matchText = !query || 
            (f.title && f.title.toLowerCase().includes(query)) || 
            (f.director && f.director.toLowerCase().includes(query)) ||
            (f.country && f.country.toLowerCase().includes(query));
        
        let matchDecade = true;
        if (currentDecade !== 'all') {
            const start = parseInt(currentDecade.substring(0, 4));
            matchDecade = f.year >= start && f.year < start + 10;
        }
        
        return matchText && matchDecade;
    });

    renderStats();
    renderDirectorBars();
    renderTopFilms();
    renderDonut();
    renderTimeline();
}

function setDecade(decade, btnElement) {
    currentDecade = decade;
    document.querySelectorAll('.controls .btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilters();
}

document.getElementById('searchInput').addEventListener('input', applyFilters);

loadData();
