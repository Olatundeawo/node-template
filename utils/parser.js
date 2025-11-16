/* eslint-disable one-var */
/* eslint-disable camelcase */
/* eslint-disable prefer-const */
/* eslint-disable prettier/prettier */

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'GHS'];

function isValidId(id) {
  if (!id) return false;

  const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-@.';
  return Array.from(id).every((char) => allowed.includes(char));
}

function parseInstruction(instruction, accounts) {
  let response = {
    type: null,
    amount: null,
    currency: null,
    debit_account: null,
    credit_account: null,
    execute_by: null,
    status: 'failed',
    status_reason: '',
    status_code: 'SY03',
    accounts: accounts || [],
  };

  try {
    let instr = instruction.trim();
    let parts = instr.split(' ').filter((p) => p !== '');
    let upperParts = parts.map((p) => p.toUpperCase());

    // Check type
    let type = upperParts[0];
    if (type !== 'DEBIT' && type !== 'CREDIT') {
      response.status_reason = 'Missing required keyword DEBIT or CREDIT';
      response.status_code = 'SY01';
      return response;
    }
    response.type = type;

    // Check minimal length
    if (parts.length < 7) {
      response.status_reason = 'Malformed instruction: too short';
      response.status_code = 'SY03';
      return response;
    }

    // Parse amount
    let amount = parseInt(parts[1], 10);
    if (Number.isNaN(amount) || amount <= 0 || parts[1].includes('.')) {
      response.status_reason = 'Amount must be a positive integer';
      response.status_code = 'AM01';
      return response;
    }
    response.amount = amount;

    // Parse currency
    let currency = parts[2].toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      response.status_reason = 'Unsupported currency. Only NGN, USD, GBP, and GHS are supported';
      response.status_code = 'CU02';
      return response;
    }
    response.currency = currency;

    // Parse account positions
    let debit_account = null;
    let credit_account = null;
    let execute_by = null;

    if (type === 'DEBIT') {
      let fromIdx = upperParts.indexOf('FROM');
      let toIdx = upperParts.indexOf('TO');
      if (fromIdx === -1 || toIdx === -1) {
        response.status_reason = 'Missing required keyword FROM or TO';
        response.status_code = 'SY01';
        return response;
      }

      debit_account = parts[fromIdx + 2];
      credit_account = parts[toIdx + 2];

      let onIdx = upperParts.indexOf('ON');
      if (onIdx !== -1) execute_by = parts[onIdx + 1];
    } else {
      let toIdx = upperParts.indexOf('TO');
      let fromIdx = upperParts.indexOf('FROM');
      if (fromIdx === -1 || toIdx === -1) {
        response.status_reason = 'Missing required keyword TO or FROM';
        response.status_code = 'SY01';
        return response;
      }

      credit_account = parts[toIdx + 2];
      debit_account = parts[fromIdx + 2];

      let onIdx = upperParts.indexOf('ON');
      if (onIdx !== -1) execute_by = parts[onIdx + 1];
    }

    // Validate IDs
    if (!isValidId(debit_account) || !isValidId(credit_account)) {
      response.status_reason = 'Invalid account ID format';
      response.status_code = 'AC04';
      return response;
    }

    if (debit_account === credit_account) {
      response.status_reason = 'Debit and credit accounts cannot be the same';
      response.status_code = 'AC02';
      return response;
    }

    // Find accounts in DB
    const debitAccObj = accounts.find((a) => a.id === debit_account);
    const creditAccObj = accounts.find((a) => a.id === credit_account);

    if (!debitAccObj || !creditAccObj) {
      response.status_reason = 'Account not found';
      response.status_code = 'AC03';
      return response;
    }

    // Currency checks
    if (debitAccObj.currency.toUpperCase() !== creditAccObj.currency.toUpperCase()) {
      response.status_reason = 'Account currency mismatch';
      response.status_code = 'CU01';
      return response;
    }

    if (debitAccObj.currency.toUpperCase() !== currency) {
      response.status_reason = 'Currency mismatch with instruction';
      response.status_code = 'CU01';
      return response;
    }

    // Balance check
    if (debitAccObj.balance < amount) {
      response.status_reason = `Insufficient funds in debit account: has ${debitAccObj.balance} ${currency}, needs ${amount} ${currency}`;
      response.status_code = 'AC01';
      return response;
    }

    // Date handling
    let now = new Date();
    let executeDate = execute_by ? new Date(execute_by) : now;

    if (execute_by && Number.isNaN(executeDate.getTime())) {
      response.status_reason = 'Invalid date format';
      response.status_code = 'DT01';
      return response;
    }

    // Set account summary
    response.debit_account = debit_account;
    response.credit_account = credit_account;
    response.execute_by = execute_by || null;
    response.accounts = [
      {
        id: debitAccObj.id,
        balance_before: debitAccObj.balance,
        balance: debitAccObj.balance,
        currency: debitAccObj.currency.toUpperCase(),
      },
      {
        id: creditAccObj.id,
        balance_before: creditAccObj.balance,
        balance: creditAccObj.balance,
        currency: creditAccObj.currency.toUpperCase(),
      },
    ];

    // Execution or scheduling
    if (executeDate <= now) {
      debitAccObj.balance -= amount;
      creditAccObj.balance += amount;

      response.accounts[0].balance = debitAccObj.balance;
      response.accounts[1].balance = creditAccObj.balance;

      response.status = 'successful';
      response.status_code = 'AP00';
      response.status_reason = 'Transaction executed successfully';
    } else {
      response.status = 'pending';
      response.status_code = 'AP02';
      response.status_reason = 'Transaction scheduled for future execution';
    }

    return response;
  } catch (error) {
    return response;
  }
}

module.exports = { parseInstruction };
