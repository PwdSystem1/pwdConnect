// Admin and staff reports use the same ledger and period rules. Authorization
// is enforced separately by adminReportRoutes and the existing staff routes.
const reports=require('./staffReportController');
exports.getReport=reports.getReport;
exports.getActivity=reports.getActivity;
exports.exportCsv=reports.exportCsv;

exports.getMembers=require('./reportMembersController').getMembers;
