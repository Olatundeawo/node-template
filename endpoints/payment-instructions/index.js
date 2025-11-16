/* eslint-disable prettier/prettier */
const { parseInstruction } = require('../../utils/parser');

module.exports = {
  method: 'post',
  path: '/payment-instructions',
  middlewares: [],
  handler: async (req) => {
    const { accounts, instruction } = req.body;

    if (!accounts || !instruction) {
      return {
        status: 400,
        statusText: 'failed',
        message: 'Missing accounts or instruction',
        data: {
          type: null,
          amount: null,
          currency: null,
          debit_account: null,
          credit_account: null,
          execute_by: null,
          status: 'failed',
          status_reason: 'Missing accounts or instruction',
          status_code: 'SY03',
          accounts: [],
        },
      };
    }

    const result = parseInstruction(instruction, accounts);

    return {
      status: result.status === 'failed' ? 400 : 200,
      statusText: result.status,
      message: result.status_reason,
      data: result,
    };
  },
};
