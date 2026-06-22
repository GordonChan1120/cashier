const STOCK_KEY = 'cashier-stock-records';
let editingStockId = null;

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

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function addStockRecord(event) {
  event.preventDefault();

  const item = $('#stockItem').val().trim();
  const quantityAdded = parseInt($('#stockAdded').val(), 10);
  const price = parseFloat($('#stockPrice').val());
  const notes = $('#stockNotes').val().trim();

  if (!item || Number.isNaN(quantityAdded) || quantityAdded <= 0 || Number.isNaN(price) || price < 0) {
    alert('Please enter a valid item, quantity, and price.');
    return;
  }

  const stockRecords = loadStockRecords();
  const existingIndex = stockRecords.findIndex((record) => record.item.toLowerCase() === item.toLowerCase());

  if (existingIndex >= 0) {
    stockRecords[existingIndex].added = (stockRecords[existingIndex].added || 0) + quantityAdded;
    stockRecords[existingIndex].remaining = (stockRecords[existingIndex].remaining || 0) + quantityAdded;
    stockRecords[existingIndex].price = price;
    stockRecords[existingIndex].updatedAt = new Date().toISOString();
    if (notes) {
      stockRecords[existingIndex].notes = notes;
    }
  } else {
    stockRecords.unshift({
      id: crypto.randomUUID(),
      item,
      added: quantityAdded,
      remaining: quantityAdded,
      price,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveStockRecords(stockRecords);
  renderStock();
  $('#stockForm')[0].reset();
}

function deleteStockRecord(id) {
  const stockRecords = loadStockRecords().filter((record) => record.id !== id);
  saveStockRecords(stockRecords);
  renderStock();
}

function startEditingStockRecord(id) {
  editingStockId = id;
  renderStock();
}

function cancelEditingStockRecord() {
  editingStockId = null;
  renderStock();
}

function saveEditedStockRecord(id) {
  const stockRecords = loadStockRecords();
  const index = stockRecords.findIndex((record) => record.id === id);

  if (index === -1) {
    return;
  }

  const item = $(`#edit-stock-item-${id}`).val().trim();
  const added = parseInt($(`#edit-stock-added-${id}`).val(), 10);
  const remaining = parseInt($(`#edit-stock-remaining-${id}`).val(), 10);
  const price = parseFloat($(`#edit-stock-price-${id}`).val());
  const notes = $(`#edit-stock-notes-${id}`).val().trim();

  if (!item || Number.isNaN(added) || added < 0 || Number.isNaN(remaining) || remaining < 0 || Number.isNaN(price) || price < 0) {
    alert('Please enter valid values for item, quantity, remaining stock, and price.');
    return;
  }

  const duplicateIndex = stockRecords.findIndex(
    (record) => record.id !== id && record.item.toLowerCase() === item.toLowerCase()
  );

  if (duplicateIndex !== -1) {
    alert('Another stock record already uses this item name.');
    return;
  }

  if (remaining > added) {
    alert('Remaining stock cannot be greater than the original number.');
    return;
  }

  stockRecords[index] = {
    ...stockRecords[index],
    item,
    added,
    remaining,
    price,
    notes,
    updatedAt: new Date().toISOString()
  };

  saveStockRecords(stockRecords);
  editingStockId = null;
  renderStock();
}

function renderStock() {
  const stockRecords = loadStockRecords();
  const uniqueItemCount = stockRecords.length;
  const remainingStock = stockRecords.reduce((sum, record) => sum + (record.remaining || 0), 0);
  const lowStockCount = stockRecords.filter((record) => (record.remaining || 0) <= 5).length;

  $('#stockCount').text(uniqueItemCount.toLocaleString());
  $('#remainingStock').text(remainingStock.toLocaleString());
  $('#lowStockCount').text(lowStockCount.toLocaleString());

  $('#stockBody').empty();

  stockRecords.forEach((record) => {
    const isEditing = editingStockId === record.id;

    const row = isEditing
      ? `
        <tr class="border-t">
          <td class="px-4 py-3">${formatDate(record.updatedAt || record.createdAt)}</td>
          <td class="px-4 py-3 font-medium">
            <input id="edit-stock-item-${record.id}" value="${record.item}" class="w-full rounded border border-slate-300 px-2 py-1" />
          </td>
          <td class="px-4 py-3">
            <input id="edit-stock-added-${record.id}" type="number" min="0" step="1" value="${record.added || 0}" class="w-20 rounded border border-slate-300 px-2 py-1" />
          </td>
          <td class="px-4 py-3">
            <input id="edit-stock-remaining-${record.id}" type="number" min="0" step="1" value="${record.remaining || 0}" class="w-20 rounded border border-slate-300 px-2 py-1" />
          </td>
          <td class="px-4 py-3">
            <input id="edit-stock-price-${record.id}" type="number" min="0" step="0.01" value="${record.price || 0}" class="w-24 rounded border border-slate-300 px-2 py-1" />
          </td>
          <td class="px-4 py-3">
            <input id="edit-stock-notes-${record.id}" value="${record.notes || ''}" class="w-full rounded border border-slate-300 px-2 py-1" />
          </td>
          <td class="px-4 py-3 space-x-2">
            <button data-id="${record.id}" class="save-edit-stock-btn rounded bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700">Save</button>
            <button class="cancel-edit-stock-btn rounded bg-slate-300 px-3 py-1.5 hover:bg-slate-400">Cancel</button>
          </td>
        </tr>
      `
      : `
        <tr class="border-t">
          <td class="px-4 py-3">${formatDate(record.updatedAt || record.createdAt)}</td>
          <td class="px-4 py-3 font-medium">${record.item}</td>
          <td class="px-4 py-3">${record.added || 0}</td>
          <td class="px-4 py-3">${record.remaining || 0}</td>
          <td class="px-4 py-3">${record.price || 0}</td>
          <td class="px-4 py-3">${record.notes || '-'}</td>
          <td class="px-4 py-3 space-x-2">
            <button data-id="${record.id}" class="edit-stock-btn rounded bg-sky-600 px-3 py-1.5 text-white hover:bg-sky-700">Edit</button>
            <button data-id="${record.id}" class="delete-stock-btn rounded bg-rose-500 px-3 py-1.5 text-white hover:bg-rose-600">Delete</button>
          </td>
        </tr>
      `;

    $('#stockBody').append(row);
  });
}

$(function () {
  $('#stockForm').on('submit', addStockRecord);
  $('#stockBody').on('click', '.delete-stock-btn', function () {
    deleteStockRecord($(this).data('id'));
  });
  $('#stockBody').on('click', '.edit-stock-btn', function () {
    startEditingStockRecord($(this).data('id'));
  });
  $('#stockBody').on('click', '.cancel-edit-stock-btn', function () {
    cancelEditingStockRecord();
  });
  $('#stockBody').on('click', '.save-edit-stock-btn', function () {
    saveEditedStockRecord($(this).data('id'));
  });
  renderStock();
  $(window).on('storage', renderStock);
});
