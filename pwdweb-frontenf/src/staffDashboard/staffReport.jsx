import ActivityReport from '../components/ActivityReport';
import StaffLayout from '../components/StaffLayout';
import useStaffAccount from '../components/useStaffAccount';
import {portalRequest} from '../components/portalApi';
export default function StaffReport(props){const user=useStaffAccount();return <ActivityReport {...props} user={user} role="staff" Layout={StaffLayout} request={portalRequest} apiPath="/staff-reports"/>;}
