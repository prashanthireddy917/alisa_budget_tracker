let transactions = [];
let recurringPayments = [];

/* Helper */
function getElement(id) {
  return document.getElementById(id);
}

/* Forms */
const incomeForm = getElement("incomeForm");
const expenseForm = getElement("expenseForm");
const paymentForm = getElement("paymentForm");
const recurringForm = getElement("recurringForm");

/* Dashboard cards */
const totalIncomeCard = getElement("totalIncome");
const totalHoursCard = getElement("totalHours");
const totalExpensesCard = getElement("totalExpenses");
const remainingBalanceCard = getElement("remainingBalance");

/* Main sections */
const historyList = getElement("historyList");
const selectedMonthInput = getElement("selectedMonth");

/* Analysis cards */
const averageDailySpendingText = getElement("averageDailySpending");
const averageHourlyIncomeText = getElement("averageHourlyIncome");
const savingsRateText = getElement("savingsRate");
const highestCategoryText = getElement("highestCategory");
const categoryChart = getElement("categoryChart");

/* Payment summary */
const totalPaymentsText = getElement("totalPayments");
const paidPaymentsText = getElement("paidPayments");
const unpaidPaymentsText = getElement("unpaidPayments");

/* Reminders and notifications */
const reminderList = getElement("reminderList");
const enableNotificationsButton = getElement("enableNotificationsButton");

/* Recurring list */
const recurringList = getElement("recurringList");

/* Backup buttons */
const exportButton = getElement("exportButton");
const importFile = getElement("importFile");
const clearButton = getElement("clearButton");

/* Navigation */
const navButtons = document.querySelectorAll(".nav-button");
const pageSections = document.querySelectorAll(".page-section");

/* App message */
const appMessage = getElement("appMessage");

/* Custom confirmation popup */
const confirmPopup = getElement("confirmPopup");
const confirmTitle = getElement("confirmTitle");
const confirmMessage = getElement("confirmMessage");
const confirmCancelButton = getElement("confirmCancelButton");
const confirmYesButton = getElement("confirmYesButton");

/* Local date helper */
function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

/* Current date and month */
const today = new Date();
const todayDate = getLocalDateString(today);
const currentMonth = todayDate.slice(0, 7);

/* Set current month and dates automatically */
if (selectedMonthInput) {
  selectedMonthInput.value = currentMonth;
}

if (getElement("incomeDate")) {
  getElement("incomeDate").value = todayDate;
}

if (getElement("expenseDate")) {
  getElement("expenseDate").value = todayDate;
}

if (getElement("paymentMonth")) {
  getElement("paymentMonth").value = currentMonth;
}

/* Load saved data */
const savedTransactions = localStorage.getItem("transactions");
const savedRecurringPayments = localStorage.getItem("recurringPayments");

if (savedTransactions !== null) {
  try {
    transactions = JSON.parse(savedTransactions);
  } catch {
    transactions = [];
  }
}

if (savedRecurringPayments !== null) {
  try {
    recurringPayments = JSON.parse(savedRecurringPayments);
  } catch {
    recurringPayments = [];
  }
}

/* Save data */
function saveTransactions() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
}

function saveRecurringPayments() {
  localStorage.setItem("recurringPayments", JSON.stringify(recurringPayments));
}

/* Show bottom message */
function showMessage(message) {
  if (!appMessage) {
    alert(message);
    return;
  }

  appMessage.textContent = message;
  appMessage.classList.add("show");

  setTimeout(function() {
    appMessage.classList.remove("show");
  }, 2000);
}

/* Custom confirmation popup */
function showConfirmPopup(title, message, yesButtonText) {
  return new Promise(function(resolve) {
    if (
      !confirmPopup ||
      !confirmTitle ||
      !confirmMessage ||
      !confirmCancelButton ||
      !confirmYesButton
    ) {
      const normalConfirm = confirm(message);
      resolve(normalConfirm);
      return;
    }

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmYesButton.textContent = yesButtonText;

    confirmPopup.classList.add("show");

    function closePopup(answer) {
      confirmPopup.classList.remove("show");

      confirmCancelButton.removeEventListener("click", cancelClick);
      confirmYesButton.removeEventListener("click", yesClick);

      resolve(answer);
    }

    function cancelClick() {
      closePopup(false);
    }

    function yesClick() {
      closePopup(true);
    }

    confirmCancelButton.addEventListener("click", cancelClick);
    confirmYesButton.addEventListener("click", yesClick);
  });
}

/* Notifications permission */
function requestNotificationPermission() {
  if (!("Notification" in window)) {
    showMessage("❌ Notifications are not supported here.");
    return;
  }

  Notification.requestPermission().then(function(permission) {
    if (permission === "granted") {
      showMessage("✅ Notifications enabled!");

      new Notification("Alisa’s Budget Tracker", {
        body: "Payment reminders are now enabled."
      });

      updatePaymentReminders();
    } else {
      showMessage("❌ Notifications were not allowed.");
    }
  });
}

/* Send notification every 12 hours */
function sendPaymentNotification(reminder) {
  if (!("Notification" in window)) {
    return;
  }

  if (Notification.permission !== "granted") {
    return;
  }

  const now = Date.now();

  const twelveHours = 12 * 60 * 60 * 1000;

  const notificationKey =
    "lastNotification_" +
    reminder.name +
    "_" +
    reminder.category +
    "_" +
    reminder.dueDateKey;

  const lastNotificationTime = localStorage.getItem(notificationKey);

  if (lastNotificationTime !== null) {
    const timePassed = now - Number(lastNotificationTime);

    if (timePassed < twelveHours) {
      return;
    }
  }

  new Notification("Payment Reminder", {
    body:
      reminder.name +
      " is " +
      reminder.message +
      " • $" +
      Number(reminder.amount).toFixed(2)
  });

  localStorage.setItem(notificationKey, now);
}

/* Get selected month */
function getSelectedMonthValue() {
  if (selectedMonthInput) {
    return selectedMonthInput.value || currentMonth;
  }

  return currentMonth;
}

/* Get transactions for selected month */
function getSelectedMonthTransactions() {
  const selectedMonth = getSelectedMonthValue();

  return transactions
    .map(function(transaction, index) {
      return {
        ...transaction,
        originalIndex: index
      };
    })
    .filter(function(transaction) {
      return transaction.date && transaction.date.startsWith(selectedMonth);
    });
}

/* Get recurring due date for selected month */
function getRecurringDueDate(dueDay) {
  const selectedMonth = getSelectedMonthValue();

  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7)) - 1;

  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const safeDueDay = Math.min(Number(dueDay), lastDayOfMonth);

  const dueDate = new Date(year, month, safeDueDay);
  dueDate.setHours(0, 0, 0, 0);

  return {
    dueDate: dueDate,
    year: year,
    month: month,
    dueDay: safeDueDay
  };
}

/* Check if recurring payment is already paid this month */
function isRecurringPaidThisMonth(payment) {
  const selectedMonth = getSelectedMonthValue();

  return transactions.some(function(transaction) {
    return (
      transaction.type === "payment" &&
      transaction.status === "Paid" &&
      transaction.date === selectedMonth &&
      transaction.paymentName === payment.name &&
      transaction.category === payment.category
    );
  });
}

/* Update dashboard */
function updateDashboard() {
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalHours = 0;

  const monthlyTransactions = getSelectedMonthTransactions();

  monthlyTransactions.forEach(function(transaction) {
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      totalIncome = totalIncome + amount;
      totalHours = totalHours + (Number(transaction.hoursWorked) || 0);
    }

    if (transaction.type === "expense" || transaction.type === "payment") {
      totalExpenses = totalExpenses + amount;
    }
  });

  const remainingBalance = totalIncome - totalExpenses;

  if (totalIncomeCard) {
    totalIncomeCard.textContent = "$" + totalIncome.toFixed(2);
  }

  if (totalExpensesCard) {
    totalExpensesCard.textContent = "$" + totalExpenses.toFixed(2);
  }

  if (remainingBalanceCard) {
    remainingBalanceCard.textContent = "$" + remainingBalance.toFixed(2);
  }

  if (totalHoursCard) {
    totalHoursCard.textContent = totalHours;
  }
}

/* Update history */
function updateHistory() {
  if (!historyList) {
    return;
  }

  historyList.innerHTML = "";

  const monthlyTransactions = getSelectedMonthTransactions();

  if (monthlyTransactions.length === 0) {
    historyList.innerHTML = "<p>No transactions for this month.</p>";
    return;
  }

  monthlyTransactions.forEach(function(transaction) {
    const item = document.createElement("div");
    item.classList.add("history-item");

    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      item.innerHTML = `
        <div class="history-top">
          <span class="history-income">Income - ${transaction.workType}</span>
          <span>+$${amount.toFixed(2)}</span>
        </div>

        <p class="history-note">
          Date: ${transaction.date} | Hours: ${transaction.hoursWorked} | Note: ${transaction.note}
        </p>

        <button class="delete-button" onclick="deleteTransaction(${transaction.originalIndex})">
          Delete
        </button>
      `;
    }

    if (transaction.type === "expense") {
      item.innerHTML = `
        <div class="history-top">
          <span class="history-expense">Expense - ${transaction.category}</span>
          <span>-$${amount.toFixed(2)}</span>
        </div>

        <p class="history-note">
          Date: ${transaction.date} | Payment: ${transaction.paymentMethod} | Note: ${transaction.note}
        </p>

        <button class="delete-button" onclick="deleteTransaction(${transaction.originalIndex})">
          Delete
        </button>
      `;
    }

    if (transaction.type === "payment") {
      let paidButton = "";

      if (transaction.status === "Unpaid") {
        paidButton = `
          <button class="paid-button" onclick="markPaymentPaid(${transaction.originalIndex})">
            Mark as Paid
          </button>
        `;
      }

      item.innerHTML = `
        <div class="history-top">
          <span class="history-expense">Payment - ${transaction.paymentName}</span>
          <span>-$${amount.toFixed(2)}</span>
        </div>

        <p class="history-note">
          Month: ${transaction.date} | Category: ${transaction.category} | Due Day: ${transaction.dueDay} | Status: ${transaction.status} | Note: ${transaction.note}
        </p>

        ${paidButton}

        <button class="delete-button" onclick="deleteTransaction(${transaction.originalIndex})">
          Delete
        </button>
      `;
    }

    historyList.appendChild(item);
  });
}

/* Update analysis */
function updateAnalysis() {
  const monthlyTransactions = getSelectedMonthTransactions();

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalHours = 0;
  let categoryTotals = {};

  monthlyTransactions.forEach(function(transaction) {
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      totalIncome = totalIncome + amount;
      totalHours = totalHours + (Number(transaction.hoursWorked) || 0);
    }

    if (transaction.type === "expense" || transaction.type === "payment") {
      totalExpenses = totalExpenses + amount;

      if (categoryTotals[transaction.category] === undefined) {
        categoryTotals[transaction.category] = 0;
      }

      categoryTotals[transaction.category] =
        categoryTotals[transaction.category] + amount;
    }
  });

  const selectedMonth = getSelectedMonthValue();
  const year = Number(selectedMonth.slice(0, 4));
  const month = Number(selectedMonth.slice(5, 7));
  const daysInMonth = new Date(year, month, 0).getDate();

  const averageDailySpending = totalExpenses / daysInMonth;

  let averageHourlyIncome = 0;

  if (totalHours > 0) {
    averageHourlyIncome = totalIncome / totalHours;
  }

  let savingsRate = 0;

  if (totalIncome > 0) {
    savingsRate = ((totalIncome - totalExpenses) / totalIncome) * 100;
  }

  let highestCategory = "None";
  let highestAmount = 0;

  for (let category in categoryTotals) {
    if (categoryTotals[category] > highestAmount) {
      highestAmount = categoryTotals[category];
      highestCategory = category;
    }
  }

  if (averageDailySpendingText) {
    averageDailySpendingText.textContent = "$" + averageDailySpending.toFixed(2);
  }

  if (averageHourlyIncomeText) {
    averageHourlyIncomeText.textContent = "$" + averageHourlyIncome.toFixed(2);
  }

  if (savingsRateText) {
    savingsRateText.textContent = savingsRate.toFixed(1) + "%";
  }

  if (highestCategoryText) {
    highestCategoryText.textContent = highestCategory;
  }

  updateCategoryChart(categoryTotals, highestAmount);
}

/* Update category chart */
function updateCategoryChart(categoryTotals, highestAmount) {
  if (!categoryChart) {
    return;
  }

  categoryChart.innerHTML = "";

  const categories = Object.keys(categoryTotals);

  if (categories.length === 0) {
    categoryChart.innerHTML = "<p>No expenses yet.</p>";
    return;
  }

  categories.forEach(function(category) {
    const amount = Number(categoryTotals[category]) || 0;

    let percentage = 0;

    if (highestAmount > 0) {
      percentage = (amount / highestAmount) * 100;
    }

    const row = document.createElement("div");
    row.classList.add("chart-row");

    row.innerHTML = `
      <div class="chart-label">
        <span>${category}</span>
        <span>$${amount.toFixed(2)}</span>
      </div>

      <div class="chart-bar">
        <div class="chart-fill" style="width: ${percentage}%"></div>
      </div>
    `;

    categoryChart.appendChild(row);
  });
}

/* Update payment summary */
function updatePaymentSummary() {
  let totalPayments = 0;
  let paidPayments = 0;
  let unpaidPayments = 0;

  const monthlyTransactions = getSelectedMonthTransactions();

  monthlyTransactions.forEach(function(transaction) {
    if (transaction.type === "payment") {
      const amount = Number(transaction.amount) || 0;

      totalPayments = totalPayments + amount;

      if (transaction.status === "Paid") {
        paidPayments = paidPayments + amount;
      }

      if (transaction.status === "Unpaid") {
        unpaidPayments = unpaidPayments + amount;
      }
    }
  });

  if (totalPaymentsText) {
    totalPaymentsText.textContent = "$" + totalPayments.toFixed(2);
  }

  if (paidPaymentsText) {
    paidPaymentsText.textContent = "$" + paidPayments.toFixed(2);
  }

  if (unpaidPaymentsText) {
    unpaidPaymentsText.textContent = "$" + unpaidPayments.toFixed(2);
  }
}

/* Update recurring payments list */
function updateRecurringList() {
  if (!recurringList) {
    return;
  }

  recurringList.innerHTML = "";

  if (recurringPayments.length === 0) {
    recurringList.innerHTML = "<p>No recurring payments yet.</p>";
    return;
  }

  recurringPayments.forEach(function(payment, index) {
    const item = document.createElement("div");
    item.classList.add("history-item");

    const paidThisMonth = isRecurringPaidThisMonth(payment);

    let paidText = "Unpaid this month";
    let paidButton = `
      <button class="paid-button" onclick="markRecurringPaid(${index})">
        Mark Paid This Month
      </button>
    `;

    if (paidThisMonth) {
      paidText = "Paid this month";
      paidButton = "";
    }

    item.innerHTML = `
      <div class="history-top">
        <span class="history-expense">Recurring - ${payment.name}</span>
        <span>$${Number(payment.amount).toFixed(2)}</span>
      </div>

      <p class="history-note">
        Category: ${payment.category} | Due Day: ${payment.dueDay} | ${paidText} | Note: ${payment.note}
      </p>

      ${paidButton}

      <button class="stop-button" onclick="stopRecurringPayment(${index})">
        Stop
      </button>
    `;

    recurringList.appendChild(item);
  });
}

/* Mark recurring payment paid for this month */
function markRecurringPaid(index) {
  const payment = recurringPayments[index];

  if (!payment) {
    return;
  }

  if (isRecurringPaidThisMonth(payment)) {
    showMessage("✅ Already marked paid this month.");
    return;
  }

  const paymentTransaction = {
    type: "payment",
    date: getSelectedMonthValue(),
    paymentName: payment.name,
    category: payment.category,
    amount: Number(payment.amount) || 0,
    dueDay: payment.dueDay,
    status: "Paid",
    note: payment.note || "Recurring payment"
  };

  transactions.push(paymentTransaction);

  saveTransactions();
  updateApp();

  showMessage("✅ Recurring payment marked paid!");
}

/* Stop recurring payment */
async function stopRecurringPayment(index) {
  const confirmStop = await showConfirmPopup(
    "Stop recurring payment?",
    "This payment will stop repeating every month.",
    "Stop"
  );

  if (confirmStop === true) {
    recurringPayments.splice(index, 1);

    saveRecurringPayments();
    updateApp();

    showMessage("🛑 Recurring payment stopped!");
  }
}

/* Update payment reminders */
function updatePaymentReminders() {
  if (!reminderList) {
    return;
  }

  reminderList.innerHTML = "";

  const monthlyTransactions = getSelectedMonthTransactions();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let reminders = [];

  /* Manual unpaid payments */
  monthlyTransactions.forEach(function(transaction) {
    if (transaction.type === "payment" && transaction.status === "Unpaid") {
      const dueDay = Number(transaction.dueDay);

      if (!dueDay) {
        return;
      }

      const selectedMonth = transaction.date;
      const year = Number(selectedMonth.slice(0, 4));
      const month = Number(selectedMonth.slice(5, 7)) - 1;

      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const safeDueDay = Math.min(dueDay, lastDayOfMonth);

      const dueDate = new Date(year, month, safeDueDay);
      dueDate.setHours(0, 0, 0, 0);

      const differenceInTime = dueDate - todayStart;
      const daysLeft = Math.ceil(differenceInTime / (1000 * 60 * 60 * 24));

      if (daysLeft >= 0 && daysLeft <= 4) {
        let message = "";

        if (daysLeft === 0) {
          message = "due today";
        } else if (daysLeft === 1) {
          message = "due tomorrow";
        } else {
          message = "due in " + daysLeft + " days";
        }

        reminders.push({
          name: transaction.paymentName,
          category: transaction.category,
          amount: Number(transaction.amount) || 0,
          daysLeft: daysLeft,
          message: message,
          dueDateKey: year + "-" + (month + 1) + "-" + safeDueDay
        });
      }
    }
  });

  /* Recurring unpaid payments */
  recurringPayments.forEach(function(payment) {
    const paidThisMonth = isRecurringPaidThisMonth(payment);

    if (paidThisMonth) {
      return;
    }

    const dueInfo = getRecurringDueDate(payment.dueDay);

    const differenceInTime = dueInfo.dueDate - todayStart;
    const daysLeft = Math.ceil(differenceInTime / (1000 * 60 * 60 * 24));

    if (daysLeft >= 0 && daysLeft <= 4) {
      let message = "";

      if (daysLeft === 0) {
        message = "due today";
      } else if (daysLeft === 1) {
        message = "due tomorrow";
      } else {
        message = "due in " + daysLeft + " days";
      }

      reminders.push({
        name: payment.name,
        category: payment.category,
        amount: Number(payment.amount) || 0,
        daysLeft: daysLeft,
        message: message,
        dueDateKey:
          dueInfo.year + "-" + (dueInfo.month + 1) + "-" + dueInfo.dueDay
      });
    }
  });

  if (reminders.length === 0) {
    reminderList.innerHTML = "<p>No upcoming payment reminders.</p>";
    return;
  }

  reminders.forEach(function(reminder) {
    const item = document.createElement("div");
    item.classList.add("reminder-item");

    item.innerHTML = `
      <strong>${reminder.name}</strong>
      <p>${reminder.message} • ${reminder.category} • $${reminder.amount.toFixed(2)}</p>
    `;

    reminderList.appendChild(item);

    sendPaymentNotification(reminder);
  });
}

/* Update whole app */
function updateApp() {
  updateDashboard();
  updateHistory();
  updateAnalysis();
  updatePaymentSummary();
  updatePaymentReminders();
  updateRecurringList();
}

/* Add income */
if (incomeForm) {
  incomeForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const hoursWorked = Number(getElement("hoursWorked").value) || 0;
    const hourlyRate = Number(getElement("hourlyRate").value) || 0;
    const tips = Number(getElement("tips").value) || 0;
    const otherIncome = Number(getElement("otherIncome").value) || 0;

    const incomeAmount = hoursWorked * hourlyRate + tips + otherIncome;

    const incomeTransaction = {
      type: "income",
      date: getElement("incomeDate").value,
      workType: getElement("workType").value || "Work",
      hoursWorked: hoursWorked,
      hourlyRate: hourlyRate,
      tips: tips,
      otherIncome: otherIncome,
      amount: incomeAmount,
      note: getElement("incomeNote").value || "No note"
    };

    transactions.push(incomeTransaction);

    saveTransactions();
    updateApp();

    incomeForm.reset();

    if (getElement("incomeDate")) {
      getElement("incomeDate").value = todayDate;
    }

    showMessage("✅ Income added!");
  });
}

/* Add expense */
if (expenseForm) {
  expenseForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const expenseTransaction = {
      type: "expense",
      date: getElement("expenseDate").value,
      category: getElement("expenseCategory").value,
      amount: Number(getElement("expenseAmount").value) || 0,
      paymentMethod: getElement("paymentMethod").value,
      note: getElement("expenseNote").value || "No note"
    };

    transactions.push(expenseTransaction);

    saveTransactions();
    updateApp();

    expenseForm.reset();

    if (getElement("expenseDate")) {
      getElement("expenseDate").value = todayDate;
    }

    showMessage("✅ Expense added!");
  });
}

/* Add manual monthly payment */
if (paymentForm) {
  paymentForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const paymentTransaction = {
      type: "payment",
      date: getElement("paymentMonth").value,
      paymentName: getElement("paymentName").value || "Monthly Payment",
      category: getElement("paymentCategory").value,
      amount: Number(getElement("paymentAmount").value) || 0,
      dueDay: getElement("paymentDueDay").value || "No due day",
      status: getElement("paymentStatus").value,
      note: getElement("paymentNote").value || "No note"
    };

    transactions.push(paymentTransaction);

    saveTransactions();
    updateApp();

    paymentForm.reset();

    if (getElement("paymentMonth")) {
      getElement("paymentMonth").value = currentMonth;
    }

    showMessage("✅ Monthly payment added!");
  });
}

/* Add recurring payment */
if (recurringForm) {
  recurringForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const recurringPayment = {
      name: getElement("recurringName").value || "Recurring Payment",
      category: getElement("recurringCategory").value,
      amount: Number(getElement("recurringAmount").value) || 0,
      dueDay: Number(getElement("recurringDueDay").value) || 1,
      note: getElement("recurringNote").value || "No note"
    };

    recurringPayments.push(recurringPayment);

    saveRecurringPayments();
    updateApp();

    recurringForm.reset();

    showMessage("✅ Recurring payment saved!");
  });
}

/* Mark manual payment as paid */
function markPaymentPaid(index) {
  transactions[index].status = "Paid";

  saveTransactions();
  updateApp();

  showMessage("✅ Payment marked as paid!");
}

/* Delete transaction */
async function deleteTransaction(index) {
  const confirmDelete = await showConfirmPopup(
    "Delete transaction?",
    "This transaction will be removed from your budget history.",
    "Delete"
  );

  if (confirmDelete === true) {
    transactions.splice(index, 1);

    saveTransactions();
    updateApp();

    showMessage("🗑️ Transaction deleted!");
  }
}

/* Export backup */
function exportBackup() {
  const backupData = {
    appName: "Alisa’s Budget Tracker",
    exportedDate: new Date().toISOString(),
    transactions: transactions,
    recurringPayments: recurringPayments
  };

  const dataText = JSON.stringify(backupData, null, 2);

  const file = new Blob([dataText], {
    type: "application/json"
  });

  const fileURL = URL.createObjectURL(file);

  const downloadLink = document.createElement("a");
  downloadLink.href = fileURL;
  downloadLink.download = "alisa_budget_backup.json";

  downloadLink.click();

  URL.revokeObjectURL(fileURL);

  showMessage("✅ Backup exported!");
}

/* Import backup */
function importBackup(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function() {
    try {
      const backupData = JSON.parse(reader.result);

      if (backupData.transactions) {
        transactions = backupData.transactions;
        recurringPayments = backupData.recurringPayments || [];

        saveTransactions();
        saveRecurringPayments();
        updateApp();

        showMessage("✅ Backup imported!");
      } else {
        showMessage("❌ This is not a valid backup file.");
      }
    } catch {
      showMessage("❌ Could not import this file.");
    }
  };

  reader.readAsText(file);
}

/* Clear all data */
async function clearAllData() {
  const confirmClear = await showConfirmPopup(
    "Clear all data?",
    "This will delete all income, expenses, payments, and recurring payments from this browser.",
    "Clear"
  );

  if (confirmClear === true) {
    transactions = [];
    recurringPayments = [];

    saveTransactions();
    saveRecurringPayments();
    updateApp();

    showMessage("🗑️ All data cleared!");
  }
}

/* Month filter */
if (selectedMonthInput) {
  selectedMonthInput.addEventListener("change", function() {
    updateApp();
  });
}

/* Notification button */
if (enableNotificationsButton) {
  enableNotificationsButton.addEventListener("click", requestNotificationPermission);
}

/* Backup buttons */
if (exportButton) {
  exportButton.addEventListener("click", exportBackup);
}

if (importFile) {
  importFile.addEventListener("change", importBackup);
}

if (clearButton) {
  clearButton.addEventListener("click", clearAllData);
}

/* Show only selected section */
function showSection(sectionId) {
  pageSections.forEach(function(section) {
    section.classList.remove("active-section");
  });

  navButtons.forEach(function(button) {
    button.classList.remove("active");
  });

  const selectedSection = getElement(sectionId);

  if (selectedSection) {
    selectedSection.classList.add("active-section");
  }

  const activeButton = document.querySelector(`[data-section="${sectionId}"]`);

  if (activeButton) {
    activeButton.classList.add("active");
  }
}

/* Navigation button clicks */
navButtons.forEach(function(button) {
  button.addEventListener("click", function() {
    const sectionId = button.getAttribute("data-section");
    showSection(sectionId);
  });
});

/* Make first section active if nothing is active */
const alreadyActive = document.querySelector(".page-section.active-section");

if (!alreadyActive && pageSections.length > 0 && navButtons.length > 0) {
  const firstSectionId = navButtons[0].getAttribute("data-section");
  showSection(firstSectionId);
}

/* Run app */
updateApp();

/* Check reminders every 30 minutes while app is open */
setInterval(function() {
  updatePaymentReminders();
}, 30 * 60 * 1000);