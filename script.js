const STORAGE_KEY = 'cashier-ledger-records';
const STOCK_KEY = 'cashier-stock-records';
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

function render() {
  const purchase = records.reduce((sum, record) => sum + record.total, 0);
  const quantity = records.reduce((sum, record) => sum + record.quantity, 0);

  $('#purchaseTotal').text(formatCurrency(purchase));
  $('#quantityTotal').text(quantity.toLocaleString());
  $('#recordCount').text(records.length.toLocaleString());
  populateItemOptions();

  $('#recordsBody').empty();

  records.forEach((record) => {
    const row = `
      <tr class="border-t">
        <td class="px-4 py-3">${formatDate(record.createdAt)}</td>
        <td class="px-4 py-3 font-medium">${record.item}</td>
        <td class="px-4 py-3">${record.quantity}</td>
        <td class="px-4 py-3">${formatCurrency(record.price)}</td>
        <td class="px-4 py-3 font-semibold">${formatCurrency(record.total)}</td>
        <td class="px-4 py-3">${record.notes || '-'}</td>
        <td class="px-4 py-3">
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
    Total: record.total,
    Notes: record.notes || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
  XLSX.writeFile(workbook, 'cashier-ledger.xlsx');
}

$(function () {
  $('#recordForm').on('submit', addRecord);
  $('#exportBtn').on('click', exportToExcel);
  $('#recordsBody').on('click', '.delete-btn', function () {
    deleteRecord($(this).data('id'));
  });

  render();
});
