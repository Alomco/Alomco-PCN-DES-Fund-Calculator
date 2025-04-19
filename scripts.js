const regionSelect = document.getElementById('region');
const pcnDisplayInput = document.getElementById('pcn-display');
const pcnNameHidden = document.getElementById('pcn-name-hidden');
const pcnCodeInput = document.getElementById('pcn-code');
const rawListSizeInput = document.getElementById('raw-list-size');
const adjustedListSizeInput = document.getElementById('adjusted-list-size');
const weightedListSizeInput = document.getElementById('weighted-list-size');
const historicalAdjustmentFactorInput = document.getElementById('historical-adjustment-factor');
const historicalWeightingFactorInput = document.getElementById('historical-weighting-factor');
const includeHistoricalFactors = document.getElementById('include-historical-factors');
const careHomeBeds = document.getElementById('care-home-beds');
const iifAchievedPointsInput = document.getElementById('iif-achieved-points');
const includeCorePcn = document.getElementById('include-core-pcn');
const includeExtendedAccess = document.getElementById('include-extended-access');
const includeCareHome = document.getElementById('include-care-home');
const includeCasp = document.getElementById('include-casp');
const includeCaip = document.getElementById('include-caip');
const caipDomain1 = document.getElementById('caip-domain1');
const caipDomain2 = document.getElementById('caip-domain2');
const includeArrs = document.getElementById('include-arrs');
const includeIif = document.getElementById('include-iif');
const includeParticipation = document.getElementById('include-participation');
const calculateBtn = document.getElementById('calculate-btn');
const fillExampleBtn = document.getElementById('fill-example');
const loadingSpinner = document.getElementById('loading-spinner');
const resultsContainer = document.getElementById('results-container');
const totalFundingSpan = document.getElementById('total-funding');
const monthlyFundingSpan = document.getElementById('monthly-funding');
const quarterlyFundingSpan = document.getElementById('quarterly-funding');
const fundingComponentsTable = document.getElementById('funding-components').querySelector('tbody');
const practiceBreakdownTable = document.getElementById('practice-breakdown').querySelector('tbody');
const fundingChart = document.getElementById('funding-chart');
const pcnModal = document.getElementById('pcn-modal');
const pcnModalSearch = document.getElementById('pcn-modal-search');
const pcnList = document.getElementById('pcn-list');
const exportPdfBtn = document.getElementById('export-pdf');
const exportCsvBtn = document.getElementById('export-csv');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const termsModal = document.getElementById('terms-modal');
const privacyModal = document.getElementById('privacy-modal');
const contactModal = document.getElementById('contact-modal');

const DEFAULT_ADJUSTMENT_FACTOR = 0.05;
const DEFAULT_WEIGHTING_FACTOR = 0.10;

const FUNDING_RATES = {
    CORE_PCN_RAW: 2.266,
    CORE_PCN_ADJUSTED: 0.733,
    EXTENDED_ACCESS: 8.427,
    CARE_HOME_PREMIUM: 130.253,
    CASP: 2.246,
    CAIP_PER_DOMAIN: 0.481,
    ARRS_RATE: 26.631,
    IIF_POINT_VALUE: 198,
    PARTICIPATION_FUND: 1.761
};

let pcnData = [];
let pieChart = null;
let savedHistoricalAdjustmentFactor = DEFAULT_ADJUSTMENT_FACTOR * 100;
let savedHistoricalWeightingFactor = DEFAULT_WEIGHTING_FACTOR * 100;

document.addEventListener('DOMContentLoaded', function() {
    try {
        loadPcnDataFromCsv();
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to initialize the calculator. Please check the console for details.');
    }
});

async function loadPcnDataFromCsv() {
    try {
        loadingSpinner.style.display = 'block';
        const response = await fetch('./data/pcn_data.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        if (!csvText.trim()) {
            throw new Error('CSV file is empty');
        }
        pcnData = parseCsvData(csvText);
        if (pcnData.length === 0) {
            throw new Error('No valid PCN data parsed from CSV');
        }
        console.log('PCN Data Loaded:', pcnData);
        populateRegions();
    } catch (error) {
        console.error('Error loading PCN data:', error);
        alert(`Failed to load PCN data: ${error.message}. Please check the console for details and ensure the CSV file is available.`);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function parseCsvData(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    const headers = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim());

    console.log('Parsed CSV headers:', headers);
    
    const practiceCodeIndex = headers.findIndex(h => h === 'Practice Code');
    const practiceNameIndex = headers.findIndex(h => h === 'Practice Name');
    const pcnCodeIndex = headers.findIndex(h => h === 'PCN Code');
    const pcnNameIndex = headers.findIndex(h => h === 'PCN Name');
    const regionIndex = headers.findIndex(h => h === 'Region');
    const rawListSize2025Index = headers.findIndex(h => h === 'Raw list size as of 01/01/25');
    const rawListSizeIndex = headers.findIndex(h => h === 'Raw list size 2024/25');
    const adjustedPopulationIndex = headers.findIndex(h => h === 'Adjusted Population 2024/25');
    const weightedPopulationIndex = headers.findIndex(h => h === 'weighted population 2024/25');

    const missing = [];
    if (practiceCodeIndex < 0) missing.push('Practice Code');
    if (practiceNameIndex < 0) missing.push('Practice Name');
    if (pcnCodeIndex < 0) missing.push('PCN Code');
    if (pcnNameIndex < 0) missing.push('PCN Name');
    if (regionIndex < 0) missing.push('Region');
    if (rawListSize2025Index < 0) missing.push('Raw list size as of 01/01/25');
    if (missing.length) {
        console.error('Missing required CSV columns:', missing);
        alert('Error: Missing required columns:\n' + missing.join(', '));
        return [];
    }

    const pcns = [];
    const pcnMap = new Map();

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length <= rawListSize2025Index) continue;

        const practiceCode = values[practiceCodeIndex]?.trim() || '';
        const practiceName = values[practiceNameIndex]?.trim() || '';
        const pcnCode = values[pcnCodeIndex]?.trim() || '';
        const pcnName = values[pcnNameIndex]?.trim() || '';
        const region = values[regionIndex]?.trim() || '';
        const raw2025 = parseFloat(values[rawListSize2025Index]) || 0;
        const raw2024 = parseFloat(values[rawListSizeIndex] || '') || 0;
        const adjPop = parseFloat(values[adjustedPopulationIndex] || '') || 0;
        const wtPop = parseFloat(values[weightedPopulationIndex] || '') || 0;

        const histAdj = raw2024 > 0 ? (adjPop/raw2024) - 1 : DEFAULT_ADJUSTMENT_FACTOR;
        const histWt = raw2024 > 0 ? (wtPop /raw2024) - 1 : DEFAULT_WEIGHTING_FACTOR;

        if (!pcnCode || !pcnName) continue;

        const practice = {
            practiceCode,
            practiceName,
            rawListSize: raw2025,
            rawListSize2025: raw2025,
            adjustedPopulation: adjPop,
            weightedPopulation: wtPop,
            historicalAdjustmentFactor: histAdj,
            historicalWeightingFactor: histWt
        };

        if (!pcnMap.has(pcnCode)) {
            pcnMap.set(pcnCode, { pcnCode, pcnName, region, practices: [] });
            pcns.push(pcnMap.get(pcnCode));
        }
        pcnMap.get(pcnCode).practices.push(practice);
    }

    return pcns;
}

function populateRegions() {
    const allowedRegions = [
        "East of England",
        "London",
        "Midlands",
        "North East and Yorkshire",
        "North West",
        "South East",
        "South West"
    ];
    while (regionSelect.options.length > 1) {
        regionSelect.remove(1);
    }
    allowedRegions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    if (!calculateBtn) {
        console.error('Calculate button not found');
        alert('Calculator error: Calculate button not found.');
        return;
    }
    if (!includeCasp || !includeCaip || !caipDomain1 || !caipDomain2) {
        console.error('One or more CAP checkbox elements not found');
        alert('Calculator error: Missing CAP checkbox elements. Please check the console.');
        return;
    }

    regionSelect.addEventListener('change', () => {
        pcnDisplayInput.value = '';
        pcnNameHidden.value = '';
        pcnCodeInput.value = '';
    });
    pcnDisplayInput.addEventListener('click', openPcnModal);
    calculateBtn.addEventListener('click', calculateFunding);
    fillExampleBtn.addEventListener('click', fillExampleData);

    exportPdfBtn.addEventListener('click', () => {
        console.log('Export PDF button clicked');
        if (!pieChart || !fundingChart.getContext('2d') || !totalFundingSpan.textContent || !fundingComponentsTable.rows.length) {
            alert('Please calculate funding first to generate the PDF.');
            return;
        }
        const pcn = pcnNameHidden.value || '—';
        const date = new Date().toLocaleDateString('en-GB');
        document.querySelector('.print-meta').textContent = `PCN: ${pcn}  |  Date: ${date}`;
        const pcnSelected = pcnData.find(p => p.pcnCode === pcnCodeInput.value) || { practices: [] };
        const practiceListSizes = [
            {
                name: 'PCN Total',
                raw: parseFloat(rawListSizeInput.value) || 0,
                adjusted: parseFloat(adjustedListSizeInput.value) || 0,
                weighted: parseFloat(weightedListSizeInput.value) || 0
            },
            ...pcnSelected.practices.map(practice => ({
                name: practice.practiceName || 'Unknown Practice',
                raw: practice.rawListSize || 0,
                adjusted: practice.adjustedPopulation || 0,
                weighted: practice.weightedPopulation || 0
            }))
        ];
        console.log('practiceListSizes for PDF export:', practiceListSizes);
        if (practiceListSizes.length === 1) {
            console.warn('Only PCN Total available; no practice data for PCN:', pcnCodeInput.value);
        }
        if (typeof window.exportAsPdf === 'function') {
            window.exportAsPdf({
                totalFundingSpan,
                monthlyFundingSpan,
                quarterlyFundingSpan,
                fundingComponentsTable,
                practiceBreakdownTable,
                fundingChart,
                pcnNameHidden,
                practiceListSizes
            });
        } else {
            console.error('exportAsPdf is not available on window');
            alert('PDF export functionality is not available. Please ensure export.js is loaded.');
        }
    });

    exportCsvBtn.addEventListener('click', () => {
        console.log('Export CSV button clicked');
        if (!totalFundingSpan.textContent || !fundingComponentsTable.rows.length) {
            alert('Please calculate funding first to generate the CSV.');
            return;
        }
        if (typeof window.exportAsCsv === 'function') {
            window.exportAsCsv({
                totalFundingSpan,
                monthlyFundingSpan,
                quarterlyFundingSpan,
                fundingComponentsTable,
                practiceBreakdownTable,
                pcnNameHidden
            });
        } else {
            console.error('exportAsCsv is not available on window');
            alert('CSV export functionality is not available. Please ensure export.js is loaded.');
        }
    });

    includeHistoricalFactors.addEventListener('change', updateListSizes);
    rawListSizeInput.addEventListener('input', updateListSizes);
    historicalAdjustmentFactorInput.addEventListener('input', e => {
        savedHistoricalAdjustmentFactor = parseFloat(e.target.value) || 0;
        updateListSizes();
    });
    historicalWeightingFactorInput.addEventListener('input', e => {
        savedHistoricalWeightingFactor = parseFloat(e.target.value) || 0;
        updateListSizes();
    });

    includeCasp.addEventListener('change', calculateFunding);
    includeCaip.addEventListener('change', calculateFunding);
    caipDomain1.addEventListener('change', calculateFunding);
    caipDomain2.addEventListener('change', calculateFunding);

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const pane = document.getElementById(this.dataset.tab);
            if (pane) pane.classList.add('active');
            if (this.dataset.tab === 'chart-tab' && pieChart) {
                setTimeout(() => {
                    pieChart.resize();
                    pieChart.update();
                }, 50);
            }
        });
    });

    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal, .terms-modal, .privacy-modal, .contact-modal');
            if (modal) modal.style.display = 'none';
        });
    });
    window.addEventListener('click', event => {
        if (
            event.target.classList.contains('modal') ||
            event.target.classList.contains('terms-modal') ||
            event.target.classList.contains('privacy-modal') ||
            event.target.classList.contains('contact-modal')
        ) {
            event.target.style.display = 'none';
        }
    });
    pcnModalSearch.addEventListener('input', filterPcnList);
}

function openPcnModal() {
    const selectedRegion = regionSelect.value;
    pcnList.innerHTML = '';
    let filteredPcns = pcnData;
    if (selectedRegion) {
        filteredPcns = pcnData.filter(pcn => pcn.region === selectedRegion);
    }
    filteredPcns.sort((a, b) => a.pcnName.localeCompare(b.pcnName));
    filteredPcns.forEach(pcn => {
        const pcnItem = document.createElement('div');
        pcnItem.className = 'pcn-item';
        pcnItem.textContent = pcn.pcnName;
        pcnItem.dataset.pcnCode = pcn.pcnCode;
        pcnItem.dataset.pcnName = pcn.pcnName;
        pcnItem.addEventListener('click', function() {
            selectPcn(this.dataset.pcnCode, this.dataset.pcnName);
            pcnModal.style.display = 'none';
        });
        pcnList.appendChild(pcnItem);
    });
    pcnModalSearch.value = '';
    pcnModal.style.display = 'block';
}

function filterPcnList(event) {
    const searchText = event.target.value || '';
    const searchLower = searchText.toLowerCase();
    const pcnItems = pcnList.querySelectorAll('.pcn-item');
    
    pcnItems.forEach(item => {
        const pcnName = item.textContent.toLowerCase();
        const pcnCode = item.dataset.pcnCode.toLowerCase();
        if (pcnName.includes(searchLower) || pcnCode.includes(searchLower)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function selectPcn(pcnCode, pcnName) {
    pcnDisplayInput.value = pcnName;
    pcnNameHidden.value = pcnName;
    pcnCodeInput.value = pcnCode;

    const pcn = pcnData.find(p => p.pcnCode === pcnCode);
    if (!pcn) {
        console.error('PCN not found:', pcnCode);
        alert('Error: Selected PCN not found.');
        return;
    }

    let totalRaw2024 = 0;
    let totalRaw2025 = 0;
    let totalAdjusted2024 = 0;
    let totalWeighted2024 = 0;

    pcn.practices.forEach(practice => {
        totalRaw2024 += parseFloat(practice.rawListSize) || 0;
        totalRaw2025 += parseFloat(practice.rawListSize2025) || 0;
        totalAdjusted2024 += parseFloat(practice.adjustedPopulation) || 0;
        totalWeighted2024 += parseFloat(practice.weightedPopulation) || 0;
    });

    console.log('selectPcn:', { pcnCode, pcnName, totalRaw2025, totalRaw2024 });

    if (totalRaw2025 <= 0) {
        console.warn('No valid raw list size for 2025, using fallback.');
        totalRaw2025 = totalRaw2024 > 0 ? totalRaw2024 : 10000;
        alert('Warning: No 2025 population data available. Using 2024/25 data or default.');
    }

    const pcnAdjustmentFactor = totalRaw2024 > 0
        ? (totalAdjusted2024 / totalRaw2024 - 1) * 100
        : DEFAULT_ADJUSTMENT_FACTOR * 100;

    const pcnWeightingFactor = totalRaw2024 > 0
        ? (totalWeighted2024 / totalRaw2024 - 1) * 100
        : DEFAULT_WEIGHTING_FACTOR * 100;

    rawListSizeInput.value = Math.round(totalRaw2025);
    historicalAdjustmentFactorInput.value = pcnAdjustmentFactor.toFixed(2);
    historicalWeightingFactorInput.value = pcnWeightingFactor.toFixed(2);

    savedHistoricalAdjustmentFactor = pcnAdjustmentFactor;
    savedHistoricalWeightingFactor = pcnWeightingFactor;

    console.log('Input Values:', {
        rawListSize: rawListSizeInput.value,
        adjustmentFactor: historicalAdjustmentFactorInput.value,
        weightingFactor: historicalWeightingFactorInput.value
    });

    updateListSizes();
}

function updateListSizes() {
    const rawListSize = parseFloat(rawListSizeInput.value) || 0;
    const useHistoricalFactors = includeHistoricalFactors.checked;

    const historicalAdjustmentFactor = useHistoricalFactors ?
        (parseFloat(savedHistoricalAdjustmentFactor) || DEFAULT_ADJUSTMENT_FACTOR * 100) / 100 :
        0;

    const historicalWeightingFactor = useHistoricalFactors ?
        (parseFloat(savedHistoricalWeightingFactor) || DEFAULT_WEIGHTING_FACTOR * 100) / 100 :
        0;

    const adjustedListSize = rawListSize * (1 + historicalAdjustmentFactor);
    const weightedListSize = rawListSize * (1 + historicalWeightingFactor);

    console.log('updateListSizes:', {
        rawListSize,
        useHistoricalFactors,
        historicalAdjustmentFactor,
        historicalWeightingFactor,
        adjustedListSize,
        weightedListSize
    });

    adjustedListSizeInput.value = Math.round(adjustedListSize);
    weightedListSizeInput.value = Math.round(weightedListSize);
}

function calculateFunding() {
    console.log('calculateFunding called');
    if (!includeCasp || !includeCaip || !caipDomain1 || !caipDomain2 || !calculateBtn) {
        console.error('One or more critical elements not found');
        alert('Calculator error: Missing critical elements. Please check the console.');
        return;
    }

    const rawListSize = parseFloat(rawListSizeInput.value) || 0;
    const adjustedListSize = parseFloat(adjustedListSizeInput.value) || 0;
    const weightedListSize = parseFloat(weightedListSizeInput.value) || 0;
    const careHomeBedCount = parseFloat(careHomeBeds.value) || 0;
    const iifAchievedPoints = parseFloat(iifAchievedPointsInput.value) || 0;
    const includeCorePcnChecked = includeCorePcn.checked;
    const includeExtendedAccessChecked = includeExtendedAccess.checked;
    const includeCareHomeChecked = includeCareHome.checked;
    const includeCaspChecked = includeCasp.checked;
    const includeCaipChecked = includeCaip.checked;
    const caipDomain1Checked = caipDomain1.checked;
    const caipDomain2Checked = caipDomain2.checked;
    const includeArrsChecked = includeArrs.checked;
    const includeIifChecked = includeIif.checked;
    const includeParticipationChecked = includeParticipation.checked;

    const corePcnFunding = includeCorePcnChecked ? 
        (FUNDING_RATES.CORE_PCN_RAW * rawListSize) + (FUNDING_RATES.CORE_PCN_ADJUSTED * adjustedListSize) : 
        0;
        
    const extendedAccessFunding = includeExtendedAccessChecked ? 
        FUNDING_RATES.EXTENDED_ACCESS * adjustedListSize : 
        0;
        
    const careHomeFunding = includeCareHomeChecked ? 
        FUNDING_RATES.CARE_HOME_PREMIUM * careHomeBedCount : 
        0;
        
    const caspFunding = includeCaspChecked ? 
        FUNDING_RATES.CASP * adjustedListSize : 
        0;
        
    const caipFunding = includeCaipChecked ? 
        ((caipDomain1Checked ? FUNDING_RATES.CAIP_PER_DOMAIN : 0) + 
         (caipDomain2Checked ? FUNDING_RATES.CAIP_PER_DOMAIN : 0)) * adjustedListSize : 
        0;
        
    const arrsFunding = includeArrsChecked ?
        FUNDING_RATES.ARRS_RATE * weightedListSize :
        0;

    const iifFunding = includeIifChecked ? 
        FUNDING_RATES.IIF_POINT_VALUE * iifAchievedPoints : 
        0;
        
    const participationFunding = includeParticipationChecked ? 
        FUNDING_RATES.PARTICIPATION_FUND * weightedListSize : 
        0;

    const totalFunding = corePcnFunding + extendedAccessFunding + careHomeFunding + 
                        caspFunding + caipFunding + arrsFunding + iifFunding + participationFunding;

    const monthlyFunding = totalFunding / 12;
    const quarterlyFunding = totalFunding / 4;

    totalFundingSpan.textContent = formatCurrency(totalFunding);
    monthlyFundingSpan.textContent = formatCurrency(monthlyFunding);
    quarterlyFundingSpan.textContent = formatCurrency(quarterlyFunding);

    fundingComponentsTable.innerHTML = '';

    let runningTotal = 0;

    if (includeCorePcnChecked) {
        addFundingComponent(
            'Core PCN Funding',
            corePcnFunding,
            `£${FUNDING_RATES.CORE_PCN_RAW} × ${rawListSize.toLocaleString()} (raw) + ` +
            `£${FUNDING_RATES.CORE_PCN_ADJUSTED} × ${adjustedListSize.toLocaleString()} (adjusted)`
        );
        runningTotal += corePcnFunding;
    }
    
    if (includeExtendedAccessChecked) {
        addFundingComponent(
            'Enhanced Access Payment',
            extendedAccessFunding,
            `£${FUNDING_RATES.EXTENDED_ACCESS} × ${adjustedListSize.toLocaleString()} (adjusted)`
        );
        runningTotal += extendedAccessFunding;
    }
    
    if (includeCareHomeChecked) {
        addFundingComponent(
            'Care Home Premium',
            careHomeFunding,
            `£${FUNDING_RATES.CARE_HOME_PREMIUM} × ${careHomeBedCount.toLocaleString()} (beds)`
        );
        runningTotal += careHomeFunding;
    }
    
    if (includeCaspChecked) {
        addFundingComponent(
            'Capacity and Access Support Payment',
            caspFunding,
            `£${FUNDING_RATES.CASP} × ${adjustedListSize.toLocaleString()} (adjusted)`
        );
        runningTotal += caspFunding;
    }
    
    if (includeCaipChecked) {
        const caipDomains = (caipDomain1Checked ? 1 : 0) + (caipDomain2Checked ? 1 : 0);
        const caipRate = caipDomains * FUNDING_RATES.CAIP_PER_DOMAIN;
        addFundingComponent(
            'Capacity and Access Improvement Payment',
            caipFunding,
            `£${caipRate.toFixed(3)} × ${adjustedListSize.toLocaleString()} (adjusted, ${caipDomains} domain${caipDomains === 1 ? '' : 's'})`
        );
        runningTotal += caipFunding;
    }
    
    if (includeArrsChecked) {
        addFundingComponent(
            'ARRS Funding',
            arrsFunding,
            `£${FUNDING_RATES.ARRS_RATE} × ${weightedListSize.toLocaleString()} (weighted)`
        );
        runningTotal += arrsFunding;
    }
    
    if (includeIifChecked) {
        addFundingComponent(
            'IIF Achievement',
            iifFunding,
            `£${FUNDING_RATES.IIF_POINT_VALUE} × ${iifAchievedPoints.toLocaleString()} (points)`
        );
        runningTotal += iifFunding;
    }
    
    if (includeParticipationChecked) {
        addFundingComponent(
            'Participation Fund (Practice Payment)',
            participationFunding,
            `£${FUNDING_RATES.PARTICIPATION_FUND} × ${weightedListSize.toLocaleString()} (weighted)`
        );
        runningTotal += participationFunding;
    }

    const totalRow = document.createElement('tr');
    const totalNameCell = document.createElement('td');
    totalNameCell.textContent = 'Total';
    totalNameCell.style.fontWeight = 'bold';
    const totalAmountCell = document.createElement('td');
    totalAmountCell.textContent = formatCurrency(runningTotal);
    totalAmountCell.style.fontWeight = 'bold';
    const totalFormulaCell = document.createElement('td');
    totalFormulaCell.textContent = '';
    totalRow.append(totalNameCell, totalAmountCell, totalFormulaCell);
    fundingComponentsTable.appendChild(totalRow);

    updatePracticeBreakdown(
        rawListSize,
        corePcnFunding,
        extendedAccessFunding,
        careHomeFunding,
        caspFunding + caipFunding,
        arrsFunding,
        iifFunding,
        participationFunding,
        includeParticipationChecked
    );

    updateFundingChart(
        includeCorePcnChecked ? corePcnFunding : 0,
        includeExtendedAccessChecked ? extendedAccessFunding : 0,
        includeCareHomeChecked ? careHomeFunding : 0,
        (includeCaspChecked || includeCaipChecked) ? caspFunding + caipFunding : 0,
        includeArrsChecked ? arrsFunding : 0,
        includeIifChecked ? iifFunding : 0,
        includeParticipationChecked ? participationFunding : 0
    );

    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

function addFundingComponent(name, amount, formula) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = name;
    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(amount);
    const formulaCell = document.createElement('td');
    formulaCell.textContent = formula;
    row.append(nameCell, amountCell, formulaCell);
    fundingComponentsTable.appendChild(row);
}

function updatePracticeBreakdown(
    totalRawListSize,
    coreTotal,
    extTotal,
    careTotal,
    capTotal,
    arrsTotal,
    iifTotal,
    partTotal,
    includePartChecked
) {
    const headers = [
        'Practice Name',
        'Core PCN Funding',
        'Enhanced Access Payment',
        'Care Home Premium',
        'Capacity and Access Payment',
        'ARRS Funding',
        'IIF Achievement'
    ];
    if (includePartChecked) {
        headers.push('Participation Fund (Practice Payment)');
    }

    practiceBreakdownTable.closest('table').querySelector('thead').innerHTML = `
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    `;

    practiceBreakdownTable.innerHTML = '';
    const pcn = pcnData.find(p => p.pcnCode === pcnCodeInput.value) || { practices: [] };
    if (pcn.practices.length === 0) {
        practiceBreakdownTable.innerHTML = `
            <tr>
                <td colspan="${headers.length}" style="text-align:center">
                    No practice data available for this PCN.
                </td>
            </tr>
        `;
        return;
    }

    let totalCore = 0;
    let totalExt = 0;
    let totalCare = 0;
    let totalCap = 0;
    let totalArrs = 0;
    let totalIif = 0;
    let totalPart = 0;

    pcn.practices
        .sort((a, b) => a.practiceName.localeCompare(b.practiceName))
        .forEach(practice => {
            const share = practice.rawListSize / totalRawListSize;
            const coreShare = coreTotal * share;
            const extShare = extTotal * share;
            const careShare = careTotal * share;
            const capShare = capTotal * share;
            const arrsShare = arrsTotal * share;
            const iifShare = iifTotal * share;
            const partShare = includePartChecked ? partTotal * share : 0;

            totalCore += coreShare;
            totalExt += extShare;
            totalCare += careShare;
            totalCap += capShare;
            totalArrs += arrsShare;
            totalIif += share;
            if (includePartChecked) {
                totalPart += partShare;
            }

            const cells = [
                practice.practiceName,
                formatCurrency(coreShare),
                formatCurrency(extShare),
                formatCurrency(careShare),
                formatCurrency(capShare),
                formatCurrency(arrsShare),
                formatCurrency(iifShare)
            ];
            if (includePartChecked) {
                cells.push(formatCurrency(partShare));
            }
            practiceBreakdownTable.innerHTML += `
                <tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>
            `;
        });

    const totalCells = [
        'Total',
        formatCurrency(totalCore),
        formatCurrency(totalExt),
        formatCurrency(totalCare),
        formatCurrency(totalCap),
        formatCurrency(totalArrs),
        formatCurrency(totalIif)
    ];
    if (includePartChecked) {
        totalCells.push(formatCurrency(totalPart));
    }

    const totalRow = document.createElement('tr');
    totalCells.forEach((cellContent, index) => {
        const cell = document.createElement('td');
        cell.textContent = cellContent;
        if (index === 0 || index > 0) {
            cell.style.fontWeight = 'bold';
        }
        totalRow.appendChild(cell);
    });
    practiceBreakdownTable.appendChild(totalRow);
}

function updateFundingChart(corePcn, extendedAccess, careHome, capacity, arrs, iif, participation) {
    try {
        const data = {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#005eb8', '#330072', '#ae2573', '#41b6e6', '#78be20', '#00a499', '#ffb81c'
                ]
            }]
        };

        if (corePcn > 0) {
            data.labels.push('Core PCN');
            data.datasets[0].data.push(corePcn);
        }
        if (extendedAccess > 0) {
            data.labels.push('Extended Access');
            data.datasets[0].data.push(extendedAccess);
        }
        if (careHome > 0) {
            data.labels.push('Care Home');
            data.datasets[0].data.push(careHome);
        }
        if (capacity > 0) {
            data.labels.push('Capacity');
            data.datasets[0].data.push(capacity);
        }
        if (arrs > 0) {
            data.labels.push('ARRS');
            data.datasets[0].data.push(arrs);
        }
        if (iif > 0) {
            data.labels.push('IIF');
            data.datasets[0].data.push(iif);
        }
        if (participation > 0) {
            data.labels.push('Participation');
            data.datasets[0].data.push(participation);
        }

        if (!fundingChart.getContext('2d')) {
            throw new Error('Canvas context not available');
        }

        if (pieChart) {
            pieChart.destroy();
        }

        pieChart = new Chart(fundingChart, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.chart.data.labels[context.dataIndex] || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    },
                    datalabels: {
                        color: '#000',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        formatter: (value, context) => {
                            const label = context.chart.data.labels[context.dataIndex] || '';
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            if ((value / total) < 0.05) {
                                return '';
                            }
                            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
                        },
                        anchor: 'end',
                        align: 'end',
                        offset: 30,
                        clamp: true,
                        clip: false
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    } catch (error) {
        console.error('Error updating funding chart:', error);
        alert('Failed to render funding chart. Please check the console for details.');
    }
}

function fillExampleData() {
    regionSelect.value = '';
    pcnDisplayInput.value = 'Example PCN';
    pcnNameHidden.value = 'EXAMPLE';
    pcnCodeInput.value = 'EXAMPLE';
    rawListSizeInput.value = '50000';
    historicalAdjustmentFactorInput.value = '5.00';
    historicalWeightingFactorInput.value = '10.00';
    savedHistoricalAdjustmentFactor = 5.00;
    savedHistoricalWeightingFactor = 10.00;
    updateListSizes();
    careHomeBeds.value = '120';
    iifAchievedPointsInput.value = '45';
    includeHistoricalFactors.checked = true;
    includeCorePcn.checked = true;
    includeExtendedAccess.checked = true;
    includeCareHome.checked = true;
    includeCasp.checked = true;
    includeCaip.checked = true;
    caipDomain1.checked = true;
    caipDomain2.checked = true;
    includeArrs.checked = true;
    includeIif.checked = true;
    includeParticipation.checked = false;
    calculateFunding();
}

function formatCurrency(value) {
    return '£' + value.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}
window.formatCurrency = formatCurrency;

function formatNumber(value) {
    return value.toLocaleString('en-GB');
}

function openTermsModal() {
    termsModal.style.display = 'block';
}

function closeTermsModal() {
    termsModal.style.display = 'none';
}

function openPrivacyModal() {
    privacyModal.style.display = 'block';
}

function closePrivacyModal() {
    privacyModal.style.display = 'none';
}

function openContactModal() {
    contactModal.style.display = 'block';
}

function closeContactModal() {
    contactModal.style.display = 'none';
}