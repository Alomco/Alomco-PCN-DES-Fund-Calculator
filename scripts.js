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
const includeCapacity = document.getElementById('include-capacity');
const useCaipLocal = document.getElementById('use-caip-local');
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
const quarterlyBreakdownTable = document.getElementById('quarterly-breakdown').querySelector('tbody');
const monthlyBreakdownTable = document.getElementById('monthly-breakdown').querySelector('tbody');
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
    CAPACITY_SUPPORT: 3.208,
    ARRS_RATE: 26.631,
    IIF_POINT_VALUE: 198,
    PARTICIPATION_FUND: 1.761
};

let pcnData = [];
let pieChart = null;
let savedHistoricalAdjustmentFactor = DEFAULT_ADJUSTMENT_FACTOR * 100;
let savedHistoricalWeightingFactor = DEFAULT_WEIGHTING_FACTOR * 100;

document.addEventListener('DOMContentLoaded', function() {
    loadPcnDataFromCsv();
    setupEventListeners();
});

async function loadPcnDataFromCsv() {
    try {
        loadingSpinner.style.display = 'block';
        const response = await fetch('./data/pcn_data.csv');
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const csvText = await response.text();
        pcnData = parseCsvData(csvText);
        populateRegions();
        loadingSpinner.style.display = 'none';
    } catch (error) {
        console.error('Error loading PCN data:', error);
        alert('Failed to load PCN data. Please try refreshing the page.');
        loadingSpinner.style.display = 'none';
    }
}

function updateFundingChart(core, extended, care, capacity, arrs, iif, participation) {
    console.log('updateFundingChart called — core:', core, 'extended:', extended, '…');
    // existing chart setup…
  }

function parseCsvData(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    console.log('CSV Headers:', headers);

    const practiceCodeIndex = headers.findIndex(h => h.trim() === 'Practice Code');
    const practiceNameIndex = headers.findIndex(h => h.trim() === 'Practice Name');
    const pcnCodeIndex = headers.findIndex(h => h.trim() === 'PCN Code');
    const pcnNameIndex = headers.findIndex(h => h.trim() === 'PCN Name');
    const regionIndex = headers.findIndex(h => h.trim() === 'Region');
    const rawListSizeIndex = headers.findIndex(h => h.trim() === 'Raw list size 2024/25');
    const adjustedPopulationIndex = headers.findIndex(h => h.trim() === 'Adjusted Population 2024/25');
    const weightedPopulationIndex = headers.findIndex(h => h.trim() === 'weighted population 2024/25');
    const rawListSize2025Index = headers.findIndex(h => h.trim() === 'Raw list size as of 01/01/25');

    console.log('Column Indices:', { rawListSize2025Index });
    if (rawListSize2025Index === -1) {
        console.error('Error: "Raw list size as of 01/01/25" column not found.');
        alert('Error: Missing "Raw list size as of 01/01/25" column in data.');
    }

    const pcns = [];
    const pcnMap = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(',');
        const practiceCode = values[practiceCodeIndex]?.trim() || '';
        const practiceName = values[practiceNameIndex]?.trim() || '';
        const pcnCode = values[pcnCodeIndex]?.trim() || '';
        const pcnName = values[pcnNameIndex]?.trim() || '';
        const region = values[regionIndex]?.trim() || '';
        const rawListSize = parseFloat(values[rawListSizeIndex]) || 0;
        const adjustedPopulation = parseFloat(values[adjustedPopulationIndex]) || 0;
        const weightedPopulation = parseFloat(values[weightedPopulationIndex]) || 0;
        const rawListSize2025 = parseFloat(values[rawListSize2025Index]) || 0;

        if (i <= 3) {
            console.log(`Row ${i} rawListSize2025:`, rawListSize2025);
        }

        const historicalAdjustmentFactor = rawListSize > 0
            ? (adjustedPopulation / rawListSize) - 1
            : DEFAULT_ADJUSTMENT_FACTOR;
        const historicalWeightingFactor = rawListSize > 0
            ? (weightedPopulation / rawListSize) - 1
            : DEFAULT_WEIGHTING_FACTOR;

        if (!pcnCode || !pcnName) continue;

        const practice = {
            practiceCode,
            practiceName,
            rawListSize,
            adjustedPopulation,
            weightedPopulation,
            historicalAdjustmentFactor,
            historicalWeightingFactor,
            rawListSize2025
        };

        if (pcnMap.has(pcnCode)) {
            pcnMap.get(pcnCode).practices.push(practice);
        } else {
            const pcn = {
                pcnCode,
                pcnName,
                region,
                practices: [practice]
            };
            pcns.push(pcn);
            pcnMap.set(pcnCode, pcn);
        }
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
    regionSelect.addEventListener('change', function() {
        pcnDisplayInput.value = '';
        pcnNameHidden.value = '';
        pcnCodeInput.value = '';
    });

    pcnDisplayInput.addEventListener('click', function() {
        openPcnModal();
    });

    calculateBtn.addEventListener('click', calculateFunding);
    fillExampleBtn.addEventListener('click', fillExampleData);
    exportPdfBtn.addEventListener('click', exportAsPdf);
    exportCsvBtn.addEventListener('click', exportAsCsv);

    includeHistoricalFactors.addEventListener('change', function() {
        updateListSizes();
    });

    rawListSizeInput.addEventListener('input', function() {
        updateListSizes();
    });

    historicalAdjustmentFactorInput.addEventListener('input', function() {
        savedHistoricalAdjustmentFactor = parseFloat(this.value) || 0;
        updateListSizes();
    });

    historicalWeightingFactorInput.addEventListener('input', function() {
        savedHistoricalWeightingFactor = parseFloat(this.value) || 0;
        updateListSizes();
    });

    function updateFundingChart(core, extended, care, capacity, arrs, iif, participation) {
        // 1. Grab the canvas
        const canvas = document.getElementById('funding-chart');
        console.log('⚙️ canvas element:', canvas);
        console.log('⚙️ is HTMLCanvasElement?', canvas instanceof HTMLCanvasElement);
        if (!canvas) {
          console.error('❌ Canvas #funding-chart not found!');
          return;
        }
      
        // 2. Get its 2D context
        const ctx = canvas.getContext && canvas.getContext('2d');
        console.log('⚙️ 2D context:', ctx);
        if (!ctx) {
          console.error('❌ Could not get 2D context from canvas');
          return;
        }
      
        // 3. Destroy old chart if there is one
        if (pieChart) {
          pieChart.destroy();
        }
      
        // 4. Create the pie chart
        pieChart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: [
              'Core PCN',
              'Enhanced Access',
              'Care Home',
              'Capacity',
              'ARRS',
              'IIF',
              'Participation'
            ],
            datasets: [{
              data: [core, extended, care, capacity, arrs, iif, participation]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }

function setupEventListeners() {
  // …other listeners…

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // switch active classes on tabs
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      this.classList.add('active');

      // safely activate the matching pane
      const tabId = this.dataset.tab;
      const content = document.getElementById(tabId);
      if (content) content.classList.add('active');

      // if it’s the Chart tab, redraw after it’s visible
      if (tabId === 'chart-tab' && pieChart) {
        setTimeout(() => {
          pieChart.resize();
          pieChart.update();
        }, 50);
      }
    });
  });
}

      

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal, .terms-modal, .privacy-modal, .contact-modal');
            if (modal) modal.style.display = 'none';
        });
    });

    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal') || 
            event.target.classList.contains('terms-modal') || 
            event.target.classList.contains('privacy-modal') || 
            event.target.classList.contains('contact-modal')) {
            event.target.style.display = 'none';
        }
    });

    pcnModalSearch.addEventListener('input', function() {
        filterPcnList(this.value);
    });
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

function filterPcnList(searchText) {
    const pcnItems = pcnList.querySelectorAll('.pcn-item');
    const searchLower = searchText.toLowerCase();
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
    const rawListSize = parseFloat(rawListSizeInput.value) || 0;
    const adjustedListSize = parseFloat(adjustedListSizeInput.value) || 0;
    const weightedListSize = parseFloat(weightedListSizeInput.value) || 0;
    const careHomeBedCount = parseFloat(careHomeBeds.value) || 0;
    const iifAchievedPoints = parseFloat(iifAchievedPointsInput.value) || 0;

    const includeCorePcnChecked = includeCorePcn.checked;
    const includeExtendedAccessChecked = includeExtendedAccess.checked;
    const includeCareHomeChecked = includeCareHome.checked;
    const includeCapacityChecked = includeCapacity.checked;
    const useCaipLocalChecked = useCaipLocal.checked;
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
        
    const capacityFunding = includeCapacityChecked ? 
        FUNDING_RATES.CAPACITY_SUPPORT * (useCaipLocalChecked ? rawListSize : adjustedListSize) : 
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
                         capacityFunding + arrsFunding + iifFunding + participationFunding;

    const monthlyFunding = totalFunding / 12;
    const quarterlyFunding = totalFunding / 4;

    totalFundingSpan.textContent = formatCurrency(totalFunding);
    monthlyFundingSpan.textContent = formatCurrency(monthlyFunding);
    quarterlyFundingSpan.textContent = formatCurrency(quarterlyFunding);

    fundingComponentsTable.innerHTML = '';

    if (includeCorePcnChecked) {
        addFundingComponent(
          'Core PCN Funding',
          corePcnFunding,
          `£${FUNDING_RATES.CORE_PCN_RAW} × ${rawListSize.toLocaleString()} (raw) + ` +
          `£${FUNDING_RATES.CORE_PCN_ADJUSTED} × ${adjustedListSize.toLocaleString()} (adjusted)`
        );
      }
    
      if (includeExtendedAccessChecked) {
        addFundingComponent(
          'Enhanced Access Payment',
          extendedAccessFunding,
          `£${FUNDING_RATES.EXTENDED_ACCESS} × ${adjustedListSize.toLocaleString()} (adjusted)`
        );
      }
      
      if (includeCareHomeChecked) {
        addFundingComponent(
          'Care Home Premium',
          careHomeFunding,
          `£${FUNDING_RATES.CARE_HOME_PREMIUM} × ${careHomeBedCount.toLocaleString()} (beds)`
        );
      }
      
      if (includeCapacityChecked || useCaipLocalChecked) {
        const label = useCaipLocalChecked
          ? 'Local CAIP Payment'
          : 'Capacity and Access Support Payment';
        const listUsed = useCaipLocalChecked ? rawListSize : adjustedListSize;
        addFundingComponent(
          label,
          capacityFunding,
          `£${FUNDING_RATES.CAPACITY_SUPPORT} × ${listUsed.toLocaleString()} ` +
          `(${useCaipLocalChecked ? 'raw' : 'adjusted'})`
        );
      }
      
      if (includeArrsChecked) {
        addFundingComponent(
          'ARRS Funding',
          arrsFunding,
          `£${FUNDING_RATES.ARRS_RATE} × ${weightedListSize.toLocaleString()} (weighted)`
        );
      }
      
      if (includeIifChecked) {
        addFundingComponent(
          'IIF Achievement',
          iifFunding,
          `£${FUNDING_RATES.IIF_POINT_VALUE} × ${iifAchievedPoints.toLocaleString()} (points)`
        );
      }
      
      if (includeParticipationChecked) {
        addFundingComponent(
          'Participation Fund (Practice Payment)',
          participationFunding,
          `£${FUNDING_RATES.PARTICIPATION_FUND} × ${weightedListSize.toLocaleString()} (weighted)`
        );
      }

    updateQuarterlyBreakdown(totalFunding);
    updateMonthlyBreakdown(totalFunding);
    updatePracticeBreakdown(
        rawListSize,
        corePcnFunding,
        extendedAccessFunding,
        careHomeFunding,
        capacityFunding,
        arrsFunding,
        iifFunding,
        participationFunding,
        includeParticipationChecked  // pass the checkbox state
      );
      
      

    updateFundingChart(
        includeCorePcnChecked ? corePcnFunding : 0,
        includeExtendedAccessChecked ? extendedAccessFunding : 0,
        includeCareHomeChecked ? careHomeFunding : 0,
        includeCapacityChecked ? capacityFunding : 0,
        includeArrsChecked ? arrsFunding : 0,
        includeIifChecked ? iifFunding : 0,
        includeParticipationChecked ? participationFunding : 0
    );

    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// 1) Rewrite addFundingComponent to accept a formula string:
function addFundingComponent(name, amount, formula) {
    const row = document.createElement('tr');
  
    // Component Name
    const nameCell = document.createElement('td');
    nameCell.textContent = name;
    row.appendChild(nameCell);
  
    // Amount
    const amountCell = document.createElement('td');
    amountCell.textContent = formatCurrency(amount);
    row.appendChild(amountCell);
  
    // Formula
    const formulaCell = document.createElement('td');
    formulaCell.textContent = formula;
    row.appendChild(formulaCell);
  
    fundingComponentsTable.appendChild(row);
  }
  
  // Core PCN Funding
  if (includeCorePcn.checked) {
    addFundingComponent(
      'Core PCN Funding',
      corePcnFunding,
      `£${FUNDING_RATES.CORE_PCN_RAW} x ${rawListSize.toLocaleString()} (raw) + ` +
      `£${FUNDING_RATES.CORE_PCN_ADJUSTED} x ${adjustedListSize.toLocaleString()} (adjusted)`
    );
  }
  
  // Enhanced Access Payment
  if (includeExtendedAccess.checked) {
    addFundingComponent(
      'Enhanced Access Payment',
      extendedAccessFunding,
      `£${FUNDING_RATES.EXTENDED_ACCESS}  ${adjustedListSize.toLocaleString()} (adjusted)`
    );
  }
  
  // Care Home Premium
  if (includeCareHome.checked) {
    addFundingComponent(
      'Care Home Premium',
      careHomeFunding,
      `£${FUNDING_RATES.CARE_HOME_PREMIUM} x ${careHomeBeds.value || 0} (beds)`
    );
  }
  
  // Capacity & Local CAIP
  if (includeCapacity.checked || useCaipLocal.checked) {
    const label = useCaipLocal.checked
      ? 'Local CAIP Payment'
      : 'Capacity and Access Support Payment';
    const listSizeUsed = useCaipLocal.checked
      ? rawListSize
      : adjustedListSize;
    addFundingComponent(
      label,
      capacityFunding,
      `£${FUNDING_RATES.CAPACITY_SUPPORT} x ${listSizeUsed.toLocaleString()} ` +
      `(${useCaipLocal.checked ? 'raw' : 'adjusted'})`
    );
  }
  
  // ARRS Funding
  if (includeArrs.checked) {
    addFundingComponent(
      'ARRS Funding',
      arrsFunding,
      `£${FUNDING_RATES.ARRS_RATE} x ${weightedListSize.toLocaleString()} (weighted)`
    );
  }
  
  // IIF Achievement
  if (includeIif.checked) {
    addFundingComponent(
      'IIF Achievement',
      iifFunding,
      `£${FUNDING_RATES.IIF_POINT_VALUE} x ${iifAchievedPoints} (points)`
    );
  }
  
  // Participation Fund (Practice Payment)
  if (includeParticipation.checked) {
    addFundingComponent(
      'Participation Fund (Practice Payment)',
      participationFunding,
      `£${FUNDING_RATES.PARTICIPATION_FUND} x ${weightedListSize.toLocaleString()} (weighted)`
    );
  }
  
  

function updateQuarterlyBreakdown(totalFunding) {
    quarterlyBreakdownTable.innerHTML = '';
    const quarterlyAmount = totalFunding / 4;
    for (let i = 1; i <= 4; i++) {
        const row = document.createElement('tr');
        const quarterCell = document.createElement('td');
        quarterCell.textContent = `Quarter ${i}`;
        row.appendChild(quarterCell);
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(quarterlyAmount);
        row.appendChild(amountCell);
        quarterlyBreakdownTable.appendChild(row);
    }
}

function updateMonthlyBreakdown(totalFunding) {
    monthlyBreakdownTable.innerHTML = '';
    const monthlyAmount = totalFunding / 12;
    const months = [
        'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December', 'January', 'February', 'March'
    ];
    for (let i = 0; i < 12; i++) {
        const row = document.createElement('tr');
        const monthCell = document.createElement('td');
        monthCell.textContent = months[i];
        row.appendChild(monthCell);
        const amountCell = document.createElement('td');
        amountCell.textContent = formatCurrency(monthlyAmount);
        row.appendChild(amountCell);
        monthlyBreakdownTable.appendChild(row);
    }
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
    includePartChecked     // <-- new param
  ) {
    // 1) Build the header row
    const headers = [
      'Practice Name',
      'Core PCN Funding',
      'Enhanced Access Payment',
      'Care Home Premium',
      'Capacity and Access Support Payment',
      'ARRS Funding',
      'IIF Achievement'
    ];
    if (includePartChecked) {
      headers.push('Participation Fund (Practice Payment)');
    }
  
    // Render <thead>
    practiceBreakdownTable.closest('table').querySelector('thead').innerHTML = `
      <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    `;
  
    // 2) Populate <tbody>
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
  
    pcn.practices
      .sort((a, b) => a.practiceName.localeCompare(b.practiceName))
      .forEach(practice => {
        const share = practice.rawListSize / totalRawListSize;
        const cells = [
          practice.practiceName,
          formatCurrency(coreTotal * share),
          formatCurrency(extTotal  * share),
          formatCurrency(careTotal * share),
          formatCurrency(capTotal  * share),
          formatCurrency(arrsTotal * share),
          formatCurrency(iifTotal  * share)
        ];
        if (includePartChecked) {
          cells.push(formatCurrency(partTotal * share));
        }
        practiceBreakdownTable.innerHTML += `
          <tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>
        `;
      });
  }
  
  

function updateFundingChart(corePcn, extendedAccess, careHome, capacity, arrs, iif, participation) {
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
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
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
    includeCapacity.checked = true;
    useCaipLocal.checked = false;
    includeArrs.checked = true;
    includeIif.checked = true;
    includeParticipation.checked = false;
    calculateFunding();
}

function exportAsPdf() {
    alert('PDF export functionality will be implemented in a future update.');
}

function exportAsCsv() {
    alert('CSV export functionality will be implemented in a future update.');
}

function formatCurrency(value) {
    return '£' + value.toLocaleString('en-GB', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

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

