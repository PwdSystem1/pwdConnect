import ProfilePage from '../components/ProfilePage';
import useStaffAccount from '../components/useStaffAccount';
export default function StaffProfile(props){const account=useStaffAccount();return <ProfilePage kind="staff" account={account} accessibility={props}/>;}
