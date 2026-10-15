import ActivityReport from '../components/ActivityReport';
import AdminLayout from '../components/AdminLayout';
import useAdminAccount from '../components/useAdminAccount';
import {adminRequest} from '../components/adminApi';
export default function AdminReport(props){const user=useAdminAccount();return <ActivityReport {...props} user={user} role="admin" Layout={AdminLayout} request={adminRequest} apiPath="/admin-reports"/>;}
