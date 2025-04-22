const regionSelect = document.getElementById('region');
const pcnDisplayInput = document.getElementById('pcn-display');
const pcnNameHidden = document.getElementById('pcn-name-hidden');
const pcnCodeInput = document.getElementById('pcn-code');
const rawInput        = document.getElementById('raw-list-size');
const adjustedPopulationInput = document.getElementById('adjusted-population');
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
const icbNameSelect = document.getElementById('icb-name');
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

document.addEventListener('DOMContentLoaded', function() {
    try {
        loadPcnDataFromCsv();
        setupEventListeners();
        populateIcbNames();
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
        populateIcbNames();
    } catch (error) {
        console.error('Error loading PCN data:', error);
        alert(`Failed to load PCN data: ${error.message}. Please check the console for details and ensure the CSV file is available.`);
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function parseCsvData(csvText) {
    const lines   = csvText.split(/\r?\n/).filter(l => l.trim() !== '');
    const headers = lines[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim());

    // find the columns
    const practiceCodeIndex = headers.findIndex(h => h === 'Practice Code');
    const practiceNameIndex = headers.findIndex(h => h === 'Practice Name');
    const pcnCodeIndex      = headers.findIndex(h => h === 'PCN Code');
    const pcnNameIndex      = headers.findIndex(h => h === 'PCN Name');
    const icbNameIndex      = headers.findIndex(h => h === 'ICB Name');
    const regionIndex       = headers.findIndex(h => h === 'Region');
    const rawIndex          = headers.findIndex(h => h === 'Raw list size');
    const adjIndex          = headers.findIndex(h => h === 'Adjusted Population');

    // abort if any required column is missing
    const missing = [];
    if (practiceCodeIndex < 0) missing.push('Practice Code');
    if (practiceNameIndex < 0) missing.push('Practice Name');
    if (pcnCodeIndex      < 0) missing.push('PCN Code');
    if (pcnNameIndex      < 0) missing.push('PCN Name');
    if (icbNameIndex      < 0) missing.push('ICB Name');
    if (regionIndex       < 0) missing.push('Region');
    if (rawIndex          < 0) missing.push('Raw list size');
    if (adjIndex          < 0) missing.push('Adjusted Population');
    if (missing.length) {
        console.error('Missing required CSV columns:', missing);
        alert('Error: Missing required columns:\n' + missing.join(', '));
        return [];
    }

    const pcns   = [];
    const pcnMap = new Map();

    // iterate rows
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length <= rawIndex) continue;

        // 1) pull out your key identifiers first
        const pcnCode      = values[pcnCodeIndex]?.trim()      || '';
        const pcnName      = values[pcnNameIndex]?.trim()      || '';
        const icbName      = values[icbNameIndex]?.trim()      || '';
        const region       = values[regionIndex]?.trim()       || '';
        // skip rows without a valid PCN
        if (!pcnCode || !pcnName) continue;

        // 2) initialize the PCN entry once
        if (!pcnMap.has(pcnCode)) {
            pcnMap.set(pcnCode, { pcnCode, pcnName, icbName, region, practices: [] });
            pcns.push(pcnMap.get(pcnCode));
        }

        // 3) now parse the practice‐level fields
        const practiceCode = values[practiceCodeIndex]?.trim() || '';
        const practiceName = values[practiceNameIndex]?.trim() || '';
        const raw2025      = parseFloat(values[rawIndex])      || 0;
        const adjPop       = parseFloat(values[adjIndex])      || 0;

        // 4) add this practice
        const practice = {
            practiceCode,
            practiceName,
            raw:        raw2025,
            adjustedPopulation: adjPop
        };
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

function populateIcbNames() {
    const select = document.getElementById('icb-name');

    // 1) Clear any existing options (keep the first "All ICBs..." one)
    while (select.options.length > 1) {
        select.remove(1);
    }

    // 2) Only these approved ICBs:
    const allowedIcbNames = [
      "NHS Bedfordshire, Luton and Milton Keynes Integrated Care Board",
      "NHS Cambridgeshire and Peterborough Integrated Care Board",
      "NHS Hertfordshire and West Essex Integrated Care Board",
      "NHS Mid and South Essex Integrated Care Board",
      "NHS Norfolk and Waveney Integrated Care Board",
      "NHS Suffolk and North East Essex Integrated Care Board",
      "NHS North Central London Integrated Care Board",
      "NHS North East London Integrated Care Board",
      "NHS North West London Integrated Care Board",
      "NHS South East London Integrated Care Board",
      "NHS South West London Integrated Care Board",
      "NHS Birmingham and Solihull Integrated Care Board",
      "NHS Black Country Integrated Care Board",
      "NHS Coventry and Warwickshire Integrated Care Board",
      "NHS Derby and Derbyshire Integrated Care Board",
      "NHS Herefordshire and Worcestershire Integrated Care Board",
      "NHS Leicester, Leicestershire and Rutland Integrated Care Board",
      "NHS Lincolnshire Integrated Care Board",
      "NHS Northamptonshire Integrated Care Board",
      "NHS Nottingham and Nottinghamshire Integrated Care Board",
      "NHS Shropshire, Telford and Wrekin Integrated Care Board",
      "NHS Staffordshire and Stoke-on-Trent Integrated Care Board",
      "NHS Humber and North Yorkshire Integrated Care Board",
      "NHS North East and North Cumbria Integrated Care Board",
      "NHS South Yorkshire Integrated Care Board",
      "NHS West Yorkshire Integrated Care Board",
      "NHS Cheshire and Merseyside Integrated Care Board",
      "NHS Greater Manchester Integrated Care Board",
      "NHS Lancashire and South Cumbria Integrated Care Board",
      "NHS Buckinghamshire, Oxfordshire and Berkshire West Integrated Care Board",
      "NHS Frimley Integrated Care Board",
      "NHS Hampshire and Isle of Wight Integrated Care Board",
      "NHS Kent and Medway Integrated Care Board",
      "NHS Surrey Heartlands ICB",
      "NHS Sussex ICB",
      "NHS Bath and North East Somerset, Swindon and Wiltshire Integrated Care Board",
      "NHS Bristol, North Somerset and South Gloucestershire Integrated Care Board",
      "NHS Cornwall and the Isles of Scilly Integrated Care Board",
      "NHS Devon Integrated Care Board",
      "NHS Dorset Integrated Care Board",
      "NHS Gloucestershire Integrated Care Board",
      "NHS Somerset Integrated Care Board"
    ];


  // 3) Which region (if any) is selected?
  const selectedRegion = regionSelect.value;

  // 4) Build a Set of ICBs that:
  //    • appear in pcnData
  //    • match the selected region (or all if none selected)
  //    • are in your allowedIcbNames list
  const icbSet = new Set();
  pcnData.forEach(pcn => {
    if (
      allowedIcbNames.includes(pcn.icbName) &&
      (!selectedRegion || pcn.region === selectedRegion)
    ) {
      icbSet.add(pcn.icbName);
    }
  });

  // 5) Sort and append
  Array.from(icbSet)
    .sort((a, b) => a.localeCompare(b))
    .forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
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
        populateIcbNames();
    });

    icbNameSelect.addEventListener('change', () => {
        populateIcbNames();
      });

    pcnDisplayInput.addEventListener('click', openPcnModal);
    calculateBtn.addEventListener('click', calculateFunding);

    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', resetData);

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
                raw:      parseFloat(rawInput.value)         || 0,
                adjusted: parseFloat(adjustedPopulationInput.value)  || 0
            },
            ...pcnSelected.practices.map(practice => ({
                name:     practice.practiceName   || 'Unknown Practice',
                raw:      practice.raw    || 0,
                adjusted: practice.adjustedPopulation || 0
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
        const selectedIcb    = icbNameSelect.value;
        pcnList.innerHTML = '';
    
        // Start with all PCNs, then filter by region and/or ICB
        let filteredPcns = pcnData;
        if (selectedRegion) {
          filteredPcns = filteredPcns.filter(pcn => pcn.region === selectedRegion);
        }
        if (selectedIcb) {
          filteredPcns = filteredPcns.filter(pcn => pcn.icbName === selectedIcb);
        }
    
        // Now sort the final list
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
    pcnNameHidden.value   = pcnName;
    pcnCodeInput.value    = pcnCode;

    const pcn = pcnData.find(p => p.pcnCode === pcnCode);
    if (!pcn) {
        console.error('PCN not found:', pcnCode);
        alert('Error: Selected PCN not found.');
        return;
    }

    let totalRaw = 0;
    let totalAdj = 0;

    pcn.practices.forEach(practice => {
        totalRaw += parseFloat(practice.raw)       || 0;
        totalAdj += parseFloat(practice.adjustedPopulation)|| 0;
    });

    rawInput.value         = Math.round(totalRaw);
    adjustedPopulationInput.value  = Math.round(totalAdj);
}


function calculateFunding() {
    console.log('calculateFunding called');
    if (!includeCasp || !includeCaip || !caipDomain1 || !caipDomain2 || !calculateBtn) {
        console.error('One or more critical elements not found');
        alert('Calculator error: Missing critical elements. Please check the console.');
        return;
    }

    const raw      = parseFloat(rawInput.value)         || 0;
    const adjusted = parseFloat(adjustedPopulationInput.value) || 0;
    const careHomeBedCount = parseFloat(careHomeBeds.value)    || 0;
    const iifPoints        = parseFloat(iifAchievedPointsInput.value) || 0;
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

    // Core PCN funding: raw + adjusted
    const coreFunding = includeCorePcn.checked
        ? FUNDING_RATES.CORE_PCN_RAW      * raw
          + FUNDING_RATES.CORE_PCN_ADJUSTED * adjusted
        : 0;
        
    // Enhanced access and CASP both use adjusted
    const extendedAccess = includeExtendedAccess.checked
        ? FUNDING_RATES.EXTENDED_ACCESS * adjusted
        : 0;
        
    const careHomeFunding = includeCareHomeChecked ? 
        FUNDING_RATES.CARE_HOME_PREMIUM * careHomeBedCount : 
        0;
        
    const casp = includeCasp.checked
        ? FUNDING_RATES.CASP * adjusted
        : 0;
        
    // CAIP still per domain on adjusted
    const caipDomains = (caipDomain1.checked ? 1 : 0)
                       + (caipDomain2.checked ? 1 : 0);
    const caip = includeCaip.checked
        ? caipDomains * FUNDING_RATES.CAIP_PER_DOMAIN * adjusted
        : 0;
        
    // ARRS and Participation now use adjusted instead of weighted
    const arrs = includeArrs.checked
        ? FUNDING_RATES.ARRS_RATE * adjusted
        : 0;

        const iifFunding = includeIifChecked
        ? FUNDING_RATES.IIF_POINT_VALUE * iifPoints
        : 0;
        
    const participation = includeParticipation.checked
        ? FUNDING_RATES.PARTICIPATION_FUND * adjusted
        : 0;

    // sum all components
    const totalFunding = coreFunding +
                         extendedAccess +
                         casp +
                         caip +
                         arrs +
                         (includeIif.checked ? FUNDING_RATES.IIF_POINT_VALUE * iifPoints : 0) +
                         (includeCareHome.checked ? FUNDING_RATES.CARE_HOME_PREMIUM * careHomeBedCount : 0) +
                         (includeParticipation.checked ? participation : 0);

    const monthlyFunding = totalFunding / 12;
    const quarterlyFunding = totalFunding / 4;

    totalFundingSpan.textContent     = formatCurrency(totalFunding);
    monthlyFundingSpan.textContent   = formatCurrency(totalFunding / 12);
    quarterlyFundingSpan.textContent = formatCurrency(totalFunding / 4);

    fundingComponentsTable.innerHTML = '';

    let runningTotal = 0;

    if (includeCorePcnChecked) {
        addFundingComponent(
            'Core PCN Funding',
            coreFunding,
            `£${FUNDING_RATES.CORE_PCN_RAW} × ${raw.toLocaleString()} (raw) + ` +
            `£${FUNDING_RATES.CORE_PCN_ADJUSTED} × ${adjusted.toLocaleString()} (adjusted)`
        );
        runningTotal += coreFunding;
    }
    
    if (includeExtendedAccessChecked) {
        addFundingComponent(
            'Enhanced Access Payment',
            extendedAccess,
            `£${FUNDING_RATES.EXTENDED_ACCESS} × ${adjusted.toLocaleString()} (adjusted)`
        );
        runningTotal += extendedAccess;
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
            casp,
            `£${FUNDING_RATES.CASP} × ${adjusted.toLocaleString()} (adjusted)`
        );
        runningTotal += casp;
    }
    
    if (includeCaipChecked) {
        const caipDomains = (caipDomain1Checked ? 1 : 0) + (caipDomain2Checked ? 1 : 0);
        const caipRate = caipDomains * FUNDING_RATES.CAIP_PER_DOMAIN;
        addFundingComponent(
            'Capacity and Access Improvement Payment',
            caip,
            `£${caipRate.toFixed(3)} × ${adjusted.toLocaleString()} (adjusted, ${caipDomains} domain${caipDomains === 1 ? '' : 's'})`
        );
        runningTotal += caip;
    }
    
    if (includeArrsChecked) {
        addFundingComponent(
            'ARRS Funding',
            arrs,
            `£${FUNDING_RATES.ARRS_RATE} × ${adjusted.toLocaleString()} (weighted)`
        );
        runningTotal += arrs;
    }
    
    if (includeIifChecked) {
        addFundingComponent(
            'IIF Achievement',
            iifFunding,
            `£${FUNDING_RATES.IIF_POINT_VALUE} × ${iifPoints.toLocaleString()} (points)`
        );
        runningTotal += iifFunding;
    }
    
    if (includeParticipationChecked) {
        addFundingComponent(
            'Participation Fund (Practice Payment)',
            participation,
            `£${FUNDING_RATES.PARTICIPATION_FUND} × ${adjusted.toLocaleString()} (weighted)`
        );
        runningTotal += participation;
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
        raw,
        coreFunding,
        extendedAccess,
        careHomeFunding,
        casp + caip,
        arrs,
        iifFunding,
        participation,
        includeParticipationChecked
    );

    updateFundingChart(
        includeCorePcnChecked ? coreFunding : 0,
        includeExtendedAccessChecked ? extendedAccess : 0,
        includeCareHomeChecked ? careHomeFunding : 0,
        (includeCaspChecked || includeCaipChecked) ? casp + caip : 0,
        includeArrsChecked ? arrs : 0,
        includeIifChecked ? iifFunding : 0,
        includeParticipationChecked ? participation : 0
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
    totalraw,
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
            const share = practice.raw / totalraw;
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

function resetData() {
    // Clear all inputs
    regionSelect.value             = '';
    icbNameSelect.value            = '';
    pcnDisplayInput.value          = '';
    pcnNameHidden.value            = '';
    pcnCodeInput.value             = '';
    rawInput.value         = '';
    adjustedPopulationInput.value  = '';
    careHomeBeds.value             = '';
    iifAchievedPointsInput.value   = '';
    
    // Uncheck all the funding checkboxes
    [
      includeCorePcn,
      includeExtendedAccess,
      includeCareHome,
      includeCasp,
      includeCaip,
      caipDomain1,
      caipDomain2,
      includeArrs,
      includeIif,
      includeParticipation
    ].forEach(cb => cb.checked = false);
  
    // Hide/reset results
    totalFundingSpan.textContent     = '£0.00';
    monthlyFundingSpan.textContent   = '£0.00';
    quarterlyFundingSpan.textContent = '£0.00';
    fundingComponentsTable.innerHTML = '';
    practiceBreakdownTable.innerHTML = '';
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    resultsContainer.style.display = 'none';
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