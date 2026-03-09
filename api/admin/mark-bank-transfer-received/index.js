const { POST } = require('../../../build-server/app/api/admin/mark-bank-transfer-received/route.js');
const { createVercelRoute } = require('../../_lib/vercelRoute.js');

module.exports = createVercelRoute({ POST });
