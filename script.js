const STORAGE_KEY = 'cashier-ledger-records';
const STOCK_KEY = 'cashier-stock-records';
const DEFAULT_DISCOUNT_KEY = 'cashier-default-discount';
const DEFAULT_RETURN_KEY = 'cashier-default-return';
let records = loadRecords();

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadStockRecords() {
  try {
    return JSON.parse(localStorage.getItem(STOCK_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function saveStockRecords(stockRecords) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(stockRecords));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TWD'
  }).format(value);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function loadDefaultDiscount() {
  try {
    return parseFloat(localStorage.getItem(DEFAULT_DISCOUNT_KEY)) || 0;
  } catch (error) {
    return 0;
  }
}

function saveDefaultDiscount(value) {
  localStorage.setItem(DEFAULT_DISCOUNT_KEY, String(value));
}

function loadDefaultReturn() {
  try {
    return parseFloat(localStorage.getItem(DEFAULT_RETURN_KEY)) || 0;
  } catch (error) {
    return 0;
  }
}

function saveDefaultReturn(value) {
  localStorage.setItem(DEFAULT_RETURN_KEY, String(value));
}

function getDiscountedTotal(record) {
  const baseTotal = Number(record.total) || 0;
  const discount = Number(record.discount) || 0;
  if (!record.useDiscount) {
    return baseTotal;
  }
  return Math.max(baseTotal - discount, 0);
}

function getReturnAdjustedTotal(record) {
  const baseTotal = getDiscountedTotal(record);
  const returnAmount = Number(record.returnAmount) || 0;
  if (!record.useReturn) {
    return baseTotal;
  }
  return Math.max(baseTotal - returnAmount, 0);
}

function populateItemOptions() {
  const stockRecords = loadStockRecords();
  const selectedItem = $('#item').val();
  const options = stockRecords
    .filter((record) => record.item)
    .map((record) => `<option value="${record.item}" ${selectedItem === record.item ? 'selected' : ''}>${record.item}</option>`)
    .join('');

  $('#item').html(`<option value="">Select item</option>${options}`);
  if (!$('#item').val() && options) {
    $('#item').val(stockRecords[0].item);
  }
}

function addRecord(event) {
  event.preventDefault();

  const item = $('#item').val().trim();
  const quantity = parseInt($('#quantity').val(), 10);
  const notes = $('#notes').val().trim();
  const discount = loadDefaultDiscount();
  const returnAmount = loadDefaultReturn();

  if (!item || Number.isNaN(quantity) || quantity <= 0) {
    alert('Please enter valid item and quantity values.');
    return;
  }

  const stockRecords = loadStockRecords();
  const stockIndex = stockRecords.findIndex((entry) => entry.item.toLowerCase() === item.toLowerCase());

  if (stockIndex === -1) {
    alert('Selected item is not available in stock.');
    return;
  }

  const price = parseFloat(stockRecords[stockIndex].price || 0);
  if (Number.isNaN(price) || price < 0) {
    alert('This item does not have a valid price in stock.');
    return;
  }

  if ((stockRecords[stockIndex].remaining || 0) < quantity) {
    alert('Not enough stock remaining for this item.');
    return;
  }

  const newRecord = {
    id: crypto.randomUUID(),
    item,
    quantity,
    price,
    total: quantity * price,
    discount,
    useDiscount: false,
    returnAmount,
    useReturn: false,
    notes,
    createdAt: new Date().toISOString()
  };

  records.unshift(newRecord);
  saveRecords();

  stockRecords[stockIndex].remaining = (stockRecords[stockIndex].remaining || 0) - quantity;
  stockRecords[stockIndex].updatedAt = new Date().toISOString();
  saveStockRecords(stockRecords);

  render();
  $('#recordForm')[0].reset();
  populateItemOptions();
}

function deleteRecord(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  records = records.filter((item) => item.id !== id);
  saveRecords();

  const stockRecords = loadStockRecords();
  const stockIndex = stockRecords.findIndex((entry) => entry.item.toLowerCase() === record.item.toLowerCase());
  if (stockIndex !== -1) {
    stockRecords[stockIndex].remaining = (stockRecords[stockIndex].remaining || 0) + record.quantity;
    stockRecords[stockIndex].updatedAt = new Date().toISOString();
    saveStockRecords(stockRecords);
  }

  render();
}

function setDefaultDiscount() {
  const discount = parseFloat($('#discountValue').val());

  if (Number.isNaN(discount) || discount < 0) {
    alert('Please enter a valid discount amount.');
    return;
  }

  saveDefaultDiscount(discount);
  records = records.map((record) => ({
    ...record,
    discount
  }));
  saveRecords();
  render();
}

function setDefaultReturn() {
  const returnAmount = parseFloat($('#returnValue').val());

  if (Number.isNaN(returnAmount) || returnAmount < 0) {
    alert('Please enter a valid return amount.');
    return;
  }

  saveDefaultReturn(returnAmount);
  records = records.map((record) => ({
    ...record,
    returnAmount
  }));
  saveRecords();
  render();
}

function toggleRecordDiscount(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  record.useDiscount = !record.useDiscount;
  saveRecords();
  render();
}

function toggleRecordReturn(id) {
  const record = records.find((item) => item.id === id);
  if (!record) {
    return;
  }

  record.useReturn = !record.useReturn;
  saveRecords();
  render();
}

function render() {
  const purchase = records.reduce((sum, record) => sum + getReturnAdjustedTotal(record), 0);
  const quantity = records.reduce((sum, record) => sum + record.quantity, 0);

  $('#purchaseTotal').text(formatCurrency(purchase));
  $('#quantityTotal').text(quantity.toLocaleString());
  $('#recordCount').text(records.length.toLocaleString());
  $('#discountValue').val(loadDefaultDiscount());
  $('#returnValue').val(loadDefaultReturn());
  populateItemOptions();

  $('#recordsBody').empty();

  records.forEach((record) => {
    const discountedTotal = getDiscountedTotal(record);
    const finalTotal = getReturnAdjustedTotal(record);
    const discountLabel = record.useDiscount ? formatCurrency(record.discount || 0) : 'Off';
    const returnLabel = record.useReturn ? formatCurrency(record.returnAmount || 0) : 'Off';

    const row = `
      <tr class="border-t">
        <td class="px-4 py-3">${formatDate(record.createdAt)}</td>
        <td class="px-4 py-3 font-medium">${record.item}</td>
        <td class="px-4 py-3">${record.quantity}</td>
        <td class="px-4 py-3">${formatCurrency(record.price)}</td>
        <td class="px-4 py-3 font-semibold">${formatCurrency(finalTotal)}</td>
        <td class="px-4 py-3">${discountLabel}</td>
        <td class="px-4 py-3">${returnLabel}</td>
        <td class="px-4 py-3">${record.notes || '-'}</td>
        <td class="px-4 py-3 space-x-2">
          <button data-id="${record.id}" class="toggle-discount-btn rounded ${record.useDiscount ? 'bg-emerald-600' : 'bg-amber-500'} px-3 py-1.5 text-white hover:opacity-90">
            ${record.useDiscount ? 'Discount On' : 'Discount'}
          </button>
          <button data-id="${record.id}" class="toggle-return-btn rounded ${record.useReturn ? 'bg-violet-600' : 'bg-violet-500'} px-3 py-1.5 text-white hover:opacity-90">
            ${record.useReturn ? 'Return On' : 'Return'}
          </button>
          <button data-id="${record.id}" class="delete-btn rounded bg-rose-500 px-3 py-1.5 text-white hover:bg-rose-600">Delete</button>
        </td>
      </tr>
    `;

    $('#recordsBody').append(row);
  });
}

function exportToExcel() {
  const worksheetData = records.map((record) => ({
    Date: formatDate(record.createdAt),
    Item: record.item,
    Quantity: record.quantity,
    UnitPrice: record.price,
    BaseTotal: record.total,
    DiscountAmount: record.discount || 0,
    DiscountApplied: record.useDiscount ? 'Yes' : 'No',
    ReturnAmount: record.returnAmount || 0,
    ReturnApplied: record.useReturn ? 'Yes' : 'No',
    FinalTotal: getReturnAdjustedTotal(record),
    Notes: record.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
  XLSX.writeFile(workbook, 'cashier-ledger.xlsx');
}

$(function () {
  $('#recordForm').on('submit', addRecord);
  $('#openDiscountModalBtn').on('click', function () {
    $('#discountModal').removeClass('hidden');
    $('#discountValue').val(loadDefaultDiscount());
  });
  $('#closeDiscountModalBtn, #cancelDiscountBtn').on('click', function () {
    $('#discountModal').addClass('hidden');
  });
  $('#applyDiscountBtn').on('click', function () {
    setDefaultDiscount();
    $('#discountModal').addClass('hidden');
  });
  $('#openReturnModalBtn').on('click', function () {
    $('#returnModal').removeClass('hidden');
    $('#returnValue').val(loadDefaultReturn());
  });
  $('#closeReturnModalBtn, #cancelReturnBtn').on('click', function () {
    $('#returnModal').addClass('hidden');
  });
  $('#applyReturnBtn').on('click', function () {
    setDefaultReturn();
    $('#returnModal').addClass('hidden');
  });
  $('#exportBtn').on('click', exportToExcel);
  $('#recordsBody').on('click', '.delete-btn', function () {
    deleteRecord($(this).data('id'));
  });
  $('#recordsBody').on('click', '.toggle-discount-btn', function () {
    toggleRecordDiscount($(this).data('id'));
  });
  $('#recordsBody').on('click', '.toggle-return-btn', function () {
    toggleRecordReturn($(this).data('id'));
  });

  render();
});
